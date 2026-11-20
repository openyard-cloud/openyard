// Product analytics through PostHog (EU cloud), without cookies.
//
// In the browser: pageviews and clicks, sent in PostHog's cookieless mode, so nothing is stored on
// the visitor's device and no consent banner is needed. PostHog counts unique visitors with a
// daily salted hash on its side. No session recording, and Do Not Track is honoured.
// On the server: the few actions that matter (signing in, submitting, commenting, liking, starting
// a topic), keyed by account id only. No email, name or nickname is ever sent.
//
// Everything goes through this site at /relay so ad blockers do not drop it, and nothing runs at
// all until POSTHOG_KEY is set.

const HOSTS = {
  eu: { api: "eu.i.posthog.com", assets: "eu-assets.i.posthog.com", ui: "https://eu.posthog.com" },
  us: { api: "us.i.posthog.com", assets: "us-assets.i.posthog.com", ui: "https://us.posthog.com" },
};
const hosts = env => HOSTS[env.POSTHOG_REGION] || HOSTS.eu;
export const RELAY = "/relay";

/** GET /ph.js: starts PostHog on the page, or does nothing when it is not set up. */
export function clientScript(env) {
  const headers = { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600" };
  if (!env.POSTHOG_KEY) return new Response("", { headers });
  const config = {
    api_host: RELAY, ui_host: hosts(env).ui,
    cookieless_mode: "always", persistence: "memory", // no cookies, no localStorage
    disable_session_recording: true, respect_dnt: true, person_profiles: "identified_only",
    capture_pageview: true, capture_pageleave: true, autocapture: true,
  };
  // the official loader in its smallest form: queue an init for array.js to pick up when it arrives
  const js = `(function(){if(window.posthog)return;var p=window.posthog=[];p.__SV=1;p._i=[[${JSON.stringify(env.POSTHOG_KEY)},${JSON.stringify(config)},undefined]];`
    + `var s=document.createElement("script");s.async=true;s.crossOrigin="anonymous";s.src=${JSON.stringify(RELAY + "/static/array.js")};document.head.appendChild(s)})();`;
  return new Response(js, { headers });
}

/** /relay/*: passes the browser's analytics calls on to PostHog. */
export async function relay(req, env, path) {
  const h = hosts(env), rest = path.slice(RELAY.length) || "/", url = new URL(req.url);
  const host = rest.startsWith("/static/") || rest.startsWith("/array/") ? h.assets : h.api;
  const headers = new Headers(req.headers);
  headers.delete("Cookie"); // our sign-in cookie stays here
  headers.set("Host", host);
  // PostHog's cookieless hash and country lookup need the visitor's address, not the Worker's
  const ip = req.headers.get("CF-Connecting-IP");
  if (ip) headers.set("X-Forwarded-For", ip);
  const r = await fetch(`https://${host}${rest}${url.search}`, {
    method: req.method, headers, redirect: "manual",
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    ...(host === h.assets ? { cf: { cacheTtl: 3600, cacheEverything: true } } : {}),
  });
  const out = new Response(r.body, r);
  out.headers.delete("Set-Cookie");
  return out;
}

/** Records one server-side event for an account. Never throws; pass the promise to ctx.waitUntil. */
export function track(env, event, userId, props = {}) {
  if (!env.POSTHOG_KEY || userId == null) return Promise.resolve();
  return fetch(`https://${hosts(env).api}/i/v0/e/`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.POSTHOG_KEY, event, distinct_id: `account-${userId}`, timestamp: new Date().toISOString(),
      properties: { ...props, $process_person_profile: false, $lib: "openyard-worker" },
    }),
  }).then(r => { if (!r.ok) console.error("posthog", event, r.status); }, e => console.error("posthog", event, e));
}
