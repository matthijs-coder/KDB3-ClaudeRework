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
  const load = () => loadAmd(path.join(JS_ROOT, 'core/css/__orchestratorCss.js'), { stubs: { document } });
  const newKdb = () => ({ runtime: { core: { domRefs: {} } } });
  return { head, document, load, newKdb };
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

test('a second boot with the same hrefs does not duplicate the links', () => {
  const { head, load, newKdb } = setup();
  const first = newKdb();
  const second = newKdb();
  load()(first);
  const count = head.children.length;
  load()(second);
  assert.equal(head.children.length, count);
  assert.equal(second.runtime.core.domRefs.cssLinks.length, 0, 'before ref-counting: the second instance tracks nothing');
});

test('a link that already exists in the page is left alone', () => {
  const { head, load, newKdb } = setup();
  head.appendChild({ rel: 'stylesheet', href: HREFS[0], getAttribute: () => HREFS[0] });
  const kdb = newKdb();
  load()(kdb);
  assert.equal(head.children.filter((el) => el.href === HREFS[0]).length, 1);
  assert.equal(kdb.runtime.core.domRefs.cssLinks.some((el) => el.href === HREFS[0]), false);
});
