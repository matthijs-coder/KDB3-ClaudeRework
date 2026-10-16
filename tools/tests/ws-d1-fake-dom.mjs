// Minimal fake DOM + fake timers for the WS-D1 golden tests (messageService, loadingService).
// Supports only what those services use. Not a general DOM implementation.

const VOID_TAGS = new Set(["input", "br", "img"]);

function matchesSimple(el, selector) {
  let rest = selector.trim();
  const tagMatch = /^[a-zA-Z][\w-]*/.exec(rest);
  if (tagMatch) {
    if (el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
    rest = rest.slice(tagMatch[0].length);
  }
  const part = /^(?:#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:=(?:'([^']*)'|"([^"]*)"|([^\]]*)))?\]|:not\(\[([\w-]+)(?:=(?:'([^']*)'|"([^"]*)"))?\]\))/;
  while (rest.length > 0) {
    const m = part.exec(rest);
    if (!m) throw new Error("fake-dom: unsupported selector " + selector);
    if (m[1] !== undefined && el.id !== m[1]) return false;
    if (m[2] !== undefined && !el.classList.contains(m[2])) return false;
    if (m[3] !== undefined) {
      const expected = m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : m[6];
      const actual = el.getAttribute(m[3]);
      if (actual === null) return false;
      if (expected !== undefined && actual !== expected) return false;
    }
    if (m[7] !== undefined) {
      const expected = m[8] !== undefined ? m[8] : m[9];
      const actual = el.getAttribute(m[7]);
      if (expected === undefined ? actual !== null : actual === expected) return false;
    }
    rest = rest.slice(m[0].length);
  }
  return true;
}

function matchesSelector(el, selectorList) {
  return selectorList.split(",").some((s) => matchesSimple(el, s));
}

function descendants(root, out = []) {
  for (const child of root.children) {
    out.push(child);
    descendants(child, out);
  }
  return out;
}

export class FakeEventTarget {
  constructor() {
    this.listenerLog = [];
  }
  addEventListener(type, handler, options) {
    this.listenerLog.push({ type, handler, capture: options === true || (options && options.capture === true) });
  }
  removeEventListener(type, handler, options) {
    const capture = options === true || (options && options.capture === true);
    const index = this.listenerLog.findIndex((l) => l.type === type && l.handler === handler && l.capture === capture);
    if (index >= 0) this.listenerLog.splice(index, 1);
  }
  dispatch(event) {
    const e = Object.assign({ defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, event);
    e.target = e.target || this;
    this.listenerLog.filter((l) => l.type === e.type).forEach((l) => l.handler(e));
    return e;
  }
  countListeners(type) {
    return this.listenerLog.filter((l) => l.type === type).length;
  }
}

class ClassList {
  constructor(el) { this.el = el; }
  list() { return this.el.className.split(/\s+/).filter(Boolean); }
  contains(name) { return this.list().indexOf(name) >= 0; }
  add(name) { if (!this.contains(name)) this.el.className = this.list().concat(name).join(" "); }
  remove(name) { this.el.className = this.list().filter((n) => n !== name).join(" "); }
}

export class FakeElement extends FakeEventTarget {
  constructor(doc, tagName) {
    super();
    this.ownerDocument = doc;
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.className = "";
    this.id = "";
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.style = {};
    this.textContent = "";
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.checked = false;
    this.offsetWidth = 100;
    this.offsetHeight = 20;
    this.rect = { left: 10, top: 10, right: 210, bottom: 50, width: 200, height: 40 };
    this.classList = new ClassList(this);
  }
  get firstChild() { return this.children[0] || null; }
  get isConnected() {
    let node = this;
    while (node.parentNode) node = node.parentNode;
    return node === this.ownerDocument.documentElement;
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  insertBefore(child, ref) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    const index = ref ? this.children.indexOf(ref) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  contains(other) {
    for (let node = other; node; node = node.parentNode) if (node === this) return true;
    return false;
  }
  setAttribute(name, value) {
    if (name === "id") this.id = String(value);
    if (name === "class") this.className = String(value);
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    if (name === "id" && this.id) return this.id;
    if (name === "class" && this.className) return this.className;
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }
  hasAttribute(name) { return this.getAttribute(name) !== null; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const trimmed = selector.trim();
    if (trimmed.startsWith(":scope >")) {
      const compound = trimmed.slice(":scope >".length);
      return this.children.filter((c) => matchesSelector(c, compound));
    }
    return descendants(this).filter((c) => matchesSelector(c, trimmed));
  }
  closest(selector) {
    for (let node = this; node && node.tagName; node = node.parentNode) {
      if (matchesSelector(node, selector)) return node;
    }
    return null;
  }
  getBoundingClientRect() { return this.rect; }
  focus() { this.ownerDocument.activeElement = this; }
  select() { this.selected = true; }
  click() { this.dispatch({ type: "click" }); }
  insertAdjacentHTML(position, html) {
    if (position !== "beforeend") throw new Error("fake-dom: only beforeend supported");
    const stack = [this];
    const tagRe = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
    let m;
    while ((m = tagRe.exec(html))) {
      if (m[1]) {
        if (stack.length > 1) stack.pop();
        continue;
      }
      const el = this.ownerDocument.createElement(m[2]);
      const cls = /class="([^"]*)"/.exec(m[3]);
      if (cls) el.className = cls[1];
      stack[stack.length - 1].appendChild(el);
      if (!m[4] && !VOID_TAGS.has(m[2].toLowerCase()) && !/\/\s*$/.test(m[3])) stack.push(el);
    }
  }
}

export class FakeMutationObserver {
  static instances = [];
  constructor(callback) {
    this.callback = callback;
    this.targets = [];
    FakeMutationObserver.instances.push(this);
  }
  observe(target, options) { this.targets.push({ target, options }); this.connected = true; }
  disconnect() { this.connected = false; }
  trigger() { if (this.connected) this.callback([], this); }
}

export function createFakeDocument() {
  const doc = new FakeEventTarget();
  doc.createElement = (tag) => new FakeElement(doc, tag);
  doc.documentElement = new FakeElement(doc, "html");
  doc.body = new FakeElement(doc, "body");
  doc.documentElement.appendChild(doc.body);
  doc.activeElement = doc.body;
  doc.querySelector = (selector) => doc.documentElement.querySelector(selector);
  doc.querySelectorAll = (selector) => doc.documentElement.querySelectorAll(selector);
  return doc;
}

export function createFakeWindow(doc) {
  const win = new FakeEventTarget();
  win.innerWidth = 1000;
  win.innerHeight = 800;
  win.isSecureContext = true;
  win.getComputedStyle = (el) => ({ position: el.style.position || el.computedPosition || "static" });
  win.document = doc;
  return win;
}

export function createFakeClock() {
  let nextId = 1;
  let now = 0;
  const timeouts = new Map();
  const frames = new Map();
  const clock = {
    setTimeout(fn, ms, ...args) {
      const id = nextId++;
      timeouts.set(id, { fn, at: now + (Number(ms) || 0), args });
      return id;
    },
    clearTimeout(id) { timeouts.delete(id); },
    requestAnimationFrame(fn) {
      const id = nextId++;
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame(id) { frames.delete(id); },
    pendingTimeouts() { return timeouts.size; },
    pendingFrames() { return frames.size; },
    flushFrames() {
      let guard = 0;
      while (frames.size > 0 && guard++ < 50) {
        const batch = Array.from(frames.entries());
        frames.clear();
        batch.forEach(([, fn]) => fn(now));
      }
    },
    advance(ms) {
      now += ms;
      let guard = 0;
      for (;;) {
        const due = Array.from(timeouts.entries()).filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at);
        if (due.length === 0 || guard++ > 200) break;
        const [id, t] = due[0];
        timeouts.delete(id);
        t.fn(...t.args);
      }
      clock.flushFrames();
    }
  };
  return clock;
}

export function createQuietConsole() {
  const calls = { error: [], warn: [], log: [], info: [] };
  const quiet = {
    calls,
    error: (...a) => calls.error.push(a),
    warn: (...a) => calls.warn.push(a),
    log: (...a) => calls.log.push(a),
    info: (...a) => calls.info.push(a)
  };
  return quiet;
}

export function createEnv(extraStubs = {}) {
  FakeMutationObserver.instances.length = 0;
  const document = createFakeDocument();
  const window = createFakeWindow(document);
  const clock = createFakeClock();
  const console = createQuietConsole();
  const stubs = {
    document,
    window,
    console,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    requestAnimationFrame: clock.requestAnimationFrame,
    cancelAnimationFrame: clock.cancelAnimationFrame,
    MutationObserver: FakeMutationObserver,
    ...extraStubs
  };
  return { document, window, clock, console, stubs, FakeMutationObserver };
}
