// Validates every project in projects/*.json and writes the site's data:
// public/projects.json, the logos, screenshots and share images, a page per
// project at public/p/<slug>.html and public/sitemap.xml.
// Usage: node scripts/build.mjs [--check]   (--check validates without writing)
import { readdirSync, readFileSync, statSync, mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { projectPage, sitemap } from "./pages.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIR = join(ROOT, "projects");
const LOGOS = join(DIR, "logos");
const IMAGES = join(DIR, "images");
const OGS = join(DIR, "og");
const MAX_IMAGE = 400 * 1024;
const OUT = join(ROOT, "public");
const checkOnly = process.argv.includes("--check");

const TYPES = ["app", "open-source"];
const STATUSES = ["live", "beta", "soon"];
const LOGO_EXT = [".svg", ".png", ".webp"];
const MAX_LOGO = 150 * 1024;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const KINDS = ["people", "wild", "dev"];
const KNOWN = new Set(["slug", "name", "type", "kinds", "status", "tagline", "description", "url", "repo", "license", "logo", "logoStyle", "pixel", "image", "color", "maintainers", "tags", "team", "featured", "swarm", "added"]);

const errors = [];
const projects = [];
const logos = new Set();
const images = new Set();

const isHttps = v => { try { return new URL(v).protocol === "https:"; } catch { return false; } };
const checkLogo = (slug, file) => {
  if (typeof file !== "string" || file.includes("/") || !LOGO_EXT.includes(extname(file).toLowerCase())) return `${slug}: logo "${file}" must be a file name in projects/logos/ ending in ${LOGO_EXT.join(", ")}`;
  const p = join(LOGOS, file);
  if (!existsSync(p)) return `${slug}: projects/logos/${file} does not exist`;
  if (statSync(p).size > MAX_LOGO) return `${slug}: projects/logos/${file} is larger than 150 KB`;
  logos.add(file);
  return null;
};

for (const f of readdirSync(DIR).filter(f => f.endsWith(".json")).sort()) {
  const err = m => errors.push(`projects/${f}: ${m}`);
  let p;
  try { p = JSON.parse(readFileSync(join(DIR, f), "utf8")); } catch (e) { err(`invalid JSON (${e.message})`); continue; }
  const slug = f.slice(0, -5);
  for (const k of Object.keys(p)) if (!KNOWN.has(k)) err(`unknown field "${k}"`);
  if (p.slug !== slug || !SLUG.test(slug)) err(`"slug" must equal the file name and use a-z, 0-9 and dashes`);
  if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 40) err(`"name" is required, at most 40 characters`);
  if (!TYPES.includes(p.type)) err(`"type" must be one of ${TYPES.join(", ")}`);
  if (!Array.isArray(p.kinds) || !p.kinds.length || !p.kinds.every(k => KINDS.includes(k))) err(`"kinds" must list one or more of ${KINDS.join(", ")}`);
  if (!STATUSES.includes(p.status)) err(`"status" must be one of ${STATUSES.join(", ")}`);
  for (const [key, max] of [["tagline", 80], ["description", 300]]) {
    const v = p[key];
    if (!v || typeof v.en !== "string" || !v.en.trim()) err(`"${key}.en" is required`);
    for (const [lang, text] of Object.entries(v || {})) if (typeof text !== "string" || text.length > max) err(`"${key}.${lang}" must be text of at most ${max} characters`);
  }
  if (!isHttps(p.url)) err(`"url" must be an https:// link`);
  if (p.repo != null && !isHttps(p.repo)) err(`"repo" must be an https:// link`);
  if (p.type === "open-source" && p.status !== "soon") {
    if (!p.repo) err(`open-source projects need a public "repo" link`);
    if (typeof p.license !== "string" || !p.license.trim()) err(`open-source projects need a "license" (for example MIT)`);
  }
  const le = checkLogo(slug, p.logo); if (le) err(le);
  if (p.image != null) {
    const ip = join(IMAGES, String(p.image));
    if (typeof p.image !== "string" || p.image.includes("/") || ![".webp", ".png", ".jpg", ".jpeg"].includes(extname(p.image).toLowerCase())) err(`"image" must be a file name in projects/images/ ending in .webp, .png or .jpg`);
    else if (!existsSync(ip)) err(`projects/images/${p.image} does not exist`);
    else if (statSync(ip).size > MAX_IMAGE) err(`projects/images/${p.image} is larger than 400 KB`);
    else images.add(p.image);
  }
  if (p.logoStyle != null && !["tile", "mark"].includes(p.logoStyle)) err(`"logoStyle" must be "tile" or "mark"`);
  if (p.color != null && !/^#[0-9a-fA-F]{6}$/.test(p.color)) err(`"color" must look like #1d6b4f`);
  if (!Array.isArray(p.maintainers) || !p.maintainers.length || !p.maintainers.every(h => HANDLE.test(h))) err(`"maintainers" must list at least one GitHub username`);
  if (p.tags != null && (!Array.isArray(p.tags) || p.tags.length > 5 || !p.tags.every(t => SLUG.test(t)))) err(`"tags" takes at most 5 lowercase tags`);
  if (p.added != null && !/^\d{4}-\d{2}-\d{2}$/.test(p.added)) err(`"added" must be a date like 2026-11-04`);
  if (p.swarm?.src) { const se = checkLogo(slug, p.swarm.src); if (se) err(se); }
  projects.push(p);
}

if (errors.length) {
  console.error(`Found ${errors.length} problem(s):\n` + errors.map(e => "  - " + e).join("\n"));
  process.exit(1);
}

const rank = p => [p.featured ? 0 : 1, p.type === "app" ? 0 : 1, p.status === "soon" ? 1 : 0];
projects.sort((a, b) => {
  const ra = rank(a), rb = rank(b);
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
  return (b.added || "").localeCompare(a.added || "") || a.name.localeCompare(b.name);
});
console.log(`${projects.length} project(s) valid.`);
if (checkOnly) process.exit(0);

const outLogos = join(OUT, "logos");
rmSync(outLogos, { recursive: true, force: true });
mkdirSync(outLogos, { recursive: true });
for (const f of logos) copyFileSync(join(LOGOS, f), join(outLogos, f));
const outImages = join(OUT, "images");
rmSync(outImages, { recursive: true, force: true });
mkdirSync(outImages, { recursive: true });
for (const f of images) copyFileSync(join(IMAGES, f), join(outImages, f));
const site = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
writeFileSync(join(OUT, "projects.json"), JSON.stringify({ site, projects }, null, 2) + "\n");

// Share images are optional: made by `npm run og`, otherwise pages fall back to the screenshot.
const outOg = join(OUT, "og"), outPages = join(OUT, "p");
for (const d of [outOg, outPages]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
let ogs = 0;
for (const p of projects) {
  const og = join(OGS, `${p.slug}.png`), hasOg = existsSync(og);
  if (hasOg) { copyFileSync(og, join(outOg, `${p.slug}.png`)); ogs++; }
  writeFileSync(join(outPages, `${p.slug}.html`), projectPage(p, projects, site, hasOg));
}
writeFileSync(join(OUT, "sitemap.xml"), sitemap(projects, new Date().toISOString().slice(0, 10)));
console.log(`Wrote public/projects.json, ${logos.size} logo(s), ${images.size} screenshot(s), ${ogs} share image(s), ${projects.length} project page(s) and sitemap.xml.`);
