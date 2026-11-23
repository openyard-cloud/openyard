// Vietnamese pages at /vi/…, so people searching in Vietnamese find the yard.
//
// Every page is written once, in both languages: t(en, vi) renders the English with the
// Vietnamese in data-vi (pages.js), and the EN/VI button swaps them in the browser. Search
// engines only read the English that way, so /vi/<path> renders the same page and swaps the
// text on the server, points its canonical at itself, keeps links inside /vi/, and both
// versions name each other with hreflang (head() in pages.js).

/** Pages that have a Vietnamese version: everything public and readable, not forms or APIs. */
export const VI_OK = path => /^\/($|p\/[^/.]+\/?$|projects\/?$|apps\/?$|open-source\/?$|for-people\/?$|wild-ideas\/?$|dev-tools\/?$|tags\/[^/]+\/?$|about\/?$|community\/?$|privacy\/?$|discuss(\/(?!new)[^]*)?$|@[A-Za-z0-9-]+\/?$|check(\/[^]*)?$)/.test(path) && !/\.md$/.test(path);
/** The Vietnamese address of an English path. */
export const viPath = path => path === "/" ? "/vi/" : "/vi" + path;

const ATTRS = ["placeholder", "aria-label", "title", "content"];

/** Turns an English page response into its Vietnamese version at /vi<path>. */
export function toVietnamese(res, path, origin) {
  const here = origin + viPath(path);
  const local = href => {
    if (!href || !href.startsWith("/") || href.startsWith("//") || href.startsWith("/vi/")) return null;
    const u = new URL(href, origin);
    return VI_OK(u.pathname) ? viPath(u.pathname) + u.search + u.hash : null;
  };
  let rw = new HTMLRewriter()
    .on("html", { element: el => el.setAttribute("lang", "vi") })
    // attribute values come back as written in the HTML, already escaped, so they go in as HTML
    .on("[data-vi]", { element: el => el.setInnerContent(el.getAttribute("data-vi"), { html: true }) })
    .on("#lang", { element: el => el.setInnerContent("EN") })
    .on('link[rel="canonical"]', { element: el => el.setAttribute("href", here) })
    .on('meta[property="og:url"]', { element: el => el.setAttribute("content", here) })
    .on("a[href]", { element: el => { const v = local(el.getAttribute("href")); if (v) el.setAttribute("href", v); } });
  for (const a of ATTRS) rw = rw.on(`[data-vi-${a}]`, { element: el => el.setAttribute(a, el.getAttribute(`data-vi-${a}`)) });
  const headers = new Headers(res.headers);
  headers.set("Content-Language", "vi");
  return rw.transform(new Response(res.body, { status: res.status, headers }));
}
