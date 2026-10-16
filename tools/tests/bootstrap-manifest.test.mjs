// Consistency of core/bootstrap/featureManifest.js and the manifest-driven replay registration.
// Run: node --test tools/tests/bootstrap-manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURES, loadManifest, loadBootstrapModule } from './bootstrap-harness.mjs';

const manifest = loadManifest();
const byName = new Map(manifest.entries.map((entry) => [entry.name, entry]));

test('manifest: names are unique, every entry registers, features keep the Phase 1 orchestrator order', () => {
  assert.equal(byName.size, manifest.entries.length);
  for (const entry of manifest.entries) assert.equal(typeof entry.register, 'function', entry.name);
  const featureNames = manifest.entries.filter((entry) => entry.mount).map((entry) => entry.name);
  assert.deepEqual(featureNames, FEATURES.map((feature) => feature[0]));
});

test('manifest: core steps register before the features, services before authoring', () => {
  const names = manifest.entries.map((entry) => entry.name);
  assert.deepEqual(names.slice(0, 10), [
    'bootstrapLabels', 'cognosHostSelectors', 'properties', 'config', 'css', 'cognosAPI', 'services', 'authoring', 'homeDialog', 'utils',
  ]);
});

test('manifest: api keys match the keys the orchestrators publish', () => {
  for (const [name, , apiKey] of FEATURES) assert.equal(byName.get(name).api, apiKey, name);
  assert.equal(byName.get('authoring').api, 'authoring');
});

test('manifest: destroyOrder lists every entry that owns an api object or a teardown, once', () => {
  assert.equal(new Set(manifest.destroyOrder).size, manifest.destroyOrder.length);
  const destroyable = manifest.entries.filter((entry) => entry.api || typeof entry.destroy === 'function').map((entry) => entry.name);
  assert.deepEqual([...manifest.destroyOrder].sort(), [...destroyable].sort());
  for (const name of manifest.destroyOrder) assert.ok(byName.has(name), name);
});

test('manifest: mount phases and options', () => {
  const afterLoading = manifest.entries.filter((entry) => entry.mount && entry.mount.phase === 'afterLoading').map((entry) => entry.name);
  assert.deepEqual(afterLoading, ['filterDock']);
  assert.deepEqual(byName.get('widgetVis').mount.options, { enableDrillthrough: true });
  for (const entry of manifest.entries.filter((candidate) => candidate.mount && candidate.name !== 'widgetVis')) {
    assert.deepEqual(entry.mount.options, {}, entry.name);
  }
});

test('manifest: 18 replay keys, owners and order', () => {
  assert.equal(new Set(manifest.replayOrder).size, manifest.replayOrder.length);
  const keys = manifest.replayOrder.flatMap((name) => byName.get(name).replayKeys);
  assert.equal(keys.length, 18);
  assert.equal(new Set(keys).size, 18);
  assert.deepEqual(manifest.replayOrder, [
    'kdbControl', 'header', 'footer', 'singleSelect', 'sicht', 'dienststelle', 'nativeMultiSelect', 'widgetBase', 'widgetSettings', 'widgetText', 'tabs',
  ]);
  const declared = manifest.entries.filter((entry) => entry.replayKeys).map((entry) => entry.name);
  assert.deepEqual([...declared].sort(), [...manifest.replayOrder].sort());
});

test('manifest: service teardown order', () => {
  assert.deepEqual(manifest.serviceDestroyOrder, [
    'writebackBridge', 'writebackSet', 'writebackGet', 'writebackMap', 'dashboardPdf', 'widgetBindingApply', 'history', 'message', 'loading', 'tableData', 'cognosHost',
  ]);
});

function replayKit({ withHistory = true } = {}) {
  const registered = [];
  const warnings = [];
  const registerReplayHandlers = loadBootstrapModule('core/bootstrap/registerReplayHandlers.js');
  const kdb = { runtime: {}, services: withHistory ? { history: { registerReplayHandler: (key, handler) => registered.push([key, handler]) } } : {} };
  const originalWarn = console.warn;
  const run = () => {
    console.warn = (...args) => warnings.push(args);
    try { registerReplayHandlers(kdb, manifest); } finally { console.warn = originalWarn; }
  };
  return { kdb, registered, warnings, run };
}

test('registerReplayHandlers: every contribution is registered under its keys in manifest replay order', () => {
  const { kdb, registered, run } = replayKit();
  const contributions = {};
  for (const name of manifest.replayOrder) {
    contributions[name] = { apply() {} };
    kdb.runtime[name] = { historyReplayHandlerContribution: contributions[name] };
  }
  run();
  assert.deepEqual(registered.map(([key]) => key), [
    'kdbControl_settingsChange', 'header_chromeChange', 'header_textChange', 'footer_chromeChange', 'filter_singleSelect', 'filter_sicht',
    'filter_dienststelle', 'filter_nativeMultiSelect', 'widget_canvasDrop', 'widget_launchpadTransfer', 'widget_layoutMove', 'widget_layoutResize',
    'widgetSettings_optionSelect', 'widget_textEdit', 'tabs_move', 'tabs_delete', 'tabs_duplicate', 'tabs_rename',
  ]);
  for (const [key, handler] of registered) {
    const owner = manifest.replayOrder.find((name) => byName.get(name).replayKeys.includes(key));
    assert.equal(handler, contributions[owner], key);
  }
});

test('registerReplayHandlers: contributions without apply, missing owners and missing runtime are skipped', () => {
  const none = replayKit();
  none.kdb.runtime = undefined;
  none.run();
  assert.deepEqual(none.registered, []);
  const partial = replayKit();
  partial.kdb.runtime = {
    header: { historyReplayHandlerContribution: {} },
    tabs: { historyReplayHandlerContribution: { apply() {} } },
    footer: {},
    sicht: null,
  };
  partial.run();
  assert.deepEqual(partial.registered.map(([key]) => key), ['tabs_move', 'tabs_delete', 'tabs_duplicate', 'tabs_rename']);
});

test('registerReplayHandlers: a missing history service only warns', () => {
  const { registered, warnings, run } = replayKit({ withHistory: false });
  run();
  assert.deepEqual(registered, []);
  assert.deepEqual(warnings.map((entry) => entry[0]), ['[bootstrap.registerReplayHandlers] services.history.registerReplayHandler is missing']);
});
