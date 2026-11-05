// Public numbers and recent activity of a GitHub repository, for the trending list and
// the activity panel on project pages. Works without a token (60 requests an hour);
// set the GITHUB_TOKEN secret for 5,000 an hour and discussions (GraphQL needs a token).

const API = "https://api.github.com";
const DAY = 86400000;

export class RateLimited extends Error {}

export const parseRepo = u => {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(String(u || "").trim());
  return m ? { owner: m[1], name: m[2] } : null;
};

const headers = env => ({
  "User-Agent": "openyard.cloud",
  Accept: "application/vnd.github+json",
  ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
});

async function gh(env, path) {
  let r = await fetch(API + path, { headers: headers(env) });
  // A wrong or expired GITHUB_TOKEN fails every call; fall back to anonymous so stats and
  // the submit form keep working, and say so in the Worker logs.
  if (r.status === 401 && env.GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN was rejected by GitHub (401); using anonymous requests");
    r = await fetch(API + path, { headers: headers({}) });
  }
  if (r.status === 429 || (r.status === 403 && r.headers.get("x-ratelimit-remaining") === "0")) throw new RateLimited(path);
  if (!r.ok) return null;
  return r.json();
}

// What the submit form fills in from a repository link.
export async function repoInfo(env, { owner, name }) {
  const r = await gh(env, `/repos/${owner}/${name}`);
  if (!r || r.private) return null;
  return {
    name: r.name, description: r.description || "", homepage: r.homepage || "", license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
    stars: r.stargazers_count, owner: r.owner?.login, avatar: r.owner?.avatar_url, topics: r.topics || [], url: r.html_url,
  };
}

const item = (x, state) => ({ title: x.title, number: x.number, state, user: x.user?.login || x.author?.login || "ghost", at: x.updated_at || x.updatedAt, url: x.html_url || x.url });

async function discussions(env, { owner, name }) {
  if (!env.GITHUB_TOKEN) return null;
  const query = `query($o:String!,$n:String!){repository(owner:$o,name:$n){hasDiscussionsEnabled discussions(first:10,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{title number url createdAt updatedAt closed author{login}}}}}`;
  const r = await fetch(API + "/graphql", { method: "POST", headers: { ...headers(env), "Content-Type": "application/json" }, body: JSON.stringify({ query, variables: { o: owner, n: name } }) });
  if (!r.ok) return null;
  const repo = (await r.json())?.data?.repository;
  return repo?.hasDiscussionsEnabled ? repo.discussions.nodes : null;
}

export async function repoActivity(env, ref, now = Date.now()) {
  const { owner, name } = ref, base = `/repos/${owner}/${name}`;
  const since = new Date(now - 7 * DAY).toISOString();
  const repo = await gh(env, base);
  if (!repo || repo.private) return null;
  const [pulls, issues, commits, disc] = await Promise.all([
    gh(env, `${base}/pulls?state=all&sort=updated&direction=desc&per_page=30`),
    gh(env, `${base}/issues?state=all&sort=updated&direction=desc&per_page=30&since=${since}`),
    gh(env, `${base}/commits?since=${since}&per_page=100`),
    discussions(env, ref),
  ]);
  const recent = iso => iso && iso >= since;
  const prs = (pulls || []).map(p => ({ ...item(p, p.merged_at ? "merged" : p.state), _new: recent(p.created_at) || recent(p.merged_at) }));
  const iss = (issues || []).filter(i => !i.pull_request).map(i => ({ ...item(i, i.state), _new: recent(i.created_at) }));
  const ds = disc ? disc.map(d => ({ ...item(d, d.closed ? "closed" : "open"), _new: recent(d.createdAt) })) : null;
  const strip = list => list.slice(0, 8).map(({ _new, ...x }) => x);
  return {
    stars: repo.stargazers_count, forks: repo.forks_count, open_issues: repo.open_issues_count, pushed_at: repo.pushed_at,
    prs_7d: prs.filter(p => p._new).length,
    issues_7d: iss.filter(i => i._new).length,
    commits_7d: Array.isArray(commits) ? commits.length : 0,
    discussions_7d: ds ? ds.filter(d => d._new).length : 0,
    activity: { prs: strip(prs), issues: strip(iss), ...(ds ? { discussions: strip(ds) } : {}) },
  };
}
