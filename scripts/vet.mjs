#!/usr/bin/env node
// Code checks for the projects in the yard, run by .github/workflows/vet.yml.
// For each project with a GitHub repository: download the code at its latest commit, read it
// with vetcode (nothing is installed, built or run), and send a short public summary to
// POST /api/vet/<slug>. Projects whose commit has not changed are read again once a week.
//
//   SITE=https://openyard.cloud VET_TOKEN=… GITHUB_TOKEN=… node scripts/vet.mjs [--only slug | --repo owner/name] [--dry]
//
// What is published: what the code can do (network, secrets, other programs…), and malware or
// supply-chain findings with file and line. Vulnerability candidates and leaked-secret
// locations are never published: they would point attackers at unfixed problems.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SITE = process.env.SITE || "https://openyard.cloud";
// Latest 0.3.x: vetcode publishes patch releases from its own CI.
const VETCODE = process.env.VETCODE || "@openyard/vetcode@0.3";
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ONLY = arg("--only"), DRY = process.argv.includes("--dry");
const WEEK = 7 * 86400000, MAX_BYTES = 200 * 1024 * 1024, MAX_RUNS = +(process.env.MAX_RUNS || 25);
const auth = { Authorization: `Bearer ${process.env.VET_TOKEN || ""}` };
const gh = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

// The abilities vetcode reports per package, in the order they are shown.
const CAPS = ["reads environment or credential files", "uses the network", "runs other programs", "collects user and host details",
  "writes into home or startup folders", "decodes or builds code at runtime"];
const PUBLIC = new Set(["malware", "supply-chain"]);
const RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function summarize(report, ignored = []) {
  const rel = f => String(f || "");
  const caps = new Map();
  for (const p of report.profiles || []) for (const [cap, files] of Object.entries(p.capabilities || {})) {
    const set = caps.get(cap) || new Set();
    for (const f of files) set.add(rel(f));
    caps.set(cap, set);
  }
  const label = [...caps].map(([cap, files]) => ({ cap, files: files.size }))
    .sort((a, b) => (CAPS.indexOf(a.cap) + 99) % 99 - (CAPS.indexOf(b.cap) + 99) % 99);
  const notes = (report.findings || []).filter(f => PUBLIC.has(f.category) && RANK[f.severity] <= 2)
    .sort((a, b) => RANK[a.severity] - RANK[b.severity])
    .slice(0, 8).map(f => ({ severity: f.severity, rule: f.rule, title: f.title, file: rel(f.file), line: f.line || 0 }));
  const worst = Math.min(...notes.map(n => RANK[n.severity]), 9);
  // What the project tells vetcode to skip is published, so nothing can be hidden quietly.
  const skipped = { patterns: (ignored || []).slice(0, 20), lines: report.stats?.suppressedLines || 0 };
  return { version: report.version, files: report.stats?.files || 0, label, notes, skipped, verdict: worst === 0 ? "warning" : worst === 1 ? "review" : "clear" };
}

async function headCommit(owner, name) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${name}/commits/HEAD`, { headers: { Accept: "application/vnd.github+json", ...gh } });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  return (await r.json()).sha;
}

async function download(owner, name, sha, into) {
  const r = await fetch(`https://codeload.github.com/${owner}/${name}/tar.gz/${sha}`, { headers: gh });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const file = path.join(into, "code.tgz"), out = fs.createWriteStream(file);
  let n = 0;
  for await (const chunk of r.body) {
    n += chunk.length;
    if (n > MAX_BYTES) { out.destroy(); throw new Error("repository is larger than 200 MB"); }
    out.write(chunk);
  }
  await new Promise(res => out.end(res));
  const dir = path.join(into, "src");
  fs.mkdirSync(dir);
  // GNU tar drops leading "/" and refuses "../" in member names; vetcode does not follow symlinks.
  const t = spawnSync("tar", ["-xzf", file, "-C", dir, "--no-same-owner", "--no-same-permissions"], { stdio: "inherit" });
  if (t.status !== 0) throw new Error("could not unpack");
  fs.rmSync(file);
  // GitHub wraps the code in one folder (owner-repo-sha); scan from inside it so the project's
  // own .vetcodeignore applies and paths read as in the repository.
  const top = fs.readdirSync(dir);
  return top.length === 1 && fs.statSync(path.join(dir, top[0])).isDirectory() ? path.join(dir, top[0]) : dir;
}

// VETCODE_BIN (a checkout of the vetcode repository, as in the workflow) avoids depending on npm.
function scan(dir, out) {
  const args = [dir, "--json", out, "--no-tools", "--quiet"];
  const [cmd, pre] = process.env.VETCODE_BIN ? [process.execPath, [process.env.VETCODE_BIN]] : ["npx", ["-y", VETCODE]];
  const r = spawnSync(cmd, [...pre, ...args], { stdio: ["ignore", "ignore", "inherit"], timeout: 10 * 60 * 1000 });
  if (!fs.existsSync(out)) throw new Error(`vetcode did not finish (${r.signal || r.status})`);
  return JSON.parse(fs.readFileSync(out, "utf8"));
}

// Downloads one repository at a commit and reads it; returns the summary to publish.
async function readRepo(owner, name, sha) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oy-vet-"));
  try {
    const dir = await download(owner, name, sha, tmp);
    let ignored = [];
    try { ignored = fs.readFileSync(path.join(dir, ".vetcodeignore"), "utf8").split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#")).map(l => l.slice(0, 100)); } catch {}
    return { commit: sha, ...summarize(scan(dir, path.join(tmp, "report.json")), ignored) };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const post = (url, body) => fetch(`${SITE}${url}`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Listed projects: read again when the commit changed, or once a week.
async function projects() {
  const q = await fetch(`${SITE}/api/vet/queue`, { headers: auth });
  if (!q.ok) throw new Error(`queue ${q.status}: ${await q.text()}`);
  const now = Date.now();
  let runs = 0, failed = 0;
  for (const p of (await q.json()).projects) {
    if (ONLY && p.slug !== ONLY) continue;
    if (runs >= MAX_RUNS) break;
    const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(p.repo || "");
    if (!m) continue;
    try {
      const sha = await headCommit(m[1], m[2]);
      if (!ONLY && sha === p.commit && now - (p.scanned_at || 0) < WEEK) continue;
      runs++;
      const summary = await readRepo(m[1], m[2], sha);
      console.log(`${p.slug} @ ${sha.slice(0, 7)}: ${summary.verdict}, ${summary.label.length} abilities, ${summary.notes.length} notes`);
      if (DRY) { console.log(JSON.stringify(summary, null, 1)); continue; }
      const r = await post(`/api/vet/${p.slug}`, summary);
      if (!r.ok) { failed++; console.error(`${p.slug}: ${r.status} ${await r.text()}`); }
    } catch (e) {
      failed++;
      console.error(`${p.slug}: ${e.message}`);
    }
  }
  return failed;
}

// Repositories visitors asked about on /check. A repository that is missing, private or too
// large is reported back as failed with a reason the visitor can read; that is not a failed run.
async function asked(repos) {
  for (const repo of repos) {
    const m = /^([\w.-]+)\/([\w.-]+)$/.exec(repo);
    if (!m) continue;
    let res;
    try {
      await post("/api/check/result", { repo, running: true });
      const r = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}`, { headers: { Accept: "application/vnd.github+json", ...gh } });
      if (r.status === 404) throw new Error("Repository not found, or it is private.");
      if (!r.ok) throw new Error(`GitHub answered ${r.status}. Try again in a while.`);
      const info = await r.json();
      if (info.private) throw new Error("Only public repositories can be checked.");
      if (info.size > MAX_BYTES / 1024) throw new Error("The repository is larger than 200 MB.");
      const sha = await headCommit(m[1], m[2]);
      res = { repo, name: info.full_name, ...(await readRepo(m[1], m[2], sha)) };
      console.log(`${repo} @ ${sha.slice(0, 7)}: ${res.verdict}, ${res.label.length} abilities, ${res.notes.length} notes`);
    } catch (e) {
      console.error(`${repo}: ${e.message}`);
      res = { repo, error: e.message.slice(0, 200) };
    }
    if (DRY) { console.log(JSON.stringify(res, null, 1)); continue; }
    const r = await post("/api/check/result", res);
    if (!r.ok) console.error(`${repo}: ${r.status} ${await r.text()}`);
  }
}

async function main() {
  const one = arg("--repo");
  if (one) return asked([one]);
  let failed = await projects();
  const q = await fetch(`${SITE}/api/check/queue`, { headers: auth });
  if (q.ok) await asked((await q.json()).repos); else { failed++; console.error(`check queue ${q.status}`); }
  // A run where checks failed should show as failed in Actions, not as a quiet success.
  if (failed) throw new Error(`${failed} check${failed === 1 ? "" : "s"} failed`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
