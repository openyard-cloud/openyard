// Email through Resend (RESEND_API_KEY secret, EMAIL_FROM var). Only to people who turned email
// on, never to a deleted account, always with a one-click unsubscribe link and header.
//
// Messages go into the outbox table first and are sent by drain(): right after the event that
// made them, and every hour from the cron for anything left over. drain() keeps under
// EMAIL_DAILY_LIMIT messages in any 24 hours (Resend's free plan stops at 100 a day), skips
// messages older than three days, and rechecks consent just before sending.
//
//   welcome   once, when someone first turns email on
//   reply     someone answered your comment
//   comment   someone commented on a project you made
//   check     the code check of your project found new abilities or a worse verdict
//   digest    Monday morning (Vietnam time): projects added in the last week
//   live      right after a submit: the page, the private edit link, what to add
//   day3/day7 tips and numbers in a listing's first week
//   likes     once a day, who liked your project
// Makers are told through their account (if they turned email on) and through the address on the
// submit form (projects.contact_email), once per address.
// GET/POST /unsubscribe?t=<token>   turns email off; POST is the one-click (RFC 8058) form.
import { ORIGIN, esc, en, vi, VERDICT } from "./pages.js";
import { page } from "./hub.js";

const DAY = 86400000;
// how vetcode's ability labels read in an email: "the code started to …"
const ABILITY = {
  "reads environment or credential files": ["read secrets or environment variables", "đọc secret hoặc biến môi trường"],
  "uses the network": ["connect to the internet", "kết nối internet"],
  "runs other programs": ["start other programs", "chạy chương trình khác"],
  "collects user and host details": ["read user and machine details", "đọc thông tin người dùng và máy"],
  "writes into home or startup folders": ["write to home or startup folders", "ghi vào thư mục home hoặc khởi động"],
  "decodes or builds code at runtime": ["build or decode code while running", "tạo hoặc giải mã code khi chạy"],
};
const tok = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" })[c]);
const L = (u, e, v) => u.lang === "vi" ? v : e;
const clip = (s, n) => (s = String(s || "")).length > n ? s.slice(0, n - 1) + "…" : s;

// ---------- layout ----------
function layout(u, { pre, title, html, text, button, why }) {
  const unsub = `${ORIGIN}/unsubscribe?t=${u.unsub_token}`;
  const set = u.contact ? "" : L(u, `<a href="${ORIGIN}/settings" style="color:#6b6b73">Settings</a> · `, `<a href="${ORIGIN}/settings" style="color:#6b6b73">Cài đặt</a> · `);
  const foot = `${why} ${set}<a href="${unsub}" style="color:#6b6b73">${L(u, "Unsubscribe", "Huỷ nhận email")}</a>`;
  return {
    html: `<!doctype html><html lang="${u.lang === "vi" ? "vi" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f6f6f7;font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0d0d0f">
<span style="display:none;max-height:0;overflow:hidden">${esc(pre)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e7ea;border-radius:20px">
<tr><td style="padding:28px 32px 8px"><a href="${ORIGIN}" style="text-decoration:none;color:#0d0d0f;font-weight:600;font-size:17px"><img src="${ORIGIN}/og/mark.png" width="22" height="22" alt="" style="vertical-align:-5px;margin-right:8px;border:0">Open<span style="color:#8b5cf6">Yard</span></a></td></tr>
<tr><td style="padding:12px 32px 4px"><h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-.02em;font-weight:600">${esc(title)}</h1></td></tr>
<tr><td style="padding:8px 32px 0;font-size:15.5px;line-height:1.6;color:#33333a">${html}</td></tr>
${button ? `<tr><td style="padding:22px 32px 6px"><a href="${esc(button[0])}" style="display:inline-block;background:#0d0d0f;color:#ffffff;text-decoration:none;font-weight:500;font-size:15px;padding:12px 22px;border-radius:999px">${esc(button[1])}</a></td></tr>` : ""}
<tr><td style="padding:24px 32px 28px;font-size:12.5px;line-height:1.6;color:#8b8b95;border-top:1px solid #f0f0f2">${foot}</td></tr>
</table></td></tr></table></body></html>`,
    text: `${title}\n\n${text}${button ? `\n\n${button[1]}: ${button[0]}` : ""}\n\n--\n${u.contact ? "" : `${L(u, "Settings", "Cài đặt")}: ${ORIGIN}/settings\n`}${L(u, "Unsubscribe", "Huỷ nhận email")}: ${unsub}\n`,
  };
}
const quote = s => `<blockquote style="margin:14px 0 0;padding:12px 16px;border-left:3px solid #8b5cf6;background:#f6f6f7;border-radius:0 12px 12px 0;color:#0d0d0f;white-space:pre-wrap">${esc(clip(s, 600))}</blockquote>`;
const projRow = (u, p) => `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f2"><a href="${ORIGIN}/p/${esc(p.slug)}" style="color:#0d0d0f;text-decoration:none;font-weight:600">${esc(p.name)}</a><br><span style="color:#6b6b73;font-size:14px">${esc(u.lang === "vi" ? vi(p.tagline) : en(p.tagline))}</span></td></tr>`;
const projTable = (u, list) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${list.map(p => projRow(u, p)).join("")}</table>`;
const projText = (u, list) => list.map(p => `- ${p.name}: ${u.lang === "vi" ? vi(p.tagline) : en(p.tagline)}\n  ${ORIGIN}/p/${p.slug}`).join("\n");

// ---------- queue ----------
const ready = env => !!(env.RESEND_API_KEY && env.EMAIL_FROM);
/** People who may get email, by id, with an unsubscribe token made on first need. */
async function recipients(env, ids) {
  ids = [...new Set(ids.filter(Boolean))];
  if (!ids.length) return [];
  const { results } = await env.DB.prepare(`SELECT id, login, name, email, lang, unsub_token, interests FROM users
    WHERE id IN (${ids.map(() => "?").join(",")}) AND email_ok = 1 AND email IS NOT NULL AND deleted_at IS NULL AND banned = 0`).bind(...ids).all();
  for (const u of results) if (!u.unsub_token) { u.unsub_token = tok(); await env.DB.prepare("UPDATE users SET unsub_token = ?2 WHERE id = ?1").bind(u.id, u.unsub_token).run(); }
  return results;
}
/** The address given on the submit form, as a recipient, if it still wants email. */
async function contact(env, slug) {
  const p = await env.DB.prepare("SELECT slug, contact_email, contact_lang, contact_token FROM projects WHERE slug = ?1 AND contact_ok = 1 AND contact_email IS NOT NULL AND hidden = 0").bind(slug).first();
  if (!p) return null;
  if (!p.contact_token) { p.contact_token = tok(); await env.DB.prepare("UPDATE projects SET contact_token = ?2 WHERE slug = ?1").bind(slug, p.contact_token).run(); }
  return { id: 0, contact: slug, email: p.contact_email, lang: p.contact_lang, unsub_token: p.contact_token, name: null, interests: "[]" };
}
/** Everyone to tell about a project: its owner and makers with accounts that want email, and its
 * contact address; one entry per address. `skip` leaves out an account (the one who acted). */
async function makers(env, slug, skip = null) {
  const p = await env.DB.prepare("SELECT owner_id, maintainers FROM projects WHERE slug = ?1").bind(slug).first();
  if (!p) return [];
  const names = JSON.parse(p.maintainers || "[]").map(x => x.toLowerCase());
  const ids = names.length ? (await env.DB.prepare(`SELECT id FROM users WHERE lower(login) IN (${names.map(() => "?").join(",")}) AND deleted_at IS NULL AND provider = 'github'`).bind(...names).all()).results.map(r => r.id) : [];
  const people = (await recipients(env, [p.owner_id, ...ids])).filter(u => u.id !== skip?.id);
  const c = await contact(env, slug), seen = new Set(people.map(u => u.email.toLowerCase()));
  if (skip?.email) seen.add(skip.email.toLowerCase());
  return c && !seen.has(c.email.toLowerCase()) ? [...people, c] : people;
}
const who_ = u => u.contact ? `c:${u.contact}` : u.id; // the recipient part of a dedupe key
const makerWhy = (u, name) => u.contact ? L(u, `You get this because you listed ${name} on OpenYard.`, `Bạn nhận email này vì đã đưa ${name} lên OpenYard.`)
  : L(u, "You get this because you made this project and turned on email.", "Bạn nhận email này vì bạn làm dự án này và đã bật nhận email.");
async function enqueue(env, u, kind, dedupe, mail) {
  await env.DB.prepare(`INSERT INTO outbox (dedupe, user_id, kind, subject, html, text, created_at, contact_slug) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) ON CONFLICT (dedupe) DO NOTHING`)
    .bind(dedupe, u.id, kind, mail.subject, mail.html, mail.text, Date.now(), u.contact || null).run();
}

/** Sends waiting messages, at most `max` now and never more than the daily budget. */
export async function drain(env, max = 10) {
  if (!ready(env)) return 0;
  const now = Date.now(), budget = +env.EMAIL_DAILY_LIMIT || 90;
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM outbox WHERE sent_at > ?1").bind(now - DAY).first();
  const take = Math.min(max, budget - n);
  if (take <= 0) return 0;
  const { results } = await env.DB.prepare(`UPDATE outbox SET claimed_at = ?1, tries = tries + 1 WHERE id IN (
      SELECT id FROM outbox WHERE sent_at IS NULL AND tries < 5 AND created_at > ?2 AND (claimed_at IS NULL OR claimed_at < ?3) ORDER BY id LIMIT ?4)
    RETURNING id, dedupe, user_id, contact_slug, subject, html, text`).bind(now, now - 3 * DAY, now - 15 * 60000, take).all();
  let sent = 0;
  for (const m of results) {
    const u = m.contact_slug ? await contact(env, m.contact_slug) : (await recipients(env, [m.user_id]))[0]; // consent may have changed since it was queued
    if (!u) { await env.DB.prepare("UPDATE outbox SET tries = 99, error = 'no consent' WHERE id = ?1").bind(m.id).run(); continue; }
    const unsub = `${ORIGIN}/unsubscribe?t=${u.unsub_token}`;
    const r = await fetch(`${env.RESEND_URL || "https://api.resend.com"}/emails`, { // RESEND_URL: a stand-in for local tests
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": m.dedupe.slice(0, 256) },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [u.email], subject: m.subject, html: m.html, text: m.text,
        headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
    });
    if (r.ok) { await env.DB.prepare("UPDATE outbox SET sent_at = ?2, error = NULL WHERE id = ?1").bind(m.id, Date.now()).run(); sent++; continue; }
    const err = `${r.status} ${(await r.text()).slice(0, 300)}`;
    console.error("resend", err);
    await env.DB.prepare("UPDATE outbox SET claimed_at = NULL, error = ?2 WHERE id = ?1").bind(m.id, err).run();
    if (r.status === 429) break; // over the limit: the cron tries again later
  }
  return sent;
}

// ---------- the five kinds ----------
/** Once per account, when email is first turned on. `picks` are a few projects for their interests. */
export async function welcome(env, userId, picks) {
  if (!ready(env)) return;
  const [u] = await recipients(env, [userId]);
  if (!u) return;
  const name = u.name || u.login;
  const m = layout(u, {
    pre: L(u, "What is in the yard, and how to get going.", "OpenYard có gì, và bắt đầu từ đâu."),
    title: L(u, `Welcome to OpenYard, ${name}`, `Chào mừng tới OpenYard, ${name}`),
    html: L(u, `<p style="margin:0 0 12px">OpenYard is where people who make free software show what they built, get feedback and help each other. Three ways to start:</p>`, `<p style="margin:0 0 12px">OpenYard là nơi những người làm phần mềm miễn phí khoe thứ mình làm, nhận góp ý và giúp nhau. Ba cách để bắt đầu:</p>`)
      + `<ol style="margin:0;padding-left:20px">${[
        L(u, `<b>Try something.</b> Use a project for real and leave a comment. Makers rarely hear from users.`, `<b>Dùng thử.</b> Dùng thật một dự án rồi để lại bình luận. Người làm hiếm khi được nghe người dùng nói.`),
        L(u, `<b>Share yours.</b> <a href="${ORIGIN}/submit" style="color:#8b5cf6">Submit a project</a>: five minutes, and it shows up in Showcase.`, `<b>Khoe dự án của bạn.</b> <a href="${ORIGIN}/submit" style="color:#8b5cf6">Gửi dự án</a>: mất năm phút, và dự án có mặt trong mục Khoe dự án.`),
        L(u, `<b>Say hi.</b> <a href="${ORIGIN}/discuss" style="color:#8b5cf6">Open Discuss</a>, and ask in Help when you are stuck.`, `<b>Chào mọi người.</b> <a href="${ORIGIN}/discuss" style="color:#8b5cf6">Vào Thảo luận</a>, và hỏi ở mục Hỏi đáp khi bí.`),
      ].map(x => `<li style="margin:0 0 8px">${x}</li>`).join("")}</ol>`
      + (picks.length ? `<p style="margin:18px 0 0">${L(u, "A few to start with:", "Vài dự án để bắt đầu:")}</p>${projTable(u, picks)}` : ""),
    text: L(u, "OpenYard is where people who make free software show what they built, get feedback and help each other.\n\n1. Try something and leave a comment.\n2. Share yours: ", "OpenYard là nơi những người làm phần mềm miễn phí khoe thứ mình làm, nhận góp ý và giúp nhau.\n\n1. Dùng thử và để lại bình luận.\n2. Khoe dự án của bạn: ") + `${ORIGIN}/submit\n3. ${L(u, "Discuss", "Thảo luận")}: ${ORIGIN}/discuss` + (picks.length ? `\n\n${projText(u, picks)}` : ""),
    button: [`${ORIGIN}/projects`, L(u, "Browse projects", "Xem các dự án")],
    why: L(u, "You get this because you turned on email at openyard.cloud.", "Bạn nhận email này vì đã bật nhận email trên openyard.cloud."),
  });
  await enqueue(env, u, "welcome", `welcome:${u.id}`, { subject: L(u, "Welcome to OpenYard", "Chào mừng tới OpenYard"), ...m });
}

/** A new comment: tell the person it answers, and the people who made the project. */
export async function comment(env, { id, slug, parentId, body, author }) {
  if (!ready(env)) return;
  if (slug.startsWith("t-")) return topicReply(env, { id, slug, parentId, body, author });
  const p = await env.DB.prepare("SELECT name FROM projects WHERE slug = ?1").bind(slug).first();
  if (!p) return;
  const parent = parentId ? await env.DB.prepare("SELECT user_id FROM comments WHERE id = ?1").bind(parentId).first() : null;
  const replyTo = parent && parent.user_id !== author.id ? (await recipients(env, [parent.user_id]))[0] : null;
  const team = await makers(env, slug, author), list = replyTo ? [replyTo, ...team.filter(u => u.email.toLowerCase() !== replyTo.email.toLowerCase())] : team;
  const who = author.name || author.login, link = `${ORIGIN}/p/${slug}#comments`;
  for (const u of list) {
    const reply = u === replyTo;
    const title = reply ? L(u, `${who} replied to you on ${p.name}`, `${who} đã trả lời bạn trên ${p.name}`) : L(u, `${who} commented on ${p.name}`, `${who} đã bình luận về ${p.name}`);
    const m = layout(u, { pre: clip(body, 120), title, html: `<p style="margin:0">@${esc(author.login)}:</p>${quote(body)}`, text: `@${author.login}:\n${clip(body, 600)}`,
      button: [link, L(u, "Reply on OpenYard", "Trả lời trên OpenYard")],
      why: reply ? L(u, "You get this because you commented there and turned on email.", "Bạn nhận email này vì đã bình luận ở đó và bật nhận email.") : makerWhy(u, p.name) });
    await enqueue(env, u, reply ? "reply" : "comment", `${reply ? "reply" : "comment"}:${id}:${who_(u)}`, { subject: title, ...m });
  }
}

/** A reply in a discussion: tell the person who started the topic, and the one being answered. */
async function topicReply(env, { id, slug, parentId, body, author }) {
  const tp = await env.DB.prepare("SELECT id, title, user_id FROM topics WHERE id = ?1 AND deleted = 0").bind(+slug.slice(2)).first();
  if (!tp) return;
  const parent = parentId ? await env.DB.prepare("SELECT user_id FROM comments WHERE id = ?1").bind(parentId).first() : null;
  const ids = [parent?.user_id, tp.user_id].filter(x => x && x !== author.id);
  const who = author.name || author.login;
  const link = `${ORIGIN}/discuss/t/${tp.id}#comments`;
  for (const u of await recipients(env, ids)) {
    const reply = parent && u.id === parent.user_id;
    const title = reply ? L(u, `${who} replied to you in “${tp.title}”`, `${who} đã trả lời bạn trong “${tp.title}”`) : L(u, `${who} replied to your topic “${tp.title}”`, `${who} đã trả lời chủ đề “${tp.title}” của bạn`);
    const m = layout(u, { pre: clip(body, 120), title, html: `<p style="margin:0">@${esc(author.login)}:</p>${quote(body)}`, text: `@${author.login}:\n${clip(body, 600)}`,
      button: [link, L(u, "Reply on OpenYard", "Trả lời trên OpenYard")],
      why: L(u, "You get this because you took part in this discussion and turned on email.", "Bạn nhận email này vì đã tham gia thảo luận này và bật nhận email.") });
    await enqueue(env, u, "reply", `treply:${id}:${u.id}`, { subject: clip(title, 150), ...m });
  }
}

/** A finished code check of a listed project: tell its makers about new abilities or a worse verdict. */
export async function check(env, { slug, commit, verdict, oldVerdict, abilities }) {
  if (!ready(env)) return;
  const worse = oldVerdict && verdict !== oldVerdict && verdict !== "clear";
  if (!abilities.length && !worse) return;
  const p = await env.DB.prepare("SELECT name FROM projects WHERE slug = ?1").bind(slug).first();
  if (!p) return;
  for (const u of await makers(env, slug)) {
    const title = worse ? L(u, `Code check of ${p.name}: ${VERDICT[verdict][0].toLowerCase()}`, `Kiểm tra code ${p.name}: ${VERDICT[verdict][1].toLowerCase()}`)
      : L(u, `${p.name} can do something new`, `${p.name} vừa có khả năng mới`);
    const said = abilities.map(a => ABILITY[a] ? L(u, ...ABILITY[a]) : a);
    const list = said.map(a => `<li>${esc(a)}</li>`).join("");
    const m = layout(u, { pre: L(u, `Commit ${commit.slice(0, 7)}`, `Commit ${commit.slice(0, 7)}`), title,
      html: (abilities.length ? `<p style="margin:0">${L(u, `Since the previous check, at commit <code>${esc(commit.slice(0, 7))}</code>, the code started to:`, `So với lần kiểm tra trước, tại commit <code>${esc(commit.slice(0, 7))}</code>, code bắt đầu:`)}</p><ul style="margin:8px 0 0;padding-left:20px">${list}</ul>` : "")
        + `<p style="margin:14px 0 0">${L(u, "If you meant it, nothing to do. If not, it is how hijacked dependencies usually show up, so take a look.", "Nếu đúng là bạn muốn vậy thì không cần làm gì. Nếu không, đây thường là dấu hiệu dependency bị chiếm quyền, nên xem lại.")}</p>`,
      text: `${said.map(a => `- ${a}`).join("\n")}\n\n${L(u, "If you meant it, nothing to do. If not, take a look.", "Nếu đúng là bạn muốn vậy thì không cần làm gì. Nếu không, hãy xem lại.")}`,
      button: [`${ORIGIN}/p/${slug}#check`, L(u, "See the check", "Xem kết quả kiểm tra")],
      why: makerWhy(u, p.name) });
    await enqueue(env, u, "check", `check:${slug}:${commit}:${who_(u)}`, { subject: title, ...m });
  }
}

/** Monday: the week's new projects to everyone who wants email, theirs first. Nothing new, nothing sent. */
export async function digest(env, all, now = Date.now()) {
  if (!ready(env)) return;
  const since = new Date(now - 7 * DAY).toISOString().slice(0, 10), week = new Date(now).toISOString().slice(0, 10);
  const fresh = all.filter(p => p.added >= since);
  if (!fresh.length) return;
  const { results } = await env.DB.prepare("SELECT id FROM users WHERE email_ok = 1 AND email IS NOT NULL AND deleted_at IS NULL AND banned = 0").all();
  for (const u of await recipients(env, results.map(r => r.id))) {
    const likes = JSON.parse(u.interests || "[]");
    const list = fresh.map((p, i) => [p.kinds.some(k => likes.includes(k)) ? 0 : 1, i, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 8).map(x => x[2]);
    const title = L(u, `${fresh.length} new in the yard this week`, `${fresh.length} dự án mới trên OpenYard tuần này`);
    const m = layout(u, { pre: list.map(p => p.name).join(", "), title, html: `<p style="margin:0">${L(u, "Free apps, experiments and tools people shared this week. Try one and tell the maker what you think.", "App miễn phí, thí nghiệm và công cụ mọi người chia sẻ tuần này. Dùng thử một cái rồi nói cho người làm biết bạn nghĩ gì.")}</p>${projTable(u, list)}`,
      text: projText(u, list), button: [`${ORIGIN}/projects`, L(u, "See all projects", "Xem tất cả dự án")],
      why: L(u, "You get this weekly because you turned on email at openyard.cloud.", "Bạn nhận email này hằng tuần vì đã bật nhận email trên openyard.cloud.") });
    await enqueue(env, u, "digest", `digest:${u.id}:${week}`, { subject: title, ...m });
  }
}

// ---------- sign-in links ----------
/** The one-time sign-in link, sent at once (it is what the person is waiting for), within the daily budget. */
export async function signin(env, email, link, code, lang) {
  if (!ready(env)) return false;
  const now = Date.now(), budget = +env.EMAIL_DAILY_LIMIT || 90;
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM outbox WHERE sent_at > ?1").bind(now - DAY).first();
  if (n >= budget + 8) return false; // a few over the budget for sign-ins, never the provider's limit
  const u = { lang, contact: "signin", unsub_token: "" };
  const title = L(u, `${code} is your OpenYard code`, `${code} là mã đăng nhập OpenYard`);
  const html = `<p style="margin:0">${L(u, "Type this code on the sign-in page:", "Nhập mã này ở trang đăng nhập:")}</p>
<p style="margin:14px 0 0;font:600 34px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.28em;color:#0d0d0f;background:#f6f6f7;border-radius:14px;padding:14px 18px;display:inline-block">${code}</p>
<p style="margin:16px 0 0">${L(u, "Or press the button below on this device. Both work once, for 20 minutes.", "Hoặc bấm nút bên dưới trên thiết bị này. Mã và nút đều chỉ dùng được một lần, trong 20 phút.")}</p>
<p style="margin:14px 0 0;color:#6b6b73;font-size:14px">${L(u, "If you did not ask for it, ignore this email: nobody can sign in without it.", "Nếu bạn không yêu cầu, cứ bỏ qua email này: không ai đăng nhập được nếu không có nó.")}</p>`;
  const body = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f6f7;font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0d0d0f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e7e7ea;border-radius:20px">
<tr><td style="padding:28px 32px 8px;font-weight:600;font-size:17px"><img src="${ORIGIN}/og/mark.png" width="22" height="22" alt="" style="vertical-align:-5px;margin-right:8px">Open<span style="color:#8b5cf6">Yard</span></td></tr>
<tr><td style="padding:12px 32px 0"><h1 style="margin:0;font-size:22px;font-weight:600">${esc(title)}</h1></td></tr>
<tr><td style="padding:8px 32px 0;font-size:15.5px;line-height:1.6;color:#33333a">${html}</td></tr>
<tr><td style="padding:22px 32px 30px"><a href="${esc(link)}" style="display:inline-block;background:#0d0d0f;color:#fff;text-decoration:none;font-weight:500;font-size:15px;padding:12px 22px;border-radius:999px">${L(u, "Sign in to OpenYard", "Đăng nhập OpenYard")}</a></td></tr>
</table></td></tr></table></body></html>`;
  const r = await fetch(`${env.RESEND_URL || "https://api.resend.com"}/emails`, {
    method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], subject: title, html: body, text: `${title}\n\n${L(u, "Code", "Mã")}: ${code}\n${L(u, "Or open", "Hoặc mở")}: ${link}\n\n${L(u, "Both work once, for 20 minutes.", "Mã và link đều chỉ dùng được một lần, trong 20 phút.")}` }),
  });
  if (!r.ok) { console.error("signin mail", r.status, (await r.text()).slice(0, 200)); return false; }
  // counted with the rest so the daily budget stays honest
  await env.DB.prepare("INSERT INTO outbox (dedupe, user_id, kind, subject, html, text, created_at, sent_at, tries) VALUES (?1, 0, 'signin', ?2, '', '', ?3, ?3, 1)").bind(`signin:${now}:${Math.random()}`, title, now).run();
  return true;
}

// ---------- looking after makers ----------
const link = (href, label) => `<a href="${href}" style="color:#8b5cf6">${label}</a>`;
const li = items => `<ul style="margin:8px 0 0;padding-left:20px">${items.map(x => `<li style="margin:0 0 6px">${x}</li>`).join("")}</ul>`;
const nums = (u, st) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 0;width:100%"><tr>${[
  [st.clicks, L(u, "visits", "lượt ghé")], [st.likes, L(u, "likes", "lượt thích")], [st.comments, L(u, "comments", "bình luận")]]
  .map(([n, l]) => `<td style="padding:12px;border:1px solid #ececf0;border-radius:12px;text-align:center"><b style="display:block;font-size:22px">${+n || 0}</b><span style="color:#6b6b73;font-size:13px">${l}</span></td>`).join('<td style="width:8px"></td>')}</tr></table>`;
async function stats(env, slug, since = 0) {
  const q = (sql, ...b) => env.DB.prepare(sql).bind(slug, ...b).first();
  const day = new Date(since).toISOString().slice(0, 10);
  return {
    clicks: (await q("SELECT COALESCE(SUM(n), 0) AS n FROM clicks WHERE slug = ?1 AND day >= ?2", day)).n,
    likes: (await q("SELECT COUNT(*) AS n FROM likes WHERE slug = ?1 AND created_at >= ?2", since)).n,
    comments: (await q("SELECT COUNT(*) AS n FROM comments WHERE slug = ?1 AND deleted = 0 AND created_at >= ?2", since)).n,
  };
}

/** Right after a submit: the page is live, the private edit link (only to the address that submitted), and what to add. */
export async function live(env, slug, editPath) {
  if (!ready(env)) return;
  const p = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?1").bind(slug).first();
  if (!p) return;
  const page = `${ORIGIN}/p/${slug}`, tl = JSON.parse(p.tagline), tags = JSON.parse(p.tags || "[]");
  for (const u of await makers(env, slug)) {
    const todo = [
      !p.image && L(u, "a screenshot: cards with a picture get far more clicks", "một ảnh chụp màn hình: thẻ có ảnh được bấm nhiều hơn hẳn"),
      !p.logo && L(u, "a logo", "logo"),
      !(tl.en && tl.vi) && L(u, `the text in ${tl.en ? "Vietnamese" : "English"} too, so both languages find it`, `phần giới thiệu bằng ${tl.en ? "tiếng Việt" : "tiếng Anh"} nữa, để người đọc cả hai thứ tiếng đều tìm thấy`),
      !tags.length && L(u, "a few tags, so it shows up on tag pages", "vài thẻ, để dự án hiện trên các trang thẻ"),
      !p.repo && L(u, "the GitHub link if the code is open: every repo gets a free code check and a badge", "link GitHub nếu code mở: repo nào cũng được kiểm tra code miễn phí và có huy hiệu"),
    ].filter(Boolean);
    const edit = u.contact && editPath ? `${ORIGIN}${editPath}` : u.contact ? null : `${ORIGIN}/settings`;
    const title = L(u, `${p.name} is live on OpenYard`, `${p.name} đã có mặt trên OpenYard`);
    const m = layout(u, { pre: L(u, "Your page, your edit link, and what to add next.", "Trang dự án, link sửa, và nên thêm gì tiếp."), title,
      html: `<p style="margin:0">${L(u, `Your page is up at ${link(page, page.replace("https://", ""))}, and it is in ${link(`${ORIGIN}/discuss/showcase`, "Showcase")}, where people try new projects.`, `Trang dự án đã có tại ${link(page, page.replace("https://", ""))}, và có mặt trong mục ${link(`${ORIGIN}/discuss/showcase`, "Khoe dự án")}, nơi mọi người dùng thử dự án mới.`)}</p>`
        + (edit ? `<p style="margin:14px 0 0;padding:12px 14px;background:#f6f6f7;border-radius:12px">${u.contact ? L(u, `<b>Your private edit link.</b> Keep this email: anyone with the link can change or remove the listing.<br>${link(edit, edit.replace("https://", "").slice(0, 60) + "…")}`, `<b>Link sửa riêng của bạn.</b> Giữ email này: ai có link đều sửa hoặc gỡ được dự án.<br>${link(edit, edit.replace("https://", "").slice(0, 60) + "…")}`) : L(u, `Edit it any time from ${link(edit, "Settings")}.`, `Sửa bất cứ lúc nào ở trang ${link(edit, "Cài đặt")}.`)}</p>` : "")
        + (todo.length ? `<p style="margin:16px 0 0">${L(u, "To help people find and try it, add:", "Để mọi người dễ tìm và dùng thử, hãy thêm:")}</p>${li(todo)}` : ""),
      text: `${page}\n\n${edit ? `${L(u, "Edit", "Sửa")}: ${edit}\n\n` : ""}${todo.map(x => `- ${x}`).join("\n")}`,
      button: [page, L(u, "See your page", "Xem trang dự án")], why: makerWhy(u, p.name) });
    await enqueue(env, u, "live", `live:${slug}:${who_(u)}`, { subject: title, ...m });
  }
}

/** Day 3 and day 7 after a listing went up: how it is doing, and what helps. */
async function nurture(env, p, day, now) {
  const page = `${ORIGIN}/p/${p.slug}`, st = await stats(env, p.slug, p.created_at);
  for (const u of await makers(env, p.slug)) {
    const title = day === 3 ? L(u, `Three ways to get people trying ${p.name}`, `Ba cách để có người dùng thử ${p.name}`) : L(u, `${p.name}'s first week on OpenYard`, `Tuần đầu của ${p.name} trên OpenYard`);
    const body = day === 3
      ? `<p style="margin:0">${L(u, "So far:", "Đến giờ:")}</p>${nums(u, st)}${li([
          L(u, `<b>Share your OpenYard page</b>, not just your site: ${link(page, page.replace("https://", ""))} has a preview picture and a code check, and visits from it count toward Trending.`, `<b>Chia sẻ trang OpenYard</b> chứ không chỉ trang của bạn: ${link(page, page.replace("https://", ""))} có ảnh xem trước và kết quả kiểm tra code, và lượt ghé từ đó được tính vào mục Đang lên.`),
          L(u, "<b>Answer people.</b> Reply to comments on your page. Makers who answer get more people coming back.", "<b>Trả lời mọi người.</b> Trả lời bình luận trên trang dự án. Người làm chịu trả lời sẽ có nhiều người quay lại hơn."),
          L(u, `<b>Ask for the one thing you need:</b> testers, feedback on the design, a translator. Post it in ${link(`${ORIGIN}/discuss/help`, "Help")}.`, `<b>Hỏi đúng thứ bạn cần:</b> người test, góp ý thiết kế, người dịch. Đăng ở mục ${link(`${ORIGIN}/discuss/help`, "Hỏi đáp")}.`),
        ])}`
      : `<p style="margin:0">${L(u, "Here is the first week:", "Tuần đầu tiên:")}</p>${nums(u, st)}<p style="margin:14px 0 0">${L(u, `Shipped something since? Update the listing so the page says so, and tell people in ${link(`${ORIGIN}/discuss/progress`, "Building in public")}. Ideas for OpenYard itself are welcome in ${link(`${ORIGIN}/discuss/ideas`, "Ideas & feedback")}.`, `Có gì mới từ hôm đó? Cập nhật trang dự án cho đúng, và kể cho mọi người ở mục ${link(`${ORIGIN}/discuss/progress`, "Đang làm gì")}. Ý tưởng cho chính OpenYard thì gửi ở mục ${link(`${ORIGIN}/discuss/ideas`, "Ý tưởng & góp ý")}.`)}</p>`;
    const m = layout(u, { pre: L(u, `${st.clicks} visits, ${st.likes} likes, ${st.comments} comments so far.`, `${st.clicks} lượt ghé, ${st.likes} lượt thích, ${st.comments} bình luận.`), title, html: body,
      text: `${st.clicks} ${L(u, "visits", "lượt ghé")} · ${st.likes} ${L(u, "likes", "lượt thích")} · ${st.comments} ${L(u, "comments", "bình luận")}\n${page}`,
      button: [page, L(u, "See your page", "Xem trang dự án")], why: makerWhy(u, p.name) });
    await enqueue(env, u, `day${day}`, `day${day}:${p.slug}:${who_(u)}`, { subject: title, ...m });
  }
}

/** Once a day: who liked each project in the last 24 hours, and the day-3 and day-7 notes. */
export async function daily(env, now = Date.now()) {
  if (!ready(env)) return;
  const { results: likes } = await env.DB.prepare(`SELECT l.slug, u.id, u.login, u.name, p.name AS project FROM likes l JOIN users u ON u.id = l.user_id JOIN projects p ON p.slug = l.slug
    WHERE l.created_at > ?1 AND p.hidden = 0 AND u.deleted_at IS NULL ORDER BY l.created_at`).bind(now - DAY).all();
  const bySlug = new Map();
  likes.forEach(l => bySlug.set(l.slug, [...(bySlug.get(l.slug) || []), l]));
  const date = new Date(now).toISOString().slice(0, 10);
  for (const [slug, list] of bySlug) {
    for (const u of await makers(env, slug)) {
      const fans = list.filter(l => l.id !== u.id);
      if (!fans.length) continue;
      const name = list[0].project, page = `${ORIGIN}/p/${slug}`;
      const title = fans.length === 1 ? L(u, `${fans[0].name || fans[0].login} liked ${name}`, `${fans[0].name || fans[0].login} đã thích ${name}`) : L(u, `${fans.length} people liked ${name}`, `${fans.length} người đã thích ${name}`);
      const m = layout(u, { pre: fans.map(f => "@" + f.login).join(", "), title,
        html: `<p style="margin:0">${L(u, "In the last day:", "Trong một ngày qua:")}</p>${li(fans.slice(0, 12).map(f => link(`${ORIGIN}/@${esc(f.login)}`, esc(f.name || f.login)) + ` <span style="color:#8b8b95">@${esc(f.login)}</span>`))}${fans.length > 12 ? `<p style="margin:6px 0 0;color:#6b6b73">${L(u, `and ${fans.length - 12} more`, `và ${fans.length - 12} người khác`)}</p>` : ""}`,
        text: fans.map(f => `- ${f.name || f.login} (@${f.login})`).join("\n"),
        button: [page, L(u, "See your page", "Xem trang dự án")], why: makerWhy(u, name) });
      await enqueue(env, u, "likes", `likes:${slug}:${date}:${who_(u)}`, { subject: title, ...m });
    }
  }
  const { results: fresh } = await env.DB.prepare(`SELECT slug, name, created_at FROM projects WHERE hidden = 0 AND team = 0 AND
    ((created_at <= ?1 AND created_at > ?2) OR (created_at <= ?3 AND created_at > ?4))`).bind(now - 3 * DAY, now - 4 * DAY, now - 7 * DAY, now - 8 * DAY).all();
  for (const p of fresh) await nurture(env, p, now - p.created_at < 5 * DAY ? 3 : 7, now);
}

// ---------- unsubscribe ----------
export async function unsubscribe(req, env, url, site) {
  const t = url.searchParams.get("t") || "";
  const ok = /^[\w-]{20,64}$/.test(t);
  const acct = ok ? await env.DB.prepare("SELECT id, email_ok, lang FROM users WHERE unsub_token = ?1").bind(t).first() : null;
  const proj = ok && !acct ? await env.DB.prepare("SELECT slug, contact_ok AS email_ok FROM projects WHERE contact_token = ?1").bind(t).first() : null;
  const u = acct || proj;
  const H = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  if (req.method === "POST" && acct) await env.DB.prepare("UPDATE users SET email_ok = 0, email_ok_at = ?2 WHERE id = ?1 AND email_ok = 1").bind(acct.id, Date.now()).run();
  if (req.method === "POST" && proj) await env.DB.prepare("UPDATE projects SET contact_ok = 0 WHERE slug = ?1").bind(proj.slug).run();
  const off = req.method === "POST" || (u && !u.email_ok);
  const txt = (e, v) => `<span data-vi="${esc(v)}">${esc(e)}</span>`;
  const body = `<header class="hero hub"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">
  <h1 class="up">${!u ? txt("This link does not work", "Link này không dùng được") : off ? txt("You will not get email from us", "Bạn sẽ không nhận email nữa") : txt("Stop email from OpenYard?", "Dừng nhận email từ OpenYard?")}</h1>
  <p class="desc up" style="--d:1">${!u ? txt("Turn email off in Settings instead.", "Hãy tắt email ở trang Cài đặt.") : off ? txt("Changed your mind? Turn it back on in Settings.", "Đổi ý? Bật lại ở trang Cài đặt.") : txt("Replies, comments on your projects, code checks and the weekly note all stop.", "Thông báo trả lời, bình luận, kiểm tra code và bản tin hằng tuần đều dừng.")}</p>
  <div class="cta up" style="--d:2">${u && !off ? `<form method="post"><button class="btn dark" type="submit">${txt("Unsubscribe", "Huỷ nhận email")}</button></form>` : ""}<a class="btn line" href="/settings">${txt("Settings", "Cài đặt")}</a></div>
</div></header>`;
  return new Response(page({ title: "Email · OpenYard", desc: "Email settings.", path: "/unsubscribe", color: "#8b7cff", site, noindex: true, body, jsonld: [] }), { status: u ? 200 : 404, headers: H });
}
