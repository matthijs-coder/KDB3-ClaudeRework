// Golden test: visualization facet of the cognosHost service (ops x host modes x signal states).
// Recorded against the pre-refactor code; the snapshot must stay identical across the A3 refactor.
// Run: node --test tools/tests/ws-a3-visualization.test.mjs   (UPDATE_SNAPSHOTS=1 rewrites the fixture)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { create, jsonSafe, runCase, checkSnapshot } from "./ws-a3-helpers.mjs";

const FLATTEN = path.join(JS_ROOT, "core/services/cognosHost/facets/visualization/selections.js");

function buildHost(mode, log, onEffect) {
  if (mode === "none") return {};
  const rec = (name, impl) =>
    function (...args) {
      log.push([name, ...args.map(jsonSafe)]);
      onEffect();
      if (mode === "throw") throw new Error("boom");
      return impl ? impl.apply(this, args) : undefined;
    };
  if (mode === "nocap") return { visualization: {}, widgets: {}, canvas: {} };
  const item = {
    getColumnId: () => "c1",
    getId: () => "i1",
    setTopBottom: rec("item.setTopBottom"),
    setSort: rec("item.setSort")
  };
  const slot = {
    getId: () => "s1",
    getDataItemList: () => (mode === "noItems" ? [] : [item]),
    addDataItems: rec("slot.addDataItems")
  };
  const slots =
    mode === "slotsEmpty"
      ? {}
      : {
          getSlot: rec("slots.getSlot", () => (mode === "slotNull" ? null : slot)),
          getSlotList: rec("slots.getSlotList", () => (mode === "slotNull" ? [] : [slot])),
          clearAllSlots: rec("slots.clearAllSlots")
        };
  const filterList = mode === "filtersEmpty" ? [] : [{ columnId: "f1" }, { itemId: "f2" }, {}];
  const localFilters =
    mode === "localNoAdd"
      ? { getFilterList: () => [] }
      : {
          getFilterList: rec("lf.getFilterList", () => filterList),
          removeFilter: rec("lf.removeFilter"),
          addFilter: rec("lf.addFilter")
        };
  const async = (value) => () => (mode === "asyncReject" ? Promise.reject(new Error("late")) : Promise.resolve(value));
  const content = {
    getSelections: rec("content.getSelections", () => [{ categories: [{ columnId: "c", label: "L", value: "v", extra: 1 }] }])
  };
  return {
    visualization: {
      getVisType: rec("getVisType", () => "bar"),
      getVisTitle: rec("getVisTitle", () => "Title"),
      setVisType: rec("setVisType", async(null)),
      setVisTitle: rec("setVisTitle", async(null)),
      setContentPropertyValue: rec("setContentPropertyValue", async(null)),
      setVizDataSource: rec("setVizDataSource", async(null)),
      getSlots: rec("getSlots", () => slots),
      setCustomLabel: rec("setCustomLabel", () => {
        if (mode === "labelNotFound") throw new Error("ITEM_NOT_FOUND");
        if (mode === "labelCap") throw new Error("HOST_CAPABILITY_MISSING");
        return Promise.resolve();
      }),
      getLocalFilters: rec("getLocalFilters", () => localFilters),
      removeLocalFilter: rec("removeLocalFilter", async(null))
    },
    widgets: { getContent: rec("widgets.getContent", () => content) },
    canvas: { getCanvasFeature: rec("canvas.getCanvasFeature", () => ({ getContent: () => null })) }
  };
}

const MODES = [
  "ok", "throw", "none", "nocap", "asyncReject", "slotsEmpty", "slotNull", "noItems", "filtersEmpty", "localNoAdd", "labelNotFound", "labelCap"
];

// [op, valid args (options appended), invalid argument sets (options appended)]
const WRITES = [
  ["setVisType", ["w1", "bar"], [["", "bar"], ["w1", ""], ["w1", null]]],
  ["setVisTitle", ["w1", "T"], [["w1", ""], ["w1", 5]]],
  ["setContentProperty", ["w1", "k", "v"], [["w1", ""], [7, "k"]]],
  ["setDataSource", ["w1", "ds"], [["w1", ""]]],
  ["clearAllSlots", ["w1"], [[""]]],
  ["addDataItemsToSlot", ["w1", "s1", ["a", "", "b"]], [["w1", ""], ["w1", "s1", []]]],
  ["setTopBottomOnSlot", ["w1", "s1", { value: 3, valueItemId: "c1", rank: true }], [["w1", "s1", { value: 0 }], ["w1", "", {}], ["w1", "s1", { value: 2, targetColumnId: "zz" }]]],
  ["sortDataItemInSlot", ["w1", "s1", "c1", "descending"], [["w1", "s1", ""], ["w1", "s1", "c1", "bogus-"]]],
  ["setCustomLabelInSlot", ["w1", "s1", "c1", "Label"], [["w1", "s1", "c1", ""], ["w1", "", "c1", "L"]]],
  ["clearAllLocalFilters", ["w1"], [[""]]],
  ["addOrReplaceLocalFilter", ["w1", "f1", { values: [1] }, { skipDisplayType: true }], [["w1", " ", {}], ["w1", "f1", null]]],
  ["removeLocalFilter", ["w1", { itemId: "f1" }], [["w1", null], ["w1", "f1"]]]
];
const READS = [
  ["getVisType", ["w1"], [[""]]],
  ["getVisTitle", ["w1"], [[""]]]
];

function withOptions(args, options, arity) {
  const copy = args.slice();
  while (copy.length < arity) copy.push(undefined);
  copy.push(options);
  return copy;
}

test("write and read ops: outcomes, host calls and logs stay recorded", async () => {
  const snapshot = {};
  for (const [op, valid, invalids] of WRITES) {
    const arity = valid.length;
    for (const mode of MODES) {
      const entry = await runCase(buildHost, mode, "none", (svc, options) => svc.visualization[op](...withOptions(valid, options, arity)));
      snapshot[`${op}|valid|${mode}`] = entry;
    }
    for (const kind of ["aborted", "during"]) {
      snapshot[`${op}|valid|ok|${kind}`] = await runCase(buildHost, "ok", kind, (svc, options) => svc.visualization[op](...withOptions(valid, options, arity)));
    }
    snapshot[`${op}|valid|none|aborted`] = await runCase(buildHost, "none", "aborted", (svc, options) => svc.visualization[op](...withOptions(valid, options, arity)));
    for (let index = 0; index < invalids.length; index += 1) {
      snapshot[`${op}|invalid${index}`] = await runCase(buildHost, "ok", "none", (svc, options) => svc.visualization[op](...withOptions(invalids[index], options, arity)));
    }
    snapshot[`${op}|disposed`] = await runCase(buildHost, "ok", "none", (svc, options) => svc.visualization[op](...withOptions(valid, options, arity)), { dispose: true });
  }
  for (const [op, valid, invalids] of READS) {
    for (const mode of MODES) {
      snapshot[`${op}|valid|${mode}`] = await runCase(buildHost, mode, "none", (svc) => svc.visualization[op](...valid));
    }
    snapshot[`${op}|invalid`] = await runCase(buildHost, "ok", "none", (svc) => svc.visualization[op](...invalids[0]));
    snapshot[`${op}|disposed`] = await runCase(buildHost, "ok", "none", (svc) => svc.visualization[op](...valid), { dispose: true });
  }
  checkSnapshot("ws-a3-visualization.json", snapshot);
});

test("getSelections: canvas feature first, widgets content second, last-DTO fallback", async () => {
  const snapshot = {};
  const selections = [{ categories: [{ columnId: "c", label: "L", value: "v", extra: 1 }, null, { name: "n" }] }];
  const variants = {
    canvasFeature: (log) => ({
      canvas: { getCanvasFeature: () => ({ getContent: () => ({ getSelections: () => selections }) }) },
      widgets: { getContent: () => ({ getSelections: () => { log.push("widgets-used"); return []; } }) }
    }),
    widgetsOnly: () => ({ widgets: { getContent: () => ({ getSelections: () => selections }) } }),
    widgetsContentWithoutGetSelections: () => ({
      canvas: { getCanvasFeature: () => ({ getContent: () => ({}) }) },
      widgets: { getContent: () => ({}) }
    }),
    promise: () => ({ widgets: { getContent: () => ({ getSelections: () => Promise.resolve(selections) }) } }),
    empty: () => ({ widgets: { getContent: () => ({ getSelections: () => [] }) } }),
    nullResult: () => ({ widgets: { getContent: () => ({ getSelections: () => null }) } }),
    throwing: () => ({ widgets: { getContent: () => ({ getSelections: () => { throw new Error("boom"); } }) } }),
    canvasThrows: () => ({ canvas: { getCanvasFeature: () => { throw new Error("feature"); } }, widgets: {} }),
    canvasWithoutMethod: () => ({ canvas: {}, widgets: { getContent: () => ({ getSelections: () => selections }) } }),
    noThemes: () => ({}),
    noContent: () => ({ canvas: {}, widgets: {} })
  };
  for (const [name, factory] of Object.entries(variants)) {
    const log = [];
    const { svc } = create(factory(log));
    const saved = console.error;
    const errors = [];
    console.error = (tag) => errors.push(String(tag));
    try {
      snapshot[name] = { first: jsonSafe(svc.visualization.getSelections("w1")), log, errors };
      snapshot[name + "|invalid"] = jsonSafe(svc.visualization.getSelections(""));
    } finally {
      console.error = saved;
    }
  }
  checkSnapshot("ws-a3-visualization-selections.json", snapshot);
});

test("flattenSelectionCategories on recorded host shapes", () => {
  const flatten = loadAmd(FLATTEN).flattenSelectionCategories;
  assert.deepEqual(flatten(null), []);
  assert.deepEqual(flatten(undefined), []);
  assert.deepEqual(flatten([]), []);
  assert.deepEqual(flatten("x"), []);
  assert.deepEqual(flatten([{ categories: "nope" }]), []);
  assert.deepEqual(flatten({ categories: [{ columnId: "c1", label: "L", dataItemId: "d", name: "n", value: 0, extra: 1 }] }), [
    { columnId: "c1", label: "L", dataItemId: "d", name: "n", value: 0 }
  ]);
  assert.deepEqual(flatten([{ categories: [null, 3, { value: undefined, label: "x" }, {}] }, { categories: [{ label: "ignored" }] }]), [
    { label: "x" },
    {}
  ]);
});

function eventHost() {
  const handlers = [];
  const content = {
    on(name, fn) {
      handlers.push(fn);
      return { off() {} };
    },
    off(name, fn) {
      const index = handlers.indexOf(fn);
      if (index !== -1) handlers.splice(index, 1);
    }
  };
  return { handlers, host: { widgets: { getContent: () => content } } };
}

const SELECT_EVENT = { name: "change:selections:select", info: { value: [{ categories: [{ columnId: "c", label: "L", value: "v" }] }] } };

test("subscribeSelections: callbacks, replace per widget, last DTO memory", () => {
  const { handlers, host } = eventHost();
  const { _KDB, svc } = create(host);
  const received = [];
  const unsubscribe = svc.visualization.subscribeSelections("w1", (dto) => received.push(dto));
  assert.equal(handlers.length, 1);
  handlers[0](SELECT_EVENT);
  handlers[0]({ name: "other" });
  assert.deepEqual(received, [{ kind: "select", widgetId: "w1", categories: [{ columnId: "c", label: "L", value: "v" }] }]);
  assert.deepEqual(_KDB.runtime.cognosHostService.adapters.lastSelectionDtoByWidgetId.w1, {
    widgetId: "w1",
    categories: [{ columnId: "c", label: "L", value: "v" }]
  });
  assert.deepEqual(svc.visualization.getSelections("w1"), {
    ok: true,
    outcome: "ok",
    data: { widgetId: "w1", categories: [{ columnId: "c", label: "L", value: "v" }] }
  });
  const second = [];
  const replacement = svc.visualization.subscribeSelections("w1", (dto) => second.push(dto));
  assert.equal(handlers.length, 1, "previous host listener released on replace");
  handlers[0]({ name: "change:selections:clearAll", info: { value: null } });
  assert.equal(received.length, 1);
  assert.equal(second.length, 1);
  assert.equal(_KDB.runtime.cognosHostService.adapters.lastSelectionDtoByWidgetId.w1, undefined, "clearAll forgets the DTO");
  unsubscribe();
  replacement();
  replacement();
  assert.equal(handlers.length, 0);
  assert.deepEqual(_KDB.runtime.cognosHostService.adapters.selectionUnsubscribeByWidgetId, {});
});

test("subscribeSelections: invalid input and missing host return a no-op unsubscribe", () => {
  const { svc } = create({});
  for (const args of [["w1", null], ["", () => {}], ["w1", () => {}]]) {
    const unsubscribe = svc.visualization.subscribeSelections(...args);
    assert.equal(typeof unsubscribe, "function");
    assert.equal(unsubscribe(), undefined);
  }
  svc.destroy();
  assert.equal(typeof svc.visualization.subscribeSelections("w1", () => {}), "function");
});

test("subscribeSelections: runtime.subscriptions returns to baseline after unsubscribe and replace (P1)", () => {
  const { handlers, host } = eventHost();
  const { _KDB, svc } = create(host);
  const baseline = _KDB.runtime.cognosHostService.subscriptions.length;
  const unsubscribes = [];
  for (let index = 0; index < 3; index += 1) {
    unsubscribes.push(svc.visualization.subscribeSelections("w" + index, () => {}));
  }
  assert.equal(_KDB.runtime.cognosHostService.subscriptions.length, baseline + 3);
  unsubscribes.forEach((unsubscribe) => unsubscribe());
  assert.equal(handlers.length, 0);
  assert.equal(_KDB.runtime.cognosHostService.subscriptions.length, baseline);
  for (let index = 0; index < 5; index += 1) {
    svc.visualization.subscribeSelections("same", () => {});
  }
  assert.equal(_KDB.runtime.cognosHostService.subscriptions.length, baseline + 1, "replace releases the previous closure");
  assert.equal(handlers.length, 1);
  svc.destroy();
  assert.deepEqual(_KDB.runtime.cognosHostService.subscriptions, []);
  assert.equal(handlers.length, 0);
});

test("unsubscribing after destroy does not recreate or touch the runtime", () => {
  const { handlers, host } = eventHost();
  const { _KDB, svc } = create(host);
  const unsubscribe = svc.visualization.subscribeSelections("w1", () => {});
  svc.destroy();
  const after = _KDB.runtime.cognosHostService;
  unsubscribe();
  assert.equal(_KDB.runtime.cognosHostService, after);
  assert.deepEqual(after.subscriptions, []);
  assert.equal(handlers.length, 0);
});

test("destroy releases live selection subscriptions", () => {
  const { handlers, host } = eventHost();
  const { svc } = create(host);
  svc.visualization.subscribeSelections("w1", () => {});
  svc.visualization.subscribeSelections("w2", () => {});
  assert.equal(handlers.length, 2);
  svc.destroy();
  assert.equal(handlers.length, 0);
});
