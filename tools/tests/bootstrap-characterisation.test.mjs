// Characterisation of the KDB.js root lifecycle (Phase 2 W1): ordered register / mount / destroy calls, the replay
// handler keys and the behaviour of render() twice, render after destroy, destroy during render and the double boot.
// Recorded on the unchanged KDB.js first; later commits change only the entries marked with "DELTA".
// Run: node --test tools/tests/bootstrap-characterisation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHarness, deferred, flush } from './bootstrap-harness.mjs';

const REGISTER_FEATURES = [
  'header', 'footer', 'tabs', 'kdbControl', 'pageSurface', 'historyControls', 'pdfExportControls', 'wienKiControls',
  'shareControls', 'launchpad', 'widgetBase', 'widgetSettings', 'widgetText', 'widgetVis', 'widgetDataTable', 'widgetTopN',
  'dragDrop', 'metricsTree', 'filterDock', 'singleSelect', 'dienststelle', 'sicht', 'specialSingleSelect', 'nativeMultiSelect',
];

const EXPECTED_REGISTER = [
  'register:cognosHostSelectors', 'register:properties', 'register:config', 'register:css', 'register:cognosAPI',
  // DELTA (authoring commit): authoring registers after services (it was before them).
  'register:services', 'register:authoring', 'register:homeDialog', 'register:utils',
  ...REGISTER_FEATURES.map((name) => 'register:' + name),
];

const REPLAY_KEYS_IN_ORDER = [
  'kdbControl_settingsChange', 'header_chromeChange', 'header_textChange', 'footer_chromeChange', 'filter_singleSelect',
  'filter_sicht', 'filter_dienststelle', 'filter_nativeMultiSelect', 'widget_canvasDrop', 'widget_launchpadTransfer',
  'widget_layoutMove', 'widget_layoutResize', 'widgetSettings_optionSelect', 'widget_textEdit', 'tabs_move', 'tabs_delete',
  'tabs_duplicate', 'tabs_rename',
];

const MOUNT_STEPS = [
  'mount:header:{}', 'mount:footer:{}', 'mount:tabs:{}', 'mount:kdbControl:{}', 'mount:pageSurface:{}',
  'mount:historyControls:{}', 'mount:pdfExportControls:{}', 'mount:wienKiControls:{}', 'mount:shareControls:{}',
  'mount:launchpad:{}', 'mount:widgetBase:{}', 'mount:widgetSettings:{}', 'mount:widgetText:{}',
  'mount:widgetVis:{"enableDrillthrough":true}', 'mount:widgetDataTable:{}', 'mount:widgetTopN:{}', 'mount:dragDrop:{}',
  'mount:metricsTree:{}', 'mount:singleSelect:{}', 'mount:dienststelle:{}', 'mount:sicht:{}',
  'mount:specialSingleSelect:{}', 'mount:nativeMultiSelect:{}',
  // DELTA (replay registration commit): one registration after the last mount replaces the two wholesale binds.
  ...REPLAY_KEYS_IN_ORDER.map((key) => 'replay.register:' + key),
];

const EXPECTED_BOOT_FLOW = [
  ...EXPECTED_REGISTER,
  'loading.start:kdb-root-loading-animation-mount',
  'homeDialog.presentCubesUnavailable',
  ...MOUNT_STEPS,
  'loading.finish:kdb-root-loading-animation-mount',
  'mount:filterDock:{}',
  'call:shareControls.applyReadOnlyChrome',
  'call:writebackSet.whenUrlShareRestoreSettled',
];

const EXPECTED_DESTROY = [
  'destroy:nativeMultiSelect', 'destroy:specialSingleSelect', 'destroy:sicht', 'destroy:dienststelle', 'destroy:singleSelect',
  'destroy:filterDock', 'destroy:metricsTree', 'destroy:pdfExportControls', 'destroy:wienKiControls', 'destroy:shareControls',
  // DELTA (authoring commit): authoring is destroyed before kdbControl and tabs (it was after launchpad).
  'destroy:pageSurface', 'destroy:authoring', 'destroy:kdbControl', 'destroy:tabs', 'destroy:historyControls', 'destroy:dragDrop',
  'destroy:widgetTopN', 'destroy:widgetDataTable', 'destroy:widgetVis', 'destroy:widgetText', 'destroy:widgetSettings',
  'destroy:widgetBase', 'destroy:launchpad', 'destroy:footer', 'destroy:header',
  'destroy:properties.controller',
  'service.destroy:writebackBridge', 'service.destroy:writebackSet', 'service.destroy:writebackGet',
  'service.destroy:writebackMap', 'service.destroy:dashboardPdf', 'service.destroy:widgetBindingApply',
  'service.destroy:history', 'service.destroy:message', 'service.destroy:loading', 'service.destroy:tableData',
  'service.destroy:cognosHost',
];

const REPLAY_OWNER_BY_KEY = {
  kdbControl_settingsChange: 'kdbControl', header_chromeChange: 'header', header_textChange: 'header',
  footer_chromeChange: 'footer', filter_singleSelect: 'singleSelect', filter_sicht: 'sicht',
  filter_dienststelle: 'dienststelle', filter_nativeMultiSelect: 'nativeMultiSelect', widget_canvasDrop: 'widgetBase',
  widget_launchpadTransfer: 'widgetBase', widget_layoutMove: 'widgetBase', widget_layoutResize: 'widgetBase',
  widgetSettings_optionSelect: 'widgetSettings', widget_textEdit: 'widgetText', tabs_move: 'tabs', tabs_delete: 'tabs',
  tabs_duplicate: 'tabs', tabs_rename: 'tabs',
};

const RENDER_FAILED_TEXT = 'Das KDB-Dashboard konnte nicht geladen werden. Bitte das Dashboard schließen und erneut öffnen. Details: ';

const countOf = (log, entry) => log.filter((line) => line === entry).length;

test('boot: ordered register, mount and destroy calls', async () => {
  const h = createHarness({ props: { loadingImage: true } });
  const kdb = h.createKdb();
  assert.equal(await kdb.getAPI().render({ parent: { id: 'p' } }), true);
  assert.deepEqual(h.log, EXPECTED_BOOT_FLOW);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'ready');
  h.log.length = 0;
  kdb.destroy();
  assert.deepEqual(h.log, EXPECTED_DESTROY);
  assert.equal(h.log.includes('service.destroy:drillthrough'), false, 'drillthrough is not in the destroy list');
  assert.equal(h.log.includes('service.destroy:widgetBindingPlan'), false);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'disposed');
  assert.deepEqual([h.consoleCalls.error.length, h.consoleCalls.warn.length], [0, 0]);
});

test('boot without the loading animation: no loading calls, same mounts', async () => {
  const h = createHarness({ props: { loadingImage: false } });
  const kdb = h.createKdb();
  assert.equal(await kdb.renderKDB({}), true);
  assert.deepEqual(h.log, EXPECTED_BOOT_FLOW.filter((line) => !line.startsWith('loading.')));
});

test('mount arguments: the render parent is stored as domRefs.renderParentEl before the mounts', async () => {
  const h = createHarness();
  const options = { parent: { id: 'parent-1' }, content: { id: 'content-1' }, features: { UserProfile: 'u' } };
  const kdb = h.createKdb(options);
  assert.equal(kdb.runtime.core.domRefs.renderParentEl, options.parent);
  const renderParent = { id: 'render-parent' };
  await kdb.renderKDB({ parent: renderParent });
  assert.equal(kdb.runtime.core.domRefs.renderParentEl, renderParent);
  assert.equal(kdb.runtime.core.adapters.userProfile, 'u');
});

test('replay handlers: 18 keys in order, each routed to its owner (real history service)', async () => {
  const h = createHarness({ realServices: true });
  const kdb = h.createKdb();
  await kdb.renderKDB({});
  const history = kdb.services.history;
  const bindLines = h.log.filter((line) => line.startsWith('replay.bind:'));
  const registerLines = h.log.filter((line) => line.startsWith('replay.register:'));
  assert.deepEqual(bindLines, []);
  assert.deepEqual(registerLines, REPLAY_KEYS_IN_ORDER.map((key) => 'replay.register:' + key));
  h.log.length = 0;
  for (const key of REPLAY_KEYS_IN_ORDER) {
    assert.equal(history.pushCommittedStep({ key, old: { v: 1 }, new: { v: 2 } }), true, key);
    assert.equal(await history.undo(), true, key);
  }
  assert.deepEqual(h.log.filter((line) => line.startsWith('replay:')), REPLAY_KEYS_IN_ORDER.map((key) => 'replay:' + REPLAY_OWNER_BY_KEY[key] + ':' + key));
});

test('render() twice, sequentially: the second call returns the first promise and runs nothing again', async () => {
  const h = createHarness({ props: { loadingImage: true } });
  const kdb = h.createKdb();
  const first = kdb.renderKDB({});
  assert.equal(await first, true);
  const logged = h.log.length;
  const second = kdb.renderKDB({ parent: { id: 'other' } });
  assert.equal(second, first);
  assert.equal(await second, true);
  assert.equal(h.log.length, logged);
  assert.equal(countOf(h.log, 'register:header'), 1);
  assert.equal(countOf(h.log, 'register:services'), 1);
  assert.equal(countOf(h.log, 'mount:header:{}'), 1);
  assert.equal(countOf(h.log, 'mount:filterDock:{}'), 1);
  assert.equal(countOf(h.log, 'loading.start:kdb-root-loading-animation-mount'), 1);
});

test('render() twice, concurrently: one run', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  const first = kdb.renderKDB({});
  const second = kdb.renderKDB({});
  assert.equal(second, first);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(countOf(h.log, 'register:header'), 1);
  assert.equal(countOf(h.log, 'mount:header:{}'), 1);
});

test('render() from getAPI() twice returns the same promise; a failed first render stays failed', async () => {
  const h = createHarness({ failMount: 'tabs' });
  const kdb = h.createKdb();
  const api = kdb.getAPI();
  const first = api.render({});
  assert.equal(api.render({}), first);
  assert.equal(await first, false);
  assert.equal(kdb.renderKDB({}), first);
  assert.equal(countOf(h.log, 'register:header'), 1);
  assert.equal(h.alerts.length, 1);
});

test('render() after destroy: warns and returns false without registering anything', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  await kdb.renderKDB({});
  kdb.destroy();
  h.log.length = 0;
  assert.equal(await kdb.renderKDB({}), false);
  assert.deepEqual(h.log, []);
  assert.deepEqual(h.consoleCalls.warn.map((entry) => entry[0]), ['[core.renderKDB] called after destroy']);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'disposed');
});

test('render() on a never-rendered destroyed instance returns false', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  kdb.destroy();
  assert.equal(await kdb.renderKDB({}), false);
  assert.deepEqual(h.log.filter((line) => line.startsWith('register:') || line.startsWith('mount:')), []);
});

test('setupCore and startModules after destroy warn and return false', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  await kdb.renderKDB({});
  kdb.destroy();
  h.log.length = 0;
  assert.equal(await kdb.setupCore(), false);
  assert.equal(await kdb.startModules({}), false);
  assert.deepEqual(h.log, []);
  assert.deepEqual(h.consoleCalls.warn.map((entry) => entry[0]), ['[core.setupCore] called after destroy', '[core.startModules] called after destroy']);
});

test('destroy while render waits for the cubes dialog: no mounts, no loading finish, render resolves false', async () => {
  const gate = deferred();
  const h = createHarness({ props: { loadingImage: true }, cubesGate: gate });
  const kdb = h.createKdb();
  const rendering = kdb.renderKDB({});
  await flush();
  assert.ok(h.log.includes('homeDialog.presentCubesUnavailable'));
  kdb.destroy();
  h.log.length = 0;
  gate.resolve();
  assert.equal(await rendering, false);
  assert.deepEqual(h.log, []);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'disposed');
  assert.deepEqual(h.consoleCalls.warn.map((entry) => entry[0]), ['[core.renderKDB] destroyed during render, stopped after cubes dialog']);
});

test('destroy right after render() started: the cubes dialog is not presented, nothing mounts or finishes', async () => {
  const h = createHarness({ props: { loadingImage: true } });
  const kdb = h.createKdb();
  const rendering = kdb.renderKDB({});
  kdb.destroy();
  assert.equal(await rendering, false);
  assert.equal(h.log.some((line) => line.startsWith('mount:')), false);
  assert.equal(h.log.includes('loading.start:kdb-root-loading-animation-mount'), false);
  assert.equal(h.log.includes('loading.finish:kdb-root-loading-animation-mount'), false);
  assert.equal(h.log.includes('homeDialog.presentCubesUnavailable'), false);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'disposed');
  assert.deepEqual(h.consoleCalls.warn.map((entry) => entry[0]), ['[core.renderKDB] destroyed during render, stopped after setupCore']);
});

test('destroy during a failing mount sequence does not overwrite "disposed" with "error"', async () => {
  const gate = deferred();
  const h = createHarness({ failMount: 'header', cubesGate: gate });
  const kdb = h.createKdb();
  const rendering = kdb.renderKDB({});
  await flush();
  kdb.destroy();
  gate.resolve();
  assert.equal(await rendering, false);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'disposed');
});

test('double boot: the older instance destroying itself keeps the newer window.top.getKDB anchor', async () => {
  const h = createHarness();
  const first = h.createKdb();
  await first.renderKDB({});
  assert.equal(h.top.getKDB(), first);
  const second = h.createKdb();
  await second.renderKDB({});
  assert.equal(h.top.getKDB(), second);
  first.destroy();
  assert.equal(typeof h.top.getKDB, 'function');
  assert.equal(h.top.getKDB(), second);
  second.destroy();
  assert.equal(h.top.getKDB, undefined);
});

test('getKDB anchor wrapped by a measuring function: ownership falls back to a probe call', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  await kdb.renderKDB({});
  const inner = h.top.getKDB;
  h.top.getKDB = () => inner();
  kdb.destroy();
  assert.equal(h.top.getKDB, undefined);
});

test('getKDB anchor pointing at a foreign instance is left alone', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  await kdb.renderKDB({});
  const foreign = () => ({ other: true });
  h.top.getKDB = foreign;
  kdb.destroy();
  assert.equal(h.top.getKDB, foreign);
});

test('getAPI(): exactly { render }, bound to the instance', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  const api = kdb.getAPI();
  assert.deepEqual(Object.keys(api), ['render']);
  assert.equal(await api.render({}), true);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'ready');
});

test('destroy releases the root namespaces and is idempotent', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  await kdb.renderKDB({});
  kdb.destroy();
  assert.equal(kdb._isDisposed, true);
  assert.equal(kdb._teardownComplete, true);
  assert.deepEqual([kdb.events, kdb.services, kdb.api, kdb.cognosAPI], [null, null, null, null]);
  assert.deepEqual(kdb.runtime.core, {});
  assert.equal(h.top.getKDB, undefined);
  h.log.length = 0;
  kdb.destroy();
  assert.deepEqual(h.log, []);
});

test('destroy: a throwing feature does not stop the rest; lifecycle ends in "error"', async () => {
  const h = createHarness({ failDestroy: 'tabs' });
  const kdb = h.createKdb();
  await kdb.renderKDB({});
  h.log.length = 0;
  kdb.destroy();
  assert.deepEqual(h.log, EXPECTED_DESTROY);
  assert.deepEqual(kdb.state.rootLifecycle, { lifecycle: 'error', errorCode: 'ROOT_LIFECYCLE_ERROR', errorMessage: 'boom tabs' });
  assert.equal(kdb._teardownComplete, true);
});

test('destroy: a throwing service does not stop the other services', async () => {
  const h = createHarness({ failDestroy: 'service:message' });
  const kdb = h.createKdb();
  await kdb.renderKDB({});
  h.log.length = 0;
  kdb.destroy();
  assert.deepEqual(h.log, EXPECTED_DESTROY);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'error');
});

test('render failure in a mount: loading is finished, an alert is shown, render resolves false', async () => {
  const h = createHarness({ props: { loadingImage: true }, failMount: 'tabs' });
  const kdb = h.createKdb();
  assert.equal(await kdb.renderKDB({}), false);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'error');
  assert.equal(kdb.state.rootLifecycle.errorMessage, 'mount failed tabs');
  assert.equal(h.log.includes('mount:kdbControl:{}'), false, 'mounts after the failing one are skipped');
  const finishAt = h.log.indexOf('loading.finish:kdb-root-loading-animation-mount');
  assert.ok(finishAt > h.log.indexOf('mount:tabs:{}'));
  assert.deepEqual(h.alerts, [{ title: 'Dashboard', severity: 'error', message: RENDER_FAILED_TEXT + 'mount failed tabs' }]);
});

test('render failure on a destroyed instance shows nothing', async () => {
  const gate = deferred();
  const h = createHarness({ failMount: 'header', cubesGate: gate });
  const kdb = h.createKdb();
  const rendering = kdb.renderKDB({});
  await flush();
  kdb.destroy();
  gate.resolve();
  assert.equal(await rendering, false);
  assert.deepEqual(h.alerts, []);
});

test('KDBReadyToggle false: render halts before loading and mounts', async () => {
  const h = createHarness({ props: { ready: false, loadingImage: true } });
  const kdb = h.createKdb();
  assert.equal(await kdb.renderKDB({}), false);
  assert.deepEqual(h.log, EXPECTED_REGISTER);
  assert.deepEqual(h.consoleCalls.warn.map((entry) => entry[0]), ['[core.renderKDB] KDBReadyToggle is not true; halt before modules']);
  assert.equal(kdb.state.rootLifecycle.lifecycle, 'initializing');
});

test('installGetKDB: the anchor is stamped with its owner', async () => {
  const h = createHarness();
  const kdb = h.createKdb();
  assert.equal(h.top.getKDB, undefined);
  await kdb.renderKDB({});
  assert.equal(h.top.getKDB.__kdbOwner, kdb);
  assert.equal(h.top.getKDB(), kdb);
});
