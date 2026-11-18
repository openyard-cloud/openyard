// Discussions, in place of a Discord server:
//   /discuss                 everything, latest activity first
//   /discuss/<category>      showcase | help | ideas | progress | general
//   /discuss/t/<id>-<slug>   one topic and its replies (comments with the key "t-<id>")
//   /discuss/new?cat=        start a topic (signed in, GitHub or email)
// Showcase is the projects themselves: a new listing is its own thread, at /p/<slug>#comments.
import { ORIGIN, esc, t, ARROW, ic, I, since, commentsJs } from "./pages.js";
import { page, crumbs } from "./hub.js";

export const DCATS = [
  { slug: "showcase", c: "#b67cff", icon: I.folder, name: ["Showcase", "Khoe dự án"], lead: ["New projects in the yard. Each one is its own thread: try it and tell the maker.", "Dự án mới trên OpenYard. Mỗi dự án là một chủ đề: dùng thử rồi nói với người làm."] },
  { slug: "help", c: "#38c6d9", icon: I.alert, name: ["Help", "Hỏi đáp"], lead: ["Stuck on code, design, deploys or building with AI? Ask. Someone has been there.", "Bí code, thiết kế, deploy hay làm app với AI? Cứ hỏi, kiểu gì cũng có người từng gặp."] },
  { slug: "ideas", c: "#ffc56b", icon: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>', name: ["Ideas & feedback", "Ý tưởng & góp ý"], lead: ["Ideas for your next project, or for OpenYard itself. Rough is fine.", "Ý tưởng cho dự án tiếp theo, hoặc cho chính OpenYard. Chưa chín cũng được."] },
  { slug: "progress", c: "#34d399", icon: I.commit, name: ["Building in public", "Đang làm gì"], lead: ["What you shipped this week, what broke, what you learned.", "Tuần này bạn làm được gì, hỏng gì, học được gì."] },
  { slug: "general", c: "#7c9cff", icon: I.talk, name: ["General", "Chuyện phiếm"], lead: ["Say hello, share a link, talk about anything else.", "Chào mọi người, chia sẻ link, nói chuyện khác."] },
];
export const DCAT = Object.fromEntries(DCATS.map(c => [c.slug, c]));
export const topicPath = tp => `/discuss/t/${tp.id}-${String(tp.title).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "topic"}`;

const D_CSS = `
.dcols{display:grid;grid-template-columns:240px minmax(0,1fr);gap:28px;align-items:start}
@media (max-width:900px){.dcols{grid-template-columns:minmax(0,1fr)}.topicp .dnav{order:2}}
.dnav{position:sticky;top:88px;display:flex;flex-direction:column;gap:4px}@media (max-width:900px){.dnav{position:static;flex-direction:row;flex-wrap:wrap}}
.dnav a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;font-size:14.5px;font-weight:500;color:var(--muted);transition:background .2s,color .2s}
.dnav a:hover{background:var(--bg2);color:var(--ink)}.dnav a[aria-current]{background:var(--bg2);color:var(--ink)}
.dnav a i{width:10px;height:10px;border-radius:50%;background:var(--k);flex:none}.dnav a small{margin-left:auto;font-size:12px;opacity:.7;font-variant-numeric:tabular-nums}
.dnav .btn{margin-top:10px;width:100%}@media (max-width:900px){.dnav .btn{width:auto;margin:0 0 0 auto}}
.tl2{list-style:none;margin:0;padding:0;border:1px solid var(--line2);border-radius:20px;background:var(--solid);overflow:hidden}
.tl2 li+li{border-top:1px solid var(--line)}
.tl2 a{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;transition:background .2s}.tl2 a:hover{background:var(--bg2)}
.tl2 .av{flex:none;width:38px;height:38px;border-radius:50%;background:var(--bg2);object-fit:cover}.tl2 .av.sq{border-radius:10px;background:#fff;padding:3px;object-fit:contain}
.tl2 .tx{flex:1;min-width:0}.tl2 b{display:block;font-size:15.5px;font-weight:600;letter-spacing:-.01em;line-height:1.35}
.tl2 p{margin:3px 0 0;color:var(--muted);font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tl2 .mt{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:6px;font-size:12.5px;color:var(--muted);align-items:center}
.tl2 .ct{display:inline-flex;align-items:center;gap:6px}.tl2 .ct i{width:8px;height:8px;border-radius:50%;background:var(--k)}
.tl2 .rp{flex:none;display:flex;align-items:center;gap:5px;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;padding-top:2px}.tl2 .rp .ic{width:15px;height:15px}
.tl2 .pin{font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;background:var(--bg2);color:var(--ink)}
.empty2{padding:40px 20px;text-align:center;color:var(--muted)}
.topic{border:1px solid var(--line2);border-radius:22px;background:var(--solid);padding:24px}
.topic .by{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted)}.topic .by img{width:36px;height:36px;border-radius:50%;background:var(--bg2)}.topic .by a{color:var(--ink);font-weight:600}
.topic .bd{margin-top:16px;font-size:16.5px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.topic .bd a{color:#7c6cff;text-decoration:underline}
.topic .tools{margin-top:14px;display:flex;gap:12px}.topic .tools button{background:none;border:0;padding:0;color:var(--muted);font:500 13px Inter,sans-serif;cursor:pointer}.topic .tools button:hover{color:var(--ink)}
.hero.dh h1{font-size:clamp(30px,4.4vw,48px);max-width:24em}
.newt{display:flex;flex-direction:column;gap:12px;max-width:760px}
.newt label{font-size:13px;font-weight:500;color:var(--muted)}
.newt input,.newt textarea,.newt select{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--line2);background:var(--solid);color:var(--ink);font:15px/1.5 Inter,system-ui,sans-serif;outline:0}
.newt textarea{min-height:200px;resize:vertical}.newt input:focus,.newt textarea:focus,.newt select:focus{border-color:#8b7cff;box-shadow:0 0 0 4px rgba(139,124,255,.16)}
.newt .err{color:#e03131;font-size:14px}
`;

// a person: account picture, or GitHub's when the account has none
const face = u => esc(u.avatar || (u.login ? `https://github.com/${u.login}.png?size=76` : "/favicon.svg"));
const catNav = (current, counts, signedHint = true) => `<div class="dnav reveal" role="navigation" aria-label="Categories">
  <a href="/discuss"${!current ? ' aria-current="page"' : ""} style="--k:linear-gradient(135deg,#7c9cff,#ff7eb0)"><i></i>${t("Everything", "Tất cả")}</a>
  ${DCATS.map(c => `<a href="/discuss/${c.slug}"${current === c.slug ? ' aria-current="page"' : ""} style="--k:${c.c}"><i></i>${t(...c.name)}<small>${counts?.[c.slug] ?? ""}</small></a>`).join("")}
  ${signedHint ? `<a class="btn dark" href="/discuss/new${current && current !== "showcase" ? `?cat=${current}` : ""}">${t("New topic", "Mở chủ đề")}</a>` : ""}
</div>`;

/** /discuss and /discuss/<cat>. items: topics and projects mixed, newest activity first. */
export function discussPage({ items, cat, counts, site, now = Date.now() }) {
  const C = cat ? DCAT[cat] : null;
  const row = x => {
    const k = DCAT[x.cat];
    return `<li><a href="${esc(x.href)}">${x.kind === "project" ? `<img class="av sq" src="${esc(x.logo || "/favicon.svg")}" alt="" loading="lazy">` : `<img class="av" src="${face(x)}" alt="" loading="lazy">`}
    <div class="tx"><b>${x.pinned ? `<span class="pin">${t("Pinned", "Ghim")}</span> ` : ""}${esc(x.title)}</b>${x.excerpt ? `<p>${esc(x.excerpt)}</p>` : ""}
      <div class="mt"><span class="ct" style="--k:${k.c}"><i></i>${t(...k.name)}</span><span>${x.login ? `@${esc(x.login)}` : x.team ? "OpenYard team" : t("a community member", "một thành viên")}</span><span>${t(...since(x.last_at, now))}</span></div></div>
    <span class="rp">${ic(I.talk)}${+x.replies || 0}</span></a></li>`;
  };
  const body = `<header class="hero hub dh"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">
  <div class="tags up" style="--d:1"><span class="pill on">${t("Discuss", "Thảo luận")}</span></div>
  <h1 class="up" style="--d:2">${C ? t(...C.name) : t("Talk in the yard", "Trò chuyện trong OpenYard")}</h1>
  <p class="desc up" style="--d:3">${C ? t(...C.lead) : t("Ask for help, share what you are building, trade ideas. Sign in with GitHub or your email to join in.", "Hỏi khi bí, khoe thứ bạn đang làm, trao đổi ý tưởng. Đăng nhập bằng GitHub hoặc email để tham gia.")}</p>
</div></header>
<div class="wrap dcols">
  ${catNav(cat, counts)}
  <div class="reveal">${items.length ? `<ul class="tl2">${items.map(row).join("")}</ul>` : `<div class="tl2 empty2">${cat === "showcase" ? t("No projects yet.", "Chưa có dự án nào.") : t("Nothing here yet. Start the first topic.", "Chưa có gì ở đây. Mở chủ đề đầu tiên đi.")}</div>`}</div>
</div>`;
  const path = cat ? `/discuss/${cat}` : "/discuss";
  return page({ title: `${C ? `${C.name[0]} · ` : ""}Discuss · OpenYard`, desc: C ? C.lead[0] : "Discussions among people who make free software: help, ideas, building in public and new projects.", path, color: C?.c || "#b67cff", site, current: "/discuss", body, css: D_CSS,
    jsonld: [crumbs([["OpenYard", ORIGIN], ["Discuss", `${ORIGIN}/discuss`], ...(C ? [[C.name[0], ORIGIN + path]] : [])])] });
}

const linkify = s => esc(s).replace(/https?:\/\/[^\s<]+[^\s<.,:;!?)\]'"]/g, u => `<a href="${u}" target="_blank" rel="nofollow ugc noopener">${u}</a>`);

/** One topic: the opening post, then the replies through the comment code. */
export function topicPage({ tp, author, replies, site, now = Date.now(), canDelete }) {
  const C = DCAT[tp.cat], url = ORIGIN + topicPath(tp);
  const body = `<header class="hero hub dh"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">
  <div class="crumb up" role="navigation" aria-label="Breadcrumb"><a href="/discuss">${t("Discuss", "Thảo luận")}</a><span>/</span><a href="/discuss/${C.slug}">${t(...C.name)}</a></div>
  <h1 class="up" style="--d:1">${esc(tp.title)}</h1>
</div></header>
<div class="wrap dcols topicp">
  ${catNav(tp.cat, null)}
  <div>
    <article class="topic reveal">
      <div class="by"><img src="${face(author)}" alt="" width="36" height="36"><div><a href="/@${esc(author.login)}">${esc(author.name || author.login)}</a> <span>@${esc(author.login)}</span><br><small>${t(...since(tp.created_at, now))}</small></div></div>
      <div class="bd">${linkify(tp.body)}</div>
      ${canDelete ? `<div class="tools"><button type="button" id="deltopic" data-id="${tp.id}">${t("Delete topic", "Xoá chủ đề")}</button></div>` : ""}
    </article>
    <section class="talk" id="comments" style="margin-top:28px">
      <div class="reveal"><h2>${t(`${replies} repl${replies === 1 ? "y" : "ies"}`, `${replies} trả lời`)}</h2></div>
      <div id="cbox" class="reveal" style="--d:1"></div>
      <div class="cms" id="clist"></div>
    </section>
  </div>
</div>`;
  const del = canDelete ? `<script>
document.getElementById("deltopic").addEventListener("click", async e => {
  const b = e.currentTarget;
  if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = document.documentElement.lang === "vi" ? "Chắc chưa? Bấm lần nữa" : "Sure? Click again"; return; }
  const r = await fetch("/api/topics/" + b.dataset.id, { method: "DELETE", credentials: "same-origin" });
  if (r.ok) location.href = "/discuss/${C.slug}";
});
</script>` : "";
  return page({ title: `${tp.title} · Discuss · OpenYard`, desc: tp.body.replace(/\s+/g, " ").slice(0, 155), path: topicPath(tp), color: C.c, site, current: "/discuss", body, css: D_CSS, extra: commentsJs(`t-${tp.id}`) + del,
    jsonld: [{ "@context": "https://schema.org", "@type": "DiscussionForumPosting", headline: tp.title, text: tp.body.slice(0, 2000), url, datePublished: new Date(tp.created_at).toISOString(), author: { "@type": "Person", name: author.name || author.login, url: `${ORIGIN}/@${author.login}` }, commentCount: replies },
      crumbs([["OpenYard", ORIGIN], ["Discuss", `${ORIGIN}/discuss`], [C.name[0], `${ORIGIN}/discuss/${C.slug}`], [tp.title, url]])] });
}

/** /discuss/new: the form. Showcase is not a choice: projects go through /submit. */
export function newTopicPage({ site, cat }) {
  const cats = DCATS.filter(c => c.slug !== "showcase");
  const body = `<header class="hero hub dh"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">
  <div class="tags up" style="--d:1"><span class="pill on">${t("New topic", "Chủ đề mới")}</span></div>
  <h1 class="up" style="--d:2">${t("Start a conversation", "Mở một cuộc trò chuyện")}</h1>
  <p class="desc up" style="--d:3">${t("Want to show a project? Submit it instead: it gets a page and a Showcase thread.", "Muốn khoe dự án? Hãy gửi dự án: nó sẽ có trang riêng và một chủ đề trong Khoe dự án.")} <a href="/submit" style="text-decoration:underline">${t("Submit a project", "Gửi dự án")}</a></p>
</div></header>
<div class="wrap"><form class="newt reveal" id="newt" novalidate>
  <label for="nc">${t("Category", "Chuyên mục")}</label>
  <select id="nc" name="cat">${cats.map(c => `<option value="${c.slug}"${c.slug === cat ? " selected" : ""}>${esc(c.name[0])} · ${esc(c.name[1])}</option>`).join("")}</select>
  <label for="nt">${t("Title", "Tiêu đề")}</label>
  <input id="nt" name="title" maxlength="120" required placeholder="${esc("How do you get the first 10 users for a free app?")}">
  <label for="nb">${t("What do you want to say?", "Bạn muốn nói gì?")}</label>
  <textarea id="nb" name="body" maxlength="5000" required></textarea>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn dark" type="submit">${t("Post", "Đăng")}</button><a class="btn line" href="/discuss">${t("Cancel", "Huỷ")}</a><span class="err" id="ne" role="alert"></span></div>
</form></div>`;
  const js = `<script>
(() => {
  const f = document.getElementById("newt"), err = document.getElementById("ne");
  fetch("/api/me", { credentials: "same-origin" }).then(r => r.json()).then(u => { if (!u) location.href = "/signin?return=" + encodeURIComponent(location.pathname + location.search); }).catch(() => {});
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = "";
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    try {
      const r = await fetch("/api/topics", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cat: f.querySelector("#nc").value, title: f.querySelector("#nt").value, body: f.querySelector("#nb").value }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      location.href = d.url;
    } catch (x) { err.textContent = x.message; b.disabled = false; }
  });
})();
</script>`;
  return page({ title: "New topic · Discuss · OpenYard", desc: "Start a discussion on OpenYard.", path: "/discuss/new", color: "#b67cff", site, current: "/discuss", noindex: true, body, css: D_CSS, extra: js, jsonld: [] });
}
