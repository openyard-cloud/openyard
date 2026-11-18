// Sign in with GitHub (OAuth App). We read the public profile and the primary verified email
// (user:email scope) and keep no GitHub token: after the callback the person gets our own
// session cookie, and the database stores its hash. A first sign-in goes to /welcome.
// People without GitHub sign in with a one-time email link instead (worker.js, /auth/email);
// they share the session code here through sessionFor().
//   GET  /auth/github?return=/p/x   start      GET /auth/callback   finish
//   POST /auth/logout                sign out    GET /api/me          who is signed in
// Needs GITHUB_CLIENT_ID (var) and GITHUB_CLIENT_SECRET (secret). For local work only,
// DEV_LOGIN in .dev.vars signs you in as that GitHub login without going to GitHub.

const DAY = 86400000, SESSION_DAYS = 30, COOKIE = "oy_s", STATE = "oy_state";

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
export const randomToken = (n = 32) => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n)))).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" })[c]);

const cookies = req => Object.fromEntries((req.headers.get("Cookie") || "").split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
const cookie = (name, value, maxAge, secure) => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
// only send people back to a page on this site
export const safeReturn = r => (typeof r === "string" && /^\/(?!\/)[\w\-./?=&#%@]*$/.test(r) ? r : "/");
// back to the page with ?signin=failed so it can say so
const failed = back => { const [path, hash = ""] = safeReturn(back).split("#"); return path + (path.includes("?") ? "&" : "?") + "signin=failed" + (hash ? "#" + hash : ""); };
const redirect = (to, headers = []) => { const h = new Headers({ Location: to }); headers.forEach(c => h.append("Set-Cookie", c)); return new Response(null, { status: 302, headers: h }); };

export async function currentUser(req, env) {
  const tok = cookies(req)[COOKIE];
  if (!tok) return null;
  return env.DB.prepare(`SELECT u.id, u.login, u.name, u.avatar, u.banned, u.provider, u.email, u.email_ok, u.interests, u.bio, u.onboarded_at, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?1 AND s.expires_at > ?2 AND u.deleted_at IS NULL`).bind(await sha256(tok), Date.now()).first();
}

export const isAdmin = (env, user) => !!user && String(env.ADMIN_LOGINS || "").toLowerCase().split(/[,\s]+/).includes(user.login.toLowerCase());

// Returns the session cookie and whether the person still has to see /welcome.
// A deleted account that signs in again starts over as a new one.
async function startSession(env, profile, email, secure) {
  const now = Date.now();
  await env.DB.batch([
    // a GitHub login always belongs to its GitHub owner: an email account that picked the same nickname moves aside
    env.DB.prepare("UPDATE users SET login = login || '-' || (abs(id) % 10000) WHERE login = ?1 COLLATE NOCASE AND id != ?2 AND provider = 'email'").bind(profile.login, profile.id),
    env.DB.prepare(`INSERT INTO users (id, login, name, avatar, bio, email, created_at, seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
      ON CONFLICT (id) DO UPDATE SET login = excluded.login, name = excluded.name, avatar = excluded.avatar, bio = excluded.bio,
        email = COALESCE(excluded.email, users.email), seen_at = excluded.seen_at,
        onboarded_at = CASE WHEN users.deleted_at IS NULL THEN users.onboarded_at END,
        email_ok = CASE WHEN users.deleted_at IS NULL THEN users.email_ok ELSE 0 END,
        created_at = CASE WHEN users.deleted_at IS NULL THEN users.created_at ELSE excluded.created_at END, deleted_at = NULL`)
      .bind(profile.id, profile.login, profile.name || null, profile.avatar_url || null, profile.bio ? String(profile.bio).slice(0, 300) : null, email, now),
  ]);
  return sessionFor(env, profile.id, secure);
}

/** A new session for an existing account: the cookie, and whether /welcome is still to come. */
export async function sessionFor(env, userId, secure) {
  const now = Date.now(), tok = randomToken();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)").bind(await sha256(tok), userId, now + SESSION_DAYS * DAY),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?1").bind(now),
    env.DB.prepare("UPDATE users SET seen_at = ?2 WHERE id = ?1").bind(userId, now),
  ]);
  const u = await env.DB.prepare("SELECT onboarded_at FROM users WHERE id = ?1").bind(userId).first();
  return { set: cookie(COOKIE, tok, SESSION_DAYS * 86400, secure), fresh: !u?.onboarded_at };
}
// After sign-in: the page they came from, or /welcome first if they have not been through it.
export const landing = (s, back) => s.fresh ? `/welcome?return=${encodeURIComponent(safeReturn(back))}` : safeReturn(back);

// The primary verified address, or null (GitHub may withhold it if the person declined the scope).
async function primaryEmail(token) {
  try {
    const list = await fetch("https://api.github.com/user/emails", { headers: { Authorization: `Bearer ${token}`, "User-Agent": "openyard.cloud", Accept: "application/vnd.github+json" } }).then(r => r.ok ? r.json() : []);
    const e = Array.isArray(list) && list.find(x => x.primary && x.verified);
    return e && !/noreply\.github\.com$/i.test(e.email) ? String(e.email).slice(0, 200) : null;
  } catch { return null; }
}

export async function handleAuth(req, env, url) {
  const secure = url.protocol === "https:", path = url.pathname;
  if (path === "/auth/github") {
    const back = safeReturn(url.searchParams.get("return"));
    // .dev.vars only; never set this on the deployed Worker
    if (env.DEV_LOGIN) {
      const login = String(env.DEV_LOGIN);
      const s = await startSession(env, { id: 1000000 + login.length, login, name: login, avatar_url: `https://github.com/${login}.png`, bio: "Signed in locally." }, `${login}@example.com`, secure);
      return redirect(landing(s, back), [s.set]);
    }
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return new Response("GitHub sign-in is not set up yet.", { status: 503 });
    const state = randomToken(16);
    const q = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${url.origin}/auth/callback`, state, scope: "read:user user:email", allow_signup: "true" });
    return redirect(`https://github.com/login/oauth/authorize?${q}`, [cookie(STATE, `${state}|${back}`, 600, secure)]);
  }
  if (path === "/auth/callback") {
    const [state, back] = (cookies(req)[STATE] || "").split("|");
    const clear = cookie(STATE, "", 0, secure);
    if (!state || state !== url.searchParams.get("state") || !url.searchParams.get("code")) { console.error("oauth state missing or wrong", !!state); return redirect(failed(back || "/"), [clear]); }
    const tr = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "openyard.cloud" },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get("code"), redirect_uri: `${url.origin}/auth/callback` }),
    }).then(r => r.json());
    if (!tr.access_token) { console.error("github token exchange failed:", tr.error, tr.error_description); return redirect(failed(back), [clear]); }
    const profile = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${tr.access_token}`, "User-Agent": "openyard.cloud", Accept: "application/vnd.github+json" } }).then(r => r.json());
    if (!profile?.id) { console.error("github profile failed:", profile?.message); return redirect(failed(back), [clear]); }
    const s = await startSession(env, profile, await primaryEmail(tr.access_token), secure);
    return redirect(landing(s, back), [clear, s.set]);
  }
  if (path === "/auth/logout" && req.method === "POST") {
    const tok = cookies(req)[COOKIE];
    if (tok) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(await sha256(tok)).run();
    return new Response(null, { status: 204, headers: { "Set-Cookie": cookie(COOKIE, "", 0, secure) } });
  }
  return null;
}
