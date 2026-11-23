// Pages about people, rendered by the Worker:
//   /welcome     after the first sign-in: what you are into, whether we may email you, where to talk
//   /settings    the same choices later, your projects with edit links, deleting the account
//   /@<login>    public profile: projects someone made and what they said lately
//   /privacy     what we keep and why
// /welcome and /settings are private (no-store); the others are cached like every page.
import { ORIGIN, esc, en, vi, t, ARROW, ic, I, KIND, svg } from "./pages.js";
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
.fld{display:flex;flex-direction:column;gap:6px;margin-top:12px}.fld label{font-size:13px;font-weight:500;color:var(--muted)}
.fld input,.fld textarea,.sgn input{height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--line2);background:var(--bg);color:var(--ink);font:15px Inter,system-ui,sans-serif;outline:0}
.fld textarea{height:auto;padding:10px 14px;resize:vertical}.fld input:focus,.fld textarea:focus,.sgn input:focus{border-color:#8b7cff;box-shadow:0 0 0 4px rgba(139,124,255,.16)}
.sgn{display:flex;flex-direction:column;gap:10px}.sgn .btn{width:100%}.or{display:flex;align-items:center;gap:12px;color:var(--muted);font-size:13px;margin:6px 0}.or::before,.or::after{content:"";flex:1;height:1px;background:var(--line2)}
.btn.gh svg{width:18px;height:18px}
.solo .hero.hub{padding:72px 0 30px}.solo .hero .wrap{max-width:520px;text-align:center}.solo .hero .tags{justify-content:center}
.solo .hero h1{font-size:clamp(38px,5vw,54px)}.solo .hero .desc{margin:12px auto 0;max-width:30em}
.solo .acc{max-width:520px;padding-bottom:24px}.solo .acc>*{max-width:none}.solo .acc>.fine{text-align:center;margin-top:16px}
.solo .sgn .box,.solo .sgn>p{text-align:left}.otp{font:600 26px ui-monospace,SFMono-Regular,Menlo,monospace!important;letter-spacing:.4em;text-align:center;height:56px!important}.btn.gh svg{width:18px;height:18px}
.danger{border-color:color-mix(in srgb,#ef4444 40%,var(--line2))!important}.danger h2{color:#ef4444}
.danger input{height:42px;padding:0 14px;border-radius:12px;border:1px solid var(--line2);background:var(--bg);color:var(--ink);font:15px ui-monospace,Menlo,monospace;min-width:0;flex:1}
.btn.red{background:#ef4444;color:#fff}.btn.red:disabled{opacity:.45;cursor:default}
.prof{display:flex;gap:22px;align-items:center;flex-wrap:wrap}.prof img{width:96px;height:96px;border-radius:50%;background:var(--bg2);box-shadow:var(--shadow),0 18px 50px -18px var(--c)}
.prof h1{font-size:clamp(36px,5vw,56px)}.prof .sub{color:var(--muted);margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;font-size:14.5px}.prof .sub a{display:inline-flex;align-items:center;gap:4px}.prof .sub a:hover{color:var(--ink)}.prof .ar{width:13px;height:13px}
.bio{max-width:40em;margin:18px 0 0;font-size:17px;color:var(--ink)}
.col .hero .wrap,.col .acc{max-width:768px}.col .acc>*{max-width:none}
.priv h2{font-size:22px;margin:36px 0 10px}.priv p,.priv li{color:var(--muted);line-height:1.65}.priv ul{padding-left:20px}.priv b{color:var(--ink);font-weight:600}
`;

// Sends the form to /api/me as JSON, then goes on (welcome) or says it is saved (settings).
const ACC_JS = `<script>
(() => {
  const T = (en, vi) => document.documentElement.lang === "vi" ? vi : en;
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error((document.documentElement.lang === "vi" && d.error_vi || d.error)); return d; });
  const form = document.getElementById("acc");
  if (form) {
    const msg = form.querySelector(".msg");
    const val = n => { const el = form.querySelector("[name=" + n + "]"); return el ? { [n]: el.value } : {}; };
    const read = () => ({ interests: [...form.querySelectorAll("[name=interest]:checked")].map(x => x.value), emailOk: !!form.querySelector("[name=emailOk]")?.checked, ...val("login"), ...val("name"), ...val("bio") });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const b = form.querySelector("button[type=submit]"); b.disabled = true; msg.className = "msg"; msg.textContent = "";
      try {
        await post("/api/me", { ...read(), onboarded: true, lang: document.documentElement.lang });
        if (form.dataset.back) { location.href = form.dataset.back; return; }
        msg.textContent = T("Saved.", "Đã lưu.");
      } catch (x) { msg.className = "msg bad"; msg.textContent = x.message; } finally { b.disabled = false; }
    });
    form.querySelector("[data-skip]")?.addEventListener("click", async () => { try { await post("/api/me", { onboarded: true, lang: document.documentElement.lang }); } catch (x) {} location.href = form.dataset.back; });
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

// email accounts: how they show up (nickname, name, a line about them)
const idBox = (user, first) => user.provider !== "email" ? "" : `<div class="box reveal"><h2>${first ? t("How should people see you?", "Mọi người sẽ thấy bạn thế nào?") : t("Your name in the yard", "Tên của bạn trên OpenYard")}</h2>
  <p>${t("Your nickname is your address: openyard.cloud/@nickname. Your picture is made from your name.", "Biệt danh là địa chỉ của bạn: openyard.cloud/@bietdanh. Ảnh đại diện được tạo từ tên của bạn.")}</p>
  <div class="me-row" style="margin-bottom:14px"><img src="${esc(user.avatar || "/favicon.svg")}" alt=""><div><b>${esc(user.name || user.login)}</b><span>@${esc(user.login)}</span></div></div>
  <div class="fld"><label for="f-login">${t("Nickname", "Biệt danh")}</label><input id="f-login" name="login" value="${esc(user.login)}" maxlength="24" autocomplete="username" spellcheck="false" pattern="[a-z0-9][a-z0-9-]{1,22}[a-z0-9]"></div>
  <div class="fld"><label for="f-name">${t("Display name", "Tên hiển thị")}</label><input id="f-name" name="name" value="${esc(user.name || "")}" maxlength="40" placeholder="Lan Trần"></div>
  ${first ? "" : `<div class="fld"><label for="f-bio">${t("About you", "Giới thiệu")}</label><textarea id="f-bio" name="bio" maxlength="200" rows="2">${esc(user.bio || "")}</textarea></div>`}
</div>`;

const picks = chosen => `<div class="picks">${KINDS.map(([k, c]) => `<label style="--k:${c}"><input type="checkbox" name="interest" value="${k}"${chosen.includes(k) ? " checked" : ""}><i></i>${t(...KIND[k])}</label>`).join("")}</div>`;
// on: ticked by default on /welcome; Settings shows what the person saved
const emailBox = (user, on = !!user.email_ok) => user.email
  ? `<label class="tick"><input type="checkbox" name="emailOk"${on ? " checked" : ""}><span>${t("Email me when someone replies to me or comments on my project, plus a short weekly note on new projects.", "Gửi email cho mình khi có người trả lời mình hoặc bình luận về dự án của mình, kèm một bản tin ngắn mỗi tuần về dự án mới.")}<small>${t(`To ${user.email}. One click to stop, in every email or here in Settings.`, `Gửi tới ${user.email}. Bấm một lần là dừng, ngay trong email hoặc ở trang Cài đặt.`)}</small></span></label>`
  : `<p class="fine" style="margin:0">${t("GitHub did not share an email address with us, so we will not email you. Everything else works the same.", "GitHub không chia sẻ email với chúng mình, nên sẽ không có email nào gửi tới bạn. Mọi thứ khác vẫn dùng bình thường.")}</p>`;

export function welcomePage({ user, site, back }) {
  const go = safeBack(back);
  const body = `${hero(t("Welcome", "Chào mừng"), t(`Hi ${user.name || user.login}, welcome to the yard.`, `Chào ${user.name || user.login}, chào mừng tới OpenYard.`), t("Two quick questions, then you are in. You can change both later in Settings.", "Hai câu hỏi nhanh rồi vào thôi. Sau này đổi lại được ở trang Cài đặt."))}
<div class="wrap acc">
  <form id="acc" data-back="${esc(go)}">
    ${idBox(user, true)}
    <div class="box reveal"><h2>${t("What are you into?", "Bạn thích gì?")}</h2><p>${t("We use this to pick what to show you first.", "Để chọn thứ hiện cho bạn trước.")}</p>${picks(JSON.parse(user.interests || "[]"))}</div>
    <div class="box reveal"><h2>${t("Can we email you?", "Gửi email cho bạn được không?")}</h2><p>${t("Untick it to get nothing. We never share your address.", "Bỏ tick nếu không muốn nhận gì. Không bao giờ chia sẻ địa chỉ của bạn.")}</p>${emailBox(user, true)}</div>
    <div class="box reveal"><h2>${t("Say hi", "Chào mọi người")}</h2><p>${t("The talk happens in Discuss: Showcase for new projects, Help when you are stuck.", "Mọi người trò chuyện ở mục Thảo luận: Khoe dự án cho dự án mới, Hỏi đáp khi bạn bí.")}</p><a class="btn line" href="/discuss/general" target="_blank" rel="noopener">${t("Open Discuss", "Mở Thảo luận")} ${ARROW}</a></div>
    <div class="acts"><button class="btn dark" type="submit">${t("Continue", "Tiếp tục")}</button><button class="btn line" type="button" data-skip>${t("Skip for now", "Để sau")}</button><span class="msg" role="status"></span></div>
  </form>
</div>`;
  return page({ title: "Welcome to OpenYard", desc: "Set up your OpenYard account.", path: "/welcome", color: "#8b7cff", site, noindex: true, body: `<div class="col">${body}</div>`, css: ACC_CSS, extra: ACC_JS, jsonld: [] });
}

export function settingsPage({ user, site, mine }) {
  const body = `${hero(t("Settings", "Cài đặt"), t("Your account", "Tài khoản của bạn"), user.provider === "email" ? t(`Signed in with ${user.email}.`, `Đăng nhập bằng ${user.email}.`) : t("Your name, picture and bio come from GitHub. Change them there and sign in again to update them here.", "Tên, ảnh và giới thiệu lấy từ GitHub. Đổi ở GitHub rồi đăng nhập lại để cập nhật ở đây."))}
<div class="wrap acc">
  <div class="box reveal"><div class="me-row"><img src="${esc(user.avatar || `https://github.com/${user.login}.png`)}" alt=""><div><b>${esc(user.name || user.login)}</b><span>@${esc(user.login)}</span></div><a class="btn sm line" style="margin-left:auto" href="/@${esc(user.login)}">${t("View profile", "Xem hồ sơ")}</a></div></div>
  <div class="box reveal"><h2>${t("Your projects", "Dự án của bạn")}</h2><p>${t("Ones you submitted while signed in, or that list you as the maker.", "Những dự án bạn gửi khi đã đăng nhập, hoặc ghi bạn là người làm.")}</p>
    ${mine.length ? `<div class="mine">${mine.map(p => `<div class="it"><div><a href="/p/${esc(p.slug)}"><b>${esc(p.name)}</b></a><small>${t(en(p.tagline), vi(p.tagline))}</small></div><div class="row2"><a class="btn sm line" href="/submit?edit=${esc(p.slug)}">${t("Edit", "Sửa")}</a></div></div>`).join("")}</div>`
      : `<a class="btn line" href="/submit">${t("Submit your first project", "Gửi dự án đầu tiên")} ${ARROW}</a>`}</div>
  <form id="acc">
    ${idBox(user, false)}
    <div class="box reveal"><h2>${t("Email", "Email")}</h2><p>${t("Nothing is sent unless this is on.", "Không gửi gì nếu chưa bật.")}</p>${emailBox(user)}</div>
    <div class="box reveal"><h2>${t("What you are into", "Bạn thích gì")}</h2><p>${t("Used to pick what to show you first.", "Dùng để chọn thứ hiện cho bạn trước.")}</p>${picks(JSON.parse(user.interests || "[]"))}</div>
    <div class="acts"><button class="btn dark" type="submit">${t("Save", "Lưu")}</button><span class="msg" role="status"></span></div>
  </form>
  <form class="box danger reveal" id="del" data-login="${esc(user.login)}"><h2>${t("Delete your account", "Xoá tài khoản")}</h2>
    <p>${t("Your profile goes away, your email address is erased and your comments are emptied. Projects stay listed, without your account attached. This cannot be undone.", "Hồ sơ sẽ biến mất, email bị xoá và nội dung bình luận bị xoá trắng. Dự án vẫn còn trên OpenYard nhưng không gắn với tài khoản của bạn nữa. Không thể hoàn tác.")}</p>
    <label class="sr" for="delc">${t("Type your nickname", "Gõ biệt danh của bạn")}</label>
    <div class="acts" style="margin-top:0"><input id="delc" autocomplete="off" spellcheck="false" placeholder="${esc(user.login)}"><button class="btn red" type="submit" disabled>${t("Delete account", "Xoá tài khoản")}</button><span class="msg" role="status"></span></div>
  </form>
</div>`;
  return page({ title: "Settings · OpenYard", desc: "Your OpenYard account.", path: "/settings", color: "#8b7cff", site, noindex: true, body: `<div class="col">${body}</div>`, css: ACC_CSS, extra: ACC_JS, jsonld: [] });
}

const joined = ms => { const d = new Date(ms); return [d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), `tháng ${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`]; };

/** person is null for a maker who is listed on a project but has never signed in. */
export function profilePage({ login, person, made, talk, site, now }) {
  const gh = !person || person.provider !== "email";
  const name = person?.name || login, url = `${ORIGIN}/@${login}`, avatar = person?.avatar || `https://github.com/${login}.png?size=192`;
  const when = person ? joined(person.created_at) : null;
  const body = `<header class="hero hub"><div class="aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">
  <div class="prof up" style="--d:1"><img src="${esc(avatar)}" alt="" width="96" height="96"><div>
    <h1>${esc(name)}</h1>
    <div class="sub">${gh ? `<a href="https://github.com/${esc(login)}" target="_blank" rel="noopener">@${esc(login)} ${ARROW}</a>` : `<span>@${esc(login)}</span>`}${when ? `<span>${t(`Joined ${when[0]}`, `Tham gia ${when[1]}`)}</span>` : ""}<span>${t(`${made.length} project${made.length === 1 ? "" : "s"}`, `${made.length} dự án`)}</span></div>
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
    jsonld: [{ "@context": "https://schema.org", "@type": "ProfilePage", url, mainEntity: { "@type": "Person", name, alternateName: login, image: avatar, ...(person?.bio ? { description: person.bio } : {}), ...(gh ? { sameAs: [`https://github.com/${login}`] } : {}) } },
      crumbs([["OpenYard", ORIGIN], [name, url]])] });
}

const GH = "M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z";
/** /signin: GitHub, or a one-time link by email for everyone else. */
export function signinPage({ site, back, expired, turnstile }) {
  const go = safeBack(back);
  const body = `${hero(t("Sign in", "Đăng nhập"), t("Join the yard", "Tham gia OpenYard"), t("Comment, like projects and start discussions. No password: use GitHub, or get a one-time code by email.", "Bình luận, thích dự án và mở thảo luận. Không cần mật khẩu: dùng GitHub, hoặc nhận mã đăng nhập qua email."))}
<div class="wrap acc">
  ${expired ? `<p class="box" style="border-color:#f59e0b">${t("That link has expired or was already used. Ask for a new one below.", "Link đó đã hết hạn hoặc đã được dùng. Hãy lấy link mới bên dưới.")}</p>` : ""}
  <div class="box reveal sgn">
    <a class="btn line gh" href="/auth/github?return=${encodeURIComponent(go)}">${svg(GH)}${t("Continue with GitHub", "Tiếp tục với GitHub")}</a>
    <div class="or">${t("or", "hoặc")}</div>
    <form id="mail" class="sgn" data-ts="${esc(turnstile || "")}" data-back="${esc(go)}" novalidate>
      <label class="sr" for="em">Email</label><input id="em" type="email" autocomplete="email" required placeholder="you@example.com">
      <div id="ts"></div>
      <button class="btn dark" type="submit">${t("Email me a code", "Gửi mã qua email")}</button>
      <p class="msg fine" role="status" style="margin:0"></p>
    </form>
  </div>
  <p class="fine">${t("New here? The code makes your account. You pick a nickname next, and you can change it any time.", "Mới tới? Mã sẽ tạo tài khoản cho bạn. Bước sau bạn chọn biệt danh, đổi lúc nào cũng được.")} <a href="/privacy">${t("Privacy", "Quyền riêng tư")}</a></p>
</div>`;
  const js = `<script>
(() => {
  const f = document.getElementById("mail"), msg = f.querySelector(".msg"), key = f.dataset.ts, T = (e, v) => document.documentElement.lang === "vi" ? v : e;
  if (key) { window.onTs = () => turnstile.render("#ts", { sitekey: key, theme: "auto", appearance: "interaction-only" }); const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTs&render=explicit"; s.async = true; document.head.appendChild(s); }
  // step two: the 6-digit code from the email (the link in it works too)
  const code = email => {
    const safe = email.replace(/[<>&"]/g, "");
    f.innerHTML = '<p style="margin:0"><b>' + T("Check your email", "Kiểm tra email của bạn") + '</b><br>' + T("We sent a 6-digit code to ", "Chúng mình đã gửi mã 6 số tới ") + safe + T(". Type it here, or press the button in the email.", ". Nhập mã ở đây, hoặc bấm nút trong email.") + '</p>'
      + '<label class="sr" for="otp">' + T("Code", "Mã") + '</label><input id="otp" class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">'
      + '<button class="btn dark" type="submit">' + T("Sign in", "Đăng nhập") + '</button><p class="msg fine" role="status" style="margin:0"></p>'
      + '<p class="fine" style="margin:0"><a href="#" id="again">' + T("Use another email or send a new code", "Dùng email khác hoặc gửi mã mới") + '</a></p>';
    const otp = f.querySelector("#otp"), m = f.querySelector(".msg"), b = f.querySelector("button");
    otp.focus();
    const go = async () => {
      const v = otp.value.replace(/\\D/g, "");
      if (v.length !== 6) { m.textContent = T("Type the 6 digits from the email.", "Nhập đủ 6 số trong email."); return; }
      b.disabled = true; m.textContent = "";
      try {
        const r = await fetch("/auth/email/code", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: v }) });
        const d = await r.json();
        if (!r.ok) throw new Error(document.documentElement.lang === "vi" && d.error_vi ? d.error_vi : r.status === 400 ? T("That code is not right. Check the email and try again.", "Mã chưa đúng. Kiểm tra email rồi thử lại.") : r.status === 410 ? T("That code has expired. Send a new one.", "Mã đã hết hạn. Hãy gửi mã mới.") : r.status === 429 ? T("Too many wrong codes. Send a new one.", "Sai quá nhiều lần. Hãy gửi mã mới.") : d.error);
        location.href = d.go;
      } catch (x) { m.textContent = x.message; b.disabled = false; otp.select(); }
    };
    otp.addEventListener("input", () => { otp.value = otp.value.replace(/\\D/g, "").slice(0, 6); if (otp.value.length === 6) go(); });
    f.onsubmit = e => { e.preventDefault(); e.stopImmediatePropagation(); go(); };
    f.querySelector("#again").addEventListener("click", e => { e.preventDefault(); location.reload(); });
  };
  f.addEventListener("submit", async e => {
    if (f.querySelector("#otp")) return;
    e.preventDefault();
    const email = f.querySelector("input").value.trim(), b = f.querySelector("button");
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { msg.textContent = T("Type your email address.", "Nhập địa chỉ email của bạn."); return; }
    b.disabled = true; msg.textContent = "";
    let ts = ""; for (let i = 0; key && i < 40 && !(ts = window.turnstile ? turnstile.getResponse() || "" : ""); i++) await new Promise(r => setTimeout(r, 250));
    try {
      const r = await fetch("/auth/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, back: f.dataset.back, ts, lang: document.documentElement.lang }) });
      const d = await r.json();
      if (!r.ok) throw new Error((document.documentElement.lang === "vi" && d.error_vi || d.error));
      code(email);
    } catch (x) { msg.textContent = x.message; b.disabled = false; if (key && window.turnstile) turnstile.reset(); }
  });
})();
</script>`;
  return page({ title: "Sign in · OpenYard", desc: "Sign in to OpenYard with GitHub or by email.", path: "/signin", color: "#8b7cff", site, noindex: true, body: `<div class="solo">${body}</div>`, css: ACC_CSS, extra: js, jsonld: [] });
}

/** What the emailed link opens: a button, so link scanners in mail apps cannot use it up. */
export function signinConfirmPage({ site, token }) {
  const body = `${hero(t("Sign in", "Đăng nhập"), t("One more click", "Bấm thêm một lần"), t("Press the button to finish signing in to OpenYard.", "Bấm nút để hoàn tất đăng nhập OpenYard."))}
<div class="wrap acc"><form class="box sgn" method="post" action="/auth/email/confirm"><input type="hidden" name="t" value="${esc(token)}"><button class="btn dark" type="submit">${t("Sign in to OpenYard", "Đăng nhập OpenYard")}</button></form></div>`;
  return page({ title: "Sign in · OpenYard", desc: "Finish signing in.", path: "/auth/email", color: "#8b7cff", site, noindex: true, body: `<div class="solo">${body}</div>`, css: ACC_CSS, jsonld: [] });
}

/** /claim/<slug>: prove a listing that came in without an account is yours. */
export function claimPage({ p, user, token, github, mine, taken, site }) {
  const host = (() => { try { return new URL(p.url).hostname; } catch { return ""; } })();
  const meta = `<meta name="openyard-verify" content="${token}">`;
  const way = (n, title, body) => `<div class="box reveal"><h2><span class="stepn">${n}</span>${title}</h2>${body}</div>`;
  const copy = v => `<div class="snip"><code>${esc(v)}</code><button class="btn sm line" type="button" data-copy="${esc(v)}">${t("Copy", "Copy")}</button></div>`;
  const check = how => `<div class="acts" style="margin-top:12px"><button class="btn dark" type="button" data-how="${how}">${t("Check", "Kiểm tra")}</button><span class="msg" role="status"></span></div>`;
  const body = `${hero(t("Claim", "Nhận dự án"), esc(p.name), mine ? t("This project is yours.", "Dự án này là của bạn.") : taken ? t("This project already belongs to an account.", "Dự án này đã thuộc về một tài khoản.") : t(`Show that ${host} is yours. The listing then belongs to @${user.login}: you can edit it, and you hear about comments and likes.`, `Chứng minh ${host} là của bạn. Sau đó dự án thuộc về @${user.login}: bạn sửa được, và nhận thông báo khi có bình luận hay lượt thích.`))}
<div class="wrap acc">
  ${mine || taken ? `<div class="acts"><a class="btn dark" href="/p/${esc(p.slug)}">${t("Back to the project", "Về trang dự án")}</a>${mine ? `<a class="btn line" href="/submit?edit=${esc(p.slug)}">${t("Edit it", "Sửa dự án")}</a>` : ""}</div>` : `
  ${github ? way("✓", t("Your GitHub account matches", "Tài khoản GitHub của bạn khớp"), `<p>${t("You own the project's repository or are its listed maker, so you can claim it right away.", "Bạn sở hữu repo của dự án hoặc là người làm được ghi tên, nên có thể nhận ngay.")}</p>${check("github")}`) : ""}
  ${way(1, t("Add a tag to your page", "Thêm một thẻ vào trang của bạn"), `<p>${t(`Put this in the <head> of ${host}, publish, then check.`, `Đặt dòng này trong <head> của ${host}, đăng lên, rồi bấm kiểm tra.`)}</p>${copy(meta)}${check("meta")}`)}
  ${way(2, t("Or add a DNS record", "Hoặc thêm một bản ghi DNS"), `<p>${t("No access to the HTML? Add a TXT record instead.", "Không sửa được HTML? Thêm bản ghi TXT thay thế.")}</p>
    <dl class="dns"><dt>${t("Type", "Loại")}</dt><dd><code>TXT</code></dd><dt>${t("Name", "Tên")}</dt><dd>${copy(`_openyard.${host}`)}</dd><dt>${t("Value", "Giá trị")}</dt><dd>${copy(`openyard-verify=${token}`)}</dd></dl>${check("dns")}`)}
  <div class="box reveal"><label class="tick"><input type="checkbox" id="emailOk" checked><span>${t("Email me when people comment on or like this project", "Gửi email cho mình khi có người bình luận hay thích dự án này")}<small>${user.email ? t(`To ${user.email}. One click to stop, in every email.`, `Tới ${user.email}. Dừng bằng một chạm, ngay trong email.`) : t("Your account has no email address, so there is nothing to send to.", "Tài khoản của bạn chưa có email, nên không có chỗ để gửi.")}</small></span></label></div>
  <p class="fine">${t("You can remove the tag or record once the claim is done.", "Nhận xong thì có thể gỡ thẻ hoặc bản ghi đi.")}</p>`}
</div>`;
  const js = mine || taken ? "" : `<script>
(() => {
  const T = (e, v) => document.documentElement.lang === "vi" ? v : e;
  document.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = T("Copied", "Đã copy"); setTimeout(() => b.textContent = "Copy", 1500); } catch (e) {} }));
  document.querySelectorAll("[data-how]").forEach(b => b.addEventListener("click", async () => {
    const msg = b.parentElement.querySelector(".msg"); b.disabled = true; msg.className = "msg"; msg.textContent = T("Checking…", "Đang kiểm tra…");
    try {
      const r = await fetch("/api/claim/${esc(p.slug)}", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ how: b.dataset.how, emailOk: document.getElementById("emailOk").checked }) });
      const d = await r.json();
      if (!r.ok) throw new Error(document.documentElement.lang === "vi" && d.error_vi || d.error);
      msg.textContent = T("Done, it is yours.", "Xong, dự án là của bạn."); location.href = d.page;
    } catch (x) { msg.className = "msg bad"; msg.textContent = x.message; b.disabled = false; }
  }));
})();
</script>`;
  return page({ title: `Claim ${p.name} · OpenYard`, desc: "Claim a listing on OpenYard.", path: `/claim/${p.slug}`, color: p.color || "#8b7cff", site, noindex: true, body, css: ACC_CSS + CLAIM_CSS, extra: js, jsonld: [] });
}
const CLAIM_CSS = `
.stepn{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;margin-right:10px;font-size:13px;color:#fff;background:linear-gradient(135deg,#7c9cff,#b67cff,#ff7eb0);vertical-align:2px}
.snip{display:flex;gap:8px;align-items:center;margin-top:8px}.snip code{flex:1;min-width:0;overflow-x:auto;white-space:nowrap;padding:10px 12px;border-radius:12px;background:var(--bg);border:1px solid var(--line2);font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
.dns{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px 14px;align-items:center;margin:8px 0 0}.dns dt{font-size:13px;color:var(--muted)}.dns dd{margin:0}.dns dd .snip{margin:0}
`;

export function privacyPage({ site }) {
  const sec = (h, items) => `<h2>${t(...h)}</h2>${items.map(x => Array.isArray(x[0]) ? `<ul>${x.map(li => `<li>${t(...li)}</li>`).join("")}</ul>` : `<p>${t(...x)}</p>`).join("")}`;
  const body = `${hero(t("Privacy", "Quyền riêng tư"), t("What we keep, and why", "Chúng mình giữ gì, và vì sao"), t("Short version: as little as we can, never sold, and you can delete it yourself.", "Tóm tắt: giữ ít nhất có thể, không bao giờ bán, và bạn tự xoá được."))}
<div class="wrap acc priv">
  ${sec(["When you sign in", "Khi bạn đăng nhập"], [[
    ["Your GitHub id, username, name, picture and bio, from your public profile.", "Id, tên người dùng, tên, ảnh và giới thiệu trên hồ sơ GitHub công khai của bạn."],
    ["Or, if you sign in by email: that address, and the nickname, name and line about you that you choose. Your picture is generated from your name.", "Hoặc, nếu bạn đăng nhập bằng email: địa chỉ đó, cùng biệt danh, tên và lời giới thiệu bạn chọn. Ảnh đại diện được tạo từ tên của bạn."],
    ["Your primary verified email address, if GitHub shares it. Email is ticked on the welcome page; untick it there or in Settings to get nothing, and every email has a one-click way to stop.", "Email chính đã xác minh, nếu GitHub chia sẻ. Ở trang chào mừng, ô nhận email được tick sẵn; bỏ tick ở đó hoặc ở Cài đặt để không nhận gì, và email nào cũng có nút dừng một chạm."],
    ["What you pick on the welcome page: your interests and whether we may email you, with the time you said so.", "Những gì bạn chọn ở trang chào mừng: sở thích và việc có nhận email hay không, kèm thời điểm bạn chọn."],
    ["A sign-in cookie. We store only a hash of it, and it expires after 30 days. We keep no GitHub token.", "Một cookie đăng nhập. Chỉ lưu bản băm của nó, hết hạn sau 30 ngày. Không giữ token GitHub nào."],
  ]])}
  ${sec(["When you use the site", "Khi bạn dùng trang"], [[
    ["Projects you submit and comments you write are public, with your username. When you like a project, your username and picture show on its page among the people who liked it.", "Dự án bạn gửi và bình luận bạn viết là công khai, kèm tên người dùng của bạn. Khi bạn thích một dự án, tên và ảnh của bạn hiện trên trang dự án đó, trong danh sách người đã thích."],
    ["The email you give when submitting a project is never shown. We use it only about that listing: that it is live (with your edit link), comments and likes, and a few tips in its first week. Every email has a one-click way to stop.", "Email bạn nhập khi gửi dự án không bao giờ hiện công khai. Chúng mình chỉ dùng nó cho dự án đó: báo dự án đã lên (kèm link sửa), bình luận và lượt thích, và vài mẹo trong tuần đầu. Email nào cũng có nút dừng một chạm."],
    ["To stop spam we keep a hash of your IP address mixed with the date, for two days. It cannot be turned back into your IP.", "Để chống spam, chúng mình giữ bản băm của IP trộn với ngày, trong hai ngày. Không thể đổi ngược lại thành IP."],
    ["To learn which pages help people, we count visits and clicks with PostHog, without cookies or anything stored on your device. It sees your IP address only to tell one visitor from another for a day, and hashes it straight away. No screen recording, and if your browser sends Do Not Track, your visits are not counted.", "Để biết trang nào có ích, chúng mình đếm lượt xem và lượt bấm bằng PostHog, không dùng cookie và không lưu gì trên máy bạn. PostHog chỉ dùng IP của bạn để phân biệt người xem trong một ngày, và băm nó ngay lập tức. Không ghi lại màn hình, và nếu trình duyệt bật Do Not Track thì lượt xem của bạn không được đếm."],
    ["When you sign in, submit, comment, like or start a topic, we tell PostHog that it happened, under a number for your account. Never your email, name or username.", "Khi bạn đăng nhập, gửi dự án, bình luận, thích hoặc mở chủ đề, chúng mình báo PostHog việc đó, kèm một mã số tài khoản. Không bao giờ kèm email, tên hay tên người dùng."],
    ["Views of a project page are counted per day. To count each visitor once a day, we keep a hash of your IP address and browser for two days, then delete it. Makers are not counted on their own pages.", "Lượt xem trang dự án được đếm theo ngày. Để mỗi người chỉ tính một lần mỗi ngày, chúng mình giữ bản băm của IP và trình duyệt trong hai ngày rồi xoá. Người làm xem trang của chính mình thì không tính."],
    ["Clicks on a project's link are counted per day, with nothing about who clicked.", "Lượt bấm vào link dự án được đếm theo ngày, không kèm thông tin ai bấm."],
  ]])}
  ${sec(["Who else sees it", "Ai khác thấy"], [
    ["The site runs on Cloudflare, email goes out through Resend, and visit counts go to PostHog in the US. Nobody else gets your data, and we never sell it.", "Trang chạy trên Cloudflare, email gửi qua Resend, số liệu lượt xem gửi về PostHog đặt tại Mỹ. Ngoài ra không ai nhận dữ liệu của bạn, và chúng mình không bao giờ bán nó."],
  ])}
  ${sec(["Your choices", "Lựa chọn của bạn"], [
    ["In Settings you can turn email off, change your interests, or delete your account. Deleting erases your email and profile and empties your comments straight away.", "Ở trang Cài đặt bạn có thể tắt email, đổi sở thích hoặc xoá tài khoản. Xoá tài khoản sẽ xoá ngay email, hồ sơ và nội dung bình luận."],
    ["Questions: ask in Discuss or open an issue on GitHub.", "Có câu hỏi: hỏi ở mục Thảo luận hoặc mở issue trên GitHub."],
  ])}
  <div class="acts"><a class="btn line" href="/settings">${t("Open Settings", "Mở Cài đặt")}</a><a class="btn line" href="/discuss/help">${t("Ask in Discuss", "Hỏi ở Thảo luận")} ${ARROW}</a></div>
</div>`;
  return page({ vi: { title: "Quyền riêng tư · OpenYard", desc: "OpenYard giữ gì về bạn, vì sao, và cách xoá." }, title: "Privacy · OpenYard", desc: "What OpenYard keeps about you, why, and how to delete it.", path: "/privacy", color: "#10b981", site, body, css: ACC_CSS,
    jsonld: [crumbs([["OpenYard", ORIGIN], ["Privacy", `${ORIGIN}/privacy`]])] });
}
