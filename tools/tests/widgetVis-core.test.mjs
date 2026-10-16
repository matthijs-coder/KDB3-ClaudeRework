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
  const identity = load(W + "config/visTypes/resolveVisTypeIdentity.js");
  const definitions = load(W + "config/visTypes/resolveVisualizationDefinitions.js");
  const dataTable = load(W + "config/visTypes/resolveDataTableConfig.js");
  const planConfig = load(W + "config/visTypes/resolvePlanConfig.js");
  const metricIdentity = load(W + "state/normalizeMetricIdentity.js");
  const contentReady = load(W + "runtime/contentReady.js");
  return {
    ACTION_TYPES: load(W + "config/actionTypes.js"),
    createWidgetVisReducer: load(W + "state/createWidgetVisReducer.js"),
    createInitialWidgetVisState: load(W + "state/initialState.js"),
    cloneState: load(W + "state/cloneSerializable.js"),
    normalizeMetricIdentity: metricIdentity.normalizeMetricIdentity,
    resolveMetricFromContentCreatePayload: metricIdentity.resolveMetricFromContentCreatePayload,
    selectors: load(W + "state/selectors.js"),
    normalizeDispatchResult: load(W + "actions/normalizeDispatchResult.js"),
    finalizePipelineResult: load(W + "actions/finalizePipelineResult.js"),
    reportApplyResult: load(W + "effects/reportApplyResult.js"),
    isContentReady: contentReady.isContentReady,
    getContentReadyTimeoutMs: contentReady.getContentReadyTimeoutMs,
    visTypes: {
      normalizeVisualizationType: load(W + "config/visTypes/normalizeVisualizationType.js"),
      readVisualizationsConfig: load(W + "config/visTypes/readVisualizationsConfig.js"),
      resolveDefaultVisualizationType: definitions.resolveDefaultVisualizationType,
      resolveVisualizationDefinition: definitions.resolveVisualizationDefinition,
      resolveVisualizationPropertyValues: definitions.resolveVisualizationPropertyValues,
      resolveVisualizationLayoutPropertyValues: definitions.resolveVisualizationLayoutPropertyValues,
      resolveKennzahlDefaults: definitions.resolveKennzahlDefaults,
      buildKennzahlAggregationFilter: definitions.buildKennzahlAggregationFilter,
      resolveVisPropBucketKey: identity.resolveVisPropBucketKey,
      resolveCognosVisualizationTypeId: identity.resolveCognosVisualizationTypeId,
      resolveVisTypeConfig: identity.resolveVisTypeConfig,
      resolveDefaultGrain: identity.resolveDefaultGrain,
      resolveGrainOverlay: identity.resolveGrainOverlay,
      resolveEffectiveGrain: identity.resolveEffectiveGrain,
      resolveKennzahlPack: identity.resolveKennzahlPack
    },
    bindingConfig: {
      resolveBindingContext: load(W + "config/visTypes/resolveBindingContext.js"),
      resolveVisualizationDimensions: dataTable.resolveVisualizationDimensions,
      resolveDataTableConfig: dataTable.resolveDataTableConfig,
      resolveSortingConfig: load(W + "config/visTypes/resolveSortingConfig.js"),
      resolvePlanConfigSnapshots: planConfig.resolvePlanConfigSnapshots,
      resolveDatasourceIdentity: planConfig.resolveDatasourceIdentity,
      resolveEmptyDataFilter: planConfig.resolveEmptyDataFilter,
      resolveTopNHelperListConfig: load(W + "config/visTypes/resolveTopNHelperListConfig.js"),
      resolveCurrentMetricsDataSource: load(W + "config/visTypes/resolveMetricsDataSource.js")
    },
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
  out.bindingContextDefaultType = sha(bc.resolveBindingContext(_KDB, {}));

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
  bindingContextDefaultType: "74688f076cf8fb80",
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

test("ACTION_TYPES: 27 keys, values unchanged", () => {
  const { ACTION_TYPES } = loadCore();
  assert.deepStrictEqual(json(ACTION_TYPES), {
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

test("cloneState: deep JSON copy, undefined on cycles", () => {
  const { cloneState } = loadCore();
  const src = { a: [1, { b: 2 }] };
  const copy = cloneState(src);
  assert.deepStrictEqual(copy, src);
  assert.notEqual(copy.a, src.a);
  assert.equal(cloneState(null), null);
  assert.equal(cloneState(undefined), undefined);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.equal(cloneState(cyclic), undefined);
});

test("selectors: readVisRecord returns a copy, readVisMaximized", () => {
  const { selectors } = loadCore();
  const record = { widgetId: "w1", maximized: true, derived: { code: "K" } };
  const _KDB = { state: { widgets: { vis: { byId: { w1: record, w2: { maximized: "yes" } } } } } };
  assert.deepStrictEqual(selectors.readVisRecord(_KDB, "w1"), record);
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
