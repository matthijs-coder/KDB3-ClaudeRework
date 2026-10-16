// Golden tests for WS-O1: core/events, core/authoring, core/homeDialog (replay registration lives in bootstrap-manifest.test.mjs).
// Run: node --test tools/tests/ws-o1-core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadAmd } from '../lib/amd-loader.mjs';

const JS = resolve(dirname(fileURLToPath(import.meta.url)), '../../_____________KDB3API/KDB3/js');
const load = (rel, opts) => loadAmd(resolve(JS, rel), opts);

const silentConsole = () => {
  const calls = { error: [], warn: [], log: [] };
  return {
    calls,
    console: {
      error: (...a) => calls.error.push(a),
      warn: (...a) => calls.warn.push(a),
      log: (...a) => calls.log.push(a),
    },
  };
};

function makeKdb(consoleStub) {
  const createEventBus = load('core/events/createEventBus.js', { stubs: { console: consoleStub } });
  return { events: createEventBus(), state: {}, runtime: {}, api: {}, services: {}, config: {} };
}

// ---------------------------------------------------------------- events

test('bus: emit order and payload', () => {
  const { console } = silentConsole();
  const bus = load('core/events/createEventBus.js', { stubs: { console } })();
  const seen = [];
  bus.subscribe('a', (p) => seen.push(['h1', p]));
  bus.subscribe('a', (p) => seen.push(['h2', p]));
  bus.subscribe('b', (p) => seen.push(['b', p]));
  bus.emit('a', 1);
  assert.deepEqual(seen, [['h1', 1], ['h2', 1]]);
  bus.emit('none', 2);
  assert.equal(seen.length, 2);
});

test('bus: a throwing handler is isolated and logged', () => {
  const { console, calls } = silentConsole();
  const bus = load('core/events/createEventBus.js', { stubs: { console } })();
  const seen = [];
  bus.subscribe('a', () => { throw new Error('boom'); });
  bus.subscribe('a', (p) => seen.push(p));
  bus.emit('a', 7);
  assert.deepEqual(seen, [7]);
  assert.equal(calls.error.length, 1);
  assert.equal(calls.error[0][0], '[core.events.emit]');
});

test('bus: returned unsubscribe removes only that handler; safe to call twice', () => {
  const { console } = silentConsole();
  const bus = load('core/events/createEventBus.js', { stubs: { console } })();
  const seen = [];
  const off = bus.subscribe('a', () => seen.push('x'));
  bus.subscribe('a', () => seen.push('y'));
  off();
  off();
  bus.emit('a');
  assert.deepEqual(seen, ['y']);
});

test('bus: emit iterates a snapshot (unsubscribe during emit)', () => {
  const { console } = silentConsole();
  const bus = load('core/events/createEventBus.js', { stubs: { console } })();
  const seen = [];
  let offSecond;
  bus.subscribe('a', () => { seen.push('first'); offSecond(); });
  offSecond = bus.subscribe('a', () => seen.push('second'));
  bus.emit('a');
  assert.deepEqual(seen, ['first', 'second']);
  bus.emit('a');
  assert.deepEqual(seen, ['first', 'second', 'first']);
});

test('bus: {signal} abort unsubscribes; already-aborted signal never subscribes', () => {
  const { console } = silentConsole();
  const bus = load('core/events/createEventBus.js', { stubs: { console } })();
  const seen = [];
  const ac = new AbortController();
  bus.subscribe('a', () => seen.push('live'), { signal: ac.signal });
  bus.emit('a');
  ac.abort();
  bus.emit('a');
  assert.deepEqual(seen, ['live']);
  const aborted = new AbortController();
  aborted.abort();
  bus.subscribe('a', () => seen.push('never'), { signal: aborted.signal });
  bus.emit('a');
  assert.deepEqual(seen, ['live']);
});

test('bus: invalid subscribe arguments throw', () => {
  const { console } = silentConsole();
  const bus = load('core/events/createEventBus.js', { stubs: { console } })();
  assert.throws(() => bus.subscribe('', () => {}), /Event name/);
  assert.throws(() => bus.subscribe('a', null), /Event handler/);
});

test('bus: public surface has no unsubscribe method', () => {
  const { console } = silentConsole();
  const bus = load('core/events/createEventBus.js', { stubs: { console } })();
  assert.deepEqual(Object.keys(bus).sort(), ['emit', 'subscribe']);
});

test('authoringMode constants and selector keep their shape', () => {
  assert.deepEqual({ ...load('core/events/authoringMode.js') }, {
    AUTHORING_ENTERED: 'authoring:entered',
    AUTHORING_EXITED: 'authoring:exited',
  });
  const readIsAuthoring = load('core/authoring/state/selectors.js');
  assert.equal(readIsAuthoring({ state: { authoring: { isAuthoring: true } } }), true);
  assert.equal(readIsAuthoring({ state: { authoring: { isAuthoring: 1 } } }), false);
  assert.equal(readIsAuthoring(null), false);
});

// ------------------------------------------------------------- authoring

function setupAuthoring({ withHost = false } = {}) {
  const { console, calls } = silentConsole();
  const kdb = makeKdb(console);
  const events = [];
  kdb.events.subscribe('authoring:entered', (p) => events.push(['entered', p]));
  kdb.events.subscribe('authoring:exited', (p) => events.push(['exited', p]));
  const host = { uiCallbacks: [], unsubscribed: 0 };
  if (withHost) {
    kdb.services.cognosHost = {
      dashboard: {
        subscribeUiState(cb) {
          host.uiCallbacks.push(cb);
          return { remove: () => { host.unsubscribed += 1; } };
        },
      },
    };
  }
  const orchestrator = load('core/authoring/__orchestratorAuthoring.js', { stubs: { console } });
  return { kdb, events, host, calls, orchestrator };
}

const enter = (source) => ({ type: 'authoring/enter', payload: { source } });
const exit = (source) => ({ type: 'authoring/exit', payload: { source } });

test('authoring: enter/exit emit exactly once per real change', () => {
  const { kdb, events, orchestrator } = setupAuthoring({ withHost: true });
  orchestrator(kdb);
  assert.deepEqual(kdb.api.authoring.getState(), { isAuthoring: false });
  kdb.api.authoring.dispatch(enter('api'));
  kdb.api.authoring.dispatch(enter('api'));
  assert.deepEqual(events, [['entered', { isAuthoring: true, source: 'api' }]]);
  assert.deepEqual(kdb.state.authoring, { isAuthoring: true });
  assert.deepEqual(kdb.api.authoring.getState(), { isAuthoring: true });
  kdb.api.authoring.dispatch(exit('bootstrap'));
  kdb.api.authoring.dispatch(exit('bootstrap'));
  assert.equal(events.length, 2);
  assert.deepEqual(events[1], ['exited', { isAuthoring: false, source: 'bootstrap' }]);
});

test('authoring: initial exit does not emit', () => {
  const { kdb, events, orchestrator } = setupAuthoring({ withHost: true });
  orchestrator(kdb);
  kdb.api.authoring.dispatch(exit('api'));
  assert.deepEqual(events, []);
});

test('authoring: invalid type or source is ignored and logged', () => {
  const { kdb, events, calls, orchestrator } = setupAuthoring({ withHost: true });
  orchestrator(kdb);
  kdb.api.authoring.dispatch({ type: 'authoring/toggle', payload: { source: 'api' } });
  kdb.api.authoring.dispatch(enter('nowhere'));
  kdb.api.authoring.dispatch({ type: 'authoring/enter' });
  kdb.api.authoring.dispatch(null);
  assert.deepEqual(events, []);
  assert.equal(kdb.api.authoring.getState().isAuthoring, false);
  assert.equal(calls.error.length, 4);
});

test('authoring: host uiState callback dispatches with source cognos-ui; _isDisposed is ignored', () => {
  const { kdb, events, host, orchestrator } = setupAuthoring({ withHost: true });
  orchestrator(kdb);
  assert.equal(host.uiCallbacks.length, 1);
  host.uiCallbacks[0]({ authoring: true });
  host.uiCallbacks[0]({ authoring: true });
  host.uiCallbacks[0]({ authoring: false });
  assert.deepEqual(events, [
    ['entered', { isAuthoring: true, source: 'cognos-ui' }],
    ['exited', { isAuthoring: false, source: 'cognos-ui' }],
  ]);
  kdb._isDisposed = true;
  host.uiCallbacks[0]({ authoring: true });
  assert.equal(events.length, 2);
});

test('authoring: handshake with cognosHost present subscribes immediately', () => {
  const { kdb, host, orchestrator } = setupAuthoring({ withHost: true });
  orchestrator(kdb);
  assert.equal(kdb.runtime.authoring.dashboardFacet, kdb.services.cognosHost.dashboard);
  assert.equal(kdb.runtime.authoring.pendingDashboardFacetStamp, undefined);
  assert.equal(kdb.runtime.authoring.isDashboardUiStateSubscribed, true);
  assert.equal(host.uiCallbacks.length, 1);
});

test('authoring: handshake without cognosHost leaves a one-shot pendingDashboardFacetStamp', () => {
  const { kdb, host, orchestrator } = setupAuthoring({ withHost: false });
  orchestrator(kdb);
  assert.equal(kdb.runtime.authoring.dashboardFacet, null);
  const stamp = kdb.runtime.authoring.pendingDashboardFacetStamp;
  assert.equal(typeof stamp, 'function');
  assert.equal(host.uiCallbacks.length, 0);
  kdb.services.cognosHost = {
    dashboard: { subscribeUiState(cb) { host.uiCallbacks.push(cb); return () => { host.unsubscribed += 1; }; } },
  };
  stamp();
  assert.equal(kdb.runtime.authoring.pendingDashboardFacetStamp, null);
  assert.equal(kdb.runtime.authoring.dashboardFacet, kdb.services.cognosHost.dashboard);
  assert.equal(host.uiCallbacks.length, 1);
  stamp();
  assert.equal(host.uiCallbacks.length, 1, 'second stamp must not subscribe again');
});

test('authoring: a host facet without subscribeUiState is stamped but never subscribed', () => {
  const { kdb, orchestrator } = setupAuthoring({ withHost: false });
  kdb.services.cognosHost = { dashboard: {} };
  orchestrator(kdb);
  assert.deepEqual(kdb.runtime.authoring.dashboardFacet, {});
  assert.notEqual(kdb.runtime.authoring.isDashboardUiStateSubscribed, true);
});

test('authoring: destroy unsubscribes host (remove/off/unsubscribe/dispose/function handles) and resets state', () => {
  const handles = {
    remove: (n) => ({ remove: n }),
    off: (n) => ({ off: n }),
    unsubscribe: (n) => ({ unsubscribe: n }),
    dispose: (n) => ({ dispose: n }),
    fn: (n) => n,
  };
  for (const [kind, make] of Object.entries(handles)) {
    const { console } = silentConsole();
    const kdb = makeKdb(console);
    let detached = 0;
    let cb;
    kdb.services.cognosHost = { dashboard: { subscribeUiState(c) { cb = c; return make(() => { detached += 1; }); } } };
    load('core/authoring/__orchestratorAuthoring.js', { stubs: { console } })(kdb);
    kdb.api.authoring.dispatch(enter('api'));
    kdb.api.authoring.destroy();
    assert.equal(detached, 1, kind);
    assert.deepEqual(kdb.state.authoring, { isAuthoring: false }, kind);
    assert.equal(kdb.runtime.authoring, null, kind);
    const before = kdb.state.authoring;
    cb({ authoring: true });
    assert.equal(kdb.state.authoring, before, `${kind}: callback after destroy must be inert`);
  }
});

test('authoring: a throwing host unsubscribe is logged and does not block destroy', () => {
  const { kdb, calls, orchestrator } = setupAuthoring({ withHost: false });
  kdb.services.cognosHost = { dashboard: { subscribeUiState: () => ({ remove() { throw new Error('x'); } }) } };
  orchestrator(kdb);
  kdb.api.authoring.destroy();
  assert.equal(kdb.runtime.authoring, null);
  assert.equal(calls.error.length, 1);
});

test('authoring: re-mount detaches the previous host subscription before resetting runtime', () => {
  const { kdb, host, orchestrator } = setupAuthoring({ withHost: true });
  orchestrator(kdb);
  kdb.api.authoring.mount();
  assert.equal(host.unsubscribed, 1);
  assert.deepEqual(kdb.runtime.authoring, {});
});

test('authoring: mount keeps an existing state slice', () => {
  const { kdb, orchestrator } = setupAuthoring({ withHost: true });
  kdb.state.authoring = { isAuthoring: true };
  orchestrator(kdb);
  assert.deepEqual(kdb.api.authoring.getState(), { isAuthoring: true });
});

// ------------------------------------------------------------ homeDialog

test('homeDialog orchestrator: existing labels win, 4 runtime keys are set', () => {
  const { console } = silentConsole();
  const kdb = { config: { labels: { de: { homeDialog: { closeLabel: 'Custom close' } } } }, services: {} };
  const dataSources = { hasErrorDataSource() {} };
  const dashboard = { replaceWithBiHomePerspective() {} };
  kdb.services.cognosHost = { dataSources, dashboard };
  const orchestrator = load('core/homeDialog/__orchestratorHomeDialog.js', { stubs: { console } });
  const runtime = orchestrator(kdb);
  const labels = kdb.config.labels.de.homeDialog;
  assert.equal(labels.closeLabel, 'Custom close');
  assert.equal(labels.cubesUnavailableTitle, 'Daten-Cubes nicht verfügbar');
  assert.equal(
    labels.cubesUnavailableBody,
    'Die benötigten Daten-Cubes können derzeit nicht geladen werden. Möglicherweise läuft die Beladung derzeit noch, ' +
      'Sie verfügen nicht über die erforderlichen Berechtigungen oder es ist ein Fehler aufgetreten.',
  );
  assert.equal(labels.minimizeLabel, 'Dashboard minimalisieren');
  assert.equal(labels.navInstruction, 'Wechseln Sie zur Startseite.');
  assert.deepEqual(Object.keys(labels).sort(), ['closeLabel', 'cubesUnavailableBody', 'cubesUnavailableTitle', 'minimizeLabel', 'navInstruction']);
  assert.equal(runtime, kdb.runtime.homeDialog);
  assert.equal(runtime.dataSourcesFacet, dataSources);
  assert.equal(runtime.dashboardFacet, dashboard);
  assert.equal(typeof runtime.presentHomeChoice, 'function');
  assert.equal(typeof runtime.presentCubesUnavailable, 'function');
});

test('homeDialog orchestrator: without cognosHost the facets are null; empty KDB works', () => {
  const { console } = silentConsole();
  const kdb = {};
  const runtime = load('core/homeDialog/__orchestratorHomeDialog.js', { stubs: { console } })(kdb);
  assert.equal(runtime.dataSourcesFacet, null);
  assert.equal(runtime.dashboardFacet, null);
  assert.deepEqual(Object.keys(runtime).sort(), ['dashboardFacet', 'dataSourcesFacet', 'presentCubesUnavailable', 'presentHomeChoice']);
  assert.equal(kdb.config.labels.de.homeDialog.closeLabel, 'Dashboard schließen');
});

function setupHomeDialog({ choice, facetOverrides } = {}) {
  const { console, calls } = silentConsole();
  const nav = [];
  const dashboard = {
    replaceWithBiHomePerspective: () => nav.push('close'),
    openAppView: async (v) => nav.push('minimize:' + v),
    ...facetOverrides,
  };
  const choose = [];
  const kdb = {
    services: {
      cognosHost: { dashboard, dataSources: { hasErrorDataSource: async () => ({ ok: true, data: true }) } },
      message: {
        choose: async (req) => {
          choose.push(req);
          return choice ? { reason: 'selected', choice } : { reason: 'dismissed' };
        },
      },
    },
  };
  load('core/homeDialog/__orchestratorHomeDialog.js', { stubs: { console } })(kdb);
  return { kdb, nav, choose, calls };
}

test('presentHomeChoice: builds the choose request and navigates close / minimize', async () => {
  for (const [choice, expected] of [['home-close', 'close'], ['home-minimize', 'minimize:home']]) {
    const { kdb, nav, choose } = setupHomeDialog({ choice });
    await kdb.runtime.homeDialog.presentHomeChoice(kdb, { title: 'T', message: 'M', code: 'C', severity: 'error' });
    assert.equal(choose.length, 1);
    assert.deepEqual(choose[0], {
      code: 'C',
      title: 'T',
      message: 'M\n\nWechseln Sie zur Startseite.',
      severity: 'error',
      showCancel: false,
      choices: [
        { id: 'home-close', label: 'Dashboard schließen' },
        { id: 'home-minimize', label: 'Dashboard minimalisieren' },
      ],
    });
    assert.deepEqual(nav, [expected]);
  }
});

test('presentHomeChoice: dismissed choice does not navigate; missing choose or labels only warn', async () => {
  const dismissed = setupHomeDialog({});
  await dismissed.kdb.runtime.homeDialog.presentHomeChoice(dismissed.kdb, { message: 'M' });
  assert.deepEqual(dismissed.nav, []);

  const noChoose = setupHomeDialog({ choice: 'home-close' });
  noChoose.kdb.services.message = {};
  await noChoose.kdb.runtime.homeDialog.presentHomeChoice(noChoose.kdb, {});
  assert.deepEqual(noChoose.nav, []);
  assert.equal(noChoose.calls.warn.length, 1);

  const noLabels = setupHomeDialog({ choice: 'home-close' });
  noLabels.kdb.config.labels.de.homeDialog.closeLabel = '';
  await noLabels.kdb.runtime.homeDialog.presentHomeChoice(noLabels.kdb, {});
  assert.equal(noLabels.choose.length, 0);
  assert.equal(noLabels.calls.warn.length, 1);
});

test('presentHomeChoice: a missing navigation method only warns; a throwing one is logged, never thrown', async () => {
  const missing = setupHomeDialog({ choice: 'home-close' });
  missing.kdb.runtime.homeDialog.dashboardFacet = {};
  await missing.kdb.runtime.homeDialog.presentHomeChoice(missing.kdb, {});
  assert.equal(missing.calls.warn.length, 1);

  const throwing = setupHomeDialog({
    choice: 'home-minimize',
    facetOverrides: { openAppView: async () => { throw new Error('nav'); } },
  });
  await throwing.kdb.runtime.homeDialog.presentHomeChoice(throwing.kdb, {});
  assert.equal(throwing.calls.error.length, 1);
});

test('presentCubesUnavailable: shows the choice only when a data source has an error', async () => {
  const { kdb, choose } = setupHomeDialog({ choice: 'home-close' });
  await kdb.runtime.homeDialog.presentCubesUnavailable(kdb);
  assert.equal(choose.length, 1);
  assert.equal(choose[0].code, 'CUBES_UNAVAILABLE');
  assert.equal(choose[0].severity, 'error');
  assert.equal(choose[0].title, 'Daten-Cubes nicht verfügbar');
  assert.match(choose[0].message, /^Die benötigten Daten-Cubes.*aufgetreten\.\n\nWechseln Sie zur Startseite\.$/);

  const ok = setupHomeDialog({ choice: 'home-close' });
  ok.kdb.runtime.homeDialog.dataSourcesFacet = { hasErrorDataSource: async () => ({ ok: true, data: false }) };
  await ok.kdb.runtime.homeDialog.presentCubesUnavailable(ok.kdb);
  assert.equal(ok.choose.length, 0);
  assert.equal(ok.calls.warn.length, 1);

  const none = setupHomeDialog({ choice: 'home-close' });
  none.kdb.runtime.homeDialog.dataSourcesFacet = null;
  await none.kdb.runtime.homeDialog.presentCubesUnavailable(none.kdb);
  assert.equal(none.choose.length, 0);
  assert.equal(none.calls.warn.length, 1);
});
