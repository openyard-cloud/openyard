// The home page: the yard's front page, not a landing page. A short hello for people who are new,
// then what is happening: trending and new projects, and the discussions, with the community
// beside them. Rendered by the Worker like the other hub pages, so search engines read it all.
// The longer story (why OpenYard exists, how it works) lives on /about and /community.
import { ORIGIN, esc, en, vi, t, ARROW, ic, I, TYPE, KIND } from "./pages.js";
import { page, rail, members, logoTag, tagCounts, tagPages, CATS } from "./hub.js";
import { topicRow, D_CSS } from "./discuss.js";

const HOME_CSS = `
.hello{position:relative;overflow:hidden;margin:28px 0 26px;padding:30px 32px;border-radius:26px;border:1px solid var(--line2);background:var(--solid)}
.hello::before{content:"";position:absolute;inset:-40% -10% auto auto;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#7c9cff55,#ff7eb033 45%,transparent 70%);filter:blur(30px);pointer-events:none}
.hello>*{position:relative}
.hello h1{margin:0;font-size:clamp(26px,3.6vw,38px);letter-spacing:-.035em;line-height:1.12;max-width:20em}
.hello p{margin:10px 0 0;color:var(--muted);font-size:16px;max-width:40em}
.hello .acts{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:20px}
.hello .acts .more{font-size:14.5px;font-weight:500;color:var(--muted);display:inline-flex;align-items:center;gap:6px;margin-left:6px}.hello .acts .more:hover{color:var(--ink)}
.hello [hidden]{display:none!important}
.hello .hi{display:flex;align-items:center;gap:14px}.hello .hi img{width:44px;height:44px;border-radius:50%;background:var(--bg2);object-fit:cover}
.htabs{display:flex;gap:6px;margin:0 0 14px;padding:4px;border-radius:999px;border:1px solid var(--line2);width:max-content;max-width:100%;overflow-x:auto}
.htabs button{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 16px;border-radius:999px;border:0;background:none;font:500 14px Inter,system-ui,sans-serif;color:var(--muted);cursor:pointer;white-space:nowrap}
.htabs button:hover{color:var(--ink)}.htabs button[aria-selected="true"]{background:var(--ink);color:var(--bg)}
.htabs .ic{width:15px;height:15px}
.plist{list-style:none;margin:0;padding:0;border:1px solid var(--line2);border-radius:20px;background:var(--solid);overflow:hidden}
.plist li+li{border-top:1px solid var(--line)}
.plist a{display:grid;grid-template-columns:26px 48px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 18px;transition:background .2s}
.plist a:hover{background:var(--bg2)}.plist a>span:nth-child(3){min-width:0}
.plist .rk{font-size:14px;font-weight:600;color:var(--muted);text-align:center;font-variant-numeric:tabular-nums}
.plist .lg img,.plist .lg .ini{display:grid;place-items:center;width:48px;height:48px;border-radius:13px;object-fit:cover;background:#fff;box-shadow:0 0 0 1px var(--line)}
.plist .lg img{object-fit:contain;padding:4px}.plist .lg img.full{object-fit:cover;padding:0}.plist .lg .ini{background:var(--c);color:#fff;font-weight:700;font-size:16px}
.plist b{font-size:15.5px;font-weight:600;letter-spacing:-.01em}
.plist .ptl{margin:2px 0 0;color:var(--muted);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.plist .mt{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:5px;font-size:12.5px;color:var(--muted);align-items:center}
.plist .mt .kd{padding:1px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--kc) 45%,var(--line));color:var(--ink)}
.plist .mt .nw{padding:1px 8px;border-radius:999px;background:#10b98122;color:#0ea371;font-weight:600}
.plist .st{width:auto;height:auto;margin:0;display:flex;align-items:center;gap:12px;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.plist .st span{display:inline-flex;align-items:center;gap:5px}.plist .st .ic{width:14px;height:14px}.plist .st .on{color:var(--ink)}.plist .st .on .ic{color:#f43f5e}
.hpanel[hidden]{display:none}
.morel{display:flex;justify-content:center;margin-top:14px}
.morel a{display:inline-flex;align-items:center;gap:8px;font-size:14.5px;font-weight:500;color:var(--muted)}.morel a:hover{color:var(--ink)}
.cbox .stack{margin:4px 0 12px}.cbox .stack img{width:30px;height:30px}
.cbox dl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0}
.cbox dt{font-size:20px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.1}.cbox dd{margin:2px 0 0;font-size:12px;color:var(--muted)}
.cbox .go{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:13.5px;font-weight:500;color:var(--muted)}.cbox .go:hover{color:var(--ink)}.cbox .go .ar,.morel .ar,.hello .more .ar{width:15px;height:15px;flex:none}
.bbox .cats{margin:8px 0 0}.bbox .cats a{height:32px;font-size:13px;padding:0 12px}
.bbox .tgs{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.bbox .tgs a{font-size:12.5px;color:var(--muted);padding:3px 9px;border-radius:8px;background:var(--bg2)}.bbox .tgs a:hover{color:var(--ink)}
@media (max-width:640px){.hello{padding:24px 20px;margin-top:18px}.plist a{grid-template-columns:40px minmax(0,1fr) auto;padding:12px 14px;gap:12px}.plist .rk{display:none}.plist .st{flex-direction:column;align-items:flex-end;gap:3px}.plist .lg img,.plist .lg .ini{width:40px;height:40px;border-radius:11px}}
`;

const kc = { people: "#10b981", wild: "#b67cff", dev: "#7c9cff" };
const maker = p => p.team ? "OpenYard team" : p.maintainers[0] ? `@${esc(p.maintainers[0])}` : p.owner ? `@${esc(p.owner.login)}` : t("a community member", "một thành viên");

function projectRow(p, i, now, numbered) {
  const fresh = now - Date.parse(p.added) < 7 * 86400000;
  return `<li><a href="/p/${esc(p.slug)}" style="--c:${esc(p.color || "#6d5bd0")}">
    <span class="rk">${numbered ? i + 1 : ""}</span><span class="lg">${logoTag(p, 48)}</span>
    <span><b>${esc(p.name)}</b><p class="ptl">${t(en(p.tagline), vi(p.tagline))}</p>
      <span class="mt"><span>${maker(p)}</span><span>${t(...TYPE(p))}</span>${p.kinds.filter(k => KIND[k]).map(k => `<span class="kd" style="--kc:${kc[k]}">${t(...KIND[k])}</span>`).join("")}${fresh ? `<span class="nw">${t("New", "Mới")}</span>` : ""}</span></span>
    <span class="st"><span class="${p.likes ? "on" : ""}">${ic(I.heart)}${+p.likes || 0}</span><span>${ic(I.talk)}${+p.comments || 0}</span><span class="vw">${ic(I.eye)}${(+p.views || 0).toLocaleString("en")}</span></span>
  </a></li>`;
}

/** "/": `all` in trending order, `pulse` from the Worker, `talk` the discussion list (newest activity first). */
export function homePage({ all, site, pulse, talk, now = Date.now() }) {
  const people = [...members(all, pulse).values()];
  const newest = [...all].map((p, i) => [p, i]).sort((a, b) => b[0].added.localeCompare(a[0].added) || a[1] - b[1]).map(([p]) => p);
  const tags = tagCounts(all).filter(([x]) => tagPages(all).includes(x)).slice(0, 12);
  const list = (ps, numbered) => `<ul class="plist reveal">${ps.slice(0, 12).map((p, i) => projectRow(p, i, now, numbered)).join("")}</ul>`;
  const tab = (id, icon, label, on) => `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${on}" data-t="${id}">${ic(icon)}${t(...label)}</button>`;

  const community = `<div class="box cbox reveal"><span class="eyebrow">${t("The community", "Cộng đồng")}</span>
    <a class="stack" href="/community">${people.slice(0, 10).map(f => `<img src="${esc(f.src)}" alt="" title="${esc(f.label)}" loading="lazy">`).join("")}</a>
    <dl><div><dt>${people.length}</dt><dd>${t("members", "thành viên")}</dd></div><div><dt>${+pulse.talk || 0}</dt><dd>${t("comments this week", "bình luận tuần này")}</dd></div><div><dt>${+pulse.likes || 0}</dt><dd>${t("likes this week", "lượt thích tuần này")}</dd></div></dl>
    <a class="go" href="/community">${t("Meet the people", "Gặp mọi người")} ${ARROW}</a></div>`;
  const browse = `<div class="box bbox reveal"><span class="eyebrow">${t("Browse", "Khám phá")}</span>
    <div class="cats">${CATS.map(c => `<a href="/${c.slug}">${t(...c.name)}<small>${all.filter(c.test).length}</small></a>`).join("")}</div>
    ${tags.length ? `<div class="tgs">${tags.map(([x]) => `<a href="/tags/${esc(x)}">#${esc(x)}</a>`).join("")}</div>` : ""}</div>
    <a class="box dcard reveal" href="/check">${ic(I.shield)}<div><b>${t("Check a repo before you install", "Kiểm tra repo trước khi cài")}</b><small>${t("Free malware and supply-chain read by vetcode", "vetcode đọc tìm mã độc và thủ đoạn chuỗi cung ứng, miễn phí")}</small></div></a>`;

  const body = `<div class="wrap">
  <section class="hello up" aria-labelledby="hello-h">
    <div class="guest">
      <h1 id="hello-h">${t("The yard for people who make free software", "Nơi tụ họp của những người làm phần mềm miễn phí")}</h1>
      <p>${t("Free apps, wild ideas and open tools, shown by the people who made them. Try them, say what you think, and ask when you are stuck. Every repository is checked for malware.", "App miễn phí, ý tưởng điên rồ và công cụ mở, do chính người làm mang tới. Dùng thử, góp ý, và hỏi khi bí. Mọi repo đều được kiểm tra mã độc.")}</p>
      <div class="acts"><a class="btn dark" href="/submit">${t("Share your project", "Chia sẻ dự án")}</a><a class="btn line" href="/signin?return=/">${t("Join the yard", "Tham gia")}</a><a class="more" href="/about">${t("How it works", "Cách hoạt động")} ${ARROW}</a></div>
    </div>
    <div class="member" hidden>
      <div class="hi"><img alt="" id="hi-av"><div><h2 style="margin:0;font-size:clamp(22px,3vw,30px);letter-spacing:-.03em">${t("Welcome back", "Chào mừng trở lại")}, <span id="hi-name"></span></h2>
      <p style="margin-top:4px">${t("Here is what has been happening in the yard.", "Đây là những gì đang diễn ra ở OpenYard.")}</p></div></div>
      <div class="acts"><a class="btn dark" href="/submit">${t("Share a project", "Chia sẻ dự án")}</a><a class="btn line" href="/discuss/new">${t("Start a topic", "Mở chủ đề")}</a></div>
    </div>
  </section>
  <div class="lcols">
    <div>
      <div class="htabs reveal" role="tablist" aria-label="Home feed" data-vi-aria-label="Bảng tin">${tab("trending", '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>', ["Trending", "Đang lên"], true)}${tab("new", I.star, ["New", "Mới"], false)}${tab("talk", I.talk, ["Discussions", "Thảo luận"], false)}</div>
      <div class="hpanel" id="panel-trending" role="tabpanel" aria-labelledby="tab-trending">${list(all, true)}
        <div class="morel"><a href="/projects">${t(`All ${all.length} projects`, `Xem cả ${all.length} dự án`)} ${ARROW}</a></div></div>
      <div class="hpanel" id="panel-new" role="tabpanel" aria-labelledby="tab-new" hidden>${list(newest, false)}
        <div class="morel"><a href="/projects">${t(`All ${all.length} projects`, `Xem cả ${all.length} dự án`)} ${ARROW}</a></div></div>
      <div class="hpanel" id="panel-talk" role="tabpanel" aria-labelledby="tab-talk" hidden>
        ${talk.length ? `<ul class="tl2 reveal">${talk.slice(0, 12).map(x => topicRow(x, now)).join("")}</ul>` : `<div class="tl2 empty2">${t("Nothing here yet. Start the first topic.", "Chưa có gì ở đây. Mở chủ đề đầu tiên đi.")}</div>`}
        <div class="morel"><a href="/discuss">${t("All discussions", "Tất cả thảo luận")} ${ARROW}</a></div></div>
    </div>
    ${rail(pulse, now, { top: community, bottom: browse })}
  </div>
</div>`;

  const script = `<script>
(() => {
  const tabs = [...document.querySelectorAll(".htabs [role=tab]")];
  const show = id => tabs.forEach(b => { const on = b.dataset.t === id; b.setAttribute("aria-selected", on); document.getElementById("panel-" + b.dataset.t).hidden = !on; });
  tabs.forEach(b => b.addEventListener("click", () => { show(b.dataset.t); history.replaceState(null, "", b.dataset.t === "trending" ? location.pathname : "#" + b.dataset.t); }));
  const h = location.hash.slice(1); if (tabs.some(b => b.dataset.t === h)) show(h);
  // signed in: a welcome back instead of the introduction (me.js says who it is)
  const hello = u => { if (!u) return; const g = document.querySelector(".hello .guest"), m = document.querySelector(".hello .member");
    document.getElementById("hi-name").textContent = u.name || "@" + u.login; document.getElementById("hi-av").src = u.avatar || "https://github.com/" + u.login + ".png?size=88";
    g.hidden = true; m.hidden = false; };
  if (window.OY_ME) hello(window.OY_ME); else addEventListener("oy-me", e => hello(e.detail));
})();
</script>`;

  const desc = "OpenYard is a community for people who make free software: share the free apps, wild experiments and open-source tools you build, get feedback and help.";
  const jsonld = [
    { "@context": "https://schema.org", "@type": "Organization", name: "OpenYard", url: ORIGIN, logo: `${ORIGIN}/favicon.svg`, sameAs: ["https://github.com/openyard-cloud"] },
    { "@context": "https://schema.org", "@type": "WebSite", name: "OpenYard", url: ORIGIN, inLanguage: ["en", "vi"] },
    { "@context": "https://schema.org", "@type": "ItemList", name: "Trending on OpenYard", itemListElement: all.slice(0, 12).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${ORIGIN}/p/${p.slug}`, name: p.name })) },
  ];
  return page({ vi: { title: "OpenYard: app miễn phí, ý tưởng điên rồ và công cụ mở, mọi repo đều được kiểm tra", desc: "OpenYard là cộng đồng của những người làm phần mềm miễn phí: chia sẻ app miễn phí, thí nghiệm kỳ quặc và công cụ mã nguồn mở bạn làm ra, nhận góp ý và giúp đỡ." },
    title: "OpenYard: free apps, wild ideas and open tools, every repository code-checked", desc, path: "/", jsonld, color: "#7c6cff", site, current: "/", body, css: D_CSS + HOME_CSS, extra: script })
    .replace("<head>", '<head>\n<meta name="google-site-verification" content="2hCCiiJ5g1WgdzfvhrzISgLuNwzjvu_7Q9EiHIDazFw">');
}
