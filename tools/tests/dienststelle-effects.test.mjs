// Golden tests for dashboard/filters/dienststelle/effects (WS-I Task B).
// Run: node --test tools/tests/dienststelle-effects.test.mjs
// Expected literals were captured from the pre-restructure modules on main.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadAmd } from '../lib/amd-loader.mjs';
import { JS_ROOT } from '../lib/amd-graph.mjs';

const DIR = path.join(JS_ROOT, 'dashboard/filters/dienststelle');
const load = (rel, opts) => loadAmd(path.join(DIR, rel), opts);
const loadCore = (rel, opts) => loadAmd(path.join(JS_ROOT, rel), opts);

const subjects = {
  get aligned() {
    return {
      collectAlignedHostDisplays: load('effects/collectAlignedHostDisplays.js'),
      uniqueAlignedUseDisplayValues: load('effects/uniqueAlignedUseDisplayValues.js')
    };
  },
  get applySupport() {
    return {
      support: load('effects/dienststelleScopeApplySupport.js'),
      resolveReplayApplyOrder: load('effects/resolveDienststelleReplayApplyOrder.js')
    };
  },
  get waitForStable() {
    return load('effects/waitForStableDienststelleScopeValues.js');
  },
  get hierarchySnapshot() {
    return load('effects/readCurrentHierarchySnapshot.js').readCurrentHierarchySnapshot;
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
  const { support, resolveReplayApplyOrder } = subjects.applySupport;
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

const VIEW_SYNC_PATH = 'effects/scheduleDienststelleViewSync.js';
const VIEW_SYNC_SPEC = {
  syncView: '../view/syncDienststelleViewFromState.js',
  syncNames: '../view/syncDienststelleFilterDockNames.js'
};
const scheduleViewSync = (mod) => mod;

test('T10 view sync: user confirm waits four frames, then syncs once', () => {
  const frames = makeFrameQueue();
  const calls = [];
  const schedule = scheduleViewSync(loadViewSync(frames, calls));
  const KDB = { runtime: { dienststelle: { timers: {} } } };
  schedule(KDB, { source: 'user', viewSyncHandoff: { id: 'h1', filterScope: 'global' } }, { resolution: null });
  assert.equal(frames.pending.size, 1);
  assert.deepStrictEqual(calls, []);
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
const ITEM_ID = '[Org_Source].[Dienststelle].[Dienststelle].[Dienststelle_BW]';
const DEFAULT_ROW = [{ dienststelle: { d: 'Default Org', u: '[Org_Source].[Dienststelle].&[0]' } }];

const ok = (data) => ({ ok: true, data });

function makeFlowHost({ global = null, pages = {}, readyLifecycle = 'ready' } = {}) {
  const store = { global, pages: Object.assign({}, pages) };
  const writes = [];
  const messages = [];
  const widgetEvents = [];
  const descriptor = (rawScopeId) => ({ itemName: 'Dienststelle_BW', itemId: ITEM_ID, rawScopeId });
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
      return Promise.resolve({ ok: true });
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
        dienststelle_bw_hierarchy: { shape: 'row', pick: 'y' }
      },
      tabs: { 0: { role: 'dashboard' }, 1: { role: 'dashboard' }, 2: { role: 'info' } },
      dataSources: { metrics: { default: { prefix: 'metrics' } } },
      labels: { de: { dienststelle: { emptyOkDefaultRequired: 'Auswahl fuer {filterName} noetig' } } }
    },
    state: { filters: { dienststelle: { byFilter: {}, resolution: {} } } },
    runtime: { dienststelle: { tabsFacet, timers: {}, pendingPromises: {} } },
    services: {
      cognosHost: { filters },
      tableData: {
        readTableState: () => ({ lifecycle: readyLifecycle }),
        readRows: () => DEFAULT_ROW,
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
  reconcileConfirmed: load('effects/reconcileConfirmedDienststelle.js')
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
  const { host, log, result } = await runFlow(
    {},
    {
      activeSichtValue: 'BW',
      source: 'user',
      commitFromUser: true,
      allowDefaulting: true,
      commitSourceScope: 'global',
      commitSourceWasClear: true,
      filterScope: 'global',
      observedAt: 3
    },
    700
  );
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

const ACTION = {
  FILTER_DOCK_STATE_CHANGED: 'dienststelle/filterDockStateChanged',
  FILTER_DOCK_POPUP_READY: 'dienststelle/filterDockPopupReady',
  FILTER_DOCK_FILTERS_READY: 'dienststelle/filterDockFiltersReady',
  FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED: 'dienststelle/filterDockCommittedDisplayObserved',
  SYNC_REQUESTED: 'dienststelle/syncRequested',
  TABLE_DATA_CHANGED: 'dienststelle/tableDataChanged',
  ERROR: 'dienststelle/error'
};

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

const ROUTE_PATH = 'effects/routeDienststelleDispatch.js';
const ROUTE_EXPORT = (mod) => mod;
const ROUTE_STUB_SPECS = (fn, pushHistory) => {
  const syncView = Object.assign(fn('view'), { syncViewFromState: fn('view') });
  const syncNames = Object.assign(fn('names'), { syncFilterDockNames: fn('names') });
  return {
    '../view/syncDienststelleViewFromState.js': syncView,
    '../view/syncDienststelleFilterDockNames.js': syncNames,
    '../history/pushDienststelleHistoryStep.js': pushHistory
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
