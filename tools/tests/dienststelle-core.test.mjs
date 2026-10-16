// Golden tests for dashboard/filters/dienststelle (WS-I, Task A: state, selectors, history, restore index, labels, scope plan).
// Run: node --test tools/tests/dienststelle-core.test.mjs
// Expected values live in tools/tests/fixtures/dienststelle-core.golden.json. They were captured from the
// pre-refactor modules on main (commit 9d5dac6 of this workstream, GOLDEN_WRITE=1) and must not be regenerated
// from the refactored code. Tests that need the effects/ files of Task B are skipped until those exist.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadAmd } from '../lib/amd-loader.mjs';
import { JS_ROOT } from '../lib/amd-graph.mjs';

const D = path.join(JS_ROOT, 'dashboard/filters/dienststelle');
const GOLDEN_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/dienststelle-core.golden.json');
const WRITE = process.env.GOLDEN_WRITE === '1';
const golden = WRITE ? {} : JSON.parse(readFileSync(GOLDEN_FILE, 'utf8'));

after(() => {
  if (WRITE) {
    const lines = Object.keys(golden).map((key) => '  ' + JSON.stringify(key) + ': ' + JSON.stringify(golden[key]));
    writeFileSync(GOLDEN_FILE, '{\n' + lines.join(',\n') + '\n}\n');
  }
});

const FIXED_NOW = 1700000000000;
class FixedDate extends Date {
  constructor(...args) {
    if (args.length) super(...args);
    else super(FIXED_NOW);
  }
  static now() {
    return FIXED_NOW;
  }
}
const stubs = { Date: FixedDate };

function toJson(value) {
  return value === undefined ? '__undefined__' : JSON.parse(JSON.stringify(value));
}

function check(name, actual) {
  if (WRITE) {
    golden[name] = toJson(actual);
    return;
  }
  assert.ok(Object.prototype.hasOwnProperty.call(golden, name), `missing golden "${name}"`);
  assert.deepStrictEqual(toJson(actual), golden[name], name);
}

function load(rel) {
  return loadAmd(path.join(D, rel), { stubs });
}

const state = load('state.js');
const config = load('config.js');
const labels = load('view/labels.js');
const hasEffects = existsSync(path.join(D, 'effects/hostScope/filterRef.js'));
const mod = {
  actions: state.ACTIONS,
  createInitialState: state.createInitialState,
  reduce: state.reduceDienststelle,
  selectors: load('selectors.js'),
  hierarchy: load('restore/hierarchyIndex.js'),
  history: load('history.js'),
  sanitizeVisibleLabel: labels.sanitizeVisibleLabel,
  displaySanitizing: {
    sanitizePopupLabelsInRoot: (root) => labels.sanitizePopupLabelsInRoot(root),
    sanitizeCommittedDisplay: (wrapper, _sanitize, _selectors, hostDisplay) => labels.sanitizeCommittedDisplay(wrapper, hostDisplay)
  },
  domSelectors: config.DOM_SELECTORS,
  resolveDefinition: config.resolveDefinition
};

function entry(use, display, hostDisplay) {
  return { displayValue: display, useValue: use, source: 'cognos', hostDisplay: hostDisplay || '' };
}

function scopeEntry(scopeId, values) {
  return {
    scopeId,
    currentValues: values,
    backupValues: [entry('b', 'B')],
    pendingValues: [entry('p', 'P')],
    lastObservedHostValues: values,
    lastConfirmedAt: 111
  };
}

function filterState(key, global, pageContext) {
  return {
    filterKey: key,
    visibleFilterLabel: 'Dienststelle',
    status: 'active',
    isActive: true,
    currentSelectionByScope: { global: scopeEntry('global', global), pageContext: pageContext },
    resolution: null,
    lastInteraction: null,
    lastDefaultAt: null,
    lastConfirmedAt: 111,
    errorCode: null,
    errorMessage: null
  };
}

function buildState() {
  const state = mod.createInitialState();
  state.activeSichtValue = 'BW';
  state.activeFilterKey = 'Dienststelle_BW';
  state.activeHierarchyTableKey = 'dienststelle_bw_hierarchy';
  state.activeDefaultTableKey = 'dienststelle_bw_default';
  state.byFilter = {
    Dienststelle_BW: filterState('Dienststelle_BW', [entry('[A]', 'A', 'A#1')], {
      tabA: scopeEntry('tabA', [entry('[T1]', 'T1')]),
      tabB: scopeEntry('tabB', [entry('[T2]', 'T2'), entry('[T3]', 'T3')])
    }),
    Dienststelle_DEZPV: filterState('Dienststelle_DEZPV', [entry('[Z]', 'Z')], {})
  };
  return state;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

const A = mod.actions;
const REDUCER_CASES = {
  mountReady: { type: A.MOUNT_READY, payload: { mountedAt: 1 } },
  dockStateTimestamp: { type: A.FILTER_DOCK_STATE_CHANGED, payload: { timestamp: 55 } },
  popupReadyNoTimestamp: { type: A.FILTER_DOCK_POPUP_READY, payload: {} },
  sichtChanged: {
    type: A.SICHT_CHANGED,
    payload: {
      activeSichtValue: 'DEZPV',
      activeFilterKey: 'Dienststelle_DEZPV',
      visibleFilterLabel: 'Dienststelle',
      activeHierarchyTableKey: 'dienststelle_dezpv_hierarchy',
      activeDefaultTableKey: 'dienststelle_dezpv_default',
      observedAt: 77
    }
  },
  sichtChangedEmpty: { type: A.SICHT_CHANGED, payload: {} },
  selectionGlobalArray: {
    type: A.SELECTION_OBSERVED,
    payload: { scopeId: 'global', selection: [entry('[N1]', 'N1'), { displayValue: 7, useValue: 8 }], timestamp: 500 }
  },
  selectionGlobalSingle: {
    type: A.SELECTION_OBSERVED,
    payload: { selection: { displayValue: 'S', useValue: '[S]', source: 'x', hostDisplay: 'S#1' }, timestamp: 501 }
  },
  selectionPageExisting: {
    type: A.SELECTION_OBSERVED,
    payload: { scopeId: 'tabA', selection: [entry('[N2]', 'N2')], timestamp: 502 }
  },
  selectionPageNew: {
    type: A.SELECTION_OBSERVED,
    payload: { scopeId: 'tabC', selection: [entry('[N3]', 'N3')], timestamp: 503 }
  },
  selectionEmpty: { type: A.SELECTION_OBSERVED, payload: { scopeId: 'tabB', timestamp: 504 } },
  selectionNewFilter: {
    type: A.SELECTION_OBSERVED,
    payload: { filterKey: 'Dienststelle_X', visibleFilterLabel: 'X', scopeId: 'global', selection: [entry('[X]', 'X')] }
  },
  selectionNoFilterKey: { type: A.SELECTION_OBSERVED, payload: { filterKey: '', selection: [] } },
  clearedGlobal: { type: A.SELECTION_CLEARED, payload: { timestamp: 600 } },
  clearedPageExisting: { type: A.SELECTION_CLEARED, payload: { scopeId: 'tabB', timestamp: 601 } },
  clearedPageNew: { type: A.SELECTION_CLEARED, payload: { scopeId: 'tabQ', timestamp: 602 } },
  defaultApplied: {
    type: A.DEFAULT_APPLIED,
    payload: { scopeId: 'global', selection: [entry('[D]', 'D')], timestamp: 700 }
  },
  defaultAppliedPage: {
    type: A.DEFAULT_APPLIED,
    payload: { scopeId: 'tabA', selection: [entry('[D]', 'D')], timestamp: 701 }
  },
  tabWriteClear: {
    type: A.TAB_MUTATION_SCOPE_WRITE,
    payload: { filterKey: 'Dienststelle_BW', scopeId: 'tabA', clear: true, timestamp: 800 }
  },
  tabWriteEntry: {
    type: A.TAB_MUTATION_SCOPE_WRITE,
    payload: {
      filterKey: 'Dienststelle_BW',
      scopeId: 'tabB',
      entry: { currentValues: [entry('[W]', 'W')], backupValues: [], pendingValues: [], lastObservedHostValues: [entry('[W]', 'W')] },
      timestamp: 801
    }
  },
  tabWriteNewScope: {
    type: A.TAB_MUTATION_SCOPE_WRITE,
    payload: { filterKey: 'Dienststelle_DEZPV', scopeId: 'tabZ', entry: { currentValues: [entry('[W2]', 'W2')], lastConfirmedAt: 9 }, timestamp: 802 }
  },
  tabWriteNullEntry: {
    type: A.TAB_MUTATION_SCOPE_WRITE,
    payload: { filterKey: 'Dienststelle_BW', scopeId: 'tabA', entry: null, timestamp: 803 }
  },
  tabWriteGlobalIgnored: {
    type: A.TAB_MUTATION_SCOPE_WRITE,
    payload: { filterKey: 'Dienststelle_BW', scopeId: 'global', clear: true }
  },
  tabWriteNoFilter: { type: A.TAB_MUTATION_SCOPE_WRITE, payload: { scopeId: 'tabA' } },
  statusInactive: { type: A.FILTER_STATUS_CHANGED, payload: { filterKey: 'Dienststelle_BW', status: 'inactive' } },
  statusRemoved: { type: A.FILTER_STATUS_CHANGED, payload: { status: 'removed' } },
  statusActive: { type: A.FILTER_STATUS_CHANGED, payload: { filterKey: 'Dienststelle_DEZPV', status: 'active' } },
  statusIsActiveFalse: { type: A.FILTER_STATUS_CHANGED, payload: { filterKey: 'Dienststelle_DEZPV', isActive: false } },
  statusError: {
    type: A.FILTER_STATUS_CHANGED,
    payload: { filterKey: 'Dienststelle_BW', status: 'error', errorMessage: 42 }
  },
  statusUnknownFilter: { type: A.FILTER_STATUS_CHANGED, payload: { filterKey: 'Dienststelle_Y', status: 'active' } },
  syncRequested: {
    type: A.SYNC_REQUESTED,
    payload: {
      activeSichtValue: 'BW',
      dominantScope: 'global',
      dominantValues: [entry('[V]', 'V')],
      pageContextValuesByScope: { tabA: [{ useValue: 'u' }] },
      isHistoryReplay: true
    }
  },
  syncRequestedEmpty: { type: A.SYNC_REQUESTED, payload: {} },
  replayApplied: { type: A.HISTORY_REPLAY_APPLIED, payload: { appliedAt: 9 } },
  replayAppliedNow: { type: A.HISTORY_REPLAY_APPLIED },
  errorAction: { type: A.ERROR, payload: { errorCode: 'X', errorMessage: 5 } },
  errorDefault: { type: A.ERROR },
  destroy: { type: A.DESTROY },
  unknown: { type: 'dienststelle/unknown' },
  tableDataChanged: { type: A.TABLE_DATA_CHANGED, payload: { tableName: 't' } }
};

test('T1 reducer: each action against the baseline', () => {
  Object.keys(REDUCER_CASES).forEach((name) => {
    const state = cloneState(buildState());
    deepFreeze(state);
    const result = mod.reduce(state, REDUCER_CASES[name]);
    check('reducer.' + name, result);
    assert.deepStrictEqual(toJson(state), toJson(buildState()), name + ' mutated its input');
  });
});

test('T1 reducer: missing state and sequence', () => {
  check('reducer.undefinedState', mod.reduce(undefined, { type: 'x' }));
  check('reducer.undefinedAction', mod.reduce(buildState(), undefined));
  let state = buildState();
  const states = [];
  const live = [];
  Object.keys(REDUCER_CASES).forEach((name) => {
    deepFreeze(state);
    state = mod.reduce(state, REDUCER_CASES[name]);
    states.push(cloneState(state));
    live.push(state);
  });
  live.forEach((entryState, idx) => assert.deepStrictEqual(toJson(entryState), states[idx], 'state ' + idx + ' changed later'));
  check('reducer.sequenceFinal', state);
  check('reducer.sequenceStepHashes', states.map((s) => createHash('sha1').update(JSON.stringify(s)).digest('hex').slice(0, 12)));
});

test('T2 selectors', () => {
  const K = { state: { filters: { dienststelle: buildState() } } };
  const state = mod.selectors.readDienststelleState(K);
  check('selectors.state', state);
  assert.strictEqual(state, K.state.filters.dienststelle);
  check('selectors.snapshot', mod.selectors.readDienststelleSnapshot(K));
  check('selectors.context', mod.selectors.readActiveDienststelleContext(K));
  check('selectors.stateMissing', mod.selectors.readDienststelleState({ state: { filters: {} } }));
  check('selectors.snapshotMissing', mod.selectors.readDienststelleSnapshot({}));
  check('selectors.contextMissing', mod.selectors.readActiveDienststelleContext(null));
  const noFilter = { state: { filters: { dienststelle: Object.assign(buildState(), { activeFilterKey: 'Dienststelle_Q' }) } } };
  check('selectors.snapshotNoFilterState', mod.selectors.readDienststelleSnapshot(noFilter));
});

const HIERARCHY_ROWS = [
  { c1: { display: 'Bundeswehr', use: '[Org].[Org].[Org].&[1]' }, c2: { d: 'Heer', u: '[Org].[Org].[Org].&[1].&[10]' } },
  { c1: '[Org].[Org].[Org].&[1]', c2: { display: 'Heer', use: '[Org].[Org].[Org].&[1].&[10]' } },
  { c1: { display: 'Luftwaffe', useValue: '[Org].[Org].[Org].&[2]' }, c2: { display: 'Dup', use: '[Org].[Org].[Org].&[3]' } },
  { c1: { display: 'Dup2', use: '[Org].[Org].[Org].&[3]' }, c2: { display: 'Heer', use: '[Org].[Org].[Org].&[4]' } },
  { c1: 42, c2: null, c3: '', c4: [], c5: { display: 'x' }, c6: '  ' },
  null,
  'str'
];

test('T3 hierarchy index', () => {
  const index = mod.hierarchy.buildHierarchyIndex(HIERARCHY_ROWS);
  check('hierarchy.index', index);
  check('hierarchy.indexEmpty', mod.hierarchy.buildHierarchyIndex(null));
  const queries = ['[Org].[Org].[Org].&[1]', '1', '10', 'Luftwaffe', 'Heer', 'Dup', '3', 'zzz', '', null, undefined, 42];
  check('hierarchy.hasUseValue', queries.map((q) => mod.hierarchy.hasUseValue(index, q)));
  check('hierarchy.resolveRestorePair', queries.map((q) => mod.hierarchy.resolveRestorePair(index, q)));
  check('hierarchy.nullIndex', [mod.hierarchy.hasUseValue(null, 'x'), mod.hierarchy.resolveRestorePair(null, 'x')]);
});

test('T4 history', () => {
  const state = buildState();
  const valuesByScope = {
    activeSichtValue: 'BW',
    activeFilterKey: 'Dienststelle_BW',
    visibleFilterLabel: 'Dienststelle',
    valuesByScope: { global: [entry('[A]', 'A')], pageContext: { tabA: [entry('[T1]', 'T1')], tabB: [] } }
  };
  check('history.normalizeValuesByScope', mod.history.normalizeReplayTargetSnapshot(valuesByScope));
  check('history.normalizeByFilter', mod.history.normalizeReplayTargetSnapshot(state));
  check('history.normalizeNull', [mod.history.normalizeReplayTargetSnapshot(null), mod.history.normalizeReplayTargetSnapshot({}), mod.history.normalizeReplayTargetSnapshot('x')]);
  check('history.dominant', [
    mod.history.readDominantStoredSelection(valuesByScope.valuesByScope),
    mod.history.readDominantStoredSelection({ global: [], pageContext: { tabB: [entry('[Q]', 'Q')] } }),
    mod.history.readDominantStoredSelection({ global: [], pageContext: { tabB: [] } }),
    mod.history.readDominantStoredSelection(null)
  ]);
  check('history.buildStep', [
    mod.history.buildCommittedStep({ a: 1 }, { b: 2 }, 123),
    mod.history.buildCommittedStep(null, null, 5),
    mod.history.buildCommittedStep({ a: 1 }, { b: 2 })
  ]);

  const pushed = [];
  const K = {
    state: { filters: { dienststelle: state } },
    runtime: { dienststelle: {} },
    services: { history: { pushCommittedStep: (step) => (pushed.push(step), true) } }
  };
  const oldSnapshot = { activeSichtValue: 'BW', activeFilterKey: 'Dienststelle_BW', visibleFilterLabel: 'Dienststelle', valuesByScope: { global: [], pageContext: {} } };
  const result = { ok: true };
  assert.strictEqual(mod.history.pushDienststelleHistoryStep(K, oldSnapshot, result), result);
  assert.strictEqual(mod.history.pushDienststelleHistoryStep(K, null, result), result);
  assert.strictEqual(mod.history.pushDienststelleHistoryStep(K, oldSnapshot, null), null);
  check('history.pushedSteps', pushed);
  assert.strictEqual(pushed.length, 1);
  assert.strictEqual(pushed[0].key, 'filter_dienststelle');
});

test('T5 labels and definitions', () => {
  const inputs = ['A#1', 'x|y', 'Abt - Ref', '', ' ', null, 42, 'Kenn#Org|Abt - Ref', '#', 'a# ', 'a#b|', 'a#b|c - ', 'a#b - c', 'a#b|c - d'];
  check('labels.sanitize', inputs.map((v) => mod.sanitizeVisibleLabel(v)));
  check('config.resolveDefinition', ['BW', 'DEZPV', 'x', null, undefined, ''].map((v) => mod.resolveDefinition(v)));
  const first = mod.resolveDefinition('BW');
  first.activeFilterKey = 'mutated';
  assert.strictEqual(mod.resolveDefinition('BW').activeFilterKey, 'Dienststelle_BW');
});

test('T6 restore scope plan (needs the effects/ files of Task B)', { skip: !hasEffects }, () => {
  mod.buildRestoreScopePlan = load('restore/scopePlan.js').buildRestoreScopePlan;
  const diagnostics = [];
  const K = {
    runtime: {
      dienststelle: {
        tabsFacet: {
          listTabs: () => ({
            ok: true,
            data: [
              { id: 'tabLayout1', pageId: 'page1' },
              { id: 'tabLayout2', pageId: 'page2' },
              { id: 'tabLayout3' },
              null
            ]
          })
        }
      }
    }
  };
  const index = mod.hierarchy.buildHierarchyIndex(HIERARCHY_ROWS.concat([{ c: { display: 'ASFINAG', use: '2018071309490610' } }]));
  const payload = {
    dienststelle: {
      key: 'Dienststelle_BW',
      glob: ['1', 'MAG', 'Unbekannte Dienststelle', '12345', 'Autobahnen- und Schnellstraßen Finanzierungs AG - ASFINAG - Unbekannt (Ebene 1)'],
      byTab: { 0: ['10'], 1: ['zzz', '2'], 2: 'not-an-array', 3: ['3'], 4: ['1'] }
    },
    tabIdxToScopeId: {
      0: { scopeId: 'scopeFromTarget' },
      1: { tabId: 'tabLayout2' },
      2: { pageId: 'page3' },
      3: { tabId: 'unknown' }
    },
    options: { mapOldToNew: true, fallbackToDefault: true }
  };
  const fallback = { displayValue: 'Default', useValue: '[Org].[Org].[Org].&[1]', source: 'cognos' };
  const plan = mod.buildRestoreScopePlan({ _KDB: K }, payload, index, 6, fallback, diagnostics);
  check('scopePlan.plan', plan);
  check('scopePlan.diagnostics', diagnostics);

  const diagnostics2 = [];
  const noMap = Object.assign({}, payload, { options: {} });
  const plan2 = mod.buildRestoreScopePlan({ _KDB: K }, noMap, index, 0, null, diagnostics2);
  check('scopePlan.planNoMapNoRows', plan2);
  check('scopePlan.diagnosticsNoMapNoRows', diagnostics2);
});

function fakeEl(init) {
  const attrs = { 'aria-label': init.aria || '', title: init.title || '' };
  const classes = new Set(init.classes || []);
  const el = {
    textContent: init.text,
    parent: init.parent || null,
    children: init.children || {},
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: (name, value) => { attrs[name] = String(value); },
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name)
    },
    closest: () => el.parent,
    querySelector: (selector) => el.children[selector] || null,
    querySelectorAll: (selector) => el.children[selector] || [],
    dump: () => ({ text: el.textContent, attrs: Object.assign({}, attrs), classes: Array.from(classes).sort() })
  };
  return el;
}

test('T5 display sanitizing on fake DOM', () => {
  const sel = mod.domSelectors;
  const sanitize = mod.sanitizeVisibleLabel;
  const labelNodes = [
    fakeEl({ text: 'Kenn#Org|Abt - Ref' }),
    fakeEl({ text: 'plain' }),
    fakeEl({ text: 'Kenn#Org', title: 'Kenn#Org', classes: [sel.popupLabelsReadyClass] }),
    fakeEl({ text: 'Z#Zed', aria: 'Z#Zed' })
  ];
  const root = fakeEl({ text: '', children: { [sel.optionLabelSelectors[0]]: labelNodes } });
  const changedFirst = mod.displaySanitizing.sanitizePopupLabelsInRoot(root, sanitize, sel);
  const changedSecond = mod.displaySanitizing.sanitizePopupLabelsInRoot(root, sanitize, sel);
  const changedThird = mod.displaySanitizing.sanitizePopupLabelsInRoot(root, sanitize, sel);
  check('displaySanitizing.popup', { changedFirst, changedSecond, changedThird, nodes: labelNodes.map((n) => n.dump()) });

  const parent = fakeEl({ text: '', aria: 'Kenn#Org|Abt - Ref' });
  const span = fakeEl({ text: 'Kenn#Org|Abt - Ref', parent });
  const wrapper = fakeEl({ text: '', children: { [sel.committedDisplaySelector]: span } });
  const committedChanged = mod.displaySanitizing.sanitizeCommittedDisplay(wrapper, sanitize, sel, 'Kenn#Org|Abt - Ref');
  check('displaySanitizing.committed', { committedChanged, span: span.dump(), parent: parent.dump() });
  check('displaySanitizing.committedNone', [
    mod.displaySanitizing.sanitizeCommittedDisplay(null, sanitize, sel, ''),
    mod.displaySanitizing.sanitizeCommittedDisplay(fakeEl({ text: '' }), sanitize, sel, '')
  ]);
});

test('config: runtime defaults are fresh per call, filter keys and action strings are stable', () => {
  const first = config.createRuntimeDefaults();
  const second = config.createRuntimeDefaults();
  assert.deepStrictEqual(first, { parameterSetRunId: 0, tabMutationRunId: 0, tabMutationSnapshots: {} });
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.tabMutationSnapshots, second.tabMutationSnapshots);
  assert.deepStrictEqual(config.FILTER_KEYS, ['Dienststelle_BW', 'Dienststelle_DEZPV']);
  assert.strictEqual(Object.keys(state.ACTIONS).length, 24);
  assert.ok(Object.values(state.ACTIONS).every((value) => /^dienststelle\/[A-Za-z]+$/.test(value)));
  assert.strictEqual(config.PARAMETER_SET_CODES.CANCELLED, 'WRITEBACK_RESTORE_CANCELLED');
  assert.ok(Object.isFrozen(config.PARAMETER_SET_CODES));
  assert.ok(config.isRelevantTableName({ config: { tables: { dienststelle_bw_hierarchy: { name: ' Org Tree ' } } } }, 'org tree'));
  assert.ok(config.isRelevantTableName({}, 'DIENSTSTELLE_BW_DEFAULT'));
  assert.ok(!config.isRelevantTableName({}, 'other'));
  assert.deepStrictEqual(config.buildTableInput({ config: { tables: { t: { shape: 's', pick: 'p' } } } }, 't'), [{ tableName: 't', shape: 's', pick: 'p' }]);
  assert.strictEqual(config.buildTableInput({}, 't'), null);
});

test('state: a null value entry becomes the empty entry (old copy threw)', () => {
  assert.deepStrictEqual(state.copyValueEntries([null, { useValue: 3 }]), [
    { displayValue: '', useValue: '', source: 'cognos', hostDisplay: '' },
    { displayValue: '', useValue: '3', source: 'cognos', hostDisplay: '' }
  ]);
  assert.deepStrictEqual(state.copyValueEntries('x'), []);
});

test('history: equal snapshots are left to the history service to reject', () => {
  const pushed = [];
  const K = {
    state: { filters: { dienststelle: buildState() } },
    services: { history: { pushCommittedStep: (step) => (pushed.push(step), false) } }
  };
  const snapshot = mod.selectors.readDienststelleSnapshot(K);
  const result = { ok: true };
  assert.strictEqual(mod.history.pushDienststelleHistoryStep(K, snapshot, result), result);
  assert.strictEqual(pushed.length, 1);
  assert.strictEqual(mod.history.pushDienststelleHistoryStep({ state: K.state }, snapshot, result), result);
});

test('tab mutation: duplicate and restoreDeleted report the diagnostics of both slots (needs effects/)', { skip: !hasEffects }, async () => {
  const tabMutation = load('tabMutation.js');
  const targets = { 0: { scopeId: 'tabA' }, 1: { scopeId: 'tabB' } };
  const K = { state: { filters: { dienststelle: buildState() } }, runtime: {}, services: {} };
  const runtime = { tabMutationRunId: 0, tabMutationSnapshots: {} };
  const ctx = {
    _KDB: K,
    runtime,
    dispatchInternal: (action) => { K.state.filters.dienststelle = state.reduceDienststelle(K.state.filters.dienststelle, action); }
  };
  const route = (type, payload) => tabMutation.routeTabMutationAction(ctx, { type, payload });
  const badMove = [{ fromTabIdx: 3, toTabIdx: 4 }];
  let runId = 0;
  const results = {};
  for (const operation of ['duplicate', 'restoreDeleted']) {
    runId += 1;
    const base = { runId, operationId: 'op' + runId, tabIdxToScopeId: targets };
    const plan = { operation, sourceSlot: { tabIdx: 0 }, insertSlot: { tabIdx: 1 }, slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }] };
    const prepared = await route(state.ACTIONS.PREPARE_TAB_MUTATION, Object.assign({ plan }, base));
    assert.strictEqual(prepared.ok, true);
    results[operation] = await route(
      state.ACTIONS.APPLY_TAB_MUTATION,
      Object.assign({ plan: Object.assign({}, plan, { slotMoves: badMove }) }, base)
    );
  }
  ['duplicate', 'restoreDeleted'].forEach((operation) => {
    assert.strictEqual(results[operation].ok, false);
    assert.deepStrictEqual(
      results[operation].diagnostics.map((diagnostic) => diagnostic.message),
      ['scopeId could not be resolved for tabIdx 3', 'scopeId could not be resolved for tabIdx 4']
    );
  });
});
