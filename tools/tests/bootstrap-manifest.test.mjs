// Consistency of bootstrap/featureManifest.js.
// Run: node --test tools/tests/bootstrap-manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURES, TOOLBAR_API_KEYS, REPLAY_KEYS_BY_FEATURE, loadManifest } from './bootstrap-harness.mjs';

const manifest = loadManifest();
const byName = new Map(manifest.entries.map((entry) => [entry.name, entry]));

test('manifest: names are unique, every entry registers except the four toolbar buttons (one toolbarControls registration), features keep the mount order', () => {
  assert.equal(byName.size, manifest.entries.length);
  for (const entry of manifest.entries) {
    if (TOOLBAR_API_KEYS.includes(entry.name)) assert.equal(entry.register, undefined, entry.name);
    else assert.equal(typeof entry.register, 'function', entry.name);
  }
  const featureNames = manifest.entries.filter((entry) => entry.mount).map((entry) => entry.name);
  const expected = FEATURES.map((feature) => feature[0]);
  expected.splice(expected.indexOf('pageSurface') + 1, 0, ...TOOLBAR_API_KEYS);
  assert.deepEqual(featureNames, expected);
  const names = manifest.entries.map((entry) => entry.name);
  assert.equal(names.indexOf('toolbarControls'), names.indexOf('pageSurface') + 1);
  assert.equal(names.indexOf('historyControls'), names.indexOf('toolbarControls') + 1);
});

test('manifest: core steps register before the features, services before authoring', () => {
  const names = manifest.entries.map((entry) => entry.name);
  assert.deepEqual(names.slice(0, 10), [
    'bootstrapLabels', 'cognosHostSelectors', 'properties', 'config', 'css', 'cognosAPI', 'services', 'authoring', 'homeDialog', 'utils',
  ]);
});

test('manifest: api keys match the keys the orchestrators publish', () => {
  for (const [name, , apiKey] of FEATURES) assert.equal(byName.get(name).api, apiKey, name);
  for (const name of TOOLBAR_API_KEYS) assert.equal(byName.get(name).api, name);
  assert.equal(byName.get('authoring').api, 'authoring');
});

test('manifest: destroyOrder lists every entry that owns an api object or a teardown, once', () => {
  assert.equal(new Set(manifest.destroyOrder).size, manifest.destroyOrder.length);
  const destroyable = manifest.entries.filter((entry) => entry.api || typeof entry.destroy === 'function').map((entry) => entry.name);
  assert.deepEqual([...manifest.destroyOrder].sort(), [...destroyable].sort());
  for (const name of manifest.destroyOrder) assert.ok(byName.has(name), name);
});

test('manifest: bootstrapLabels registers first; properties controller, homeDialog and css are the last teardown steps, in that order', () => {
  assert.equal(manifest.entries[0].name, 'bootstrapLabels');
  assert.deepEqual(manifest.destroyOrder.slice(-3), ['properties', 'homeDialog', 'css']);
  assert.equal(manifest.destroyOrder.indexOf('header') < manifest.destroyOrder.indexOf('properties'), true);
});

test('manifest: mount phases and options', () => {
  const afterLoading = manifest.entries.filter((entry) => entry.mount && entry.mount.phase === 'afterLoading').map((entry) => entry.name);
  assert.deepEqual(afterLoading, ['filterDock']);
  assert.deepEqual(byName.get('widgetVis').mount.options, { enableDrillthrough: true });
  for (const entry of manifest.entries.filter((candidate) => candidate.mount && candidate.name !== 'widgetVis')) {
    assert.deepEqual(entry.mount.options, {}, entry.name);
  }
});

test('manifest: replay registration is owned by the features (no replayKeys/replayOrder, no collector module)', () => {
  assert.equal(manifest.replayOrder, undefined);
  assert.deepEqual(manifest.entries.filter((entry) => 'replayKeys' in entry), []);
  assert.deepEqual(Object.keys(manifest).sort(), ['destroyOrder', 'entries', 'serviceDestroyOrder']);
  const owners = Object.keys(REPLAY_KEYS_BY_FEATURE);
  assert.equal(owners.flatMap((name) => REPLAY_KEYS_BY_FEATURE[name]).length, 18);
  for (const name of owners) assert.ok(byName.has(name), name);
});

test('manifest: service teardown order', () => {
  assert.deepEqual(manifest.serviceDestroyOrder, [
    'drillthrough', 'writebackBridge', 'writebackSet', 'writebackGet', 'writebackMap', 'dashboardPdf', 'widgetBindingApply', 'history', 'message', 'loading', 'tableData', 'cognosHost',
  ]);
  assert.ok(manifest.serviceDestroyOrder.indexOf('drillthrough') < manifest.serviceDestroyOrder.indexOf('tableData'));
});
