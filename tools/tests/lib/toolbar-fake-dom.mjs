// Minimal DOM for the toolbarControls tests: ordered attributes (so serialised output can be compared
// attribute by attribute), attribute selectors, classList, reflected properties, click events with
// AbortSignal listeners, a MutationObserver registry and a manual rAF queue. Not a general DOM.

const REFLECTED = { className: 'class', type: 'type', title: 'title', src: 'src' };

function parseSelector(selector) {
  const match = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(selector);
  if (!match) return null;
  return { name: match[1], value: match[2] };
}

export function createFakeDom() {
  const observers = new Set();
  const frames = [];
  let nextFrameId = 1;
  const state = { host: null };

  class FakeNode {
    constructor() {
      this.parentNode = null;
      this.childNodes = [];
    }
    get firstChild() { return this.childNodes[0] || null; }
    get nextSibling() {
      if (!this.parentNode) return null;
      const siblings = this.parentNode.childNodes;
      return siblings[siblings.indexOf(this) + 1] || null;
    }
    appendChild(node) { return this.insertBefore(node, null); }
    insertBefore(node, reference) {
      if (node.parentNode) node.parentNode.removeChild(node);
      const index = reference ? this.childNodes.indexOf(reference) : this.childNodes.length;
      this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, node);
      node.parentNode = this;
      notifyMutation();
      return node;
    }
    removeChild(node) {
      this.childNodes.splice(this.childNodes.indexOf(node), 1);
      node.parentNode = null;
      notifyMutation();
      return node;
    }
    get isConnected() { return this === rootNode || (!!this.parentNode && this.parentNode.isConnected); }
    compareDocumentPosition(other) {
      const order = [];
      (function walk(node) { order.push(node); node.childNodes.forEach(walk); })(topOf(this));
      return order.indexOf(other) > order.indexOf(this) ? 4 : 2;
    }
  }

  function topOf(node) { return node.parentNode ? topOf(node.parentNode) : node; }

  const rootNode = new FakeNode();

  class FakeElement extends FakeNode {
    constructor(tagName) {
      super();
      this.tagName = tagName;
      this.attributes = new Map();
      this.listeners = [];
      this.textValue = '';
      this.ownerDocument = fakeDocument;
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    set textContent(value) { this.childNodes = []; this.textValue = String(value); }
    get textContent() { return this.textValue + this.childNodes.map((node) => node.textContent).join(''); }
    get disabled() { return this.attributes.has('disabled'); }
    set disabled(value) {
      if (value) this.attributes.set('disabled', '');
      else this.attributes.delete('disabled');
    }
    get classList() {
      const element = this;
      const read = () => (element.getAttribute('class') || '').split(/\s+/).filter(Boolean);
      const write = (list) => element.setAttribute('class', list.join(' '));
      return {
        contains: (name) => read().includes(name),
        add: (name) => { if (!read().includes(name)) write(read().concat(name)); },
        remove: (name) => { if (read().includes(name)) write(read().filter((entry) => entry !== name)); },
        toggle(name, force) {
          const has = read().includes(name);
          const wanted = force === undefined ? !has : !!force;
          if (wanted && !has) write(read().concat(name));
          if (!wanted && has) write(read().filter((entry) => entry !== name));
          return wanted;
        }
      };
    }
    matches(selector) {
      const parsed = parseSelector(selector);
      if (!parsed) return false;
      return parsed.value === undefined ? this.attributes.has(parsed.name) : this.getAttribute(parsed.name) === parsed.value;
    }
    querySelectorAll(selector) {
      const found = [];
      (function walk(node) {
        node.childNodes.forEach((child) => { if (child.matches && child.matches(selector)) found.push(child); walk(child); });
      })(this);
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) {
      for (let node = this; node; node = node.parentNode) if (node.matches && node.matches(selector)) return node;
      return null;
    }
    addEventListener(type, handler, options) {
      const record = { type, handler, signal: options && options.signal };
      this.listeners.push(record);
      if (record.signal) record.signal.addEventListener('abort', () => { record.removed = true; }, { once: true });
    }
    removeEventListener(type, handler) {
      this.listeners.filter((entry) => entry.type === type && entry.handler === handler).forEach((entry) => { entry.removed = true; });
    }
    click(target = this) {
      const event = { target, preventDefault() { this.defaultPrevented = true; } };
      for (let node = this; node && node.listeners; node = node.parentNode) {
        node.listeners.filter((entry) => entry.type === 'click' && !entry.removed).forEach((entry) => entry.handler(event));
      }
      return event;
    }
    activeListenerCount(type) { return this.listeners.filter((entry) => entry.type === type && !entry.removed).length; }
  }

  for (const [property, attribute] of Object.entries(REFLECTED)) {
    Object.defineProperty(FakeElement.prototype, property, {
      get() { return this.getAttribute(attribute) || ''; },
      set(value) { this.setAttribute(attribute, value); }
    });
  }

  let isNotifyQueued = false;
  function notifyMutation() {
    if (isNotifyQueued) return;
    isNotifyQueued = true;
    queueMicrotask(() => {
      isNotifyQueued = false;
      [...observers].forEach((observer) => { if (observer.target && rootNode === topOf(observer.target)) observer.callback([]); });
    });
  }

  class FakeMutationObserver {
    constructor(callback) { this.callback = callback; this.target = null; }
    observe(target) { this.target = target; observers.add(this); }
    disconnect() { this.target = null; observers.delete(this); }
  }

  const fakeDocument = {
    body: null,
    location: { href: 'https://host.test/dashboard', origin: 'https://host.test' },
    createElement: (tagName) => new FakeElement(tagName),
    createElementNS: (_ns, tagName) => new FakeElement(tagName),
    querySelector(selector) {
      if (selector === '#host') return state.host && state.host.isConnected ? state.host : null;
      return null;
    }
  };
  fakeDocument.defaultView = {
    getComputedStyle: () => ({ color: state.textColor || 'rgb(0, 0, 0)' })
  };
  fakeDocument.body = new FakeElement('body');
  fakeDocument.body.parentNode = rootNode;
  rootNode.childNodes.push(fakeDocument.body);

  function serialize(node) {
    if (!node.tagName) return '';
    const attributes = [...node.attributes].map(([name, value]) => ` ${name}="${value}"`).join('');
    return `<${node.tagName}${attributes}>${node.textValue}${node.childNodes.map(serialize).join('')}</${node.tagName}>`;
  }

  return {
    document: fakeDocument,
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
    MutationObserver: FakeMutationObserver,
    requestAnimationFrame(callback) { frames.push({ id: nextFrameId, callback }); return nextFrameId++; },
    cancelAnimationFrame(id) { const index = frames.findIndex((frame) => frame.id === id); if (index >= 0) frames.splice(index, 1); },
    flushFrames() { frames.splice(0).forEach((frame) => frame.callback(0)); },
    pendingFrameCount: () => frames.length,
    liveObserverCount: () => observers.size,
    createHost() {
      const host = new FakeElement('div');
      host.setAttribute('class', 'leading');
      state.host = host;
      return host;
    },
    attachHost(host) { fakeDocument.body.appendChild(host); },
    setTextColor(color) { state.textColor = color; },
    serialize
  };
}
