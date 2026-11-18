// Reads a project's own website for what it says about itself: name, description, the share
// picture (og:image, used as the banner) and an icon good enough for a logo. Used by the submit
// form as soon as a link is typed (GET /api/site), at submit time to keep the pictures, and by
// the cron to fill in projects listed without a logo or banner.
//
// Only https, only public hosts, a few seconds and a size cap per fetch. Pictures are copied
// into uploads rather than hot-linked, so a site that changes or goes away does not break a card.

const UA = "Mozilla/5.0 (compatible; OpenYardBot/1.0; +https://openyard.cloud)";
const TIMEOUT = 6000;
export const MAX_SCRAPED_LOGO = 200 * 1024, MAX_SCRAPED_IMAGE = 1024 * 1024;

/** https URLs on a public name only: no IP literals, no localhost, no single-label hosts. */
export function publicHttps(raw) {
  let u; try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":") || /(^|\.)(localhost|local|internal|lan|home|test|invalid|example)$/.test(h)) return null;
  return u;
}

async function get(url, accept) {
  const u = publicHttps(url);
  if (!u) return null;
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(u.href, { headers: { "User-Agent": UA, Accept: accept }, redirect: "follow", signal: ctl.signal, cf: { cacheTtl: 600 } });
    if (!r.ok || !publicHttps(r.url || u.href)) return null;
    return r;
  } catch { return null; } finally { clearTimeout(timer); }
}

// Read at most `max` bytes of a body; null if it is longer.
async function readCapped(r, max) {
  const len = +r.headers.get("Content-Length") || 0;
  if (len > max) return null;
  const reader = r.body.getReader(), parts = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > max) { reader.cancel(); return null; }
    parts.push(value);
  }
  const out = new Uint8Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** What the page at `url` says about itself, with absolute picture URLs. */
export async function siteMeta(url) {
  const r = await get(url, "text/html,application/xhtml+xml");
  if (!r || !/html/i.test(r.headers.get("Content-Type") || "")) return null;
  const base = r.url || url, abs = h => { try { return new URL(h, base).href; } catch { return null; } };
  const m = { title: "", name: "", description: "", image: null, icons: [] };
  let inTitle = false;
  const meta = el => {
    const k = (el.getAttribute("property") || el.getAttribute("name") || "").toLowerCase(), v = (el.getAttribute("content") || "").trim();
    if (!v) return;
    if ((k === "og:image" || k === "og:image:secure_url" || k === "twitter:image" || k === "twitter:image:src") && !m.image) m.image = abs(v);
    else if (k === "og:site_name" && !m.name) m.name = v;
    else if (k === "og:title" && !m.title) m.title = v;
    else if ((k === "og:description" || k === "description" || k === "twitter:description") && !m.description) m.description = v;
  };
  const link = el => {
    const rel = (el.getAttribute("rel") || "").toLowerCase(), href = el.getAttribute("href");
    if (!href || !/\bicon\b|apple-touch-icon/.test(rel)) return;
    const sizes = (el.getAttribute("sizes") || "").toLowerCase(), type = (el.getAttribute("type") || "").toLowerCase();
    const px = Math.max(0, ...sizes.split(/\s+/).map(s => +s.split("x")[0] || 0));
    m.icons.push({ href: abs(href), apple: rel.includes("apple-touch-icon"), svg: type.includes("svg") || /\.svg(\?|$)/i.test(href), px });
  };
  let title = "";
  const rw = new HTMLRewriter()
    .on("meta", { element: meta })
    .on("link", { element: link })
    .on("title", { element() { inTitle = true; }, text(t) { if (inTitle) title += t.text; if (t.lastInTextNode) inTitle = false; } });
  // only the head matters; stop after 512 KB
  const capped = new Response(new ReadableStream({
    async start(c) {
      const rd = r.body.getReader(); let n = 0;
      for (;;) { const { done, value } = await rd.read(); if (done || (n += value.length) > 512 * 1024) { if (!done) rd.cancel(); break; } c.enqueue(value); }
      c.close();
    },
  }), { headers: { "Content-Type": "text/html" } });
  await rw.transform(capped).arrayBuffer();
  if (!m.title) m.title = title.replace(/\s+/g, " ").trim();
  // the best logo: an apple-touch-icon, then an SVG, then the largest PNG of at least 64px
  const icons = m.icons.filter(i => i.href);
  m.icon = (icons.find(i => i.apple) || icons.find(i => i.svg) || icons.filter(i => i.px >= 64).sort((a, b) => b.px - a.px)[0] || null)?.href || null;
  if (!m.icon) m.icon = abs("/apple-touch-icon.png"); // many sites have one without saying so
  delete m.icons;
  for (const k of ["title", "name", "description"]) m[k] = decode(m[k]).replace(/\s+/g, " ").trim().slice(0, 300);
  return m;
}

// the few entities page titles and descriptions use
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, e) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[e.toLowerCase()]);
const pngSize = b => b.length > 24 && b[0] === 0x89 && b[1] === 0x50 ? (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) : 0;
/** A picture from the web as { type, buf } ready for uploads, or null. Logos may be SVG; PNG logos must be 64px or more. */
export async function grabImage(url, { logo = false } = {}) {
  const r = await get(url, "image/avif,image/webp,image/png,image/jpeg,image/svg+xml;q=0.8,*/*;q=0.5");
  if (!r) return null;
  const buf = await readCapped(r, logo ? MAX_SCRAPED_LOGO : MAX_SCRAPED_IMAGE);
  if (!buf || buf.length < 64) return null;
  const head = new TextDecoder().decode(buf.slice(0, 256)).trimStart().toLowerCase();
  const type = buf[0] === 0x89 && buf[1] === 0x50 ? "image/png" : buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg"
    : buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45 ? "image/webp"
    : logo && (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) ? "image/svg+xml" : null;
  if (!type) return null;
  if (logo && type === "image/png" && pngSize(buf) && pngSize(buf) < 64) return null;
  return { type, buf };
}
