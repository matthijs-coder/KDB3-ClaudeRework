// Golden tests for dashboard/filters/dienststelle/effects (WS-I Task B).
// Run: node --test tools/tests/dienststelle-effects.test.mjs
// Expected literals were captured from the pre-restructure modules on main.
// File size (>800 lines): one shared fake-host harness (makeFlowHost / runFlow) serves all dienststelle effect flows,
// so the flow and Multi-Stelle default tests stay together instead of duplicating that harness per file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadAmd } from '../lib/amd-loader.mjs';
import { JS_ROOT } from '../lib/amd-graph.mjs';

const DIR = path.join(JS_ROOT, 'dashboard/filters/dienststelle');

const load = (rel, opts = {}) => loadAmd(path.join(DIR, rel), opts);
const loadCore = (rel, opts) => loadAmd(path.join(JS_ROOT, rel), opts);

const subjects = {
  get aligned() {
    return load('effects/alignedDisplays.js');
  },
  get applySupport() {
    return load('effects/hostScope/apply.js');
  },
  get waitForStable() {
    return load('effects/hostScope/selection.js').waitForStableScopeValues;
  },
  get hierarchySnapshot() {
    return load('effects/hierarchySnapshot.js').readCurrentHierarchySnapshot;
  }
};

function golden(actual, expected) {
  assert.deepStrictEqual(actual, expected);
}

test('T7 aligned host displays: array input keeps one caption per visible value', () => {
  const { collectAlignedHostDisplays } = subjects.aligned;
  const values = [
    { displayValue: 'A', useValue: '1', hostDisplay: 'Host A' },
    null,
    'plain',
    { displayValue: '', useValue: '2', hostDisplay: '' },
    { displayValue: '', useValue: '', hostDisplay: 'ignored' },
    { displayValue: 'C', useValue: '3', hostDisplay: 42 }
  ];
  golden(collectAlignedHostDisplays(values), ['Host A', '', '', '']);
});

test('T7 aligned host displays: scope map input dedupes by first-seen useValue', () => {
  const { collectAlignedHostDisplays } = subjects.aligned;
  const map = {
    tab1: [
      { displayValue: 'A', useValue: '1', hostDisplay: 'Host A' },
      { displayValue: 'B', useValue: '2', hostDisplay: 'Host B' }
    ],
    tab2: [
      { displayValue: 'A again', useValue: '1', hostDisplay: 'Host A2' },
      { displayValue: 'C', useValue: ' 3 ', hostDisplay: '' },
      'raw'
    ],
    tab3: null
  };
  golden(collectAlignedHostDisplays(map), ['Host A', 'Host B', '', '']);
  golden(collectAlignedHostDisplays(null), []);
});

test('T7 aligned use/display values: trim, dedupe, display falls back to token', () => {
  const { uniqueAlignedUseDisplayValues } = subjects.aligned;
  golden(
    uniqueAlignedUseDisplayValues([' a ', 'b', 'a', '', null, 'c', 'd'], ['A', ' ', 'dup', 'x', 'y', null]),
    { useValues: ['a', 'b', 'c', 'd'], displayValues: ['A', 'b', 'c', 'd'] }
  );
  golden(uniqueAlignedUseDisplayValues('x', undefined), { useValues: [], displayValues: [] });
});

test('T8 apply helpers', () => {
  const support = subjects.applySupport;
  const { resolveReplayApplyOrder } = support;
  golden(
    support.toCognosValues([
      { displayValue: 'A', useValue: 1, hostDisplay: 'Host A' },
      null,
      { displayValue: 'B' },
      { hostDisplay: '' }
    ]),
    [{ d: 'Host A', u: '1' }, { d: 'B', u: '' }, { d: '', u: '' }]
  );
  golden(support.toCognosValues('nope'), []);
  golden(support.mapClearResult({ skipped: true }), { ok: true });
  golden(support.mapClearResult({ ok: true }), { ok: true });
  golden(support.mapClearResult(null), { ok: false, blocker: 'COGNOS_CLEAR_FAILED' });
  golden(support.mapClearResult({ ok: false }), { ok: false, blocker: 'COGNOS_SCOPE_CLEAR_REMAINING' });
  golden(support.mapClearResult({ ok: false, blocker: 'X' }), { ok: false, blocker: 'X' });
  golden(support.toAppliedResult({ ok: true }), { applied: true });
  golden(support.toAppliedResult({ ok: false, blocker: 'B' }), { applied: false, blocker: 'B' });
  const valuesByScope = { global: [{ useValue: '1' }], pageContext: { t1: [{ useValue: '2' }], t2: [] } };
  golden(support.expectedForScope('global', valuesByScope), { mode: 'values', values: [{ useValue: '1' }] });
  golden(support.expectedForScope('t1', valuesByScope), { mode: 'values', values: [{ useValue: '2' }] });
  golden(support.expectedForScope('t2', valuesByScope), { mode: 'empty' });
  golden(support.expectedForScope('t9', valuesByScope), { mode: 'empty' });
  golden(resolveReplayApplyOrder({ global: [{ useValue: '1' }], pageContext: { t1: [] } }), {
    phases: ['pageContext', 'global'],
    hasGlobal: true,
    allTargetTabsEmpty: true,
    anyTargetTabHasValue: false
  });
  golden(resolveReplayApplyOrder({ global: [], pageContext: { t1: [{ useValue: '2' }] } }), {
    phases: ['global', 'pageContext'],
    hasGlobal: false,
    allTargetTabsEmpty: false,
    anyTargetTabHasValue: true
  });
  golden(resolveReplayApplyOrder(null), {
    phases: ['global', 'pageContext'],
    hasGlobal: false,
    allTargetTabsEmpty: true,
    anyTargetTabHasValue: false
  });
});

function makeFacet(sequence) {
  const state = { reads: 0, last: undefined };
  return {
    state,
    listFilterItems(input) {
      const items = [{ itemName: 'Dienststelle_BW', itemId: 'x', rawScopeId: 'global' }];
      return { ok: true, data: input && input.scopeId === 'global' ? items : [] };
    },
    readFilterValues() {
      const value = sequence(state.reads);
      state.reads += 1;
      state.last = value;
      return { ok: true, data: value };
    }
  };
}

function makeStableKDB(facet) {
  const waitFor = loadCore('core/utils/waitFor.js');
  return {
    utils: { waitFor },
    services: { cognosHost: { filters: facet } }
  };
}

test('T9 stable poll: stable values resolve after two equal reads', async () => {
  const waitForStable = subjects.waitForStable;
  const facet = makeFacet(() => [{ d: 'Abt A', u: '1' }]);
  const KDB = makeStableKDB(facet);
  const result = await waitForStable(KDB, 'Dienststelle_BW', 'global', facet, {
    mode: 'values',
    values: [{ useValue: '1' }]
  });
  golden(result, {
    stable: true,
    lastObserved: [{ displayValue: 'Abt A', useValue: '1', source: 'cognos', hostDisplay: 'Abt A' }]
  });
  assert.equal(facet.state.reads, 2);
});

test('T9 stable poll: empty expectation and empty host are stable', async () => {
  const waitForStable = subjects.waitForStable;
  const facet = makeFacet(() => []);
  const KDB = makeStableKDB(facet);
  const result = await waitForStable(KDB, 'Dienststelle_BW', 'global', facet, { mode: 'empty' });
  golden(result, { stable: true, lastObserved: null });
});

test('T9 stable poll: flapping values give up at about two seconds', async () => {
  const waitForStable = subjects.waitForStable;
  const facet = makeFacet((n) => (n % 2 === 0 ? [{ d: 'A', u: '1' }] : [{ d: 'B', u: '2' }]));
  const KDB = makeStableKDB(facet);
  const startedAt = Date.now();
  const result = await waitForStable(KDB, 'Dienststelle_BW', 'global', facet, {
    mode: 'values',
    values: [{ useValue: '1' }]
  });
  const elapsed = Date.now() - startedAt;
  assert.equal(result.stable, false);
  assert.ok(elapsed >= 1900 && elapsed < 3500, 'elapsed ' + elapsed);
  assert.deepStrictEqual(
    result.lastObserved,
    facet.state.last.map((v) => ({ displayValue: v.d, useValue: v.u, source: 'cognos', hostDisplay: v.d }))
  );
});

const ORG = (n) => '[Org_Source].[Dienststelle].&[' + n + ']';

function snapshotKDB(resolution, facet) {
  return {
    config: { dataSources: { metrics: { default: { prefix: 'metrics' } } } },
    services: facet ? { cognosHost: { filters: facet } } : {},
    state: {
      filters: {
        dienststelle: {
          activeFilterKey: 'Dienststelle_BW',
          visibleFilterLabel: 'Dienststelle BW',
          activeHierarchyTableKey: 'bwHierarchy',
          resolution
        }
      }
    }
  };
}

test('T11 hierarchy snapshot: global selection', () => {
  const readCurrentHierarchySnapshot = subjects.hierarchySnapshot;
  const resolution = {
    dominantValues: [{ displayValue: 'Abt 1', useValue: ORG(1), hostDisplay: 'Host 1' }],
    downstreamValues: [],
    pageContextValuesByScope: { tab1: [{ displayValue: 'Ignored', useValue: ORG(9) }] },
    dominantScope: 'global',
    resolvedAt: 7
  };
  golden(readCurrentHierarchySnapshot(snapshotKDB(resolution, null), {}), {
    activeDownstreamName: 'Dienststelle_BW',
    filterId: 'Dienststelle_BW',
    filterLabel: 'Dienststelle BW',
    visibleFilterLabel: 'Dienststelle BW',
    hierarchyItemId: null,
    activeHierarchyTableKey: 'bwHierarchy',
    resolution: {
      hasConfirmedSelection: true,
      dominantValues: ['[metrics_TM1].[Dienststelle].&[1]'],
      downstreamValues: ['[metrics_TM1].[Dienststelle].&[1]'],
      displayValues: ['Abt 1'],
      hostDisplayValues: ['Host 1'],
      dominantScopeKey: 'global',
      resolvedAt: 7
    },
    source: 'dienststelle'
  });
});

test('T11 hierarchy snapshot: page-context fallback with host item id', () => {
  const readCurrentHierarchySnapshot = subjects.hierarchySnapshot;
  const facet = {
    listFilterItems(input) {
      if (input && input.allPageContextScopes) {
        return {
          ok: true,
          data: [
            { itemId: '[Org_Source].[Other].[Foo]', itemName: 'Foo', rawScopeId: 't1' },
            { itemId: '[Org_Source].[Dienststelle].[Dienststelle].[Dienststelle_BW]', itemName: 'Dienststelle_BW', rawScopeId: 't1' }
          ]
        };
      }
      return { ok: true, data: [] };
    }
  };
  const resolution = {
    dominantValues: [],
    downstreamValues: [],
    pageContextValuesByScope: {
      t1: [
        { displayValue: 'Abt 1', useValue: ORG(1), hostDisplay: 'Host 1' },
        { displayValue: '', useValue: ORG(2), hostDisplay: '' }
      ],
      t2: [{ displayValue: 'Abt 1 dup', useValue: ORG(1), hostDisplay: 'Host dup' }, 'rawToken']
    },
    dominantScope: null
  };
  golden(readCurrentHierarchySnapshot(snapshotKDB(resolution, facet), {}), {
    activeDownstreamName: 'Dienststelle_BW',
    filterId: 'Dienststelle_BW',
    filterLabel: 'Dienststelle BW',
    visibleFilterLabel: 'Dienststelle BW',
    hierarchyItemId: '[metrics_TM1].[Dienststelle].[Dienststelle].[Dienststelle_BW]',
    activeHierarchyTableKey: 'bwHierarchy',
    resolution: {
      hasConfirmedSelection: true,
      dominantValues: [
        '[metrics_TM1].[Dienststelle].&[1]',
        '[metrics_TM1].[Dienststelle].&[2]',
        'rawToken'
      ],
      downstreamValues: [
        '[metrics_TM1].[Dienststelle].&[1]',
        '[metrics_TM1].[Dienststelle].&[2]',
        'rawToken'
      ],
      displayValues: ['Abt 1', '[Org_Source].[Dienststelle].&[2]', 'rawToken'],
      hostDisplayValues: ['Host 1', '', ''],
      dominantScopeKey: null,
      resolvedAt: null
    },
    source: 'dienststelle'
  });
});

test('T11 hierarchy snapshot: no state gives null', () => {
  const readCurrentHierarchySnapshot = subjects.hierarchySnapshot;
  assert.equal(readCurrentHierarchySnapshot({ state: { filters: {} } }, {}), null);
});

function makeFrameQueue() {
  let nextId = 1;
  const pending = new Map();
  const cancelled = [];
  return {
    cancelled,
    pending,
    requestAnimationFrame(callback) {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      cancelled.push(id);
      pending.delete(id);
    },
    flushOne() {
      const [id, callback] = pending.entries().next().value;
      pending.delete(id);
      callback(0);
    },
    flushAll() {
      let frames = 0;
      while (pending.size) {
        this.flushOne();
        frames += 1;
      }
      return frames;
    }
  };
}

function loadViewSync(frames, calls) {
  const syncView = (_KDB, handoff) => calls.push(['view', handoff && handoff.id]);
  const syncNames = () => calls.push(['names']);
  const stubs = {
    requestAnimationFrame: frames.requestAnimationFrame,
    cancelAnimationFrame: frames.cancelAnimationFrame
  };
  return load(VIEW_SYNC_PATH, {
    stubs,
    modules: {
      [VIEW_SYNC_SPEC.syncView]: Object.assign(syncView, { syncViewFromState: syncView }),
      [VIEW_SYNC_SPEC.syncNames]: Object.assign(syncNames, { syncFilterDockNames: syncNames })
    }
  });
}

const VIEW_SYNC_PATH = 'effects/viewSync.js';
const VIEW_SYNC_SPEC = {
  syncView: '../view/syncView.js',
  syncNames: '../view/dockNames.js'
};
const scheduleViewSync = (mod) => mod.scheduleViewSync;

test('T10 view sync: user confirm waits four frames, then syncs once', () => {
  const frames = makeFrameQueue();
  const calls = [];
  const schedule = scheduleViewSync(loadViewSync(frames, calls));
  const KDB = { runtime: { dienststelle: { timers: {} } } };
  schedule(KDB, { source: 'user', viewSyncHandoff: { id: 'h1', filterScope: 'global' } }, { resolution: null });
  assert.equal(frames.pending.size, 1);
  assert.deepStrictEqual(calls, []);
  assert.deepStrictEqual(KDB.runtime.dienststelle.timers.viewSync, { kind: 'raf', id: [...frames.pending.keys()][0] });
  assert.equal(frames.flushAll(), 4);
  assert.deepStrictEqual(calls, [['names'], ['view', 'h1']]);
  assert.deepStrictEqual(KDB.runtime.dienststelle.timers, {});
});

test('T10 view sync: a second schedule cancels the first', () => {
  const frames = makeFrameQueue();
  const calls = [];
  const schedule = scheduleViewSync(loadViewSync(frames, calls));
  const KDB = { runtime: { dienststelle: { timers: {} } } };
  schedule(KDB, { source: 'user', viewSyncHandoff: { id: 'h1' } }, null);
  const firstFrame = [...frames.pending.keys()][0];
  schedule(KDB, { source: 'user', viewSyncHandoff: { id: 'h2' } }, null);
  assert.ok(frames.cancelled.includes(firstFrame));
  assert.equal(frames.pending.size, 1);
  frames.flushAll();
  assert.deepStrictEqual(calls, [['names'], ['view', 'h2']]);
});

test('T10 view sync: pending frame is cancelled by runtime teardown', () => {
  const frames = makeFrameQueue();
  const calls = [];
  const schedule = scheduleViewSync(loadViewSync(frames, calls));
  const kitRuntime = loadCore('core/utils/kit/runtime.js', {
    stubs: { requestAnimationFrame: frames.requestAnimationFrame, cancelAnimationFrame: frames.cancelAnimationFrame }
  });
  const KDB = { runtime: { dienststelle: { timers: {} } } };
  schedule(KDB, { source: 'user', viewSyncHandoff: { id: 'h1' } }, null);
  assert.deepStrictEqual(kitRuntime.disposeRuntimeBuckets(KDB.runtime.dienststelle), []);
  assert.equal(frames.pending.size, 0);
  assert.deepStrictEqual(calls, []);
});

test('T10 view sync: without requestAnimationFrame four chained timeouts run the sync once', async () => {
  const calls = [];
  const syncView = (_KDB, handoff) => calls.push(['view', handoff && handoff.id]);
  const syncNames = () => calls.push(['names']);
  const schedule = scheduleViewSync(
    load(VIEW_SYNC_PATH, {
      stubs: { requestAnimationFrame: undefined },
      modules: {
        [VIEW_SYNC_SPEC.syncView]: Object.assign(syncView, { syncViewFromState: syncView }),
        [VIEW_SYNC_SPEC.syncNames]: Object.assign(syncNames, { syncFilterDockNames: syncNames })
      }
    })
  );
  const KDB = { runtime: { dienststelle: { timers: {} } } };
  schedule(KDB, { source: 'user', viewSyncHandoff: { id: 'h3' } }, null);
  assert.equal(KDB.runtime.dienststelle.timers.viewSync.kind, 'timeout');
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.deepStrictEqual(calls, [['names'], ['view', 'h3']]);
  assert.deepStrictEqual(KDB.runtime.dienststelle.timers, {});
});

test('T10 view sync: non-deferred sources sync immediately', () => {
  const frames = makeFrameQueue();
  const calls = [];
  const schedule = scheduleViewSync(loadViewSync(frames, calls));
  const KDB = { runtime: { dienststelle: { timers: {} } } };
  schedule(KDB, { source: 'sync' }, null);
  assert.deepStrictEqual(calls, [['names'], ['view', null]]);
  assert.equal(frames.pending.size, 0);
});

const PAGE_SCOPES = ['tab0_tabpanel', 'tab1_tabpanel'];
const itemIdOf = (filterKey) => '[Org_Source].[Dienststelle].[Dienststelle].[' + filterKey + ']';
const DEFAULT_ROW = [{ dienststelle: { d: 'Default Org', u: '[Org_Source].[Dienststelle].&[0]' } }];

const ok = (data) => ({ ok: true, data });
const startupContext = (sicht) => ({ activeSichtValue: sicht, source: 'startup', observedAt: 1 });
const userClearContext = (sicht) => ({
  activeSichtValue: sicht, source: 'user', commitFromUser: true, allowDefaulting: true,
  commitSourceScope: 'global', commitSourceWasClear: true, filterScope: 'global', observedAt: 3
});

function makeFlowHost(options = {}) {
  const { global = null, pages = {}, readyLifecycle = 'ready', properties, readRows, filterKey = 'Dienststelle_BW', failWrite } = options;
  const store = { global, pages: Object.assign({}, pages) };
  const writes = [];
  const messages = [];
  const widgetEvents = [];
  const descriptor = (rawScopeId) => ({ itemName: filterKey, itemId: itemIdOf(filterKey), rawScopeId });
  const filters = {
    listFilterItems(input) {
      if (input.scopeId === 'global') return ok([descriptor('global')]);
      const pagesList = PAGE_SCOPES.map(descriptor);
      if (input.allPageContextScopes) return ok(pagesList);
      if (input.scopeId) return ok(pagesList.filter((d) => d.rawScopeId === input.scopeId));
      return ok([]);
    },
    listPageContextScopes() {
      return ok(PAGE_SCOPES.slice());
    },
    readFilterValues(ref) {
      const value = ref.scopeId === 'global' ? store.global : store.pages[ref.scopeId];
      return ok((value || []).map((v) => Object.assign({}, v)));
    },
    writeFilter({ ref, values }) {
      writes.push({ scope: ref.scopeId, values });
      if (ref.scopeId === 'global') store.global = values;
      else store.pages[ref.scopeId] = values;
      return Promise.resolve({ ok: !(failWrite && failWrite(ref)) });
    },
    clearFilter(ref) {
      writes.push({ scope: ref.scopeId, cleared: true });
      delete store.pages[ref.scopeId];
      return Promise.resolve({ ok: true });
    }
  };
  const tabsFacet = {
    listTabs: () =>
      ok([
        { index: 0, id: 'tab0' },
        { index: 1, id: 'tab1' }
      ])
  };
  const KDB = {
    config: {
      tables: {
        dienststelle_bw_default: { shape: 'row', pick: 'x' },
        dienststelle_bw_hierarchy: { shape: 'row', pick: 'y' },
        dienststelle_dezpv_default: { shape: 'row', pick: 'x' },
        dienststelle_dezpv_hierarchy: { shape: 'row', pick: 'y' }
      },
      tabs: { 0: { role: 'dashboard' }, 1: { role: 'dashboard' }, 2: { role: 'info' } },
      dataSources: { metrics: { default: { prefix: 'metrics' } } },
      labels: {
        de: {
          dienststelle: {
            emptyOkDefaultRequired: 'Auswahl fuer {filterName} noetig',
            emptyOkDefaultRequiredMembers: 'Auswahl (Mitglieder) fuer {filterName} noetig'
          }
        }
      }
    },
    properties,
    state: { filters: { dienststelle: { byFilter: {}, resolution: {} } } },
    runtime: { dienststelle: { tabsFacet, timers: {}, pendingPromises: {} } },
    services: {
      cognosHost: { filters },
      tableData: {
        readTableState: () => ({ lifecycle: readyLifecycle }),
        readRows: readRows || (() => DEFAULT_ROW),
        waitForRows: () => Promise.resolve()
      },
      message: { notify: (m) => messages.push(m) }
    },
    api: { widgetVis: { dispatch: (a) => widgetEvents.push(a) } }
  };
  return { KDB, store, writes, messages, widgetEvents };
}

function makeDispatchLog() {
  const log = [];
  return { log, dispatch: (action) => log.push(action) };
}

const flowSubject = () => ({
  reconcileConfirmed: load('effects/reconcile/runReconcile.js').reconcileConfirmed
});

async function runFlow(hostOptions, context, settleMs = 0) {
  const host = makeFlowHost(hostOptions);
  const { log, dispatch } = makeDispatchLog();
  const result = await flowSubject().reconcileConfirmed(host.KDB, dispatch, context);
  if (settleMs) await new Promise((resolve) => setTimeout(resolve, settleMs));
  return { host, log, result };
}

test('T12 reconcile flow: startup without selection applies the default to the global scope only', async () => {
  const { host, log, result } = await runFlow(
    {},
    { activeSichtValue: 'BW', source: 'startup', observedAt: 1 }
  );
  golden({ writes: host.writes, log, result, widget: host.widgetEvents }, STARTUP_EXPECTED);
});

test('T12 reconcile flow: tableData sync observes host values without writes', async () => {
  const { host, log, result } = await runFlow(
    {
      global: [{ d: 'Org A', u: '[Org_Source].[Dienststelle].&[1]' }],
      pages: { tab1_tabpanel: [{ d: 'Org B', u: '[Org_Source].[Dienststelle].&[2]' }] }
    },
    { activeSichtValue: 'BW', source: 'tableData', observedAt: 2 }
  );
  golden({ writes: host.writes, log, result, widget: host.widgetEvents }, SYNC_EXPECTED);
});

test('T12 reconcile flow: user confirm after clear applies defaults and shows the empty-OK message', async () => {
  const { host, log, result } = await runFlow({}, userClearContext('BW'), 700);
  golden(
    { writes: host.writes, log, result, widget: host.widgetEvents, messages: host.messages },
    USER_CLEAR_EXPECTED
  );
});

test('T12 reconcile flow: table data not ready reports an error and stops', async () => {
  const { host, log, result } = await runFlow(
    { readyLifecycle: 'loading' },
    { activeSichtValue: 'BW', source: 'tableData', observedAt: 4 }
  );
  golden({ writes: host.writes, log, result }, NOT_READY_EXPECTED);
});

// ---- Multi-Stelle default toggle: member default from column index 1 (count rule 1..5), BW and DEZPV ----
const mun = (n) => '[Org_Source].[Dienststelle].&[' + n + ']';
const cell = (n) => ({ d: 'Org ' + n, u: mun(n) });
const MAX_MEMBERS = 5;
const COLUMN_TWO = [1, 2, 3, 4, 5, 6].map(cell); // one more than MAX_MEMBERS: slice for a valid set, use whole for 'too many'
const SINGLE_CELL = { d: 'Default Org', u: mun(0) };
// Default table rows as the shaper returns them: every row carries both columns, empty cells are `{}`.
function defaultRows(column1, column2) {
  const count = Math.max(column1.length, column2.length);
  return Array.from({ length: count }, (_, i) => ({ stelle: column1[i] || {}, members: column2[i] || {} }));
}
const TOGGLE_ON = { KDBMultiStelleDefaultToggle: true };
const SICHTS = ['BW', 'DEZPV'];
const useValues = (writes) => writes.map((w) => w.values.map((v) => v.u));
const SINGLE_WRITE = [{ scope: 'global', values: [SINGLE_CELL] }];
const perTabWrites = (members) => PAGE_SCOPES.map((scope) => ({ scope, values: members }));
const perTabValues = (log) => {
  const byScope = log.find((a) => a.type === 'dienststelle/syncRequested').payload.pageContextValuesByScope;
  return Object.fromEntries(Object.entries(byScope).map(([scope, values]) => [scope, values.map((v) => v.useValue)]));
};
const memberWarns = (warn) => warn.filter((w) => w.includes('[dienststelle.readMemberDefaults]'));
const appliedSelections = (log) =>
  log.filter((a) => a.type === 'dienststelle/defaultApplied').map((a) => a.payload.selection);
const appliedUseValues = (log) => appliedSelections(log).map((sel) => [].concat(sel).map((m) => m.useValue));
const MEMBERS_TOAST = ['Auswahl (Mitglieder) fuer Dienststelle noetig'];
const SINGLE_TOAST = ['Auswahl fuer Dienststelle noetig'];

async function runMulti({ sicht = 'BW', rows, properties = TOGGLE_ON, userCommit = false, failWrite }) {
  const warn = [];
  const original = console.warn;
  console.warn = (...args) => warn.push(args.join(' '));
  try {
    const context = userCommit ? userClearContext(sicht) : startupContext(sicht);
    const hostOptions = { properties, readRows: () => rows, filterKey: 'Dienststelle_' + sicht, failWrite };
    const out = await runFlow(hostOptions, context, userCommit ? 700 : 0);
    return Object.assign(out, { warn });
  } finally {
    console.warn = original;
  }
}

test('Multi-Stelle default: toggle unset, off or "true"-string keeps the single default (both variants)', async () => {
  const rows = defaultRows([SINGLE_CELL], COLUMN_TWO);
  for (const sicht of SICHTS) {
    for (const properties of [null, {}, { KDBMultiStelleDefaultToggle: false }, { KDBMultiStelleDefaultToggle: 'true' }]) {
      const { host, log, warn } = await runMulti({ sicht, rows, properties });
      golden(host.writes, SINGLE_WRITE);
      golden(appliedSelections(log), [{ displayValue: 'Default Org', useValue: mun(0), source: 'default' }]);
      golden(warn, []);
    }
  }
});

test('Multi-Stelle default: toggle on with 1 to 5 values in column index 1 writes one member write (both variants)', async () => {
  for (const sicht of SICHTS) {
    for (let count = 1; count <= MAX_MEMBERS; count++) {
      const members = COLUMN_TWO.slice(0, count);
      const { host, log, warn } = await runMulti({ sicht, rows: defaultRows([SINGLE_CELL], members) });
      golden(host.writes, [{ scope: 'global', values: members }]);
      golden(appliedSelections(log).map((sel) => sel.map((m) => m.useValue)), [members.map((m) => m.u)]);
      golden(warn, []);
    }
  }
});

test('Multi-Stelle default: toggle on with more than 5 values (6) falls back to the single default and warns once', async () => {
  const rows = defaultRows([SINGLE_CELL], COLUMN_TWO);
  for (const sicht of SICHTS) {
    const { host, log, warn } = await runMulti({ sicht, rows });
    golden(host.writes, SINGLE_WRITE);
    assert.ok(!Array.isArray(appliedSelections(log)[0]));
    assert.equal(warn.length, 1);
    assert.match(warn[0], /column 2 has 6 usable value\(s\) \(allowed 1\.\.5\): falling back to the single default/);
  }
});

test('Multi-Stelle default: toggle on with 0 / blank / missing column falls back to the single default and warns', async () => {
  const cases = {
    'column blank': defaultRows([SINGLE_CELL], []),
    'column half-filled cells only': defaultRows([SINGLE_CELL], [{ d: 'x' }, { u: 'y' }]),
    'column absent (single-column table)': [{ stelle: SINGLE_CELL }]
  };
  for (const sicht of SICHTS) {
    for (const [name, rows] of Object.entries(cases)) {
      const { host, warn } = await runMulti({ sicht, rows });
      assert.deepEqual(host.writes, SINGLE_WRITE, name);
      assert.equal(warn.length, 1, name);
      assert.match(warn[0], /has 0 usable value\(s\)/, name);
    }
  }
});

test('Multi-Stelle default: empty table is silent for members; a null first row warns like a column without usable cells', async () => {
  const abortWarn = (sicht) => '[dienststelle.applyDefault] abort: no defaultValue dienststelle_' + sicht.toLowerCase() + '_default';
  const memberWarn = (sicht) => '[dienststelle.readMemberDefaults] column 2 has 0 usable value(s) (allowed 1..5): ' +
    'falling back to the single default dienststelle_' + sicht.toLowerCase() + '_default';
  const defaultWrites = 1 + PAGE_SCOPES.length; // startup: the global scope, then each empty tab
  for (const sicht of SICHTS) {
    const empty = await runMulti({ sicht, rows: [] });
    assert.deepEqual(empty.host.writes, [], sicht);
    assert.deepEqual(empty.warn, Array(defaultWrites).fill(abortWarn(sicht)), sicht);
    const nullRow = await runMulti({ sicht, rows: [null] });
    assert.deepEqual(nullRow.host.writes, [], sicht);
    assert.deepEqual(nullRow.warn, Array(defaultWrites).fill([memberWarn(sicht), abortWarn(sicht)]).flat(), sicht);
  }
});

test('Multi-Stelle default: a table that is not readable yet stays silent (no member warning)', async () => {
  for (const sicht of SICHTS) {
    const { host, warn } = await runMulti({ sicht, rows: null });
    golden(host.writes, []);
    assert.ok(!warn.some((w) => w.includes('usable value(s)')));
  }
});

test('Multi-Stelle default: the count is over distinct usable values: duplicates and blanks are dropped first', async () => {
  const duplicates = await runMulti({ rows: defaultRows([SINGLE_CELL], [cell(1), cell(1), cell(2), cell(2)]) });
  golden(useValues(duplicates.host.writes), [[mun(1), mun(2)]]);
  const blanks = await runMulti({
    rows: defaultRows([SINGLE_CELL], [cell(1), {}, { d: 'x' }, { u: 'y' }, cell(3), {}])
  });
  golden(useValues(blanks.host.writes), [[mun(1), mun(3)]]);
  const otherColumnIgnored = await runMulti({ rows: defaultRows([1, 2, 3, 4, 5].map(cell), [cell(7)]) });
  golden(useValues(otherColumnIgnored.host.writes), [[mun(7)]]);
});

test('Multi-Stelle default: startup member default writes once to the global scope and skips the tabs', async () => {
  const members = COLUMN_TWO.slice(0, 2);
  for (const sicht of SICHTS) {
    const { host, log } = await runMulti({ sicht, rows: defaultRows([SINGLE_CELL], members) });
    assert.deepEqual(host.writes, [{ scope: 'global', values: members }], sicht);
    assert.deepEqual(appliedSelections(log).length, 1, sicht);
    assert.deepEqual(Object.keys(perTabValues(log)), [], sicht);
    assert.deepEqual(host.messages, [], sicht);
  }
});

test('Multi-Stelle default: S1 per-tab defaults write the members to each empty tab (flat) and use the members toast', async () => {
  const members = COLUMN_TWO.slice(0, 2);
  for (const sicht of SICHTS) {
    const { host, log, warn } = await runMulti({ sicht, rows: defaultRows([SINGLE_CELL], members), userCommit: true });
    golden(host.writes, perTabWrites(members));
    golden(perTabValues(log), { tab0_tabpanel: members.map((m) => m.u), tab1_tabpanel: members.map((m) => m.u) });
    for (const selection of appliedSelections(log)) {
      assert.ok(selection.every((m) => !Array.isArray(m) && m.source === 'default'));
    }
    golden(host.messages.map((m) => m.message), MEMBERS_TOAST);
    golden(host.messages.map((m) => m.code), ['DIENSTSTELLE_EMPTY_OK_DEFAULT']);
    golden(warn, []);
  }
});

test('Multi-Stelle default: S1 with toggle off or fallback keeps one single value per tab and the old toast', async () => {
  const sixValueRows = defaultRows([SINGLE_CELL], COLUMN_TWO); // 6 values: valid with the toggle off, over the maximum with it on
  const scenarios = [
    { rows: sixValueRows, properties: {}, memberWarns: 0 },
    { rows: sixValueRows, properties: null, memberWarns: 0 },
    { rows: sixValueRows, properties: TOGGLE_ON, memberWarns: PAGE_SCOPES.length },
    { rows: [{ stelle: SINGLE_CELL }], properties: TOGGLE_ON, memberWarns: PAGE_SCOPES.length }
  ];
  for (const sicht of SICHTS) {
    for (const { memberWarns: expectedWarns, ...scenario } of scenarios) {
      const { host, log, warn } = await runMulti({ sicht, userCommit: true, ...scenario });
      golden(useValues(host.writes), [[mun(0)], [mun(0)]]);
      golden(perTabValues(log), { tab0_tabpanel: [mun(0)], tab1_tabpanel: [mun(0)] });
      assert.ok(appliedSelections(log).every((selection) => !Array.isArray(selection)));
      golden(host.messages.map((m) => m.message), SINGLE_TOAST);
      assert.equal(memberWarns(warn).length, expectedWarns, 'one member warn per tab write');
    }
  }
});

test('Multi-Stelle default: a 1-value member set still uses the members toast label', async () => {
  const members = COLUMN_TWO.slice(0, 1);
  for (const sicht of SICHTS) {
    const { host, log } = await runMulti({ sicht, rows: defaultRows([SINGLE_CELL], members), userCommit: true });
    assert.deepEqual(useValues(host.writes), [[mun(1)], [mun(1)]], sicht);
    assert.deepEqual(appliedUseValues(log), [[mun(1)], [mun(1)]], sicht);
    assert.deepEqual(host.messages.map((m) => m.message), MEMBERS_TOAST, sicht);
  }
});

test('Multi-Stelle default: failed member writes are not reported as applied; one applied tab still shows the members toast', async () => {
  const members = COLUMN_TWO.slice(0, 2);
  const memberUses = members.map((m) => m.u);
  const cases = {
    'all tab writes fail': { failWrite: () => true, applied: [], tabs: [], toast: [] },
    'tab0 write fails': {
      failWrite: (ref) => ref.scopeId === 'tab0_tabpanel', applied: [memberUses], tabs: ['tab1_tabpanel'], toast: MEMBERS_TOAST
    }
  };
  for (const sicht of SICHTS) {
    for (const [name, { failWrite, applied, tabs, toast }] of Object.entries(cases)) {
      const { host, log, warn } = await runMulti({ sicht, rows: defaultRows([SINGLE_CELL], members), userCommit: true, failWrite });
      const label = sicht + ': ' + name;
      assert.deepEqual(host.writes, perTabWrites(members), label);
      assert.deepEqual(appliedUseValues(log), applied, label);
      assert.deepEqual(Object.keys(perTabValues(log)), tabs, label);
      assert.deepEqual(host.messages.map((m) => m.message), toast, label);
      assert.equal(warn.filter((w) => w.includes('host write not applied')).length, tabs.length ? 1 : PAGE_SCOPES.length, label);
    }
  }
});

// Not covered here: Sicht BW -> DEZPV -> BW through sichtSync.syncFromSicht. It needs a harness with the sicht api,
// clear.deactivateInactiveVariants, the view sync and dock-name DOM; applyDefault reads the definition handed to
// reconcile, which the per-variant tests above already exercise for both BW and DEZPV.

test('Multi-Stelle default: restore fallbackToDefault keeps the single default with the toggle on (both variants)', async () => {
  const restore = load('restore/parameterSet.js');
  for (const sicht of SICHTS) {
    const host = makeFlowHost({
      properties: TOGGLE_ON,
      readRows: () => defaultRows([SINGLE_CELL], COLUMN_TWO),
      filterKey: 'Dienststelle_' + sicht
    });
    host.KDB.services.tableData.abortTable = () => Promise.resolve(); // restore switches Sicht via sichtSync
    const payload = {
      runId: 1,
      activeSichtValue: sicht,
      dienststelle: { key: 'Dienststelle_' + sicht, glob: ['nonexistent'], byTab: {} },
      options: { fallbackToDefault: true }
    };
    const { dispatch } = makeDispatchLog();
    const controller = { _KDB: host.KDB, filtersFacet: host.KDB.services.cognosHost.filters };
    const ctx = restore.createParameterSetContext(controller, dispatch, dispatch);
    const result = await restore.routeParameterSetAction(ctx, {
      type: 'dienststelle/parameterSetRestoreRequested',
      payload
    });
    assert.deepEqual(result.fallbackScopes, ['global'], sicht);
    assert.deepEqual(host.writes, SINGLE_WRITE, sicht);
  }
});

const STARTUP_EXPECTED = {
  "writes": [
    {
      "scope": "global",
      "values": [
        {
          "d": "Default Org",
          "u": "[Org_Source].[Dienststelle].&[0]"
        }
      ]
    }
  ],
  "log": [
    {
      "type": "dienststelle/filterStatusChanged",
      "payload": {
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "status": "loading"
      }
    },
    {
      "type": "dienststelle/filterStatusChanged",
      "payload": {
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "status": "active"
      }
    },
    {
      "type": "dienststelle/defaultApplied",
      "payload": {
        "scopeId": "global",
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "selection": {
          "displayValue": "Default Org",
          "useValue": "[Org_Source].[Dienststelle].&[0]",
          "source": "default"
        }
      }
    },
    {
      "type": "dienststelle/syncRequested",
      "payload": {
        "activeSichtValue": "BW",
        "activeFilterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "activeHierarchyTableKey": "dienststelle_bw_hierarchy",
        "activeDefaultTableKey": "dienststelle_bw_default",
        "dominantScope": "global",
        "dominantValues": [
          {
            "displayValue": "Default Org",
            "useValue": "[Org_Source].[Dienststelle].&[0]",
            "source": "default"
          }
        ],
        "pageContextValuesByScope": {},
        "source": "startup",
        "isHistoryReplay": false
      }
    }
  ],
  "result": {
    "activeSichtValue": "BW",
    "activeFilterKey": "Dienststelle_BW",
    "visibleFilterLabel": "Dienststelle",
    "resolution": {
      "dominantScope": "global",
      "dominantValues": [
        {
          "displayValue": "Default Org",
          "useValue": "[Org_Source].[Dienststelle].&[0]",
          "source": "default"
        }
      ],
      "pageContextValuesByScope": {}
    },
    "readinessFailed": false
  },
  "widget": [
    {
      "type": "widgetVis/dienststelleChanged",
      "payload": {
        "filterId": "global__Dienststelle",
        "filterLabel": "Dienststelle",
        "activeFilterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "scopeType": "global",
        "scopeId": "global",
        "selection": {
          "displayValue": "Default Org",
          "useValue": "[Org_Source].[Dienststelle].&[0]",
          "source": "default",
          "hostDisplay": ""
        },
        "hierarchySnapshot": {
          "activeDownstreamName": null,
          "filterId": null,
          "filterLabel": "Dienststelle",
          "visibleFilterLabel": "Dienststelle",
          "hierarchyItemId": null,
          "activeHierarchyTableKey": null,
          "resolution": {
            "hasConfirmedSelection": false,
            "dominantValues": [],
            "downstreamValues": [],
            "displayValues": [],
            "hostDisplayValues": [],
            "dominantScopeKey": null,
            "resolvedAt": null
          },
          "source": "dienststelle"
        },
        "source": "sichtDefault",
        "observedAt": 1
      }
    }
  ]
};
const SYNC_EXPECTED = {
  "writes": [],
  "log": [
    {
      "type": "dienststelle/filterStatusChanged",
      "payload": {
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "status": "loading"
      }
    },
    {
      "type": "dienststelle/filterStatusChanged",
      "payload": {
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "status": "active"
      }
    },
    {
      "type": "dienststelle/selectionObserved",
      "payload": {
        "scopeId": "global",
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "selection": [
          {
            "displayValue": "Org A",
            "useValue": "[Org_Source].[Dienststelle].&[1]",
            "source": "cognos",
            "hostDisplay": "Org A"
          }
        ]
      }
    },
    {
      "type": "dienststelle/selectionObserved",
      "payload": {
        "scopeId": "tab1_tabpanel",
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "selection": [
          {
            "displayValue": "Org B",
            "useValue": "[Org_Source].[Dienststelle].&[2]",
            "source": "cognos",
            "hostDisplay": "Org B"
          }
        ]
      }
    },
    {
      "type": "dienststelle/syncRequested",
      "payload": {
        "activeSichtValue": "BW",
        "activeFilterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "activeHierarchyTableKey": "dienststelle_bw_hierarchy",
        "activeDefaultTableKey": "dienststelle_bw_default",
        "dominantScope": "global",
        "dominantValues": [
          {
            "displayValue": "Org A",
            "useValue": "[Org_Source].[Dienststelle].&[1]",
            "source": "cognos",
            "hostDisplay": "Org A"
          }
        ],
        "pageContextValuesByScope": {
          "tab1_tabpanel": [
            {
              "displayValue": "Org B",
              "useValue": "[Org_Source].[Dienststelle].&[2]",
              "source": "cognos",
              "hostDisplay": "Org B"
            }
          ]
        },
        "source": "tableData",
        "isHistoryReplay": false
      }
    }
  ],
  "result": {
    "activeSichtValue": "BW",
    "activeFilterKey": "Dienststelle_BW",
    "visibleFilterLabel": "Dienststelle",
    "resolution": {
      "dominantScope": "global",
      "dominantValues": [
        {
          "displayValue": "Org A",
          "useValue": "[Org_Source].[Dienststelle].&[1]",
          "source": "cognos",
          "hostDisplay": "Org A"
        }
      ],
      "pageContextValuesByScope": {
        "tab1_tabpanel": [
          {
            "displayValue": "Org B",
            "useValue": "[Org_Source].[Dienststelle].&[2]",
            "source": "cognos",
            "hostDisplay": "Org B"
          }
        ]
      }
    },
    "readinessFailed": false
  },
  "widget": []
};
const USER_CLEAR_EXPECTED = {
  "writes": [
    {
      "scope": "tab0_tabpanel",
      "values": [
        {
          "d": "Default Org",
          "u": "[Org_Source].[Dienststelle].&[0]"
        }
      ]
    },
    {
      "scope": "tab1_tabpanel",
      "values": [
        {
          "d": "Default Org",
          "u": "[Org_Source].[Dienststelle].&[0]"
        }
      ]
    }
  ],
  "log": [
    {
      "type": "dienststelle/filterStatusChanged",
      "payload": {
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "status": "loading"
      }
    },
    {
      "type": "dienststelle/filterStatusChanged",
      "payload": {
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "status": "active"
      }
    },
    {
      "type": "dienststelle/selectionCleared",
      "payload": {
        "scopeId": "global",
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle"
      }
    },
    {
      "type": "dienststelle/defaultApplied",
      "payload": {
        "scopeId": "tab0_tabpanel",
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "selection": {
          "displayValue": "Default Org",
          "useValue": "[Org_Source].[Dienststelle].&[0]",
          "source": "default"
        }
      }
    },
    {
      "type": "dienststelle/defaultApplied",
      "payload": {
        "scopeId": "tab1_tabpanel",
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "selection": {
          "displayValue": "Default Org",
          "useValue": "[Org_Source].[Dienststelle].&[0]",
          "source": "default"
        }
      }
    },
    {
      "type": "dienststelle/syncRequested",
      "payload": {
        "activeSichtValue": "BW",
        "activeFilterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "activeHierarchyTableKey": "dienststelle_bw_hierarchy",
        "activeDefaultTableKey": "dienststelle_bw_default",
        "dominantScope": null,
        "dominantValues": [],
        "pageContextValuesByScope": {
          "tab0_tabpanel": [
            {
              "displayValue": "Default Org",
              "useValue": "[Org_Source].[Dienststelle].&[0]",
              "source": "default"
            }
          ],
          "tab1_tabpanel": [
            {
              "displayValue": "Default Org",
              "useValue": "[Org_Source].[Dienststelle].&[0]",
              "source": "default"
            }
          ]
        },
        "source": "user",
        "isHistoryReplay": false
      }
    }
  ],
  "result": {
    "activeSichtValue": "BW",
    "activeFilterKey": "Dienststelle_BW",
    "visibleFilterLabel": "Dienststelle",
    "resolution": {
      "dominantScope": null,
      "dominantValues": [],
      "pageContextValuesByScope": {
        "tab0_tabpanel": [
          {
            "displayValue": "Default Org",
            "useValue": "[Org_Source].[Dienststelle].&[0]",
            "source": "default"
          }
        ],
        "tab1_tabpanel": [
          {
            "displayValue": "Default Org",
            "useValue": "[Org_Source].[Dienststelle].&[0]",
            "source": "default"
          }
        ]
      }
    },
    "readinessFailed": false
  },
  "widget": [
    {
      "type": "widgetVis/dienststelleChanged",
      "payload": {
        "filterId": "tab0_tabpanel__Dienststelle",
        "filterLabel": "Dienststelle",
        "activeFilterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "scopeType": "pageContext",
        "scopeId": "tab0_tabpanel",
        "selection": {
          "displayValue": "Default Org",
          "useValue": "[Org_Source].[Dienststelle].&[0]",
          "source": "default",
          "hostDisplay": ""
        },
        "hierarchySnapshot": {
          "activeDownstreamName": null,
          "filterId": null,
          "filterLabel": "Dienststelle",
          "visibleFilterLabel": "Dienststelle",
          "hierarchyItemId": null,
          "activeHierarchyTableKey": null,
          "resolution": {
            "hasConfirmedSelection": false,
            "dominantValues": [],
            "downstreamValues": [],
            "displayValues": [],
            "hostDisplayValues": [],
            "dominantScopeKey": null,
            "resolvedAt": null
          },
          "source": "dienststelle"
        },
        "source": "user",
        "observedAt": 3
      }
    }
  ],
  "messages": [
    {
      "code": "DIENSTSTELLE_EMPTY_OK_DEFAULT",
      "message": "Auswahl fuer Dienststelle noetig",
      "severity": "info"
    }
  ]
};
const NOT_READY_EXPECTED = {
  "writes": [],
  "log": [
    {
      "type": "dienststelle/filterStatusChanged",
      "payload": {
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "status": "loading"
      }
    },
    {
      "type": "dienststelle/filterStatusChanged",
      "payload": {
        "filterKey": "Dienststelle_BW",
        "visibleFilterLabel": "Dienststelle",
        "status": "error",
        "errorCode": "DIENSTSTELLE_TABLE_DATA_NOT_READY",
        "errorMessage": "Required Dienststelle table data is not ready."
      }
    },
    {
      "type": "dienststelle/error",
      "payload": {
        "errorCode": "DIENSTSTELLE_TABLE_DATA_NOT_READY",
        "errorMessage": "Required Dienststelle table data is not ready."
      }
    }
  ],
  "result": null
};

const ACTION = load('state.js').ACTIONS;

function loadRoute(calls, reconcileCalls) {
  const fn = (name) => () => {
    calls.push([name]);
  };
  const pushHistory = (_KDB, oldSnapshot, result) => {
    calls.push(['history', oldSnapshot, result]);
    return result;
  };
  const modules = ROUTE_STUB_SPECS(fn, pushHistory);
  const route = load(ROUTE_PATH, { modules });
  const reconcile = (_KDB, _dispatchInternal, context) => {
    reconcileCalls.push(context);
    return Promise.resolve({ resolution: null });
  };
  return { route: ROUTE_EXPORT(route), reconcile };
}

const ROUTE_PATH = 'effects/dispatchRoute.js';
const ROUTE_EXPORT = (mod) => mod.routeDienststelleDispatch;
const ROUTE_STUB_SPECS = (fn, pushHistory) => {
  const syncView = Object.assign(fn('view'), { syncViewFromState: fn('view') });
  const syncNames = Object.assign(fn('names'), { syncFilterDockNames: fn('names') });
  return {
    '../view/syncView.js': syncView,
    '../view/dockNames.js': syncNames,
    '../history.js': { pushDienststelleHistoryStep: pushHistory }
  };
};

function routeKDB(extra) {
  const host = makeFlowHost();
  host.KDB.state.filters.dienststelle = {
    activeFilterKey: 'Dienststelle_BW',
    activeSichtValue: 'BW',
    visibleFilterLabel: 'Dienststelle',
    byFilter: { Dienststelle_BW: { status: 'active' }, Dienststelle_DEZPV: { status: 'inactive' } }
  };
  host.KDB.runtime.dienststelle.timers = {};
  return Object.assign(host.KDB, extra || {});
}

const handoff = (extra) =>
  Object.assign(
    {
      filterType: 'dienststelle',
      filterLabel: 'Dienststelle_BW',
      filterScope: 'global',
      interactionType: 'select',
      observedAt: 11
    },
    extra
  );

test('T13 route: popup ready for the active variant syncs names and view', async () => {
  const calls = [];
  const reconcileCalls = [];
  const dispatched = [];
  const { route, reconcile } = loadRoute(calls, reconcileCalls);
  const controller = { _KDB: routeKDB() };
  const out = await route(controller, (a) => dispatched.push(a), reconcile, {
    type: ACTION.FILTER_DOCK_POPUP_READY,
    payload: handoff()
  });
  assert.equal(out, undefined);
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].type, ACTION.FILTER_DOCK_POPUP_READY);
  assert.equal(dispatched[0].payload.filterKey, 'global__Dienststelle_BW');
  assert.equal(dispatched[0].payload.timestamp, 11);
  assert.deepStrictEqual(calls.map((c) => c[0]), ['names', 'view']);
});

test('T13 route: handoff of the inactive variant is ignored', async () => {
  const calls = [];
  const dispatched = [];
  const { route, reconcile } = loadRoute(calls, []);
  const controller = { _KDB: routeKDB() };
  const out = await route(controller, (a) => dispatched.push(a), reconcile, {
    type: ACTION.FILTER_DOCK_STATE_CHANGED,
    payload: handoff({ filterLabel: 'Dienststelle_DEZPV' })
  });
  assert.equal(out, undefined);
  assert.deepStrictEqual(dispatched, []);
  assert.deepStrictEqual(calls, []);
});

test('T13 route: confirm reconciles as user commit and pushes one history step', async () => {
  const calls = [];
  const reconcileCalls = [];
  const dispatched = [];
  const { route, reconcile } = loadRoute(calls, reconcileCalls);
  const controller = { _KDB: routeKDB() };
  await route(controller, (a) => dispatched.push(a), reconcile, {
    type: ACTION.FILTER_DOCK_STATE_CHANGED,
    payload: handoff({ interactionType: 'clear' })
  });
  const out = await route(controller, (a) => dispatched.push(a), reconcile, {
    type: ACTION.FILTER_DOCK_STATE_CHANGED,
    payload: handoff({ interactionType: 'confirm', scopeId: 'tab1', filterScope: 'pageContext' })
  });
  assert.deepStrictEqual(out, { resolution: null });
  assert.equal(reconcileCalls.length, 1);
  const context = reconcileCalls[0];
  assert.equal(context.source, 'user');
  assert.equal(context.commitFromUser, true);
  assert.equal(context.allowDefaulting, true);
  assert.equal(context.commitSourceScope, 'pageContext');
  assert.equal(context.commitSourceWasClear, true);
  assert.equal(context.scopeId, 'tab1');
  assert.equal(context.observedAt, 11);
  assert.equal(calls.filter((c) => c[0] === 'history').length, 1);
  assert.equal(controller._KDB.runtime.dienststelle.lastPendingIntent, 'confirm');
});

test('T13 route: table data changes are deferred while a tab mutation is running', async () => {
  const reconcileCalls = [];
  const { route, reconcile } = loadRoute([], reconcileCalls);
  const KDB = routeKDB({ runtime: { dienststelle: { timers: {} }, tabs: { pendingPromises: { tabMutation: {} } } } });
  const controller = { _KDB: KDB };
  const out = await route(controller, () => {}, reconcile, { type: ACTION.TABLE_DATA_CHANGED, payload: {} });
  assert.equal(out, undefined);
  assert.deepStrictEqual(reconcileCalls, []);
  KDB.runtime.tabs.pendingPromises.tabMutation = null;
  await route(controller, () => {}, reconcile, { type: ACTION.TABLE_DATA_CHANGED, payload: {} });
  assert.equal(reconcileCalls.length, 1);
  assert.equal(reconcileCalls[0].source, 'tableData');
});

const USER_CLEAR_CONTEXT = {
  activeSichtValue: 'BW',
  source: 'user',
  commitFromUser: true,
  allowDefaulting: true,
  commitSourceScope: 'global',
  commitSourceWasClear: true,
  filterScope: 'global',
  observedAt: 5
};

const tick = () => new Promise((resolve) => setImmediate(resolve));

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 200 && !predicate(); attempt += 1) await tick();
  assert.ok(predicate(), 'condition not reached');
}

test('T14 user confirm: tracked widget notify timer and its teardown', async () => {
  const host = makeFlowHost();
  const { log, dispatch } = makeDispatchLog();
  const kitRuntime = loadCore('core/utils/kit/runtime.js');
  await flowSubject().reconcileConfirmed(host.KDB, dispatch, USER_CLEAR_CONTEXT);
  const timers = host.KDB.runtime.dienststelle.timers;
  assert.equal(timers.userNotify.kind, 'timeout');
  assert.equal(host.widgetEvents.length, 0);
  assert.deepStrictEqual(kitRuntime.disposeRuntimeBuckets(host.KDB.runtime.dienststelle), []);
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.equal(host.widgetEvents.length, 0);
  assert.ok(log.length > 0);
});

test('T14 user confirm: the host-commit hop is tracked and destroy stops the pending reconcile', async () => {
  const host = makeFlowHost();
  const { log, dispatch } = makeDispatchLog();
  const kitRuntime = loadCore('core/utils/kit/runtime.js');
  let settled = false;
  flowSubject()
    .reconcileConfirmed(host.KDB, dispatch, USER_CLEAR_CONTEXT)
    .then(() => {
      settled = true;
    });
  const timers = host.KDB.runtime.dienststelle.timers;
  await waitFor(() => Object.keys(timers).some((key) => key.startsWith('userCommitHop')));
  const hopKey = Object.keys(timers).find((key) => key.startsWith('userCommitHop'));
  assert.equal(timers[hopKey].kind, 'timeout');
  const logBefore = log.length;
  kitRuntime.disposeRuntimeBuckets(host.KDB.runtime.dienststelle);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(settled, false);
  assert.equal(log.length, logBefore);
  assert.deepStrictEqual(host.writes, []);
  assert.deepStrictEqual(host.KDB.runtime.dienststelle.timers, {});
});

test('T14 user confirm: concurrent confirms on one runtime each get their own hop', async () => {
  const host = makeFlowHost();
  const subject = flowSubject();
  const results = await Promise.all([
    subject.reconcileConfirmed(host.KDB, makeDispatchLog().dispatch, USER_CLEAR_CONTEXT),
    subject.reconcileConfirmed(host.KDB, makeDispatchLog().dispatch, USER_CLEAR_CONTEXT)
  ]);
  assert.ok(results.every((result) => result && result.readinessFailed === false));
  assert.equal(host.KDB.runtime.dienststelle.userCommitHopSeq, 2);
  assert.deepStrictEqual(Object.keys(host.KDB.runtime.dienststelle.timers), ['userNotify']);
  loadCore('core/utils/kit/runtime.js').disposeRuntimeBuckets(host.KDB.runtime.dienststelle);
});
