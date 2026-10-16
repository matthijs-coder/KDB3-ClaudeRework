// Golden test for the launchpad tab-descriptor builder
// (_____________KDB3API/KDB3/js/dashboard/launchpad/buildLaunchpadTabs.js).
// Run: node --test tools/tests/launchpad-tabs.test.mjs   (Node >= 22, no dependencies)
//
// Contract under test: build(_KDB, options) -> { helperTabIds, helperTabPageId, tabs }.
// Source priority for `tabs`: tabs state snapshot -> config + layout items -> canvas facet.
// Source priority for the helper tab: snapshot.helperTab -> config entries with role "helper".
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const TARGET = path.join(JS_ROOT, "dashboard/launchpad/buildLaunchpadTabs.js");

const logged = [];
const quietConsole = {
  log() {}, info() {}, warn() {},
  error(...args) { logged.push(args); }
};
const build = loadAmd(TARGET, { stubs: { console: quietConsole } });

const tab = (tabId, corTabIndex, childIndex = corTabIndex, aliases = [tabId], pageId = tabId) =>
  ({ tabId, pageId, aliases, corTabIndex, childIndex });
const run = (options, _KDB = {}) => build(_KDB, options);
const layout = (...ids) => ids.map((id) => ({ id }));
const facetsKDB = ({ tabs, canvas } = {}) => ({
  runtime: { launchpad: { tabsFacet: tabs || null, canvasFacet: canvas || null } }
});

test("empty inputs: no sources at all", () => {
  assert.deepStrictEqual(run(undefined), { helperTabIds: [], helperTabPageId: null, tabs: [] });
  assert.deepStrictEqual(run({}), { helperTabIds: [], helperTabPageId: null, tabs: [] });
  assert.deepStrictEqual(build({}, {}), { helperTabIds: [], helperTabPageId: null, tabs: [] });
  assert.deepStrictEqual(build(undefined, {}), { helperTabIds: [], helperTabPageId: null, tabs: [] });
});

test("empty inputs: empty config, snapshot and layout", () => {
  assert.deepStrictEqual(
    run({ tabsConfig: [], tabsSnapshot: {}, layoutItems: [] }),
    { helperTabIds: [], helperTabPageId: null, tabs: [] }
  );
  assert.deepStrictEqual(
    run({ tabsConfig: {}, tabsSnapshot: { byIndex: {} }, layoutItems: "not-an-array" }),
    { helperTabIds: [], helperTabPageId: null, tabs: [] }
  );
});

test("tabs state: byIndex without presentationOrder is sorted numerically", () => {
  const tabsSnapshot = {
    byIndex: {
      10: { tabId: "t10", corTabIndex: 10 },
      2: { tabId: "t2", corTabIndex: 2 },
      9: { tabId: "t9", corTabIndex: 9 }
    }
  };
  assert.deepStrictEqual(run({ tabsSnapshot }).tabs, [
    tab("t2", 2, 2),
    tab("t9", 9, 9),
    tab("t10", 10, 10)
  ]);
});

test("tabs state: presentationOrder wins and keeps its order", () => {
  const tabsSnapshot = {
    presentationOrder: ["2", "0", "1"],
    byIndex: {
      0: { tabId: "a", corTabIndex: 0 },
      1: { tabId: "b", corTabIndex: 1 },
      2: { tabId: "c", corTabIndex: 2 }
    }
  };
  assert.deepStrictEqual(run({ tabsSnapshot }).tabs, [
    tab("c", 2, 2),
    tab("a", 0, 0),
    tab("b", 1, 1)
  ]);
});

test("tabs state: descriptor field fallbacks (index, page, id, generated id)", () => {
  const tabsSnapshot = {
    presentationOrder: ["0", "1", "2", "3", "4"],
    byIndex: {
      0: { id: "by-id", index: 7 },
      1: { page: "page-only" },
      2: { pageId: "p2", tabId: "", childIndex: 5, corTabIndex: 3 },
      3: {},
      4: { tabId: "t4", corTabIndex: "nope", index: "8" }
    }
  };
  assert.deepStrictEqual(run({ tabsSnapshot }).tabs, [
    tab("by-id", 7, 7),
    tab("page-only", 1, 1),
    tab("p2", 3, 5),
    tab("tab-3", 3, 3),
    tab("t4", 8, 8)
  ]);
});

test("tabs state: null corTabIndex counts as 0 (Number(null))", () => {
  const tabsSnapshot = { presentationOrder: ["3"], byIndex: { 3: { tabId: "x", corTabIndex: null } } };
  assert.deepStrictEqual(run({ tabsSnapshot }).tabs, [tab("x", 0, 0)]);
});

test("tabs state: missing order entries become generated descriptors, output index counts only kept tabs", () => {
  const tabsSnapshot = {
    presentationOrder: ["0", "5", "1"],
    byIndex: { 0: { tabId: "a" }, 1: {} }
  };
  assert.deepStrictEqual(run({ tabsSnapshot }).tabs, [
    tab("a", 0, 0),
    tab("tab-1", 1, 1),
    tab("tab-2", 2, 2)
  ]);
});

test("tabs state: aliases are deduplicated, helper tab is excluded by snapshot helperTab", () => {
  const tabsSnapshot = {
    presentationOrder: ["0", "1", "2"],
    byIndex: {
      0: { tabId: "dash" },
      1: { tabId: "helper" },
      2: { id: "other", pageId: "other-page" }
    },
    helperTab: { tabId: "helper", pageId: "helper-page" }
  };
  assert.deepStrictEqual(run({ tabsSnapshot }), {
    helperTabIds: ["helper"],
    helperTabPageId: "helper-page",
    tabs: [tab("dash", 0, 0), tab("other", 1, 1)]
  });
});

test("helper tab: snapshot helperTab field aliases (id, page) and missing page", () => {
  assert.deepStrictEqual(
    run({ tabsSnapshot: { helperTab: { id: "h1", page: "pg1" } } }),
    { helperTabIds: ["h1"], helperTabPageId: "pg1", tabs: [] }
  );
  assert.deepStrictEqual(
    run({ tabsSnapshot: { helperTab: { tabId: "h2" } } }),
    { helperTabIds: ["h2"], helperTabPageId: null, tabs: [] }
  );
  assert.deepStrictEqual(
    run({ tabsSnapshot: { helperTab: { pageId: "only-page" } } }),
    { helperTabIds: [], helperTabPageId: null, tabs: [] }
  );
});

test("helper tab: snapshot helperTab wins over config helper roles", () => {
  const tabsConfig = [{ role: "dashboard" }, { role: "helper" }];
  const result = run({ tabsConfig, tabsSnapshot: { helperTab: { tabId: "snap", pageId: "snap-page" } }, layoutItems: layout("L0", "L1") });
  assert.deepStrictEqual(result.helperTabIds, ["snap"]);
  assert.equal(result.helperTabPageId, "snap-page");
});

test("helper tab: truthy snapshot helperTab without an id falls through to config helper roles", () => {
  const tabsConfig = [{ role: "dashboard" }, { role: "helper", tabId: "cfg-h" }];
  for (const helperTab of [{}, { pageId: "only-page" }, { page: "p" }]) {
    assert.deepStrictEqual(run({ tabsConfig, tabsSnapshot: { helperTab }, layoutItems: layout("L0", "L1") }), {
      helperTabIds: ["cfg-h"],
      helperTabPageId: "cfg-h",
      tabs: [tab("L0", 0, 0)]
    });
  }
});

test("sparse arrays: holes in config arrays, presentationOrder and canvas data behave like index loops", () => {
  const sparseConfig = [{ role: "dashboard" }, , { role: "dashboard" }]; // eslint-disable-line no-sparse-arrays
  assert.deepStrictEqual(run({ tabsConfig: sparseConfig, layoutItems: layout("L0", "L1", "L2") }).tabs, [
    tab("L0", 0, 0), tab("L1", 1, 1), tab("L2", 2, 2)
  ]);
  const wrapped = { tabs: [, { role: "helper" }] }; // eslint-disable-line no-sparse-arrays
  assert.deepStrictEqual(run({ tabsConfig: wrapped, layoutItems: layout("L0", "L1") }), {
    helperTabIds: ["tab-1"],
    helperTabPageId: "tab-1",
    tabs: [tab("L0", 0, 0)]
  });
  const presentationOrder = ["0", , "1"]; // eslint-disable-line no-sparse-arrays
  const byIndex = { 0: { tabId: "a" }, 1: { tabId: "b" } };
  assert.deepStrictEqual(run({ tabsSnapshot: { presentationOrder, byIndex } }).tabs, [
    tab("a", 0, 0), tab("tab-1", 1, 1), tab("b", 2, 2)
  ]);
  const data = [{ tabId: "c1" }, , { tabId: "c2" }]; // eslint-disable-line no-sparse-arrays
  const canvas = { listCanvasWidgets: () => ({ ok: true, data }) };
  assert.deepStrictEqual(run({}, facetsKDB({ canvas })).tabs, [tab("c1", 0), tab("c2", 1)]);
  const tabsFacet = { listTabs: () => ({ ok: true, data: [{ id: "x0", index: 0 }, , { id: "x2", index: 2 }] }) }; // eslint-disable-line no-sparse-arrays
  assert.deepStrictEqual(
    run({ tabsConfig: [{ role: "dashboard" }, { role: "dashboard" }, { role: "dashboard" }] }, facetsKDB({ tabs: tabsFacet })).tabs,
    [tab("x0", 0, 0), tab("x2", 2, 1)]
  );
});

test("config array form: dashboard/main/undefined roles map to layout items, helper role is skipped", () => {
  const tabsConfig = [
    { role: "main" },
    { role: "dashboard" },
    { role: "helper" },
    {},
    { role: "other" }
  ];
  const layoutItems = layout("L0", "L1", "L2", "L3", "L4");
  assert.deepStrictEqual(run({ tabsConfig, layoutItems }), {
    helperTabIds: ["tab-2"],
    helperTabPageId: "tab-2",
    tabs: [tab("L0", 0, 0), tab("L1", 1, 1), tab("L3", 3, 2)]
  });
});

test("config array form: helper tab id comes from the config entry (pageId is ignored), a zero corTabIndex falls back to the array position", () => {
  const tabsConfig = [
    { role: "dashboard", corTabIndex: 1 },
    { role: "helper", corTabIndex: 0, tabId: "cfg-helper", pageId: "ignored" }
  ];
  const layoutItems = layout("L0", "L1");
  assert.deepStrictEqual(run({ tabsConfig, layoutItems }), {
    helperTabIds: ["cfg-helper"],
    helperTabPageId: "cfg-helper",
    tabs: [tab("L1", 1, 0)]
  });
});

test("config array form: helper entry looked up by array position, not by its corTabIndex", () => {
  const tabsConfig = [{ role: "dashboard" }, { role: "helper", corTabIndex: 5, tabId: "far" }];
  assert.deepStrictEqual(run({ tabsConfig, layoutItems: layout("L0") }), {
    helperTabIds: ["tab-5"],
    helperTabPageId: "tab-5",
    tabs: [tab("L0", 0, 0)]
  });
});

test("config array form: multiple helpers resolve in index order and keep the first page id", () => {
  const tabsConfig = [
    { role: "helper", index: 3 },
    { role: "dashboard", index: 1 },
    { role: "helper", index: 2 }
  ];
  assert.deepStrictEqual(run({ tabsConfig, layoutItems: layout("L0", "L1", "L2", "L3") }), {
    helperTabIds: ["tab-2", "tab-3"],
    helperTabPageId: "tab-2",
    tabs: [tab("L1", 1, 0)]
  });
});

test("config array form: index 0 is falsy and falls back to the array position", () => {
  const tabsConfig = [{ role: "main" }, { role: "dashboard", index: 0 }];
  assert.deepStrictEqual(run({ tabsConfig, layoutItems: layout("L0", "L1") }).tabs, [tab("L0", 0, 0), tab("L1", 1, 1)]);
});

test("config array form: null entry is ignored (role null is neither helper nor dashboard)", () => {
  assert.deepStrictEqual(run({ tabsConfig: [null, { role: "dashboard" }], layoutItems: layout("L0", "L1") }).tabs, [
    tab("L1", 1, 0)
  ]);
});

test("config wrapped form { tabs: [...] }", () => {
  const tabsConfig = { tabs: [{ role: "dashboard" }, { role: "helper" }, { role: "dashboard" }] };
  assert.deepStrictEqual(run({ tabsConfig, layoutItems: layout("L0", "L1", "L2") }), {
    helperTabIds: ["tab-1"],
    helperTabPageId: "tab-1",
    tabs: [tab("L0", 0, 0), tab("L2", 2, 1)]
  });
});

test("config object form: only role dashboard counts as dashboard, helper found by corTabIndex or index", () => {
  const tabsConfig = {
    0: { role: "dashboard", corTabIndex: 0 },
    1: { role: "main", corTabIndex: 1 },
    2: { role: "helper", index: 2 },
    3: {}
  };
  assert.deepStrictEqual(run({ tabsConfig, layoutItems: layout("L0", "L1", "L2", "L3") }), {
    helperTabIds: ["tab-2"],
    helperTabPageId: "tab-2",
    tabs: [tab("L0", 0, 0)]
  });
});

test("config object form: helper without matching index yields generated descriptor", () => {
  const tabsConfig = { a: { role: "helper", corTabIndex: 4 } };
  assert.deepStrictEqual(run({ tabsConfig, layoutItems: [] }), {
    helperTabIds: ["tab-4"],
    helperTabPageId: "tab-4",
    tabs: []
  });
});

test("config object form: dashboard indexes are sorted numerically and key is the fallback index", () => {
  const tabsConfig = {
    10: { role: "dashboard" },
    2: { role: "dashboard" },
    1: { role: "dashboard", order: 9 }
  };
  const layoutItems = [];
  for (let i = 0; i <= 10; i += 1) layoutItems[i] = { id: `L${i}` };
  assert.deepStrictEqual(run({ tabsConfig, layoutItems }).tabs, [
    tab("L2", 2, 0),
    tab("L9", 9, 1),
    tab("L10", 10, 2)
  ]);
});

test("config via _KDB.config.tabs when options.tabsConfig is absent", () => {
  const _KDB = { config: { tabs: [{ role: "dashboard" }, { role: "helper" }] } };
  assert.deepStrictEqual(run({ layoutItems: layout("L0", "L1") }, _KDB), {
    helperTabIds: ["tab-1"],
    helperTabPageId: "tab-1",
    tabs: [tab("L0", 0, 0)]
  });
});

test("helper tab: layout items never supply helper ids (layout fallback needs config helper indexes, which always resolve from config)", () => {
  const tabsConfig = [{ role: "dashboard" }, { role: "helper" }];
  const withLayout = run({ tabsConfig, layoutItems: [{ id: "L0" }, { id: "LH" }] });
  assert.deepStrictEqual(withLayout.helperTabIds, ["tab-1"]);
  assert.equal(withLayout.helperTabPageId, "tab-1");
  assert.deepStrictEqual(run({ tabsConfig: [{ role: "dashboard" }], layoutItems: layout("L0", "L1") }).helperTabIds, []);
});

test("layout facet: page id of a layout item falls back to items[0].id", () => {
  const tabsConfig = [{ role: "dashboard" }, { role: "dashboard" }, { role: "dashboard" }];
  const layoutItems = [{ id: "L0" }, { items: [{ id: "nested" }] }, { items: [] }];
  assert.deepStrictEqual(run({ tabsConfig, layoutItems }).tabs, [tab("L0", 0, 0), tab("nested", 1, 1)]);
});

test("layout facet: read through tabsFacet.listTabs, indexed by descriptor index", () => {
  const tabsFacet = {
    listTabs: () => ({
      ok: true,
      data: [
        { id: "x1", index: 1 },
        null,
        { tabId: "x0", pageId: "p0", index: 0 },
        { index: 3 },
        { id: "x2" }
      ]
    })
  };
  const tabsConfig = [{ role: "dashboard" }, { role: "dashboard" }, { role: "dashboard" }];
  const result = run({ tabsConfig }, facetsKDB({ tabs: tabsFacet }));
  assert.deepStrictEqual(result.tabs, [tab("x0", 0, 0), tab("x1", 1, 1), tab("x2", 2, 2)]);
});

test("layout facet: not-ok outcome, missing listTabs and throwing facet give empty layout", () => {
  const tabsConfig = [{ role: "dashboard" }];
  const canvas = { listCanvasWidgets: () => ({ ok: true, data: [{ tabId: "c1" }] }) };
  assert.deepStrictEqual(
    run({ tabsConfig }, facetsKDB({ tabs: { listTabs: () => ({ ok: false, data: [{ id: "z" }] }) }, canvas })).tabs,
    [tab("c1", 0, 0)]
  );
  assert.deepStrictEqual(run({ tabsConfig }, facetsKDB({ tabs: {}, canvas })).tabs, [tab("c1", 0, 0)]);
  const before = logged.length;
  assert.deepStrictEqual(
    run({ tabsConfig }, facetsKDB({ tabs: { listTabs() { throw new Error("boom"); } }, canvas })).tabs,
    [tab("c1", 0, 0)]
  );
  assert.equal(logged.length, before + 1);
});

test("options.layoutItems takes precedence over tabsFacet.listTabs", () => {
  const tabsFacet = { listTabs: () => ({ ok: true, data: [{ id: "facet" }] }) };
  const result = run({ tabsConfig: [{ role: "dashboard" }], layoutItems: layout("opt") }, facetsKDB({ tabs: tabsFacet }));
  assert.deepStrictEqual(result.tabs, [tab("opt", 0, 0)]);
});

test("canvas facet: used when state and config/layout give no tabs; duplicates and empty ids dropped", () => {
  const canvas = {
    listCanvasWidgets: () => ({
      ok: true,
      data: [{ tabId: "c1" }, { tabId: "c2" }, { tabId: "c1" }, {}, null, { tabId: "c3" }]
    })
  };
  assert.deepStrictEqual(run({}, facetsKDB({ canvas })), {
    helperTabIds: [],
    helperTabPageId: null,
    tabs: [tab("c1", 0), tab("c2", 1), tab("c3", 2)]
  });
});

test("canvas facet: used when config has dashboard tabs but layout items do not resolve to ids", () => {
  const canvas = { listCanvasWidgets: () => ({ ok: true, data: [{ tabId: "c1" }] }) };
  const tabsConfig = [{ role: "dashboard" }];
  assert.deepStrictEqual(run({ tabsConfig, layoutItems: [] }, facetsKDB({ canvas })).tabs, [tab("c1", 0)]);
  assert.deepStrictEqual(run({ tabsConfig, layoutItems: [{}] }, facetsKDB({ canvas })).tabs, [tab("c1", 0)]);
});

test("canvas facet: not-ok outcome, non-array data, missing function and throwing facet give no tabs", () => {
  assert.deepStrictEqual(run({}, facetsKDB({ canvas: { listCanvasWidgets: () => ({ ok: false, data: [{ tabId: "a" }] }) } })).tabs, []);
  assert.deepStrictEqual(run({}, facetsKDB({ canvas: { listCanvasWidgets: () => ({ ok: true, data: "x" }) } })).tabs, []);
  assert.deepStrictEqual(run({}, facetsKDB({ canvas: {} })).tabs, []);
  assert.deepStrictEqual(run({}, facetsKDB({ canvas: { listCanvasWidgets() { throw new Error("boom"); } } })).tabs, []);
});

test("source priority: tabs state beats config/layout beats canvas", () => {
  const canvas = { listCanvasWidgets: () => ({ ok: true, data: [{ tabId: "canvas" }] }) };
  const tabsConfig = [{ role: "dashboard" }];
  const layoutItems = layout("layout");
  const tabsSnapshot = { byIndex: { 0: { tabId: "state" } } };
  assert.deepStrictEqual(run({ tabsConfig, layoutItems, tabsSnapshot }, facetsKDB({ canvas })).tabs, [tab("state", 0, 0)]);
  assert.deepStrictEqual(run({ tabsConfig, layoutItems }, facetsKDB({ canvas })).tabs, [tab("layout", 0, 0)]);
  assert.deepStrictEqual(run({}, facetsKDB({ canvas })).tabs, [tab("canvas", 0)]);
});

test("state with only helper tabs falls through to config/layout/canvas", () => {
  const tabsSnapshot = { byIndex: { 0: { tabId: "h" } }, helperTab: { tabId: "h", pageId: "hp" } };
  const canvas = { listCanvasWidgets: () => ({ ok: true, data: [{ tabId: "c1" }] }) };
  assert.deepStrictEqual(run({ tabsSnapshot }, facetsKDB({ canvas })), {
    helperTabIds: ["h"],
    helperTabPageId: "hp",
    tabs: [tab("c1", 0)]
  });
});

test("tabs snapshot sources: options.readTabsState, then _KDB.api.tabs.getState", () => {
  const byIndex = { 0: { tabId: "fromFn" } };
  assert.deepStrictEqual(run({ readTabsState: () => ({ byIndex }) }).tabs, [tab("fromFn", 0, 0)]);

  const _KDB = { api: { tabs: { getState: () => ({ byIndex: { 0: { tabId: "fromApi" } } }) } } };
  assert.deepStrictEqual(run({}, _KDB).tabs, [tab("fromApi", 0, 0)]);

  // options.tabsSnapshot beats readTabsState beats the api
  const opts = { tabsSnapshot: { byIndex: { 0: { tabId: "snap" } } }, readTabsState: () => ({ byIndex }) };
  assert.deepStrictEqual(run(opts, _KDB).tabs, [tab("snap", 0, 0)]);
});

test("tabs api failures are logged and ignored, readTabsState failures propagate", () => {
  const canvas = { listCanvasWidgets: () => ({ ok: true, data: [{ tabId: "c1" }] }) };
  const throwingApi = { api: { tabs: { getState() { throw new Error("api down"); } } }, ...facetsKDB({ canvas }) };
  const before = logged.length;
  assert.deepStrictEqual(run({}, throwingApi).tabs, [tab("c1", 0)]);
  assert.equal(logged.length, before + 1);
  assert.deepStrictEqual(run({}, { api: { tabs: {} }, ...facetsKDB({ canvas }) }).tabs, [tab("c1", 0)]);
  assert.throws(() => run({ readTabsState() { throw new Error("state down"); } }), /state down/);
});

test("full scenario: dashboard tabs plus helper tab from state, presentation order differs from index order", () => {
  const tabsSnapshot = {
    presentationOrder: ["1", "0", "3", "2"],
    byIndex: {
      0: { tabId: "tabA", corTabIndex: 0 },
      1: { tabId: "tabB", corTabIndex: 1 },
      2: { tabId: "tabC", corTabIndex: 2 },
      3: { tabId: "helperTab", corTabIndex: 3 }
    },
    helperTab: { tabId: "helperTab", pageId: "helperPage" }
  };
  assert.deepStrictEqual(run({ tabsSnapshot }), {
    helperTabIds: ["helperTab"],
    helperTabPageId: "helperPage",
    tabs: [tab("tabB", 1, 1), tab("tabA", 0, 0), tab("tabC", 2, 2)]
  });
});
