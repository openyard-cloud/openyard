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
/** The TXT records at _openyard.<host>, through DNS over HTTPS. */
export async function dnsTxt(host) {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=_openyard.${encodeURIComponent(host)}&type=TXT`, { headers: { Accept: "application/dns-json" } });
    const d = await r.json();
    return (d.Answer || []).filter(a => a.type === 16).map(a => String(a.data).replace(/^"|"$/g, "").replace(/" "/g, ""));
  } catch { return []; }
}

const STORE = /^https:\/\/(play\.google\.com\/store\/apps\/|apps\.apple\.com\/)/i;

export async function siteMeta(url) {
  const r = await get(url, "text/html,application/xhtml+xml");
  if (!r || !/html/i.test(r.headers.get("Content-Type") || "")) return null;
  const base = r.url || url, abs = h => { try { return new URL(h, base).href; } catch { return null; } };
  const m = { title: "", name: "", description: "", image: null, icons: [], verify: [] };
  let inTitle = false;
  const meta = el => {
    const k = (el.getAttribute("property") || el.getAttribute("name") || "").toLowerCase(), v = (el.getAttribute("content") || "").trim();
    if (!v) return;
    if ((k === "og:image" || k === "og:image:secure_url" || k === "twitter:image" || k === "twitter:image:src") && !m.image) m.image = abs(v);
    else if (k === "og:site_name" && !m.name) m.name = v;
    else if (k === "openyard-verify") m.verify.push(v); // proof of ownership for a claim
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
  // only the head matters, but some heads are long: Google Play puts og:image past the first 1 MB
  const capped = new Response(new ReadableStream({
    async start(c) {
      const rd = r.body.getReader(); let n = 0;
      for (;;) { const { done, value } = await rd.read(); if (done || (n += value.length) > 2 * 1024 * 1024) { if (!done) rd.cancel(); break; } c.enqueue(value); }
      c.close();
    },
  }), { headers: { "Content-Type": "text/html" } });
  await rw.transform(capped).arrayBuffer();
  if (!m.title) m.title = title.replace(/\s+/g, " ").trim();
  // Logo candidates, best first: apple-touch-icons, SVGs, the largest declared PNGs, anything else
  // declared, then the files many sites have without saying so. The first one that downloads
  // within the size limit wins (grabLogo), so one oversized icon does not leave a project bare.
  const declared = m.icons.filter(i => i.href);
  const rank = i => i.apple ? 0 : i.svg ? 1 : i.px >= 64 ? 2 : 3;
  // Last resort: Google's favicon service, which serves the site's own icon scaled to 256px (a
  // logo too big to keep, say) and answers 404 for a site without one.
  const host = (() => { try { return new URL(base).hostname; } catch { return ""; } })();
  const s2 = host && `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=256`;
  m.icons = [...new Set([...declared.sort((a, b) => rank(a) - rank(b) || b.px - a.px).map(i => i.href), abs("/apple-touch-icon.png"), abs("/favicon.ico"), s2].filter(Boolean))];
  // An app store page: its share picture is the app's icon, and its own icons are the store's.
  // Both stores serve any size from the URL, so ask for 256px instead of the full-size original.
  if (STORE.test(base)) {
    const sized = u => u.replace(/^(https:\/\/play-lh\.googleusercontent\.com\/[^=?#]+)(=[^?#]*)?$/, "$1=s256")
      .replace(/^(https:\/\/[\w.-]*mzstatic\.com\/.+\/)\d+x\d+\w*\.(png|jpe?g|webp)$/, "$1256x256bb.png");
    m.icons = m.image ? [sized(m.image)] : []; m.image = null;
  }
  m.icon = m.icons[0] || null;
  // a share picture that is only the site's icon is not a banner
  const bare = u => String(u || "").split(/[?#]/)[0];
  if (m.image && declared.some(i => bare(i.href) === bare(m.image))) m.image = null;
  for (const k of ["title", "name", "description"]) m[k] = decode(m[k]).replace(/\s+/g, " ").trim().slice(0, 300);
  return m;
}

// the few entities page titles and descriptions use
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, e) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[e.toLowerCase()]);
// The largest PNG of 64px or more inside a .ico file (modern favicons keep one at 256px), or null.
function icoPng(b) {
  if (b.length < 6 || b[0] !== 0 || b[1] !== 0 || b[2] !== 1 || b[3] !== 0) return null;
  let best = null;
  for (let i = 0, n = b[4] | b[5] << 8; i < n && 6 + 16 * i + 16 <= b.length; i++) {
    const e = 6 + 16 * i, w = b[e] || 256, size = (b[e + 8] | b[e + 9] << 8 | b[e + 10] << 16 | b[e + 11] << 24) >>> 0, off = (b[e + 12] | b[e + 13] << 8 | b[e + 14] << 16 | b[e + 15] << 24) >>> 0;
    if (w >= 64 && off + size <= b.length && b[off] === 0x89 && b[off + 1] === 0x50 && (!best || w > best.w)) best = { w, buf: b.slice(off, off + size) };
  }
  return best?.buf || null;
}
const pngSize = b => b.length > 24 && b[0] === 0x89 && b[1] === 0x50 ? (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) : 0;
/** A picture from the web as { type, buf } ready for uploads, or null. Logos may be SVG; PNG logos must be 64px or more. */
export async function grabImage(url, { logo = false } = {}) {
  const r = await get(url, "image/avif,image/webp,image/png,image/jpeg,image/svg+xml;q=0.8,*/*;q=0.5");
  if (!r) return null;
  // read up to the banner limit: a .ico can be big because of its small bitmaps, and only the PNG inside is kept
  const raw = await readCapped(r, MAX_SCRAPED_IMAGE);
  if (!raw || raw.length < 64) return null;
  const ico = logo ? icoPng(raw) : null;
  if (ico) return ico.length <= MAX_SCRAPED_LOGO ? { type: "image/png", buf: ico } : null;
  if (logo && raw.length > MAX_SCRAPED_LOGO) return null;
  const buf = raw;
  const head = new TextDecoder().decode(buf.slice(0, 256)).trimStart().toLowerCase();
  const type = buf[0] === 0x89 && buf[1] === 0x50 ? "image/png" : buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg"
    : buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45 ? "image/webp"
    : logo && (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) ? "image/svg+xml" : null;
  if (!type) return null;
  if (logo && type === "image/png" && pngSize(buf) && pngSize(buf) < 64) return null;
  return { type, buf };
}

/** The first of `urls` that makes a usable logo, as { url, type, buf }, or null. */
export async function grabLogo(urls) {
  for (const url of urls || []) {
    const g = await grabImage(url, { logo: true });
    if (g) return { url, ...g };
  }
  return null;
}
