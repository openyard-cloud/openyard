// Renders 1200×630 share images with a Chrome-family browser.
//
//   npm run og [slug…]          projects, to public/og/<slug>.png, printing the SQL that points
//                               each project at its file (the old, by-hand way)
//   node scripts/og.mjs --auto  what the site says needs one (new or edited projects, new
//                               topics), sent straight back to it. The og workflow runs this,
//                               woken by the site; needs VET_TOKEN (the scanner's token).
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC = join(ROOT, "public"), OUT = join(PUBLIC, "og");
const SITE = process.env.SITE || "https://openyard.cloud";
const API = process.env.OY_API || `${SITE}/api/projects`;
const AUTO = process.argv.includes("--auto");
const BROWSERS = [
  process.env.CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean);
const browser = BROWSERS.find(b => existsSync(b));
if (!browser) { console.error("No Chrome, Brave or Chromium found. Set CHROME=/path/to/browser."); process.exit(1); }

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const file = p => pathToFileURL(p).href;
// site paths come from public/, anything else is already a URL
const src = u => !u ? "" : u.startsWith("/") && !u.startsWith("/u/") ? file(join(PUBLIC, u)) : new URL(u, "https://openyard.cloud").href;
// projects without a logo get their initials on a tile, like the site does
const initials = n => esc(String(n).split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase());
const label = p => p.status === "soon" ? "Coming soon" : p.type === "app" ? "Free app" : "Open source";

const html = p => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#0a0a0c;color:#f4f4f5;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:radial-gradient(640px 420px at 12% 18%,${p.color || "#6d5bd0"}88,transparent 70%),radial-gradient(560px 380px at 95% 100%,#b67cff40,transparent 70%)}
.l{position:absolute;left:72px;top:72px;width:560px;bottom:64px;display:flex;flex-direction:column}
.logo{width:104px;height:104px;border-radius:28px;background:#fff;padding:${p.logoStyle === "tile" ? 0 : 14}px;object-fit:${p.logoStyle === "tile" ? "cover" : "contain"};box-shadow:0 20px 50px -10px rgba(0,0,0,.6)}
.pill{align-self:flex-start;margin-top:30px;font-size:20px;font-weight:600;padding:6px 16px;border-radius:999px;border:1.5px solid rgba(255,255,255,.22);color:#e4e4e7}
h1{font-size:${p.name.length > 14 ? 64 : 76}px;font-weight:700;letter-spacing:-.045em;line-height:1;margin-top:18px}
p{font-size:28px;line-height:1.3;color:#c9c9d1;margin-top:16px;letter-spacing:-.01em}
.f{margin-top:auto;display:flex;align-items:center;gap:12px;font-size:24px;font-weight:600;letter-spacing:-.02em}
.f img{width:34px;height:34px}.f em{font-style:normal;background:linear-gradient(100deg,#7c9cff,#b67cff 35%,#ff7eb0 70%,#ffc56b);-webkit-background-clip:text;background-clip:text;color:transparent}
.f b{font-weight:600}.f span{color:#8b8b95;font-weight:500;font-size:21px;margin-left:8px}
.shot{position:absolute;left:680px;top:96px;width:620px;border-radius:22px;overflow:hidden;border:1.5px solid rgba(255,255,255,.16);box-shadow:0 40px 90px -20px rgba(0,0,0,.8);transform:rotate(-3deg)}
.shot img{display:block;width:100%}
.mark{position:absolute;left:700px;top:120px;width:420px;height:420px;border-radius:90px;background:#fff;display:grid;place-items:center;transform:rotate(-6deg);box-shadow:0 40px 90px -20px rgba(0,0,0,.8)}
.mark img{width:300px;height:300px;object-fit:contain}
.ini{display:grid;place-items:center;background:${p.color || "#6d5bd0"};color:#fff;font-weight:700;letter-spacing:-.04em;font-size:44px}
.mark.ini{font-size:170px}
</style></head><body><div class="bg"></div>
${p.image ? `<div class="shot"><img src="${src(p.image)}"></div>` : p.logo ? `<div class="mark"><img src="${src(p.logo)}"></div>` : `<div class="mark ini">${initials(p.name)}</div>`}
<div class="l">
  ${p.logo ? `<img class="logo" src="${src(p.logo)}">` : `<div class="logo ini">${initials(p.name)}</div>`}
  <span class="pill">${label(p)}${p.license ? ` · ${esc(p.license)}` : ""}</span>
  <h1>${esc(p.name)}</h1>
  <p>${esc(p.tagline.en || p.tagline.vi)}</p>
  <div class="f"><img src="${file(join(ROOT, "public", "favicon.svg"))}"><b>Open<em>Yard</em></b><span>openyard.cloud/p/${esc(p.slug)}</span></div>
</div></body></html>`;

// A discussion topic: its category, the question itself, who asked and how many answered.
const topicHtml = tp => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#0a0a0c;color:#f4f4f5;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:radial-gradient(700px 460px at 8% 10%,${tp.cat.c || "#b67cff"}77,transparent 70%),radial-gradient(620px 420px at 100% 100%,#7c9cff38,transparent 70%)}
.w{position:absolute;inset:72px 80px 64px;display:flex;flex-direction:column}
.k{align-self:flex-start;display:inline-flex;align-items:center;gap:12px;font-size:24px;font-weight:600;padding:8px 20px;border-radius:999px;border:1.5px solid rgba(255,255,255,.22);color:#e4e4e7}
.k i{width:14px;height:14px;border-radius:50%;background:${tp.cat.c || "#b67cff"}}
h1{margin-top:34px;font-size:${tp.title.length > 70 ? 56 : tp.title.length > 40 ? 66 : 78}px;font-weight:700;letter-spacing:-.04em;line-height:1.08;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.by{margin-top:auto;display:flex;align-items:center;gap:16px;font-size:26px;font-weight:600}
.by img{width:56px;height:56px;border-radius:50%;background:#222;object-fit:cover}
.by span{color:#a1a1aa;font-weight:500}
.f{display:flex;align-items:center;gap:12px;margin-top:30px;font-size:24px;font-weight:600;letter-spacing:-.02em}
.f img{width:34px;height:34px}.f em{font-style:normal;background:linear-gradient(100deg,#7c9cff,#b67cff 35%,#ff7eb0 70%,#ffc56b);-webkit-background-clip:text;background-clip:text;color:transparent}
.f span{color:#8b8b95;font-weight:500;font-size:21px;margin-left:8px}
</style></head><body><div class="bg"></div><div class="w">
  <span class="k"><i></i>${esc(tp.cat.name?.[0] || "Discuss")} · ${esc(tp.cat.name?.[1] || "Thảo luận")}</span>
  <h1>${esc(tp.title)}</h1>
  <div class="by"><img src="${esc(tp.avatar ? new URL(tp.avatar, SITE).href : `https://github.com/${tp.login}.png?size=112`)}">${esc(tp.name || "@" + tp.login)}<span>· ${tp.replies} ${tp.replies === 1 ? "reply" : "replies"}</span></div>
  <div class="f"><img src="${file(join(ROOT, "public", "favicon.svg"))}"><b>Open<em>Yard</em></b><span>openyard.cloud/discuss</span></div>
</div></body></html>`;

const tmp = mkdtempSync(join(tmpdir(), "openyard-og-"));
const shoot = (name, page, png) => {
  const f = join(tmp, `${name}.html`);
  writeFileSync(f, page);
  execFileSync(browser, ["--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630",
    "--virtual-time-budget=4000", "--allow-file-access-from-files", `--screenshot=${png}`, file(f)], { stdio: "ignore" });
};

if (AUTO) {
  const auth = { Authorization: `Bearer ${process.env.VET_TOKEN || ""}` };
  const r = await fetch(`${SITE}/api/og/queue`, { headers: auth });
  if (!r.ok) { console.error("queue", r.status, await r.text()); process.exit(1); }
  const { projects, topics } = await r.json();
  const send = async (kind, id, png) => {
    const res = await fetch(`${SITE}/api/og/${kind}/${id}`, { method: "POST", headers: { ...auth, "Content-Type": "image/png" }, body: readFileSync(png) });
    console.log(kind, id, res.ok ? (await res.json()).og : `failed ${res.status} ${await res.text()}`);
  };
  for (const p of projects) { const png = join(tmp, `p-${p.slug}.png`); shoot(`p-${p.slug}`, html(p), png); await send("project", p.slug, png); }
  for (const tp of topics) { const png = join(tmp, `t-${tp.id}.png`); shoot(`t-${tp.id}`, topicHtml(tp), png); await send("topic", tp.id, png); }
  if (!projects.length && !topics.length) console.log("nothing to render");
} else {
  const only = process.argv.slice(2);
  const projects = (await (await fetch(API)).json()).projects.filter(p => !only.length || only.includes(p.slug));
  mkdirSync(OUT, { recursive: true });
  for (const p of projects) {
    const png = join(OUT, `${p.slug}.png`);
    shoot(p.slug, html(p), png);
    console.log(`public/og/${p.slug}.png`);
    console.log(`  npx wrangler@4 d1 execute openyard --remote --command "UPDATE projects SET og = '/og/${p.slug}.png' WHERE slug = '${p.slug}'"`);
  }
}
rmSync(tmp, { recursive: true, force: true });
