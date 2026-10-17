// Integration goldens for dashboard/filters/dienststelle: drives the public api.dienststelle through the
// orchestrator against a stateful fake host and compares the observable outcome (return values, ordered host
// writes/clears, final state, history pushes, widgetVis events, messages, runtime fields) with literals.
// Run: node --test tools/tests/dienststelle-integration.golden.test.mjs
// The expected values in fixtures/dienststelle-integration.golden.json are literal outcomes of the pre-restructure
// module (origin/main at f9d0681, byte-identical to 596c787 for this folder) and must not be regenerated from the
// current code. To capture another tree, set DIENSTSTELLE_GOLDEN_JS_ROOT to its KDB3/js folder and
// DIENSTSTELLE_GOLDEN_OUT to the file that receives the JSON; the assertions are skipped in that mode.
// Deliberate behaviour changes versus the old code (reducer copy-on-write, `to`-slot diagnostics of tab mutation)
// are covered by dienststelle-core.test.mjs and are not part of these scenarios.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAmd } from '../lib/amd-loader.mjs';
import { JS_ROOT } from '../lib/amd-graph.mjs';

const ROOT = process.env.DIENSTSTELLE_GOLDEN_JS_ROOT || JS_ROOT;
const OUT_FILE = process.env.DIENSTSTELLE_GOLDEN_OUT || '';
const FIXED = 1700000000000;
class FixedDate extends Date {
  constructor(...args) {
    if (args.length) super(...args);
    else super(FIXED);
  }
  static now() {
    return FIXED;
  }
}

const ok = (data) => ({ ok: true, data });
const PAGES = ['tab0_tabpanel', 'tab1_tabpanel', 'tab2_tabpanel'];
const KEYS = ['Dienststelle_BW', 'Dienststelle_DEZPV'];
const itemId = (key) => '[Org_Source].[Dienststelle].[Dienststelle].[' + key + ']';
const U = (n) => '[Org].[Org].[Org].&[' + n + ']';
const HIER = [
  { c1: { display: 'Bundeswehr', use: U(1) }, c2: { d: 'Heer', u: U(1) + '.&[10]' } },
  { c1: { display: 'Luftwaffe#1 | LW - Luft', use: U(2) }, c2: { display: 'Dup', use: U(3) } },
  { c1: { display: 'Dup2', use: U(3) }, c2: { display: 'Heer', use: U(4) } }
];
const DEF_ROW = [{ d: { d: 'Default Org', u: U(1) } }];

function makeHost(init) {
  const store = {};
  KEYS.forEach((key) => {
    store[key] = { global: (init.global && init.global[key]) || null, pages: { ...((init.pages && init.pages[key]) || {}) } };
  });
  const log = [];
  const pushes = [];
  const widget = [];
  const messages = [];
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const desc = (key, raw) => ({ itemName: key, itemId: itemId(key), rawScopeId: raw });
  const filters = {
    listFilterItems(input) {
      if (input.scopeId === 'global') return ok(KEYS.map((key) => desc(key, 'global')));
      const all = [];
      PAGES.forEach((page) => KEYS.forEach((key) => all.push(desc(key, page))));
      if (input.allPageContextScopes) return ok(all);
      if (input.scopeId) return ok(all.filter((d) => d.rawScopeId === input.scopeId));
      return ok([]);
    },
    listPageContextScopes: () => ok(PAGES.slice()),
    readFilterValues(ref) {
      const entry = store[ref.itemName];
      const values = ref.scopeId === 'global' ? entry.global : entry.pages[ref.scopeId];
      return ok((values || []).map((x) => ({ ...x })));
    },
    writeFilter({ ref, values }) {
      log.push(['write', ref.itemName, ref.scopeId, copy(values)]);
      if (ref.scopeId === 'global') store[ref.itemName].global = values;
      else store[ref.itemName].pages[ref.scopeId] = values;
      return Promise.resolve({ ok: !(init.failWrite && init.failWrite(ref)), errorCode: 'X' });
    },
    clearFilter(ref) {
      log.push(['clear', ref.itemName, ref.scopeId]);
      delete store[ref.itemName].pages[ref.scopeId];
      return Promise.resolve({ ok: true });
    }
  };
  const tabsFacet = { listTabs: () => ok([0, 1, 2].map((i) => ({ index: i, id: 'tab' + i, pageId: 'page' + i }))) };
  const KDB = {
    config: {
      tables: {
        dienststelle_bw_default: { shape: 'r', pick: 'a' },
        dienststelle_bw_hierarchy: { shape: 'r', pick: 'b' },
        dienststelle_dezpv_default: { shape: 'r', pick: 'c' },
        dienststelle_dezpv_hierarchy: { shape: 'r', pick: 'd' }
      },
      tabs: { 0: { role: 'dashboard' }, 1: { role: 'dashboard' }, 2: { role: 'dashboard' }, 3: { role: 'info' } },
      dataSources: { metrics: { default: { prefix: 'metrics' } } },
      labels: { de: { dienststelle: { emptyOkDefaultRequired: 'Auswahl fuer {filterName} noetig' } } }
    },
    state: { filters: {}, tabs: { activeTabId: 'tab1' } },
    runtime: { tabs: { pendingPromises: {} } },
    utils: { waitFor: loadAmd(path.join(ROOT, 'core/utils/waitFor.js')) },
    events: { subscribe: () => () => {} },
    services: {
      cognosHost: { filters, tabs: tabsFacet },
      tableData: {
        readTableState: () => ({ lifecycle: init.notReady ? 'loading' : 'ready' }),
        readRows(input) {
          if (!/hierarchy/.test(input[0].tableName)) return DEF_ROW;
          if (init.throwRows) throw new Error('rows boom');
          return HIER;
        },
        waitForRows: () => (init.notReady ? new Promise(() => {}) : Promise.resolve()),
        abortTable: (x) => {
          log.push(['abortTable', copy(x)]);
          return Promise.resolve();
        }
      },
      message: { notify: (m) => messages.push(['notify', m]), notifyAnchored: (m) => messages.push(['anchored', m]) },
      history: {
        pushCommittedStep(step) {
          if (JSON.stringify(step.old) === JSON.stringify(step.new)) return false;
          pushes.push(copy(step));
          return true;
        }
      }
    },
    api: { widgetVis: { dispatch: (a) => widget.push(copy(a)) }, sicht: { getState: () => ({ activeSichtValue: 'BW' }) } }
  };
  return { KDB, store, log, pushes, widget, messages };
}

function boot(init) {
  const host = makeHost(init);
  const register = loadAmd(path.join(ROOT, 'dashboard/filters/dienststelle/index.js'), {
    stubs: { Date: FixedDate }
  });
  const api = register(host.KDB, {});
  api.mount({});
  return { host, api };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const J = (value) => (value === undefined ? '__undefined__' : JSON.parse(JSON.stringify(value)));
const V = (d, u, hostDisplay) => ({ d, u, hostDisplay });
const A = 'dienststelle/';

const sicht = (t, value, source, observedAt) =>
  t.api.dispatch({ type: A + 'sichtChanged', payload: { activeSichtValue: value, source, observedAt } });
const dock = (t, label, scope, interactionType, observedAt, scopeId) =>
  t.api.dispatch({
    type: A + 'filterDockStateChanged',
    payload: { filterType: 'dienststelle', filterLabel: label, filterScope: scope, scopeId, interactionType, observedAt }
  });
const settle = () => sleep(120);
const afterNotify = () => sleep(750);
const startup = async (t) => {
  sicht(t, 'BW', 'startup', 5);
  await settle();
};
const seedGlobal = (t, values) => {
  t.host.store.Dienststelle_BW.global = values;
};
const seedPage = (t, key, scopeId, values) => {
  t.host.store[key].pages[scopeId] = values;
};

const SHORT = [[U(0).replace(/0\]$/, ''), '&']];
const shorten = (value) => JSON.parse(SHORT.reduce((text, [from, to]) => text.split(from).join(to), JSON.stringify(value)));
const brief = (value) => (value && value.byFilter ? { lifecycle: value.lifecycle, errorCode: value.errorCode } : J(value));
const values = (list) => (list || []).map((v) => [v.displayValue, v.useValue, v.source, v.hostDisplay].join('|'));
const scopeEntry = (e) =>
  ['cur=' + values(e.currentValues), 'bak=' + values(e.backupValues), 'pend=' + values(e.pendingValues), 'obs=' + values(e.lastObservedHostValues), 'at=' + e.lastConfirmedAt].join(' ');
function projectState(state) {
  const out = { lifecycle: state.lifecycle, sicht: state.activeSichtValue, key: state.activeFilterKey, error: state.errorCode, filters: {} };
  Object.keys(state.byFilter).forEach((key) => {
    const f = state.byFilter[key];
    const pages = {};
    Object.keys(f.currentSelectionByScope.pageContext).forEach((id) => {
      pages[id] = scopeEntry(f.currentSelectionByScope.pageContext[id]);
    });
    out.filters[key] = {
      head: [f.status, f.isActive, f.errorCode, 'def=' + f.lastDefaultAt, 'conf=' + f.lastConfirmedAt, JSON.stringify(f.lastInteraction)].join(' '),
      global: scopeEntry(f.currentSelectionByScope.global),
      pages
    };
  });
  const r = state.resolution;
  if (r) {
    const byScope = {};
    Object.keys(r.pageContextValuesByScope || {}).forEach((id) => {
      byScope[id] = values(r.pageContextValuesByScope[id]);
    });
    out.resolution = { scope: r.dominantScope, dominant: values(r.dominantValues), downstream: values(r.downstreamValues), byScope };
  }
  out.meta = state.meta;
  out.replay = state.replay;
  return out;
}
const widgetLine = (event) => {
  const p = event.payload;
  const sel = p.selection || {};
  const res = (p.hierarchySnapshot && p.hierarchySnapshot.resolution) || {};
  return [event.type, p.scopeType + '/' + p.scopeId, p.activeFilterKey, values([sel])[0], p.source, p.observedAt, res.dominantValues, res.displayValues].join(' ');
};
const logLine = (entry) => entry.map((part) => (typeof part === 'string' ? part : JSON.stringify(part))).join(' ');

const INITS = {
  restoreFailWrite: { failWrite: () => true },
  restoreTimeoutAndThrow: { notReady: true },
  restoreThrows: { throwRows: true },
  startupWithHostValues: {
    global: { Dienststelle_BW: [{ d: 'G#1 | X - Gx', u: U(1) }] },
    pages: { Dienststelle_BW: { tab1_tabpanel: [{ d: 'P', u: U(2) }] } }
  }
};

const SCENARIOS = {
  async sichtSwitch(t) {
    await startup(t);
    sicht(t, 'DEZPV', 'user', 6);
    await settle();
    sicht(t, 'BW', 'user', 7);
    await settle();
    return {};
  },
  async confirmGlobalClearConfirm(t) {
    await startup(t);
    seedGlobal(t, [V('Org A', U(1), 'Org A')]);
    const widgetBefore = t.host.widget.length;
    dock(t, 'Dienststelle_BW', 'global', 'confirm', 9);
    await sleep(450);
    const widgetBeforeDeferral = t.host.widget.length - widgetBefore;
    await sleep(300);
    const widgetAfterDeferral = t.host.widget.length - widgetBefore;
    seedGlobal(t, null);
    dock(t, 'Dienststelle_BW', 'global', 'clear', 10);
    dock(t, 'Dienststelle_BW', 'global', 'confirm', 11);
    await afterNotify();
    return { widgetBeforeDeferral, widgetAfterDeferral, firstWidget: J(t.host.widget[0]), firstPush: J(t.host.pushes[0]) };
  },
  async confirmPageClearConfirm(t) {
    await startup(t);
    seedPage(t, 'Dienststelle_BW', 'tab1_tabpanel', [V('Org B', U(2), 'Org B#x | y - Org B')]);
    dock(t, 'Dienststelle_BW', 'pageContext', 'confirm', 9, 'tab1_tabpanel');
    await afterNotify();
    seedPage(t, 'Dienststelle_BW', 'tab1_tabpanel', null);
    dock(t, 'Dienststelle_BW', 'pageContext', 'clear', 10, 'tab1_tabpanel');
    dock(t, 'Dienststelle_BW', 'pageContext', 'confirm', 11, 'tab1_tabpanel');
    await afterNotify();
    return {};
  },
  async tableDataSnapshots(t) {
    await startup(t);
    seedGlobal(t, [V('Org A', U(1), 'Org A')]);
    seedPage(t, 'Dienststelle_BW', 'tab0_tabpanel', [V('Org C', U(4), '')]);
    t.api.dispatch({ type: A + 'tableDataChanged', payload: { tableName: 'dienststelle_bw_default' } });
    await settle();
    const active = J(t.api.getCurrentHierarchySnapshot({ pageScopeId: 'active' }));
    const scoped = J(t.api.getCurrentHierarchySnapshot({ pageScopeId: 'tab0_tabpanel' }));
    const none = J(t.api.getCurrentHierarchySnapshot());
    t.host.KDB.runtime.tabs.pendingPromises.tabMutation = Promise.resolve();
    const logLength = t.host.log.length;
    t.api.dispatch({ type: A + 'tableDataChanged', payload: { tableName: 'dienststelle_bw_default' } });
    await settle();
    return { active, scoped, none, busyAddedLogs: t.host.log.length - logLength };
  },
  async restoreMatrix(t) {
    const payload = {
      runId: 1,
      activeSichtValue: 'BW',
      dienststelle: { key: 'Dienststelle_BW', glob: [U(1)], byTab: { 0: [U(2), 'nonexistent'], 1: ['Heer'], 2: [] } },
      tabIdxToScopeId: { 0: { scopeId: 'tab0_tabpanel' }, 1: { tabId: 'tab1' }, 2: { pageId: 'page2' } },
      options: { mapOldToNew: true, fallbackToDefault: true, hierarchyWaitTimeoutMs: 500 }
    };
    const restore = (extra) =>
      t.api.dispatch({ type: A + 'parameterSetRestoreRequested', payload: { ...payload, ...extra } }).then(J);
    const r1 = await restore({});
    const r2 = await restore({ runId: 0 });
    const r3 = await restore({ runId: 2, dienststelle: { key: 'Dienststelle_DEZPV', glob: [] } });
    const r4 = await restore({
      runId: 3,
      activeSichtValue: 'DEZPV',
      dienststelle: { key: 'Dienststelle_DEZPV', glob: [U(3), 'x'], byTab: { 1: [U(4)] } },
      options: { fallbackToDefault: false }
    });
    const r5 = J(await t.api.dispatch({ type: A + 'parameterSetRestoreRequested', payload: { activeSichtValue: 'BW' } }));
    await settle();
    return { r1, r2, r3, r4, r5 };
  },
  async restoreFailWrite(t) {
    const payload = {
      runId: 1,
      activeSichtValue: 'BW',
      dienststelle: { key: 'Dienststelle_BW', glob: [U(1)], byTab: { 1: [U(2)] } },
      tabIdxToScopeId: { 1: { scopeId: 'tab1_tabpanel' } },
      options: {}
    };
    return { r: J(await t.api.dispatch({ type: A + 'parameterSetRestoreRequested', payload })) };
  },
  async restoreTimeoutAndThrow(t) {
    const payload = {
      runId: 1,
      activeSichtValue: 'BW',
      dienststelle: { key: 'Dienststelle_BW', glob: [U(1)], byTab: { 1: [U(2)], 5: ['x'] } },
      tabIdxToScopeId: { 1: { scopeId: 'tab1_tabpanel' }, 5: {} },
      options: { fallbackToDefault: true, hierarchyWaitTimeoutMs: 120 }
    };
    const r = J(await t.api.dispatch({ type: A + 'parameterSetRestoreRequested', payload }));
    await settle();
    return { r };
  },
  async restoreThrows(t) {
    let r;
    try {
      r = await t.api.dispatch({
        type: A + 'parameterSetRestoreRequested',
        payload: { runId: 1, activeSichtValue: 'BW', dienststelle: { key: 'Dienststelle_BW', glob: ['x'] }, options: {} }
      });
    } catch (error) {
      r = 'REJECT:' + error.message;
    }
    return { r: J(r), errorCode: t.api.getState().errorCode };
  },
  async parameterSetClear(t) {
    await startup(t);
    seedGlobal(t, [V('Org A', U(1), '')]);
    seedPage(t, 'Dienststelle_BW', 'tab0_tabpanel', [V('Org C', U(4), '')]);
    seedPage(t, 'Dienststelle_BW', 'tab1_tabpanel', [V('Org D', U(3), '')]);
    const clear = (payload) => t.api.dispatch({ type: A + 'parameterSetClearRequested', payload }).then(J);
    const r1 = await clear({
      runId: 1,
      status: 'x',
      allowedClearTabIdxs: [1],
      tabIdxToScopeId: { 0: { scopeId: 'tab0_tabpanel' }, 1: { scopeId: 'tab1_tabpanel' } }
    });
    const r2 = await clear({ runId: 2, status: 'newDashboard' });
    const r3 = await clear({ status: 'newDashboard' });
    const r4 = await clear({ runId: 1 });
    const r5 = await clear({ runId: 1, tabIdxToScopeId: { 1: null, 2: { scopeId: null } }, allowedClearTabIdxs: [1] });
    return { r1, r2, r3, r4, r5 };
  },
  async tabMutationOperations(t) {
    await startup(t);
    seedPage(t, 'Dienststelle_BW', 'tab0_tabpanel', [V('Org C', U(4), '')]);
    seedPage(t, 'Dienststelle_BW', 'tab1_tabpanel', [V('Org D', U(3), 'Org D#x')]);
    t.api.dispatch({ type: A + 'tableDataChanged', payload: {} });
    await settle();
    const targets = { 0: { scopeId: 'tab0_tabpanel' }, 1: { scopeId: 'tab1_tabpanel' }, 2: { scopeId: 'tab2_tabpanel' } };
    const out = {};
    let run = 10;
    const dispatch = (type, payload) => t.api.dispatch({ type: A + type, payload }).then(J);
    const sequence = async (name, plan) => {
      run += 1;
      const payload = { runId: run, operationId: 'op' + run, tabIdxToScopeId: targets, plan };
      out[name] = {
        prepare: await dispatch('prepareTabMutation', payload),
        apply: await dispatch('applyTabMutation', payload),
        resync: await dispatch('resyncTabMutationHost', payload),
        restore: await dispatch('restoreTabMutationSnapshot', payload),
        store: J(t.host.store),
        logLength: t.host.log.length
      };
    };
    await sequence('move', { operation: 'move', slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }, { fromTabIdx: 1, toTabIdx: 2 }] });
    await sequence('delete', { operation: 'delete', deletedSlot: { tabIdx: 1 }, slotMoves: [{ fromTabIdx: 2, toTabIdx: 1 }] });
    await sequence('duplicate', {
      operation: 'duplicate',
      sourceSlot: { tabIdx: 0 },
      insertSlot: { tabIdx: 1 },
      slotMoves: [{ fromTabIdx: 1, toTabIdx: 2 }],
      clonePair: { from: { tabIdx: 0 }, to: { tabIdx: 1 } }
    });
    await sequence('restoreDeleted', {
      operation: 'restoreDeleted',
      insertSlot: { tabIdx: 1 },
      slotMoves: [{ fromTabIdx: 1, toTabIdx: 2 }],
      restore: { filters: { dienststelle: { Dienststelle_BW: { currentValues: [{ displayValue: 'R', useValue: 'r' }] } } } }
    });
    return out;
  },
  async tabMutationRejections(t) {
    await startup(t);
    seedPage(t, 'Dienststelle_BW', 'tab0_tabpanel', [V('Org C', U(4), '')]);
    t.api.dispatch({ type: A + 'tableDataChanged', payload: {} });
    await settle();
    const targets = { 0: { scopeId: 'tab0_tabpanel' }, 1: { scopeId: 'tab1_tabpanel' }, 2: { scopeId: 'tab2_tabpanel' } };
    const dispatch = (type, payload) => t.api.dispatch({ type: A + type, payload }).then(J);
    const out = {};
    let run = 20;
    const attempt = async (name, plan) => {
      run += 1;
      const payload = { runId: run, operationId: 'op' + run, tabIdxToScopeId: targets, plan };
      out[name] = {
        prepare: await dispatch('prepareTabMutation', payload),
        apply: await dispatch('applyTabMutation', payload),
        restore: await dispatch('restoreTabMutationSnapshot', payload)
      };
    };
    await attempt('noPlan', null);
    await attempt('unknownOp', { operation: 'weird' });
    await attempt('badSlot', { operation: 'move', slotMoves: [{ fromTabIdx: 9, toTabIdx: 1 }] });
    await attempt('moveBadFrom', { operation: 'move', slotMoves: [{ fromTabIdx: 7, toTabIdx: 1 }] });
    out.guard = await dispatch('applyTabMutation', { plan: { operation: 'move' } });
    out.stale = await dispatch('prepareTabMutation', {
      runId: 1,
      operationId: 'o',
      plan: { operation: 'move', slotMoves: [] },
      tabIdxToScopeId: targets
    });
    return out;
  },
  async historyReplay(t) {
    await startup(t);
    const target = {
      activeSichtValue: 'BW',
      activeFilterKey: 'Dienststelle_BW',
      visibleFilterLabel: 'Dienststelle',
      valuesByScope: {
        global: [{ displayValue: 'A', useValue: U(1), hostDisplay: 'A' }],
        pageContext: { tab1_tabpanel: [{ displayValue: 'B', useValue: U(2) }], tab0_tabpanel: [] }
      }
    };
    const replay = (payload) => t.api.dispatch({ type: A + 'historyReplayRequested', payload });
    const r1 = J(await replay({ targetValue: target, step: { timestamp: 77 } }));
    await settle();
    const r2 = J(await replay({ targetValue: null, step: { old: { activeSichtValue: 'ZZ' } } }));
    const r3 = J(await replay({ targetValue: t.api.getState() }));
    await settle();
    const r4 = J(
      await replay({
        step: { old: { activeSichtValue: 'DEZPV', valuesByScope: { global: [{ displayValue: 'Z', useValue: 'z' }], pageContext: {} } } }
      })
    );
    await settle();
    const handler = t.host.KDB.runtime.dienststelle.historyReplayHandlerContribution;
    const r5 = J(await handler.apply(t.host.KDB, target, { key: 'filter_dienststelle', timestamp: 3 }, {}));
    const r6 = J(handler.apply(t.host.KDB, target, { key: 'other' }, {}));
    return { r1, r2, r3, r4, r5, r6 };
  },
  async startupWithHostValues(t) {
    await startup(t);
    t.api.dispatch({ type: A + 'syncRequested', payload: { source: 'sync', activeSichtValue: 'BW' } });
    await settle();
    return {
      page: J(t.api.getCurrentHierarchySnapshot({ pageScopeId: 'tab1_tabpanel' })),
      global: J(t.api.getCurrentHierarchySnapshot({ pageScopeId: 'global' })),
      state: projectState(t.api.getState())
    };
  },
  async dockEvents(t) {
    await startup(t);
    const results = [];
    ['filterDockPopupReady', 'filterDockFiltersReady', 'filterDockHeaderObserved', 'filterDockCommittedDisplayObserved', 'filterDockStateChanged', 'bogus', 'error'].forEach((type) => {
      results.push(
        brief(
          t.api.dispatch({
            type: A + type,
            payload: { filterType: 'dienststelle', filterLabel: 'Dienststelle_DEZPV', filterScope: 'global', interactionType: 'cancel', timestamp: 3, errorCode: 'E', errorMessage: 'm' }
          })
        )
      );
    });
    results.push(brief(dock(t, 'Dienststelle_BW', 'pageContext', 'clear', undefined, 'tab0_tabpanel')));
    results.push(brief(t.api.dispatch({ type: A + 'filterDockStateChanged', payload: { filterType: 'nope' } })));
    results.push(brief(t.api.dispatch()));
    await settle();
    return { results };
  },
  async destroyInNotifyWindow(t) {
    await startup(t);
    seedGlobal(t, [V('Org A', U(1), 'Org A')]);
    dock(t, 'Dienststelle_BW', 'global', 'confirm', 9);
    await sleep(200);
    const before = Object.keys(t.host.KDB.runtime.dienststelle.timers);
    t.api.destroy();
    const after = Object.keys(t.host.KDB.runtime.dienststelle.timers);
    await afterNotify();
    return { before, after, widgetCount: t.host.widget.length };
  },
  async destroyDuringConfirm(t) {
    await startup(t);
    seedGlobal(t, [V('Org A', U(1), 'Org A')]);
    dock(t, 'Dienststelle_BW', 'global', 'confirm', 9);
    t.api.destroy();
    await afterNotify();
    return {};
  },
  async destroyedApi(t) {
    await startup(t);
    const live = t.api.getState() === t.host.KDB.state.filters.dienststelle;
    t.api.destroy();
    t.api.destroy();
    const dispatched = brief(t.api.dispatch({ type: A + 'filterDockStateChanged', payload: {} }));
    const clear = J(await t.api.dispatch({ type: A + 'parameterSetClearRequested', payload: { runId: 5 } }));
    const prepare = J(await t.api.dispatch({ type: A + 'prepareTabMutation', payload: { operationId: 'z' } }));
    const runtime = t.host.KDB.runtime.dienststelle;
    return {
      live,
      dispatched,
      clear,
      prepare,
      state: brief(t.api.getState()),
      snapshot: J(t.api.getCurrentHierarchySnapshot()),
      mount: t.api.mount({}),
      runtimeKeys: Object.keys(runtime).sort().filter((key) => !/tabsFacet|historyReplayHandlerContribution|userCommitHopSeq/.test(key)),
      contribution: runtime.historyReplayHandlerContribution
    };
  }
};

function normalizeRuntime(runtime) {
  const out = {
    ...runtime,
    tabsFacet: null,
    historyReplayHandlerContribution: typeof (runtime.historyReplayHandlerContribution || {}).apply,
    timers: Object.keys(runtime.timers || {}).length,
    userCommitHopSeq: null
  };
  if (out.tabMutationRunId === 0) delete out.tabMutationRunId;
  if (out.tabMutationSnapshots && Object.keys(out.tabMutationSnapshots).length === 0) delete out.tabMutationSnapshots;
  const sorted = {};
  Object.keys(out)
    .sort()
    .forEach((key) => {
      sorted[key] = out[key];
    });
  return J(sorted);
}

async function runScenario(name) {
  const t = boot(INITS[name] || {});
  let out;
  try {
    out = await SCENARIOS[name](t);
  } catch (error) {
    out = { threw: String(error && error.message) };
  }
  return shorten({
    out,
    state: projectState(t.host.KDB.state.filters.dienststelle),
    store: t.host.store,
    log: t.host.log.map(logLine),
    pushes: t.host.pushes,
    widget: t.host.widget.map(widgetLine),
    messages: t.host.messages,
    runtime: normalizeRuntime(t.host.KDB.runtime.dienststelle)
  });
}

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/dienststelle-integration.golden.json');
const EXPECTED = OUT_FILE ? {} : JSON.parse(readFileSync(FIXTURE, 'utf8'));

const captured = {};
after(() => {
  if (OUT_FILE) writeFileSync(OUT_FILE, JSON.stringify(captured, null, 1) + '\n');
});

describe('dienststelle integration goldens', { concurrency: true }, () => {
  Object.keys(SCENARIOS).forEach((name) => {
    it(name, async () => {
      const actual = await runScenario(name);
      captured[name] = actual;
      if (OUT_FILE) return;
      assert.ok(Object.prototype.hasOwnProperty.call(EXPECTED, name), `missing golden "${name}"`);
      assert.deepStrictEqual(actual, EXPECTED[name], name);
    });
  });
});
