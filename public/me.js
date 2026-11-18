// The account button in the top bar of every page: "Sign in" until /api/me says who you are,
// then your avatar with a small menu. Pages are cached for everyone, so this runs in the browser.
(() => {
  const el = document.getElementById("me");
  if (!el) return;
  const here = location.pathname + location.search + location.hash;
  el.href = "/auth/github?return=" + encodeURIComponent(here);
  const vi = () => document.documentElement.lang === "vi";
  const T = (en, v) => vi() ? v : en;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const css = document.createElement("style");
  css.textContent = `.mewrap{position:relative}
.mebtn{display:block;width:34px;height:34px;padding:0;border-radius:50%;border:1px solid var(--line2);background:var(--bg2,#eee);cursor:pointer;overflow:hidden;transition:box-shadow .2s}
.mebtn:hover,.mebtn[aria-expanded="true"]{box-shadow:0 0 0 3px color-mix(in srgb,#8b7cff 35%,transparent)}.mebtn img{display:block;width:100%;height:100%}
.memenu{position:absolute;right:0;top:calc(100% + 10px);z-index:60;min-width:220px;padding:6px;border-radius:16px;border:1px solid var(--line2);background:var(--solid,#fff);box-shadow:var(--shadow);font:14px/1.4 Inter,system-ui,sans-serif;color:var(--ink)}
.memenu[hidden]{display:none}.memenu .who{padding:10px 12px 8px;border-bottom:1px solid var(--line);margin-bottom:4px}.memenu .who b{display:block;font-weight:600}.memenu .who span{color:var(--muted);font-size:13px}
.memenu a,.memenu button{display:block;width:100%;text-align:left;padding:9px 12px;border-radius:10px;border:0;background:none;color:inherit;font:inherit;cursor:pointer}
.memenu a:hover,.memenu button:hover{background:var(--bg2,#f4f4f5)}.memenu hr{border:0;border-top:1px solid var(--line);margin:4px 0}`;
  document.head.appendChild(css);

  fetch("/api/me", { credentials: "same-origin" }).then(r => r.ok ? r.json() : null).then(u => {
    if (!u) return;
    const wrap = document.createElement("div");
    wrap.className = "mewrap";
    const draw = () => {
      wrap.innerHTML = `<button class="mebtn" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(T("Your account", "Tài khoản của bạn"))}"><img src="${esc(u.avatar || `https://github.com/${u.login}.png?size=68`)}" alt=""></button>
<div class="memenu" role="menu" hidden>
  <div class="who"><b>${esc(u.name || u.login)}</b><span>@${esc(u.login)}</span></div>
  <a role="menuitem" href="/@${esc(u.login)}">${T("Your profile", "Hồ sơ của bạn")}</a>
  <a role="menuitem" href="/settings">${T("Settings", "Cài đặt")}</a>
  <a role="menuitem" href="/submit">${T("Submit a project", "Gửi dự án")}</a>
  <hr><button role="menuitem" type="button" data-out>${T("Sign out", "Đăng xuất")}</button>
</div>`;
      const btn = wrap.querySelector(".mebtn"), menu = wrap.querySelector(".memenu");
      btn.addEventListener("click", e => { e.stopPropagation(); open(menu.hidden); });
      wrap.querySelector("[data-out]").addEventListener("click", async () => {
        await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
        location.reload();
      });
    };
    const open = on => { const menu = wrap.querySelector(".memenu"); menu.hidden = !on; wrap.querySelector(".mebtn").setAttribute("aria-expanded", on); };
    document.addEventListener("click", e => { if (!wrap.contains(e.target)) open(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") open(false); });
    draw();
    el.replaceWith(wrap);
    addEventListener("oy-lang", draw);
  }).catch(() => {});
})();
