// Pages that gather projects or explain OpenYard, rendered by the Worker so search engines read
// the full list (the home page builds its grid in the browser):
//   /projects                     every project, with search and sort
//   /apps, /open-source,
//   /for-people, /wild-ideas, /dev-tools   one page per type or kind, each with its own words
//   /tags/<tag>                   projects sharing a tag (indexed once two or more share it)
//   /about, /community            why OpenYard exists, and how to take part
// Same look, nav, footer and EN/VI switch as the project pages in pages.js.
import { ORIGIN, esc, en, vi, t, host, ARROW, ic, I, VERDICT, TYPE, KIND, CSS, head, LANG_JS, siteNav, siteFooter, logoClass, initials, since } from "./pages.js";

const IMG = { url: `${ORIGIN}/og.png?v=2`, w: 1200, h: 630 };

// One page per type or kind. `name` is the chip label, `title` the <title>, `lead` the words under the heading.
export const CATS = [
  { slug: "apps", test: p => p.type === "app", c: "#f59e0b",
    name: ["Free apps", "App miễn phí"], h1: ["Free apps", "App miễn phí"],
    title: "Free apps and web tools made by indie makers · OpenYard",
    lead: ["Apps and web tools you can use without paying, made by small teams and solo makers. Most run in the browser with no signup.", "App và công cụ web dùng được mà không phải trả tiền, do nhóm nhỏ và người làm một mình làm ra. Phần lớn chạy ngay trên trình duyệt, không cần đăng ký."] },
  { slug: "open-source", test: p => p.type === "open-source", c: "#3b82f6",
    name: ["Open source", "Mã nguồn mở"], h1: ["Open-source projects", "Dự án mã nguồn mở"],
    title: "Open-source projects, each read for malware · OpenYard",
    lead: ["Free projects with their code in the open. Every repository is read by vetcode for malware and supply-chain tricks, and checked again whenever the code changes.", "Dự án miễn phí, công khai mã nguồn. Mọi repo đều được vetcode đọc để tìm mã độc và thủ đoạn chuỗi cung ứng, và kiểm tra lại mỗi khi code thay đổi."] },
  { slug: "for-people", test: p => p.kinds.includes("people"), c: "#10b981",
    name: ["For people", "Cho mọi người"], h1: ["For people software forgets", "Cho những người bị phần mềm bỏ quên"],
    title: "Free apps for everyday people · OpenYard",
    lead: ["Farmers, small creators, local groups, anyone with a job to get done. Useful apps nobody would build for the money.", "Nông dân, người làm nội dung nhỏ, hội nhóm địa phương, ai cần làm xong việc của mình. Những app hữu ích không ai làm vì chẳng có lời."] },
  { slug: "wild-ideas", test: p => p.kinds.includes("wild"), c: "#b67cff",
    name: ["Wild ideas", "Ý tưởng điên rồ"], h1: ["Wild ideas", "Ý tưởng điên rồ"],
    title: "Wild ideas: strange free experiments and side projects · OpenYard",
    lead: ["Experiments too strange for a startup, built because they are fun. Play with them, then tell the maker what you think.", "Những thí nghiệm quá lạ để khởi nghiệp, làm ra vì thấy vui. Chơi thử rồi nói cho người làm biết bạn nghĩ gì."] },
  { slug: "dev-tools", test: p => p.kinds.includes("dev"), c: "#7c9cff",
    name: ["Dev tools", "Công cụ cho dev"], h1: ["Tools for developers", "Công cụ cho dev"],
    title: "Free developer tools and open-source building blocks · OpenYard",
    lead: ["Libraries, agents, CLIs and workflows that make the next project faster. Free to use, and the open-source ones come with a code check.", "Thư viện, agent, CLI và quy trình giúp dự án sau làm nhanh hơn. Dùng miễn phí, và các dự án mã nguồn mở đều có kết quả kiểm tra code."] },
];
const ALL = { slug: "projects", test: () => true, c: "#6d5bd0", name: ["All", "Tất cả"], h1: ["All projects", "Tất cả dự án"],
  title: "Free apps, wild ideas and open-source tools · OpenYard",
  lead: ["Useful apps, strange experiments and developer tools from the OpenYard team and the community. All free, many open source, and every repository read for malware before you install it.", "App hữu ích, thí nghiệm kỳ quặc và công cụ cho dev, của nhóm OpenYard lẫn cộng đồng. Tất cả đều miễn phí, nhiều dự án mở mã nguồn, và mọi repo đều được đọc để tìm mã độc trước khi bạn cài."] };
export const CAT = Object.fromEntries([ALL, ...CATS].map(c => [c.slug, c]));

const fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
const tagCounts = list => { const m = new Map(); list.forEach(p => (p.tags || []).forEach(x => m.set(x, (m.get(x) || 0) + 1))); return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
/** Tags with a page worth indexing. */
export const tagPages = all => tagCounts(all).filter(([, n]) => n >= 2).map(([x]) => x);
export const HUB_PATHS = ["/projects", ...CATS.map(c => `/${c.slug}`), "/about", "/community"];

export const HUB_CSS = `
.pulse{display:flex;align-items:center;gap:18px 26px;flex-wrap:wrap;margin-top:26px}
.pulse .stack img{width:34px;height:34px;margin:0;border-width:2.5px;display:block}.pulse .stack>*{display:block;margin-left:-10px;position:relative;transition:transform .3s var(--ease)}.pulse .stack>:first-child{margin-left:0}.pulse .stack>a:hover{transform:translateY(-3px);z-index:2}.pulse .stack .more{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;border:2.5px solid var(--bg);background:var(--bg2);font-size:11.5px;font-weight:600;color:var(--muted)}
.pulse dl{display:flex;gap:22px;flex-wrap:wrap;margin:0}.pulse dl div{display:flex;flex-direction:column}
.pulse dt{font-size:22px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.1}.pulse dd{margin:0;font-size:12.5px;color:var(--muted)}
.lcols{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:28px;align-items:start}
@media (max-width:1060px){.lcols{grid-template-columns:minmax(0,1fr)}}
.lrail{position:sticky;top:88px;display:flex;flex-direction:column;gap:12px}@media (max-width:1060px){.lrail{position:static}}
.feed{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column}
.feed a{display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--line);font-size:13.5px;line-height:1.4}.feed li:first-child a{border-top:0}
.feed img{flex:none;width:28px;height:28px;border-radius:50%;background:var(--bg2)}.feed b{font-weight:600}.feed p{margin:3px 0 0;color:var(--muted);overflow-wrap:anywhere}.feed small{color:var(--muted);font-size:12px}
.feed a:hover p{color:var(--ink)}.quiet{margin:6px 0 0;color:var(--muted);font-size:14px}
.pc .new{position:absolute;top:12px;left:12px;z-index:1;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:999px;color:#fff;background:linear-gradient(100deg,#7c9cff,#b67cff,#ff7eb0)}
.pby{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}.pby .who2{font-weight:500;margin-right:4px}
.ring.sm{padding:2px}.ring.sm img{width:20px;height:20px;border-width:2px}.ring.sm.plain{padding:0}.ring.sm.plain img{width:24px;height:24px}
.pby .kd{font-size:12px;padding:2px 9px;border-radius:999px;border:1px solid color-mix(in srgb,var(--kc) 45%,var(--line));color:var(--ink)}
.pm .on{color:var(--ink)}.pm .on .ic{color:#f43f5e}.pm span:nth-child(2).on .ic{color:var(--c)}
.pc.yours{border:1.5px dashed var(--line2);background:transparent}.pc.yours:hover{border-color:#b67cff}
.pc.yours .pv{display:grid;place-items:center;background:repeating-linear-gradient(135deg,transparent 0 10px,color-mix(in srgb,#b67cff 8%,transparent) 10px 20px)}
.pc.yours .pv span{font-size:44px;font-weight:300;color:#b67cff}.pc.yours h3{font-size:20px;letter-spacing:-.025em}.pc.yours .go{margin-top:auto;padding-top:10px;color:#b67cff;font-weight:500;font-size:14px;display:flex;gap:6px;align-items:center}.pc.yours .go .ar{width:14px;height:14px}
.pc.yours[hidden]{display:none}

.hero.hub{padding:76px 0 36px}.hero.hub h1{font-size:clamp(40px,6vw,68px)}.hero.hub .desc{margin-bottom:0;max-width:44em}
.count{font-variant-numeric:tabular-nums;color:var(--muted);font-weight:500}
.cats{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.cats a{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line2);font-size:14px;font-weight:500;color:var(--muted);transition:color .2s,background .2s,border-color .2s}
.cats a:hover{color:var(--ink);background:var(--bg2)}.cats a[aria-current]{color:var(--bg);background:var(--ink);border-color:var(--ink)}
.cats a small{font-size:12px;opacity:.7;font-variant-numeric:tabular-nums}
.ptools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:22px}
.psearch{flex:1;min-width:220px;display:flex;align-items:center;gap:8px;height:42px;padding:0 14px;border-radius:999px;border:1px solid var(--line2);background:var(--solid)}
.psearch:focus-within{border-color:#8b7cff;box-shadow:0 0 0 4px rgba(139,124,255,.16)}
.psearch input{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--ink);font:15px Inter,system-ui,sans-serif}.psearch .ic{color:var(--muted);width:16px;height:16px}
.sorts{display:flex;gap:2px;padding:3px;border-radius:999px;border:1px solid var(--line2)}
.sorts button{height:34px;padding:0 14px;border:0;border-radius:999px;background:none;color:var(--muted);font:500 13.5px Inter,sans-serif;cursor:pointer}.sorts button[aria-pressed="true"]{background:var(--bg2);color:var(--ink)}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:16px}
.pc{position:relative;display:flex;flex-direction:column;border-radius:24px;border:1px solid var(--line);background:var(--bg2);overflow:hidden;transition:transform .7s var(--ease),border-color .3s,box-shadow .5s}
.pc:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--c) 45%,var(--line2));box-shadow:0 26px 60px -32px color-mix(in srgb,var(--c) 90%,transparent)}
.pc[hidden]{display:none}
.pv{aspect-ratio:2/1;overflow:hidden;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--c) 65%,#fff),var(--c))}
.pv img.shot{width:100%;height:100%;object-fit:cover;object-position:top;transition:transform 1.2s var(--ease)}.pc:hover .pv img.shot{transform:scale(1.05)}
.pv.gen{display:grid;place-items:center}.pv.gen img,.pv.gen .ini{width:84px;height:84px;border-radius:22px;background:#fff;padding:10px;object-fit:contain;box-shadow:0 18px 40px -16px rgba(0,0,0,.45)}.pv.gen img.full{padding:0;object-fit:cover}
.pv.gen .ini{padding:0;font-size:30px;background:color-mix(in srgb,var(--c) 70%,#000)}
.pb{display:flex;flex-direction:column;gap:8px;padding:18px 20px 20px;flex:1}
.ph{display:flex;align-items:center;gap:10px;min-width:0}
.ph img,.ph .ini{width:32px;height:32px;border-radius:9px;background:#fff;object-fit:contain;padding:3px;flex:none}.ph img.full{padding:0;object-fit:cover}.ph .ini{padding:0;font-size:12px;background:var(--c)}
.ph h3{font-size:20px;letter-spacing:-.025em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph .ptag{margin-left:auto;flex:none;font-size:12px;font-weight:500;color:var(--muted);border:1px solid var(--line2);border-radius:999px;padding:2px 9px}
.pb p{margin:0;color:var(--muted);font-size:14.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.pk{display:flex;flex-wrap:wrap;gap:6px}.pk>span{font-size:12px;padding:2px 9px;border-radius:999px;border:1px solid var(--line);background:var(--solid);color:var(--muted)}
.pk .kd{color:var(--ink);border-color:color-mix(in srgb,var(--kc) 45%,var(--line))}
.pm{margin-top:auto;padding-top:10px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:13px;color:var(--muted)}
.pm>span{display:inline-flex;align-items:center;gap:5px}.pm .ic{width:14px;height:14px}
.pm .vc{color:#10b981}.pm .vc.review{color:#f59e0b}.pm .vc.warning{color:#ef4444}
.pm .h{margin-left:auto;color:var(--ink);font-weight:500;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.none2{display:none;padding:40px 0;text-align:center;color:var(--muted)}.none2.on{display:block}
.tcloud{margin-top:56px}.tcloud h2,.others h2{font-size:clamp(22px,2.6vw,28px);margin-bottom:16px}
.tcloud div{display:flex;flex-wrap:wrap;gap:8px}
.tcloud a{display:inline-flex;gap:6px;align-items:center;font-size:14px;padding:5px 13px;border-radius:999px;border:1px solid var(--line2);transition:background .2s}.tcloud a:hover{background:var(--bg2)}.tcloud small{color:var(--muted);font-size:12px}
.others{margin-top:56px}
.prose{font-size:clamp(19px,2vw,23px);line-height:1.55;letter-spacing:-.015em;max-width:36em;margin:0;text-wrap:pretty}
.sec{margin-top:80px}.sec>h2{font-size:clamp(26px,3vw,36px);margin-bottom:10px}.sec>.sub{color:var(--muted);margin:0 0 24px;max-width:40em}
.pill3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}@media (max-width:860px){.pill3{grid-template-columns:1fr}}
.pl{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:8px;padding:26px;border-radius:24px;background:var(--bg2);border:1px solid var(--line);transition:transform .7s var(--ease),border-color .3s}
.pl:hover{transform:translateY(-4px);border-color:var(--line2)}
.pl::before{content:"";position:absolute;right:-70px;top:-70px;width:200px;height:200px;border-radius:50%;background:var(--c);opacity:.22;filter:blur(36px);transition:opacity .5s}.pl:hover::before{opacity:.45}
.pl h3{font-size:22px;position:relative}.pl p{margin:0;color:var(--muted);position:relative}.pl .go{margin-top:auto;padding-top:10px;font-size:14px;font-weight:500;display:flex;gap:6px;align-items:center;position:relative}.pl .ar{width:15px;height:15px;transition:transform .4s var(--ease)}.pl:hover .ar{transform:translate(2px,-2px)}
.hd2 .ar,.vl .ar{width:15px;height:15px}
.vals4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}@media (max-width:900px){.vals4{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:520px){.vals4{grid-template-columns:1fr}}
.vl{padding:22px;border-radius:20px;border:1px solid var(--line2);background:var(--solid)}.vl .ic{width:22px;height:22px;color:var(--c);margin-bottom:12px}.vl h3{font-size:17px;letter-spacing:-.015em}.vl p{margin:6px 0 0;color:var(--muted);font-size:14.5px}
.steps4{list-style:none;counter-reset:s;padding:0;margin:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}@media (max-width:900px){.steps4{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:520px){.steps4{grid-template-columns:1fr}}
.steps4 li{counter-increment:s;padding:22px;border-radius:20px;background:var(--bg2);border:1px solid var(--line)}
.steps4 li::before{content:"0" counter(s);display:block;font:600 13px "JetBrains Mono",ui-monospace,monospace;color:var(--c);margin-bottom:14px}
.steps4 h3{font-size:17px}.steps4 p{margin:6px 0 0;color:var(--muted);font-size:14.5px}
.roles{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}.roles>span{display:inline-flex;gap:7px;align-items:center;font-size:14px;padding:6px 14px;border-radius:999px;border:1px solid var(--line2);background:var(--solid)}.roles .ic{width:15px;height:15px;color:var(--c)}
.chans{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:12px}
.chan{display:block;padding:18px 20px;border-radius:18px;border:1px solid var(--line2);background:var(--solid);transition:border-color .2s,transform .5s var(--ease)}a.chan:hover{border-color:#b67cff;transform:translateY(-2px)}.chan b{font-weight:600;font-size:15.5px}.chan p{margin:6px 0 0;color:var(--muted);font-size:14.5px}
.hub .cta{margin-top:28px}
`;

// Search folds Vietnamese marks so "nong dan" finds "nông dân"; sort swaps between the
// server's trending order and newest first. Sections rise in as they scroll into view.
const HUB_JS = `<script>
(() => {
  const seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach(el => seen.observe(el));
  const grid = document.getElementById("pgrid"); if (!grid) return;
  const cards = [...grid.children], q = document.getElementById("q"), none = document.getElementById("none");
  const fold = s => s.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const filter = () => {
    const words = fold(q.value.trim()).split(/\\s+/).filter(Boolean); let n = 0;
    cards.forEach(c => { if (!c.dataset.q) { c.hidden = !!words.length; return; } const on = words.every(w => c.dataset.q.includes(w)); c.hidden = !on; if (on) { n++; c.classList.add("in"); } });
    none.classList.toggle("on", !n);
  };
  q.addEventListener("input", filter);
  const ph = () => q.placeholder = window.OY_LANG === "vi" ? "Tìm theo tên, thẻ hoặc công dụng" : "Search by name, tag or what it does";
  ph(); addEventListener("oy-lang", ph);
  const pre = new URLSearchParams(location.search).get("q"); if (pre) { q.value = pre; filter(); }
  document.querySelectorAll(".sorts button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".sorts button").forEach(x => x.setAttribute("aria-pressed", x === b));
    const key = b.dataset.s;
    cards.filter(c => c.dataset.q).sort((a, c) => key === "new" ? c.dataset.added.localeCompare(a.dataset.added) || a.dataset.o - c.dataset.o : a.dataset.o - c.dataset.o).forEach(c => grid.appendChild(c));
    const y = grid.querySelector(".yours"); if (y) grid.appendChild(y);
  }));
})();
</script>`;

const logoTag = (p, size) => p.logo
  ? `<img class="${logoClass(p)}" src="${esc(p.logo)}" alt="" width="${size}" height="${size}" loading="lazy">`
  : `<span class="ini" style="--c:${esc(p.color || "#6d5bd0")}">${initials(p.name)}</span>`;

/** A project card: what it is, who made it, how people responded. Links inside a link are not
 * allowed, so the maker and tags are plain text here; the tag cloud and profiles carry the links. */
export function card(p, i, now) {
  if (typeof now !== "number") now = Date.now(); // also called as list.map(card)
  const kc = { people: "#10b981", wild: "#b67cff", dev: "#7c9cff" };
  const v = p.vet && VERDICT[p.vet.verdict];
  const fresh = now - Date.parse(p.added) < 7 * 86400000;
  const mk = p.team ? null : p.maintainers[0];
  const own = !p.team && !mk ? p.owner : null; // signed in with email: show their nickname
  const q = fold([p.name, en(p.tagline), vi(p.tagline), en(p.description), vi(p.description), ...(p.tags || []), ...p.maintainers, ...p.kinds.flatMap(k => KIND[k] || [])].join(" "));
  return `<a class="pc reveal" style="--c:${esc(p.color || "#6d5bd0")};--d:${i % 6}" href="/p/${esc(p.slug)}" data-o="${i}" data-added="${esc(p.added)}" data-q="${esc(q)}">
  ${p.image ? `<div class="pv"><img class="shot" src="${esc(p.image)}" alt="${esc(p.name)} screenshot" loading="lazy"></div>` : `<div class="pv gen">${logoTag(p, 84)}</div>`}
  ${fresh ? `<span class="new">${t("New", "Mới")}</span>` : ""}
  <div class="pb">
    <div class="ph">${logoTag(p, 32)}<h3>${esc(p.name)}</h3><span class="ptag">${t(...TYPE(p))}</span></div>
    <p>${t(en(p.tagline), vi(p.tagline))}</p>
    <div class="pby"><span class="ring sm${p.team || (!mk && !own) ? " plain" : ""}"><img src="${p.team ? "/favicon.svg" : mk ? `https://github.com/${esc(mk)}.png?size=48` : own?.avatar ? esc(own.avatar) : "/favicon.svg"}" alt="" loading="lazy" width="22" height="22"></span><span class="who2">${p.team ? "OpenYard team" : mk ? `@${esc(mk)}` : own ? `@${esc(own.login)}` : t("a community member", "một thành viên")}</span>
      ${p.kinds.filter(k => KIND[k]).map(k => `<span class="kd" style="--kc:${kc[k]}">${t(...KIND[k])}</span>`).join("")}</div>
    <div class="pm"><span class="${p.likes ? "on" : ""}">${ic(I.heart)}${+p.likes || 0}</span><span class="${p.comments ? "on" : ""}">${ic(I.talk)}${+p.comments || 0}</span>${p.stats?.stars != null ? `<span>${ic(I.star)}${+p.stats.stars}</span>` : ""}${v ? `<span class="vc ${esc(p.vet.verdict)}" title="${esc(VERDICT[p.vet.verdict][0])}" data-vi-title="${esc(VERDICT[p.vet.verdict][1])}">${ic(p.vet.verdict === "clear" ? I.shield : I.alert)}</span>` : ""}<span class="h">${esc(host(p.url))}</span></div>
  </div></a>`;
}

export const crumbs = items => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) });
const collection = (name, url, desc, list) => ({ "@context": "https://schema.org", "@type": "CollectionPage", name, url, description: desc, isPartOf: { "@type": "WebSite", name: "OpenYard", url: ORIGIN },
  mainEntity: { "@type": "ItemList", numberOfItems: list.length, itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${ORIGIN}/p/${p.slug}`, name: p.name })) } });

export const page = ({ title, desc, path, jsonld, color, noindex = false, body, site, current = "", extra = "", css = "" }) => `${head({ title, desc, url: ORIGIN + path, image: IMG, jsonld, noindex }).replace("</style>", `${HUB_CSS}${css}</style>`)}
<body style="--c:${esc(color)}">
${siteNav(site, current)}
<main>${body}</main>
${siteFooter(site)}
${LANG_JS}
${HUB_JS}${extra}
</body></html>`;

export const hero = (pill, h1, lead, extra = "") => `<header class="hero hub"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">
  <div class="tags up" style="--d:1"><span class="pill on">${pill}</span></div>
  <h1 class="up" style="--d:2">${h1}</h1>
  <p class="desc up" style="--d:3">${lead}</p>${extra}
</div></header>`;

export const band = () => `<div class="band reveal"><div><h2>${t("Built something free?", "Bạn cũng làm ra thứ gì đó miễn phí?")}</h2><p>${t("Sign in with GitHub or email and put it in the yard in five minutes. It shows up in Showcase, where people try new projects.", "Đăng nhập bằng GitHub hoặc email rồi đưa lên OpenYard chỉ mất năm phút. Dự án sẽ có mặt trong mục Khoe dự án, nơi mọi người dùng thử dự án mới.")}</p></div><a class="btn dark" href="/submit">${t("Submit a project", "Gửi dự án")} ${ARROW}</a></div>`;

const yours = () => `<a class="pc yours reveal" href="/submit"><div class="pv"><span>+</span></div><div class="pb"><h3>${t("Your project here", "Dự án của bạn ở đây")}</h3><p>${t("Built something free? Put it in the yard in five minutes. It gets a page, a post in #showcase and a code check.", "Bạn làm ra thứ gì đó miễn phí? Đưa lên OpenYard chỉ mất năm phút. Dự án có trang riêng, một bài trong #showcase và được kiểm tra code.")}</p><span class="go">${t("Submit a project", "Gửi dự án")} ${ARROW}</span></div></a>`;

function grid(list, now = Date.now()) {
  return `<div class="ptools reveal">
    <label class="psearch">${ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}<input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="Search by name, tag or what it does" aria-label="Search projects" data-vi-aria-label="Tìm dự án"></label>
    <div class="sorts" role="group" aria-label="Sort" data-vi-aria-label="Sắp xếp"><button type="button" data-s="trend" aria-pressed="true">${t("Trending", "Đang lên")}</button><button type="button" data-s="new" aria-pressed="false">${t("Newest", "Mới nhất")}</button></div>
  </div>
  <div class="pgrid" id="pgrid">${list.map((p, i) => card(p, i, now)).join("")}${yours()}</div>
  <p class="none2" id="none">${t("Nothing matches. Try another word, or browse all projects.", "Không có kết quả. Thử từ khác, hoặc xem tất cả dự án.")}</p>`;
}

// The yard's pulse at the top of a list: projects, makers, this week's likes and comments, and faces.
// The people of the yard: anyone with an account, every maker named on a project (GitHub
// login, signed in or not), and whoever sent a listing without naming themselves (one per
// listing). They all count as members; the faces show them, people with accounts and makers
// first, then the rest by their project.
function pulseBar(all, pulse) {
  const makers = new Set(all.map(p => p.team ? "team" : p.maintainers[0]?.toLowerCase() || p.owner?.login?.toLowerCase() || `p:${p.slug}`));
  const person = (login, src) => [login.toLowerCase(), { label: `@${login}`, href: `/@${login}`, src: src || `https://github.com/${login}.png?size=56` }];
  const quiet = all.filter(p => !p.team && !p.maintainers.length && !p.owner); // sent without a name
  const seed = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); };
  const people = new Map();
  for (const [k, v] of [
    ...all.flatMap(p => p.maintainers.map(m => person(m))),
    ...all.filter(p => p.owner).map(p => person(p.owner.login, p.owner.avatar)),
    ...(pulse?.people || []).map(u => person(u.login, u.avatar)),
    ...(pulse?.recent || []).map(c => person(c.login, c.avatar)),
    ...(pulse?.accounts || []).map(a => person(a.login, a.avatar)),
    ...quiet.map(p => [`p:${p.slug}`, { label: `${p.name}`, href: `/p/${p.slug}`, src: `/a/${seed(p.slug)}/${encodeURIComponent((p.name.trim()[0] || "?").toUpperCase())}.svg` }]),
  ]) if (!people.has(k)) people.set(k, v); // the first mention keeps its picture
  const faces = [...people.values()].slice(0, 12);
  const n = [[all.length, ["projects", "dự án"]], [makers.size, ["makers", "người làm"]], ...(pulse ? [[people.size, ["members", "thành viên"]], [pulse.likes, ["likes this week", "lượt thích tuần này"]], [pulse.talk, ["comments this week", "bình luận tuần này"]]] : [])];
  return `<div class="pulse up" style="--d:4"><span class="stack">${faces.map(f => `<a href="${esc(f.href)}" title="${esc(f.label)}"><img src="${esc(f.src)}" alt="${esc(f.label)}" loading="lazy"></a>`).join("")}${people.size > faces.length ? `<span class="more">+${people.size - faces.length}</span>` : ""}</span>
    <dl>${n.map(([v, l]) => `<div><dt>${+v || 0}</dt><dd>${t(...l)}</dd></div>`).join("")}</dl></div>`;
}

// "Being talked about": the latest comments across the yard, each linking to its thread.
function rail(pulse, now = Date.now()) {
  const list = pulse?.recent || [];
  return `<aside class="lrail">
    <div class="box reveal"><span class="eyebrow">${t("Being talked about", "Đang bàn tán")}</span>
      ${list.length ? `<ul class="feed">${list.map(c => `<li><a href="${esc(c.href || `/p/${c.slug}#comments`)}"><img src="${esc(c.avatar || `https://github.com/${c.login}.png?size=48`)}" alt="" width="28" height="28" loading="lazy"><div><b>@${esc(c.login)}</b> ${t("on", "trên")} <b>${esc(c.name)}</b><p>${esc(c.body.length > 110 ? c.body.slice(0, 110) + "…" : c.body)}</p><small>${t(...since(c.created_at, now))}</small></div></a></li>`).join("")}</ul>`
        : `<p class="quiet">${t("No comments yet. Open a project and be the first to say what you think.", "Chưa có bình luận nào. Mở một dự án và là người đầu tiên nói bạn nghĩ gì.")}</p>`}
    </div>
    <a class="box dcard reveal" href="/discuss">${ic(I.talk)}<div><b>${t("Join the conversation", "Tham gia thảo luận")}</b><small>${t("Help, ideas, building in public", "Hỏi đáp, ý tưởng, chuyện làm sản phẩm")}</small></div></a>
  </aside>`;
}

/** /projects and the five type and kind pages. `all` is in trending order, as /api/projects returns it. */
export function listPage({ all, site, slug, pulse = null }) {
  const cat = CAT[slug], list = all.filter(cat.test), path = `/${slug}`;
  const chips = [ALL, ...CATS].map(c => `<a href="/${c.slug}"${c.slug === slug ? ' aria-current="page"' : ""}>${t(...c.name)}<small>${all.filter(c.test).length}</small></a>`).join("");
  const tags = tagCounts(list).filter(([x]) => tagPages(all).includes(x));
  const desc = `${cat.lead[0]} ${list.length} project${list.length === 1 ? "" : "s"}.`;
  const body = `${hero(slug === "projects" ? t("The yard", "OpenYard") : t(...cat.name), t(...cat.h1), t(...cat.lead), pulseBar(all, pulse))}
<div class="wrap">
  <div class="cats reveal" role="navigation" aria-label="Categories" data-vi-aria-label="Chuyên mục">${chips}</div>
  <div class="lcols"><div>${grid(list)}</div>${rail(pulse)}</div>
  ${tags.length ? `<section class="tcloud"><h2 class="reveal">${t("Browse by tag", "Xem theo thẻ")}</h2><div class="reveal">${tags.map(([x, n]) => `<a href="/tags/${esc(x)}">${esc(x)}<small>${n}</small></a>`).join("")}</div></section>` : ""}
  ${band()}
</div>`;
  return page({ title: cat.title, desc, path, color: cat.c, site, current: "/projects", noindex: !list.length, body,
    jsonld: [collection(cat.h1[0], ORIGIN + path, desc, list), crumbs([["OpenYard", ORIGIN], ...(slug === "projects" ? [] : [["Projects", `${ORIGIN}/projects`]]), [cat.h1[0], ORIGIN + path]])] });
}

/** /tags/<tag>, or null when no project has it. */
export function tagPage({ all, site, tag, pulse = null }) {
  const list = all.filter(p => (p.tags || []).includes(tag));
  if (!list.length) return null;
  const path = `/tags/${tag}`, desc = `${list.length} free project${list.length === 1 ? "" : "s"} tagged ${tag} on OpenYard: ${list.slice(0, 4).map(p => p.name).join(", ")}${list.length > 4 ? " and more" : ""}.`;
  const related = tagCounts(list).filter(([x]) => x !== tag && tagPages(all).includes(x)).slice(0, 16);
  const body = `${hero(`${t("Tag", "Thẻ")} <span class="count">· ${list.length}</span>`, esc(tag), t(`Free apps and tools tagged “${tag}”, made by people in the OpenYard community.`, `App và công cụ miễn phí gắn thẻ “${tag}”, do người trong cộng đồng OpenYard làm ra.`))}
<div class="wrap">
  <div class="lcols"><div>${grid(list)}</div>${rail(pulse)}</div>
  ${related.length ? `<section class="tcloud"><h2 class="reveal">${t("Related tags", "Thẻ liên quan")}</h2><div class="reveal">${related.map(([x, n]) => `<a href="/tags/${esc(x)}">${esc(x)}<small>${n}</small></a>`).join("")}</div></section>` : ""}
  <section class="others"><h2 class="reveal">${t("Browse more", "Xem thêm")}</h2><div class="cats reveal">${[ALL, ...CATS].map(c => `<a href="/${c.slug}">${t(...c.name)}</a>`).join("")}</div></section>
  ${band()}
</div>`;
  return page({ title: `Free ${tag} apps and tools · OpenYard`, desc, path, color: "#6d5bd0", site, current: "/projects", noindex: list.length < 2, body,
    jsonld: [collection(`Projects tagged ${tag}`, ORIGIN + path, desc, list), crumbs([["OpenYard", ORIGIN], ["Projects", `${ORIGIN}/projects`], [tag, ORIGIN + path]])] });
}

const VALUES = [
  ['<path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>', ["Free is the only rule", "Miễn phí là đủ"], ["If people can use it without paying, it belongs here. Open source welcome, not required.", "Ai cũng dùng được mà không phải trả tiền là đưa lên OpenYard được. Mở mã nguồn thì càng tốt, nhưng không bắt buộc."]],
  [I.code, ["Yours stays yours", "Dự án vẫn là của bạn"], ["Build on your own GitHub or site. We link to you, so the stars and credit go to you.", "Bạn làm trên GitHub hay trang của mình. Chúng mình chỉ dẫn link, sao và công trạng vẫn về bạn."]],
  [I.talk, ["Ask anything", "Cứ hỏi"], ["Stuck on code, design or building with AI? Ask in Discuss. Someone has been there.", "Bí code, bí thiết kế hay chưa biết dùng AI để làm app? Hỏi ở mục Thảo luận, kiểu gì cũng có người từng gặp."]],
  [I.shield, ["Read before you install", "Đọc trước khi cài"], ["Every listed repository is read by vetcode for malware and supply-chain tricks, and checked again when its code changes.", "Mọi repo trên OpenYard đều được vetcode đọc để tìm mã độc và thủ đoạn chuỗi cung ứng, và kiểm tra lại khi code thay đổi."]],
];
const STEPS = [
  [["Build anywhere", "Làm ở đâu cũng được"], ["On your own GitHub, site or app store. Any stack, with or without AI.", "Trên GitHub, trang web hay kho ứng dụng của bạn. Công nghệ gì cũng được, có hay không dùng AI."]],
  [["Share it here", "Mang lên OpenYard"], ["List it in five minutes. It gets its own page and a place in Showcase.", "Đăng dự án mất năm phút. Dự án có trang riêng và có mặt trong mục Khoe dự án."]],
  [["Get feedback", "Nhận góp ý"], ["Members try it, report bugs and suggest what to build next.", "Mọi người dùng thử, báo lỗi và gợi ý nên làm gì tiếp."]],
  [["Help each other", "Giúp nhau"], ["Ask when you are stuck, share updates, answer someone else's question.", "Bí thì hỏi, có gì mới thì kể, thấy ai cần thì giúp."]],
];

export function aboutPage({ all, site }) {
  const pill = CATS.slice(2).map((c, i) => `<a class="pl reveal" style="--c:${c.c};--d:${i}" href="/${c.slug}"><h3>${t(...c.h1)}</h3><p>${t(...c.lead)}</p><span class="go">${t(`${all.filter(c.test).length} projects`, `${all.filter(c.test).length} dự án`)} ${ARROW}</span></a>`).join("");
  const nums = [[I.folder, all.length, ["projects in the yard", "dự án trên OpenYard"]], [I.code, all.filter(p => p.type === "open-source").length, ["open-source repos", "repo mã nguồn mở"]], [I.shield, all.filter(p => p.vet).length, ["repos code-checked", "repo đã kiểm tra code"]]];
  const body = `${hero(t("About", "Giới thiệu"), t("Why OpenYard exists", "Vì sao có OpenYard"), t("A community for people who make free software: free apps, wild ideas and open tools.", "Cộng đồng của những người làm phần mềm miễn phí: app miễn phí, ý tưởng điên rồ và công cụ mở."))}
<div class="wrap">
  <p class="prose reveal">${t("AI made building software ten times cheaper, so more people are making things nobody would fund: an app for a few hundred farmers, an experiment too strange for a startup, the tool one developer needed. Most of them build alone. OpenYard is the yard they bring it to: people to show it to, ask for help and cheer them on. There is one rule: it has to be free.", "AI giúp làm phần mềm rẻ đi cả chục lần, nên ngày càng nhiều người làm ra những thứ chẳng ai rót vốn: một cái app cho vài trăm hộ nuôi heo, một thí nghiệm quá lạ để khởi nghiệp, một công cụ mà chính mình cần. Phần lớn họ làm một mình. OpenYard là nơi để mang những thứ đó tới: có người xem, có người giúp khi bí, có người cổ vũ. Luật chỉ có một: phải miễn phí.")}</p>
  <section class="sec"><h2 class="reveal">${t("What grows here", "Ở đây có gì")}</h2><p class="sub reveal">${t("Three kinds of projects, often all at once.", "Ba kiểu dự án, nhiều khi là cả ba.")}</p><div class="pill3">${pill}</div></section>
  <section class="sec"><h2 class="reveal">${t("What we stand for", "Điều chúng mình giữ")}</h2><div class="vals4">${VALUES.map(([icon, h, d], i) => `<div class="vl reveal" style="--d:${i}">${ic(icon)}<h3>${t(...h)}</h3><p>${t(...d)}</p></div>`).join("")}</div></section>
  <section class="sec"><h2 class="reveal">${t("How the yard works", "OpenYard hoạt động thế nào")}</h2><p class="sub reveal">${t("Build anywhere. Share here. Keep going.", "Làm ở đâu cũng được. Mang lên đây. Làm tiếp.")}</p><ol class="steps4">${STEPS.map(([h, d], i) => `<li class="reveal" style="--d:${i}"><h3>${t(...h)}</h3><p>${t(...d)}</p></li>`).join("")}</ol></section>
  <section class="sec"><div class="hls">${nums.map(([icon, n, label], i) => `<div class="num reveal" style="--d:${i}">${ic(icon)}<b>${+n}</b><span>${t(...label)}</span></div>`).join("")}</div></section>
  ${band()}
</div>`;
  const desc = "OpenYard is a community for people who make free software: free apps, wild ideas and open-source tools, with every repository read for malware.";
  return page({ title: "About OpenYard: a community for people who make free software", desc, path: "/about", color: "#b67cff", site, body,
    jsonld: [{ "@context": "https://schema.org", "@type": "AboutPage", name: "About OpenYard", url: `${ORIGIN}/about`, description: desc }, crumbs([["OpenYard", ORIGIN], ["About", `${ORIGIN}/about`]])] });
}

const CHANNELS = [
  ["showcase", ["Every new project shows up here the moment it is submitted. Try it and reply to the maker.", "Mỗi dự án mới xuất hiện ở đây ngay khi được gửi. Dùng thử rồi trả lời người làm."]],
  ["help", ["Stuck on code, design, deploys or building with AI? Ask, and answer when you can.", "Bí code, thiết kế, deploy hay dùng AI? Cứ hỏi, và trả lời khi bạn biết."]],
  ["ideas", ["Ideas for OpenYard or for your next project. Rough is fine.", "Ý tưởng cho OpenYard hay cho dự án tiếp theo của bạn. Chưa chín cũng được."]],
  ["progress", ["What you shipped this week, what broke, what you learned.", "Tuần này bạn làm được gì, hỏng gì, học được gì."]],
];
const CHAN_NAME = { showcase: ["Showcase", "Khoe dự án"], help: ["Help", "Hỏi đáp"], ideas: ["Ideas & feedback", "Ý tưởng & góp ý"], progress: ["Building in public", "Đang làm gì"] };
const WAYS = [
  [I.eye, ["Try a project", "Dùng thử một dự án"], ["Pick one, use it for real, and leave a comment on its page. Makers rarely hear from users.", "Chọn một dự án, dùng thật, rồi để lại bình luận trên trang của nó. Người làm hiếm khi được nghe người dùng nói."], "/projects", 0],
  [I.pr, ["Pick a good first issue", "Nhận một việc dễ"], ["Small, well-described tasks on the OpenYard site, a good first pull request.", "Việc nhỏ, mô tả rõ trên trang OpenYard, hợp để gửi pull request đầu tiên."], "issues", 1],
  [I.globe, ["Translate", "Dịch"], ["Every page is in English and Vietnamese. Help a maker get their listing into both.", "Mọi trang đều có tiếng Anh và tiếng Việt. Giúp người làm có bản giới thiệu ở cả hai thứ tiếng."], "contrib", 1],
  [I.share, ["Share your own", "Khoe dự án của bạn"], ["Built something free? Sign in and it takes five minutes.", "Bạn làm ra thứ gì đó miễn phí? Đăng nhập rồi chỉ mất năm phút."], "/submit", 0],
];

export function communityPage({ all, site }) {
  const href = k => k === "issues" ? `${site.repo}/issues?q=is%3Aopen+label%3A%22good+first+issue%22` : k === "contrib" ? `${site.repo}/blob/main/CONTRIBUTING.md` : k;
  const roles = [[I.code, ["Developers", "Lập trình viên"]], ['<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2A5.6 5.6 0 0 0 22 11c0-5-4.5-9-10-9z"/>', ["Designers", "Thiết kế"]], [I.globe, ["Translators", "Dịch thuật"]], [I.alert, ["Testers", "Kiểm thử"]], ['<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>', ["Idea people", "Góp ý tưởng"]]];
  const fresh = all.slice().sort((a, b) => b.added.localeCompare(a.added)).slice(0, 6);
  const logo = o => o.logo ? `<img class="${logoClass(o)}" src="${esc(o.logo)}" alt="" width="44" height="44" loading="lazy">` : `<span class="ini" style="--c:${esc(o.color || "#6d5bd0")}">${initials(o.name)}</span>`;
  const body = `${hero(t("Community", "Cộng đồng"), t("Come hang out in the yard.", "Ghé OpenYard chơi cùng mọi người."), t("Share what you are making, ask when you are stuck, help someone else. Developers, designers, translators, testers and people with ideas are all welcome.", "Khoe thứ bạn đang làm, hỏi khi bí, giúp người khác khi rảnh. Dev, designer, người dịch, người test hay chỉ có ý tưởng đều được chào đón."),
    `<div class="cta up" style="--d:4"><a class="btn dark" href="/discuss">${t("Open Discuss", "Vào Thảo luận")} ${ARROW}</a><a class="btn line" href="${esc(site.repo)}/issues/new?template=join-team.yml" target="_blank" rel="noopener">${t("Introduce yourself", "Giới thiệu bản thân")}</a><a class="btn line" href="${esc(site.repo)}" target="_blank" rel="noopener">${t("Contribute on GitHub", "Đóng góp trên GitHub")}</a></div>
  <div class="roles up" style="--d:5">${roles.map(([icon, x]) => `<span>${ic(icon)}${t(...x)}</span>`).join("")}</div>`)}
<div class="wrap">
  <section class="sec"><h2 class="reveal">${t("Where the talk happens", "Mọi người nói chuyện ở đâu")}</h2><p class="sub reveal">${t("Right here on openyard.cloud. Sign in with GitHub or just your email.", "Ngay trên openyard.cloud. Đăng nhập bằng GitHub hoặc chỉ cần email.")}</p>
    <div class="chans">${CHANNELS.map(([n, d], i) => `<a class="chan reveal" style="--d:${i}" href="/discuss/${n}"><b>${t(...CHAN_NAME[n])}</b><p>${t(...d)}</p></a>`).join("")}</div></section>
  <section class="sec"><h2 class="reveal">${t("Ways to help", "Cách để góp sức")}</h2><p class="sub reveal">${t("No need to be an expert. A few minutes helps a maker more than you think.", "Không cần là chuyên gia. Vài phút của bạn giúp người làm nhiều hơn bạn nghĩ.")}</p>
    <div class="vals4">${WAYS.map(([icon, h, d, k, ext], i) => `<a class="vl reveal" style="--d:${i}" href="${esc(href(k))}"${ext ? ' target="_blank" rel="noopener"' : ""}>${ic(icon)}<h3>${t(...h)}</h3><p>${t(...d)}</p></a>`).join("")}</div></section>
  ${fresh.length ? `<section class="sec"><div class="hd2 reveal"><h2 style="margin:0">${t("New in the yard", "Mới trên OpenYard")}</h2><a class="btn sm line" href="/projects">${t("All projects", "Tất cả dự án")} ${ARROW}</a></div>
    <div class="grid">${fresh.map((o, i) => `<a class="mini reveal" style="--d:${i};--c:${esc(o.color || "#6d5bd0")}" href="/p/${esc(o.slug)}">${logo(o)}<div><h3>${esc(o.name)}</h3><p>${t(en(o.tagline), vi(o.tagline))}</p></div>${ARROW}</a>`).join("")}</div></section>` : ""}
  ${band()}
</div>`;
  const desc = "Join the OpenYard community: share the free software you make, get feedback and testers, ask for help and help other makers.";
  return page({ title: "Join the OpenYard community of people who make free software", desc, path: "/community", color: "#b67cff", site, current: "/community", body,
    jsonld: [{ "@context": "https://schema.org", "@type": "WebPage", name: "OpenYard community", url: `${ORIGIN}/community`, description: desc }, crumbs([["OpenYard", ORIGIN], ["Community", `${ORIGIN}/community`]])] });
}
