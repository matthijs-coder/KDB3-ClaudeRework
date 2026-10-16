// core/utils/readHostFacet.js against the bodies of the read*Facet copies it replaces (W3, additive).
// The reference functions below are the old copies verbatim (variable names aside); the util must agree on every shape.
// Run: node --test tools/tests/w3-readHostFacet.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const util = loadAmd(path.join(JS_ROOT, "core/utils/readHostFacet.js"));

// Shape A: services.cognosHost[name]
const hostCopies = {
  "dienststelle/index.js, nativeMultiSelect/index.js readHostFacet": (_KDB, name) => {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service[name] ? service[name] : null;
  },
  "singleSelect/index.js readHostFiltersFacet (name: filters)": (_KDB) => {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.filters ? service.filters : null;
  },
  "messageService/index.js readMessagesFacet (name: messages)": (_KDB) => {
    var host = _KDB.services ? _KDB.services.cognosHost : null;
    return host && host.messages ? host.messages : null;
  },
  "filterRef.js, createRunContext.js readFiltersFacet (name: filters)": (_KDB) => {
    var service = _KDB && _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.filters ? service.filters : null;
  }
};

// Shape B: runtime[owner][name]
const stampedCopies = {
  "widgetBase/effects.js readHostFacet (owner widgetBase)": (_KDB, facetKey) => {
    const runtime = _KDB && _KDB.runtime ? _KDB.runtime.widgetBase : null;
    return runtime && runtime[facetKey] ? runtime[facetKey] : null;
  },
  "widgetVis/runtime.js readHostFacet (owner widgetVis)": (_KDB, name) => {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    return rt && rt[name] ? rt[name] : null;
  },
  "launchpad/buildLaunchpadTabs.js readFacet (owner launchpad)": (_KDB, facetName) => {
    const runtime = _KDB && _KDB.runtime ? _KDB.runtime.launchpad : null;
    return runtime && runtime[facetName] ? runtime[facetName] : null;
  },
  "homeDialog readStampedDashboardFacet (owner homeDialog, dashboardFacet)": (_KDB) => {
    var runtime = _KDB.runtime && _KDB.runtime.homeDialog;
    return runtime && runtime.dashboardFacet ? runtime.dashboardFacet : null;
  }
};

const facet = { op() {} };
const kdbShapes = {
  "no services": {},
  "services without cognosHost": { services: {} },
  "cognosHost without facets": { services: { cognosHost: {} } },
  "falsy facet": { services: { cognosHost: { filters: 0, messages: "", tabs: null } } },
  "facets present": { services: { cognosHost: { filters: facet, messages: facet, tabs: facet, dashboard: facet } } }
};
const runtimeShapes = {
  "no runtime": {},
  "runtime without owners": { runtime: {} },
  "owner without facet": { runtime: { widgetBase: {}, widgetVis: {}, launchpad: {}, homeDialog: {} } },
  "falsy facet": { runtime: { widgetBase: { widgetsFacet: null }, homeDialog: { dashboardFacet: 0 } } },
  "facets present": {
    runtime: {
      widgetBase: { widgetsFacet: facet, canvasFacet: facet },
      widgetVis: { widgetsFacet: facet, visualizationFacet: facet },
      launchpad: { tabsFacet: facet },
      homeDialog: { dashboardFacet: facet }
    }
  }
};

test("readHostFacet equals every services.cognosHost copy on every shape", () => {
  for (const [copyName, copy] of Object.entries(hostCopies)) {
    const names = copyName.includes("(name: ") ? [copyName.match(/name: (\w+)/)[1]] : ["filters", "messages", "tabs", "dashboard", "missing"];
    for (const [shapeName, kdb] of Object.entries(kdbShapes)) {
      for (const name of names) {
        assert.equal(util.readHostFacet(kdb, name), copy(kdb, name), `${copyName} / ${shapeName} / ${name}`);
      }
    }
  }
});

test("readStampedFacet equals every runtime-owner copy on every shape", () => {
  const owners = {
    "widgetBase/effects.js readHostFacet (owner widgetBase)": "widgetBase",
    "widgetVis/runtime.js readHostFacet (owner widgetVis)": "widgetVis",
    "launchpad/buildLaunchpadTabs.js readFacet (owner launchpad)": "launchpad",
    "homeDialog readStampedDashboardFacet (owner homeDialog, dashboardFacet)": "homeDialog"
  };
  for (const [copyName, copy] of Object.entries(stampedCopies)) {
    const names = copyName.includes("homeDialog") ? ["dashboardFacet"] : ["widgetsFacet", "canvasFacet", "visualizationFacet", "tabsFacet", "missingFacet"];
    for (const [shapeName, kdb] of Object.entries(runtimeShapes)) {
      for (const name of names) {
        assert.equal(util.readStampedFacet(kdb, owners[copyName], name), copy(kdb, name), `${copyName} / ${shapeName} / ${name}`);
      }
    }
  }
});

test("the util never throws where the copies would (null _KDB, null owner), and returns the stored object itself", () => {
  for (const kdb of [null, undefined, {}, { services: null }, { runtime: null }, { services: { cognosHost: null } }]) {
    assert.equal(util.readHostFacet(kdb, "filters"), null);
    assert.equal(util.readStampedFacet(kdb, "tabs", "tabsFacet"), null);
  }
  assert.equal(util.readStampedFacet({ runtime: { tabs: null } }, "tabs", "tabsFacet"), null);
  const kdb = { services: { cognosHost: { tabs: facet } }, runtime: { tabs: { tabsFacet: facet } } };
  assert.equal(util.readHostFacet(kdb, "tabs"), facet);
  assert.equal(util.readStampedFacet(kdb, "tabs", "tabsFacet"), facet);
});

test("exports exactly the two readers", () => {
  assert.deepEqual(Object.keys(util).sort(), ["readHostFacet", "readStampedFacet"]);
});
