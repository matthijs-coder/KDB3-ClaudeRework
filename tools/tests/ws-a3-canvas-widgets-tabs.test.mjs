// Golden test: canvas, widgets and tabs facets of the cognosHost service (ops x host modes x signal states).
// Recorded against the pre-refactor code; the snapshots must stay identical across the A3 refactor.
// Run: node --test tools/tests/ws-a3-canvas-widgets-tabs.test.mjs   (UPDATE_SNAPSHOTS=1 rewrites the fixtures)
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, jsonSafe, runCase, checkSnapshot } from "./ws-a3-helpers.mjs";

function canvasItem(id, type, containerId, parentId, { throwsId } = {}) {
  return {
    getId: () => {
      if (throwsId) throw new Error("id");
      return id;
    },
    getType: () => type,
    getContainer: () =>
      containerId == null
        ? null
        : { getId: () => containerId, getContainer: () => (parentId == null ? null : { getId: () => parentId }) }
  };
}

function buildHost(mode, log, onEffect) {
  if (mode === "none") return {};
  const rec = (name, impl) =>
    function (...args) {
      log.push([name, ...args.map(jsonSafe)]);
      onEffect();
      if (mode === "throw") throw new Error("boom");
      return impl ? impl.apply(this, args) : undefined;
    };
  if (mode === "nocap") return { widgets: {}, canvas: {}, async: {}, tabs: {}, visualization: {} };
  const settle = (value) => () => (mode === "asyncReject" ? Promise.reject(new Error("late")) : Promise.resolve(value));
  const content = { setPropertyValue: rec("content.setPropertyValue", settle(null)) };
  const layout = [
    { id: "t1", items: [{ id: "p1" }, { id: "p1b" }] },
    { id: "t2", items: [] },
    { id: "", items: [] },
    { id: "t3" }
  ];
  const tabsContainers = () => (mode === "layoutNotArray" ? {} : mode === "tabsNull" ? null : layout);
  const props = { pageSizeWidth: mode === "alreadySet" ? "800px" : "100px", pageSizeHeight: "50px" };
  const canvasItems = [
    canvasItem("w1", "widget.live", "p1", "t1"),
    canvasItem("w2", "widget.text", "orphan", "tChain"),
    canvasItem("", "widget.live", "p1"),
    canvasItem("w3", null, null, null),
    canvasItem("w4", "widget.live", "t2", null, { throwsId: true })
  ];
  return {
    widgets: {
      getContent: rec("widgets.getContent", () => (mode === "noContent" ? null : content)),
      getType: rec("widgets.getType", () => "live"),
      renderWidget: rec("renderWidget", settle(null)),
      setLayoutPosition: rec("setLayoutPosition", settle(null)),
      enterWidgetFocusMode: rec("enterWidgetFocusMode", () => mode !== "focusFalse"),
      exitWidgetFocusMode: rec("exitWidgetFocusMode", () => mode !== "focusFalse")
    },
    canvas: {
      findCanvasContent: rec("findCanvasContent", () => (mode === "contentItems" ? { items: canvasItems } : mode === "contentChildren" ? { children: canvasItems } : mode === "contentOdd" ? 5 : canvasItems)),
      getCanvasWhenReady: rec("canvas.getCanvasWhenReady", settle(null)),
      getCanvasPropertiesList: rec("getCanvasPropertiesList", () => (mode === "noProp" ? ["other"] : ["pageSizeWidth", "pageSizeHeight"])),
      getCanvasPropertyValue: rec("getCanvasPropertyValue", (name) => props[name]),
      setCanvasPropertyValue: rec("setCanvasPropertyValue")
    },
    async: {
      whenRenderStart: rec("whenRenderStart", settle(null)),
      whenRenderComplete: rec("whenRenderComplete", settle(null)),
      getCanvasWhenReady: rec("async.getCanvasWhenReady", settle(null)),
      getWidgetWhenReady: rec("getWidgetWhenReady", settle(null))
    },
    tabs: {
      getTabsContainers: rec("getTabsContainers", tabsContainers),
      getTabName: rec("getTabName", (id) => {
        if (mode === "tabNamePromise") return Promise.resolve("p");
        if (mode === "tabNameObject") return { label: "Lbl:" + id };
        if (mode === "tabNameNumber") return 7;
        return "Tab " + id;
      }),
      setTabName: rec("setTabName", (id, name) => {
        if (mode === "abortError") return Promise.reject(Object.assign(new Error("x"), { name: "AbortError" }));
        if (mode === "asyncReject") return Promise.reject(new Error("late"));
        if (mode === "tabNameObject") return Promise.resolve({ text: name + "!" });
        return Promise.resolve(name);
      })
    },
    visualization: {
      getVisType: rec("getVisType", () => "bar"),
      getVisTitle: rec("getVisTitle", () => (mode === "throwTitle" ? (() => { throw new Error("t"); })() : "Title"))
    }
  };
}

const COMMON_MODES = ["ok", "throw", "none", "nocap", "asyncReject"];

const OPS = {
  widgets: [
    ["hasContent", ["w1"], [[""], [null]], [...COMMON_MODES, "noContent"]],
    ["setWidgetProperty", ["w1", "color", "red"], [["", "color"], ["w1", ""]], [...COMMON_MODES, "noContent"]],
    ["setWidgetLayout", ["w1", { left: 1, top: 2, width: 3, height: 4, extra: 5 }], [[""]], COMMON_MODES],
    ["renderWidget", ["w1"], [[""]], COMMON_MODES],
    ["enterFocusMode", ["w1"], [[""]], [...COMMON_MODES, "focusFalse"]],
    ["exitFocusMode", ["w1"], [[""]], [...COMMON_MODES, "focusFalse"]]
  ],
  canvas: [
    ["listCanvasWidgets", [], [], [...COMMON_MODES, "contentItems", "contentChildren", "contentOdd", "layoutNotArray", "tabsNull"]],
    ["listCanvasWidgets", [{ waitUntilReady: true }], [], COMMON_MODES],
    ["setCanvasPageSize", ["width", "800px"], [["depth", "800px"], ["width", "800"], ["height", 5]], [...COMMON_MODES, "alreadySet", "noProp"]],
    ["whenRenderStart", ["w1"], [[""]], COMMON_MODES],
    ["whenRenderComplete", ["w1"], [[""]], COMMON_MODES],
    ["whenCanvasReady", [], [], COMMON_MODES],
    ["whenWidgetReady", ["w1"], [[""]], COMMON_MODES]
  ],
  tabs: [
    ["listTabs", [], [], [...COMMON_MODES, "layoutNotArray", "tabsNull"]],
    ["getTabName", ["t1"], [[""], [{}], [5]], [...COMMON_MODES, "tabNamePromise", "tabNameObject", "tabNameNumber"]],
    ["getTabName", [{ pageId: "p1" }], [], ["ok"]],
    ["setTabName", ["t1", "New"], [["", "New"], ["t1", ""], ["t1", 4]], [...COMMON_MODES, "abortError", "tabNameObject"]]
  ]
};

// Ops that take trailing options (signal); the last declared argument slot is the options object.
const OPTION_SLOT = {
  "widgets.setWidgetProperty": 3, "widgets.setWidgetLayout": 2, "widgets.renderWidget": 1,
  "canvas.listCanvasWidgets": 0, "canvas.whenRenderStart": 1, "canvas.whenRenderComplete": 1, "canvas.whenCanvasReady": 0,
  "canvas.whenWidgetReady": 1, "tabs.listTabs": 0, "tabs.setTabName": 2
};

function invoker(facet, op, args) {
  const slot = OPTION_SLOT[`${facet}.${op}`];
  return (svc, options) => {
    const callArgs = args.slice();
    if (slot !== undefined) {
      if (slot === 0 && callArgs[0] && typeof callArgs[0] === "object") {
        callArgs[0] = { ...callArgs[0], ...(options || {}) };
      } else {
        while (callArgs.length < slot) callArgs.push(undefined);
        callArgs[slot] = options;
      }
    }
    return svc[facet][op](...callArgs);
  };
}

for (const facet of Object.keys(OPS)) {
  test(`${facet}: outcomes, host calls and logs stay recorded`, async () => {
    const snapshot = {};
    for (const [op, valid, invalids, modes] of OPS[facet]) {
      const label = op + (op === "listCanvasWidgets" && valid.length ? "+wait" : "") + (op === "getTabName" && valid[0] && valid[0].pageId ? "+ref" : "");
      for (const mode of modes) {
        snapshot[`${label}|valid|${mode}`] = await runCase(buildHost, mode, "none", invoker(facet, op, valid));
      }
      for (const kind of ["aborted", "during"]) {
        if (OPTION_SLOT[`${facet}.${op}`] !== undefined) {
          snapshot[`${label}|valid|ok|${kind}`] = await runCase(buildHost, "ok", kind, invoker(facet, op, valid));
        }
      }
      for (let index = 0; index < invalids.length; index += 1) {
        snapshot[`${label}|invalid${index}`] = await runCase(buildHost, "ok", "none", invoker(facet, op, invalids[index]));
      }
      snapshot[`${label}|disposed`] = await runCase(buildHost, "ok", "none", invoker(facet, op, valid), { dispose: true });
    }
    checkSnapshot(`ws-a3-${facet}.json`, snapshot);
  });
}

function fakeSignal() {
  const listeners = new Set();
  return {
    aborted: false,
    addEventListener(type, fn) {
      assert.equal(type, "abort");
      listeners.add(fn);
    },
    removeEventListener(type, fn) {
      listeners.delete(fn);
    },
    abort() {
      this.aborted = true;
      [...listeners].forEach((fn) => fn());
    },
    count: () => listeners.size
  };
}

test("canvas waits: never-settling host is released by abort, listener count returns to 0", async () => {
  for (const [op, args] of [["whenRenderStart", ["w1"]], ["whenRenderComplete", ["w1"]], ["whenCanvasReady", []], ["whenWidgetReady", ["w1"]]]) {
    const never = new Promise(() => {});
    const { svc } = create({
      async: {
        whenRenderStart: () => never,
        whenRenderComplete: () => never,
        getCanvasWhenReady: () => never,
        getWidgetWhenReady: () => never
      }
    });
    const signal = fakeSignal();
    const pending = svc.canvas[op](...args, { signal });
    assert.equal(signal.count(), 1, op);
    signal.abort();
    assert.deepEqual(await pending, { ok: false, outcome: "aborted", reason: "aborted" }, op);
    assert.equal(signal.count(), 0, op);
  }
});

test("canvas waits: budget applies to ready waits only; render waits have no budget", async () => {
  const never = new Promise(() => {});
  const { svc } = create({
    async: { whenRenderStart: () => never, whenRenderComplete: () => never, getCanvasWhenReady: () => never, getWidgetWhenReady: () => never }
  });
  const timedOut = { ok: false, outcome: "failed", errorCode: "CANVAS_WAIT_TIMEOUT", diagnostics: [{ code: "CANVAS_WAIT_TIMEOUT", message: "budgetMs elapsed" }] };
  assert.deepEqual(await svc.canvas.whenCanvasReady({ budgetMs: 10 }), timedOut);
  assert.deepEqual(await svc.canvas.whenWidgetReady("w1", { budgetMs: 10 }), timedOut);
  const signal = fakeSignal();
  const render = svc.canvas.whenRenderStart("w1", { signal, budgetMs: 10 });
  const state = await Promise.race([render.then(() => "settled"), new Promise((resolve) => setTimeout(() => resolve("pending"), 60))]);
  assert.equal(state, "pending");
  signal.abort();
  assert.equal((await render).reason, "aborted");
});

test("canvas waits: host resolving after destroy reports disposed; late rejection is swallowed", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { svc } = create({ async: { whenRenderComplete: () => gate, getCanvasWhenReady: () => Promise.reject(new Error("late")) } });
  const pending = svc.canvas.whenRenderComplete("w1");
  svc.destroy();
  release();
  assert.deepEqual(await pending, { ok: false, outcome: "aborted", reason: "disposed" });
  const saved = console.error;
  console.error = () => {};
  try {
    const outcome = await create({ async: { getCanvasWhenReady: () => Promise.reject(new Error("late")) } }).svc.canvas.whenCanvasReady();
    assert.equal(outcome.errorCode, "CANVAS_WAIT_FAILED");
  } finally {
    console.error = saved;
  }
});

test("flattened descriptors: listCanvasWidgets and listTabs only expose scalars", () => {
  const log = [];
  const host = buildHost("ok", log, () => {});
  const { svc } = create(host);
  const canvas = svc.canvas.listCanvasWidgets();
  assert.equal(canvas.ok, true);
  assert.deepEqual(canvas.data, [
    { widgetId: "w1", tabId: "t1", containerId: "p1", widgetType: "live", contentType: "widget.live", isLiveWidget: true, visType: "bar", visTitle: "Title" },
    { widgetId: "w2", tabId: "tChain", containerId: "orphan", widgetType: "live", contentType: "widget.text", isLiveWidget: false, visType: "bar", visTitle: "Title" },
    { widgetId: "w3", tabId: null, containerId: null, widgetType: "live", contentType: null, isLiveWidget: false, visType: "bar", visTitle: "Title" }
  ]);
  const tabs = svc.tabs.listTabs({});
  assert.deepEqual(tabs, {
    ok: true,
    outcome: "ok",
    data: [
      { id: "t1", tabId: "t1", pageId: "p1", index: 0, scopeId: "t1", hasContent: true },
      { id: "t2", tabId: "t2", pageId: "t2", index: 1, scopeId: "t2", hasContent: false },
      { id: "t3", tabId: "t3", pageId: "t3", index: 3, scopeId: "t3", hasContent: false }
    ]
  });
});

test("canvas tab canonicalisation caches the layout per _KDB instance", () => {
  let reads = 0;
  const host = buildHost("ok", [], () => {});
  const getTabsContainers = host.tabs.getTabsContainers;
  host.tabs.getTabsContainers = () => {
    reads += 1;
    return getTabsContainers();
  };
  const { svc } = create(host);
  svc.canvas.listCanvasWidgets();
  svc.canvas.listCanvasWidgets();
  assert.equal(reads, 1);
});

const SYNC_OPS = {
  widgets: [["hasContent", ["w1"]], ["enterFocusMode", ["w1"]], ["exitFocusMode", ["w1"]]],
  canvas: [["listCanvasWidgets", []], ["setCanvasPageSize", ["width", "800px"]]],
  tabs: [["listTabs", []], ["getTabName", ["t1"]]],
  visualization: [["getVisType", ["w1"]], ["getVisTitle", ["w1"]], ["getSelections", ["w1"]]]
};
const ASYNC_OPS = {
  widgets: [["setWidgetProperty", ["w1", "k", "v"]], ["setWidgetLayout", ["w1", {}]], ["renderWidget", ["w1"]]],
  canvas: [["whenRenderStart", ["w1"]], ["whenRenderComplete", ["w1"]], ["whenCanvasReady", []], ["whenWidgetReady", ["w1"]]],
  tabs: [["setTabName", ["t1", "n"]]],
  visualization: [
    ["setVisType", ["w1", "bar"]], ["setVisTitle", ["w1", "T"]], ["setContentProperty", ["w1", "k", "v"]], ["setDataSource", ["w1", "d"]],
    ["clearAllSlots", ["w1"]], ["addDataItemsToSlot", ["w1", "s", ["a"]]], ["setTopBottomOnSlot", ["w1", "s", { value: 1 }]],
    ["sortDataItemInSlot", ["w1", "s", "c", "ascending"]], ["setCustomLabelInSlot", ["w1", "s", "c", "L"]], ["clearAllLocalFilters", ["w1"]],
    ["addOrReplaceLocalFilter", ["w1", "f", {}]], ["removeLocalFilter", ["w1", "f"]]
  ]
};

test("sync ops return an Outcome, async ops return a promise (also for early exits)", () => {
  const saved = console.error;
  console.error = () => {};
  try {
    for (const dispose of [false, true]) {
      const { svc } = create(buildHost("ok", [], () => {}));
      if (dispose) svc.destroy();
      for (const [facet, ops] of Object.entries(SYNC_OPS)) {
        for (const [op, args] of ops) {
          const result = svc[facet][op](...args);
          assert.equal(typeof (result && result.then), "undefined", `${facet}.${op} stays synchronous`);
          assert.equal(typeof result.ok, "boolean", `${facet}.${op}`);
        }
      }
      for (const [facet, ops] of Object.entries(ASYNC_OPS)) {
        for (const [op, args] of ops) {
          const pending = svc[facet][op](...args);
          assert.equal(typeof pending.then, "function", `${facet}.${op} returns a promise`);
          pending.catch(() => {});
        }
      }
    }
  } finally {
    console.error = saved;
  }
});
