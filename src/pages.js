// Pages the Worker renders from the database: one page per project at /p/<slug>,
// plus sitemap.xml. Pages are English in the HTML (what search engines and link
// previews read) and switch to Vietnamese in the browser, like the home page.

export const ORIGIN = "https://openyard.cloud";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const en = v => (v && (v.en || v.vi)) || "";
const vi = v => (v && (v.vi || v.en)) || "";
const abs = u => !u ? u : /^https?:/.test(u) ? u : ORIGIN + u;
const ago = (iso, now) => { const d = Math.max(0, Math.round((now - Date.parse(iso)) / 86400000)); return d === 0 ? ["today", "hôm nay"] : d === 1 ? ["yesterday", "hôm qua"] : [`${d} days ago`, `${d} ngày trước`]; };
const initials = n => esc(String(n).split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase());
// text with a Vietnamese twin, swapped in by the page script
const t = (e, v) => `<span data-vi="${esc(v)}">${esc(e)}</span>`;
const host = u => { try { const x = new URL(u); return x.host + x.pathname.replace(/\/$/, ""); } catch { return u; } };

const DISCORD = "M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.5 0L8.7 3a19.6 19.6 0 0 0-4.9 1.5C.7 9.1-.2 13.6.3 18a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.7 19.7 0 0 0 6-3c.5-5.1-.8-9.5-3.6-13.6ZM8 15.3c-1.2 0-2.1-1.1-2.1-2.4S6.8 10.5 8 10.5s2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm8 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z";
const GITHUB = "M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z";
const ARROW = `<svg class="ar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>`;
const svg = d => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;

const TYPE = p => p.status === "soon" ? ["Coming soon", "Sắp ra mắt"] : p.type === "app" ? ["Free app", "App miễn phí"] : ["Open source", "Mã nguồn mở"];
const STATUS = { live: ["Live", "Đang chạy"], beta: ["Beta", "Thử nghiệm"], soon: ["Coming soon", "Sắp ra mắt"] };
const KIND = { people: ["For people", "Cho mọi người"], wild: ["Wild idea", "Ý tưởng điên rồ"], dev: ["Dev tool", "Công cụ cho dev"] };

const CSS = `:root{--bg:#fff;--bg2:#f6f6f7;--solid:#fff;--ink:#0d0d0f;--muted:#6b6b73;--line:rgba(13,13,15,.08);--line2:rgba(13,13,15,.14);--shadow:0 1px 2px rgba(0,0,0,.04),0 12px 40px -12px rgba(0,0,0,.12);--ease:cubic-bezier(.16,1,.3,1)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0a0a0c;--bg2:#111114;--solid:#141417;--ink:#f4f4f5;--muted:#9a9aa3;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--shadow:0 1px 2px rgba(0,0,0,.4),0 20px 60px -20px rgba(0,0,0,.7)}}
:root[data-theme="dark"]{--bg:#0a0a0c;--bg2:#111114;--solid:#141417;--ink:#f4f4f5;--muted:#9a9aa3;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--shadow:0 1px 2px rgba(0,0,0,.4),0 20px 60px -20px rgba(0,0,0,.7)}
*{box-sizing:border-box}html{overflow-x:clip}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-feature-settings:"cv11","ss01";overflow-x:clip}
a{color:inherit;text-decoration:none}h1,h2,h3{margin:0;font-weight:600;letter-spacing:-.035em;line-height:1.05}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}@media (max-width:520px){.wrap{padding:0 16px}}
nav{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:saturate(1.6) blur(18px);-webkit-backdrop-filter:saturate(1.6) blur(18px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;align-items:center;gap:20px;height:64px}
.brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:17px;letter-spacing:-.02em}.brand img{width:24px;height:24px}
.brand em,.grad{font-style:normal;background:linear-gradient(100deg,#7c9cff 0%,#b67cff 35%,#ff7eb0 70%,#ffc56b 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.back{font-size:14px;color:var(--muted)}.back:hover{color:var(--ink)}
.right{margin-left:auto;display:flex;gap:8px;align-items:center}
.chip{border:1px solid var(--line2);background:transparent;color:var(--ink);border-radius:999px;height:34px;padding:0 14px;font:500 13px Inter,sans-serif;cursor:pointer}.chip:hover{background:var(--bg2)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 22px;border-radius:999px;font-weight:500;font-size:15px;white-space:nowrap;transition:transform .5s var(--ease),background .2s,opacity .2s}
.btn:active{transform:scale(.97)}.btn.dark{background:var(--ink);color:var(--bg)}.btn.dark:hover{opacity:.88}.btn.line{border:1px solid var(--line2)}.btn.line:hover{background:var(--bg2)}
.btn.sm{height:34px;padding:0 14px;font-size:13px}.btn svg{width:17px;height:17px}.btn .ar{width:15px;height:15px}
.dc{background:#5865f2;color:#fff}.dc:hover{background:#4752c4}
@media (max-width:560px){.back{display:none}.dc span{display:none}}
.hero{position:relative;padding:72px 0 40px}
.hero::before{content:"";position:absolute;inset:-40px 0 auto;height:420px;z-index:-1;background:radial-gradient(600px 260px at 18% 30%,color-mix(in srgb,var(--c) 34%,transparent),transparent 70%),radial-gradient(500px 240px at 80% 10%,rgba(182,124,255,.16),transparent 70%);pointer-events:none}
.id{display:flex;align-items:center;gap:18px;margin-bottom:22px}
.logo{width:72px;height:72px;border-radius:20px;object-fit:contain;background:#fff;padding:10px;box-shadow:var(--shadow);flex:none}.logo.full{padding:0;object-fit:cover}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;padding:4px 11px;border-radius:999px;border:1px solid var(--line2);color:var(--muted)}
.pill.on{color:var(--ink)}.pill .dot{width:6px;height:6px;border-radius:50%;background:#34d399;box-shadow:0 0 10px #34d399}
h1{font-size:clamp(40px,6vw,68px)}
.tl{font-size:clamp(19px,2.2vw,24px);color:var(--ink);margin:14px 0 10px;letter-spacing:-.02em;font-weight:500}
.desc{color:var(--muted);font-size:17px;max-width:40em;margin:0 0 28px}
.cta{display:flex;gap:10px;flex-wrap:wrap}
.shot{margin:16px 0 0;border-radius:22px;overflow:hidden;border:1px solid var(--line2);box-shadow:var(--shadow);background:var(--bg2)}
.shot img{display:block;width:100%;height:auto}
.gen{aspect-ratio:2/1;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--c) 70%,#fff),var(--c))}.gen img{width:120px;height:120px;border-radius:28px;background:#fff;padding:14px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:40px 0 0}
.fact{padding:18px 20px;border-radius:18px;background:var(--bg2);border:1px solid var(--line)}
.fact b{display:block;font-size:12.5px;font-weight:500;color:var(--muted);margin-bottom:6px}
.fact div{font-weight:500;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.who{display:inline-flex;align-items:center;gap:8px}.who img{width:24px;height:24px;border-radius:50%;background:var(--bg)}
.who a:hover{text-decoration:underline}
.tg{font-size:13px;padding:2px 9px;border-radius:999px;background:var(--solid);border:1px solid var(--line)}
section.more{padding:72px 0 24px}
.more h2{font-size:clamp(26px,3vw,34px);margin-bottom:22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.mini{display:flex;gap:14px;align-items:center;padding:16px;border-radius:18px;border:1px solid var(--line2);background:var(--solid);transition:transform .5s var(--ease),border-color .3s}
.mini:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--ink) 30%,transparent)}
.mini img{width:44px;height:44px;border-radius:12px;object-fit:contain;background:#fff;padding:5px;flex:none}.mini img.full{padding:0;object-fit:cover}
.mini h3{font-size:16px;letter-spacing:-.02em}.mini p{margin:2px 0 0;font-size:13.5px;color:var(--muted);line-height:1.4}
.band{margin:56px 0 0;padding:36px;border-radius:26px;background:radial-gradient(500px 200px at 10% 0%,rgba(124,156,255,.18),transparent 70%),radial-gradient(500px 200px at 90% 100%,rgba(255,126,176,.16),transparent 70%),var(--bg2);border:1px solid var(--line);display:flex;gap:24px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.band h2{font-size:clamp(22px,2.6vw,30px);max-width:18em}.band p{margin:8px 0 0;color:var(--muted)}
.act{margin:48px 0 0}.act h2{font-size:clamp(24px,2.6vw,30px);margin-bottom:6px}.act .sub{color:var(--muted);margin:0 0 20px;font-size:14.5px}
.nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
.num{padding:16px 18px;border-radius:16px;background:var(--bg2);border:1px solid var(--line)}.num b{display:block;font-size:26px;letter-spacing:-.03em;line-height:1.1}.num span{font-size:13px;color:var(--muted)}
.num em{font-style:normal;font-size:13px;color:#10b981;margin-left:6px}
.lists{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.list{border-radius:18px;border:1px solid var(--line2);background:var(--solid);overflow:hidden}
.list h3{font-size:14px;letter-spacing:0;font-weight:600;padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between}.list h3 a{color:var(--muted);font-weight:500}
.it{display:flex;gap:10px;align-items:flex-start;padding:11px 16px;border-bottom:1px solid var(--line);font-size:14px;line-height:1.4}.it:last-child{border-bottom:0}.it:hover{background:var(--bg2)}
.it i{flex:none;margin-top:3px;width:9px;height:9px;border-radius:50%;background:#10b981}.it i.merged{background:#8b5cf6}.it i.closed{background:#f43f5e}
.it small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}.empty{padding:16px;color:var(--muted);font-size:14px}
.ini{display:grid;place-items:center;font-weight:700;font-size:26px;color:#fff;background:var(--c,#6d5bd0)}
.logo.ini{padding:0}.mini .ini{width:44px;height:44px;border-radius:12px;font-size:16px;flex:none}
.talk{margin:48px 0 0}.talk h2{font-size:clamp(24px,2.6vw,30px);margin-bottom:6px}.talk .sub{color:var(--muted);margin:0 0 18px;font-size:14.5px}
.me{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted);margin-bottom:10px}.me img{width:24px;height:24px;border-radius:50%}
.me button,.cm .acts button{background:none;border:0;padding:0;color:var(--muted);font:500 13px Inter,sans-serif;cursor:pointer}.me button:hover,.cm .acts button:hover{color:var(--ink)}
.compose{border:1px solid var(--line2);border-radius:18px;background:var(--solid);padding:12px;transition:border-color .2s,box-shadow .2s}
.compose:focus-within{border-color:#8b7cff;box-shadow:0 0 0 4px rgba(139,124,255,.16)}
.compose textarea{width:100%;min-height:76px;border:0;outline:0;resize:vertical;background:transparent;color:var(--ink);font:15px/1.5 Inter,system-ui,sans-serif}
.compose .row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px}.compose small{color:var(--muted);font-size:12.5px}
.compose .err{color:#e03131;font-size:13px}
.signin{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:18px 20px;border-radius:18px;border:1px dashed var(--line2);background:var(--bg2)}
.signin p{margin:0;color:var(--muted);font-size:14.5px}
.cms{margin-top:22px;display:flex;flex-direction:column;gap:18px}
.cm{display:flex;gap:12px}.cm > img,.cm > .ph{width:36px;height:36px;border-radius:50%;flex:none;background:var(--bg2)}
.cm .bd{flex:1;min-width:0}.cm .hd{font-size:14px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.cm .hd a{font-weight:600}.cm .hd span{color:var(--muted);font-size:12.5px}
.cm .tx{margin-top:2px;font-size:15px;line-height:1.55;overflow-wrap:anywhere;white-space:pre-wrap}.cm .tx a{color:#7c6cff;text-decoration:underline}
.cm .tx.gone{color:var(--muted);font-style:italic}
.cm .acts{display:flex;gap:14px;margin-top:4px}
.cm .replies{margin-top:14px;display:flex;flex-direction:column;gap:14px;padding-left:14px;border-left:2px solid var(--line)}
.cm .replies .cm > img,.cm .replies .cm > .ph{width:28px;height:28px}
.cm .compose{margin-top:10px}
.none{color:var(--muted);font-size:14.5px}
footer{padding:56px 0 40px;color:var(--muted);font-size:13.5px}
footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid var(--line);padding-top:22px}
footer a:hover{color:var(--ink)}`;

const head = ({ title, desc, url, image, jsonld }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="OpenYard">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc(image.url)}">${image.w ? `
<meta property="og:image:width" content="${image.w}">
<meta property="og:image:height" content="${image.h}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(image.url)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
<style>${CSS}</style>
</head>`;

// Swaps every [data-vi] to Vietnamese when the visitor picked VI on the site (same storage key)
// or their browser is Vietnamese, and wires the VI/EN toggle.
const LANG_JS = `<script>
(() => {
  const els = [...document.querySelectorAll("[data-vi]")];
  els.forEach(e => e.dataset.en = e.textContent);
  const set = l => {
    els.forEach(e => e.textContent = l === "vi" ? e.dataset.vi : e.dataset.en);
    document.documentElement.lang = l; document.getElementById("lang").textContent = l === "vi" ? "EN" : "VI";
    window.OY_LANG = l; dispatchEvent(new Event("oy-lang"));
    try { localStorage.setItem("oy-lang", l); } catch (e) {}
  };
  let l = null; try { l = localStorage.getItem("oy-lang"); } catch (e) {}
  l = l || ((navigator.language || "").toLowerCase().startsWith("vi") ? "vi" : "en");
  document.getElementById("lang").addEventListener("click", () => { l = l === "vi" ? "en" : "vi"; set(l); });
  if (l === "vi") set("vi");
})();
</script>`;

const logoClass = p => p.logoStyle === "tile" ? "full" : "";

export function projectPage(p, all, site, stats, now = Date.now()) {
  const url = `${ORIGIN}/p/${p.slug}`;
  const type = TYPE(p);
  const image = p.og ? { url: abs(p.og), w: 1200, h: 630 } : p.image ? { url: abs(p.image) } : { url: `${ORIGIN}/og.png?v=2`, w: 1200, h: 630 };
  const maker = p.team ? { "@type": "Organization", name: "OpenYard", url: ORIGIN } : p.maintainers[0] ? { "@type": "Person", name: p.maintainers[0], url: `https://github.com/${p.maintainers[0]}` } : undefined;
  const jsonld = [{
    "@context": "https://schema.org", "@type": "SoftwareApplication", name: p.name, description: en(p.description),
    url, image: image.url, applicationCategory: p.kinds.includes("dev") ? "DeveloperApplication" : "WebApplication",
    isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    ...(p.license ? { license: p.license } : {}), author: maker, sameAs: [p.url, p.repo].filter(Boolean), keywords: (p.tags || []).join(", ") || undefined,
  }, {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "OpenYard", item: ORIGIN },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${ORIGIN}/#projects` },
      { "@type": "ListItem", position: 3, name: p.name, item: url },
    ],
  }];
  const people = p.team
    ? `<span class="who"><img src="/favicon.svg" alt="">OpenYard team</span>`
    : !p.maintainers.length ? t("A community member", "Một thành viên cộng đồng")
    : p.maintainers.map(h => `<span class="who"><img src="https://github.com/${esc(h)}.png?size=48" alt="" loading="lazy"><a href="https://github.com/${esc(h)}" target="_blank" rel="noopener">@${esc(h)}</a></span>`).join("");
  const facts = [
    [["Made by", "Người làm"], people],
    [["Status", "Trạng thái"], p.status === "live" ? `<span class="pill on"><i class="dot"></i>${t(...STATUS.live)}</span>` : t(...STATUS[p.status])],
    [["Kind", "Thể loại"], p.kinds.map(k => `<span class="tg">${t(...KIND[k])}</span>`).join("")],
    p.license ? [["License", "Giấy phép"], esc(p.license)] : null,
    p.tags?.length ? [["Tags", "Thẻ"], p.tags.map(x => `<span class="tg">${esc(x)}</span>`).join("")] : null,
  ].filter(Boolean);
  const others = all.filter(o => o.slug !== p.slug).slice(0, 6);
  const visual = p.image
    ? `<figure class="shot"><img src="${esc(p.image)}" alt="${esc(p.name)} screenshot"></figure>`
    : p.logo ? `<figure class="shot gen" style="--c:${esc(p.color || "#6d5bd0")}"><img src="${esc(p.logo)}" alt=""></figure>` : "";
  const logo = (o, cls, size) => o.logo ? `<img class="${cls} ${logoClass(o)}" src="${esc(o.logo)}" alt="" width="${size}" height="${size}" loading="lazy">` : `<span class="${cls} ini" style="--c:${esc(o.color || "#6d5bd0")}">${initials(o.name)}</span>`;
  const repoUrl = p.repo && /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(p.repo) ? p.repo.replace(/\/$/, "") : null;
  const st = stats && stats.stars != null ? stats : null;
  const act = st ? JSON.parse(st.activity || "{}") : {};
  const row = (x, kind) => `<a class="it" href="${esc(x.url)}" target="_blank" rel="noopener"><i class="${esc(x.state)}"></i><div>${esc(x.title)}<small>#${esc(x.number)} · @${esc(x.user)} · ${t(...ago(x.at, now))}</small></div></a>`;
  const list = (title, items, more) => `<div class="list"><h3>${t(...title)}<a href="${esc(more)}" target="_blank" rel="noopener">${t("All", "Tất cả")} →</a></h3>${(items || []).length ? items.slice(0, 5).map(x => row(x)).join("") : `<div class="empty">${t("Nothing in the last weeks yet.", "Mấy tuần gần đây chưa có gì.")}</div>`}</div>`;
  const activity = st ? `<section class="act">
    <h2>${t("Activity", "Hoạt động")}</h2>
    <p class="sub">${t("From the GitHub repository, refreshed every few hours.", "Lấy từ repo GitHub, cập nhật vài giờ một lần.")}</p>
    <div class="nums">
      <div class="num"><b>${st.stars}${st.stars_7d > 0 ? `<em>+${st.stars_7d}</em>` : ""}</b><span>${t("stars", "sao")}</span></div>
      <div class="num"><b>${st.prs_7d}</b><span>${t("pull requests this week", "pull request tuần này")}</span></div>
      <div class="num"><b>${st.issues_7d}</b><span>${t("issues this week", "issue tuần này")}</span></div>
      <div class="num"><b>${st.commits_7d}</b><span>${t("commits this week", "commit tuần này")}</span></div>
      <div class="num"><b>${st.forks}</b><span>${t("forks", "fork")}</span></div>
    </div>
    <div class="lists">
      ${list(["Pull requests", "Pull request"], act.prs, repoUrl + "/pulls")}
      ${list(["Issues", "Issue"], act.issues, repoUrl + "/issues")}
      ${act.discussions ? list(["Discussions", "Thảo luận"], act.discussions, repoUrl + "/discussions") : ""}
    </div>
  </section>` : "";
  return `${head({ title: `${p.name}: ${en(p.tagline)} · OpenYard`, desc: en(p.description), url, image, jsonld })}
<body>
<nav><div class="wrap">
  <a class="brand" href="/"><img src="/favicon.svg" alt="" width="24" height="24"><span>Open<em>Yard</em></span></a>
  <a class="back" href="/#projects">← ${t("All projects", "Tất cả dự án")}</a>
  <div class="right">
    <button class="chip" id="lang" type="button" aria-label="Switch language">VI</button>
    <a class="btn sm dc" href="${esc(site.discord)}" target="_blank" rel="noopener">${svg(DISCORD)}${t("Join Discord", "Vào Discord")}</a>
  </div>
</div></nav>
<main>
<header class="hero" style="--c:${esc(p.color || "#6d5bd0")}"><div class="wrap">
  <div class="id">${logo(p, "logo", 72)}
    <div class="tags"><span class="pill on">${t(...type)}</span>${p.team ? `<span class="pill">OpenYard team</span>` : `<span class="pill">${t("Community", "Cộng đồng")}</span>`}</div></div>
  <h1>${esc(p.name)}</h1>
  <p class="tl">${t(en(p.tagline), vi(p.tagline))}</p>
  <p class="desc">${t(en(p.description), vi(p.description))}</p>
  <div class="cta">
    <a class="btn dark" href="/go/${esc(p.slug)}" target="_blank" rel="noopener">${t("Open", "Mở")} ${esc(host(p.url))} ${ARROW}</a>
    ${p.repo && p.repo !== p.url ? `<a class="btn line" href="${esc(p.repo)}" target="_blank" rel="noopener">${svg(GITHUB)}${t("Source code", "Mã nguồn")}</a>` : ""}
  </div>
</div></header>
<div class="wrap">
  ${visual}
  <div class="facts">${facts.map(([[e, v], html]) => `<div class="fact"><b>${t(e, v)}</b><div>${html}</div></div>`).join("")}</div>
  ${activity}
  <section class="talk" id="comments">
    <h2>${t("Comments", "Bình luận")}</h2>
    <p class="sub">${t("Questions, feedback, ideas for the maker. Sign in with GitHub to join in.", "Hỏi, góp ý hay gợi ý cho người làm. Đăng nhập bằng GitHub để tham gia.")}</p>
    <div id="cbox"></div>
    <div class="cms" id="clist"></div>
  </section>
</div>
${others.length ? `<section class="more"><div class="wrap">
  <h2>${t("More from the yard", "Thêm từ sân")}</h2>
  <div class="grid">${others.map(o => `<a class="mini" href="/p/${esc(o.slug)}">${logo(o, "", 44)}<div><h3>${esc(o.name)}</h3><p>${t(en(o.tagline), vi(o.tagline))}</p></div></a>`).join("")}</div>
  <div class="band"><div><h2>${t("Built something free?", "Bạn cũng làm ra thứ gì đó miễn phí?")}</h2><p>${t("Put it in the yard in five minutes, no account needed.", "Đưa lên sân chỉ mất năm phút, không cần tài khoản.")}</p></div>
    <div class="cta"><a class="btn dark" href="/submit">${t("Add your project", "Đưa dự án lên")}</a><a class="btn line" href="${esc(site.discord)}" target="_blank" rel="noopener">${svg(DISCORD)}Discord</a></div></div>
</div></section>` : ""}
</main>
<footer><div class="wrap"><span>© ${new Date().getFullYear()} <a href="/">OpenYard</a> · ${t("Free apps, wild ideas, open tools.", "App miễn phí, ý tưởng điên rồ, công cụ mở.")}</span><a href="${esc(site.discord)}" target="_blank" rel="noopener">${t("Something wrong with this listing? Tell us on Discord", "Trang này có vấn đề? Báo trên Discord")}</a></div></footer>
${LANG_JS}
<script>
(() => {
  const SLUG = ${JSON.stringify(p.slug)}, box = document.getElementById("cbox"), list = document.getElementById("clist");
  const T = (en, vi) => window.OY_LANG === "vi" ? vi : en;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const linkify = s => esc(s).replace(/https?:\\/\\/[^\\s<]+[^\\s<.,:;!?)\\]'"]/g, u => \`<a href="\${u}" target="_blank" rel="nofollow ugc noopener">\${u}</a>\`);
  const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? T("just now", "vừa xong") : m < 60 ? T(m + " min ago", m + " phút trước") : m < 1440 ? T(Math.round(m / 60) + " h ago", Math.round(m / 60) + " giờ trước") : T(Math.round(m / 1440) + " d ago", Math.round(m / 1440) + " ngày trước"); };
  let me = null, items = [], replyTo = null;
  const back = encodeURIComponent(location.pathname + "#comments");
  const compose = (parent, ph) => \`<form class="compose" data-parent="\${parent || ""}"><textarea maxlength="2000" placeholder="\${esc(ph)}" required></textarea><div class="row"><small>\${T("Plain text, links work.", "Chữ thường, có thể dán link.")}</small><span class="err"></span><button class="btn sm dark" type="submit">\${parent ? T("Reply", "Trả lời") : T("Post", "Gửi")}</button></div></form>\`;
  const one = c => \`<div class="cm" id="c\${c.id}">\${c.user ? \`<img src="\${esc(c.user.avatar)}" alt="">\` : '<span class="ph"></span>'}<div class="bd">
      <div class="hd">\${c.user ? \`<a href="https://github.com/\${esc(c.user.login)}" target="_blank" rel="noopener">\${esc(c.user.name || c.user.login)}</a><span>@\${esc(c.user.login)}</span>\` : ""}<span>\${ago(c.at)}</span></div>
      <div class="tx\${c.deleted ? " gone" : ""}">\${c.deleted ? T("This comment was removed.", "Bình luận này đã bị xoá.") : linkify(c.body)}</div>
      <div class="acts">\${me && !c.parent && !c.deleted ? \`<button data-reply="\${c.id}">\${T("Reply", "Trả lời")}</button>\` : ""}\${(c.mine || me?.admin) && !c.deleted ? \`<button data-del="\${c.id}">\${T("Delete", "Xoá")}</button>\` : ""}</div>
      \${c.parent ? "" : \`<div class="replies">\${items.filter(r => r.parent === c.id).map(one).join("")}\${replyTo === c.id ? compose(c.id, T("Write a reply…", "Viết trả lời…")) : ""}</div>\`}
    </div></div>\`;
  function render() {
    box.innerHTML = me
      ? \`<div class="me"><img src="\${esc(me.avatar)}" alt="">\${T("Signed in as", "Đang đăng nhập:")} @\${esc(me.login)} · <button id="out">\${T("Sign out", "Đăng xuất")}</button></div>\${compose(null, T("Say something nice, ask a question, share an idea…", "Khen một câu, hỏi một câu, góp một ý…"))}\`
      : \`<div class="signin"><p>\${T("Sign in with GitHub to comment. We only read your public profile.", "Đăng nhập bằng GitHub để bình luận. Chỉ đọc hồ sơ công khai của bạn.")}</p><a class="btn dark" href="/auth/github?return=\${back}">${svg(GITHUB)}\${T("Sign in with GitHub", "Đăng nhập bằng GitHub")}</a></div>\`;
    const top = items.filter(c => !c.parent);
    list.innerHTML = top.length ? top.slice().reverse().map(one).join("") : \`<p class="none">\${T("No comments yet. Be the first.", "Chưa có bình luận nào. Bạn là người đầu tiên nhé.")}</p>\`;
    const h = document.querySelector("#comments h2"); if (h) h.dataset.count = items.filter(c => !c.deleted).length;
  }
  if (new URLSearchParams(location.search).get("signin") === "failed") {
    history.replaceState(null, "", location.pathname + location.hash);
    setTimeout(() => { const n = document.createElement("p"); n.className = "none"; n.style.color = "#e03131"; n.textContent = T("Sign-in with GitHub did not go through. Try again in a moment.", "Đăng nhập GitHub chưa thành công. Thử lại sau giây lát nhé."); box.prepend(n); }, 0);
  }
  async function load() {
    const r = await fetch("/api/comments?slug=" + encodeURIComponent(SLUG), { credentials: "same-origin" });
    const d = await r.json(); me = d.me; items = d.comments; render();
  }
  document.getElementById("comments").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, ta = f.querySelector("textarea"), err = f.querySelector(".err"), btn = f.querySelector("button");
    if (!ta.value.trim()) return;
    btn.disabled = true; err.textContent = "";
    try {
      const r = await fetch("/api/comments", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: SLUG, body: ta.value, parent: f.dataset.parent || null }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      items.push(d); replyTo = null; render();
    } catch (x) { err.textContent = x.message; btn.disabled = false; }
  });
  document.getElementById("comments").addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "out") { await fetch("/auth/logout", { method: "POST", credentials: "same-origin" }); me = null; render(); return; }
    if (b.dataset.reply) { replyTo = +b.dataset.reply; render(); document.querySelector(\`#c\${replyTo} .replies textarea\`)?.focus(); return; }
    if (b.dataset.del) {
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = T("Sure? Click again", "Chắc chưa? Bấm lần nữa"); return; }
      const r = await fetch("/api/comments/" + b.dataset.del, { method: "DELETE", credentials: "same-origin" });
      if (r.ok) { const c = items.find(x => x.id === +b.dataset.del); c.deleted = true; c.body = ""; c.user = null; render(); }
    }
  });
  addEventListener("oy-lang", render);
  load();
})();
</script>
</body>
</html>
`;
}

export function sitemap(projects, today) {
  const urls = [{ loc: `${ORIGIN}/`, lastmod: today }, ...projects.map(p => ({ loc: `${ORIGIN}/p/${p.slug}`, lastmod: p.added }))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
}
