// openyard.cloud: static assets from public/, plus the project database (D1).
//   GET  /api/projects        every visible project with its GitHub stats and trending score
//   GET  /api/github?repo=     what the submit form fills in from a GitHub link
//   POST /api/submit           add a project (no account; Turnstile and a per-IP limit)
//   GET/POST /api/edit/<slug>  change or remove a project with the edit token from submitting
//   GET  /p/<slug>             project page      GET /go/<slug>  counted redirect to the project
//   GET  /u/<id>               uploaded logo or screenshot     GET /sitemap.xml
//   GET/POST /api/comments, DELETE /api/comments/<id>   comments on project pages (GitHub sign-in, see auth.js)
//   GET  /api/vet/queue, POST /api/vet/<slug>   code checks, for the scanner workflow (VET_TOKEN)
//   GET  /badge/<slug>.svg     README badge with the latest code check
//   GET  /check, /check/<owner>/<repo>   check any public GitHub repository (POST /api/check, GET /api/check/status)
//   GET  /api/check/queue, POST /api/check/result   the same, for the scanner workflow (VET_TOKEN)
//   GET  /badge/gh/<owner>/<repo>.svg              badge for any checked repository
// The cron trigger refreshes GitHub stats a few repositories at a time.
import SITE from "../site.config.json";
import { projectPage, sitemap, badge, checkPage, checkMarkdown, projectMarkdown, llmsTxt } from "./pages.js";
import { parseRepo, repoInfo, repoActivity, RateLimited } from "./github.js";
import { handleAuth, currentUser, isAdmin } from "./auth.js";

const DAY = 86400000;
const TYPES = ["app", "open-source"], STATUSES = ["live", "beta", "soon"], KINDS = ["people", "wild", "dev"];
const IMAGE_TYPES = { "image/png": [0x89, 0x50], "image/jpeg": [0xff, 0xd8], "image/webp": [0x52, 0x49] };
const MAX_LOGO = 200 * 1024, MAX_IMAGE = 700 * 1024, SUBMITS_PER_DAY = 5, CHECKS_PER_DAY = 20;

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...extra } });
const fail = (error, status = 400) => json({ error }, status);
const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const isHttps = v => { try { return new URL(v).protocol === "https:"; } catch { return false; } };
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const token = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" })[c]);
const slugify = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";

// Trending: GitHub activity this week plus clicks from the site, with a fading boost for new listings.
function trend(p, s, clicks, talk, now) {
  const age = (now - Date.parse(p.added)) / DAY;
  const gh = s ? s.stars_7d * 3 + s.prs_7d * 2 + s.issues_7d + s.discussions_7d * 2 + Math.min(s.commits_7d, 30) * 0.3 : 0;
  return Math.round((gh + clicks * 0.5 + talk * 2 + (age < 14 ? 6 * (1 - age / 14) : 0)) * 10) / 10;
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
  return { ...p, ...(s ? { stats: s } : {}), ...(v ? { vet: v } : {}), comments: row.comments || 0, trend: trend(p, s, row.clicks || 0, row.talk || 0, now) };
}

const rank = p => [p.featured ? 0 : 1, p.type === "app" ? 0 : 1, p.status === "soon" ? 1 : 0];
async function listProjects(env, now = Date.now()) {
  const since = today(now - 7 * DAY);
  const { results } = await env.DB.prepare(`SELECT p.*, s.stars, s.forks, s.stars_7d, s.prs_7d, s.issues_7d, s.commits_7d, s.discussions_7d, s.pushed_at, s.updated_at AS st_updated, v.verdict AS v_verdict, v.scanned_at AS v_scanned,
      (SELECT SUM(n) FROM clicks c WHERE c.slug = p.slug AND c.day >= ?1) AS clicks,
      (SELECT COUNT(*) FROM comments m WHERE m.slug = p.slug AND m.deleted = 0) AS comments,
      (SELECT COUNT(DISTINCT m.user_id) FROM comments m WHERE m.slug = p.slug AND m.deleted = 0 AND m.created_at > ?2) AS talk
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
    name, url, repo: repo || null, license, kinds, status, color, tags, lang, ref,
    type: ref && license ? "open-source" : "app",
    tagline: { [lang]: tagline }, description: { [lang]: description },
    maintainers: owner ? [owner] : [],
    logoFile: await readImage(form.get("logo"), MAX_LOGO), imageFile: await readImage(form.get("image"), MAX_IMAGE),
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
  let form; try { form = await req.formData(); } catch { return fail("Send the form as multipart/form-data."); }
  if (!(await checkHuman(env, form, ip))) return fail("Could not verify you are human. Reload and try again.", 403);
  const ipHash = await sha256(ip + "|openyard|" + today(now));
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submits WHERE ip_hash = ?1 AND created_at > ?2").bind(ipHash, now - DAY).first();
  if (n >= SUBMITS_PER_DAY) return fail("Too many projects from this connection today. Try again tomorrow.", 429);
  let f; try { f = await readForm(env, form); } catch (e) { return fail(e.message); }

  let slug = slugify(f.name);
  for (let i = 2; await env.DB.prepare("SELECT 1 FROM projects WHERE slug = ?1").bind(slug).first(); i++) slug = `${slugify(f.name).slice(0, 36)}-${i}`;
  const logo = f.logoFile ? await storeUpload(env, f.logoFile, now) : f.ref ? `https://github.com/${f.ref.owner}.png?size=200` : null;
  const image = f.imageFile ? await storeUpload(env, f.imageFile, now) : null;
  const edit = token();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO projects (slug, name, type, kinds, status, tagline, description, url, repo, license, logo, logo_style, image, color, maintainers, tags, added, edit_hash, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?19)`)
      .bind(slug, f.name, f.type, JSON.stringify(f.kinds), f.status, JSON.stringify(f.tagline), JSON.stringify(f.description), f.url, f.repo, f.license,
        logo, f.logoFile ? "tile" : null, image, f.color, JSON.stringify(f.maintainers), JSON.stringify(f.tags), today(now), await sha256(edit), now),
    env.DB.prepare("INSERT INTO submits (ip_hash, created_at) VALUES (?1, ?2)").bind(ipHash, now),
  ]);
  if (f.ref) ctx.waitUntil(refreshOne(env, slug, f.ref, now).catch(() => {}));
  ctx.waitUntil(announce(env, [`/p/${slug}`]).catch(e => console.error(e)));
  return json({ slug, page: `/p/${slug}`, edit: `/submit?edit=${slug}#${edit}` }, 201);
}

async function authorize(env, slug, tok) {
  const row = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?1 AND hidden = 0").bind(slug).first();
  if (!row || !row.edit_hash || !tok || (await sha256(tok)) !== row.edit_hash) return null;
  return row;
}

async function edit(req, env, ctx, slug) {
  const now = Date.now();
  if (req.method === "GET") {
    const row = await authorize(env, slug, req.headers.get("X-Edit-Token"));
    return row ? json(toApi(row, now)) : fail("This edit link is not valid.", 403);
  }
  let form; try { form = await req.formData(); } catch { return fail("Send the form as multipart/form-data."); }
  const row = await authorize(env, slug, String(form.get("token") || ""));
  if (!row) return fail("This edit link is not valid.", 403);
  if (form.get("remove") === "yes") {
    await env.DB.prepare("UPDATE projects SET hidden = 1, updated_at = ?2 WHERE slug = ?1").bind(slug, now).run();
    return json({ removed: slug });
  }
  let f; try { f = await readForm(env, form); } catch (e) { return fail(e.message); }
  const logo = f.logoFile ? await storeUpload(env, f.logoFile, now) : row.logo || (f.ref ? `https://github.com/${f.ref.owner}.png?size=200` : null);
  const image = f.imageFile ? await storeUpload(env, f.imageFile, now) : row.image;
  // keep the other language if the person only edited one
  const merge = (old, nu) => ({ ...JSON.parse(old), ...nu });
  await env.DB.prepare(`UPDATE projects SET name = ?2, type = ?3, kinds = ?4, status = ?5, tagline = ?6, description = ?7, url = ?8, repo = ?9, license = ?10,
      logo = ?11, logo_style = ?12, image = ?13, color = ?14, maintainers = ?15, tags = ?16, updated_at = ?17 WHERE slug = ?1`)
    .bind(slug, f.name, f.type, JSON.stringify(f.kinds), f.status, JSON.stringify(merge(row.tagline, f.tagline)), JSON.stringify(merge(row.description, f.description)),
      f.url, f.repo, f.license, logo, f.logoFile ? "tile" : row.logo_style, image, f.color, JSON.stringify(f.maintainers.length ? f.maintainers : JSON.parse(row.maintainers)), JSON.stringify(f.tags), now).run();
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
async function comments(req, env, url, id) {
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
  if (!(await env.DB.prepare("SELECT 1 FROM projects WHERE slug = ?1 AND hidden = 0").bind(slug).first())) return fail("No such project.", 404);
  if (parent && !(await env.DB.prepare("SELECT 1 FROM comments WHERE id = ?1 AND slug = ?2 AND parent_id IS NULL AND deleted = 0").bind(parent, slug).first())) return fail("That comment is gone.");
  const recent = await env.DB.prepare("SELECT SUM(created_at > ?2) AS minute, COUNT(*) AS day FROM comments WHERE user_id = ?1 AND created_at > ?3").bind(user.id, now - 60000, now - DAY).first();
  if ((recent.minute || 0) >= 3 || (recent.day || 0) >= 60) return fail("Slow down a little, then try again.", 429);
  const r = await env.DB.prepare("INSERT INTO comments (slug, user_id, parent_id, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id").bind(slug, user.id, parent, body, now).first();
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

async function vetSave(req, env, slug) {
  let b; try { b = await req.json(); } catch { return fail("Send JSON."); }
  if (!(await env.DB.prepare("SELECT 1 FROM projects WHERE slug = ?1").bind(slug).first())) return fail("No such project.", 404);
  const sum = readSummary(b);
  if (!sum) return fail("Bad summary.");
  const { label, notes, skipped } = sum;
  const now = Date.now(), old = await env.DB.prepare("SELECT commit_sha, label, changed, changed_at, changed_from FROM vets WHERE slug = ?1").bind(slug).first();
  const { changed, changedAt, changedFrom } = newAbilities(old, sum, now);
  await env.DB.prepare(`INSERT INTO vets (slug, commit_sha, version, scanned_at, verdict, files, label, notes, changed, changed_at, changed_from, skipped)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      ON CONFLICT (slug) DO UPDATE SET commit_sha = excluded.commit_sha, version = excluded.version, scanned_at = excluded.scanned_at, verdict = excluded.verdict,
        files = excluded.files, label = excluded.label, notes = excluded.notes, changed = excluded.changed, changed_at = excluded.changed_at, changed_from = excluded.changed_from, skipped = excluded.skipped`)
    .bind(slug, sum.commit, sum.version, now, sum.verdict, sum.files, JSON.stringify(label), JSON.stringify(notes), JSON.stringify(changed), changedAt, changedFrom, JSON.stringify(skipped)).run();
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
  if (req.headers.get("Origin") !== new URL(req.url).origin) return fail("Bad origin.", 403);
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

async function page(env, slug) {
  const row = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?1 AND hidden = 0").bind(slug).first();
  if (!row) return null;
  const now = Date.now(), all = await listProjects(env, now);
  const stats = await env.DB.prepare("SELECT * FROM stats WHERE slug = ?1").bind(slug).first();
  const vet = await env.DB.prepare("SELECT * FROM vets WHERE slug = ?1").bind(slug).first();
  return projectPage(toApi(row, now), all, SITE, stats, now, vet);
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
      if (path.startsWith("/auth/")) { const r = await handleAuth(req, env, url); if (r) return r; }
      if (path === "/api/me") { const u = await currentUser(req, env); return json(u ? { login: u.login, avatar: u.avatar } : null, 200, { "Cache-Control": "private, no-store" }); }
      if (path === "/api/comments" && (req.method === "GET" || req.method === "POST")) return comments(req, env, url);
      let m = /^\/api\/comments\/(\d+)$/.exec(path);
      if (m && req.method === "DELETE") return comments(req, env, url, Number(m[1]));
      m = /^\/api\/edit\/([a-z0-9-]+)$/.exec(path);
      if (m && (req.method === "GET" || req.method === "POST")) return edit(req, env, ctx, m[1]);
      if ((m = /^\/u\/([A-Za-z0-9_-]+)$/.exec(path))) {
        const u = await env.DB.prepare("SELECT type, data FROM uploads WHERE id = ?1").bind(m[1]).first();
        if (!u) return new Response("Not found", { status: 404 });
        return new Response(new Uint8Array(u.data), { headers: { "Content-Type": u.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
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
      if ((m = /^\/api\/vet\/([a-z0-9-]+)$/.exec(path)) && req.method === "POST") return scanner(req, env) ? vetSave(req, env, m[1]) : fail("Not allowed.", 403);
      if ((m = /^\/badge\/([a-z0-9-]+)\.svg$/.exec(path))) {
        const v = await env.DB.prepare("SELECT v.verdict FROM vets v JOIN projects p ON p.slug = v.slug WHERE v.slug = ?1 AND p.hidden = 0").bind(m[1]).first();
        return new Response(badge(v?.verdict), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600", "Content-Security-Policy": "default-src 'none'" } });
      }
      if (path === "/api/check" && req.method === "POST") return checkRequest(req, env, ctx);
      if (path === "/api/check/status" && req.method === "GET") {
        const ref = repoRef(`https://github.com/${url.searchParams.get("repo") || ""}`);
        const row = ref && await env.DB.prepare("SELECT status, error FROM repo_checks WHERE repo_key = ?1").bind(ref.key).first();
        return json(row || { status: "none" }, 200, { "Cache-Control": "no-store" });
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
      if (path === "/sitemap.xml") return new Response(sitemap(await listProjects(env, now), today(now), (await env.DB.prepare("SELECT repo, scanned_at FROM repo_checks WHERE status = 'done' ORDER BY scanned_at DESC LIMIT 2000").all()).results), { headers: { "Content-Type": "application/xml" } });
    } catch (e) {
      console.error(e);
      return fail("Something went wrong on our side.", 500);
    }
    return env.ASSETS.fetch(req);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshStats(env));
  },
};
