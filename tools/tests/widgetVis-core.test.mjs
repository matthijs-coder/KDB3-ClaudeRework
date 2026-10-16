// Golden tests for the widgetVis core leaves and widgetDataTable (WS-M W1).
// Run: node --test tools/tests/widgetVis-core.test.mjs
// Only loadCore()/loadDataTable() know module paths; fixtures are the recorded outputs of origin/main.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const W = "dashboard/widgets/widgetVis/";
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), options);

function loadCore() {
  const state = load(W + "state.js");
  const results = load(W + "results.js");
  const runtime = load(W + "runtime.js");
  return {
    ACTION_TYPES: state.ACTION_TYPES,
    createWidgetVisReducer: state.createWidgetVisReducer,
    createInitialWidgetVisState: state.createInitialWidgetVisState,
    cloneState: state.cloneState,
    normalizeMetricIdentity: state.normalizeMetricIdentity,
    resolveMetricFromContentCreatePayload: state.resolveMetricFromContentCreatePayload,
    selectors: load(W + "selectors.js"),
    normalizeDispatchResult: results.normalizeDispatchResult,
    finalizePipelineResult: results.finalizePipelineResult,
    reportApplyResult: results.reportApplyResult,
    isContentReady: runtime.isContentReady,
    getContentReadyTimeoutMs: runtime.getContentReadyTimeoutMs,
    visTypes: load(W + "visTypes.js"),
    bindingConfig: load(W + "bindingConfig.js"),
    years: load(W + "years.js"),
    readConfirmedJahrYear: load(W + "effects/readConfirmedJahrYear.js")
  };
}

function loadDataTable() {
  return load("dashboard/widgets/widgetDataTable/__orchestratorWidgetDataTable.js", {
    stubs: { console: { error() {}, warn() {}, log() {} } }
  });
}

const sha = (value) => createHash("sha256").update(JSON.stringify(value === undefined ? "<undefined>" : value)).digest("hex").slice(0, 16);
const json = (value) => (value === undefined ? "<undefined>" : JSON.parse(JSON.stringify(value)));

function buildKdb(extra) {
  const _KDB = Object.assign({ config: { options: {} }, api: {}, properties: {} }, extra || {});
  load("core/config/__orchestratorConfig.js")(_KDB);
  return _KDB;
}

const VIS_TYPES = [
  "Line", "line", "Pie", "pie", "StackedBar", "stackedbar", "StackedColumn", "List", "list", "Prognose", "prognose",
  "com.ibm.vis.custom.prognoseyear", "com.ibm.vis.custom.prognoseyearlinechart", "Unknown", null, ""
];
const GRAINS = [undefined, "stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV", "bogus"];
const TABLES = [null, "Personal_KDB", "Unknown_Table"];
const DEAD_CONTEXT_KEYS = ["visualizationDefinition", "propertyValues", "layoutPropertyValues"];

function computeFixtures(core) {
  const _KDB = buildKdb();
  const vt = core.visTypes;
  const bc = core.bindingConfig;
  const out = {};

  out.normalizeVisualizationType = ["line", " Pie ", "STACKEDBAR", "stackedcolumn", "List", "prognose", "com.ibm.vis.custom.prognoseyear",
    "Com.IBM.Vis.Custom.PrognoseYearLineChart", "Bar", "", null, undefined, 0].map((v) => json(vt.normalizeVisualizationType(v)));

  out.identity = {};
  for (const type of VIS_TYPES) {
    const header = [
      json(vt.resolveVisPropBucketKey(type, _KDB)),
      json(vt.resolveCognosVisualizationTypeId(type, _KDB)),
      json(vt.resolveDefaultGrain(type, _KDB)),
      TABLES.map((table) => sha(vt.resolveVisTypeConfig(table, type, _KDB))).join(",")
    ].join("|");
    const grains = GRAINS.map((grain) => [
      json(vt.resolveEffectiveGrain(type, grain, _KDB)),
      json(vt.resolveKennzahlPack(type, grain, _KDB)),
      sha(vt.resolveGrainOverlay(type, grain, _KDB))
    ].join("|"));
    out.identity[String(type)] = [header, grains];
  }

  out.definitions = {};
  for (const type of VIS_TYPES) {
    out.definitions[String(type)] = [
      sha(vt.resolveVisualizationDefinition(type, _KDB)),
      sha(vt.resolveVisualizationPropertyValues(type, _KDB)),
      sha(vt.resolveVisualizationLayoutPropertyValues(type, _KDB))
    ].join("|");
  }
  out.defaultVisualizationType = [vt.resolveDefaultVisualizationType(_KDB), vt.resolveDefaultVisualizationType({})];
  out.kennzahlDefaults = [undefined, "", "P_A_MOA_01", "P_A_MOA_05", "NOPE"].map((code) => json(vt.resolveKennzahlDefaults(code, _KDB)));
  out.readVisualizationsConfig = [sha(vt.readVisualizationsConfig(_KDB)), json(vt.readVisualizationsConfig(null))];

  out.bindingContext = {};
  for (const type of VIS_TYPES) {
    for (const code of [undefined, "P_A_MOA_01"]) {
      for (const table of [undefined, "Unknown_Table"]) {
        const ctx = bc.resolveBindingContext(_KDB, { visualizationType: type, kennzahlCode: code, kennzahlenTable: table });
        const live = Object.assign({}, ctx);
        DEAD_CONTEXT_KEYS.forEach((key) => delete live[key]);
        out.bindingContext[[type, code, table].join("|")] = sha(live);
      }
    }
  }
  out.bindingContextHints = json(bc.resolveBindingContext(_KDB, {
    visualizationType: "List",
    datasourceHints: { datasourceId: "ds-1", datasourceName: "Hinted" }
  }).datasourceIdentity);
  const defaultContext = Object.assign({}, bc.resolveBindingContext(_KDB, {}));
  DEAD_CONTEXT_KEYS.forEach((key) => delete defaultContext[key]);
  out.bindingContextDefaultType = sha(defaultContext);

  out.dataTableConfig = {};
  for (const type of ["Line", "List", "Prognose", "Pie", null]) {
    for (const table of TABLES) {
      out.dataTableConfig[[type, table].join("|")] = sha(bc.resolveDataTableConfig(table, _KDB, type));
    }
  }
  out.sorting = ["Line", "List", "Prognose", "Pie", "StackedBar", null].map((type) => sha(bc.resolveSortingConfig(type, _KDB, { sorting: { x: 1 } })));
  out.visualizationDimensions = sha(bc.resolveVisualizationDimensions(_KDB));
  out.planConfigSnapshots = sha(bc.resolvePlanConfigSnapshots(_KDB));
  out.emptyDataFilter = [json(bc.resolveEmptyDataFilter(_KDB)), json(bc.resolveEmptyDataFilter({}))];
  out.datasourceIdentity = [
    bc.resolveDatasourceIdentity({}, {}, null, {}, _KDB),
    bc.resolveDatasourceIdentity({ widget_datasource_id_KID: 7, widget_datasource_name_KID: "W" }, {}, "T", {}, _KDB),
    bc.resolveDatasourceIdentity({ datasource_name_KID: "D" }, { datasourceName: "C" }, "T", { datasourceId: "h" }, _KDB),
    bc.resolveDatasourceIdentity({ datasource_name_KID: "D" }, {}, "T", { datasourceName: 0 }, _KDB),
    bc.resolveDatasourceIdentity(null, null, null, null, _KDB)
  ].map(json);
  const dims = bc.resolveVisualizationDimensions(_KDB);
  const dimKeys = Object.keys(dims);
  out.topNHelperListConfig = [
    {},
    { dimension: dimKeys[0] },
    ...dimKeys.map((dimension) => ({ dimension, kennzahlenTable: "Personal_KDB", dataTableConfig: { dimensions: dims } })),
    { dimension: "x", dataTableConfig: { dimensions: { x: { topNItemId: 5 } } } },
    { dimension: "x", dataTableConfig: { dimensions: { x: { exclude: { itemId: "e" } } } } },
    { dimension: "x", dataTableConfig: { dimensions: { x: {} } } }
  ].map((cfg) => json(bc.resolveTopNHelperListConfig(_KDB, cfg)));
  out.currentMetricsDataSource = [
    bc.resolveCurrentMetricsDataSource(_KDB),
    bc.resolveCurrentMetricsDataSource({ api: { dataSourceContext: { getCurrentMetricsDataSource: () => " Api_Table " } } }),
    bc.resolveCurrentMetricsDataSource({ api: { dataSourceContext: { getCurrentMetricsDataSource: () => "" } }, config: { dataSources: { metrics: { default: " Str " } } } }),
    bc.resolveCurrentMetricsDataSource({ config: { dataSources: { metrics: { default: { prefix: "x" } } } } }),
    bc.resolveCurrentMetricsDataSource(null)
  ];

  out.metricIdentity = [
    core.normalizeMetricIdentity(undefined),
    core.normalizeMetricIdentity({ kennzahlCode: "K", kennzahlDisplay: " ", title: "T", kennzahlenTable: 3, langtext: "L", url: null }),
    core.normalizeMetricIdentity({ code: "C", kennzahlCode: "K", display: "D", metricsTable: "M" }),
    core.resolveMetricFromContentCreatePayload({ metric: { code: "M1" } }),
    core.resolveMetricFromContentCreatePayload({ payload: { kennzahlCode: "P1" } }),
    core.resolveMetricFromContentCreatePayload({ dropRequest: { payload: { code: "D1" } } }),
    core.resolveMetricFromContentCreatePayload(null)
  ].map(json);

  out.readConfirmedJahrYear = [
    [], null, ["2024"], [2023, "2025"], ["Jahr 2019 bis 2021"], [" 1899 "], ["2101"], [{ d: "2020", u: "1999" }],
    [{ d: "x", u: "2018" }], [{ d: null, u: null }], ["abc"], ["", null], ["12345"], ["20221"], [1900, 2100, 2101]
  ].map((values) => json(core.readConfirmedJahrYear(values)));

  Object.assign(out, recordReducer(core), recordResults(core));
  return out;
}

function recordReducer(core) {
  const T = core.ACTION_TYPES;
  const reducer = core.createWidgetVisReducer();
  const steps = [
    { type: T.MOUNT_STARTED },
    { type: T.MOUNT_SUCCEEDED },
    { type: T.REGISTER_CONTENT, widgetId: "w1", payload: { record: { derived: { code: "K1", display: "Kennzahl" } } } },
    { type: T.REGISTER_CONTENT, widgetId: "w2", payload: {} },
    { type: T.REGISTER_CONTENT, payload: { record: { maximized: true } } },
    { type: T.MARK_PENDING, widgetId: "w1", payload: { kind: "dimension", opSeq: 2 } },
    { type: T.APPLY_SUCCEEDED, widgetId: "w1", payload: { derived: { titleText: "T", lastAppliedVisType: "Line", topNResultValues: ["a"] } } },
    { type: T.MAXIMIZE_SUCCEEDED, widgetId: "w1", payload: { nextMaximized: true } },
    { type: T.MARK_PENDING, widgetId: "w2", payload: {} },
    { type: T.ERROR_RECORDED, widgetId: "w2", payload: { errorCode: "E2", errorMessage: "boom" } },
    { type: T.CLEANUP_SUCCEEDED, widgetId: "w1", payload: { derived: { emptyStatus: "intentional", emptyReason: "cleanup" } } },
    { type: T.ERROR_RECORDED, payload: { errorCode: "EG" } },
    { type: T.APPLY_SUCCEEDED, widgetId: "missing", payload: {} },
    { type: T.DESTROY }
  ];
  let state = reducer(undefined, { type: "unknown" });
  const reducerHashes = [];
  for (const action of steps) {
    state = reducer(state, action);
    reducerHashes.push(sha(state));
  }
  return { reducerHashes, reducerFinal: json(state) };
}

function recordResults(core) {
  const T = core.ACTION_TYPES;
  const reportApplyResult = [
    { widgetId: "w", opSeq: 1, applyResult: { status: "success", diagnostics: { d: 1 } }, payload: { control: "dimension", previousValue: "a", nextValue: "b" },
      propertyDiagnostics: { p: 2 } },
    { widgetId: "w", opSeq: 1, applyResult: { status: "success" }, control: "visType" },
    { widgetId: "w", opSeq: 2, applyResult: { status: "aborted" } },
    { widgetId: "w", opSeq: 3, applyResult: { status: "timeout" } },
    { widgetId: "w", opSeq: 3, applyResult: { status: "timeout", diagnostics: { errorMessage: "slow" } } },
    { widgetId: "w", opSeq: 4, applyResult: { status: "error", diagnostics: { errorCode: "X", errorMessage: "Y" } } },
    { widgetId: "w", opSeq: 4 },
    undefined
  ].map((options) => json(core.reportApplyResult(options)));
  const dispatched = [];
  const context = { dispatchInternal: (action) => dispatched.push(action) };
  const action = { widgetId: "w1" };
  const finalizePipelineResult = [
    core.finalizePipelineResult(context, action, { ok: false, stale: true, status: "aborted" }),
    core.finalizePipelineResult(context, action, { ok: true, derived: { code: "K" }, bound: true }, { buildReportToSettings: () => ({ r: 1 }) }),
    core.finalizePipelineResult(context, action, { ok: true }),
    core.finalizePipelineResult(context, action, { ok: false }, { defaultErrorCode: "DEF", defaultErrorMessage: "msg" }),
    core.finalizePipelineResult(context, action, { ok: false, errorCode: "OWN", errorMessage: "own" })
  ].map(json);
  const finalizeDispatches = dispatched.map((entry) => [entry.type === T.APPLY_SUCCEEDED ? "APPLY" : entry.type === T.ERROR_RECORDED ? "ERROR" : entry.type,
    entry.widgetId, json(entry.payload)]);
  return { reportApplyResult, finalizePipelineResult, finalizeDispatches };
}

const FIXTURES = {
  normalizeVisualizationType: ["Line", "Pie", "StackedBar", "StackedColumn", "List", "Prognose", "Prognose", "Prognose", "Bar", null, null, null, "0"],
  identity: {
    Line: [
      "Line|Line|stichtag|a4b0ea76d9de4987,a4b0ea76d9de4987,a4b0ea76d9de4987",
      [
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "jahr|jahr|2e66abd69d5e319d", "jahrStichtag|stichtag|c56724cd5ddfc908",
        "stichtagProJahrH|stichtag|caced672d83376dd", "stichtagProJahrV|stichtag|303d3e353fbcbcca", "stichtag|stichtag|64a56855c1f034fc"
      ]
    ],
    line: [
      "Line|Line|stichtag|a4b0ea76d9de4987,a4b0ea76d9de4987,a4b0ea76d9de4987",
      [
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "jahr|jahr|2e66abd69d5e319d", "jahrStichtag|stichtag|c56724cd5ddfc908",
        "stichtagProJahrH|stichtag|caced672d83376dd", "stichtagProJahrV|stichtag|303d3e353fbcbcca", "stichtag|stichtag|64a56855c1f034fc"
      ]
    ],
    Pie: [
      "pie|Pie|jahr|0a77469caff974fa,0a77469caff974fa,0a77469caff974fa",
      [
        "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahrStichtag|stichtag|2865a4c16c690783",
        "stichtagProJahrH|stichtag|66665fb978acddbb", "stichtagProJahrV|stichtag|c9a00a5e166bd722", "jahr|jahr|64a56855c1f034fc"
      ]
    ],
    pie: [
      "pie|Pie|jahr|0a77469caff974fa,0a77469caff974fa,0a77469caff974fa",
      [
        "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahrStichtag|stichtag|2865a4c16c690783",
        "stichtagProJahrH|stichtag|66665fb978acddbb", "stichtagProJahrV|stichtag|c9a00a5e166bd722", "jahr|jahr|64a56855c1f034fc"
      ]
    ],
    StackedBar: [
      "StackedBar|StackedBar|jahr|caf1db0fd36f75b5,caf1db0fd36f75b5,caf1db0fd36f75b5",
      [
        "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahrStichtag|stichtag|d4ce405fc952f810",
        "stichtagProJahrH|stichtag|145f509b357ba5c2", "stichtagProJahrV|stichtag|8d2ec98cd2effc39", "jahr|jahr|64a56855c1f034fc"
      ]
    ],
    stackedbar: [
      "StackedBar|StackedBar|jahr|caf1db0fd36f75b5,caf1db0fd36f75b5,caf1db0fd36f75b5",
      [
        "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahrStichtag|stichtag|d4ce405fc952f810",
        "stichtagProJahrH|stichtag|145f509b357ba5c2", "stichtagProJahrV|stichtag|8d2ec98cd2effc39", "jahr|jahr|64a56855c1f034fc"
      ]
    ],
    StackedColumn: [
      "StackedColumn|StackedColumn|jahr|caf1db0fd36f75b5,caf1db0fd36f75b5,caf1db0fd36f75b5",
      [
        "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahrStichtag|stichtag|d4ce405fc952f810",
        "stichtagProJahrH|stichtag|145f509b357ba5c2", "stichtagProJahrV|stichtag|8d2ec98cd2effc39", "jahr|jahr|64a56855c1f034fc"
      ]
    ],
    List: [
      "List|List|jahrStichtag|c8b3574fa03d3f51,c8b3574fa03d3f51,c8b3574fa03d3f51",
      [
        "jahrStichtag|list|64a56855c1f034fc", "jahrStichtag|list|64a56855c1f034fc", "jahr|jahr|93b76031c417673c", "jahrStichtag|list|64a56855c1f034fc",
        "jahrStichtag|list|64a56855c1f034fc", "jahrStichtag|list|64a56855c1f034fc", "jahrStichtag|list|64a56855c1f034fc"
      ]
    ],
    list: [
      "List|List|jahrStichtag|c8b3574fa03d3f51,c8b3574fa03d3f51,c8b3574fa03d3f51",
      [
        "jahrStichtag|list|64a56855c1f034fc", "jahrStichtag|list|64a56855c1f034fc", "jahr|jahr|93b76031c417673c", "jahrStichtag|list|64a56855c1f034fc",
        "jahrStichtag|list|64a56855c1f034fc", "jahrStichtag|list|64a56855c1f034fc", "jahrStichtag|list|64a56855c1f034fc"
      ]
    ],
    Prognose: [
      "com.ibm.vis.custom.prognoseyearlinechart|com.ibm.vis.custom.prognoseyearlinechart|stichtag|327ed5eab725103a,327ed5eab725103a,327ed5eab725103a",
      [
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc",
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc"
      ]
    ],
    prognose: [
      "com.ibm.vis.custom.prognoseyearlinechart|com.ibm.vis.custom.prognoseyearlinechart|stichtag|327ed5eab725103a,327ed5eab725103a,327ed5eab725103a",
      [
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc",
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc"
      ]
    ],
    "com.ibm.vis.custom.prognoseyear": [
      "com.ibm.vis.custom.prognoseyearlinechart|com.ibm.vis.custom.prognoseyearlinechart|stichtag|327ed5eab725103a,327ed5eab725103a,327ed5eab725103a",
      [
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc",
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc"
      ]
    ],
    "com.ibm.vis.custom.prognoseyearlinechart": [
      "com.ibm.vis.custom.prognoseyearlinechart|com.ibm.vis.custom.prognoseyearlinechart|stichtag|327ed5eab725103a,327ed5eab725103a,327ed5eab725103a",
      [
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc",
        "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc"
      ]
    ],
    Unknown: [
      "Unknown|Unknown|<undefined>|74234e98afe7498f,74234e98afe7498f,74234e98afe7498f",
      [
        "<undefined>|<undefined>|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahrStichtag|stichtag|64a56855c1f034fc",
        "stichtagProJahrH|stichtag|64a56855c1f034fc", "stichtagProJahrV|stichtag|64a56855c1f034fc", "<undefined>|<undefined>|64a56855c1f034fc"
      ]
    ],
    null: [
      "||<undefined>|74234e98afe7498f,74234e98afe7498f,74234e98afe7498f",
      [
        "<undefined>|<undefined>|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahrStichtag|stichtag|64a56855c1f034fc",
        "stichtagProJahrH|stichtag|64a56855c1f034fc", "stichtagProJahrV|stichtag|64a56855c1f034fc", "<undefined>|<undefined>|64a56855c1f034fc"
      ]
    ],
    "": [
      "||<undefined>|74234e98afe7498f,74234e98afe7498f,74234e98afe7498f",
      [
        "<undefined>|<undefined>|64a56855c1f034fc", "stichtag|stichtag|64a56855c1f034fc", "jahr|jahr|64a56855c1f034fc", "jahrStichtag|stichtag|64a56855c1f034fc",
        "stichtagProJahrH|stichtag|64a56855c1f034fc", "stichtagProJahrV|stichtag|64a56855c1f034fc", "<undefined>|<undefined>|64a56855c1f034fc"
      ]
    ]
  },
  definitions: {
    Line: "f030ef0881fa9bf0|09336620490f8360|09e6094179fa0ad3",
    line: "f030ef0881fa9bf0|09336620490f8360|09e6094179fa0ad3",
    Pie: "b6ff44dc06c3c287|09336620490f8360|f2c21e612c2ec2e7",
    pie: "b6ff44dc06c3c287|09336620490f8360|f2c21e612c2ec2e7",
    StackedBar: "b732cdc90b705a9f|09336620490f8360|d3ce31dd8dae3daf",
    stackedbar: "b732cdc90b705a9f|09336620490f8360|d3ce31dd8dae3daf",
    StackedColumn: "c2b2593df56c7a49|09336620490f8360|d3ce31dd8dae3daf",
    List: "e30b6d67e72149cf|09336620490f8360|c7b5c378bbab52c2",
    list: "e30b6d67e72149cf|09336620490f8360|c7b5c378bbab52c2",
    Prognose: "0abb404f0743db53|09336620490f8360|65542af25a6c6ae5",
    prognose: "0abb404f0743db53|09336620490f8360|65542af25a6c6ae5",
    "com.ibm.vis.custom.prognoseyear": "0abb404f0743db53|09336620490f8360|65542af25a6c6ae5",
    "com.ibm.vis.custom.prognoseyearlinechart": "0abb404f0743db53|09336620490f8360|65542af25a6c6ae5",
    Unknown: "44136fa355b3678a|44136fa355b3678a|44136fa355b3678a",
    null: "44136fa355b3678a|44136fa355b3678a|44136fa355b3678a",
    "": "44136fa355b3678a|44136fa355b3678a|44136fa355b3678a"
  },
  defaultVisualizationType: ["Line", "Line"],
  kennzahlDefaults: [{}, {}, {formatType: "number", jahrCaption: "Anzahl im Zeitraum"}, {formatType: "percent", jahrCaption: "Monatsdurchschnitt"}, {}],
  readVisualizationsConfig: ["d5fd5603eb976647", {}],
  bindingContext: {
    "Line||": "303a5ba6f9af8f8c",
    "Line||Unknown_Table": "303a5ba6f9af8f8c",
    "Line|P_A_MOA_01|": "47938fae0eb0297b",
    "Line|P_A_MOA_01|Unknown_Table": "47938fae0eb0297b",
    "line||": "303a5ba6f9af8f8c",
    "line||Unknown_Table": "303a5ba6f9af8f8c",
    "line|P_A_MOA_01|": "47938fae0eb0297b",
    "line|P_A_MOA_01|Unknown_Table": "47938fae0eb0297b",
    "Pie||": "3d061efe3ef3d458",
    "Pie||Unknown_Table": "3d061efe3ef3d458",
    "Pie|P_A_MOA_01|": "00e8e434a329ebc0",
    "Pie|P_A_MOA_01|Unknown_Table": "00e8e434a329ebc0",
    "pie||": "3d061efe3ef3d458",
    "pie||Unknown_Table": "3d061efe3ef3d458",
    "pie|P_A_MOA_01|": "00e8e434a329ebc0",
    "pie|P_A_MOA_01|Unknown_Table": "00e8e434a329ebc0",
    "StackedBar||": "4c489d893a0f370f",
    "StackedBar||Unknown_Table": "4c489d893a0f370f",
    "StackedBar|P_A_MOA_01|": "78922afd528f0dde",
    "StackedBar|P_A_MOA_01|Unknown_Table": "78922afd528f0dde",
    "stackedbar||": "4c489d893a0f370f",
    "stackedbar||Unknown_Table": "4c489d893a0f370f",
    "stackedbar|P_A_MOA_01|": "78922afd528f0dde",
    "stackedbar|P_A_MOA_01|Unknown_Table": "78922afd528f0dde",
    "StackedColumn||": "67b56ba680872da5",
    "StackedColumn||Unknown_Table": "67b56ba680872da5",
    "StackedColumn|P_A_MOA_01|": "bda25980ab6d45b0",
    "StackedColumn|P_A_MOA_01|Unknown_Table": "bda25980ab6d45b0",
    "List||": "8ca0f316038f3533",
    "List||Unknown_Table": "8ca0f316038f3533",
    "List|P_A_MOA_01|": "b8ebb99c11476aeb",
    "List|P_A_MOA_01|Unknown_Table": "b8ebb99c11476aeb",
    "list||": "8ca0f316038f3533",
    "list||Unknown_Table": "8ca0f316038f3533",
    "list|P_A_MOA_01|": "b8ebb99c11476aeb",
    "list|P_A_MOA_01|Unknown_Table": "b8ebb99c11476aeb",
    "Prognose||": "27e1ae73e9277e73",
    "Prognose||Unknown_Table": "27e1ae73e9277e73",
    "Prognose|P_A_MOA_01|": "89f2c6f8088c01ae",
    "Prognose|P_A_MOA_01|Unknown_Table": "89f2c6f8088c01ae",
    "prognose||": "27e1ae73e9277e73",
    "prognose||Unknown_Table": "27e1ae73e9277e73",
    "prognose|P_A_MOA_01|": "89f2c6f8088c01ae",
    "prognose|P_A_MOA_01|Unknown_Table": "89f2c6f8088c01ae",
    "com.ibm.vis.custom.prognoseyear||": "27e1ae73e9277e73",
    "com.ibm.vis.custom.prognoseyear||Unknown_Table": "27e1ae73e9277e73",
    "com.ibm.vis.custom.prognoseyear|P_A_MOA_01|": "89f2c6f8088c01ae",
    "com.ibm.vis.custom.prognoseyear|P_A_MOA_01|Unknown_Table": "89f2c6f8088c01ae",
    "com.ibm.vis.custom.prognoseyearlinechart||": "27e1ae73e9277e73",
    "com.ibm.vis.custom.prognoseyearlinechart||Unknown_Table": "27e1ae73e9277e73",
    "com.ibm.vis.custom.prognoseyearlinechart|P_A_MOA_01|": "89f2c6f8088c01ae",
    "com.ibm.vis.custom.prognoseyearlinechart|P_A_MOA_01|Unknown_Table": "89f2c6f8088c01ae",
    "Unknown||": "3c50864c73f2b151",
    "Unknown||Unknown_Table": "3c50864c73f2b151",
    "Unknown|P_A_MOA_01|": "285edbb60705001b",
    "Unknown|P_A_MOA_01|Unknown_Table": "285edbb60705001b",
    "||": "303a5ba6f9af8f8c",
    "||Unknown_Table": "303a5ba6f9af8f8c",
    "|P_A_MOA_01|": "47938fae0eb0297b",
    "|P_A_MOA_01|Unknown_Table": "47938fae0eb0297b"
  },
  bindingContextHints: {datasourceId: "ds-1", datasourceName: "Hinted"},
  bindingContextDefaultType: "303a5ba6f9af8f8c",
  dataTableConfig: {
    "Line|": "56b03bc5da7ab3e7",
    "Line|Personal_KDB": "56b03bc5da7ab3e7",
    "Line|Unknown_Table": "56b03bc5da7ab3e7",
    "List|": "cccee04596611d98",
    "List|Personal_KDB": "cccee04596611d98",
    "List|Unknown_Table": "cccee04596611d98",
    "Prognose|": "56b03bc5da7ab3e7",
    "Prognose|Personal_KDB": "56b03bc5da7ab3e7",
    "Prognose|Unknown_Table": "56b03bc5da7ab3e7",
    "Pie|": "56b03bc5da7ab3e7",
    "Pie|Personal_KDB": "56b03bc5da7ab3e7",
    "Pie|Unknown_Table": "56b03bc5da7ab3e7",
    "|": "56b03bc5da7ab3e7",
    "|Personal_KDB": "56b03bc5da7ab3e7",
    "|Unknown_Table": "56b03bc5da7ab3e7"
  },
  sorting: ["818e2ca0e28563ec", "13e7c28d70d0f80f", "818e2ca0e28563ec", "818e2ca0e28563ec", "818e2ca0e28563ec", "818e2ca0e28563ec"],
  visualizationDimensions: "5037648443655b0c",
  planConfigSnapshots: "41f32a70e41cdd60",
  emptyDataFilter: [{itemId: "[Personal_KDB_TM1].[KDB Kennzahlen].[KDB Kennzahlen].[KDB Kennzahlen]", value: "1"}, {itemId: null, value: "1"}],
  datasourceIdentity: [
    {datasourceId: null, datasourceName: "Personal_KDB"}, {datasourceId: "7", datasourceName: "W"}, {datasourceId: "h", datasourceName: "C"},
    {datasourceId: null, datasourceName: "0"}, {datasourceId: null, datasourceName: "Personal_KDB"}
  ],
  topNHelperListConfig: [
    null, null,
    {visualizationType: "TopN", cognosVisualizationTypeId: "List", visPropBucketKey: "List", topNHelperConfigSource: "core/config/visualizations/topNHelper.js"},
    {visualizationType: "TopN", cognosVisualizationTypeId: "List", visPropBucketKey: "List", topNHelperConfigSource: "core/config/visualizations/topNHelper.js"},
    {visualizationType: "TopN", cognosVisualizationTypeId: "List", visPropBucketKey: "List", topNHelperConfigSource: "core/config/visualizations/topNHelper.js"},
    {visualizationType: "TopN", cognosVisualizationTypeId: "List", visPropBucketKey: "List", topNHelperConfigSource: "core/config/visualizations/topNHelper.js"},
    {visualizationType: "TopN", cognosVisualizationTypeId: "List", visPropBucketKey: "List", topNHelperConfigSource: "core/config/visualizations/topNHelper.js"},
    {visualizationType: "TopN", cognosVisualizationTypeId: "List", visPropBucketKey: "List", topNHelperConfigSource: "core/config/visualizations/topNHelper.js"}, null
  ],
  currentMetricsDataSource: ["Personal_KDB", "Api_Table", "Str", "[object Object]", "Personal_KDB"],
  metricIdentity: [
    {code: "", display: "", metricsTable: "", langtext: "", url: ""}, {code: "K", display: "T", metricsTable: "3", langtext: "L", url: ""},
    {code: "C", display: "D", metricsTable: "M", langtext: "", url: ""}, {code: "M1", display: "", metricsTable: "", langtext: "", url: ""},
    {code: "P1", display: "", metricsTable: "", langtext: "", url: ""}, {code: "D1", display: "", metricsTable: "", langtext: "", url: ""},
    {code: "", display: "", metricsTable: "", langtext: "", url: ""}
  ],
  readConfirmedJahrYear: [null, null, 2024, 2025, 2019, null, null, 2020, 2018, null, null, null, null, 2022, 2100],
  reducerHashes: [
    "89cc0fd4fe413854", "49f157b1cb3a3619", "44b41ea3bcc98c60", "ce0b3f313f2694a8", "ce0b3f313f2694a8", "9085267d608670bc", "8851f962884b259a", "376f435fe67a7157",
    "376f435fe67a7157", "a7a715bb4ced4fa1", "5b339efbfa927fa7", "8b2b216254b4c6bb", "8b2b216254b4c6bb", "6aefc36e014be473"
  ],
  reducerFinal: {
    lifecycle: "disposed",
    byId: {
      w1: {
        widgetId: "w1",
        derived: {
          titleText: "T",
          code: "K1",
          display: "Kennzahl",
          metricsTable: null,
          langtext: null,
          url: null,
          topNResultValues: ["a"],
          datasourceId: null,
          datasourceName: null,
          lastAppliedVisType: "Line",
          emptyStatus: "intentional",
          emptyReason: "cleanup"
        },
        maximized: false,
        pending: {kind: null, opSeq: null},
        errorCode: null,
        errorMessage: null
      },
      w2: {
        widgetId: "w2",
        derived: {
          titleText: "",
          code: null,
          display: null,
          metricsTable: null,
          langtext: null,
          url: null,
          topNResultValues: [],
          datasourceId: null,
          datasourceName: null,
          lastAppliedVisType: null,
          emptyStatus: null,
          emptyReason: null
        },
        maximized: false,
        pending: {kind: null, opSeq: null},
        errorCode: "E2",
        errorMessage: "boom"
      }
    },
    errorCode: "EG",
    errorMessage: null
  },
  reportApplyResult: [
    {
      ok: true,
      widgetId: "w",
      opSeq: 1,
      status: "success",
      reportToSettings: {control: "dimension", previousValue: "a", nextValue: "b", diagnostics: {d: 1, visualizationProperties: {p: 2}}},
      diagnostics: {d: 1, visualizationProperties: {p: 2}}
    },
    {ok: true, widgetId: "w", opSeq: 1, status: "success", reportToSettings: {control: "visType", diagnostics: null}, diagnostics: null},
    {ok: false, widgetId: "w", opSeq: 2, stale: true, status: "aborted"},
    {ok: false, widgetId: "w", opSeq: 3, status: "timeout", errorCode: "WIDGET_VIS_BINDING_TIMEOUT", errorMessage: "Binding apply timed out."},
    {ok: false, widgetId: "w", opSeq: 3, status: "timeout", errorCode: "WIDGET_VIS_BINDING_TIMEOUT", errorMessage: "slow"},
    {ok: false, widgetId: "w", opSeq: 4, status: "error", errorCode: "X", errorMessage: "Y"},
    {ok: false, widgetId: "w", opSeq: 4, status: "error", errorCode: "WIDGET_VIS_BINDING_APPLY_FAILED", errorMessage: "Binding apply failed."},
    {ok: false, status: "error", errorCode: "WIDGET_VIS_BINDING_APPLY_FAILED", errorMessage: "Binding apply failed."}
  ],
  finalizePipelineResult: [
    {ok: false, skipped: false, stale: true, status: "aborted", ready: false},
    {ok: true, skipped: false, stale: false, status: null, ready: false, reportToSettings: {r: 1}}, {ok: true, skipped: false, stale: false, status: null, ready: false},
    {ok: false, skipped: false, stale: false, status: null, ready: false},
    {ok: false, skipped: false, stale: false, status: null, ready: false, errorCode: "OWN", errorMessage: "own"}
  ],
  finalizeDispatches: [
    ["APPLY", "w1", {derived: {code: "K"}}], ["APPLY", "w1", {derived: {}}], ["ERROR", "w1", {errorCode: "DEF", errorMessage: "msg"}],
    ["ERROR", "w1", {errorCode: "OWN", errorMessage: "own"}]
  ]
};

const ENVELOPE_KEYS = ["ok", "outcome", "reason", "widgetId", "opSeq", "skipped", "stale", "status", "ready", "reportToSettings",
  "errorCode", "errorMessage", "diagnostics"];

function envelope(partial) {
  return Object.assign({
    ok: false, outcome: undefined, reason: undefined, widgetId: undefined, opSeq: undefined, skipped: false, stale: false,
    status: null, ready: false, reportToSettings: undefined, errorCode: undefined, errorMessage: undefined, diagnostics: undefined
  }, partial);
}

test("normalizeDispatchResult: frozen envelope, boolean coercion, extra fields stripped", () => {
  const { normalizeDispatchResult } = loadCore();
  const diag = { a: 1 };
  const report = { control: "x" };
  const cases = [
    [undefined, envelope({})],
    [null, envelope({})],
    [{}, envelope({})],
    [{ ok: true }, envelope({ ok: true })],
    [{ ok: "true", skipped: 1, stale: "yes", ready: 1 }, envelope({})],
    [{ ok: true, skipped: true, stale: true, ready: true, status: "" }, envelope({ ok: true, skipped: true, stale: true, ready: true })],
    [{ ok: false, outcome: "aborted", reason: "disposed", widgetId: "w1", opSeq: 3, status: "aborted", errorCode: "E", errorMessage: "M",
      reportToSettings: report, diagnostics: diag, bound: true, degraded: true, broadcast: true, fanOutCount: 4 },
    envelope({ outcome: "aborted", reason: "disposed", widgetId: "w1", opSeq: 3, status: "aborted", errorCode: "E", errorMessage: "M",
      reportToSettings: report, diagnostics: diag })]
  ];
  for (const [input, expected] of cases) {
    const actual = normalizeDispatchResult(input);
    assert.deepEqual(Object.keys(actual), ENVELOPE_KEYS);
    assert.deepStrictEqual(actual, expected);
  }
  const same = normalizeDispatchResult({ ok: true, diagnostics: diag, reportToSettings: report });
  assert.equal(same.diagnostics, diag);
  assert.equal(same.reportToSettings, report);
});

test("ACTION_TYPES: 27 original keys unchanged, RECORD_REMOVED added", () => {
  const { ACTION_TYPES } = loadCore();
  const { RECORD_REMOVED, ...original } = ACTION_TYPES;
  assert.equal(RECORD_REMOVED, "widgetVis/recordRemoved");
  assert.deepStrictEqual(json(original), {
    MOUNT_STARTED: "widgetVis/mountStarted",
    MOUNT_SUCCEEDED: "widgetVis/mountSucceeded",
    REGISTER_CONTENT: "widgetVis/registerContent",
    MARK_PENDING: "widgetVis/markPending",
    APPLY_SUCCEEDED: "widgetVis/applySucceeded",
    CLEANUP_SUCCEEDED: "widgetVis/cleanupSucceeded",
    MAXIMIZE_SUCCEEDED: "widgetVis/maximizeSucceeded",
    ERROR_RECORDED: "widgetVis/errorRecorded",
    DESTROY: "widgetVis/destroy",
    CONTENT_CREATE: "widgetVis/contentCreate",
    WAIT_UNTIL_CONTENT_READY: "widgetVis/waitUntilContentReady",
    APPLY_STARTUP_SETTINGS: "widgetVis/applyStartupSettings",
    APPLY_DIMENSION: "widgetVis/applyDimension",
    APPLY_VIS_TYPE: "widgetVis/applyVisType",
    APPLY_TOPN_CHOICE: "widgetVis/applyTopNChoice",
    APPLY_SHOW_VALUES: "widgetVis/applyShowValues",
    APPLY_GROUPING: "widgetVis/applyGrouping",
    APPLY_ITERATOR_ZOOM: "widgetVis/applyIteratorZoom",
    TOPN_RESOLVED: "widgetVis/topNResolved",
    DIENSTSTELLE_CHANGED: "widgetVis/dienststelleChanged",
    CLEANUP_CONTENT: "widgetVis/cleanupContent",
    DISPOSE_WIDGET_RUNTIME: "widgetVis/disposeWidgetRuntime",
    ENSURE_OBSERVERS: "widgetVis/ensureObservers",
    PARAMETER_SET_CANCEL_BINDINGS: "widgetVis/parameterSetCancelBindingsRequested",
    PARAMETER_SET_BINDING: "widgetVis/parameterSetBindingRequested",
    MAXIMIZE_TOGGLE: "widgetVis/maximizeToggle",
    ERROR: "widgetVis/error"
  });
});

test("reducer: initial state, identity on no-op actions", () => {
  const core = loadCore();
  const reducer = core.createWidgetVisReducer();
  const state = reducer(undefined, { type: "unknown" });
  assert.deepStrictEqual(state, core.createInitialWidgetVisState());
  assert.equal(reducer(state, { type: "unknown" }), state);
  assert.equal(reducer(state, { type: core.ACTION_TYPES.MARK_PENDING, widgetId: "nope", payload: {} }), state);
  assert.equal(reducer(undefined, undefined).lifecycle, "idle");
});

test("reducer: RECORD_REMOVED prunes only the named record", () => {
  const core = loadCore();
  const T = core.ACTION_TYPES;
  const reducer = core.createWidgetVisReducer();
  let state = reducer(undefined, { type: T.REGISTER_CONTENT, widgetId: "w1", payload: { record: { derived: { code: "K1" } } } });
  state = reducer(state, { type: T.REGISTER_CONTENT, widgetId: "w2", payload: { record: { derived: { code: "K2" } } } });
  const pruned = reducer(state, { type: T.RECORD_REMOVED, widgetId: "w1" });
  assert.deepStrictEqual(Object.keys(pruned.byId), ["w2"]);
  assert.deepStrictEqual(Object.keys(state.byId), ["w1", "w2"]);
  assert.equal(reducer(pruned, { type: T.RECORD_REMOVED, widgetId: "w1" }), pruned);
  assert.equal(reducer(pruned, { type: T.RECORD_REMOVED }), pruned);
});

test("cloneState: deep JSON copy, throws on cycles", () => {
  const { cloneState } = loadCore();
  const src = { a: [1, { b: 2 }] };
  const copy = cloneState(src);
  assert.deepStrictEqual(copy, src);
  assert.notEqual(copy.a, src.a);
  assert.equal(cloneState(null), null);
  assert.equal(cloneState(undefined), undefined);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => cloneState(cyclic), TypeError);
});

test("selectors: readVisRecord returns the stored record, readVisMaximized", () => {
  const { selectors } = loadCore();
  const record = { widgetId: "w1", maximized: true, derived: { code: "K" } };
  const _KDB = { state: { widgets: { vis: { byId: { w1: record, w2: { maximized: "yes" } } } } } };
  assert.equal(selectors.readVisRecord(_KDB, "w1"), record);
  assert.equal(selectors.readVisRecord(_KDB, "nope"), undefined);
  assert.equal(selectors.readVisRecord({}, "w1"), undefined);
  assert.equal(selectors.readVisMaximized(_KDB, "w1"), true);
  assert.equal(selectors.readVisMaximized(_KDB, "w2"), false);
  assert.equal(selectors.readVisMaximized(_KDB, "nope"), false);
});

test("contentReady: isContentReady and getContentReadyTimeoutMs", () => {
  const core = loadCore();
  const kdb = (derived, opSeq) => ({
    state: { widgets: { vis: { byId: { w: { derived } } } } },
    runtime: { widgetVis: { byId: { w: { opSeq } } } }
  });
  assert.equal(core.isContentReady(kdb({ code: "K" }, 0), "w"), true);
  assert.equal(core.isContentReady(kdb({ kennzahlCode: "K", datasourceName: "D" }, 1), "w"), true);
  assert.equal(core.isContentReady(kdb({ code: "" }, 0), "w"), false);
  assert.equal(core.isContentReady(kdb({ code: "K" }, undefined), "w"), false);
  assert.equal(core.isContentReady({}, "w"), false);
  assert.deepStrictEqual([undefined, {}, { timeoutMs: 0 }, { timeoutMs: -1 }, { timeoutMs: "9" }, { timeoutMs: 250 }].map(core.getContentReadyTimeoutMs),
    [3000, 3000, 3000, 3000, 3000, 250]);
});

test("recorded outputs: reducer sequence, results, visTypes x grain, bindingConfig, metric identity, years", () => {
  const actual = computeFixtures(loadCore());
  assert.deepStrictEqual(Object.keys(actual).sort(), Object.keys(FIXTURES).sort());
  for (const key of Object.keys(actual)) {
    assert.deepStrictEqual(actual[key], FIXTURES[key], key);
  }
});

test("resolveBindingContext: derived definition keys equal the visTypes resolvers", () => {
  const core = loadCore();
  const _KDB = buildKdb();
  for (const type of VIS_TYPES) {
    const ctx = core.bindingConfig.resolveBindingContext(_KDB, { visualizationType: type });
    if (!(DEAD_CONTEXT_KEYS[0] in ctx)) continue;
    const visualizationType = type || core.visTypes.resolveDefaultVisualizationType(_KDB);
    assert.deepStrictEqual(ctx.visualizationDefinition, core.visTypes.resolveVisualizationDefinition(visualizationType, _KDB));
    assert.deepStrictEqual(ctx.propertyValues, core.visTypes.resolveVisualizationPropertyValues(visualizationType, _KDB));
    assert.deepStrictEqual(ctx.layoutPropertyValues, core.visTypes.resolveVisualizationLayoutPropertyValues(visualizationType, _KDB));
  }
});

test("years: parseYear first vs last, parseYearFromCell cells, first equals readConfirmedJahrYear", () => {
  const { years, readConfirmedJahrYear } = loadCore();
  const texts = [null, "", "  2024  ", "abc", "Jahr 2019 bis 2021", "Jahr 1899 bis 2021", "20221", "12345", 2100, 2101, "x 2101", "1899",
    "2019/2020/2023"];
  assert.deepStrictEqual(texts.map((t) => [years.parseYear(t, { match: "first" }), years.parseYear(t, { match: "last" }), years.parseYear(t)]), [
    [null, null, null], [null, null, null], [2024, 2024, 2024], [null, null, null], [2019, 2021, 2019], [null, 2021, null],
    [2022, 2022, 2022], [null, null, null], [2100, 2100, 2100], [null, null, null], [null, null, null], [null, null, null], [2019, 2019, 2019]
  ]);
  for (const t of texts) assert.equal(years.parseYear(t, { match: "first" }), readConfirmedJahrYear([t]), String(t));
  const cells = [null, undefined, "", 2020, "2020", " 2021 ", "Jahr 2019 bis 2021", "2019 bis 2021", "12345", "20221", "2101", 1900, 2100,
    false, 0, "abc", { d: "x", u: "2018" }, { display: "FY 2017" }, { d: "", displayValue: "1899", useValue: "2005" }, {}, { d: 2016 },
    { use: "bis 2010 und 2012" }];
  assert.deepStrictEqual(cells.map(years.parseYearFromCell),
    [null, null, null, 2020, 2020, 2021, 2021, 2019, null, 2022, null, 1900, 2100, null, null, null, 2018, 2017, 2005, null, 2016, 2012]);
});

test("published selectors: action types and bucket key equal the leaves", () => {
  const state = load(W + "state.js");
  const visTypes = load(W + "visTypes.js");
  const published = load(W + "selectors.js");
  assert.deepStrictEqual(json(published.ACTION_TYPES), json(state.ACTION_TYPES));
  assert.equal(published.readVisPropBucketKey({}, "Line"), visTypes.resolveVisPropBucketKey("Line", {}));
});

test("widgetDataTable: mount, dispatch, destroy, dispatch after destroy, getState", () => {
  const register = loadDataTable();
  const _KDB = {};
  const api = register(_KDB, {});
  assert.equal(_KDB.api.widgetDataTable, api);
  assert.deepStrictEqual(Object.keys(api).sort(), ["destroy", "dispatch", "getState", "mount"]);
  assert.deepStrictEqual(api.getState(), { lifecycle: "idle", byId: {}, errorCode: null, errorMessage: null });
  assert.equal(api.mount({}), true);
  assert.deepStrictEqual(api.getState(), { lifecycle: "ready", byId: {}, errorCode: null, errorMessage: null });
  assert.notEqual(api.getState(), _KDB.state.widgets.dataTable);
  assert.deepStrictEqual(api.dispatch({ type: "widgetDataTable/contentCreate", widgetId: "w" }),
    { ok: true, skipped: true, reasonCode: "SCAFFOLD_NOOP", actionType: "widgetDataTable/contentCreate" });
  assert.deepStrictEqual(api.dispatch(undefined), { ok: true, skipped: true, reasonCode: "SCAFFOLD_NOOP", actionType: null });
  api.destroy();
  assert.equal(_KDB.state.widgets.dataTable.lifecycle, "disposed");
  assert.equal(api.getState(), undefined);
  assert.deepStrictEqual(api.dispatch({ type: "x" }), { ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" });
  assert.equal(api.mount({}), false);
  api.destroy();
  assert.equal(_KDB.state.widgets.dataTable.lifecycle, "disposed");
});

const QUIET_CONSOLE = { error() {}, warn() {}, log() {} };
const FAKE_DOCUMENT = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };

function loadIndex() {
  return load(W + "index.js", { stubs: { document: FAKE_DOCUMENT, window: {}, console: QUIET_CONSOLE } });
}

function createTrace() {
  const calls = [];
  const record = (name, result) => (...args) => {
    calls.push(name);
    return typeof result === "function" ? result(...args) : result;
  };
  return { calls, record };
}

function loadLifecycle(trace, overrides) {
  const gates = {
    cancelGateWaitersForWidget: trace.record("cancelGateWaiters", { dienststelleCancelled: 2, topNCancelled: false }),
    rejectAllGateWaiters: trace.record("rejectAllGateWaiters")
  };
  const focus = {
    exitNativeFocus: trace.record("exitNativeFocus"),
    disposeFocusMode: trace.record("disposeFocusMode", { ok: true, diagnostics: { disposed: true } })
  };
  const legend = {
    sweepLegendCaptions: trace.record("sweepLegend", { action: "swept" }),
    disconnectLegendTextObserver: trace.record("disconnectLegend", { disconnected: true })
  };
  const modules = Object.assign({
    "./binding/pipeline.js": { runBindingPipeline: trace.record("runBindingPipeline", () => Promise.resolve({ ok: true, derived: { titleText: "X" } })) },
    "./binding/gates.js": gates,
    "./focus/maximizeToggle.js": { ensureFocusObserver: trace.record("ensureFocusObserver", { ok: true, diagnostics: { observerInstalled: true } }) },
    "./focus/maximizeIcon.js": { installCanvasMaximize: trace.record("installMaximize", { ok: true }) },
    "./focus/focusMode.js": focus,
    "./drillthrough/install.js": {
      installDrillthrough: trace.record("installDrillthrough", { ok: true }),
      installContentDecorations: trace.record("installContentDecorations")
    },
    "./legend/sweep.js": legend
  }, overrides || {});
  return load(W + "lifecycle.js", { modules, stubs: { document: FAKE_DOCUMENT, console: QUIET_CONSOLE } });
}

function createWidgetKdb(widgetIds) {
  const state = load(W + "state.js");
  const runtime = load(W + "runtime.js");
  const reducer = state.createWidgetVisReducer();
  let vis = state.createInitialWidgetVisState();
  widgetIds.forEach((id) => {
    vis = reducer(vis, { type: state.ACTION_TYPES.REGISTER_CONTENT, widgetId: id, payload: { record: { derived: { code: "K-" + id } } } });
  });
  const _KDB = { state: { widgets: { vis } }, runtime: {}, api: {} };
  widgetIds.forEach((id) => runtime.ensureWidgetRuntime(_KDB, id));
  return { _KDB, state, runtime, reducer };
}

function createContext(_KDB, extra) {
  const context = load(W + "context.js");
  return Object.assign(context.createDetachedContext(_KDB), extra || {});
}

test("ensureWidgetRuntime: standard buckets plus owner fields, repeated calls keep the runtime and facet stamps", () => {
  const { _KDB, runtime } = createWidgetKdb([]);
  _KDB.runtime.widgetVis = { visualizationFacet: { marker: 1 } };
  const first = runtime.ensureWidgetRuntime(_KDB, "w1");
  assert.deepStrictEqual(Object.keys(first).sort(), [
    "abortControllers", "domRefs", "drillthrough", "focusMode", "lastAppliedVisPropertiesType", "lastSuccessfulPlan", "listeners",
    "managedFilterItemIds", "observers", "opSeq", "pendingPromises", "subscriptions", "timers"
  ]);
  assert.deepStrictEqual(Object.keys(first.domRefs), ["contentEl", "headerEl", "titleLinkEl", "drillthroughIconEl", "datapointDrillthroughIconEl",
    "canvasMaximizeIconEl"]);
  assert.equal(runtime.ensureWidgetRuntime(_KDB, "w1"), first);
  assert.equal(runtime.readWidgetRuntime(_KDB, "w1"), first);
  assert.equal(runtime.readWidgetRuntime(_KDB, "nope"), null);
  assert.equal(_KDB.runtime.widgetVis.visualizationFacet.marker, 1);
  assert.equal(runtime.readHostFacet(_KDB, "visualizationFacet").marker, 1);
  assert.equal(runtime.readHostFacet(_KDB, "filtersFacet"), null);
  assert.equal(runtime.initializeRuntime(_KDB).enableDrillthrough, true);
  first.focusMode = null;
  assert.equal(runtime.ensureWidgetRuntime(_KDB, "w1").focusMode.observedExpanded, false);
});

test("lifecycle: content ready waiter resolves, times out and is rejected by dispose", async () => {
  const trace = createTrace();
  const lifecycle = loadLifecycle(trace);
  const { _KDB, runtime } = createWidgetKdb(["w1"]);
  assert.deepStrictEqual(await lifecycle.handleWaitUntilContentReady(createContext(_KDB), { widgetId: "w1" }),
    envelope({ ok: true, widgetId: "w1", ready: true }));
  assert.equal(runtime.isContentReady(_KDB, "w1"), true);

  const unregistered = createWidgetKdb([]);
  const waiting = lifecycle.handleWaitUntilContentReady(createContext(unregistered._KDB), { widgetId: "w9", payload: { timeoutMs: 5 } });
  const pending = unregistered._KDB.runtime.widgetVis.byId.w9.pendingPromises;
  assert.ok(pending.contentReady.timerId);
  const timedOut = await waiting;
  assert.deepStrictEqual([timedOut.ok, timedOut.status, timedOut.errorCode], [false, "timeout", "WIDGET_VIS_CONTENT_READY_TIMEOUT"]);
  assert.equal(pending.contentReady, null);

  const pendingKdb = createWidgetKdb([]);
  const ctx3 = createContext(pendingKdb._KDB);
  const first = lifecycle.handleWaitUntilContentReady(ctx3, { widgetId: "wx", payload: { timeoutMs: 5000 } });
  const second = lifecycle.handleWaitUntilContentReady(ctx3, { widgetId: "wx" });
  lifecycle.disposeWidgetRuntime(pendingKdb._KDB, "wx", {});
  const results = await Promise.all([first, second]);
  assert.deepStrictEqual(results.map((r) => [r.ok, r.status, r.errorCode]), [[false, "cancelled", "WIDGET_VIS_WIDGET_DISPOSED"],
    [false, "cancelled", "WIDGET_VIS_WIDGET_DISPOSED"]]);

  const disposed = await lifecycle.handleWaitUntilContentReady(Object.assign({}, ctx3, { isDisposed: true }), { widgetId: "wy" });
  assert.equal(disposed.errorCode, "WIDGET_VIS_DESTROY_FAILED");
});

test("lifecycle: dispose order, bucket teardown, record kept on transfer and rollback, pruned on remove", async () => {
  const trace = createTrace();
  const lifecycle = loadLifecycle(trace);
  for (const reason of ["transfer", "rollback", "remove", undefined]) {
    trace.calls.length = 0;
    const { _KDB, state } = createWidgetKdb(["w1", "w2"]);
    const widgetRuntime = _KDB.runtime.widgetVis.byId.w1;
    const released = [];
    widgetRuntime.timers.pending = Number(setTimeout(() => released.push("timer-fired"), 20));
    widgetRuntime.listeners.click = () => released.push("listener");
    widgetRuntime.observers.legend = { disconnect: () => released.push("observer") };
    widgetRuntime.abortControllers.apply = { abort: () => released.push("abort") };
    const context = createContext(_KDB);
    const result = lifecycle.handleDisposeWidgetRuntime(context, { type: state.ACTION_TYPES.DISPOSE_WIDGET_RUNTIME, widgetId: "w1", payload: { reason } });
    assert.deepStrictEqual(trace.calls, ["cancelGateWaiters", "exitNativeFocus", "disposeFocusMode", "disconnectLegend"]);
    assert.deepStrictEqual(released.sort(), ["abort", "listener", "observer"]);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.ok(!released.includes("timer-fired"));
    assert.equal(result.ok, true);
    assert.equal(result.skipped, undefined);
    assert.deepStrictEqual(Object.keys(result.diagnostics), ["reason", "dienststelleWaitersCancelled", "focusMode", "legendObserver"]);
    assert.equal(result.diagnostics.reason, reason || null);
    assert.equal(result.diagnostics.dienststelleWaitersCancelled, 2);
    assert.deepStrictEqual(result.diagnostics.legendObserver, { disconnected: true });
    assert.equal(_KDB.runtime.widgetVis.byId.w1, undefined);
    assert.ok(_KDB.runtime.widgetVis.byId.w2);
    assert.equal(Object.keys(_KDB.state.widgets.vis.byId).includes("w1"), reason !== "remove");
    assert.ok(_KDB.state.widgets.vis.byId.w2);
  }
});

test("lifecycle: dispose of an unknown runtime is a skipped success, a missing widget id an error", () => {
  const trace = createTrace();
  const lifecycle = loadLifecycle(trace);
  const { _KDB } = createWidgetKdb(["w1"]);
  const context = createContext(_KDB);
  const skipped = lifecycle.handleDisposeWidgetRuntime(context, { widgetId: "nope", payload: { reason: "remove" } });
  assert.deepStrictEqual([skipped.ok, skipped.skipped, skipped.status, skipped.diagnostics.reason], [true, true, "success", "remove"]);
  assert.deepStrictEqual(trace.calls, ["cancelGateWaiters"]);
  assert.deepStrictEqual(lifecycle.handleDisposeWidgetRuntime(context, { payload: {} }), { ok: false, errorCode: "WIDGET_VIS_WIDGET_ID_MISSING" });
  assert.deepStrictEqual(lifecycle.handleEnsureObservers(context, {}), { ok: false, errorCode: "WIDGET_VIS_WIDGET_ID_MISSING" });
  assert.deepStrictEqual(lifecycle.handleEnsureObservers(context, { widgetId: "nope" }), { ok: true, skipped: true, widgetId: "nope", status: "success" });
  const noRoot = createWidgetKdb([]);
  noRoot._KDB.runtime = {};
  const bare = lifecycle.handleDisposeWidgetRuntime(createContext(noRoot._KDB), { widgetId: "w9" });
  assert.deepStrictEqual([bare.ok, bare.skipped, bare.diagnostics], [true, true, { reason: null }]);
});

test("lifecycle: ensureObservers rebuilds focus, legend, drillthrough and maximize in order", () => {
  const trace = createTrace();
  const lifecycle = loadLifecycle(trace);
  const { _KDB } = createWidgetKdb(["w1"]);
  const result = lifecycle.handleEnsureObservers(createContext(_KDB), { widgetId: "w1" });
  assert.deepStrictEqual(trace.calls, ["ensureFocusObserver", "sweepLegend", "installDrillthrough", "installMaximize"]);
  assert.deepStrictEqual(result, {
    ok: true,
    widgetId: "w1",
    status: "success",
    errorCode: undefined,
    diagnostics: { focus: { observerInstalled: true }, legend: { action: "swept" }, drillthrough: { ok: true }, maximize: { ok: true } }
  });
  const failing = loadLifecycle(createTrace(), {
    "./drillthrough/install.js": { installDrillthrough() { throw new Error("boom"); }, installContentDecorations() {} },
    "./legend/sweep.js": { sweepLegendCaptions() { throw new Error("sweep"); }, disconnectLegendTextObserver: () => ({ disconnected: true }) }
  });
  const degraded = failing.handleEnsureObservers(createContext(_KDB), { widgetId: "w1" });
  assert.equal(degraded.ok, true);
  assert.deepStrictEqual(degraded.diagnostics.drillthrough, { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" });
  assert.deepStrictEqual(degraded.diagnostics.legend, { action: "failed", error: "sweep" });
  const focusFailed = loadLifecycle(createTrace(), {
    "./focus/maximizeToggle.js": { ensureFocusObserver: () => ({ ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED" }) }
  }).handleEnsureObservers(createContext(_KDB), { widgetId: "w1" });
  assert.deepStrictEqual([focusFailed.ok, focusFailed.status, focusFailed.errorCode], [false, "error", "WIDGET_VIS_MAXIMIZE_FAILED"]);
});

test("lifecycle: contentCreate registers the record, installs decorations and binds only on explicit intent", async () => {
  const trace = createTrace();
  const lifecycle = loadLifecycle(trace);
  const { _KDB } = createWidgetKdb([]);
  _KDB.state.widgets.vis = load(W + "state.js").createInitialWidgetVisState();
  const context = createContext(_KDB);
  const missing = await lifecycle.handleContentCreate(context, { widgetId: "w1", payload: {} });
  assert.deepStrictEqual([missing.ok, missing.status, missing.errorCode], [false, "error", "WIDGET_VIS_CONTENT_CREATE_FAILED"]);

  const plain = await lifecycle.handleContentCreate(context, { widgetId: "w1", opSeq: 4, payload: { metric: { code: "K1", display: "Kennzahl" } } });
  assert.deepStrictEqual([plain.ok, plain.status, plain.opSeq], [true, "success", 4]);
  assert.deepStrictEqual(trace.calls, ["ensureFocusObserver", "installContentDecorations"]);
  const record = _KDB.state.widgets.vis.byId.w1;
  assert.deepStrictEqual([record.derived.code, record.derived.titleText, record.derived.datasourceName], ["K1", "Kennzahl", null]);

  trace.calls.length = 0;
  const bound = await lifecycle.handleContentCreate(context, {
    widgetId: "w1", opSeq: 5, payload: { metric: { code: "K1" }, initialSettings: { dimension: "d1" } }
  });
  assert.deepStrictEqual(trace.calls, ["ensureFocusObserver", "installContentDecorations", "runBindingPipeline"]);
  assert.deepStrictEqual([bound.ok, _KDB.state.widgets.vis.byId.w1.derived.titleText, _KDB.state.widgets.vis.byId.w1.pending], [true, "X", { kind: null, opSeq: null }]);
});

test("lifecycle: disposeModuleRuntime rejects waiters, disposes every widget, clears module buckets and the runtime root", async () => {
  const trace = createTrace();
  const lifecycle = loadLifecycle(trace);
  const { _KDB } = createWidgetKdb(["w1", "w2"]);
  const root = _KDB.runtime.widgetVis;
  const released = [];
  root.subscriptions.bus = () => released.push("subscription");
  root.observers.focusMode = { disconnect: () => released.push("observer") };
  root.timers.focusCheck = { kind: "timeout", id: Number(setTimeout(() => released.push("timer-fired"), 20)) };
  const waiting = lifecycle.handleWaitUntilContentReady(createContext(_KDB), { widgetId: "w3", payload: { timeoutMs: 5000 } });
  lifecycle.disposeModuleRuntime(_KDB);
  const result = await waiting;
  assert.deepStrictEqual([result.ok, result.status, result.errorCode, result.errorMessage], [false, "error", "WIDGET_VIS_DESTROY_FAILED", "widgetVis destroyed."]);
  assert.equal(trace.calls[0], "rejectAllGateWaiters");
  assert.equal(trace.calls.filter((name) => name === "exitNativeFocus").length, 0);
  assert.equal(trace.calls.filter((name) => name === "disposeFocusMode").length, 3);
  assert.deepStrictEqual(released.sort(), ["observer", "subscription"]);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.ok(!released.includes("timer-fired"));
  assert.deepStrictEqual(_KDB.runtime.widgetVis, {});
});

test("cleanup: decoration-only, semantic empty, technical reset and failure mapping", async () => {
  const pipelineInputs = [];
  let pipelineResult = { ok: true, derived: { lastAppliedVisType: "Line" }, diagnostics: { p: 1 } };
  let decorationResult = { ok: true, diagnostics: { removed: 3 } };
  const { handleCleanupContent } = load(W + "cleanup.js", {
    modules: {
      "./binding/pipeline.js": { runBindingPipeline: (ctx, input) => { pipelineInputs.push(input); return Promise.resolve(pipelineResult); } },
      "./render/postRender.js": { cleanupVisualizationContent: () => decorationResult }
    }
  });
  const topNCalls = [];
  const setup = () => {
    const { _KDB } = createWidgetKdb(["w1"]);
    _KDB.api.widgetTopN = { dispatch: (action) => { topNCalls.push(action); return { ok: true }; } };
    return { _KDB, context: createContext(_KDB) };
  };
  const run = (context, payload) => handleCleanupContent(context, { type: "widgetVis/cleanupContent", widgetId: "w1", opSeq: 7, payload });

  let { _KDB, context } = setup();
  let result = await run(context, { reason: "settingsDelete" });
  assert.deepStrictEqual(pipelineInputs, []);
  assert.deepStrictEqual([result.ok, result.opSeq, result.diagnostics], [true, 7, { cleanup: { removed: 3 } }]);
  assert.deepStrictEqual(topNCalls[0], {
    type: "widgetTopN/cleanup", widgetId: "w1",
    payload: { ownerVisId: "w1", reason: "settingsDelete", clearHelperBinding: true, releaseClaim: false }
  });
  assert.deepStrictEqual([_KDB.state.widgets.vis.byId.w1.derived.emptyStatus, _KDB.state.widgets.vis.byId.w1.maximized], [null, false]);

  ({ _KDB, context } = setup());
  result = await run(context, { reason: "remove", clearBinding: true });
  assert.equal(topNCalls[1].payload.releaseClaim, true);
  assert.equal(pipelineInputs.length, 1);
  const forced = pipelineInputs[0];
  assert.deepStrictEqual([forced.reason, forced.mode, forced.forceEmpty, forced.emptyReason, forced.emptyIntent, forced.resetIntent],
    ["cleanup", "cleanup", true, "remove", undefined, undefined]);
  assert.deepStrictEqual(Object.keys(forced.metric).sort(), ["code", "display", "metricsTable"]);
  assert.deepStrictEqual([result.ok, _KDB.state.widgets.vis.byId.w1.derived.emptyStatus, _KDB.state.widgets.vis.byId.w1.derived.emptyReason],
    [true, "intentional", "remove"]);

  for (const reason of ["settingsDelete", "parameterSetReset"]) {
    ({ _KDB, context } = setup());
    pipelineInputs.length = 0;
    result = await run(context, { reason, clearBinding: true });
    const reset = pipelineInputs[0];
    assert.deepStrictEqual([reset.mode, reset.forceEmpty, reset.emptyIntent, reset.resetIntent], ["cleanup", undefined,
      { enabled: false, reason: null, itemId: null, value: null },
      { enabled: true, scope: "visTarget", clearAllSlots: true, clearAllLocalFilters: true, reason }]);
    assert.equal(_KDB.state.widgets.vis.byId.w1.derived.emptyStatus, reason === "settingsDelete" ? null : "intentional");
  }

  ({ _KDB, context } = setup());
  pipelineResult = { ok: false, errorCode: "WIDGET_VIS_BINDING_APPLY_FAILED", errorMessage: "bad" };
  result = await run(context, { reason: "x", clearBinding: true });
  assert.deepStrictEqual([result.ok, result.errorCode, result.opSeq], [false, "WIDGET_VIS_EMPTY_APPLY_FAILED", 7]);
  assert.deepStrictEqual([_KDB.state.widgets.vis.byId.w1.errorCode, _KDB.state.widgets.vis.byId.w1.errorMessage], ["WIDGET_VIS_EMPTY_APPLY_FAILED", "bad"]);
  pipelineResult = { ok: false };
  result = await run(setup().context, { reason: "x", clearBinding: true });
  assert.equal(result.errorCode, "WIDGET_VIS_CLEANUP_FAILED");
  pipelineResult = { ok: false, stale: true, status: "aborted", opSeq: 7 };
  result = await run(setup().context, { clearBinding: true });
  assert.deepStrictEqual([result.ok, result.stale, result.status], [false, true, "aborted"]);

  decorationResult = { ok: false, errorCode: "DECO", errorMessage: "deco failed" };
  ({ _KDB, context } = setup());
  result = await run(context, {});
  assert.deepStrictEqual([result.ok, result.errorCode, _KDB.state.widgets.vis.byId.w1.errorMessage], [false, "DECO", "deco failed"]);
  decorationResult = { ok: false, stale: true };
  result = await run(setup().context, {});
  assert.deepStrictEqual([result.stale, result.status], [true, "aborted"]);
  decorationResult = null;
  result = await run(setup().context, {});
  assert.equal(result.errorCode, "WIDGET_VIS_CLEANUP_FAILED");
});

test("controller: mount, routing, unknown action, id conflict, error action, destroy, calls after destroy", async () => {
  const register = loadIndex();
  const _KDB = {
    services: { cognosHost: { visualization: { v: 1 }, widgets: { w: 1 }, filters: { f: 1 }, dataQuery: { d: 1 } }, drillthrough: { open() {} },
      tableData: { readRows() { return this === _KDB.services.tableData ? "bound" : "unbound"; } } }
  };
  const api = register(_KDB, {});
  assert.equal(_KDB.api.widgetVis, api);
  assert.deepStrictEqual(Object.keys(api), ["mount", "destroy", "dispatch", "getState"]);
  const facets = _KDB.runtime.widgetVis;
  assert.deepStrictEqual([facets.visualizationFacet, facets.widgetsFacet, facets.filtersFacet, facets.dataQueryFacet],
    [{ v: 1 }, { w: 1 }, { f: 1 }, { d: 1 }]);
  assert.equal(typeof facets.drillthroughService.open, "function");
  assert.equal(facets.tableDataReadRows(), "bound");
  assert.equal(api.mount({ enableDrillthrough: false }), true);
  assert.equal(_KDB.runtime.widgetVis.enableDrillthrough, false);
  assert.equal(_KDB.runtime.widgetVis.visualizationFacet.v, 1);
  assert.deepStrictEqual(api.getState(), { lifecycle: "ready", byId: {}, errorCode: null, errorMessage: null });
  assert.notEqual(api.getState(), _KDB.state.widgets.vis);
  assert.equal(api.mount({}), true);
  assert.equal(_KDB.runtime.widgetVis.enableDrillthrough, true);

  const unknown = await api.dispatch({ type: "widgetVis/scaffoldNoop", widgetId: "w1" });
  assert.deepStrictEqual([unknown.ok, unknown.errorCode, unknown.errorMessage], [false, "WIDGET_VIS_UNKNOWN_ACTION", "Unknown widgetVis action: widgetVis/scaffoldNoop"]);
  assert.equal((await api.dispatch(undefined)).errorCode, "WIDGET_VIS_UNKNOWN_ACTION");
  const conflict = await api.dispatch({ type: "widgetVis/contentCreate", widgetId: "a", payload: { widgetId: "b" } });
  assert.deepStrictEqual(conflict, envelope({ errorCode: "WIDGET_VIS_WIDGET_ID_CONFLICT" }));
  const errored = await api.dispatch({ type: "widgetVis/error", payload: { errorCode: "E1", errorMessage: "m" } });
  assert.deepStrictEqual([errored.ok, api.getState().errorCode], [true, "E1"]);
  const noRecord = await api.dispatch({ type: "widgetVis/maximizeToggle", widgetId: "ghost" });
  assert.equal(noRecord.ok, false);
  const missingContent = await api.dispatch({ type: "widgetVis/contentCreate", widgetId: "w1", payload: {} });
  assert.deepStrictEqual([missingContent.ok, missingContent.errorCode], [false, "WIDGET_VIS_CONTENT_CREATE_FAILED"]);

  api.destroy();
  assert.deepStrictEqual(_KDB.runtime.widgetVis, {});
  assert.equal(_KDB.state.widgets.vis.lifecycle, "disposed");
  assert.equal(api.getState(), undefined);
  assert.equal(api.mount({}), false);
  const afterDestroy = await api.dispatch({ type: "widgetVis/contentCreate", widgetId: "w1" });
  assert.deepStrictEqual(afterDestroy, envelope({ outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }));
  api.destroy();
});

test("controller: getState returns undefined when the state cannot be cloned", () => {
  const register = loadIndex();
  const _KDB = {};
  const api = register(_KDB, {});
  api.mount({});
  const cyclic = {};
  cyclic.self = cyclic;
  _KDB.state.widgets.vis.byId.w1 = cyclic;
  assert.equal(api.getState(), undefined);
});
