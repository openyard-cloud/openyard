// Pages about people, rendered by the Worker:
//   /welcome     after the first sign-in: what you are into, whether we may email you, the Discord
//   /settings    the same choices later, your projects with edit links, deleting the account
//   /@<login>    public profile: projects someone made and what they said lately
//   /privacy     what we keep and why
// /welcome and /settings are private (no-store); the others are cached like every page.
import { ORIGIN, esc, en, vi, t, ARROW, ic, I, KIND } from "./pages.js";
import { page, card, hero, band, crumbs } from "./hub.js";

const KINDS = [["people", "#10b981"], ["wild", "#b67cff"], ["dev", "#7c9cff"]];
const ACC_CSS = `
.acc>*{max-width:720px}.acc .box{margin-top:18px;padding:24px;border-radius:22px;border:1px solid var(--line2);background:var(--solid)}
.acc .box h2{font-size:19px;letter-spacing:-.02em;margin-bottom:6px}.acc .box>p{margin:0 0 16px;color:var(--muted);font-size:14.5px}
.picks{display:flex;flex-wrap:wrap;gap:8px}
.picks label{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:999px;border:1px solid var(--line2);cursor:pointer;font-size:14.5px;font-weight:500;transition:background .2s,border-color .2s}
.picks input{position:absolute;opacity:0;pointer-events:none}.picks i{width:9px;height:9px;border-radius:50%;background:var(--k)}
.picks label:has(input:checked){border-color:var(--k);background:color-mix(in srgb,var(--k) 14%,transparent)}
.picks label:has(input:focus-visible){outline:2px solid var(--k);outline-offset:2px}
.tick{display:flex;gap:12px;align-items:flex-start;cursor:pointer;font-size:15px;line-height:1.5}.tick input{width:18px;height:18px;margin:2px 0 0;accent-color:#8b7cff;flex:none}
.tick small{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:24px}.acts .msg{font-size:14px;color:var(--muted)}.acts .msg.bad{color:#e03131}
.me-row{display:flex;gap:16px;align-items:center}.me-row img{width:56px;height:56px;border-radius:50%;background:var(--bg2)}.me-row b{display:block;font-size:17px}.me-row span{color:var(--muted);font-size:14px}
.mine{display:grid;gap:8px}.mine .it{border:1px solid var(--line);border-radius:14px}.mine .it a{color:var(--ink)}
.mine .row2{display:flex;gap:8px;margin-left:auto;flex:none}
.danger{border-color:color-mix(in srgb,#ef4444 40%,var(--line2))!important}.danger h2{color:#ef4444}
.danger input{height:42px;padding:0 14px;border-radius:12px;border:1px solid var(--line2);background:var(--bg);color:var(--ink);font:15px ui-monospace,Menlo,monospace;min-width:0;flex:1}
.btn.red{background:#ef4444;color:#fff}.btn.red:disabled{opacity:.45;cursor:default}
.prof{display:flex;gap:22px;align-items:center;flex-wrap:wrap}.prof img{width:96px;height:96px;border-radius:50%;background:var(--bg2);box-shadow:var(--shadow),0 18px 50px -18px var(--c)}
.prof h1{font-size:clamp(36px,5vw,56px)}.prof .sub{color:var(--muted);margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;font-size:14.5px}.prof .sub a{display:inline-flex;align-items:center;gap:4px}.prof .sub a:hover{color:var(--ink)}.prof .ar{width:13px;height:13px}
.bio{max-width:40em;margin:18px 0 0;font-size:17px;color:var(--ink)}
.priv h2{font-size:22px;margin:36px 0 10px}.priv p,.priv li{color:var(--muted);line-height:1.65}.priv ul{padding-left:20px}.priv b{color:var(--ink);font-weight:600}
`;

// Sends the form to /api/me as JSON, then goes on (welcome) or says it is saved (settings).
const ACC_JS = `<script>
(() => {
  const T = (en, vi) => document.documentElement.lang === "vi" ? vi : en;
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
  const form = document.getElementById("acc");
  if (form) {
    const msg = form.querySelector(".msg");
    const read = () => ({ interests: [...form.querySelectorAll("[name=interest]:checked")].map(x => x.value), emailOk: !!form.querySelector("[name=emailOk]")?.checked });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const b = form.querySelector("button[type=submit]"); b.disabled = true; msg.className = "msg"; msg.textContent = "";
      try {
        await post("/api/me", { ...read(), onboarded: true });
        if (form.dataset.back) { location.href = form.dataset.back; return; }
        msg.textContent = T("Saved.", "Đã lưu.");
      } catch (x) { msg.className = "msg bad"; msg.textContent = x.message; } finally { b.disabled = false; }
    });
    form.querySelector("[data-skip]")?.addEventListener("click", async () => { try { await post("/api/me", { onboarded: true }); } catch (x) {} location.href = form.dataset.back; });
  }
  const del = document.getElementById("del");
  if (del) {
    const input = del.querySelector("input"), b = del.querySelector("button"), msg = del.querySelector(".msg");
    input.addEventListener("input", () => b.disabled = input.value.trim().toLowerCase() !== del.dataset.login.toLowerCase());
    del.addEventListener("submit", async e => {
      e.preventDefault(); b.disabled = true;
      try { await post("/api/me/delete", { confirm: input.value.trim() }); location.href = "/"; }
      catch (x) { msg.className = "msg bad"; msg.textContent = x.message; b.disabled = false; }
    });
  }
})();
</script>`;

// only send people back to a page on this site
const safeBack = r => (typeof r === "string" && /^\/(?!\/)[\w\-./?=&#%@]*$/.test(r) && !r.startsWith("/welcome") ? r : "/projects");

const picks = chosen => `<div class="picks">${KINDS.map(([k, c]) => `<label style="--k:${c}"><input type="checkbox" name="interest" value="${k}"${chosen.includes(k) ? " checked" : ""}><i></i>${t(...KIND[k])}</label>`).join("")}</div>`;
const emailBox = user => user.email
  ? `<label class="tick"><input type="checkbox" name="emailOk"${user.email_ok ? " checked" : ""}><span>${t("Email me when someone replies to me or comments on my project, plus a short weekly note on new projects.", "Gửi email cho mình khi có người trả lời mình hoặc bình luận về dự án của mình, kèm một bản tin ngắn mỗi tuần về dự án mới.")}<small>${t(`To ${user.email}. One click to stop, in every email or here in Settings.`, `Gửi tới ${user.email}. Bấm một lần là dừng, ngay trong email hoặc ở trang Cài đặt.`)}</small></span></label>`
  : `<p class="fine" style="margin:0">${t("GitHub did not share an email address with us, so we will not email you. Everything else works the same.", "GitHub không chia sẻ email với chúng mình, nên sẽ không có email nào gửi tới bạn. Mọi thứ khác vẫn dùng bình thường.")}</p>`;

export function welcomePage({ user, site, back }) {
  const go = safeBack(back);
  const body = `${hero(t("Welcome", "Chào mừng"), t(`Hi ${user.name || user.login}, welcome to the yard.`, `Chào ${user.name || user.login}, chào mừng tới OpenYard.`), t("Two quick questions, then you are in. You can change both later in Settings.", "Hai câu hỏi nhanh rồi vào thôi. Sau này đổi lại được ở trang Cài đặt."))}
<div class="wrap acc">
  <form id="acc" data-back="${esc(go)}">
    <div class="box reveal"><h2>${t("What are you into?", "Bạn thích gì?")}</h2><p>${t("We use this to pick what to show you first.", "Để chọn thứ hiện cho bạn trước.")}</p>${picks(JSON.parse(user.interests || "[]"))}</div>
    <div class="box reveal"><h2>${t("Can we email you?", "Gửi email cho bạn được không?")}</h2><p>${t("Off unless you tick it. We never share your address.", "Tắt nếu bạn không tick. Không bao giờ chia sẻ địa chỉ của bạn.")}</p>${emailBox(user)}</div>
    <div class="box reveal"><h2>${t("Say hi on Discord", "Chào mọi người trên Discord")}</h2><p>${t("Most of the talk happens there: #showcase for new projects, #help when you are stuck.", "Phần lớn câu chuyện diễn ra ở đó: #showcase cho dự án mới, #help khi bạn bí.")}</p><a class="btn line" href="${esc(site.discord)}" target="_blank" rel="noopener">${t("Open the Discord", "Mở Discord")} ${ARROW}</a></div>
    <div class="acts"><button class="btn dark" type="submit">${t("Continue", "Tiếp tục")}</button><button class="btn line" type="button" data-skip>${t("Skip for now", "Để sau")}</button><span class="msg" role="status"></span></div>
  </form>
</div>`;
  return page({ title: "Welcome to OpenYard", desc: "Set up your OpenYard account.", path: "/welcome", color: "#8b7cff", site, noindex: true, body, css: ACC_CSS, extra: ACC_JS, jsonld: [] });
}

export function settingsPage({ user, site, mine }) {
  const body = `${hero(t("Settings", "Cài đặt"), t("Your account", "Tài khoản của bạn"), t("Your name, picture and bio come from GitHub. Change them there and sign in again to update them here.", "Tên, ảnh và giới thiệu lấy từ GitHub. Đổi ở GitHub rồi đăng nhập lại để cập nhật ở đây."))}
<div class="wrap acc">
  <div class="box reveal"><div class="me-row"><img src="${esc(user.avatar || `https://github.com/${user.login}.png`)}" alt=""><div><b>${esc(user.name || user.login)}</b><span>@${esc(user.login)}</span></div><a class="btn sm line" style="margin-left:auto" href="/@${esc(user.login)}">${t("View profile", "Xem hồ sơ")}</a></div></div>
  <div class="box reveal"><h2>${t("Your projects", "Dự án của bạn")}</h2><p>${t("Ones you submitted while signed in, or that list you as the maker.", "Những dự án bạn gửi khi đã đăng nhập, hoặc ghi bạn là người làm.")}</p>
    ${mine.length ? `<div class="mine">${mine.map(p => `<div class="it"><div><a href="/p/${esc(p.slug)}"><b>${esc(p.name)}</b></a><small>${t(en(p.tagline), vi(p.tagline))}</small></div><div class="row2"><a class="btn sm line" href="/submit?edit=${esc(p.slug)}">${t("Edit", "Sửa")}</a></div></div>`).join("")}</div>`
      : `<a class="btn line" href="/submit">${t("Submit your first project", "Gửi dự án đầu tiên")} ${ARROW}</a>`}</div>
  <form id="acc">
    <div class="box reveal"><h2>${t("Email", "Email")}</h2><p>${t("Nothing is sent unless this is on.", "Không gửi gì nếu chưa bật.")}</p>${emailBox(user)}</div>
    <div class="box reveal"><h2>${t("What you are into", "Bạn thích gì")}</h2><p>${t("Used to pick what to show you first.", "Dùng để chọn thứ hiện cho bạn trước.")}</p>${picks(JSON.parse(user.interests || "[]"))}</div>
    <div class="acts"><button class="btn dark" type="submit">${t("Save", "Lưu")}</button><span class="msg" role="status"></span></div>
  </form>
  <form class="box danger reveal" id="del" data-login="${esc(user.login)}"><h2>${t("Delete your account", "Xoá tài khoản")}</h2>
    <p>${t("Your profile goes away, your email address is erased and your comments are emptied. Projects stay listed, without your account attached. This cannot be undone.", "Hồ sơ sẽ biến mất, email bị xoá và nội dung bình luận bị xoá trắng. Dự án vẫn còn trên OpenYard nhưng không gắn với tài khoản của bạn nữa. Không thể hoàn tác.")}</p>
    <label class="sr" for="delc">${t("Type your GitHub username", "Gõ tên GitHub của bạn")}</label>
    <div class="acts" style="margin-top:0"><input id="delc" autocomplete="off" spellcheck="false" placeholder="${esc(user.login)}"><button class="btn red" type="submit" disabled>${t("Delete account", "Xoá tài khoản")}</button><span class="msg" role="status"></span></div>
  </form>
</div>`;
  return page({ title: "Settings · OpenYard", desc: "Your OpenYard account.", path: "/settings", color: "#8b7cff", site, noindex: true, body, css: ACC_CSS, extra: ACC_JS, jsonld: [] });
}

const joined = ms => { const d = new Date(ms); return [d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), `tháng ${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`]; };

/** person is null for a maker who is listed on a project but has never signed in. */
export function profilePage({ login, person, made, talk, site, now }) {
  const name = person?.name || login, url = `${ORIGIN}/@${login}`, avatar = person?.avatar || `https://github.com/${login}.png?size=192`;
  const when = person ? joined(person.created_at) : null;
  const body = `<header class="hero hub"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">
  <div class="prof up" style="--d:1"><img src="${esc(avatar)}" alt="" width="96" height="96"><div>
    <h1>${esc(name)}</h1>
    <div class="sub"><a href="https://github.com/${esc(login)}" target="_blank" rel="noopener">@${esc(login)} ${ARROW}</a>${when ? `<span>${t(`Joined ${when[0]}`, `Tham gia ${when[1]}`)}</span>` : ""}<span>${t(`${made.length} project${made.length === 1 ? "" : "s"}`, `${made.length} dự án`)}</span></div>
  </div></div>
  ${person?.bio ? `<p class="bio up" style="--d:2">${esc(person.bio)}</p>` : ""}
</div></header>
<div class="wrap">
  ${made.length ? `<section><h2 class="reveal" style="font-size:clamp(24px,3vw,32px);margin-bottom:18px">${t("Projects", "Dự án")}</h2><div class="pgrid">${made.map(card).join("")}</div></section>` : ""}
  ${talk.length ? `<section class="sec"><div class="list reveal"><h3>${t("Recent comments", "Bình luận gần đây")}</h3>${talk.map(c => `<a class="it" href="/p/${esc(c.slug)}#comments">${ic(I.talk, "st open")}<div>${esc(c.body.length > 180 ? c.body.slice(0, 180) + "…" : c.body)}<small>${t("on", "trên")} ${esc(c.name)}</small></div></a>`).join("")}</div></section>` : ""}
  ${!made.length && !talk.length ? `<p class="fine">${t("Nothing here yet.", "Chưa có gì ở đây.")}</p>` : ""}
  ${band()}
</div>`;
  const desc = `${name} (@${login}) on OpenYard${made.length ? `: maker of ${made.map(p => p.name).join(", ")}` : ""}.${person?.bio ? ` ${person.bio}` : ""}`.slice(0, 300);
  return page({ title: `${name} (@${login}) · OpenYard`, desc, path: `/@${login}`, color: made[0]?.color || "#8b7cff", site, body, css: ACC_CSS, noindex: !made.length && !talk.length,
    jsonld: [{ "@context": "https://schema.org", "@type": "ProfilePage", url, mainEntity: { "@type": "Person", name, alternateName: login, image: avatar, ...(person?.bio ? { description: person.bio } : {}), sameAs: [`https://github.com/${login}`] } },
      crumbs([["OpenYard", ORIGIN], [name, url]])] });
}

export function privacyPage({ site }) {
  const sec = (h, items) => `<h2>${t(...h)}</h2>${items.map(x => Array.isArray(x[0]) ? `<ul>${x.map(li => `<li>${t(...li)}</li>`).join("")}</ul>` : `<p>${t(...x)}</p>`).join("")}`;
  const body = `${hero(t("Privacy", "Quyền riêng tư"), t("What we keep, and why", "Chúng mình giữ gì, và vì sao"), t("Short version: as little as we can, never sold, and you can delete it yourself.", "Tóm tắt: giữ ít nhất có thể, không bao giờ bán, và bạn tự xoá được."))}
<div class="wrap acc priv">
  ${sec(["When you sign in with GitHub", "Khi bạn đăng nhập bằng GitHub"], [[
    ["Your GitHub id, username, name, picture and bio, from your public profile.", "Id, tên người dùng, tên, ảnh và giới thiệu trên hồ sơ GitHub công khai của bạn."],
    ["Your primary verified email address, if GitHub shares it. We only email you if you turn that on, and every email has a one-click way to stop.", "Email chính đã xác minh, nếu GitHub chia sẻ. Chỉ gửi email khi bạn bật, và email nào cũng có nút dừng một chạm."],
    ["What you pick on the welcome page: your interests and whether we may email you, with the time you said so.", "Những gì bạn chọn ở trang chào mừng: sở thích và việc có nhận email hay không, kèm thời điểm bạn chọn."],
    ["A sign-in cookie. We store only a hash of it, and it expires after 30 days. We keep no GitHub token.", "Một cookie đăng nhập. Chỉ lưu bản băm của nó, hết hạn sau 30 ngày. Không giữ token GitHub nào."],
  ]])}
  ${sec(["When you use the site", "Khi bạn dùng trang"], [[
    ["Projects you submit and comments you write are public, with your username.", "Dự án bạn gửi và bình luận bạn viết là công khai, kèm tên người dùng của bạn."],
    ["To stop spam we keep a hash of your IP address mixed with the date, for two days. It cannot be turned back into your IP.", "Để chống spam, chúng mình giữ bản băm của IP trộn với ngày, trong hai ngày. Không thể đổi ngược lại thành IP."],
    ["Clicks on a project's link are counted per day, with nothing about who clicked.", "Lượt bấm vào link dự án được đếm theo ngày, không kèm thông tin ai bấm."],
  ]])}
  ${sec(["Who else sees it", "Ai khác thấy"], [
    ["The site runs on Cloudflare. New projects are posted to our Discord server. Nobody else gets your data, and we never sell it.", "Trang chạy trên Cloudflare. Dự án mới được đăng lên server Discord của chúng mình. Ngoài ra không ai nhận dữ liệu của bạn, và chúng mình không bao giờ bán nó."],
  ])}
  ${sec(["Your choices", "Lựa chọn của bạn"], [
    ["In Settings you can turn email off, change your interests, or delete your account. Deleting erases your email and profile and empties your comments straight away.", "Ở trang Cài đặt bạn có thể tắt email, đổi sở thích hoặc xoá tài khoản. Xoá tài khoản sẽ xoá ngay email, hồ sơ và nội dung bình luận."],
    ["Questions: ask on Discord or open an issue on GitHub.", "Có câu hỏi: hỏi trên Discord hoặc mở issue trên GitHub."],
  ])}
  <div class="acts"><a class="btn line" href="/settings">${t("Open Settings", "Mở Cài đặt")}</a><a class="btn line" href="${esc(site.discord)}" target="_blank" rel="noopener">Discord ${ARROW}</a></div>
</div>`;
  return page({ title: "Privacy · OpenYard", desc: "What OpenYard keeps about you, why, and how to delete it.", path: "/privacy", color: "#10b981", site, body, css: ACC_CSS,
    jsonld: [crumbs([["OpenYard", ORIGIN], ["Privacy", `${ORIGIN}/privacy`]])] });
}
