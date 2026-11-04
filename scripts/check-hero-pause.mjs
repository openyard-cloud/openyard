// Behaviour check for the hero pause button. It runs the hero swarm script from
// public/index.html in a sandbox with a stubbed DOM, WebGL and 2D canvas, then
// drives the frame loop and the button click and checks what the animation clock does.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("public/index.html", "utf8");
const tag = html.match(/<button[^>]*id="swarmpause"[^>]*>/);
if (!tag) throw new Error("hero pause button is missing");
const start = html.indexOf("/* ---------- hero swarm");
const end = html.indexOf("/* ---------- reveal + counters");
if (start < 0 || end < 0) throw new Error("hero swarm block not found");
const block = html.slice(start, end);

const tick = () => new Promise(r => setTimeout(r, 1));

function makeElement(id) {
  const attrs = {};
  const listeners = {};
  return {
    id,
    attrs,
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    children: [],
    dataset: {},
    className: "",
    textContent: "",
    innerHTML: "",
    src: "",
    parentElement: null,
    getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 640, width: 640, height: 400 }),
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return attrs[k] ?? null; },
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    click() { (listeners.click ?? []).forEach(fn => fn({})); },
  };
}

// Any unknown method is a no-op; upper-case names are GL-style constants.
function stubContext(overrides) {
  return new Proxy(overrides, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === "string" && /^[A-Z_0-9]+$/.test(key)) return 1;
      return () => undefined;
    },
  });
}

async function runSwarm({ reduced }) {
  const els = {};
  const byId = id => (els[id] ??= makeElement(id));
  const uniforms = {};
  const gl = stubContext({
    getShaderParameter: () => true,
    getAttribLocation: () => 0,
    getUniformLocation: (prog, name) => name,
    uniform1f: (loc, v) => { uniforms[loc] = v; },
    createProgram: () => ({}),
    createShader: () => ({}),
    createBuffer: () => ({}),
  });
  const ctx2d = stubContext({
    measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: new Uint8ClampedArray(640 * 400 * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }),
  });

  const swarm = byId("swarm");
  swarm.getContext = type => (type === "webgl" ? gl : ctx2d);
  swarm.parentElement = makeElement("hx");

  // The pause button starts with the attributes written in the markup.
  const pause = byId("swarmpause");
  for (const [, k, v] of tag[0].matchAll(/([\w-]+)="([^"]*)"/g)) pause.setAttribute(k, v);

  let clock = 1000;
  let frame = null;
  const sandbox = {
    document: {
      getElementById: byId,
      querySelector: () => makeElement("q"),
      createElement: () => ({ getContext: () => ctx2d }),
      fonts: { ready: Promise.resolve() },
      hidden: false,
    },
    matchMedia: q => ({ matches: q.includes("prefers-reduced-motion") ? reduced : false }),
    IntersectionObserver: class { constructor(cb) { this.cb = cb; } observe() {} },
    performance: { now: () => clock },
    requestAnimationFrame: cb => { frame = cb; },
    addEventListener() {},
    devicePixelRatio: 1,
    Image: class { set src(v) { setTimeout(() => this.onload?.(), 0); } get width() { return 640; } get height() { return 400; } },
    setTimeout,
    setInterval,
    clearInterval,
    console,
    DATA: Promise.resolve({ projects: [] }),
    LANG: "en",
    T: (en) => en,
    reduce: reduced,
  };
  vm.runInNewContext(block, vm.createContext(sandbox));
  await tick();

  const run = async n => {
    for (let i = 0; i < n; i++) { clock += 16; frame(clock); await tick(); }
  };
  return { pause, uniforms, run };
}

function check(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Normal motion: starts playing, pauses on click, resumes on second click.
{
  const { pause, uniforms, run } = await runSwarm({ reduced: false });
  check(pause.getAttribute("aria-label") === "Freeze hero animation", "hero pause button has the wrong aria-label");
  check(pause.getAttribute("aria-pressed") === "false", "hero pause button should start unpressed when motion is allowed");

  await run(10);
  const playing = uniforms.t;
  check(playing > 0, "hero animation clock does not advance before the button is pressed");

  pause.click();
  check(pause.getAttribute("aria-pressed") === "true", "hero pause button is not pressed after the first click");
  check(pause.getAttribute("aria-label") === "Freeze hero animation", "hero pause button label changed when pressed");
  await run(10);
  const paused = uniforms.t;
  check(paused === playing, "hero animation clock keeps running after the pause button is pressed");

  pause.click();
  check(pause.getAttribute("aria-pressed") === "false", "hero pause button is still pressed after the second click");
  await run(10);
  check(uniforms.t > paused, "hero animation does not resume after the pause button is released");
}

// Reduced motion: starts paused, and the button can resume the animation.
{
  const { pause, uniforms, run } = await runSwarm({ reduced: true });
  check(pause.getAttribute("aria-pressed") === "true", "hero animation does not start paused when reduced motion is preferred");
  await run(10);
  const startTime = uniforms.t;
  await run(10);
  check(uniforms.t === startTime, "hero animation advances while it starts paused for reduced motion");

  pause.click();
  check(pause.getAttribute("aria-pressed") === "false", "hero pause button is still pressed after resuming under reduced motion");
  await run(10);
  check(uniforms.t > startTime, "hero animation does not resume under reduced motion");
}

console.log("hero pause button checks passed");
process.exit(0);
