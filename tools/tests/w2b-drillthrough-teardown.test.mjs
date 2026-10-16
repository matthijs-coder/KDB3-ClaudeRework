// W2b: services.drillthrough is destroyed first in the service teardown, so a pending hierarchy wait window is
// released before tableData teardown can reject its load. Run: node --test tools/tests/w2b-drillthrough-teardown.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadAmd } from '../lib/amd-loader.mjs';
import { JS_ROOT } from '../lib/amd-graph.mjs';
import { loadManifest, loadBootstrapModule } from './bootstrap-harness.mjs';

const manifest = loadManifest();
const lifecycle = loadBootstrapModule('core/bootstrap/lifecycle.js');
const register = loadAmd(path.join(JS_ROOT, 'core/services/drillthrough/__orchestratorDrillthrough.js'), {
  stubs: { window: { location: { href: 'https://cognos.example/x' }, open: () => handle }, console: { ...console, error() {} } },
});

const SPEC = {
  source: 'icon', widgetId: 'w1', kennzahlCode: 'KZ_100', sicht: 'BW', visType: 'bar', selectedDimension: 'Geschlecht',
  yearContext: { defaultYear: 2022 },
  orgSelection: { selectedValues: [{ idValue: 'MA05#1', displayValue: 'MA 05', level: 2 }] },
};
const links = { pkzAnalysetool: { prod: 'https://prod.example/pkz?run=1' } };

const handle = {
  closed: false,
  close() { handle.closed = true; },
  location: { replace() {} },
  document: { title: '', body: { firstChild: { textContent: '' }, textContent: '' }, open() {}, write() {}, close() {} },
};

test('service teardown: a pending wait window is closed before tableData is destroyed and cannot be rewritten by it', async () => {
  const order = [];
  let rejectLoad;
  const pending = new Promise((_resolve, reject) => { rejectLoad = reject; });
  const kdb = {
    config: { links },
    services: {
      tableData: {
        readRows: () => [],
        readPendingLoad: () => pending,
        readTableState: () => ({ lifecycle: 'ready' }),
        destroy() { order.push('tableData'); rejectLoad(new Error('tableData destroyed')); },
      },
    },
  };
  register(kdb);
  const realDestroy = kdb.services.drillthrough.destroy;
  kdb.services.drillthrough.destroy = () => { order.push('drillthrough'); realDestroy(); };
  assert.equal(kdb.services.drillthrough.openDrillthrough(SPEC).ok, true);
  assert.equal(handle.closed, false);
  lifecycle.destroyServices(kdb, { serviceDestroyOrder: manifest.serviceDestroyOrder });
  assert.deepEqual(order, ['drillthrough', 'tableData']);
  assert.equal(handle.closed, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(handle.document.body.textContent, '', 'the rejected load does not write into the closed wait window');
});
