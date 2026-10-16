// Clone-cost harness for P2-X4: runs the real widgetVis Dienststelle broadcast and TopN wave code against a fake _KDB
// with N widgets and counts every JSON.stringify (= cloneJson) the loaded modules perform. Only the binding pipeline,
// which talks to Cognos, is replaced; the replacement does what the real apply step does for the settings read:
// one displayOptions.overlayIteratorZoomOnLayoutMap per widget.
import path from "node:path";
import { loadAmd } from "../../lib/amd-loader.mjs";
import { JS_ROOT } from "../../lib/amd-graph.mjs";

const W = "dashboard/widgets/widgetVis/";
const QUIET = { error() {}, warn() {}, log() {} };

export function createCounter() {
  const counter = { calls: 0, bytes: 0, wholeStateCalls: 0, wholeStateBytes: 0 };
  counter.JSON = {
    parse: JSON.parse.bind(JSON),
    stringify(value, ...rest) {
      const out = JSON.stringify(value, ...rest);
      if (typeof out === "string") {
        counter.calls += 1;
        counter.bytes += out.length;
        if (out.indexOf("\"byWidget\"") !== -1) {
          counter.wholeStateCalls += 1;
          counter.wholeStateBytes += out.length;
        }
      }
      return out;
    }
  };
  counter.reset = () => { counter.calls = 0; counter.bytes = 0; counter.wholeStateCalls = 0; counter.wholeStateBytes = 0; };
  counter.snapshot = () => ({ calls: counter.calls, bytes: counter.bytes, wholeStateCalls: counter.wholeStateCalls, wholeStateBytes: counter.wholeStateBytes });
  return counter;
}

export function settingsRecord(index) {
  return {
    pending: { kind: null },
    deferred: {},
    errorCode: null,
    errorMessage: null,
    dimension: index % 2 ? "Altersgruppe" : "Geschlecht",
    dimensionMeta: { optionKey: "dim" + index, displayValue: "Dimension " + index },
    visType: "Column",
    visTypeMeta: { optionKey: "column", displayValue: "Column" },
    topNChoice: index % 3 === 0 ? "10" : "none",
    topNChoiceMeta: { optionKey: "top", displayValue: "Top" },
    iterator: index % 2 === 0,
    zoom: false,
    grouping: "jahr"
  };
}

export function createFixture(widgetCount, options) {
  const counter = (options && options.counter) || createCounter();
  const stubs = { console: QUIET, JSON: counter.JSON };
  const load = (rel, extra) => loadAmd(path.join(JS_ROOT, rel), Object.assign({ stubs }, extra || {}));
  const _KDB = { config: { options: {} }, api: {}, properties: {}, state: {}, runtime: {} };
  load("core/config/__orchestratorConfig.js")(_KDB);
  _KDB.state.widgets = { vis: { byId: {} }, base: { byId: {} } };
  const ids = [];
  for (let index = 0; index < widgetCount; index += 1) {
    const id = "w" + index;
    ids.push(id);
    _KDB.state.widgets.vis.byId[id] = { derived: { code: "P_" + index } };
    _KDB.state.widgets.base.byId[id] = { widgetId: id, kind: "vis", placement: "onCanvas", lifecycle: "mounted", tabId: "t1" };
  }
  load("dashboard/widgets/widgetSettings/index.js")(_KDB);
  ids.forEach((id, index) => { _KDB.state.widgets.settings.byWidget[id] = settingsRecord(index); });
  const displayOptions = load(W + "render/displayOptions.js");
  const fakePipeline = {
    runBindingPipeline: async (context, input) => {
      displayOptions.overlayIteratorZoomOnLayoutMap(context._KDB, input.widgetId, {}, "Column");
      return { ok: true };
    }
  };
  const visContext = load(W + "context.js");
  const dienststelle = load(W + "binding/dienststelleChanged.js", { modules: { "./pipeline.js": fakePipeline } });
  const wave = load(W + "topN/wave.js", {
    modules: {
      "../binding/pipeline.js": fakePipeline,
      "./periodPin.js": { applyTopNJahrMismatchPin: async () => null, readConfirmedJahrYear: () => null }
    }
  });
  return { _KDB, counter, ids, load, visContext, dienststelle, wave, displayOptions };
}

const HIERARCHY = {
  activeDownstreamName: "Dienststelle_Ebene",
  hierarchyItemId: 42,
  resolution: { hasConfirmedSelection: true, downstreamValues: ["A"], dominantValues: [], displayValues: ["A"] }
};

export async function runDienststelleBroadcast(fixture) {
  const context = fixture.visContext.createDetachedContext(fixture._KDB);
  fixture.counter.reset();
  const result = await fixture.dienststelle.broadcastDienststelleChanged(context, { type: "x", payload: { hierarchySnapshot: HIERARCHY } });
  return { result, cost: fixture.counter.snapshot() };
}

export async function runTopNWave(fixture) {
  fixture.counter.reset();
  const result = await fixture.wave.runTopNFilterConfirmWave(fixture._KDB, { scopeType: "pageContext", tabId: "t1", isJahr: false });
  return { result, cost: fixture.counter.snapshot() };
}

export async function measureAll(widgetCount) {
  const broadcast = await runDienststelleBroadcast(createFixture(widgetCount));
  const wave = await runTopNWave(createFixture(widgetCount));
  return { widgetCount, broadcast, wave };
}
