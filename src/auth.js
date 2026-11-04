// Sign in with GitHub (OAuth App). We only read the public profile and keep no GitHub token:
// after the callback the person gets our own session cookie, and the database stores its hash.
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
const safeReturn = r => (typeof r === "string" && /^\/(?!\/)[\w\-./?=&#%]*$/.test(r) ? r : "/");
const redirect = (to, headers = []) => { const h = new Headers({ Location: to }); headers.forEach(c => h.append("Set-Cookie", c)); return new Response(null, { status: 302, headers: h }); };

export async function currentUser(req, env) {
  const tok = cookies(req)[COOKIE];
  if (!tok) return null;
  return env.DB.prepare(`SELECT u.id, u.login, u.name, u.avatar, u.banned FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?1 AND s.expires_at > ?2`).bind(await sha256(tok), Date.now()).first();
}

export const isAdmin = (env, user) => !!user && String(env.ADMIN_LOGINS || "").toLowerCase().split(/[,\s]+/).includes(user.login.toLowerCase());

async function startSession(env, profile, secure) {
  const now = Date.now(), tok = randomToken();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO users (id, login, name, avatar, created_at, seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
      ON CONFLICT (id) DO UPDATE SET login = excluded.login, name = excluded.name, avatar = excluded.avatar, seen_at = excluded.seen_at`)
      .bind(profile.id, profile.login, profile.name || null, profile.avatar_url || null, now),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)").bind(await sha256(tok), profile.id, now + SESSION_DAYS * DAY),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?1").bind(now),
  ]);
  return cookie(COOKIE, tok, SESSION_DAYS * 86400, secure);
}

export async function handleAuth(req, env, url) {
  const secure = url.protocol === "https:", path = url.pathname;
  if (path === "/auth/github") {
    const back = safeReturn(url.searchParams.get("return"));
    // .dev.vars only; never set this on the deployed Worker
    if (env.DEV_LOGIN) {
      const login = String(env.DEV_LOGIN);
      return redirect(back, [await startSession(env, { id: 1000000 + login.length, login, name: login, avatar_url: `https://github.com/${login}.png` }, secure)]);
    }
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return new Response("GitHub sign-in is not set up yet.", { status: 503 });
    const state = randomToken(16);
    const q = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${url.origin}/auth/callback`, state, allow_signup: "true" });
    return redirect(`https://github.com/login/oauth/authorize?${q}`, [cookie(STATE, `${state}|${back}`, 600, secure)]);
  }
  if (path === "/auth/callback") {
    const [state, back] = (cookies(req)[STATE] || "").split("|");
    const clear = cookie(STATE, "", 0, secure);
    if (!state || state !== url.searchParams.get("state") || !url.searchParams.get("code")) return redirect("/", [clear]);
    const tr = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "openyard.cloud" },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get("code"), redirect_uri: `${url.origin}/auth/callback` }),
    }).then(r => r.json());
    if (!tr.access_token) return redirect(safeReturn(back), [clear]);
    const profile = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${tr.access_token}`, "User-Agent": "openyard.cloud", Accept: "application/vnd.github+json" } }).then(r => r.json());
    if (!profile?.id) return redirect(safeReturn(back), [clear]);
    return redirect(safeReturn(back), [clear, await startSession(env, profile, secure)]);
  }
  if (path === "/auth/logout" && req.method === "POST") {
    const tok = cookies(req)[COOKIE];
    if (tok) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(await sha256(tok)).run();
    return new Response(null, { status: 204, headers: { "Set-Cookie": cookie(COOKIE, "", 0, secure) } });
  }
  return null;
}
