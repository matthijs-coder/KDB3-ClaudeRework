// Fake hosts for the real filter owners' tab-mutation actions (Phase 2 W6b). Each boot function registers the REAL
// owner through its index.js and returns a handle with the same shape, so one scenario list drives all three:
//   { name, api, KDB, targets, types, control, view(), takeLog(), takeConsole(), restoreSlice(), seed }
// Fake: cognosHost filters/tabs facets, tableData, history, reconcile (singleSelect only: needs the whole inventory).
import path from "node:path";
import crypto from "node:crypto";
import { loadAmd } from "../../lib/amd-loader.mjs";
import { JS_ROOT } from "../../lib/amd-graph.mjs";

const FILTERS = path.join(JS_ROOT, "dashboard/filters");
const FIXED = 1700000000000;
class FixedDate extends Date {
  constructor(...args) {
    if (args.length) super(...args);
    else super(FIXED);
  }
  static now() { return FIXED; }
}

const copy = (value) => JSON.parse(JSON.stringify(value));
const fmt = (value) => (value instanceof Error ? "Error:" + value.message : typeof value === "string" ? value : JSON.stringify(value));
const hash = (value) => crypto.createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 10);

function makeConsole(sink, control) {
  const record = (level, a) => {
    sink.push([level].concat(a.map(fmt)));
    if (control && control.consoleThrows) { throw new Error("console exploded"); }
  };
  return {
    log() {}, info() {}, debug() {},
    warn: (...a) => record("warn", a),
    error: (...a) => record("error", a)
  };
}

function makeControl() {
  return { failWrites: false, throwWrites: false, noopWrites: false, afterWrite: null, afterFailedWrite: null, writes: 0,
    failAfter: null, atWrite: null, readThrows: false, tabsThrow: false, consoleThrows: false, onRead: null, tabsItems: null };
}

// A write counts when it starts: control.atWrite = { n, fn } runs fn once as write number n begins, control.failAfter = k
// makes every write after the k-th one fail (the first k land).
function beginWrite(_control) {
  _control.writes += 1;
  if (_control.atWrite && _control.atWrite.n === _control.writes) {
    const hook = _control.atWrite.fn;
    _control.atWrite = null;
    hook();
  }
  return _control.failWrites || (_control.failAfter !== null && _control.writes > _control.failAfter);
}

function readHook(_control) {
  if (_control.onRead) {
    const hook = _control.onRead;
    _control.onRead = null;
    hook();
  }
}

function fireOnce(_control, _key) {
  if (_control[_key]) {
    const hook = _control[_key];
    _control[_key] = null;
    hook();
  }
}

function runtimeView(rt, extraKeys) {
  const snapshots = (rt && rt.tabMutationSnapshots) || {};
  const out = {
    tabMutationRunId: rt ? rt.tabMutationRunId : undefined,
    snapshots: Object.keys(snapshots).sort().map((id) => id + ":" + (snapshots[id] && snapshots[id].runId))
  };
  (extraKeys || []).forEach((key) => { out[key] = rt ? rt[key] : undefined; });
  return out;
}

export const TAB_IDS = ["t0", "t1", "t2"];

// ------------------------------------------------------------------------------------------------ singleSelect

export function bootSingleSelect(init) {
  const options = init || {};
  const sink = [];
  const log = [];
  const control = makeControl();
  const reconcileCalls = [];
  const store = {
    "s0|g1": [{ d: "Frau", u: "2" }], "s0|j1": [{ d: "2020", u: "2020" }],
    "s1|g1": [{ d: "Mann", u: "1" }], "s1|j1": [],
    "s2|g1": [], "s2|j1": [{ d: "2022", u: "2022" }]
  };
  if (options.tabCount > 3) { store["s3|g1"] = []; store["s3|j1"] = []; }
  const refKey = (ref) => (ref.scopeId || "") + "|" + (ref.itemId || ref.itemName || "");
  const facet = {
    listFilterItems: () => ({ ok: true, outcome: "ok", data: [] }),
    readFilterValues: (ref) => {
      readHook(control);
      if (control.readThrows) { throw new Error("read boom"); }
      return { ok: true, data: copy(store[refKey(ref)] || []) };
    },
    async writeFilter(request) {
      const failing = beginWrite(control);
      log.push(["write", refKey(request.ref), copy(request.values)]);
      if (control.throwWrites) { throw new Error("write boom"); }
      if (failing) { fireOnce(control, "afterFailedWrite"); return { ok: false }; }
      if (!control.noopWrites) { store[refKey(request.ref)] = copy(request.values); }
      if (control.afterWrite) { const hook = control.afterWrite; control.afterWrite = null; hook(); }
      return { ok: true };
    }
  };
  const reconcile = {
    async reconcileFilterInstances(_KDB, _runtime, opts) {
      reconcileCalls.push(opts);
      if (control.reconcileThrows) { throw new Error("reconcile boom"); }
      if (control.reconcileFails) { return { ok: false, diagnostics: [{ code: "RECONCILE_FAILED" }] }; }
      return { ok: true, diagnostics: [] };
    }
  };
  const register = loadAmd(path.join(FILTERS, "singleSelect/index.js"), {
    stubs: { console: makeConsole(sink, control), Date: FixedDate },
    overrides: { "dashboard/filters/singleSelect/inventory/reconcile.js": reconcile }
  });
  const KDB = {
    state: { filters: {} }, runtime: {}, api: {}, elements: {},
    properties: { kennzahlenTablesPropObj: { personal: {} }, filterPropObj: { personal: { filterInstances: {} } } },
    services: { cognosHost: { filters: facet }, tableData: { readRows: () => [] } },
    events: { subscribe() { return function unsubscribe() {}; } }
  };
  const api = register(KDB, {});
  const sel = (d, u, source) => ({ displayValue: d, useValue: u, displaySource: source });
  const alle = () => sel("Alle", "", "policy");
  const instances = {};
  const scopeRows = [["s0", "Frau", "2", "2020"], ["s1", "Mann", "1", ""], ["s2", "", "", "2022"]];
  if (options.tabCount > 3) { scopeRows.push(["s3", "", "", ""]); }
  scopeRows.forEach(([scope, gd, gu, jahr]) => {
    [["g1", "Geschlecht", gd, gu], ["j1", "Jahr", jahr, jahr]].forEach(([itemId, label, d, u]) => {
      const id = scope + "-" + itemId;
      instances[id] = {
        filterInstanceId: id, selectionOwner: "singleSelect", status: "active", hostStatus: "present",
        scopeType: "pageContext", scopeId: scope, filterType: "singleSelect", filterLabel: label, itemName: label,
        itemId: itemId, semanticInstanceKey: "",
        currentSelection: d ? sel(d, u, "cognos") : alle(), backupSelection: d ? sel(d, u, "cognos") : alle(),
        pendingSelection: { displayValue: d || "Alle" }
      };
    });
  });
  KDB.state.filters.singleSelect.instancesById = instances;
  KDB.state.filters.singleSelect.inventory = { generation: 4, freshness: "fresh" };
  const types = {};
  ["prepare", "apply", "restore", "resync"].forEach((phase) => {
    const name = { prepare: "prepareTabMutation", apply: "applyTabMutation", restore: "restoreTabMutationSnapshot", resync: "resyncTabMutationHost" }[phase];
    types[phase] = "singleSelect/" + name;
  });
  const rt = () => KDB.runtime.singleSelect;
  return {
    name: "singleSelect", api, KDB, control, types, options,
    layoutTargets: { 0: { tabId: "t0" }, 1: { tabId: "t1", pageId: "p1" } },
    targets: Object.assign({ 0: { scopeId: "s0" }, 1: { scopeId: "s1" }, 2: { scopeId: "s2" } }, options.tabCount > 3 ? { 3: { scopeId: "s3" } } : {}),
    takeLog: () => log.splice(0),
    takeConsole: () => sink.splice(0),
    runtime: () => rt(),
    view() {
      const byId = KDB.state.filters.singleSelect.instancesById;
      const stateView = Object.keys(byId).sort().map((id) => {
        const r = byId[id];
        const part = (s) => (s ? s.displayValue + "/" + (s.useValue || "") : "-");
        return id + " " + part(r.currentSelection) + " " + part(r.backupSelection) + " " + part(r.pendingSelection);
      });
      return {
        runtime: runtimeView(rt(), ["tabMutationOperationId"]),
        state: stateView,
        stateHash: hash(KDB.state.filters.singleSelect),
        host: Object.keys(store).sort().map((key) => key + "=" + store[key].map((v) => v.d + ":" + v.u).join("+")),
        reconcileCalls: copy(reconcileCalls)
      };
    },
    armPrepareThrow() { control.readThrows = true; },
    restoreSlice: (slice) => slice,
    seedSnapshot(id, runId) { rt().tabMutationSnapshots[id] = { runId: runId, operationId: id, byId: {} }; }
  };
}

// ------------------------------------------------------------------------------------------------ nativeMultiSelect

export function bootNativeMultiSelect(init) {
  const options = init || {};
  const sink = [];
  const log = [];
  const control = makeControl();
  const norm = (s) => String(s || "").replace(/_tabpanel$/, "");
  const JAHR = "[TM1].[Dim].[Jahr]";
  const LAND = "[TM1].[Dim].[Land]";
  const v = (d) => ({ d: d, u: "u_" + d });
  const item = (itemId, itemName, raw, values) => ({
    itemId, itemName, sourceId: "src_" + itemName,
    scopeType: norm(raw) === "global" ? "global" : "pageContext", scopeId: norm(raw), rawScopeId: raw, values: values
  });
  const items = [
    item(JAHR, "Jahr", "global", [v("2023")]),
    item(JAHR, "Jahr", "page0_tabpanel", [v("2019")]), item(LAND, "Land", "page0_tabpanel", [v("DE"), v("AT")]),
    item(JAHR, "Jahr", "page1_tabpanel", [v("2020")]), item(LAND, "Land", "page1_tabpanel", []),
    item(JAHR, "Jahr", "page2_tabpanel", []), item(LAND, "Land", "page2_tabpanel", [v("CH")])
  ];
  if (options.tabCount > 3) { items.push(item(JAHR, "Jahr", "page3_tabpanel", []), item(LAND, "Land", "page3_tabpanel", [])); }
  const facet = {
    listFilterItems(query) {
      readHook(control);
      if (control.readThrows) { throw new Error("list boom"); }
      const q = query || {};
      const data = q.allPageContextScopes
        ? items.filter((i) => norm(i.rawScopeId) !== "global")
        : items.filter((i) => norm(i.rawScopeId) === norm(q.scopeId));
      return { ok: true, outcome: "ok", data: copy(data) };
    },
    findFilterItem(query) {
      const q = query || {};
      const found = items.find((i) => i.itemId === q.itemId && norm(i.rawScopeId) === norm(q.scopeId));
      return found ? { ok: true, data: copy(found) } : { ok: false };
    },
    async writeFilter(request) {
      const ref = request.ref;
      const failing = beginWrite(control);
      log.push(["write", ref.itemName, ref.rawScopeId, copy(request.values)]);
      if (control.throwWrites) { throw new Error("host write crashed"); }
      if (failing) { fireOnce(control, "afterFailedWrite"); return { ok: false, errorCode: "HOST_FAIL" }; }
      const target = items.find((i) => i.itemId === ref.itemId && norm(i.rawScopeId) === norm(ref.rawScopeId));
      if (target && !control.noopWrites) { target.values = copy(request.values); }
      if (control.afterWrite) { const hook = control.afterWrite; control.afterWrite = null; hook(); }
      return { ok: true };
    }
  };
  const tabIndexes = options.tabCount > 3 ? [0, 1, 2, 3] : [0, 1, 2];
  const layoutTabs = tabIndexes.map((i) => ({ id: "page" + i + "_tabpanel", pageId: "p" + i }));
  const tabsFacet = {
    listTabs: () => {
      if (control.tabsThrow) { throw new Error("tabs boom"); }
      return { ok: true, data: control.tabsItems ? control.tabsItems() : layoutTabs };
    }
  };
  const KDB = {
    state: { filters: {} },
    properties: {
      kennzahlenTablesPropObj: { Personal_KDB: {} },
      filterPropObj: {
        Personal_KDB: {
          filterInstances: {
            f1: { scopeType: "global", itemName: "Geschlecht", itemId: "[TM1].[Dim].[Geschlecht]", isSingleSelect: true },
            f2: { scopeType: "global", itemName: "Jahr", itemId: JAHR, isNative: true },
            f3: { scopeType: "pageContext", itemName: "Jahr", itemId: JAHR, isNative: true },
            f4: { scopeType: "pageContext", itemName: "Land", itemId: LAND, isNative: true }
          }
        }
      }
    },
    services: { cognosHost: { filters: facet, tabs: tabsFacet }, history: { pushCommittedStep: () => true } },
    api: {}, runtime: {}
  };
  const register = loadAmd(path.join(FILTERS, "nativeMultiSelect/index.js"), { stubs: { console: makeConsole(sink, control), Date: FixedDate } });
  const api = register(KDB, {});
  tabIndexes.forEach((i) => {
    api.dispatch({
      type: "nativeMultiSelect/tabMutationScopeWrite",
      payload: {
        scopeId: "page" + i + "_tabpanel", clear: false,
        items: [
          { itemId: JAHR, itemName: "Jahr", sourceId: "src_Jahr", values: [v("own" + i)] },
          { itemId: LAND, itemName: "Land", sourceId: "src_Land", values: [] }
        ]
      }
    });
  });
  const types = {
    prepare: "nativeMultiSelect/prepareTabMutation", apply: "nativeMultiSelect/applyTabMutation",
    restore: "nativeMultiSelect/restoreTabMutationSnapshot", resync: "nativeMultiSelect/resyncTabMutationHost"
  };
  const rt = () => KDB.runtime.nativeMultiSelect;
  const itemText = (list) => (list || []).map((i) => i.itemName + "=" + (i.values || []).map((x) => x.d).join("+")).join(";");
  return {
    name: "nativeMultiSelect", api, KDB, control, types, options,
    layoutTargets: { 0: { tabId: "page0_tabpanel" }, 1: { pageId: "p1" }, 2: { tabId: "zzz", pageId: "p2" } },
    targets: tabIndexes.reduce((map, i) => { map[i] = { scopeId: "page" + i + "_tabpanel" }; return map; }, {}),
    takeLog: () => log.splice(0),
    takeConsole: () => sink.splice(0),
    runtime: () => rt(),
    view() {
      const byScope = (KDB.state.filters.nativeMultiSelect || {}).byScope || {};
      return {
        runtime: runtimeView(rt()),
        state: Object.keys(byScope).sort().map((scope) => scope + ": " + itemText(byScope[scope])),
        stateHash: hash(KDB.state.filters.nativeMultiSelect),
        host: items.filter((i) => i.scopeType === "pageContext").map((i) => i.rawScopeId + "/" + i.itemName + "=" + i.values.map((x) => x.d).join("+")),
        reconcileCalls: []
      };
    },
    armPrepareThrow() { control.readThrows = true; },
    restoreSlice: (slice) => slice,
    seedSnapshot(id, runId) { rt().tabMutationSnapshots[id] = { runId: runId, operationId: id, byScope: {} }; }
  };
}

// ------------------------------------------------------------------------------------------------ dienststelle

export function bootDienststelle(init) {
  const options = init || {};
  const sink = [];
  const log = [];
  const control = makeControl();
  const PAGES = options.tabCount > 3 ? ["tab0_tabpanel", "tab1_tabpanel", "tab2_tabpanel", "tab3_tabpanel"] : ["tab0_tabpanel", "tab1_tabpanel", "tab2_tabpanel"];
  const KEYS = ["Dienststelle_BW", "Dienststelle_DEZPV"];
  const itemId = (key) => "[Org_Source].[Dienststelle].[Dienststelle].[" + key + "]";
  const ok = (data) => ({ ok: true, data });
  const store = {};
  KEYS.forEach((key) => { store[key] = { global: null, pages: {} }; });
  store.Dienststelle_BW.pages.tab0_tabpanel = [{ d: "Org C", u: "[Org].&[4]" }];
  store.Dienststelle_BW.pages.tab1_tabpanel = [{ d: "Org D", u: "[Org].&[3]" }];
  store.Dienststelle_DEZPV.pages.tab2_tabpanel = [{ d: "Org E", u: "[Org].&[5]" }];
  const desc = (key, raw) => ({ itemName: key, itemId: itemId(key), rawScopeId: raw });
  const filters = {
    listFilterItems(input) {
      if (input.scopeId === "global") { return ok(KEYS.map((key) => desc(key, "global"))); }
      const all = [];
      PAGES.forEach((page) => KEYS.forEach((key) => all.push(desc(key, page))));
      if (input.allPageContextScopes) { return ok(all); }
      if (input.scopeId) { return ok(all.filter((d) => d.rawScopeId === input.scopeId)); }
      return ok([]);
    },
    listPageContextScopes: () => ok(PAGES.slice()),
    readFilterValues(ref) {
      const entry = store[ref.itemName];
      const values = ref.scopeId === "global" ? entry.global : entry.pages[ref.scopeId];
      return ok((values || []).map((x) => ({ ...x })));
    },
    writeFilter({ ref, values }) {
      const failing = beginWrite(control);
      const failedByCount = failing && !control.failWrites;
      log.push(["write", ref.itemName, ref.scopeId, copy(values)]);
      if (control.throwWrites) { return Promise.reject(new Error("write boom")); }
      if (!failing && !control.noopWrites) {
        if (ref.scopeId === "global") { store[ref.itemName].global = values; } else { store[ref.itemName].pages[ref.scopeId] = values; }
      }
      if (control.afterWrite) { const hook = control.afterWrite; control.afterWrite = null; hook(); }
      if (control.failWrites) { fireOnce(control, "afterFailedWrite"); }
      return Promise.resolve({ ok: !(control.failWrites || failedByCount), errorCode: "X" });
    },
    clearFilter(ref) {
      const failing = beginWrite(control);
      log.push(["clear", ref.itemName, ref.scopeId]);
      if (control.throwWrites) { return Promise.reject(new Error("clear boom")); }
      if (!failing && !control.noopWrites) { delete store[ref.itemName].pages[ref.scopeId]; }
      return Promise.resolve({ ok: !failing });
    }
  };
  const tabsFacet = {
    listTabs: () => {
      if (control.tabsThrow) { throw new Error("tabs boom"); }
      return ok(control.tabsItems ? control.tabsItems() : PAGES.map((p, i) => ({ index: i, id: "tab" + i, pageId: "page" + i })));
    }
  };
  const KDB = {
    config: { tables: {}, tabs: {}, dataSources: { metrics: { default: { prefix: "metrics" } } }, labels: { de: {} } },
    state: { filters: {}, tabs: { activeTabId: "tab1" } },
    runtime: { tabs: { pendingPromises: {} } },
    events: { subscribe: () => () => {} },
    services: {
      cognosHost: { filters, tabs: tabsFacet },
      tableData: { readTableState: () => ({ lifecycle: "ready" }), readRows: () => [], waitForRows: () => Promise.resolve() },
      message: { notify() {}, notifyAnchored() {} },
      history: { pushCommittedStep: () => true }
    },
    api: { sicht: { getState: () => ({ activeSichtValue: "BW" }) } }
  };
  const register = loadAmd(path.join(FILTERS, "dienststelle/index.js"), { stubs: { console: makeConsole(sink, control), Date: FixedDate } });
  const api = register(KDB, {});
  api.mount({});
  const dsState = loadAmd(path.join(FILTERS, "dienststelle/state.js"), { stubs: { console: makeConsole(sink, control), Date: FixedDate } });
  const value = (d, u) => ({ displayValue: d, useValue: u, source: "user", hostDisplay: d });
  const seed = (key, scope, entry) => {
    KDB.state.filters.dienststelle = dsState.reduceDienststelle(KDB.state.filters.dienststelle, {
      type: dsState.ACTIONS.TAB_MUTATION_SCOPE_WRITE,
      payload: { filterKey: key, scopeId: scope, entry: entry, clear: false, timestamp: FIXED }
    });
  };
  seed("Dienststelle_BW", "tab0_tabpanel", { currentValues: [value("Org C", "[Org].&[4]")] });
  seed("Dienststelle_BW", "tab1_tabpanel", { currentValues: [value("Org D", "[Org].&[3]")], lastConfirmedAt: 5 });
  seed("Dienststelle_DEZPV", "tab2_tabpanel", { currentValues: [value("Org E", "[Org].&[5]")] });
  const types = {
    prepare: "dienststelle/prepareTabMutation", apply: "dienststelle/applyTabMutation",
    restore: "dienststelle/restoreTabMutationSnapshot", resync: "dienststelle/resyncTabMutationHost"
  };
  const rt = () => KDB.runtime.dienststelle;
  const texts = (list) => (list || []).map((x) => x.displayValue + "/" + x.useValue).join("+");
  return {
    name: "dienststelle", api, KDB, control, types, options,
    layoutTargets: { 0: { tabId: "tab0" }, 1: { pageId: "page1" }, 2: { tabId: "zzz", pageId: "page2" } },
    targets: PAGES.reduce((map, p, i) => { map[i] = { scopeId: p }; return map; }, {}),
    takeLog: () => log.splice(0),
    takeConsole: () => sink.splice(0),
    runtime: () => rt(),
    view() {
      const byFilter = KDB.state.filters.dienststelle.byFilter;
      const pages = [];
      Object.keys(byFilter).sort().forEach((key) => {
        const page = byFilter[key].currentSelectionByScope.pageContext;
        Object.keys(page).sort().forEach((scope) => {
          const e = page[scope];
          pages.push(key + "@" + scope + " cur=" + texts(e.currentValues) + " bak=" + texts(e.backupValues) + " at=" + e.lastConfirmedAt);
        });
      });
      const hostPages = [];
      KEYS.forEach((key) => Object.keys(store[key].pages).sort().forEach((scope) => {
        hostPages.push(key + "@" + scope + "=" + store[key].pages[scope].map((x) => x.d).join("+"));
      }));
      return {
        runtime: runtimeView(rt()),
        state: pages,
        stateHash: hash(KDB.state.filters.dienststelle),
        host: hostPages,
        reconcileCalls: []
      };
    },
    armPrepareThrow() {
      const root = KDB.state.filters.dienststelle;
      const real = root.byFilter;
      let armed = true;
      Object.defineProperty(root, "byFilter", {
        configurable: true,
        get() {
          if (armed) { armed = false; throw new Error("state boom"); }
          return real;
        }
      });
    },
    restoreSlice: (slice) => slice,
    seedSnapshot(id, runId) { rt().tabMutationSnapshots[id] = { runId: runId, operationId: id, byScope: {} }; }
  };
}

export const OWNER_BOOTS = {
  singleSelect: bootSingleSelect,
  nativeMultiSelect: bootNativeMultiSelect,
  dienststelle: bootDienststelle
};
