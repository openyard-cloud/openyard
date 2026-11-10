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
const ic = (d, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z"/>',
  pr: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"/>',
  merged: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  issue: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
  done: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  talk: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
  fork: '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9M12 12v3"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  term: '<path d="m4 17 6-6-6-6M12 19h8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
};

// Code checks: what vetcode found when it read the repository (never ran it).
const CAP = {
  "reads environment or credential files": [I.key, ["Reads secrets or environment variables", "Đọc secret hoặc biến môi trường"]],
  "uses the network": [I.globe, ["Connects to the internet", "Kết nối internet"]],
  "runs other programs": [I.term, ["Starts other programs", "Chạy chương trình khác"]],
  "collects user and host details": [I.user, ["Reads user and machine details", "Đọc thông tin người dùng và máy"]],
  "writes into home or startup folders": [I.folder, ["Writes to home or startup folders", "Ghi vào thư mục home hoặc khởi động"]],
  "decodes or builds code at runtime": [I.code, ["Builds or decodes code while running", "Tạo hoặc giải mã code khi chạy"]],
};
const VERDICT = {
  clear: ["No signs of malware or supply-chain tricks", "Không thấy dấu hiệu mã độc hay thủ đoạn chuỗi cung ứng", "vetted", "#10b981"],
  review: ["Some things are worth a look", "Có vài chỗ nên xem lại", "review", "#f59e0b"],
  warning: ["Signs of malicious code", "Có dấu hiệu mã độc", "warning", "#ef4444"],
};
/** README badge: shields-style SVG with the latest verdict. */
export function badge(verdict) {
  const [, , word, color] = VERDICT[verdict] || [0, 0, "not checked", "#8b949e"];
  const left = "openyard", lw = 64, rw = 10 + word.length * 7, w = lw + rw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${left}: ${word}"><title>${left}: ${word}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#14141a"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/><rect width="${w}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="${lw / 2}" y="14">${left}</text><text x="${lw + rw / 2}" y="14">${word}</text></g></svg>`;
}
const since = (ms, now) => {
  const m = Math.max(0, Math.round((now - ms) / 60000)), h = Math.round(m / 60), d = Math.round(m / 1440);
  return m < 1 ? ["just now", "vừa xong"] : m < 60 ? [`${m} min ago`, `${m} phút trước`] : m < 1440 ? [`${h} h ago`, `${h} giờ trước`] : [`${d} d ago`, `${d} ngày trước`];
};
const svg = d => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;

const TYPE = p => p.status === "soon" ? ["Coming soon", "Sắp ra mắt"] : p.type === "app" ? ["Free app", "App miễn phí"] : ["Open source", "Mã nguồn mở"];
const STATUS = { live: ["Live", "Đang chạy"], beta: ["Beta", "Thử nghiệm"], soon: ["Coming soon", "Sắp ra mắt"] };
const KIND = { people: ["For people", "Cho mọi người"], wild: ["Wild idea", "Ý tưởng điên rồ"], dev: ["Dev tool", "Công cụ cho dev"] };

const CSS = `:root{--bg:#fff;--bg2:#f6f6f7;--solid:#fff;--ink:#0d0d0f;--muted:#6b6b73;--line:rgba(13,13,15,.08);--line2:rgba(13,13,15,.14);--shadow:0 1px 2px rgba(0,0,0,.04),0 12px 40px -12px rgba(0,0,0,.12);--aura:.4;--ease:cubic-bezier(.16,1,.3,1)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0a0a0c;--bg2:#111114;--solid:#141417;--ink:#f4f4f5;--muted:#9a9aa3;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--shadow:0 1px 2px rgba(0,0,0,.4),0 20px 60px -20px rgba(0,0,0,.7);--aura:.55}}
:root[data-theme="dark"]{--bg:#0a0a0c;--bg2:#111114;--solid:#141417;--ink:#f4f4f5;--muted:#9a9aa3;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--shadow:0 1px 2px rgba(0,0,0,.4),0 20px 60px -20px rgba(0,0,0,.7);--aura:.55}
*{box-sizing:border-box}html{overflow-x:clip}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-feature-settings:"cv11","ss01";overflow-x:clip}
a{color:inherit;text-decoration:none}h1,h2,h3{margin:0;font-weight:600;letter-spacing:-.035em;line-height:1.05}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}@media (max-width:520px){.wrap{padding:0 16px}}
.ic{width:18px;height:18px;flex:none}
nav{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:saturate(1.6) blur(18px);-webkit-backdrop-filter:saturate(1.6) blur(18px);border-bottom:1px solid var(--line)}
nav::after{content:"";position:absolute;left:0;bottom:-1px;height:2px;width:100%;transform-origin:0 50%;transform:scaleX(var(--sp,0));background:linear-gradient(90deg,#7c9cff,#b67cff,#ff7eb0,#ffc56b)}
nav .wrap{display:flex;align-items:center;gap:20px;height:64px}
.brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:17px;letter-spacing:-.02em}.brand img{width:24px;height:24px}
.brand em,.grad{font-style:normal;background:linear-gradient(100deg,#7c9cff 0%,#b67cff 35%,#ff7eb0 70%,#ffc56b 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.back{font-size:14px;color:var(--muted);transition:color .2s}.back:hover{color:var(--ink)}
.right{margin-left:auto;display:flex;gap:8px;align-items:center}
.np{display:flex;align-items:center;gap:10px;margin-right:6px;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .35s,transform .6s var(--ease)}
nav.pinned .np{opacity:1;transform:none;pointer-events:auto}
.np .nl{width:28px;height:28px;border-radius:8px;object-fit:contain;background:#fff;padding:3px}.np .nl.full{padding:0;object-fit:cover}.np .ini.nl{font-size:11px;padding:0}
.np b{font-size:14px;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
.chip{border:1px solid var(--line2);background:transparent;color:var(--ink);border-radius:999px;height:34px;padding:0 14px;font:500 13px Inter,sans-serif;cursor:pointer}.chip:hover{background:var(--bg2)}
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 22px;border-radius:999px;border:0;font:500 15px Inter,system-ui,sans-serif;color:inherit;background:none;cursor:pointer;white-space:nowrap;transition:transform .5s var(--ease),background .2s,opacity .2s,box-shadow .4s}
.btn:active{transform:scale(.97)}.btn.dark{background:var(--ink);color:var(--bg)}.btn.dark:hover{opacity:.92}.btn.line{border:1px solid var(--line2)}.btn.line:hover{background:var(--bg2)}
.btn.dark::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,color-mix(in srgb,var(--bg) 35%,transparent) 50%,transparent 65%);transform:translateX(-120%);transition:transform .9s var(--ease)}
.btn.dark:hover::after{transform:translateX(120%)}
.btn.sm{height:34px;padding:0 14px;font-size:13px}.btn svg{width:17px;height:17px}.btn .ar{width:15px;height:15px;transition:transform .4s var(--ease)}.btn:hover .ar{transform:translate(2px,-2px)}
.btn.ok{border-color:#34d399;color:#34d399}
.dc{background:#5865f2;color:#fff}.dc:hover{background:#4752c4}
@media (max-width:560px){.back{display:none}.dc span{display:none}.np b{display:none}}
.hero{position:relative;padding:84px 0 44px;isolation:isolate}
.aura{position:absolute;inset:-64px 0 auto;height:780px;z-index:-1;pointer-events:none;overflow:hidden;-webkit-mask-image:linear-gradient(#000 50%,transparent);mask-image:linear-gradient(#000 50%,transparent)}
.aura::before{content:"";position:absolute;inset:0;background-image:radial-gradient(var(--line2) 1px,transparent 1.3px);background-size:22px 22px;-webkit-mask-image:radial-gradient(60% 55% at 28% 35%,#000,transparent 75%);mask-image:radial-gradient(60% 55% at 28% 35%,#000,transparent 75%)}
.aura i{position:absolute;border-radius:50%;filter:blur(80px);opacity:var(--aura);animation:drift 22s ease-in-out infinite alternate}
.aura i:nth-child(1){width:560px;height:380px;left:-8%;top:30px;background:var(--c)}
.aura i:nth-child(2){width:440px;height:320px;right:0;top:-30px;background:#b67cff;opacity:calc(var(--aura) * .6);animation-duration:27s;animation-delay:-9s}
.aura i:nth-child(3){width:400px;height:300px;left:40%;top:300px;background:#ff7eb0;opacity:calc(var(--aura) * .45);animation-duration:31s;animation-delay:-15s}
@keyframes drift{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(60px,40px,0) scale(1.12)}100%{transform:translate3d(-40px,10px,0) scale(.94)}}
.up{animation:rise 1s var(--ease) both;animation-delay:calc(var(--d,0) * 80ms + 80ms)}
@keyframes rise{from{opacity:0;transform:translateY(18px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
.id{display:flex;align-items:center;gap:18px;margin-bottom:24px}
.logo{width:72px;height:72px;border-radius:20px;object-fit:contain;background:#fff;padding:10px;box-shadow:var(--shadow),0 18px 50px -18px var(--c);flex:none;animation:pop 1.1s var(--ease) both;transition:transform .6s var(--ease)}.logo.full{padding:0;object-fit:cover}
.logo:hover{transform:rotate(-6deg) scale(1.06)}
@keyframes pop{from{opacity:0;transform:scale(.6) rotate(-12deg)}to{opacity:1;transform:none}}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;padding:4px 11px;border-radius:999px;border:1px solid var(--line2);color:var(--muted);background:color-mix(in srgb,var(--bg) 60%,transparent)}
.pill.on{color:var(--ink)}.dot{width:6px;height:6px;border-radius:50%;background:#34d399;flex:none;animation:ping 2.4s infinite}
@keyframes ping{0%{box-shadow:0 0 0 0 rgba(52,211,153,.55)}70%{box-shadow:0 0 0 7px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
h1{font-size:clamp(44px,7vw,80px);letter-spacing:-.045em;padding-bottom:.06em;background:linear-gradient(180deg,var(--ink) 45%,color-mix(in srgb,var(--ink) 55%,var(--c)));-webkit-background-clip:text;background-clip:text;color:transparent}
.tl{font-size:clamp(19px,2.2vw,24px);color:var(--ink);margin:14px 0 10px;letter-spacing:-.02em;font-weight:500;text-wrap:balance}
.desc{color:var(--muted);font-size:17px;max-width:40em;margin:0 0 30px;text-wrap:pretty}
.cta{display:flex;gap:10px;flex-wrap:wrap}
.hero .btn.dark{box-shadow:0 10px 34px -12px color-mix(in srgb,var(--c) 85%,transparent)}
.stage{perspective:1600px;margin:12px 0 0}
.hero.two .cols{display:grid;grid-template-columns:minmax(0,1.04fr) minmax(0,.96fr);gap:56px;align-items:center}
.hero.two .desc{font-size:16.5px}
@media (max-width:980px){.hero.two .cols{grid-template-columns:1fr;gap:36px}}
.mono{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
.term{position:relative;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:#0b0d10;color:#e6edf3;box-shadow:var(--shadow),0 40px 110px -40px color-mix(in srgb,var(--c) 80%,transparent);overflow:hidden;min-width:0}
.term::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(520px 220px at 85% -10%,color-mix(in srgb,var(--c) 22%,transparent),transparent 70%)}
.tbar{position:relative;display:flex;align-items:center;gap:12px;height:46px;padding:0 8px 0 16px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025)}
.tbar .lights{display:flex;gap:7px;flex:none}.tbar .lights i{width:11px;height:11px;border-radius:50%}
.tbar .lights i:nth-child(1){background:#ff5f57}.tbar .lights i:nth-child(2){background:#febc2e}.tbar .lights i:nth-child(3){background:#28c840}
.tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;min-width:0}.tabs::-webkit-scrollbar{display:none}
.tab{font:500 13px Inter,system-ui,sans-serif;color:#9aa4b2;background:none;border:0;padding:0 12px;height:32px;border-radius:8px;cursor:pointer;white-space:nowrap;transition:color .2s,background .2s}
.tab:hover{color:#e6edf3}.tab[aria-selected="true"]{color:#fff;background:rgba(255,255,255,.09)}
.tab:focus-visible,.copy:focus-visible,.avs a:focus-visible{outline:2px solid color-mix(in srgb,var(--c) 70%,#fff);outline-offset:2px}
.panel{position:relative;padding:22px 20px 20px}.panel[hidden]{display:none}
.panel pre{margin:0;white-space:pre-wrap;overflow-wrap:break-word;font:500 14.5px/1.75 "JetBrains Mono",ui-monospace,Menlo,monospace}
.panel .w{white-space:nowrap}
.panel .ps{color:color-mix(in srgb,var(--c) 65%,#fff);user-select:none;margin-right:10px}
.cur{display:inline-block;width:.55em;height:1.15em;margin-left:4px;vertical-align:-.2em;background:color-mix(in srgb,var(--c) 70%,#fff);animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.panel .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:16px 0 0}
.panel .note{margin:0;color:#8f9aa8;font-size:13.5px;line-height:1.55}
.copy{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;height:36px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#c9d1d9;font:500 12.5px Inter,sans-serif;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.copy:hover{background:rgba(255,255,255,.09);color:#fff}.copy .ic{width:15px;height:15px}.copy.ok{color:#34d399;border-color:#34d399}
.sc{display:inline-flex;align-items:center;gap:4px;margin-left:2px;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--bg) 22%,transparent);font:600 12.5px "JetBrains Mono",ui-monospace,monospace}.sc .ic{width:13px;height:13px}
.meta{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:12px;margin-bottom:14px}
@media (max-width:760px){.meta{grid-template-columns:1fr}}
.meta>div{padding:18px 20px;border-radius:18px;background:var(--bg2);border:1px solid var(--line)}
.meta h3{font-size:13px;letter-spacing:0;font-weight:600;color:var(--muted);margin:0 0 12px}
.lbar{display:flex;height:10px;border-radius:999px;overflow:hidden;gap:2px;background:var(--line)}
.lbar i{display:block;height:100%;min-width:3px;transform-origin:0 50%}
.reveal.in .lbar i{animation:grow 1s var(--ease) both;animation-delay:calc(var(--k) * 70ms)}
@keyframes grow{from{transform:scaleX(0)}}
.lleg{display:flex;flex-wrap:wrap;gap:6px 16px;margin:12px 0 0;padding:0;list-style:none;font-size:13px}
.lleg li{display:inline-flex;align-items:center;gap:6px}.lleg b{font-weight:600}.lleg span{color:var(--muted);font:12.5px "JetBrains Mono",ui-monospace,monospace}
.lleg i{width:9px;height:9px;border-radius:50%}
.avs{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.avs a{display:block;border-radius:50%;transition:transform .4s var(--ease)}.avs a:hover{transform:translateY(-3px) scale(1.06)}
.avs img{display:block;width:36px;height:36px;border-radius:50%;background:var(--bg);border:2px solid var(--bg2)}
.avs .more{font-size:13px;color:var(--muted);margin-left:4px}
@media (prefers-reduced-motion: reduce){.cur{animation:none}.reveal.in .lbar i{animation:none}}
.frame{--p:1;position:relative;margin:0;border-radius:22px;overflow:hidden;border:1px solid var(--line2);background:var(--solid);box-shadow:var(--shadow),0 50px 120px -50px color-mix(in srgb,var(--c) 70%,transparent);transform-origin:50% 0;transform:rotateX(calc((1 - var(--p)) * 16deg)) scale(calc(.93 + var(--p) * .07));opacity:calc(.55 + var(--p) * .45)}
.frame .bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:40px;padding:0 14px;border-bottom:1px solid var(--line);background:var(--bg2)}
.frame .lights{display:flex;gap:7px}.frame .lights i{width:11px;height:11px;border-radius:50%;background:var(--line2)}
.frame:hover .lights i:nth-child(1){background:#ff5f57}.frame:hover .lights i:nth-child(2){background:#febc2e}.frame:hover .lights i:nth-child(3){background:#28c840}
.frame .url{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);padding:3px 14px;border-radius:8px;background:var(--solid);border:1px solid var(--line);max-width:52vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.frame .url svg{width:12px;height:12px;flex:none}
.zoom{display:block;position:relative;width:100%;padding:0;border:0;background:var(--bg2);cursor:zoom-in;overflow:hidden}
.zoom img{display:block;width:100%;height:auto;transition:transform 1.4s var(--ease)}
.frame:hover .zoom img{transform:scale(1.02)}
.zoom::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.13),transparent 60%);opacity:0;transition:opacity .4s}
.frame:hover .zoom::after{opacity:1}
.hint{position:absolute;right:14px;bottom:14px;display:inline-flex;gap:6px;align-items:center;font:500 12.5px Inter,sans-serif;padding:7px 12px;border-radius:999px;background:rgba(10,10,12,.62);color:#fff;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;transform:translateY(8px);transition:opacity .3s,transform .5s var(--ease)}
.hint svg{width:14px;height:14px}.frame:hover .hint,.zoom:focus-visible .hint{opacity:1;transform:none}
.gen{aspect-ratio:2/1;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--c) 70%,#fff),var(--c))}.gen img{width:120px;height:120px;border-radius:28px;background:#fff;padding:14px}
dialog.lb{max-width:none;max-height:none;width:fit-content;height:fit-content;margin:auto;padding:0;border:0;background:transparent;overflow:visible}
dialog.lb::backdrop{background:rgba(5,5,8,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
dialog.lb img{display:block;max-width:94vw;max-height:90vh;border-radius:14px;box-shadow:0 30px 120px rgba(0,0,0,.6);cursor:zoom-out}
dialog.lb[open]{animation:zin .5s var(--ease)}@keyframes zin{from{opacity:0;transform:scale(.92)}}
.specs{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:1px;margin:48px 0 0;border-radius:20px;overflow:hidden;background:var(--line);border:1px solid var(--line)}
.specs>div{background:var(--bg2);padding:18px 20px;min-width:0;transition:background .3s}.specs>div:hover{background:color-mix(in srgb,var(--bg2) 70%,var(--line2))}
.specs dt{font-size:12.5px;color:var(--muted);font-weight:500;margin-bottom:8px}
.specs dd{margin:0;font-weight:500;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
@media (max-width:760px){.specs{grid-template-columns:repeat(2,minmax(0,1fr))}.specs>div:last-child:nth-child(odd){grid-column:1/-1}}
.who{display:inline-flex;align-items:center;gap:8px}.who img{width:24px;height:24px;border-radius:50%;background:var(--bg)}
.who a:hover{text-decoration:underline}
.tg{font-size:13px;padding:2px 9px;border-radius:999px;background:var(--solid);border:1px solid var(--line)}
section.more{padding:80px 0 24px}
.more h2{font-size:clamp(26px,3vw,34px);margin-bottom:22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:14px}
.mini{position:relative;display:flex;gap:14px;align-items:center;padding:16px;border-radius:18px;border:1px solid var(--line2);background:var(--solid);transition:transform .6s var(--ease),border-color .3s,box-shadow .5s}
.mini:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 50%,var(--line2));box-shadow:0 22px 50px -26px color-mix(in srgb,var(--c) 90%,transparent)}
.mini img{width:44px;height:44px;border-radius:12px;object-fit:contain;background:#fff;padding:5px;flex:none;transition:transform .6s var(--ease)}.mini img.full{padding:0;object-fit:cover}
.mini:hover img,.mini:hover .ini{transform:scale(1.08) rotate(-4deg)}
.mini>div{min-width:0}.mini h3{font-size:16px;letter-spacing:-.02em}.mini p{margin:2px 0 0;font-size:13.5px;color:var(--muted);line-height:1.4}
.mini .ar{margin-left:auto;width:16px;height:16px;color:var(--muted);flex:none;opacity:0;transform:translate(-4px,4px);transition:opacity .3s,transform .5s var(--ease)}
.mini:hover .ar{opacity:1;transform:none}
.band{position:relative;overflow:hidden;margin:56px 0 0;padding:36px;border-radius:26px;background:var(--bg2);border:1px solid var(--line);display:flex;gap:24px;align-items:center;justify-content:space-between;flex-wrap:wrap;isolation:isolate}
.band::before{content:"";position:absolute;inset:-50%;z-index:-1;background:radial-gradient(400px 200px at 30% 40%,rgba(124,156,255,.22),transparent 70%),radial-gradient(400px 200px at 70% 60%,rgba(255,126,176,.2),transparent 70%);animation:drift 18s ease-in-out infinite alternate}
.band h2{font-size:clamp(22px,2.6vw,30px);max-width:18em}.band p{margin:8px 0 0;color:var(--muted)}
.act,.talk{margin:72px 0 0}.act h2,.talk h2{font-size:clamp(26px,3vw,34px);margin-bottom:6px}.act .sub,.talk .sub{color:var(--muted);margin:0;font-size:14.5px}
.hd2{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 16px;flex-wrap:wrap;margin-bottom:22px}
.sync{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);padding:6px 12px;border-radius:999px;border:1px solid var(--line2)}
.nums{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}
@media (max-width:860px){.nums{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:520px){.nums{grid-template-columns:repeat(2,minmax(0,1fr))}.nums>.num:last-child:nth-child(odd){grid-column:1/-1}}
.num{padding:16px 18px;border-radius:18px;background:var(--bg2);border:1px solid var(--line);transition:transform .6s var(--ease),border-color .3s}
.num:hover{transform:translateY(-3px);border-color:var(--line2)}
.num svg{display:block;width:18px;height:18px;color:var(--muted);margin-bottom:14px;transition:color .3s,transform .6s var(--ease)}
.num:hover svg{color:var(--c);transform:scale(1.15) rotate(-8deg)}
.num b{display:block;font-size:32px;font-weight:600;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}
.num>span{display:block;font-size:13px;color:var(--muted);margin-top:6px;line-height:1.35}
.num em{font-style:normal;font-size:13px;font-weight:500;letter-spacing:0;color:#10b981;margin-left:6px;vertical-align:middle}
.hl{margin-top:56px}
.chk{margin-top:56px}.chk .sync a{color:inherit}.chk code{font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace}
.vgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:12px;margin-bottom:12px}
@media (max-width:760px){.vgrid{grid-template-columns:1fr}}
.verdict{display:flex;gap:14px;align-items:flex-start;padding:22px;border-radius:18px;border:1px solid var(--line2);background:var(--solid)}
.verdict .ic{flex:none;width:34px;height:34px;padding:7px;border-radius:12px;color:#fff;background:#10b981}
.verdict.review .ic{background:#f59e0b}.verdict.warning .ic{background:#ef4444}
.verdict b{display:block;font-size:17px;font-weight:600;letter-spacing:-.01em;line-height:1.3}
.verdict span{display:block;font-size:13px;color:var(--muted);margin-top:6px}
.verdict ul{list-style:none;padding:0;margin:14px 0 0;display:grid;gap:6px;font-size:13px;color:var(--muted)}
.verdict li{display:flex;gap:7px;align-items:center}.verdict li .ic{width:14px;height:14px;padding:0;border-radius:0;background:none;color:#10b981}
.vlabel{padding:18px 20px;border-radius:18px;border:1px solid var(--line2);background:var(--solid)}
.vlabel h3{font-size:14px;font-weight:600;margin-bottom:10px}
.vlabel ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.vlabel li{display:flex;align-items:center;gap:10px;font-size:14px}
.vlabel li .ic{width:18px;height:18px;color:var(--c);flex:none}
.vlabel li small{margin-left:auto;color:var(--muted);font-size:12.5px}
.vlabel li em{font-style:normal;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;background:#fef3c7;color:#b45309}
.vlabel .none{font-size:14px;color:var(--muted);line-height:1.5}
.vlabel .chg{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:13px;color:#b45309;line-height:1.45}
.vlabel .chg .ic{width:16px;height:16px;flex:none;margin-top:2px}
.sev{flex:none;font:600 11px Inter,sans-serif;text-transform:uppercase;letter-spacing:.04em;padding:2px 7px;border-radius:6px;background:var(--bg2);color:var(--muted)}
.sev.critical{background:#fee2e2;color:#b91c1c}.sev.high{background:#ffedd5;color:#c2410c}.sev.medium{background:#fef9c3;color:#a16207}
.vfoot{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px;padding:12px 14px;border-radius:14px;background:var(--bg2)}
.vfoot code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}
.copy.lt{border-color:var(--line2);background:var(--solid);color:var(--ink)}.copy.lt:hover{background:var(--bg);color:var(--ink)}
.fine{font-size:12.5px;color:var(--muted);margin-top:12px;line-height:1.5}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.hero.ck h1{font-size:clamp(34px,5.4vw,60px);overflow-wrap:anywhere}.hero.ck h1 a{color:inherit}
.hero.ck .pill .ic{width:14px;height:14px;margin-right:6px;vertical-align:-2px}
.hero.ck .cta{flex-direction:column;align-items:stretch;max-width:640px}
.ckf{display:flex;gap:8px;padding:6px;border-radius:999px;border:1px solid var(--line2);background:var(--solid);box-shadow:var(--shadow)}
.ckf input{flex:1;min-width:0;border:0;background:none;padding:0 16px;font:15px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink);outline:none}
.ckf .btn{height:44px}.ckf .btn .ic{width:16px;height:16px}
@media (max-width:520px){.ckf{flex-direction:column;border-radius:18px}.ckf input{height:44px}}
.hero.ck #share{align-self:flex-start}
.ckmsg{font-size:13.5px;color:#b91c1c}
.wait{display:flex;gap:14px;align-items:center;margin-top:8px;padding:20px 22px;border-radius:18px;border:1px solid var(--line2);background:var(--solid)}
.wait b{display:block;font-weight:600}.wait span{display:block;font-size:13.5px;color:var(--muted);margin-top:4px}.wait .el{display:inline;color:var(--ink);font-variant-numeric:tabular-nums}
.wait.bad .ic{width:28px;height:28px;color:#ef4444;flex:none}
.spin{flex:none;width:28px;height:28px;border-radius:50%;border:3px solid var(--line2);border-top-color:var(--c);animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.how{list-style:none;padding:0;margin:40px 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width:760px){.how{grid-template-columns:1fr}}
.how li{display:flex;gap:12px;align-items:center;padding:18px;border-radius:18px;border:1px solid var(--line2);background:var(--solid);font-size:14.5px}
.how .ic{width:22px;height:22px;color:var(--c);flex:none}
.recent{margin-top:56px}.recent h2{margin-bottom:16px}
.rgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:10px}
.rc{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid var(--line2);background:var(--solid);min-width:0}
.rc b{font-weight:500;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rc small{margin-left:auto;color:var(--muted);font-size:12px;white-space:nowrap}
.vd .ic{width:18px;height:18px;color:#10b981}.vd.review .ic{color:#f59e0b}.vd.warning .ic{color:#ef4444}
.fine.skip .ic{width:14px;height:14px;vertical-align:-2px;margin-right:6px}.fine code{font-size:12px;padding:1px 5px;border-radius:5px;background:var(--bg2)}
.hls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width:860px){.hls{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.hls{grid-template-columns:1fr}}
.hls .num b{color:var(--c)}
.hls .num small{display:block;font-size:12.5px;color:var(--muted);margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
.lists{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;align-items:start}
.list{border-radius:18px;border:1px solid var(--line2);background:var(--solid);overflow:hidden}
.list h3{font-size:14px;letter-spacing:0;font-weight:600;padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px}
.list h3 .n{font-size:12px;font-weight:500;color:var(--muted);padding:1px 8px;border-radius:999px;background:var(--bg2)}
.list h3 a{margin-left:auto;color:var(--muted);font-weight:500;transition:color .2s}.list h3 a:hover{color:var(--ink)}
.it{display:flex;gap:12px;align-items:flex-start;padding:12px 16px;border-bottom:1px solid var(--line);font-size:14px;line-height:1.4;transition:background .2s}.it:last-child{border-bottom:0}.it:hover{background:var(--bg2)}
.it>div{min-width:0;overflow-wrap:anywhere}
.st{width:16px;height:16px;margin-top:1px;flex:none}.st.open{color:#10b981}.st.merged{color:#8b5cf6}.st.closed{color:#f43f5e}
.it .go{margin-left:auto;width:14px;height:14px;margin-top:2px;flex:none;color:var(--muted);opacity:0;transform:translate(-4px,4px);transition:opacity .25s,transform .5s var(--ease)}
.it:hover .go{opacity:1;transform:none}
.it small{display:block;color:var(--muted);font-size:12.5px;margin-top:3px}
.empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:34px 16px;color:var(--muted);font-size:14px}
.empty svg{width:26px;height:26px;opacity:.55}.empty a{color:var(--ink);font-weight:500}.empty a:hover{text-decoration:underline}
.ini{display:grid;place-items:center;font-weight:700;font-size:26px;color:#fff;background:var(--c,#6d5bd0)}
.logo.ini{padding:0}.mini .ini{width:44px;height:44px;border-radius:12px;font-size:16px;flex:none;transition:transform .6s var(--ease)}
.talk .sub{margin-bottom:20px}
.me{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted);margin-bottom:10px}.me img{width:24px;height:24px;border-radius:50%}
.me button,.cm .acts button{background:none;border:0;padding:0;color:var(--muted);font:500 13px Inter,sans-serif;cursor:pointer}.me button:hover,.cm .acts button:hover{color:var(--ink)}
.compose{border:1px solid var(--line2);border-radius:18px;background:var(--solid);padding:12px;transition:border-color .2s,box-shadow .3s}
.compose:focus-within{border-color:#8b7cff;box-shadow:0 0 0 4px rgba(139,124,255,.16)}
.compose textarea{width:100%;min-height:76px;border:0;outline:0;resize:vertical;background:transparent;color:var(--ink);font:15px/1.5 Inter,system-ui,sans-serif}
.compose .row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px}.compose small{color:var(--muted);font-size:12.5px}
.compose .err{color:#e03131;font-size:13px}
.signin{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:20px 22px;border-radius:18px;border:1px solid var(--line2);background:radial-gradient(500px 120px at 0% 0%,color-mix(in srgb,var(--c) 14%,transparent),transparent 70%),var(--bg2)}
.signin p{margin:0;color:var(--muted);font-size:14.5px}
.cms{margin-top:22px;display:flex;flex-direction:column;gap:18px}
.cm{display:flex;gap:12px;animation:rise .6s var(--ease) both}.cm > img,.cm > .ph{width:36px;height:36px;border-radius:50%;flex:none;background:var(--bg2)}
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
footer a:hover{color:var(--ink)}
.js .reveal{opacity:0;transform:translateY(28px);transition:opacity .9s var(--ease),transform 1.1s var(--ease);transition-delay:calc(var(--d,0) * 70ms)}
.js .reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important}.js .reveal{opacity:1;transform:none}.frame{transform:none;opacity:1}}`;

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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
<style>${CSS}</style>
<script>document.documentElement.classList.add("js")</script>
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

// Motion: sections rise in as they scroll into view, numbers count up, the screenshot
// frame flattens out of a tilt, and the nav picks up the project once the hero is gone.
// Everything is skipped for people who ask their system for less motion.
const FX_JS = `<script>
(() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach(el => seen.observe(el));
  if (!still) {
    const count = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      count.unobserve(e.target);
      const el = e.target, n = +el.dataset.n, t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / 1200); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: .6 });
    document.querySelectorAll(".cnt").forEach(el => { if (+el.dataset.n) { el.textContent = "0"; count.observe(el); } });
  }
  const nav = document.querySelector("nav"), frame = document.querySelector(".frame"), cta = document.querySelector(".hero .cta");
  new IntersectionObserver(([e]) => nav.classList.toggle("pinned", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(cta);
  let queued = false;
  const paint = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    nav.style.setProperty("--sp", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    if (frame && !still) {
      const r = frame.getBoundingClientRect();
      frame.style.setProperty("--p", Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * .6))).toFixed(3));
    }
  };
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
  addEventListener("scroll", later, { passive: true }); addEventListener("resize", later); paint();
  const zoom = document.querySelector(".zoom"), lb = document.getElementById("lb");
  if (zoom && lb) {
    zoom.addEventListener("pointermove", e => { const r = zoom.getBoundingClientRect(); zoom.style.setProperty("--mx", e.clientX - r.left + "px"); zoom.style.setProperty("--my", e.clientY - r.top + "px"); });
    zoom.addEventListener("click", () => lb.showModal());
    lb.addEventListener("click", () => lb.close());
  }
  const tabs = [...document.querySelectorAll(".tab")];
  const pick = (tab, focus) => {
    tabs.forEach(x => { const on = x === tab; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute("aria-controls")).hidden = !on; });
    if (focus) tab.focus();
  };
  tabs.forEach((x, i) => {
    x.addEventListener("click", () => pick(x));
    x.addEventListener("keydown", e => { const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (d) { e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); } });
  });
  // Type the first command once, after the hero has risen in; the full text is in the HTML.
  const code = !still && document.querySelector(".panel:not([hidden]) code");
  if (code) {
    const full = code.textContent, html = code.innerHTML, foot = code.closest(".panel").querySelector(".foot");
    code.textContent = ""; foot.style.opacity = 0;
    let i = 0;
    setTimeout(function type() {
      code.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(type, 22 + Math.random() * 38);
      else { code.innerHTML = html; foot.style.transition = "opacity .6s"; foot.style.opacity = 1; }
    }, 900);
  }
  document.querySelectorAll(".copy").forEach(b => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.cmd); } catch (x) { return; }
    const label = b.querySelector("[data-vi]"), was = label.textContent;
    label.textContent = window.OY_LANG === "vi" ? "Đã copy" : "Copied"; b.classList.add("ok");
    setTimeout(() => { label.textContent = was; b.classList.remove("ok"); }, 1600);
  }));
  document.getElementById("share").addEventListener("click", async e => {
    const b = e.currentTarget, label = b.querySelector("[data-vi]");
    if (navigator.share && matchMedia("(pointer: coarse)").matches) { try { await navigator.share({ title: document.title, url: location.href }); } catch (x) {} return; }
    try { await navigator.clipboard.writeText(location.href); } catch (x) { return; }
    const was = label.textContent; label.textContent = window.OY_LANG === "vi" ? "Đã copy link" : "Link copied"; b.classList.add("ok");
    setTimeout(() => { label.textContent = was; b.classList.remove("ok"); }, 1800);
  });
})();
</script>`;

const logoClass = p => p.logoStyle === "tile" ? "full" : "";

/** The code-check block shared by project pages and /check pages. V is a row of vets or repo_checks. */
function checkSection(V, { repoUrl, badgeMd, badgeSrc, now, sub = "" }) {
  const vlabel = V ? JSON.parse(V.label || "[]") : [], vnotes = V ? JSON.parse(V.notes || "[]") : [], vskip = V ? JSON.parse(V.skipped || "{}") : {};
  const vnew = V && V.changed_at && now - V.changed_at < 30 * 86400000 ? new Set(JSON.parse(V.changed || "[]")) : new Set();
  const at = sha => repoUrl ? `${repoUrl}/blob/${esc(sha)}` : null;
  return `<section class="chk" id="check">
    <div class="hd2 reveal"><div><h2>${t("Code check", "Kiểm tra mã nguồn")}</h2>
      <p class="sub">${sub || t("Read by vetcode without running anything. Checked again whenever the code changes.", "vetcode đọc mã nguồn mà không chạy gì. Kiểm tra lại mỗi khi code thay đổi.")}</p></div>
      <span class="sync"><i class="dot"></i>${t(`Checked ${since(V.scanned_at, now)[0]}`, `Kiểm tra ${since(V.scanned_at, now)[1]}`)} · ${repoUrl ? `<a href="${esc(repoUrl)}/commit/${esc(V.commit_sha)}" target="_blank" rel="noopener"><code>${esc(V.commit_sha.slice(0, 7))}</code></a>` : `<code>${esc(V.commit_sha.slice(0, 7))}</code>`}</span></div>
    <div class="vgrid">
      <div class="verdict ${esc(V.verdict)} reveal">${ic(V.verdict === "clear" ? I.shield : I.alert)}<div><b>${t(VERDICT[V.verdict][0], VERDICT[V.verdict][1])}</b>
        <span>${t(`${+V.files || 0} files read · vetcode ${V.version}`, `Đã đọc ${+V.files || 0} file · vetcode ${V.version}`)}</span>
        <ul>${[["Malware and stealers", "Mã độc và mã đánh cắp"], ["Install scripts and hooks", "Script cài đặt và hook"], ["Hidden or encoded code", "Code bị giấu hoặc mã hoá"], ["CI and AI agent setup", "Cấu hình CI và AI agent"]].map(x => `<li>${ic(I.check)}${t(...x)}</li>`).join("")}</ul></div></div>
      <div class="vlabel reveal" style="--d:1"><h3>${t("What the code can do", "Code này làm được gì")}</h3>
        ${vlabel.length ? `<ul>${vlabel.map(x => { const [icon, name] = CAP[x.cap] || [I.code, [x.cap, x.cap]]; return `<li>${ic(icon)}<span>${t(...name)}</span>${vnew.has(x.cap) ? `<em title="${esc(V.changed_from || "")}">${t("New", "Mới")}</em>` : ""}<small>${t(`${x.files} file${x.files === 1 ? "" : "s"}`, `${x.files} file`)}</small></li>`; }).join("")}</ul>`
          : `<p class="none">${t("None of the sensitive abilities we look for: no secrets, network, other programs or hidden code in its packages.", "Không có khả năng nhạy cảm nào trong danh sách: không đọc secret, không dùng mạng, không chạy chương trình khác, không giấu code.")}</p>`}
        ${vnew.size ? `<p class="chg">${ic(I.alert)}${t("New since the previous check. Updates that suddenly gain abilities are how hijacked packages show up, so it is worth a look.", "Mới xuất hiện so với lần kiểm tra trước. Bản cập nhật bỗng có thêm khả năng là dấu hiệu thường gặp của package bị chiếm quyền, nên đáng xem lại.")}</p>` : ""}
      </div>
    </div>
    ${vnotes.length ? `<div class="list reveal"><h3>${t("Findings to look at", "Phát hiện nên xem")}<span class="n">${vnotes.length}</span></h3>${vnotes.map(n => `<a class="it" href="${esc(at(V.commit_sha) ? `${at(V.commit_sha)}/${n.file}#L${n.line}` : "#")}" target="_blank" rel="noopener"><span class="sev ${esc(n.severity)}">${esc(n.severity)}</span><div>${esc(n.title)}<small>${esc(n.file)}${n.line ? `:${n.line}` : ""} · ${esc(n.rule)}</small></div>${ARROW.replace('class="ar"', 'class="go"')}</a>`).join("")}</div>` : ""}
    ${vskip.patterns?.length || vskip.lines ? `<p class="fine skip">${ic(I.eye)}${t("The project asks vetcode to skip", "Dự án yêu cầu vetcode bỏ qua")}: ${(vskip.patterns || []).map(x => `<code>${esc(x)}</code>`).join(" ")}${vskip.lines ? ` ${t(`and ${vskip.lines} marked line${vskip.lines === 1 ? "" : "s"}`, `và ${vskip.lines} dòng được đánh dấu`)}` : ""}. ${t("Shown so nothing can be hidden quietly.", "Hiện ra đây để không gì bị giấu im lặng.")}</p>` : ""}
    <div class="vfoot reveal"><img src="${esc(badgeSrc)}" alt="OpenYard code check badge" height="20"><code>${esc(badgeMd)}</code>
      <button class="copy lt" type="button" data-cmd="${esc(badgeMd)}" aria-label="Copy badge Markdown">${ic(I.copy)}<span>${t("Copy badge", "Copy huy hiệu")}</span></button></div>
    <p class="fine">${t("Patterns, not proof: a finding is a reason to read the code, not a verdict on the maker. Vulnerability candidates and leaked-secret locations are not published here.", "Đây là dấu hiệu, không phải bằng chứng: một phát hiện là lý do để đọc code, không phải kết luận về người làm. Các lỗ hổng tiềm năng và vị trí secret bị lộ không được công khai ở đây.")}</p>
  </section>`;
}

export function projectPage(p, all, site, stats, now = Date.now(), vet = null) {
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
  const shot = p.image
    ? `<button class="zoom" type="button" aria-label="Enlarge screenshot"><img src="${esc(p.image)}" alt="${esc(p.name)} screenshot"><span class="hint">${ic(I.expand)}${t("Click to enlarge", "Bấm để phóng to")}</span></button>`
    : p.logo ? `<div class="gen"><img src="${esc(p.logo)}" alt=""></div>` : "";
  const visual = shot ? `<div class="stage reveal"><figure class="frame"><div class="bar"><span class="lights"><i></i><i></i><i></i></span><span class="url">${ic(I.lock)}${esc(host(p.url))}</span><span></span></div>${shot}</figure></div>` : "";
  const logo = (o, cls, size) => o.logo ? `<img class="${cls} ${logoClass(o)}" src="${esc(o.logo)}" alt="" width="${size}" height="${size}" loading="lazy">` : `<span class="${cls} ini" style="--c:${esc(o.color || "#6d5bd0")}">${initials(o.name)}</span>`;
  const repoUrl = p.repo && /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(p.repo) ? p.repo.replace(/\/$/, "") : null;
  const st = stats && stats.stars != null ? stats : null;
  const act = st ? JSON.parse(st.activity || "{}") : {};
  // GitHub's own colours: open green, merged or completed purple, closed red
  const mark = (x, kind) => kind === "pr" ? ic(x.state === "merged" ? I.merged : I.pr, `st ${esc(x.state)}`)
    : kind === "issue" ? ic(x.state === "closed" ? I.done : I.issue, `st ${x.state === "closed" ? "merged" : "open"}`)
    : ic(I.talk, `st ${x.state === "closed" ? "merged" : "open"}`);
  const row = (x, kind) => `<a class="it" href="${esc(x.url)}" target="_blank" rel="noopener">${mark(x, kind)}<div>${esc(x.title)}<small>#${esc(x.number)} · @${esc(x.user)} · ${t(...ago(x.at, now))}</small></div>${ARROW.replace('class="ar"', 'class="go"')}</a>`;
  const EMPTY = {
    pr: [I.pr, ["No pull requests yet.", "Chưa có pull request nào."], ["Send the first one", "Gửi PR đầu tiên"], "/pulls"],
    issue: [I.issue, ["No issues in the last weeks.", "Mấy tuần gần đây chưa có issue nào."], ["Open an issue", "Mở một issue"], "/issues/new"],
    talk: [I.talk, ["No discussions yet.", "Chưa có thảo luận nào."], ["Start one", "Mở thảo luận"], "/discussions/new"],
  };
  const empty = kind => { const [icon, msg, cta, path] = EMPTY[kind]; return `<div class="empty">${ic(icon)}<div>${t(...msg)}</div><a href="${esc(repoUrl + path)}" target="_blank" rel="noopener">${t(...cta)} →</a></div>`; };
  const list = (title, items, more, kind, d) => `<div class="list reveal" style="--d:${d}"><h3>${t(...title)}<a href="${esc(more)}" target="_blank" rel="noopener">${t("All", "Tất cả")} →</a></h3>${(items || []).length ? items.slice(0, 5).map(x => row(x, kind)).join("") : empty(kind)}</div>`;
  const num = (icon, n, label, d, extra = "") => `<div class="num reveal" style="--d:${d}">${ic(icon)}<b><span class="cnt" data-n="${+n || 0}">${+n || 0}</span>${extra}</b><span>${t(...label)}</span></div>`;
  // Measured results the maker wants to show, each next to what it was compared with.
  const H = p.highlights;
  const highlights = H?.items?.length ? `<section class="hl">
    <div class="hd2 reveal"><div><h2>${t(en(H.title), vi(H.title))}</h2>
      ${H.note ? `<p class="sub">${t(en(H.note), vi(H.note))}</p>` : ""}</div>
      ${H.link ? `<a class="sync" href="${esc(H.link)}" target="_blank" rel="noopener">${t("How it was measured", "Cách đo")} →</a>` : ""}</div>
    <div class="hls">${H.items.map((x, i) => `<div class="num reveal" style="--d:${i}"><b>${esc(x.value)}</b><span>${t(en(x.label), vi(x.label))}</span>${x.vs ? `<small>${t(en(x.vs), vi(x.vs))}</small>` : ""}</div>`).join("")}</div>
  </section>` : "";
  // Install commands in a terminal: the first thing an open-source landing needs.
  const inst = Array.isArray(p.install) ? p.install.filter(x => x && x.cmd) : [];
  const L = v => typeof v === "string" ? t(v, v) : t(en(v), vi(v));
  const term = inst.length ? `<div class="term up" style="--d:4" role="region" aria-label="Install">
    <div class="tbar"><span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
      <div class="tabs" role="tablist" aria-label="Install with">${inst.map((x, i) => `<button class="tab" type="button" role="tab" id="tab-${i}" aria-controls="pan-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${L(x.label)}</button>`).join("")}</div></div>
    ${inst.map((x, i) => `<div class="panel" role="tabpanel" id="pan-${i}" aria-labelledby="tab-${i}"${i ? " hidden" : ""}>
      <pre><span class="ps" aria-hidden="true">$</span><code>${x.cmd.split(/( +)/).map(w => w.trim() ? `<span class="w">${esc(w)}</span>` : w).join("")}</code><span class="cur" aria-hidden="true"></span></pre>
      <div class="foot">${x.note ? `<p class="note">${L(x.note)}</p>` : "<span></span>"}
      <button class="copy" type="button" data-cmd="${esc(x.cmd)}" aria-label="Copy command">${ic(I.copy)}<span>${t("Copy", "Copy")}</span></button></div>
    </div>`).join("")}
  </div>` : "";
  // Which languages the code is in and who writes it, from the GitHub sync.
  const LANG_COLOR = { JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Go: "#00ADD8", Rust: "#dea584", Java: "#b07219", Kotlin: "#A97BFF", "C#": "#178600", Ruby: "#701516", PHP: "#4F5D95", HTML: "#e34c26", CSS: "#663399", SCSS: "#c6538c", Shell: "#89e051", C: "#555555", "C++": "#f34b7d", Swift: "#F05138", Dart: "#00B4AB", Vue: "#41b883", Svelte: "#ff3e00", Astro: "#ff5a03", Dockerfile: "#384d54", Lua: "#000080", PowerShell: "#012456", MDX: "#fcb32c", PLpgSQL: "#336790", Elixir: "#6e4a7e", Zig: "#ec915c" };
  const langs = Object.entries(act.languages || {}).filter(([, b]) => b > 0).sort((a, b) => b[1] - a[1]);
  const total = langs.reduce((n, [, b]) => n + b, 0);
  const shown = langs.slice(0, 6), rest = langs.slice(6).reduce((n, [, b]) => n + b, 0);
  const parts = [...shown, ...(rest ? [["Other", rest]] : [])].map(([name, b]) => ({ name, pct: 100 * b / total, color: LANG_COLOR[name] || "#8b949e" }));
  const crew = Array.isArray(act.contributors) ? act.contributors : [];
  const meta = st && (parts.length || crew.length) ? `<div class="meta">
      ${parts.length ? `<div class="reveal"><h3>${t("Languages", "Ngôn ngữ")}</h3><div class="lbar" role="img" aria-label="${esc(parts.map(x => `${x.name} ${x.pct.toFixed(1)}%`).join(", "))}">${parts.map((x, k) => `<i style="width:${x.pct.toFixed(2)}%;background:${x.color};--k:${k}"></i>`).join("")}</div>
        <ul class="lleg">${parts.map(x => `<li><i style="background:${x.color}"></i><b>${esc(x.name)}</b><span>${x.pct < 0.1 ? "<0.1" : x.pct.toFixed(1)}%</span></li>`).join("")}</ul></div>` : ""}
      ${crew.length ? `<div class="reveal" style="--d:1"><h3>${t("Contributors", "Người đóng góp")}</h3><div class="avs">${crew.map(c => `<a href="https://github.com/${esc(c.login)}" target="_blank" rel="noopener" title="@${esc(c.login)} · ${+c.n || 0} commits"><img src="${esc(c.avatar)}&s=72" alt="@${esc(c.login)}" width="36" height="36" loading="lazy"></a>`).join("")}${repoUrl ? `<a class="more" href="${esc(repoUrl)}/graphs/contributors" target="_blank" rel="noopener">${t("All contributors", "Tất cả")} →</a>` : ""}</div></div>` : ""}
    </div>` : "";
  const V = vet && VERDICT[vet.verdict] ? vet : null;
  const check = V ? checkSection(V, { repoUrl, now, badgeSrc: `/badge/${p.slug}.svg`, badgeMd: `[![OpenYard code check](${ORIGIN}/badge/${p.slug}.svg)](${url}#check)` }) : "";
  const activity = st ? `<section class="act">
    <div class="hd2 reveal"><div><h2>${t("Activity", "Hoạt động")}</h2>
      <p class="sub">${t("From the GitHub repository, refreshed every hour.", "Lấy từ repo GitHub, cập nhật mỗi giờ.")}</p></div>
      ${st.updated_at ? `<span class="sync"><i class="dot"></i>${t(`Synced ${since(st.updated_at, now)[0]}`, `Đồng bộ ${since(st.updated_at, now)[1]}`)}</span>` : ""}</div>
    <div class="nums">
      ${num(I.star, st.stars, ["stars", "sao"], 0, st.stars_7d > 0 ? `<em>+${st.stars_7d}</em>` : "")}
      ${num(I.pr, st.prs_7d, ["pull requests this week", "pull request tuần này"], 1)}
      ${num(I.issue, st.issues_7d, ["issues this week", "issue tuần này"], 2)}
      ${num(I.commit, st.commits_7d, ["commits this week", "commit tuần này"], 3)}
      ${num(I.fork, st.forks, ["forks", "fork"], 4)}
    </div>
    ${meta}
    <div class="lists">
      ${list(["Pull requests", "Pull request"], act.prs, repoUrl + "/pulls", "pr", 0)}
      ${list(["Issues", "Issue"], act.issues, repoUrl + "/issues", "issue", 1)}
      ${act.discussions ? list(["Discussions", "Thảo luận"], act.discussions, repoUrl + "/discussions", "talk", 2) : ""}
    </div>
  </section>` : "";
  return `${head({ title: `${p.name}: ${en(p.tagline)} · OpenYard`, desc: en(p.description), url, image, jsonld })}
<body style="--c:${esc(p.color || "#6d5bd0")}">
<nav><div class="wrap">
  <a class="brand" href="/"><img src="/favicon.svg" alt="" width="24" height="24"><span>Open<em>Yard</em></span></a>
  <a class="back" href="/#projects">← ${t("All projects", "Tất cả dự án")}</a>
  <div class="right">
    <a class="np" href="/go/${esc(p.slug)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${logo(p, "nl", 28)}<b>${esc(p.name)}</b><span class="btn sm dark">${t("Open", "Mở")} ${ARROW}</span></a>
    <button class="chip" id="lang" type="button" aria-label="Switch language">VI</button>
    <a class="btn sm dc" href="${esc(site.discord)}" target="_blank" rel="noopener">${svg(DISCORD)}${t("Join Discord", "Vào Discord")}</a>
  </div>
</div></nav>
<main>
<header class="hero${term ? " two" : ""}"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">${term ? `<div class="cols"><div>` : ""}
  <div class="id">${logo(p, "logo", 72)}
    <div class="tags up" style="--d:1"><span class="pill on">${t(...type)}</span>${p.team ? `<span class="pill">OpenYard team</span>` : `<span class="pill">${t("Community", "Cộng đồng")}</span>`}</div></div>
  <h1 class="up" style="--d:2">${esc(p.name)}</h1>
  <p class="tl up" style="--d:3">${t(en(p.tagline), vi(p.tagline))}</p>
  <p class="desc up" style="--d:4">${t(en(p.description), vi(p.description))}</p>
  <div class="cta up" style="--d:5">
    <a class="btn dark" href="/go/${esc(p.slug)}" target="_blank" rel="noopener">${/^https:\/\/github\.com\//.test(p.url) ? `${svg(GITHUB)}${t("View on GitHub", "Xem trên GitHub")}${st && st.stars >= 10 ? `<span class="sc">${ic(I.star)}${+st.stars}</span>` : ""}` : `${t("Open", "Mở")} ${esc(host(p.url))} ${ARROW}`}</a>
    ${p.repo && p.repo !== p.url ? `<a class="btn line" href="${esc(p.repo)}" target="_blank" rel="noopener">${svg(GITHUB)}${t("Source code", "Mã nguồn")}</a>` : ""}
    <button class="btn line" id="share" type="button">${ic(I.share)}${t("Share", "Chia sẻ")}</button>
  </div>
${term ? `</div>${term}</div>` : ""}</div></header>
<div class="wrap">
  ${visual}
  <dl class="specs reveal" style="--n:${facts.length}">${facts.map(([[e, v], html]) => `<div><dt>${t(e, v)}</dt><dd>${html}</dd></div>`).join("")}</dl>
  ${highlights}
  ${check}
  ${activity}
  <section class="talk" id="comments">
    <div class="reveal"><h2>${t("Comments", "Bình luận")}</h2>
    <p class="sub">${t("Questions, feedback, ideas for the maker. Sign in with GitHub to join in.", "Hỏi, góp ý hay gợi ý cho người làm. Đăng nhập bằng GitHub để tham gia.")}</p></div>
    <div id="cbox" class="reveal" style="--d:1"></div>
    <div class="cms" id="clist"></div>
  </section>
</div>
${others.length ? `<section class="more"><div class="wrap">
  <h2 class="reveal">${t("More from the yard", "Thêm từ OpenYard")}</h2>
  <div class="grid">${others.map((o, i) => `<a class="mini reveal" style="--d:${i};--c:${esc(o.color || "#6d5bd0")}" href="/p/${esc(o.slug)}">${logo(o, "", 44)}<div><h3>${esc(o.name)}</h3><p>${t(en(o.tagline), vi(o.tagline))}</p></div>${ARROW}</a>`).join("")}</div>
  <div class="band reveal"><div><h2>${t("Built something free?", "Bạn cũng làm ra thứ gì đó miễn phí?")}</h2><p>${t("Put it in the yard in five minutes, no account needed.", "Đưa lên OpenYard chỉ mất năm phút, không cần tài khoản.")}</p></div>
    <div class="cta"><a class="btn dark" href="/submit">${t("Add your project", "Đưa dự án lên")}</a><a class="btn line" href="${esc(site.discord)}" target="_blank" rel="noopener">${svg(DISCORD)}Discord</a></div></div>
</div></section>` : ""}
</main>
${p.image ? `<dialog class="lb" id="lb"><img src="${esc(p.image)}" alt="${esc(p.name)} screenshot"></dialog>` : ""}
<footer><div class="wrap"><span>© ${new Date().getFullYear()} <a href="/">OpenYard</a> · ${t("Free apps, wild ideas, open tools.", "App miễn phí, ý tưởng điên rồ, công cụ mở.")}</span><a href="${esc(site.discord)}" target="_blank" rel="noopener">${t("Something wrong with this listing? Tell us on Discord", "Trang này có vấn đề? Báo trên Discord")}</a></div></footer>
${LANG_JS}
${FX_JS}
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

// /check and /check/<owner>/<repo>: check any public GitHub repository before installing it.
// The form asks the worker for a check; GitHub Actions reads the code with vetcode and the page
// waits for the result, which then stays at a shareable address.
const CHECK_JS = `<script>
(() => {
  const f = document.getElementById("ck"), msg = document.getElementById("ckmsg"), key = f.dataset.ts;
  const say = (en, vi) => { msg.textContent = window.OY_LANG === "vi" ? vi : en; msg.hidden = false; };
  if (key) {
    window.onTs = () => turnstile.render("#ts", { sitekey: key, theme: "auto", appearance: "interaction-only" });
    const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTs&render=explicit"; s.async = true; document.head.appendChild(s);
  }
  f.addEventListener("submit", async e => {
    e.preventDefault();
    // Accepts https://github.com/owner/repo, github.com/owner/repo, owner/repo, with or without a path after it.
    const parts = f.repo.value.trim().replace(/^https?:\\/\\//, "").replace(/^(?:www\\.)?github\\.com\\//, "").replace(/[#?].*$/, "").split("/").slice(0, 2);
    const v = "https://github.com/" + parts.join("/").replace(/\\.git$/, "");
    if (parts.length < 2 || !/^https:\\/\\/github\\.com\\/[\\w.-]+\\/[\\w.-]+$/.test(v)) return say("Paste a link like https://github.com/owner/repo", "Dán link dạng https://github.com/owner/repo");
    const b = f.querySelector("button"); b.disabled = true;
    try {
      const r = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: v, ts: key && window.turnstile ? turnstile.getResponse() : "" }) });
      const d = await r.json();
      if (!r.ok) { b.disabled = false; if (key && window.turnstile) turnstile.reset(); return say(d.error, d.error); }
      location.href = "/check/" + d.repo;
    } catch (x) { b.disabled = false; say("Could not reach OpenYard. Try again.", "Không kết nối được OpenYard. Thử lại nhé."); }
  });
  const w = document.getElementById("wait");
  if (w) {
    const t0 = Date.now(), el = w.querySelector(".el");
    setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); el.textContent = s + "s"; }, 1000);
    const poll = async () => {
      try { const d = await (await fetch("/api/check/status?repo=" + encodeURIComponent(w.dataset.repo), { cache: "no-store" })).json(); if (d.status === "done" || d.status === "failed") return location.reload(); } catch (x) {}
      setTimeout(poll, 4000);
    };
    setTimeout(poll, 4000);
  }
})();
</script>`;

export function checkPage({ ref, row, recent = [], site, turnstile, now = Date.now() }) {
  const full = ref ? `${ref.owner}/${ref.name}` : "";
  const url = ref ? `${ORIGIN}/check/${full}` : `${ORIGIN}/check`;
  const repoUrl = ref ? `https://github.com/${full}` : null;
  const title = ref ? `Is ${full} safe? What its code can do · OpenYard` : "Check any GitHub repository before you install it · OpenYard";
  const desc = ref ? `A free check of ${full}: malware signs, install scripts, and a label of what the code can do (secrets, network, other programs), read without running it.`
    : "Paste a GitHub link and get a label of what the code can do, malware and supply-chain findings, and a badge. Free, nothing is run.";
  const done = row && row.status === "done" && VERDICT[row.verdict];
  const busy = row && (row.status === "queued" || row.status === "running");
  const jsonld = [{ "@context": "https://schema.org", "@type": "WebPage", name: title, description: desc, url }];
  const form = `<form class="ckf" id="ck" data-ts="${esc(turnstile || "")}" novalidate>
      <label class="sr" for="repo">GitHub repository</label>
      <input id="repo" name="repo" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://github.com/owner/repo" value="${esc(repoUrl || "")}" required>
      <button class="btn dark" type="submit">${ic(I.shield)}${t(done ? "Check again" : "Check", done ? "Kiểm tra lại" : "Kiểm tra")}</button>
    </form><div id="ts"></div><p class="ckmsg" id="ckmsg" role="alert" hidden></p>`;
  const state = busy ? `<div class="wait reveal" id="wait" data-repo="${esc(full)}"><span class="spin" aria-hidden="true"></span><div><b>${t("Reading the code…", "Đang đọc code…")}</b>
      <span>${t("Downloading the repository and reading it with vetcode. Usually under two minutes; this page updates by itself.", "Đang tải repo và đọc bằng vetcode. Thường dưới hai phút, trang sẽ tự cập nhật.")} <b class="el">0s</b></span></div></div>`
    : row && row.status === "failed" ? `<div class="wait bad reveal">${ic(I.alert)}<div><b>${t("The check did not finish", "Chưa kiểm tra được")}</b><span>${esc(row.error || "")}</span></div></div>` : "";
  const result = done ? checkSection(row, { repoUrl, now, badgeSrc: `/badge/gh/${full}.svg`, badgeMd: `[![OpenYard code check](${ORIGIN}/badge/gh/${full}.svg)](${url})`,
    sub: t("Read by vetcode without running anything, at the commit below. Check again any time.", "vetcode đọc mã nguồn tại commit bên dưới mà không chạy gì. Có thể kiểm tra lại bất cứ lúc nào.") }) : "";
  const none = ref && !row ? `<p class="fine">${t("Not checked yet. Press Check and the result appears here in a minute or two.", "Chưa được kiểm tra. Bấm Kiểm tra, kết quả hiện ở đây sau một hai phút.")}</p>` : "";
  const list = recent.filter(r => r.repo.toLowerCase() !== full.toLowerCase()).slice(0, 12);
  const how = [[I.globe, ["Paste a public GitHub link", "Dán link repo GitHub công khai"]], [I.eye, ["vetcode reads the code. Nothing is installed, built or run", "vetcode đọc code. Không cài, không build, không chạy gì"]], [I.shield, ["Get a label of what it can do, findings, and a badge", "Nhận nhãn khả năng, các phát hiện và một huy hiệu"]]];
  return `${head({ title, desc, url, image: { url: `${ORIGIN}/og.png?v=2`, w: 1200, h: 630 }, jsonld })}
<body style="--c:#14665f">
<nav><div class="wrap">
  <a class="brand" href="/"><img src="/favicon.svg" alt="" width="24" height="24"><span>Open<em>Yard</em></span></a>
  <a class="back" href="/#projects">← ${t("All projects", "Tất cả dự án")}</a>
  <div class="right">
    <button class="chip" id="lang" type="button" aria-label="Switch language">VI</button>
    <a class="btn sm dc" href="${esc(site.discord)}" target="_blank" rel="noopener">${svg(DISCORD)}${t("Join Discord", "Vào Discord")}</a>
  </div>
</div></nav>
<main>
<header class="hero ck"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">
  <div class="tags up" style="--d:1"><span class="pill on">${ic(I.shield)}${t("Free code check", "Kiểm tra code miễn phí")}</span></div>
  <h1 class="up" style="--d:2">${ref ? `<a href="${esc(repoUrl)}" target="_blank" rel="noopener">${esc(full)}</a>` : t("Check any GitHub repository before you install it", "Kiểm tra bất kỳ repo GitHub nào trước khi cài")}</h1>
  <p class="tl up" style="--d:3">${t("What the code can do, signs of malware, and tricks in install scripts. Read, never run.", "Code làm được gì, dấu hiệu mã độc và thủ đoạn trong script cài đặt. Chỉ đọc, không bao giờ chạy.")}</p>
  <div class="cta up" style="--d:4">${form}<button class="btn line" id="share" type="button">${ic(I.share)}${t("Share", "Chia sẻ")}</button></div>
</div></header>
<div class="wrap">
  ${state}${none}${result}
  ${ref ? "" : `<ol class="how">${how.map(([icon, x], i) => `<li class="reveal" style="--d:${i}">${ic(icon)}<span>${t(...x)}</span></li>`).join("")}</ol>`}
  ${list.length ? `<section class="recent"><h2 class="reveal">${t("Recently checked", "Mới được kiểm tra")}</h2><div class="rgrid">${list.map((r, i) => `<a class="rc reveal" style="--d:${i % 6}" href="/check/${esc(r.repo)}"><span class="vd ${esc(r.verdict)}">${ic(r.verdict === "clear" ? I.shield : I.alert)}</span><b>${esc(r.repo)}</b><small>${t(...since(r.scanned_at, now))}</small></a>`).join("")}</div></section>` : ""}
</div>
</main>
<footer><div class="wrap"><span>© ${new Date().getFullYear()} <a href="/">OpenYard</a> · ${t("Patterns, not proof. Read the code before you trust it.", "Dấu hiệu, không phải bằng chứng. Hãy đọc code trước khi tin.")}</span><a href="https://github.com/openyard-cloud/vetcode" target="_blank" rel="noopener">${t("Powered by vetcode", "Chạy bằng vetcode")}</a></div></footer>
${LANG_JS}
${FX_JS}
${CHECK_JS}
</body></html>`;
}

export function sitemap(projects, today, checks = []) {
  const urls = [{ loc: `${ORIGIN}/`, lastmod: today }, { loc: `${ORIGIN}/check`, lastmod: today }, ...projects.map(p => ({ loc: `${ORIGIN}/p/${p.slug}`, lastmod: p.added })),
    ...checks.map(c => ({ loc: `${ORIGIN}/check/${c.repo}`, lastmod: new Date(c.scanned_at).toISOString().slice(0, 10) }))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
}
