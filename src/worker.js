// openyard.cloud: static assets from public/, plus the project database (D1).
//   GET  /api/projects        every visible project with its GitHub stats and trending score
//   GET  /api/github?repo=     what the submit form fills in from a GitHub link
//   GET  /api/site?url=        what it fills in from the project's own site: name, description, logo, banner (scrape.js)
//   POST /api/submit           add a project (signed in with GitHub or email; a per-account and per-IP limit)
//   GET/POST /api/edit/<slug>  change or remove a project with the edit token from submitting
//   GET  /projects, /apps, /open-source, /for-people, /wild-ideas, /dev-tools, /tags/<tag>, /about, /community   (hub.js)
//   GET  /p/<slug>             project page      GET /go/<slug>  counted redirect to the project
//   GET  /u/<id>               uploaded logo or screenshot     GET /sitemap.xml
//   GET/POST /api/comments, DELETE /api/comments/<id>   comments on project pages (GitHub sign-in, see auth.js)
//   GET/POST /api/likes        like a project (signed in); its makers hear about it once a day
//   POST /auth/email, GET /auth/email?t=, POST /auth/email/confirm   sign in with a one-time email link (no GitHub needed)
//   POST /auth/email/code      or with the 6-digit code from the same email
//   GET  /a/<seed>/<letter>.svg   the generated picture of an account that has none
//   GET  /discuss, /discuss/<category>, /discuss/t/<id>-<slug>, /discuss/new   discussions (discuss.js)
//   POST /api/topics, DELETE /api/topics/<id>   start or remove a topic; replies go through /api/comments
//   GET  /claim/<slug>, POST /api/claim/<slug>   take over a listing that has no account (meta tag, DNS TXT or GitHub)
//   GET/POST /api/me, POST /api/me/delete   the signed-in person: profile, email consent, interests; delete the account
//   GET/POST /unsubscribe?t=   one-click email opt-out (email.js; Resend sends from the outbox)
//   GET  /welcome, /settings, /privacy, /@<login>   first sign-in, account settings, privacy, public profile (account.js)
//   GET  /api/vet/queue, POST /api/vet/<slug>   code checks, for the scanner workflow (VET_TOKEN)
//   GET  /badge/<slug>.svg     README badge with the latest code check
//   GET  /check, /check/<owner>/<repo>   check any public GitHub repository (POST /api/check, GET /api/check/status,
//                                        GET /api/check/report; vetcode.openyard.cloud may call these three too)
//   GET  /api/check/queue, POST /api/check/result   the same, for the scanner workflow (VET_TOKEN)
//   GET  /badge/gh/<owner>/<repo>.svg              badge for any checked repository
// The cron trigger refreshes GitHub stats a few repositories at a time.
import SITE from "../site.config.json";
import { projectPage, sitemap, badge, checkPage, checkMarkdown, checkReport, projectMarkdown, llmsTxt } from "./pages.js";
import * as mail from "./email.js";
import { discussPage, topicPage, newTopicPage, DCAT, DCATS, topicPath } from "./discuss.js";
import { welcomePage, settingsPage, profilePage, privacyPage, signinPage, signinConfirmPage, claimPage } from "./account.js";
import { listPage, tagPage, aboutPage, communityPage, CAT, HUB_PATHS, tagPages } from "./hub.js";
import { siteMeta, grabImage, publicHttps, dnsTxt } from "./scrape.js";
import { vi as errVi } from "./errors.js";
import { parseRepo, repoInfo, repoActivity, RateLimited } from "./github.js";
import { handleAuth, currentUser, isAdmin, sessionFor, landing, safeReturn, randomToken } from "./auth.js";

const DAY = 86400000;
const TYPES = ["app", "open-source"], STATUSES = ["live", "beta", "soon"], KINDS = ["people", "wild", "dev"];
const IMAGE_TYPES = { "image/png": [0x89, 0x50], "image/jpeg": [0xff, 0xd8], "image/webp": [0x52, 0x49] };
const MAX_LOGO = 200 * 1024, MAX_IMAGE = 700 * 1024, SUBMITS_PER_DAY = 5, CHECKS_PER_DAY = 20;

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...extra } });
// errors carry their Vietnamese (errors.js); pages pick the one for their language
const fail = (error, status = 400) => json({ error, ...(errVi(error) ? { error_vi: errVi(error) } : {}) }, status);
// Other OpenYard sites that may ask for a check from their own pages (CORS on the three public check endpoints).
const CHECK_ORIGINS = ["https://vetcode.openyard.cloud"];
const PUBLIC_CHECK = new Set(["/api/check", "/api/check/status", "/api/check/report"]);
const corsFor = req => { const o = req.headers.get("Origin"); return CHECK_ORIGINS.includes(o) ? { "Access-Control-Allow-Origin": o, Vary: "Origin" } : null; };
const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const isHttps = v => { try { return new URL(v).protocol === "https:"; } catch { return false; } };
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const token = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" })[c]);
const slugify = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";

// Trending: GitHub activity this week plus clicks from the site, with a fading boost for new listings.
function trend(p, s, clicks, talk, now, likes = 0) {
  const age = (now - Date.parse(p.added)) / DAY;
  const gh = s ? s.stars_7d * 3 + s.prs_7d * 2 + s.issues_7d + s.discussions_7d * 2 + Math.min(s.commits_7d, 30) * 0.3 : 0;
  return Math.round((gh + clicks * 0.5 + talk * 2 + likes * 2 + (age < 14 ? 6 * (1 - age / 14) : 0)) * 10) / 10;
}

function toApi(row, now) {
  const p = {
    slug: row.slug, name: row.name, type: row.type, kinds: JSON.parse(row.kinds), status: row.status,
    tagline: JSON.parse(row.tagline), description: JSON.parse(row.description), url: row.url,
    ...(row.repo ? { repo: row.repo } : {}), ...(row.license ? { license: row.license } : {}),
    logo: row.logo, ...(row.logo_style ? { logoStyle: row.logo_style } : {}), ...(row.image ? { image: row.image } : {}), ...(row.og ? { og: row.og } : {}),
    ...(row.color ? { color: row.color } : {}), maintainers: JSON.parse(row.maintainers), tags: JSON.parse(row.tags),
    team: !!row.team, featured: !!row.featured, ...(row.swarm ? { swarm: JSON.parse(row.swarm) } : {}), ...(row.highlights ? { highlights: JSON.parse(row.highlights) } : {}), ...(row.install ? { install: JSON.parse(row.install) } : {}), added: row.added,
  };
  const s = row.st_updated ? { stars: row.stars, forks: row.forks, stars_7d: row.stars_7d, prs_7d: row.prs_7d, issues_7d: row.issues_7d, commits_7d: row.commits_7d, discussions_7d: row.discussions_7d, pushed_at: row.pushed_at } : null;
  const v = row.v_verdict ? { verdict: row.v_verdict, scanned_at: row.v_scanned } : null;
  return { ...p, ...(s ? { stats: s } : {}), ...(v ? { vet: v } : {}), comments: row.comments || 0, likes: row.likes || 0, ...(row.owner ? { owner: { login: row.owner.split("\t")[0], avatar: row.owner.split("\t")[1] || null } } : {}), trend: trend(p, s, row.clicks || 0, row.talk || 0, now, row.likes_7d || 0) };
}

const rank = p => [p.featured ? 0 : 1, p.type === "app" ? 0 : 1, p.status === "soon" ? 1 : 0];
async function listProjects(env, now = Date.now()) {
  const since = today(now - 7 * DAY);
  const { results } = await env.DB.prepare(`SELECT p.*, s.stars, s.forks, s.stars_7d, s.prs_7d, s.issues_7d, s.commits_7d, s.discussions_7d, s.pushed_at, s.updated_at AS st_updated, v.verdict AS v_verdict, v.scanned_at AS v_scanned,
      (SELECT SUM(n) FROM clicks c WHERE c.slug = p.slug AND c.day >= ?1) AS clicks,
      (SELECT COUNT(*) FROM comments m WHERE m.slug = p.slug AND m.deleted = 0) AS comments,
      (SELECT COUNT(DISTINCT m.user_id) FROM comments m WHERE m.slug = p.slug AND m.deleted = 0 AND m.created_at > ?2) AS talk,
      (SELECT COUNT(*) FROM likes k WHERE k.slug = p.slug) AS likes,
      (SELECT COUNT(*) FROM likes k WHERE k.slug = p.slug AND k.created_at > ?2) AS likes_7d,
      (SELECT o.login || char(9) || COALESCE(o.avatar, '') FROM users o WHERE o.id = p.owner_id AND o.deleted_at IS NULL AND o.banned = 0) AS owner
    FROM projects p LEFT JOIN stats s ON s.slug = p.slug LEFT JOIN vets v ON v.slug = p.slug WHERE p.hidden = 0`).bind(since, now - 7 * DAY).all();
  return results.map(r => toApi(r, now)).sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return b.added.localeCompare(a.added) || a.name.localeCompare(b.name);
  });
}

async function readImage(file, max) {
  if (!file || typeof file === "string" || !file.size) return null;
  if (file.size > max) throw new Error(`An image is larger than ${Math.round(max / 1024)} KB.`);
  const buf = new Uint8Array(await file.arrayBuffer()), magic = IMAGE_TYPES[file.type];
  if (!magic || buf[0] !== magic[0] || buf[1] !== magic[1]) throw new Error("Images must be PNG, JPEG or WebP.");
  return { type: file.type, buf };
}

// Copies the pictures found on a project's site into uploads. An apple-touch-icon or PNG fills
// its square (tile); an SVG sits on white with some room around it.
async function sitePictures(env, f, now) {
  const out = { logo: null, image: null, logoStyle: null };
  if (!f.logoFile && f.logoUrl) { const g = await grabImage(f.logoUrl, { logo: true }); if (g) { out.logo = await storeUpload(env, g, now); out.logoStyle = g.type === "image/svg+xml" ? null : "tile"; } }
  if (!f.imageFile && f.imageUrl) { const g = await grabImage(f.imageUrl); if (g) out.image = await storeUpload(env, g, now); }
  return out;
}

// GET /api/site?url=: what the submit form fills in from a project's own site (signed in, 60 an hour).
// ---------- claiming a listing that came in without an account ----------
// A GitHub account that owns the project's repository (or is its listed maker) may claim at once.
const ghClaim = (user, p) => user.provider !== "email" && (
  JSON.parse(p.maintainers || "[]").some(m => m.toLowerCase() === user.login.toLowerCase())
  || (parseRepo(p.repo || "")?.owner || "").toLowerCase() === user.login.toLowerCase());
async function claimToken(env, slug, user) {
  const row = await env.DB.prepare("SELECT token FROM claims WHERE slug = ?1 AND user_id = ?2").bind(slug, user.id).first();
  if (row) return row.token;
  const token = randomToken(12);
  await env.DB.prepare("INSERT INTO claims (slug, user_id, token, created_at) VALUES (?1, ?2, ?3, ?4)").bind(slug, user.id, token, Date.now()).run();
  return token;
}
// POST /api/claim/<slug> { how: meta | dns | github, emailOk }: check the proof, then the listing is theirs.
async function claim(req, env, url, slug) {
  const user = await currentUser(req, env);
  if (req.headers.get("Origin") !== url.origin) return fail("Bad origin.", 403);
  if (!user) return fail("Sign in first.", 401);
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  const p = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?1 AND hidden = 0").bind(slug).first();
  if (!p) return fail("No such project.", 404);
  if (p.team || p.owner_id) return fail("This project already belongs to an account.", 409);
  let ok = false;
  if (b.how === "github") ok = ghClaim(user, p);
  else {
    const token = (await env.DB.prepare("SELECT token FROM claims WHERE slug = ?1 AND user_id = ?2").bind(slug, user.id).first())?.token;
    if (!token) return fail("Open the claim page first.");
    const host = publicHttps(p.url)?.hostname;
    if (b.how === "meta") {
      const pages = [...new Set([p.url, host && `https://${host}/`].filter(Boolean))];
      for (const u of pages) { const m = await siteMeta(u).catch(() => null); if (m?.verify.includes(token)) { ok = true; break; } }
    } else if (b.how === "dns" && host) {
      const names = [host, host.split(".").slice(1).join(".")].filter(h => h.includes("."));
      for (const h of names) if ((await dnsTxt(h)).includes(`openyard-verify=${token}`)) { ok = true; break; }
    }
  }
  if (!ok) return fail(b.how === "github" ? "Your GitHub account does not own this project's repository." : b.how === "dns" ? "The TXT record is not there yet. DNS can take a few minutes; try again soon." : "The tag is not on the page yet. Publish it, then try again.", 400);
  const r = await env.DB.prepare(`UPDATE projects SET owner_id = ?2, contact_email = COALESCE(contact_email, ?3), contact_ok = ?4, contact_lang = ?5, updated_at = ?6
    WHERE slug = ?1 AND owner_id IS NULL RETURNING slug`).bind(slug, user.id, user.email, b.emailOk === false ? 0 : 1, user.lang || "en", Date.now()).first();
  if (!r) return fail("This project already belongs to an account.", 409);
  await env.DB.prepare("DELETE FROM claims WHERE slug = ?1").bind(slug).run();
  return json({ page: `/p/${slug}` });
}

async function siteLookup(req, env, url) {
  const user = await currentUser(req, env), now = Date.now();
  if (!user) return fail("Sign in first.", 401);
  const target = publicHttps(url.searchParams.get("url"));
  if (!target) return fail("Paste a link that starts with https://");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM scrape_hits WHERE user_id = ?1 AND created_at > ?2").bind(user.id, now - 3600000).first();
  if (n >= 60) return fail("Too many look-ups. Fill the form by hand.", 429);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO scrape_hits (user_id, created_at) VALUES (?1, ?2)").bind(user.id, now),
    env.DB.prepare("DELETE FROM scrape_hits WHERE created_at < ?1").bind(now - DAY),
  ]);
  const m = await siteMeta(target.href);
  if (!m) return fail("Could not read that page.", 404);
  // check the pictures now, so the form only shows ones that can be kept
  const [logo, image] = await Promise.all([m.icon ? grabImage(m.icon, { logo: true }) : null, m.image ? grabImage(m.image) : null]);
  return json({ name: m.name, title: m.title, description: m.description, logo: logo ? m.icon : null, image: image ? m.image : null }, 200, { "Cache-Control": "private, max-age=300" });
}

// Cron: listings without a logo or banner get them from their own site (six at a time, each at most weekly).
async function fillPictures(env, now = Date.now()) {
  const { results } = await env.DB.prepare(`SELECT slug, url, logo, image FROM projects WHERE hidden = 0 AND (logo IS NULL OR image IS NULL)
    AND (scraped_at IS NULL OR scraped_at < ?1) ORDER BY COALESCE(scraped_at, 0) LIMIT 6`).bind(now - 7 * DAY).all();
  for (const p of results) {
    await env.DB.prepare("UPDATE projects SET scraped_at = ?2 WHERE slug = ?1").bind(p.slug, now).run();
    const m = await siteMeta(p.url).catch(() => null);
    if (!m) continue;
    const site = await sitePictures(env, { logoUrl: p.logo ? null : m.icon, imageUrl: p.image ? null : m.image }, now);
    if (site.logo) await env.DB.prepare("UPDATE projects SET logo = ?2, logo_style = ?3 WHERE slug = ?1 AND logo IS NULL").bind(p.slug, site.logo, site.logoStyle).run();
    if (site.image) await env.DB.prepare("UPDATE projects SET image = ?2 WHERE slug = ?1 AND image IS NULL").bind(p.slug, site.image).run();
    console.log("pictures", p.slug, !!site.logo, !!site.image);
  }
}

async function storeUpload(env, img, now) {
  const id = token().slice(0, 20);
  await env.DB.prepare("INSERT INTO uploads (id, type, data, created_at) VALUES (?1, ?2, ?3, ?4)").bind(id, img.type, img.buf, now).run();
  return `/u/${id}`;
}

// Reads and checks the submit/edit form. Returns the project fields or throws an Error with a message for the person.
async function readForm(env, form) {
  const get = k => String(form.get(k) ?? "").trim();
  const lang = get("lang") === "vi" ? "vi" : "en";
  const name = get("name"), url = get("url"), repo = get("repo"), tagline = get("tagline"), description = get("description");
  const kinds = form.getAll("kinds").map(String).filter(k => KINDS.includes(k));
  const status = STATUSES.includes(get("status")) ? get("status") : "live";
  if (!name || name.length > 40) throw new Error("Add a name of at most 40 characters.");
  if (!isHttps(url)) throw new Error("The link must start with https://");
  if (repo && !isHttps(repo)) throw new Error("The code link must start with https://");
  if (!tagline || tagline.length > 80) throw new Error("Add a one-line tagline of at most 80 characters.");
  if (!description || description.length > 300) throw new Error("Add a description of at most 300 characters.");
  if (!kinds.length) throw new Error("Pick at least one kind.");
  if (get("free") !== "yes") throw new Error("OpenYard lists free projects only.");
  const email = get("email").toLowerCase();
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("That email address looks wrong.");
  const maintainer = get("maintainer").replace(/^@/, "");
  if (maintainer && !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(maintainer)) throw new Error("The GitHub username looks wrong.");
  const tags = get("tags").split(/[,\s]+/).map(t => t.toLowerCase().replace(/[^a-z0-9-]/g, "")).filter(Boolean).slice(0, 5);
  const color = /^#[0-9a-fA-F]{6}$/.test(get("color")) ? get("color") : null;
  const ref = parseRepo(repo);
  let license = null, owner = maintainer || null;
  if (ref) {
    try { const info = await repoInfo(env, ref); if (info) { license = info.license; owner = owner || info.owner; } } catch (e) { if (!(e instanceof RateLimited)) throw e; }
  }
  return {
    name, url, repo: repo || null, license, kinds, status, color, tags, lang, ref, email: email || null,
    type: ref && license ? "open-source" : "app",
    tagline: { [lang]: tagline }, description: { [lang]: description },
    maintainers: owner ? [owner] : [],
    logoFile: await readImage(form.get("logo"), MAX_LOGO), imageFile: await readImage(form.get("image"), MAX_IMAGE),
    // pictures the form found on the project's own site, kept only when nothing was uploaded
    logoUrl: publicHttps(get("logo_url"))?.href || null, imageUrl: publicHttps(get("image_url"))?.href || null,
  };
}

async function checkHuman(env, form, ip) {
  if (String(form.get("website") || "")) return false; // honeypot
  if (!env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY) return true; // previews run without Turnstile
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET); body.append("response", String(form.get("cf-turnstile-response") || "")); body.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  return (await r.json()).success === true;
}

async function submit(req, env, ctx) {
  const now = Date.now(), ip = req.headers.get("CF-Connecting-IP") || "0";
  // a project belongs to an account: signing in (GitHub, or a link sent to an email) is the check against spam
  const user = await currentUser(req, env);
  if (!user) return fail("Sign in to submit a project.", 401);
  if (user.banned) return fail("Not allowed.", 403);
  let form; try { form = await req.formData(); } catch { return fail("Send the form as multipart/form-data."); }
  if (String(form.get("website") || "")) return fail("Could not verify you are human. Reload and try again.", 403); // honeypot
  const ipHash = await sha256(ip + "|openyard|" + today(now));
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submits WHERE ip_hash = ?1 AND created_at > ?2").bind(ipHash, now - DAY).first();
  const { mine } = await env.DB.prepare("SELECT COUNT(*) AS mine FROM projects WHERE owner_id = ?1 AND created_at > ?2").bind(user.id, now - DAY).first();
  if (n >= SUBMITS_PER_DAY || mine >= SUBMITS_PER_DAY) return fail("That is five projects today. Try again tomorrow.", 429);
  let f; try { f = await readForm(env, form); } catch (e) { return fail(e.message); }
  // the project is theirs to edit from their profile, and a GitHub account is its maker unless they named someone
  if (user.provider !== "email" && !f.maintainers.length) f.maintainers = [user.login];
  // where we tell them about their listing; a signed-in person's account email will do
  const contactEmail = f.email || user.email || null;
  if (!contactEmail) return fail("Add your email so we can send you the edit link and tell you when people comment.");

  let slug = slugify(f.name);
  for (let i = 2; await env.DB.prepare("SELECT 1 FROM projects WHERE slug = ?1").bind(slug).first(); i++) slug = `${slugify(f.name).slice(0, 36)}-${i}`;
  const site = await sitePictures(env, f, now);
  const logo = f.logoFile ? await storeUpload(env, f.logoFile, now) : site.logo || (f.ref ? `https://github.com/${f.ref.owner}.png?size=200` : null);
  const image = f.imageFile ? await storeUpload(env, f.imageFile, now) : site.image;
  const edit = token();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO projects (slug, name, type, kinds, status, tagline, description, url, repo, license, logo, logo_style, image, color, maintainers, tags, added, edit_hash, created_at, updated_at, owner_id, contact_email, contact_lang)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?19, ?20, ?21, ?22)`)
      .bind(slug, f.name, f.type, JSON.stringify(f.kinds), f.status, JSON.stringify(f.tagline), JSON.stringify(f.description), f.url, f.repo, f.license,
        logo, f.logoFile ? "tile" : site.logoStyle, image, f.color, JSON.stringify(f.maintainers), JSON.stringify(f.tags), today(now), await sha256(edit), now, user.id, contactEmail, f.lang),
    env.DB.prepare("INSERT INTO submits (ip_hash, created_at) VALUES (?1, ?2)").bind(ipHash, now),
  ]);
  if (f.ref) ctx.waitUntil(refreshOne(env, slug, f.ref, now).catch(() => {}));
  ctx.waitUntil(announce(env, [`/p/${slug}`]).catch(e => console.error(e)));
  ctx.waitUntil(mail.live(env, slug, `/submit?edit=${slug}#${edit}`).then(() => mail.drain(env, 3)).catch(e => console.error("live mail", e)));
  return json({ slug, page: `/p/${slug}`, edit: `/submit?edit=${slug}#${edit}`, owner: user.login }, 201);
}

// Who may change a project: the private edit link, or a signed-in person who submitted it or is listed as its maker.
// maintainers are GitHub usernames, so only a GitHub account can match one
const owns = (user, row) => !!user && (row.owner_id === user.id || (user.provider !== "email" && JSON.parse(row.maintainers || "[]").some(m => m.toLowerCase() === user.login.toLowerCase())));
async function authorize(env, slug, tok, user) {
  const row = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?1 AND hidden = 0").bind(slug).first();
  if (!row) return null;
  if (owns(user, row)) return row;
  if (!row.edit_hash || !tok || (await sha256(tok)) !== row.edit_hash) return null;
  return row;
}

async function edit(req, env, ctx, slug) {
  const now = Date.now();
  if (req.method === "GET") {
    const row = await authorize(env, slug, req.headers.get("X-Edit-Token"), await currentUser(req, env));
    return row ? json({ ...toApi(row, now), contactEmail: row.contact_email }, 200, { "Cache-Control": "private, no-store" }) : fail("Open your private edit link, or sign in as the person who submitted it.", 403);
  }
  let form; try { form = await req.formData(); } catch { return fail("Send the form as multipart/form-data."); }
  const row = await authorize(env, slug, String(form.get("token") || ""), await currentUser(req, env));
  if (!row) return fail("Open your private edit link, or sign in as the person who submitted it.", 403);
  if (form.get("remove") === "yes") {
    await env.DB.prepare("UPDATE projects SET hidden = 1, updated_at = ?2 WHERE slug = ?1").bind(slug, now).run();
    return json({ removed: slug });
  }
  let f; try { f = await readForm(env, form); } catch (e) { return fail(e.message); }
  const site = await sitePictures(env, { ...f, logoUrl: row.logo ? null : f.logoUrl, imageUrl: row.image ? null : f.imageUrl }, now);
  const logo = f.logoFile ? await storeUpload(env, f.logoFile, now) : row.logo || site.logo || (f.ref ? `https://github.com/${f.ref.owner}.png?size=200` : null);
  const image = f.imageFile ? await storeUpload(env, f.imageFile, now) : row.image || site.image;
  // keep the other language if the person only edited one
  const merge = (old, nu) => ({ ...JSON.parse(old), ...nu });
  await env.DB.prepare(`UPDATE projects SET name = ?2, type = ?3, kinds = ?4, status = ?5, tagline = ?6, description = ?7, url = ?8, repo = ?9, license = ?10,
      logo = ?11, logo_style = ?12, image = ?13, color = ?14, maintainers = ?15, tags = ?16, updated_at = ?17 WHERE slug = ?1`)
    .bind(slug, f.name, f.type, JSON.stringify(f.kinds), f.status, JSON.stringify(merge(row.tagline, f.tagline)), JSON.stringify(merge(row.description, f.description)),
      f.url, f.repo, f.license, logo, f.logoFile ? "tile" : row.logo ? row.logo_style : site.logoStyle, image, f.color, JSON.stringify(f.maintainers.length ? f.maintainers : JSON.parse(row.maintainers)), JSON.stringify(f.tags), now).run();
  // a new address starts getting email again; the same one keeps its choice
  if (f.email && f.email !== row.contact_email) await env.DB.prepare("UPDATE projects SET contact_email = ?2, contact_ok = 1, contact_lang = ?3 WHERE slug = ?1").bind(slug, f.email, f.lang).run();
  if (f.ref) ctx.waitUntil(refreshOne(env, slug, f.ref, now).catch(() => {}));
  return json({ slug, page: `/p/${slug}` });
}

async function refreshOne(env, slug, ref, now) {
  const a = await repoActivity(env, ref, now);
  if (!a) return;
  const day = today(now);
  await env.DB.prepare("INSERT INTO star_history (slug, day, stars) VALUES (?1, ?2, ?3) ON CONFLICT (slug, day) DO UPDATE SET stars = excluded.stars").bind(slug, day, a.stars).run();
  const base = await env.DB.prepare("SELECT stars FROM star_history WHERE slug = ?1 AND day <= ?2 ORDER BY day DESC LIMIT 1").bind(slug, today(now - 7 * DAY)).first()
    || await env.DB.prepare("SELECT stars FROM star_history WHERE slug = ?1 ORDER BY day LIMIT 1").bind(slug).first();
  const stars7 = Math.max(0, a.stars - (base?.stars ?? a.stars));
  await env.DB.prepare(`INSERT INTO stats (slug, stars, forks, open_issues, pushed_at, stars_7d, prs_7d, issues_7d, commits_7d, discussions_7d, activity, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      ON CONFLICT (slug) DO UPDATE SET stars = excluded.stars, forks = excluded.forks, open_issues = excluded.open_issues, pushed_at = excluded.pushed_at, stars_7d = excluded.stars_7d,
        prs_7d = excluded.prs_7d, issues_7d = excluded.issues_7d, commits_7d = excluded.commits_7d, discussions_7d = excluded.discussions_7d, activity = excluded.activity, updated_at = excluded.updated_at`)
    .bind(slug, a.stars, a.forks, a.open_issues, a.pushed_at, stars7, a.prs_7d, a.issues_7d, a.commits_7d, a.discussions_7d, JSON.stringify(a.activity), now).run();
}

async function refreshStats(env, now = Date.now()) {
  // Without a token GitHub allows 60 requests an hour; each repository takes four.
  const limit = env.GITHUB_TOKEN ? 60 : 10;
  const { results } = await env.DB.prepare(`SELECT p.slug, p.repo FROM projects p LEFT JOIN stats s ON s.slug = p.slug
    WHERE p.hidden = 0 AND p.repo LIKE 'https://github.com/%' ORDER BY COALESCE(s.updated_at, 0) LIMIT ?1`).bind(limit).all();
  for (const { slug, repo } of results) {
    const ref = parseRepo(repo);
    if (!ref) continue;
    try { await refreshOne(env, slug, ref, now); } catch (e) { if (e instanceof RateLimited) break; console.error(slug, e); }
  }
  await env.DB.prepare("DELETE FROM submits WHERE created_at < ?1").bind(now - 2 * DAY).run();
}

// Comments: anyone can read; signed-in GitHub users can post and remove their own.
const KIND_LIST = ["people", "wild", "dev"];
// ---------- accounts without GitHub ----------
const HANDLE = /^[a-z0-9](?:[a-z0-9-]{1,22})[a-z0-9]$/;
const RESERVED = new Set(["admin", "openyard", "team", "deleted", "settings", "welcome", "signin", "support", "help", "discuss", "api", "root", "system", "null", "undefined"]);
// a generated picture: one of the OpenYard gradients, picked by the account, with an initial
const pic = (id, name) => `/a/${Math.abs(id).toString(36)}/${encodeURIComponent((String(name).trim()[0] || "?").toUpperCase())}.svg`;
const GRADS = [["#7c9cff", "#b67cff"], ["#b67cff", "#ff7eb0"], ["#ff7eb0", "#ffc56b"], ["#34d399", "#7c9cff"], ["#38c6d9", "#b67cff"], ["#ffc56b", "#ff7eb0"], ["#6d5bd0", "#38c6d9"], ["#10b981", "#a3e635"]];
function avatarSvg(seed, letter) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = GRADS[h % GRADS.length], L = [...letter][0] || "?";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><circle cx="${20 + h % 56}" cy="${16 + (h >> 4) % 30}" r="34" fill="#fff" opacity=".14"/><text x="48" y="50" dy=".35em" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="44" font-weight="600" fill="#fff">${L.replace(/[<&>"']/g, "")}</text></svg>`;
}
async function freeHandle(env, email) {
  let base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
  if (base.length < 3 || RESERVED.has(base)) base = "maker";
  for (let i = 0; i < 50; i++) {
    const h = i ? `${base}-${i + 1}` : base;
    if (HANDLE.test(h) && !(await env.DB.prepare("SELECT 1 FROM users WHERE login = ?1 COLLATE NOCASE").bind(h).first())) return h;
  }
  return `maker-${Math.random().toString(36).slice(2, 8)}`;
}
async function tsOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY) return true;
  const body = new FormData(); body.append("secret", env.TURNSTILE_SECRET); body.append("response", String(token || "")); body.append("remoteip", ip);
  return (await (await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body })).json()).success === true;
}
// POST /auth/email: send a one-time link. GET shows a button (mail scanners open links, they do not
// press buttons); POST /auth/email/confirm signs in, making the account on first use.
async function emailSignin(req, env, url) {
  const now = Date.now(), ip = req.headers.get("CF-Connecting-IP") || "0", path = url.pathname, secure = url.protocol === "https:";
  if (path === "/auth/email" && req.method === "POST") {
    let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
    const email = String(b.email || "").trim().toLowerCase();
    if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("That email address looks wrong.");
    if (!(await tsOk(env, b.ts, ip))) return fail("Could not verify you are human. Reload and try again.", 403);
    const ipHash = await sha256(ip + "|signin|" + today(now));
    const { a } = await env.DB.prepare("SELECT COUNT(*) AS a FROM login_tokens WHERE ip_hash = ?1 AND created_at > ?2").bind(ipHash, now - 3600000).first();
    const { e } = await env.DB.prepare("SELECT COUNT(*) AS e FROM login_tokens WHERE email = ?1 AND created_at > ?2").bind(email, now - 3600000).first();
    if (a >= 6 || e >= 3) return fail("Too many sign-in emails. Wait an hour, or sign in with GitHub.", 429);
    const tok = randomToken(24), th = await sha256(tok);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    await env.DB.batch([
      // a newer email replaces older ones: only the latest link and code work
      env.DB.prepare("UPDATE login_tokens SET used_at = ?2 WHERE email = ?1 AND used_at IS NULL").bind(email, now),
      env.DB.prepare("INSERT INTO login_tokens (token_hash, email, back, ip_hash, created_at, expires_at, code_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)").bind(th, email, safeReturn(b.back), ipHash, now, now + 20 * 60000, await sha256(`${th}|${code}`)),
      env.DB.prepare("DELETE FROM login_tokens WHERE created_at < ?1").bind(now - 2 * DAY),
    ]);
    const sent = await mail.signin(env, email, `${url.origin}/auth/email?t=${tok}`, code, b.lang === "vi" ? "vi" : "en");
    return sent ? json({ sent: true }) : fail("Email sign-in is busy right now. Try again later, or sign in with GitHub.", 503);
  }
  if (path === "/auth/email" && req.method === "GET") return new Response(signinConfirmPage({ site: SITE, token: url.searchParams.get("t") || "" }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
  if (path === "/auth/email/confirm" && req.method === "POST") {
    let form; try { form = await req.formData(); } catch { return fail("Bad request."); }
    const row = await env.DB.prepare("UPDATE login_tokens SET used_at = ?2 WHERE token_hash = ?1 AND used_at IS NULL AND expires_at > ?2 RETURNING email, back").bind(await sha256(String(form.get("t") || "")), now).first();
    if (!row) return Response.redirect(`${url.origin}/signin?expired=1`, 303);
    const sess = await signInEmail(env, row.email, secure, now);
    return new Response(null, { status: 303, headers: { Location: landing(sess, row.back), "Set-Cookie": sess.set } });
  }
  // POST /auth/email/code {email, code}: the 6-digit code from the same email, typed on any device
  if (path === "/auth/email/code" && req.method === "POST") {
    let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
    const email = String(b.email || "").trim().toLowerCase(), code = String(b.code || "").replace(/\D/g, "");
    if (code.length !== 6) return fail("Type the 6-digit code from the email.");
    const row = await env.DB.prepare("SELECT token_hash, code_hash, tries, back FROM login_tokens WHERE email = ?1 AND used_at IS NULL AND expires_at > ?2 AND code_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1").bind(email, now).first();
    if (!row) return fail("That code has expired. Ask for a new one.", 410);
    if (row.tries >= 5) return fail("Too many wrong codes. Ask for a new one.", 429);
    if ((await sha256(`${row.token_hash}|${code}`)) !== row.code_hash) {
      await env.DB.prepare("UPDATE login_tokens SET tries = tries + 1 WHERE token_hash = ?1").bind(row.token_hash).run();
      return fail(row.tries >= 4 ? "Too many wrong codes. Ask for a new one." : "That code is not right. Check the email and try again.", 400);
    }
    const used = await env.DB.prepare("UPDATE login_tokens SET used_at = ?2 WHERE token_hash = ?1 AND used_at IS NULL RETURNING email").bind(row.token_hash, now).first();
    if (!used) return fail("That code has expired. Ask for a new one.", 410);
    const sess = await signInEmail(env, email, secure, now);
    return json({ go: landing(sess, row.back) }, 200, { "Set-Cookie": sess.set, "Cache-Control": "no-store" });
  }
  return null;
}
// The account for a proven email address: an existing one (GitHub accounts first), or a new one.
async function signInEmail(env, email, secure, now) {
  let u = await env.DB.prepare("SELECT id FROM users WHERE email = ?1 COLLATE NOCASE AND deleted_at IS NULL ORDER BY provider = 'github' DESC LIMIT 1").bind(email).first();
  if (!u) {
    const id = -(Math.floor(Math.random() * 2 ** 46) + 1), login = await freeHandle(env, email);
    await env.DB.prepare(`INSERT INTO users (id, login, name, avatar, email, provider, created_at, seen_at) VALUES (?1, ?2, NULL, ?3, ?4, 'email', ?5, ?5)`).bind(id, login, pic(id, login), email, now).run();
    u = { id };
  }
  return sessionFor(env, u.id, secure);
}
const meJson = (u, env) => u ? { login: u.login, name: u.name, avatar: u.avatar, provider: u.provider, email: u.email, emailOk: !!u.email_ok, lang: u.lang, interests: JSON.parse(u.interests || "[]"), onboarded: !!u.onboarded_at, admin: isAdmin(env, u) } : null;
// GET who is signed in; POST changes their choices; POST /api/me/delete removes the account.
// Writes need a JSON body, which another site cannot send with the cookie without a CORS preflight.
async function me(req, env, path, ctx) {
  const user = await currentUser(req, env), now = Date.now(), priv = { "Cache-Control": "private, no-store" };
  if (req.method === "GET" && path === "/api/me") return json(meJson(user, env), 200, priv);
  if (req.method !== "POST") return fail("Not allowed.", 405);
  if (!user) return fail("Sign in first.", 401);
  if (!(req.headers.get("Content-Type") || "").startsWith("application/json")) return fail("Send JSON.", 415);
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  if (path === "/api/me/delete") {
    if (String(b.confirm || "").toLowerCase() !== user.login.toLowerCase()) return fail("Type your nickname to confirm.");
    // Comments are emptied rather than removed so replies keep their place; the profile disappears.
    await env.DB.batch([
      env.DB.prepare("UPDATE comments SET deleted = 1, body = '' WHERE user_id = ?1").bind(user.id),
      env.DB.prepare("UPDATE projects SET owner_id = NULL WHERE owner_id = ?1").bind(user.id),
      env.DB.prepare("DELETE FROM likes WHERE user_id = ?1").bind(user.id),
      env.DB.prepare(`UPDATE users SET login = 'deleted-' || id, name = NULL, avatar = NULL, bio = NULL, email = NULL, email_ok = 0, email_ok_at = ?2,
        interests = '[]', onboarded_at = NULL, deleted_at = ?2 WHERE id = ?1`).bind(user.id, now),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(user.id),
    ]);
    return json({ deleted: true }, 200, { ...priv, "Set-Cookie": "oy_s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure" });
  }
  const interests = Array.isArray(b.interests) ? [...new Set(b.interests.filter(k => KIND_LIST.includes(k)))] : JSON.parse(user.interests || "[]");
  const emailOk = typeof b.emailOk === "boolean" ? (b.emailOk && !!user.email) : !!user.email_ok;
  const lang = b.lang === "vi" || b.lang === "en" ? b.lang : user.lang || "en";
  // email accounts choose their nickname, name and bio; GitHub accounts take them from GitHub
  if (user.provider === "email" && (b.login !== undefined || b.name !== undefined || b.bio !== undefined)) {
    const login = b.login !== undefined ? String(b.login).trim().toLowerCase() : user.login;
    if (!HANDLE.test(login) || RESERVED.has(login)) return fail("A nickname is 3 to 24 letters, numbers or dashes, starting and ending with a letter or number.");
    if (login !== user.login.toLowerCase() && await env.DB.prepare("SELECT 1 FROM users WHERE login = ?1 COLLATE NOCASE AND id != ?2").bind(login, user.id).first()) return fail("That nickname is taken.");
    const name = b.name !== undefined ? clip(String(b.name).trim(), 40) || null : user.name;
    const bio = b.bio !== undefined ? clip(String(b.bio).trim(), 200) || null : user.bio;
    await env.DB.prepare("UPDATE users SET login = ?2, name = ?3, bio = ?4, avatar = ?5 WHERE id = ?1").bind(user.id, login, name, bio, pic(user.id, name || login)).run();
  }
  await env.DB.prepare(`UPDATE users SET interests = ?2, email_ok = ?3, email_ok_at = CASE WHEN email_ok = ?3 THEN email_ok_at ELSE ?4 END,
      onboarded_at = COALESCE(onboarded_at, CASE WHEN ?5 THEN ?4 END), lang = ?6 WHERE id = ?1`)
    .bind(user.id, JSON.stringify(interests), emailOk ? 1 : 0, now, b.onboarded ? 1 : 0, lang).run();
  // first time email is on: a welcome with a few projects for what they like (sent once per account)
  if (emailOk) ctx.waitUntil((async () => {
    const all = await listProjects(env, now);
    const picks = all.filter(p => !interests.length || p.kinds.some(k => interests.includes(k))).slice(0, 3);
    await mail.welcome(env, user.id, picks);
    await mail.drain(env, 3);
  })().catch(e => console.error("welcome", e)));
  return json(meJson(await currentUser(req, env), env), 200, priv);
}

// GET how many people like a project and whether you do; POST toggles your like (signed in).
async function likes(req, env, url) {
  const user = await currentUser(req, env), priv = { "Cache-Control": "private, no-store" };
  if (req.method === "GET") {
    const slug = url.searchParams.get("slug") || "";
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM likes WHERE slug = ?1").bind(slug).first();
    const mine = user ? !!(await env.DB.prepare("SELECT 1 FROM likes WHERE slug = ?1 AND user_id = ?2").bind(slug, user.id).first()) : false;
    // the latest few people, shown on the page as "liked by"
    const { results: people } = await env.DB.prepare(`SELECT u.login, u.avatar FROM likes l JOIN users u ON u.id = l.user_id
      WHERE l.slug = ?1 AND u.deleted_at IS NULL AND u.banned = 0 ORDER BY l.created_at DESC LIMIT 8`).bind(slug).all();
    return json({ count: n, liked: mine, signedIn: !!user, people }, 200, priv);
  }
  if (req.headers.get("Origin") !== url.origin) return fail("Bad origin.", 403);
  if (!user) return fail("Sign in to like projects.", 401);
  if (user.banned) return fail("Not allowed.", 403);
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  const slug = String(b.slug || "");
  if (!(await env.DB.prepare("SELECT 1 FROM projects WHERE slug = ?1 AND hidden = 0").bind(slug).first())) return fail("No such project.", 404);
  const had = await env.DB.prepare("DELETE FROM likes WHERE slug = ?1 AND user_id = ?2 RETURNING slug").bind(slug, user.id).first();
  if (!had) await env.DB.prepare("INSERT INTO likes (slug, user_id, created_at) VALUES (?1, ?2, ?3) ON CONFLICT DO NOTHING").bind(slug, user.id, Date.now()).run();
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM likes WHERE slug = ?1").bind(slug).first();
  const { results: people } = await env.DB.prepare(`SELECT u.login, u.avatar FROM likes l JOIN users u ON u.id = l.user_id
    WHERE l.slug = ?1 AND u.deleted_at IS NULL AND u.banned = 0 ORDER BY l.created_at DESC LIMIT 8`).bind(slug).all();
  return json({ count: n, liked: !had, signedIn: true, people }, 200, priv);
}

// A comment thread is a project (its slug) or a discussion topic ("t-<id>").
const threadExists = (env, key) => /^t-\d+$/.test(key)
  ? env.DB.prepare("SELECT 1 FROM topics WHERE id = ?1 AND deleted = 0").bind(+key.slice(2)).first()
  : env.DB.prepare("SELECT 1 FROM projects WHERE slug = ?1 AND hidden = 0").bind(key).first();

// POST /api/topics starts a discussion; DELETE /api/topics/<id> removes one (its author or an admin).
async function topics(req, env, url, id) {
  const user = await currentUser(req, env), now = Date.now();
  if (req.headers.get("Origin") !== url.origin) return fail("Bad origin.", 403);
  if (!user) return fail("Sign in first.", 401);
  if (user.banned) return fail("Not allowed.", 403);
  if (req.method === "DELETE") {
    const tp = await env.DB.prepare("SELECT user_id FROM topics WHERE id = ?1 AND deleted = 0").bind(id).first();
    if (!tp) return fail("No such topic.", 404);
    if (tp.user_id !== user.id && !isAdmin(env, user)) return fail("Not yours.", 403);
    await env.DB.prepare("UPDATE topics SET deleted = 1 WHERE id = ?1").bind(id).run();
    return json({ deleted: id });
  }
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  const cat = String(b.cat || ""), title = String(b.title || "").replace(/\s+/g, " ").trim(), body = String(b.body || "").replace(/\r\n/g, "\n").trim();
  if (!DCAT[cat] || cat === "showcase") return fail("Pick a category.");
  if (title.length < 5 || title.length > 120) return fail("Write a title of 5 to 120 characters.");
  if (!body || body.length > 5000) return fail("Write between 1 and 5,000 characters.");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM topics WHERE user_id = ?1 AND created_at > ?2").bind(user.id, now - DAY).first();
  if (n >= 5) return fail("That is five topics today. Reply to one, or come back tomorrow.", 429);
  const r = await env.DB.prepare("INSERT INTO topics (cat, title, body, user_id, created_at, last_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5) RETURNING id").bind(cat, title, body, user.id, now).first();
  return json({ id: r.id, url: topicPath({ id: r.id, title }) }, 201);
}

// Everything to show on /discuss: topics, and projects as the Showcase, newest activity first.
async function discussItems(env, cat, all) {
  const last = new Map((await env.DB.prepare("SELECT slug, MAX(created_at) AS at, COUNT(*) AS n FROM comments WHERE deleted = 0 GROUP BY slug").all()).results.map(r => [r.slug, r]));
  const items = [];
  if (!cat || cat === "showcase") for (const p of all) {
    const c = last.get(p.slug);
    items.push({ kind: "project", cat: "showcase", title: `${p.name}: ${p.tagline.en || p.tagline.vi}`, excerpt: "", href: `/p/${p.slug}#comments`, logo: p.logo, team: p.team,
      login: p.maintainers[0] || null, last_at: Math.max(Date.parse(p.added), c?.at || 0), replies: c?.n || 0 });
  }
  if (cat !== "showcase") {
    const { results } = await env.DB.prepare(`SELECT t.id, t.cat, t.title, t.body, t.created_at, t.last_at, t.pinned, u.login, u.avatar FROM topics t JOIN users u ON u.id = t.user_id
      WHERE t.deleted = 0 AND u.banned = 0 ${cat ? "AND t.cat = ?1" : ""} ORDER BY t.pinned DESC, t.last_at DESC LIMIT 100`).bind(...(cat ? [cat] : [])).all();
    for (const tp of results) items.push({ kind: "topic", cat: tp.cat, title: tp.title, excerpt: tp.body.replace(/\s+/g, " ").slice(0, 140), href: topicPath(tp), login: tp.login, avatar: tp.avatar, pinned: tp.pinned, last_at: tp.last_at, replies: last.get(`t-${tp.id}`)?.n || 0 });
  }
  return items.sort((a, b) => (b.pinned || 0) - (a.pinned || 0) || b.last_at - a.last_at).slice(0, 100);
}
async function discussCounts(env, all) {
  const { results } = await env.DB.prepare("SELECT cat, COUNT(*) AS n FROM topics WHERE deleted = 0 GROUP BY cat").all();
  return { showcase: all.length, ...Object.fromEntries(results.map(r => [r.cat, r.n])) };
}

async function comments(req, env, url, id, ctx) {
  const user = await currentUser(req, env), admin = isAdmin(env, user), now = Date.now();
  if (req.method === "GET") {
    const slug = url.searchParams.get("slug") || "";
    const { results } = await env.DB.prepare(`SELECT c.id, c.parent_id, c.body, c.deleted, c.created_at, c.user_id, u.login, u.name, u.avatar
      FROM comments c JOIN users u ON u.id = c.user_id WHERE c.slug = ?1 AND u.banned = 0 ORDER BY c.created_at`).bind(slug).all();
    const replied = new Set(results.filter(r => r.parent_id && !r.deleted).map(r => r.parent_id));
    const list = results.filter(r => !r.deleted || replied.has(r.id)).map(r => ({
      id: r.id, parent: r.parent_id, at: r.created_at, deleted: !!r.deleted, body: r.deleted ? "" : r.body,
      user: r.deleted ? null : { login: r.login, name: r.name, avatar: r.avatar }, mine: !!user && r.user_id === user.id,
    }));
    return json({ me: user ? { login: user.login, avatar: user.avatar, admin } : null, comments: list }, 200, { "Cache-Control": "private, no-store" });
  }
  // a cookie alone must not be enough: the request has to come from our own pages
  if (req.headers.get("Origin") !== url.origin) return fail("Bad origin.", 403);
  if (!user) return fail("Sign in with GitHub to comment.", 401);
  if (user.banned) return fail("You cannot comment here.", 403);
  if (req.method === "DELETE") {
    const c = await env.DB.prepare("SELECT user_id FROM comments WHERE id = ?1").bind(id).first();
    if (!c || (c.user_id !== user.id && !admin)) return fail("Not your comment.", 403);
    await env.DB.prepare("UPDATE comments SET deleted = 1 WHERE id = ?1").bind(id).run();
    return json({ deleted: id });
  }
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  const slug = String(b.slug || ""), body = String(b.body || "").replace(/\r\n/g, "\n").trim(), parent = b.parent ? Number(b.parent) : null;
  if (!body || body.length > 2000) return fail("Write between 1 and 2,000 characters.");
  if (!(await threadExists(env, slug))) return fail("No such project or topic.", 404);
  if (parent && !(await env.DB.prepare("SELECT 1 FROM comments WHERE id = ?1 AND slug = ?2 AND parent_id IS NULL AND deleted = 0").bind(parent, slug).first())) return fail("That comment is gone.");
  const recent = await env.DB.prepare("SELECT SUM(created_at > ?2) AS minute, COUNT(*) AS day FROM comments WHERE user_id = ?1 AND created_at > ?3").bind(user.id, now - 60000, now - DAY).first();
  if ((recent.minute || 0) >= 3 || (recent.day || 0) >= 60) return fail("Slow down a little, then try again.", 429);
  const r = await env.DB.prepare("INSERT INTO comments (slug, user_id, parent_id, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id").bind(slug, user.id, parent, body, now).first();
  if (slug.startsWith("t-")) await env.DB.prepare("UPDATE topics SET last_at = ?2 WHERE id = ?1").bind(+slug.slice(2), now).run();
  ctx.waitUntil(mail.comment(env, { id: r.id, slug, parentId: parent, body, author: user }).then(() => mail.drain(env, 5)).catch(e => console.error("comment mail", e)));
  return json({ id: r.id, parent, at: now, body, deleted: false, mine: true, user: { login: user.login, name: user.name, avatar: user.avatar } }, 201);
}

// Code checks. The scanner (scripts/vet.mjs in GitHub Actions) asks which repositories to read,
// reads them with vetcode and posts a summary. Only it holds VET_TOKEN.
const VERDICTS = ["clear", "review", "warning"], SEVERITIES = ["critical", "high", "medium"];
const scanner = (req, env) => !!env.VET_TOKEN && req.headers.get("Authorization") === `Bearer ${env.VET_TOKEN}`;
const clip = (v, n) => String(v ?? "").slice(0, n);

async function vetQueue(env) {
  const { results } = await env.DB.prepare(`SELECT p.slug, p.repo, v.commit_sha AS "commit", v.scanned_at FROM projects p LEFT JOIN vets v ON v.slug = p.slug
    WHERE p.hidden = 0 AND p.repo LIKE 'https://github.com/%' ORDER BY COALESCE(v.scanned_at, 0)`).all();
  return json({ projects: results }, 200, { "Cache-Control": "no-store" });
}

// Checks the scanner's summary and clips every field; null when it is malformed.
function readSummary(b) {
  if (!/^[0-9a-f]{40}$/.test(b.commit || "") || !VERDICTS.includes(b.verdict)) return null;
  const label = (Array.isArray(b.label) ? b.label : []).slice(0, 12).map(x => ({ cap: clip(x.cap, 60), files: +x.files || 0 })).filter(x => x.cap);
  const notes = (Array.isArray(b.notes) ? b.notes : []).slice(0, 8).filter(x => SEVERITIES.includes(x.severity))
    .map(x => ({ severity: x.severity, rule: clip(x.rule, 60), title: clip(x.title, 120), file: clip(x.file, 200), line: +x.line || 0 }));
  const sk = b.skipped || {}, skipped = { patterns: (Array.isArray(sk.patterns) ? sk.patterns : []).slice(0, 20).map(x => clip(x, 100)), lines: +sk.lines || 0 };
  return { commit: b.commit, verdict: b.verdict, version: clip(b.version, 20), files: +b.files || 0, label, notes, skipped };
}

// Abilities the code did not have at the previously checked commit: how a hijacked update shows up.
function newAbilities(old, sum, now) {
  let changed = old?.changed ? JSON.parse(old.changed) : [], changedAt = old?.changed_at ?? null, changedFrom = old?.changed_from ?? null;
  if (old?.commit_sha && old.commit_sha !== sum.commit) {
    const before = new Set(JSON.parse(old.label).map(x => x.cap)), added = sum.label.map(x => x.cap).filter(c => !before.has(c));
    if (added.length) { changed = added; changedAt = now; changedFrom = old.commit_sha; }
  }
  return { changed, changedAt, changedFrom };
}

async function vetSave(req, env, slug, ctx) {
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  if (!(await env.DB.prepare("SELECT 1 FROM projects WHERE slug = ?1").bind(slug).first())) return fail("No such project.", 404);
  const sum = readSummary(b);
  if (!sum) return fail("Bad summary.");
  const { label, notes, skipped } = sum;
  const now = Date.now(), old = await env.DB.prepare("SELECT commit_sha, verdict, label, changed, changed_at, changed_from FROM vets WHERE slug = ?1").bind(slug).first();
  const { changed, changedAt, changedFrom } = newAbilities(old, sum, now);
  await env.DB.prepare(`INSERT INTO vets (slug, commit_sha, version, scanned_at, verdict, files, label, notes, changed, changed_at, changed_from, skipped)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      ON CONFLICT (slug) DO UPDATE SET commit_sha = excluded.commit_sha, version = excluded.version, scanned_at = excluded.scanned_at, verdict = excluded.verdict,
        files = excluded.files, label = excluded.label, notes = excluded.notes, changed = excluded.changed, changed_at = excluded.changed_at, changed_from = excluded.changed_from, skipped = excluded.skipped`)
    .bind(slug, sum.commit, sum.version, now, sum.verdict, sum.files, JSON.stringify(label), JSON.stringify(notes), JSON.stringify(changed), changedAt, changedFrom, JSON.stringify(skipped)).run();
  // abilities that appeared in this very scan, or a verdict that got worse: tell the makers
  if (old) ctx.waitUntil(mail.check(env, { slug, commit: sum.commit, verdict: sum.verdict, oldVerdict: old.verdict, abilities: changedAt === now ? changed : [] })
    .then(() => mail.drain(env, 5)).catch(e => console.error("check mail", e)));
  return json({ slug, verdict: sum.verdict, changed });
}


// IndexNow: new project pages and new check results are announced to the search engines that
// take part (Bing, Yandex, Seznam, Naver…) instead of waiting for the next crawl. Google reads the sitemap.
async function announce(env, paths) {
  if (!env.INDEXNOW_KEY || !paths.length) return;
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "openyard.cloud", key: env.INDEXNOW_KEY, keyLocation: `https://openyard.cloud/${env.INDEXNOW_KEY}.txt`, urlList: paths.map(p => `https://openyard.cloud${p}`) }),
  });
  if (!r.ok && r.status !== 202) console.error("indexnow", r.status, await r.text());
}

// Any public repository. A visitor asks on /check; the worker queues it and wakes the scanner
// workflow with a repository_dispatch (DISPATCH_TOKEN); the six-hourly run picks up anything left.
const repoRef = v => { const r = parseRepo(String(v || "").replace(/[#?].*$/, "")); return r && { ...r, key: `${r.owner}/${r.name}`.toLowerCase(), full: `${r.owner}/${r.name}` }; };

async function wakeScanner(env, repo) {
  if (!env.DISPATCH_TOKEN) return;
  const r = await fetch("https://api.github.com/repos/openyard-cloud/openyard/dispatches", {
    method: "POST", headers: { Authorization: `Bearer ${env.DISPATCH_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "openyard.cloud" },
    body: JSON.stringify({ event_type: "check", client_payload: { repo } }),
  });
  if (!r.ok) console.error("dispatch", r.status, await r.text());
}

async function checkRequest(req, env, ctx) {
  const now = Date.now(), ip = req.headers.get("CF-Connecting-IP") || "0";
  const origin = req.headers.get("Origin");
  if (origin !== new URL(req.url).origin && !CHECK_ORIGINS.includes(origin)) return fail("Bad origin.", 403);
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  const ref = repoRef(b.repo);
  if (!ref) return fail("Paste a link like https://github.com/owner/repo");
  const form = new FormData(); form.append("cf-turnstile-response", String(b.ts || ""));
  if (!(await checkHuman(env, form, ip))) return fail("Could not verify you are human. Reload and try again.", 403);
  const row = await env.DB.prepare("SELECT repo, status, requested_at, scanned_at FROM repo_checks WHERE repo_key = ?1").bind(ref.key).first();
  // A check that is under way, or finished in the last five minutes, is simply shown again.
  // Older results are read again: the repository may have new commits since.
  if (row && ((row.status === "queued" || row.status === "running") && now - row.requested_at < 20 * 60000 || row.status === "done" && now - (row.scanned_at || 0) < 5 * 60000))
    return json({ repo: row.repo, status: row.status });
  const ipHash = await sha256(ip + "|check|" + today(now));
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM check_hits WHERE ip_hash = ?1 AND created_at > ?2").bind(ipHash, now - DAY).first();
  if (n >= CHECKS_PER_DAY) return fail("That is a lot of checks from this connection today. Try again tomorrow.", 429);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO repo_checks (repo_key, repo, status, requested_at) VALUES (?1, ?2, 'queued', ?3)
      ON CONFLICT (repo_key) DO UPDATE SET status = 'queued', requested_at = excluded.requested_at, error = NULL`).bind(ref.key, ref.full, now),
    env.DB.prepare("INSERT INTO check_hits (ip_hash, created_at) VALUES (?1, ?2)").bind(ipHash, now),
  ]);
  ctx.waitUntil(wakeScanner(env, ref.full).catch(e => console.error(e)));
  return json({ repo: row?.repo || ref.full, status: "queued" }, 202);
}

async function checkApi(req, env, ctx, url, path) {
  if (path === "/api/check" && req.method === "POST") return checkRequest(req, env, ctx);
  if (req.method !== "GET") return null;
  const ref = repoRef(`https://github.com/${url.searchParams.get("repo") || ""}`);
  if (path === "/api/check/status") {
    const row = ref && await env.DB.prepare("SELECT status, error FROM repo_checks WHERE repo_key = ?1").bind(ref.key).first();
    return json(row || { status: "none" }, 200, { "Cache-Control": "no-store" });
  }
  const row = ref && await env.DB.prepare("SELECT * FROM repo_checks WHERE repo_key = ?1").bind(ref.key).first();
  if (!row) return json({ status: "none" }, 404, { "Cache-Control": "no-store" });
  if (row.status !== "done" || !row.verdict) return json({ repo: row.repo, status: row.status, error: row.error || null }, 200, { "Cache-Control": "no-store" });
  return json(checkReport(row), 200, { "Cache-Control": "no-store" });
}

async function checkResult(req, env, ctx) {
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  const ref = repoRef(`https://github.com/${b.repo || ""}`);
  if (!ref) return fail("Bad repository.");
  const old = await env.DB.prepare("SELECT * FROM repo_checks WHERE repo_key = ?1").bind(ref.key).first();
  if (!old) return fail("Nobody asked for this repository.", 404);
  const now = Date.now();
  if (b.running) { await env.DB.prepare("UPDATE repo_checks SET status = 'running' WHERE repo_key = ?1").bind(ref.key).run(); return json({ ok: true }); }
  if (b.error) { await env.DB.prepare("UPDATE repo_checks SET status = 'failed', error = ?2 WHERE repo_key = ?1").bind(ref.key, clip(b.error, 200)).run(); return json({ ok: true }); }
  const sum = readSummary(b);
  if (!sum) return fail("Bad summary.");
  const { changed, changedAt, changedFrom } = newAbilities(old, sum, now);
  await env.DB.prepare(`UPDATE repo_checks SET status = 'done', error = NULL, repo = ?2, commit_sha = ?3, version = ?4, scanned_at = ?5, verdict = ?6, files = ?7,
      label = ?8, notes = ?9, skipped = ?10, changed = ?11, changed_at = ?12, changed_from = ?13 WHERE repo_key = ?1`)
    .bind(ref.key, clip(b.name || old.repo, 140), sum.commit, sum.version, now, sum.verdict, sum.files, JSON.stringify(sum.label), JSON.stringify(sum.notes),
      JSON.stringify(sum.skipped), JSON.stringify(changed), changedAt, changedFrom).run();
  // First result for this repository: its page now has something worth indexing.
  if (!old.scanned_at) ctx.waitUntil(announce(env, [`/check/${clip(b.name || old.repo, 140)}`]).catch(e => console.error(e)));
  return json({ repo: old.repo, verdict: sum.verdict });
}

const recentChecks = env => env.DB.prepare("SELECT repo, verdict, scanned_at FROM repo_checks WHERE status = 'done' ORDER BY scanned_at DESC LIMIT 13").all().then(r => r.results);

// What the yard is talking about: the latest comments and this week's likes and comments.
async function pulse(env, now) {
  const { results: rows } = await env.DB.prepare(`SELECT c.id, c.slug, c.body, c.created_at, u.login, u.avatar, p.name, t.id AS tid, t.title FROM comments c
    JOIN users u ON u.id = c.user_id LEFT JOIN projects p ON p.slug = c.slug AND p.hidden = 0 LEFT JOIN topics t ON c.slug = 't-' || t.id AND t.deleted = 0
    WHERE c.deleted = 0 AND u.banned = 0 AND u.deleted_at IS NULL AND (p.slug IS NOT NULL OR t.id IS NOT NULL) ORDER BY c.created_at DESC LIMIT 6`).all();
  const recent = rows.map(r => ({ ...r, name: r.name || r.title, href: r.tid ? `${topicPath({ id: r.tid, title: r.title })}#comments` : `/p/${r.slug}#comments` }));
  const week = now - 7 * DAY;
  const { likes } = await env.DB.prepare("SELECT COUNT(*) AS likes FROM likes WHERE created_at > ?1").bind(week).first();
  const { talk } = await env.DB.prepare("SELECT COUNT(*) AS talk FROM comments WHERE created_at > ?1 AND deleted = 0").bind(week).first();
  // the members: everyone with an account, the most recently seen first (their profiles are public)
  const { results: people } = await env.DB.prepare("SELECT login, avatar, provider FROM users WHERE deleted_at IS NULL AND banned = 0 ORDER BY seen_at DESC LIMIT 12").all();
  const { members } = await env.DB.prepare("SELECT COUNT(*) AS members FROM users WHERE deleted_at IS NULL AND banned = 0").first();
  return { recent, likes, talk, people, members };
}

async function page(env, slug) {
  const row = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?1 AND hidden = 0").bind(slug).first();
  if (!row) return null;
  const now = Date.now(), all = await listProjects(env, now);
  const stats = await env.DB.prepare("SELECT * FROM stats WHERE slug = ?1").bind(slug).first();
  const vet = await env.DB.prepare("SELECT * FROM vets WHERE slug = ?1").bind(slug).first();
  const here = all.find(p => p.slug === slug);
  return projectPage({ ...toApi(row, now), likes: here?.likes || 0, comments: here?.comments || 0, owner: here?.owner }, all, SITE, stats, now, vet);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), path = url.pathname, now = Date.now();
    try {
      if ((path === "/api/projects" || path === "/projects.json") && req.method === "GET") {
        return json({ site: { ...SITE, turnstile: env.TURNSTILE_SITE_KEY || null }, projects: await listProjects(env, now) }, 200, { "Cache-Control": "public, max-age=60" });
      }
      if (path === "/api/github" && req.method === "GET") {
        const ref = parseRepo(url.searchParams.get("repo"));
        if (!ref) return fail("Paste a link like https://github.com/owner/repo");
        try { const info = await repoInfo(env, ref); return info ? json(info, 200, { "Cache-Control": "public, max-age=300" }) : fail("Repository not found or private.", 404); }
        catch (e) { if (e instanceof RateLimited) return fail("GitHub is busy, fill the form by hand.", 503); throw e; }
      }
      if (path === "/api/submit" && req.method === "POST") return submit(req, env, ctx);
      if (path.startsWith("/auth/email")) { const r = await emailSignin(req, env, url); if (r) return r; }
      if (path.startsWith("/auth/")) { const r = await handleAuth(req, env, url); if (r) return r; }
      const av = /^\/a\/([a-z0-9]{1,12})\/([^/]{1,12})\.svg$/.exec(path);
      if (av) return new Response(avatarSvg(av[1], (() => { try { return decodeURIComponent(av[2]); } catch { return "?"; } })()), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
      if (path === "/signin" && await currentUser(req, env)) return Response.redirect(url.origin + safeReturn(url.searchParams.get("return") || "/"), 302); // already in
      if (path === "/signin") return new Response(signinPage({ site: SITE, back: url.searchParams.get("return") || "/", expired: url.searchParams.has("expired"), turnstile: env.TURNSTILE_SITE_KEY }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
      if (path === "/api/me" || path === "/api/me/delete") return me(req, env, path, ctx);
      if (path === "/api/comments" && (req.method === "GET" || req.method === "POST")) return comments(req, env, url, undefined, ctx);
      if (path === "/api/likes" && (req.method === "GET" || req.method === "POST")) return likes(req, env, url);
      if (path === "/api/site" && req.method === "GET") return siteLookup(req, env, url);
      const cl = /^\/(api\/)?claim\/([a-z0-9-]+)$/.exec(path);
      if (cl && cl[1] && req.method === "POST") return claim(req, env, url, cl[2]);
      if (cl && !cl[1] && req.method === "GET") {
        const user = await currentUser(req, env);
        if (!user) return Response.redirect(`${url.origin}/signin?return=${encodeURIComponent(path)}`, 302);
        const p = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?1 AND hidden = 0").bind(cl[2]).first();
        if (!p) return Response.redirect(`${url.origin}/projects`, 302);
        const mine = p.owner_id === user.id, taken = !!(p.team || (p.owner_id && !mine));
        const token = mine || taken ? null : await claimToken(env, p.slug, user);
        return new Response(claimPage({ p: toApi(p, Date.now()), user, token, github: !mine && !taken && ghClaim(user, p), mine, taken, site: SITE }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
      }
      let dm; // discussions
      if (path === "/api/topics" && req.method === "POST") return topics(req, env, url);
      if ((dm = /^\/api\/topics\/(\d+)$/.exec(path)) && req.method === "DELETE") return topics(req, env, url, +dm[1]);
      if (path === "/discuss/new") return new Response(newTopicPage({ site: SITE, cat: url.searchParams.get("cat") || "help" }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
      if ((dm = /^\/discuss(?:\/([a-z]+))?\/?$/.exec(path)) && (!dm[1] || DCAT[dm[1]])) {
        const all = await listProjects(env, now);
        return new Response(discussPage({ items: await discussItems(env, dm[1] || null, all), cat: dm[1] || null, counts: await discussCounts(env, all), site: SITE, now }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=30" } });
      }
      if ((dm = /^\/discuss\/t\/(\d+)(?:-[a-z0-9-]*)?\/?$/.exec(path))) {
        const tp = await env.DB.prepare("SELECT * FROM topics WHERE id = ?1 AND deleted = 0").bind(+dm[1]).first();
        if (!tp) return Response.redirect(`${url.origin}/discuss`, 302);
        if (path !== topicPath(tp)) return Response.redirect(`${url.origin}${topicPath(tp)}`, 301);
        const author = await env.DB.prepare("SELECT login, name, avatar FROM users WHERE id = ?1").bind(tp.user_id).first() || { login: "someone" };
        const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM comments WHERE slug = ?1 AND deleted = 0").bind(`t-${tp.id}`).first();
        const user = await currentUser(req, env);
        return new Response(topicPage({ tp, author, replies: n, site: SITE, now, canDelete: !!user && (user.id === tp.user_id || isAdmin(env, user)) }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-cache" } });
      }
      let m = /^\/api\/comments\/(\d+)$/.exec(path);
      if (m && req.method === "DELETE") return comments(req, env, url, Number(m[1]), ctx);
      m = /^\/api\/edit\/([a-z0-9-]+)$/.exec(path);
      if (m && (req.method === "GET" || req.method === "POST")) return edit(req, env, ctx, m[1]);
      if ((m = /^\/u\/([A-Za-z0-9_-]+)$/.exec(path))) {
        const u = await env.DB.prepare("SELECT type, data FROM uploads WHERE id = ?1").bind(m[1]).first();
        if (!u) return new Response("Not found", { status: 404 });
        // sandbox: an SVG logo opened on its own cannot run anything
        return new Response(new Uint8Array(u.data), { headers: { "Content-Type": u.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
      }
      if ((m = /^\/go\/([a-z0-9-]+)$/.exec(path))) {
        const p = await env.DB.prepare("SELECT url FROM projects WHERE slug = ?1 AND hidden = 0").bind(m[1]).first();
        if (!p) return Response.redirect(url.origin + "/#projects", 302);
        ctx.waitUntil(env.DB.prepare("INSERT INTO clicks (slug, day, n) VALUES (?1, ?2, 1) ON CONFLICT (slug, day) DO UPDATE SET n = n + 1").bind(m[1], today(now)).run());
        return Response.redirect(p.url, 302);
      }
      if ((m = /^\/p\/([a-z0-9-]+?)(?:\.html)?\/?$/.exec(path))) {
        const html = await page(env, m[1]);
        if (!html) return Response.redirect(url.origin + "/#projects", 302);
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=120" } });
      }
      if (path === "/api/vet/queue" && req.method === "GET") return scanner(req, env) ? vetQueue(env) : fail("Not allowed.", 403);
      if ((m = /^\/api\/vet\/([a-z0-9-]+)$/.exec(path)) && req.method === "POST") return scanner(req, env) ? vetSave(req, env, m[1], ctx) : fail("Not allowed.", 403);
      if ((m = /^\/badge\/([a-z0-9-]+)\.svg$/.exec(path))) {
        const v = await env.DB.prepare("SELECT v.verdict FROM vets v JOIN projects p ON p.slug = v.slug WHERE v.slug = ?1 AND p.hidden = 0").bind(m[1]).first();
        return new Response(badge(v?.verdict), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600", "Content-Security-Policy": "default-src 'none'" } });
      }
      if (PUBLIC_CHECK.has(path)) {
        const cors = corsFor(req);
        if (req.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors ? { ...cors, "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } : {} });
        const res = await checkApi(req, env, ctx, url, path);
        if (res && cors) for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
        if (res) return res;
      }
      if (path === "/api/check/queue" && req.method === "GET") {
        if (!scanner(req, env)) return fail("Not allowed.", 403);
        const { results } = await env.DB.prepare(`SELECT repo FROM repo_checks WHERE (status = 'queued' AND requested_at < ?1) OR (status = 'running' AND requested_at < ?2) ORDER BY requested_at LIMIT 50`)
          .bind(now - 2 * 60000, now - 30 * 60000).all();
        return json({ repos: results.map(r => r.repo) }, 200, { "Cache-Control": "no-store" });
      }
      if (path === "/api/check/result" && req.method === "POST") return scanner(req, env) ? checkResult(req, env, ctx) : fail("Not allowed.", 403);
      if (path === "/check" || path === "/check/") {
        const ref = repoRef(url.searchParams.get("repo"));
        if (ref) return Response.redirect(`${url.origin}/check/${ref.full}`, 302);
        return new Response(checkPage({ recent: await recentChecks(env), site: SITE, turnstile: env.TURNSTILE_SITE_KEY, now }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
      }
      // Plain-text twins for AI assistants (see llmsTxt in pages.js); kept out of search results.
      const MD = { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=600", "X-Robots-Tag": "noindex" };
      if ((m = /^\/check\/([\w.-]+)\/([\w.-]+?)\.md$/.exec(path))) {
        const row = await env.DB.prepare("SELECT * FROM repo_checks WHERE repo_key = ?1 AND status = 'done'").bind(`${m[1]}/${m[2]}`.toLowerCase()).first();
        return row ? new Response(checkMarkdown(row), { headers: MD }) : new Response("Not checked yet. Ask for a check at https://openyard.cloud/check\n", { status: 404, headers: MD });
      }
      if ((m = /^\/p\/([a-z0-9-]+)\.md$/.exec(path))) {
        const row = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?1 AND hidden = 0").bind(m[1]).first();
        if (!row) return new Response("No such project.\n", { status: 404, headers: MD });
        const stats = await env.DB.prepare("SELECT stars FROM stats WHERE slug = ?1").bind(m[1]).first();
        const vet = await env.DB.prepare("SELECT * FROM vets WHERE slug = ?1").bind(m[1]).first();
        return new Response(projectMarkdown(toApi(row, now), stats, vet), { headers: MD });
      }
      const HTML = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" };
      const PRIVATE = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" };
      if (path === "/welcome" || path === "/settings") {
        const user = await currentUser(req, env);
        if (!user) return Response.redirect(`${url.origin}/signin?return=${encodeURIComponent(path + url.search)}`, 302);
        if (path === "/welcome") return new Response(welcomePage({ user, site: SITE, back: url.searchParams.get("return") || "/" }), { headers: PRIVATE });
        const { results } = await env.DB.prepare("SELECT * FROM projects WHERE hidden = 0 ORDER BY created_at DESC").all();
        return new Response(settingsPage({ user, site: SITE, mine: results.filter(r => owns(user, r)).map(r => toApi(r, now)) }), { headers: PRIVATE });
      }
      if (path === "/unsubscribe" && (req.method === "GET" || req.method === "POST")) return mail.unsubscribe(req, env, url, SITE);
      if (path === "/privacy") return new Response(privacyPage({ site: SITE }), { headers: HTML });
      if ((m = /^\/@([A-Za-z0-9-]{1,39})\/?$/.exec(path))) {
        const person = await env.DB.prepare("SELECT id, login, name, avatar, bio, created_at, provider FROM users WHERE login = ?1 COLLATE NOCASE AND deleted_at IS NULL AND banned = 0").bind(m[1]).first();
        const all = await listProjects(env, now);
        const owned = person ? new Set((await env.DB.prepare("SELECT slug FROM projects WHERE owner_id = ?1").bind(person.id).all()).results.map(r => r.slug)) : new Set();
        // maintainers are GitHub usernames: they belong to this page unless it is an email account's nickname
        const made = all.filter(p => owned.has(p.slug) || (person?.provider !== "email" && p.maintainers.some(x => x.toLowerCase() === m[1].toLowerCase())));
        if (!person && !made.length) return new Response(listPage({ all, site: SITE, slug: "projects" }).replace("<head>", '<head>\n<meta name="robots" content="noindex">'), { status: 404, headers: HTML });
        const talk = person ? (await env.DB.prepare(`SELECT c.slug, c.body, c.created_at, p.name FROM comments c JOIN projects p ON p.slug = c.slug
          WHERE c.user_id = ?1 AND c.deleted = 0 AND p.hidden = 0 ORDER BY c.created_at DESC LIMIT 8`).bind(person.id).all()).results : [];
        return new Response(profilePage({ login: person ? person.login : made[0].maintainers.find(x => x.toLowerCase() === m[1].toLowerCase()), person, made, talk, site: SITE, now }), { headers: HTML });
      }
      if ((m = /^\/([a-z-]+)\/?$/.exec(path)) && (CAT[m[1]] || m[1] === "about" || m[1] === "community")) {
        const all = await listProjects(env, now), args = { all, site: SITE, slug: m[1], pulse: CAT[m[1]] ? await pulse(env, now) : null };
        return new Response(m[1] === "about" ? aboutPage(args) : m[1] === "community" ? communityPage(args) : listPage(args), { headers: HTML });
      }
      if ((m = /^\/tags\/([a-z0-9-]+)\/?$/.exec(path))) {
        const html = tagPage({ all: await listProjects(env, now), site: SITE, tag: m[1], pulse: await pulse(env, now) });
        if (html) return new Response(html, { headers: HTML });
        return new Response(listPage({ all: await listProjects(env, now), site: SITE, slug: "projects" }).replace("<head>", '<head>\n<meta name="robots" content="noindex">'), { status: 404, headers: HTML });
      }
      if (path === "/llms.txt") {
        const checks = (await env.DB.prepare("SELECT repo, verdict FROM repo_checks WHERE status = 'done' ORDER BY scanned_at DESC LIMIT 50").all()).results;
        return new Response(llmsTxt(await listProjects(env, now), checks), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=600" } });
      }
      if ((m = /^\/check\/([\w.-]+)\/([\w.-]+?)\/?$/.exec(path))) {
        const ref = repoRef(`https://github.com/${m[1]}/${m[2]}`);
        const row = ref && await env.DB.prepare("SELECT * FROM repo_checks WHERE repo_key = ?1").bind(ref.key).first();
        const shown = row ? { owner: row.repo.split("/")[0], name: row.repo.split("/")[1] } : ref;
        return new Response(checkPage({ ref: shown, row, recent: await recentChecks(env), site: SITE, turnstile: env.TURNSTILE_SITE_KEY, now }),
          { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
      }
      if ((m = /^\/badge\/gh\/([\w.-]+)\/([\w.-]+?)\.svg$/.exec(path))) {
        const v = await env.DB.prepare("SELECT verdict FROM repo_checks WHERE repo_key = ?1 AND status = 'done'").bind(`${m[1]}/${m[2]}`.toLowerCase()).first();
        return new Response(badge(v?.verdict), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600", "Content-Security-Policy": "default-src 'none'" } });
      }
      if (env.INDEXNOW_KEY && path === `/${env.INDEXNOW_KEY}.txt`) return new Response(env.INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      if (path === "/sitemap.xml") {
        const all = await listProjects(env, now), checks = (await env.DB.prepare("SELECT repo, scanned_at FROM repo_checks WHERE status = 'done' ORDER BY scanned_at DESC LIMIT 2000").all()).results;
        const tps = (await env.DB.prepare("SELECT id, title FROM topics WHERE deleted = 0 ORDER BY last_at DESC LIMIT 1000").all()).results;
        return new Response(sitemap(all, today(now), checks, [...HUB_PATHS, "/privacy", "/discuss", ...DCATS.map(c => `/discuss/${c.slug}`), ...tps.map(topicPath), ...tagPages(all).map(x => `/tags/${x}`), ...[...new Set(all.flatMap(p => p.maintainers))].map(x => `/@${x}`)]), { headers: { "Content-Type": "application/xml" } });
      }
    } catch (e) {
      console.error(e);
      return fail("Something went wrong on our side.", 500);
    }
    return env.ASSETS.fetch(req);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshStats(env));
    ctx.waitUntil(fillPictures(env, event.scheduledTime).catch(e => console.error("pictures", e)));
    // Mondays at 01:17 UTC (08:17 in Vietnam) queue the weekly note; every hour send what is waiting.
    const at = new Date(event.scheduledTime);
    ctx.waitUntil((async () => {
      if (at.getUTCDay() === 1 && at.getUTCHours() === 1) await mail.digest(env, await listProjects(env, event.scheduledTime), event.scheduledTime);
      if (at.getUTCHours() === 1) await mail.daily(env, event.scheduledTime); // likes of the day, day-3 and day-7 notes
      await mail.drain(env, 40);
    })().catch(e => console.error("mail cron", e)));
  },
};
