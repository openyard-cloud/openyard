// Renders a 1200×630 share image for each project to projects/og/<slug>.png with a
// local Chrome-family browser. Run after adding or changing a project: npm run og [slug…]
// The build works without these images; project pages then share the screenshot instead.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIR = join(ROOT, "projects"), OUT = join(DIR, "og");
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
</style></head><body><div class="bg"></div>
${p.image ? `<div class="shot"><img src="${file(join(DIR, "images", p.image))}"></div>` : `<div class="mark"><img src="${file(join(DIR, "logos", p.logo))}"></div>`}
<div class="l">
  <img class="logo" src="${file(join(DIR, "logos", p.logo))}">
  <span class="pill">${label(p)}${p.license ? ` · ${esc(p.license)}` : ""}</span>
  <h1>${esc(p.name)}</h1>
  <p>${esc(p.tagline.en)}</p>
  <div class="f"><img src="${file(join(ROOT, "public", "favicon.svg"))}"><b>Open<em>Yard</em></b><span>openyard.cloud/p/${esc(p.slug)}</span></div>
</div></body></html>`;

const only = process.argv.slice(2);
const projects = readdirSync(DIR).filter(f => f.endsWith(".json")).map(f => JSON.parse(readFileSync(join(DIR, f), "utf8")))
  .filter(p => !only.length || only.includes(p.slug));
mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "openyard-og-"));
for (const p of projects) {
  const page = join(tmp, `${p.slug}.html`), png = join(OUT, `${p.slug}.png`);
  writeFileSync(page, html(p));
  execFileSync(browser, ["--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630",
    "--virtual-time-budget=4000", "--allow-file-access-from-files", `--screenshot=${png}`, file(page)], { stdio: "ignore" });
  console.log(`projects/og/${p.slug}.png`);
}
rmSync(tmp, { recursive: true, force: true });
