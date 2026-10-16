// The boot-overlay watchdog dialog end to end: real loadingService + real homeDialog + a fake message service.
// Wiring-agnostic on purpose (homeDialog is registered after the loading service, as KDB.js does), so the same
// assertions hold before and after the watchdog handler contract: the user must see the same dialog.
// Run: node --test tools/tests/bootstrap-watchdog-dialog.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { createEnv } from "./ws-d1-fake-dom.mjs";

const BOOT_KEY = "kdb-root-loading-animation-mount";
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup({ withHomeDialog = true, choice = null } = {}) {
  const env = createEnv();
  const widgetEl = env.document.createElement("div");
  env.document.body.appendChild(widgetEl);
  const chooseRequests = [];
  const navigation = [];
  const _KDB = {
    elements: { kdbWidget: widgetEl, selectors: { root: { loadingIndicatorSelector: ".loadingIndicatorContainer" } } },
    config: { labels: { de: {} } },
    runtime: {},
    services: {
      message: {
        choose: async (request) => {
          chooseRequests.push(request);
          return choice ? { reason: "selected", choice } : { reason: "dismissed" };
        }
      },
      cognosHost: {
        dashboard: {
          replaceWithBiHomePerspective: () => navigation.push("close"),
          openAppView: async (view) => navigation.push("minimize:" + view)
        },
        dataSources: {}
      }
    }
  };
  const register = loadAmd(path.join(JS_ROOT, "core/services/loadingService/__orchestratorLoadingService.js"), { stubs: env.stubs });
  const loading = register(_KDB);
  _KDB.services.loading = loading;
  let homeDialog = null;
  if (withHomeDialog) {
    homeDialog = loadAmd(path.join(JS_ROOT, "core/homeDialog/__orchestratorHomeDialog.js"), { stubs: env.stubs });
    homeDialog(_KDB);
  }
  return { env, _KDB, loading, widgetEl, chooseRequests, navigation, homeDialog };
}

const spinnerOf = (mountEl) => mountEl.querySelector(":scope > .loadingIndicatorContainer");

test("boot watchdog: overlay is lifted and the home dialog shows the same title, text, severity and choices", async () => {
  const { env, _KDB, loading, widgetEl, chooseRequests } = setup();
  loading.startLoading({ mountKey: BOOT_KEY });
  env.clock.advance(299999);
  assert.ok(spinnerOf(widgetEl));
  assert.equal(chooseRequests.length, 0);
  env.clock.advance(1);
  await flush();
  assert.equal(spinnerOf(widgetEl), null);
  assert.equal(chooseRequests.length, 1);
  assert.deepEqual(chooseRequests[0], {
    code: "LOADING_WATCHDOG",
    title: "Dashboard nicht vollständig geladen",
    message: "Das Dashboard oder die benötigten Daten konnten nicht innerhalb von 5 Minuten vollständig geladen werden. Möglicherweise ist ein Fehler aufgetreten.\n\nWechseln Sie zur Startseite.",
    severity: "warning",
    showCancel: false,
    choices: [
      { id: "home-close", label: "Dashboard schließen" },
      { id: "home-minimize", label: "Dashboard minimalisieren" }
    ]
  });
  assert.equal(_KDB.config.labels.de.loading.watchdogTitle, chooseRequests[0].title);
});

test("boot watchdog: choosing close or minimize navigates through the dashboard facet", async () => {
  for (const [choice, expected] of [["home-close", "close"], ["home-minimize", "minimize:home"]]) {
    const { env, loading, navigation } = setup({ choice });
    loading.startLoading({ mountKey: BOOT_KEY, watchdogMs: 10 });
    env.clock.advance(10);
    await flush();
    assert.deepEqual(navigation, [expected]);
  }
});

test("a non-boot mount key never opens the dialog; finishLoading cancels the boot watchdog", async () => {
  const { env, loading, chooseRequests } = setup();
  loading.startLoading({ mountKey: "widget-chart", watchdogMs: 10 });
  env.clock.advance(10);
  await flush();
  assert.equal(chooseRequests.length, 0);
  loading.startLoading({ mountKey: BOOT_KEY, watchdogMs: 1000 });
  loading.finishLoading({ mountKey: BOOT_KEY });
  env.clock.advance(5000);
  await flush();
  assert.equal(chooseRequests.length, 0);
});

test("boot watchdog fires once per start; the overlay is lifted even when no dialog is available", async () => {
  const { env, loading, widgetEl, chooseRequests } = setup({ withHomeDialog: false });
  loading.startLoading({ mountKey: BOOT_KEY, watchdogMs: 10 });
  env.clock.advance(10);
  await flush();
  assert.equal(spinnerOf(widgetEl), null);
  assert.equal(chooseRequests.length, 0);
});
