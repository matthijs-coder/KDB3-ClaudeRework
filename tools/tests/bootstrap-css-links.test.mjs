// core/css: stylesheet <link>s added to document.head by the css orchestrator.
// Run: node --test tools/tests/bootstrap-css-links.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadAmd } from '../lib/amd-loader.mjs';
import { JS_ROOT } from '../lib/amd-graph.mjs';

function createHead() {
  const head = {
    children: [],
    appendChild(el) { el.parentNode = head; head.children.push(el); return el; },
    removeChild(el) { const i = head.children.indexOf(el); if (i >= 0) head.children.splice(i, 1); el.parentNode = null; return el; },
    querySelectorAll(selector) {
      assert.equal(selector, 'link[rel="stylesheet"]');
      return head.children.filter((el) => el.rel === 'stylesheet');
    },
  };
  return head;
}

function setup() {
  const head = createHead();
  const document = {
    head,
    createElement(tag) {
      assert.equal(tag, 'link');
      return { rel: '', href: '', parentNode: null, getAttribute(name) { return name === 'href' ? this.href : null; } };
    },
  };
  // One registry instance shared by the orchestrator and the remover, like the AMD module in the page.
  const registry = loadAmd(path.join(JS_ROOT, 'core/css/cssLinkRegistry.js'), { stubs: { document } });
  const overrides = { 'core/css/cssLinkRegistry.js': registry };
  const load = () => loadAmd(path.join(JS_ROOT, 'core/css/__orchestratorCss.js'), { stubs: { document }, overrides });
  const remove = loadAmd(path.join(JS_ROOT, 'core/css/removeCssLinks.js'), { stubs: { document }, overrides });
  const newKdb = () => ({ runtime: { core: { domRefs: {} } } });
  return { head, document, load, remove, newKdb };
}

const HREFS = ['./v1/ext/KDB3/css/header.css', './v1/ext/KDB3/css/footer.css', './v1/ext/KDB3/css/canvas.css'];

test('css orchestrator adds one stylesheet link per configured href, in order', () => {
  const { head, load, newKdb } = setup();
  const kdb = newKdb();
  load()(kdb);
  const hrefs = head.children.map((el) => el.href);
  assert.ok(hrefs.length > 10);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(hrefs[0], './v1/ext/KDB3/css/header.css');
  assert.ok(head.children.every((el) => el.rel === 'stylesheet'));
  assert.equal(kdb.runtime.core.domRefs.cssLinks.length, hrefs.length);
});

test('a second boot with the same hrefs does not duplicate the links (DELTA: it co-owns them now)', () => {
  const { head, load, newKdb } = setup();
  const first = newKdb();
  const second = newKdb();
  load()(first);
  const count = head.children.length;
  load()(second);
  assert.equal(head.children.length, count);
  assert.equal(second.runtime.core.domRefs.cssLinks.length, count, 'the second instance co-owns the shared links');
});

test('a link that already exists in the page is left alone', () => {
  const { head, load, newKdb } = setup();
  head.appendChild({ rel: 'stylesheet', href: HREFS[0], getAttribute: () => HREFS[0] });
  const kdb = newKdb();
  load()(kdb);
  assert.equal(head.children.filter((el) => el.href === HREFS[0]).length, 1);
  assert.equal(kdb.runtime.core.domRefs.cssLinks.some((el) => el.href === HREFS[0]), false);
});

test('removeCssLinks removes the links the instance created and empties its bucket', () => {
  const { head, load, remove, newKdb } = setup();
  const kdb = newKdb();
  load()(kdb);
  assert.ok(head.children.length > 10);
  remove(kdb);
  assert.equal(head.children.length, 0);
  assert.deepEqual(kdb.runtime.core.domRefs.cssLinks, []);
  assert.doesNotThrow(() => remove(kdb));
});

test('double boot: the first instance destroying itself keeps the links the second one uses', () => {
  const { head, load, remove, newKdb } = setup();
  const first = newKdb();
  const second = newKdb();
  load()(first);
  const count = head.children.length;
  load()(second);
  remove(first);
  assert.equal(head.children.length, count);
  remove(second);
  assert.equal(head.children.length, 0);
});

test('double boot: when the first instance is gone before the second boots, the second re-adds the links', () => {
  const { head, load, remove, newKdb } = setup();
  const first = newKdb();
  load()(first);
  const count = head.children.length;
  remove(first);
  assert.equal(head.children.length, 0);
  const second = newKdb();
  load()(second);
  assert.equal(head.children.length, count);
  remove(second);
  assert.equal(head.children.length, 0);
});

test('removeCssLinks never removes a foreign link and tolerates a missing bucket or runtime', () => {
  const { head, load, remove, newKdb } = setup();
  const foreign = { rel: 'stylesheet', href: HREFS[0], parentNode: null, getAttribute: () => HREFS[0] };
  head.appendChild(foreign);
  const kdb = newKdb();
  load()(kdb);
  remove(kdb);
  assert.deepEqual(head.children, [foreign]);
  assert.doesNotThrow(() => remove({}));
  assert.doesNotThrow(() => remove({ runtime: { core: {} } }));
});

test('a link already detached from the page is released without error', () => {
  const { head, load, remove, newKdb } = setup();
  const kdb = newKdb();
  load()(kdb);
  head.children.slice().forEach((el) => head.removeChild(el));
  assert.doesNotThrow(() => remove(kdb));
});

test('double boot with two separately loaded copies of the css modules: the survivor keeps the links', () => {
  const { head, document } = setup();
  const loadCopy = () => ({
    orchestrate: loadAmd(path.join(JS_ROOT, 'core/css/__orchestratorCss.js'), { stubs: { document } }),
    remove: loadAmd(path.join(JS_ROOT, 'core/css/removeCssLinks.js'), { stubs: { document } }),
  });
  const copyA = loadCopy();
  const copyB = loadCopy();
  const first = { runtime: { core: { domRefs: {} } } };
  const second = { runtime: { core: { domRefs: {} } } };
  copyA.orchestrate(first);
  const count = head.children.length;
  copyB.orchestrate(second);
  assert.equal(head.children.length, count);
  assert.equal(second.runtime.core.domRefs.cssLinks.length, count);
  copyA.remove(first);
  assert.equal(head.children.length, count);
  copyB.remove(second);
  assert.equal(head.children.length, 0);
});
