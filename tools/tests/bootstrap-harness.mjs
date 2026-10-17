// Shared harness for the bootstrap tests: loads KDB.js with fake orchestrators so that the ordered register,
// mount and destroy calls of the root class can be recorded. Works against the current KDB.js and against the
// manifest-driven one because it replaces modules by path (loadAmd `overrides`), not by position.
import path from 'node:path';
import { loadAmd } from '../lib/amd-loader.mjs';
import { JS_ROOT } from '../lib/amd-graph.mjs';

// [manifest name, orchestrator path relative to KDB3/js, _KDB.api key set by the real orchestrator]
export const FEATURES = [
  ['header', 'dashboard/header/index.js', 'header'],
  ['footer', 'dashboard/footer/index.js', 'footer'],
  ['tabs', 'dashboard/tabs/index.js', 'tabs'],
  ['kdbControl', 'dashboard/canvas/kdbControl/index.js', 'kdbControl'],
  ['pageSurface', 'dashboard/canvas/pageSurface/index.js', 'canvas'],
  ['launchpad', 'dashboard/launchpad/index.js', 'launchpad'],
  ['widgetBase', 'dashboard/widgets/widgetBase/index.js', 'widgetBase'],
  ['widgetSettings', 'dashboard/widgets/widgetSettings/index.js', 'widgetSettings'],
  ['widgetText', 'dashboard/widgets/widgetText/index.js', 'widgetText'],
  ['widgetVis', 'dashboard/widgets/widgetVis/index.js', 'widgetVis'],
  ['widgetDataTable', 'dashboard/widgets/widgetDataTable/__orchestratorWidgetDataTable.js', 'widgetDataTable'],
  ['widgetTopN', 'dashboard/widgets/widgetTopN/index.js', 'widgetTopN'],
  ['dragDrop', 'dashboard/canvas/dragDrop/index.js', 'dragDrop'],
  ['metricsTree', 'dashboard/metricsTree/index.js', 'metricsTree'],
  ['filterDock', 'dashboard/filters/filterDock/index.js', 'filterDock'],
  ['singleSelect', 'dashboard/filters/singleSelect/index.js', 'singleSelect'],
  ['dienststelle', 'dashboard/filters/dienststelle/index.js', 'dienststelle'],
  ['sicht', 'dashboard/filters/sicht/index.js', 'sicht'],
  ['specialSingleSelect', 'dashboard/filters/specialSingleSelect/index.js', 'specialSingleSelect'],
  ['nativeMultiSelect', 'dashboard/filters/nativeMultiSelect/index.js', 'nativeMultiSelect'],
];

// One registration publishes four toolbar button APIs; each is still mounted and destroyed on its own.
export const TOOLBAR_ENTRY = 'dashboard/controls/toolbarControls/index.js';
export const TOOLBAR_API_KEYS = ['historyControls', 'pdfExportControls', 'wienKiControls', 'shareControls'];

export const CORE_STEP_PATHS = {
  cognosHostSelectors: 'core/cognosHost/registerCognosHostSelectors.js',
  properties: 'core/properties/index.js',
  config: 'core/config/registerConfig.js',
  css: 'core/css/index.js',
  cognosAPI: 'core/cognosAPI/index.js',
  authoring: 'core/authoring/index.js',
  services: 'bootstrap/registerServices.js',
  homeDialog: 'core/homeDialog/index.js',
  utils: 'core/utils/registerUtils.js',
};

// Registration-time stamps of the real owners (header, footer and kdbControl stamp in mount()).
const STAMPS_AT_REGISTER = ['widgetSettings', 'widgetBase', 'widgetText', 'tabs', 'dienststelle', 'singleSelect', 'nativeMultiSelect', 'sicht'];
const STAMPS_AT_MOUNT = ['header', 'footer', 'kdbControl'];
export const REPLAY_OWNER_BY_FEATURE = { kdbControl: 'kdbControl', header: 'header', footer: 'footer', singleSelect: 'singleSelect', sicht: 'sicht', dienststelle: 'dienststelle', nativeMultiSelect: 'nativeMultiSelect', widgetBase: 'widgetBase', widgetSettings: 'widgetSettings', widgetText: 'widgetText', tabs: 'tabs' };

// Services published by the real services orchestrator that KDB.js knows by name.
const SERVICE_NAMES = ['cognosHost', 'tableData', 'loading', 'message', 'widgetBindingPlan', 'widgetBindingApply', 'dashboardPdf', 'writebackBridge', 'writebackSet', 'writebackGet', 'writebackMap', 'drillthrough'];

const SERVICE_SUBPATHS = {
  cognosHost: 'core/services/cognosHost/index.js',
  tableData: 'core/services/tableData/index.js',
  loading: 'core/services/loadingService/index.js',
  message: 'core/services/messageService/index.js',
  widgetBindingPlan: 'core/services/widgetBindingPlan/index.js',
  widgetBindingApply: 'core/services/widgetBindingApply/index.js',
  dashboardPdf: 'workflows/pdfExport/index.js',
  writeback: 'workflows/parameterSet/index.js',
  drillthrough: 'core/services/drillthrough/index.js',
};

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export const flush = () => new Promise((resolve) => setImmediate(resolve));

export function createFakeHead() {
  const head = {
    children: [],
    appendChild(el) { el.parentNode = head; head.children.push(el); return el; },
    removeChild(el) { const i = head.children.indexOf(el); if (i >= 0) head.children.splice(i, 1); el.parentNode = null; return el; },
    querySelectorAll() { return head.children.filter((el) => el.rel === 'stylesheet'); },
  };
  return head;
}

export function createHarness({ realCss = false, realServices = false, props = {}, failMount = null, failDestroy = null, cubesGate = null } = {}) {
  const log = [];
  const consoleCalls = { error: [], warn: [], log: [] };
  const alerts = [];
  const top = { document: {}, getKDB: undefined };
  const windowStub = { top };
  const head = createFakeHead();
  const documentStub = {
    head,
    querySelector: (selector) => ({ selector }),
    createElement: () => ({ rel: '', href: '', parentNode: null, getAttribute(name) { return name === 'href' ? this.href : null; } }),
  };
  const consoleStub = {
    error: (...a) => consoleCalls.error.push(a),
    warn: (...a) => consoleCalls.warn.push(a),
    log: (...a) => consoleCalls.log.push(a),
  };

  function serviceFake(name) {
    return {
      destroy() {
        log.push('service.destroy:' + name);
        if (failDestroy === 'service:' + name) throw new Error('boom ' + name);
      },
    };
  }

  function fakeServiceRegistration(names, extra = {}) {
    return (kdb) => {
      log.push('register:service-group:' + names.join('+'));
      kdb.services = kdb.services || {};
      for (const name of names) kdb.services[name] = Object.assign(serviceFake(name), extra[name] || {});
      return kdb.services;
    };
  }

  const contributions = {};
  function stampContribution(kdb, name) {
    kdb.runtime[name] = kdb.runtime[name] || {};
    contributions[name] = { apply: async (_kdb, value, step) => { log.push('replay:' + name + ':' + step.key); return true; } };
    kdb.runtime[name].historyReplayHandlerContribution = contributions[name];
  }

  function featureFake([name, , apiKey]) {
    return (kdb) => {
      log.push('register:' + name);
      kdb.runtime = kdb.runtime || {};
      if (STAMPS_AT_REGISTER.includes(name)) stampContribution(kdb, name);
      kdb.api[apiKey] = createFakeApi(kdb, name);
    };
  }

  function toolbarFake(kdb) {
    log.push('register:toolbarControls');
    for (const name of TOOLBAR_API_KEYS) kdb.api[name] = createFakeApi(kdb, name);
  }

  function createFakeApi(kdb, name) {
    return {
      mount(options) {
        log.push('mount:' + name + ':' + JSON.stringify(options));
        if (failMount === name) throw new Error('mount failed ' + name);
        if (STAMPS_AT_MOUNT.includes(name)) stampContribution(kdb, name);
      },
      destroy() {
        log.push('destroy:' + name);
        if (failDestroy === name) throw new Error('boom ' + name);
      },
      applyReadOnlyChrome() { log.push('call:shareControls.applyReadOnlyChrome'); },
    };
  }

  function installReplaySpy(kdb) {
    const history = kdb.services && kdb.services.history;
    if (history && typeof history.registerReplayHandler === 'function') {
      const original = history.registerReplayHandler;
      history.registerReplayHandler = (key, handler) => {
        log.push('replay.register:' + key);
        return original(key, handler);
      };
    }
  }

  const overrides = {};
  overrides[CORE_STEP_PATHS.cognosHostSelectors] = (kdb) => {
    log.push('register:cognosHostSelectors');
    kdb.elements.selectors.root = { pageViewContent: '.pageViewContent' };
  };
  overrides[CORE_STEP_PATHS.properties] = (kdb) => {
    log.push('register:properties');
    kdb.runtime.properties = { controller: { destroy() { log.push('destroy:properties.controller'); } } };
    kdb.properties.KDBReadyToggle = props.ready !== false;
    kdb.properties.KDBPlayLoadingImageToggle = props.loadingImage === true;
    kdb.properties.KDBLoadingImageTransparentToggle = props.transparent === true;
  };
  for (const name of ['config', 'css', 'cognosAPI', 'utils']) {
    if (name === 'css' && realCss) continue;
    overrides[CORE_STEP_PATHS[name]] = () => { log.push('register:' + name); };
  }
  overrides[CORE_STEP_PATHS.authoring] = (kdb) => {
    log.push('register:authoring');
    kdb.api.authoring = {
      mount() { log.push('mount:authoring'); },
      destroy() { log.push('destroy:authoring'); },
    };
  };
  overrides[CORE_STEP_PATHS.homeDialog] = (kdb) => {
    log.push('register:homeDialog');
    kdb.runtime.homeDialog = {
      presentCubesUnavailable: async () => {
        log.push('homeDialog.presentCubesUnavailable');
        if (cubesGate) await cubesGate.promise;
      },
      presentHomeChoice: async () => {},
    };
    installReplaySpy(kdb);
  };

  const sharedExtras = {
    loading: {
      startLoading(options) { log.push('loading.start:' + options.mountKey); return { mountKey: options.mountKey }; },
      finishLoading(options) { log.push('loading.finish:' + (options.handle ? options.handle.mountKey : '')); },
    },
    message: {
      showAlert(options) { alerts.push(options); log.push('message.showAlert'); },
    },
    history: { registerReplayHandler() { return () => {}; } },
    writebackSet: { whenUrlShareRestoreSettled() { log.push('call:writebackSet.whenUrlShareRestoreSettled'); } },
  };

  if (realServices) {
    overrides[SERVICE_SUBPATHS.cognosHost] = fakeServiceRegistration(['cognosHost']);
    overrides[SERVICE_SUBPATHS.tableData] = fakeServiceRegistration(['tableData']);
    overrides[SERVICE_SUBPATHS.loading] = fakeServiceRegistration(['loading'], sharedExtras);
    overrides[SERVICE_SUBPATHS.message] = fakeServiceRegistration(['message'], sharedExtras);
    overrides[SERVICE_SUBPATHS.widgetBindingPlan] = fakeServiceRegistration(['widgetBindingPlan']);
    overrides[SERVICE_SUBPATHS.widgetBindingApply] = fakeServiceRegistration(['widgetBindingApply']);
    overrides[SERVICE_SUBPATHS.dashboardPdf] = fakeServiceRegistration(['dashboardPdf']);
    overrides[SERVICE_SUBPATHS.writeback] = fakeServiceRegistration(['writebackBridge', 'writebackSet', 'writebackGet', 'writebackMap'], sharedExtras);
    overrides[SERVICE_SUBPATHS.drillthrough] = fakeServiceRegistration(['drillthrough']);
  } else {
    overrides[CORE_STEP_PATHS.services] = (kdb, options) => {
      if (options && options.bindHistoryReplayHandlersOnly === true) {
        log.push('services.bindHistoryReplayHandlersOnly');
        return kdb.services;
      }
      log.push('register:services');
      kdb.services = kdb.services || {};
      for (const name of SERVICE_NAMES.concat(['history'])) {
        kdb.services[name] = Object.assign(serviceFake(name), sharedExtras[name] || {});
      }
      return kdb.services;
    };
  }
  for (const feature of FEATURES) overrides[feature[1]] = featureFake(feature);
  overrides[TOOLBAR_ENTRY] = toolbarFake;

  const KDB = loadAmd(path.join(JS_ROOT, 'KDB.js'), {
    stubs: { window: windowStub, document: documentStub, console: consoleStub },
    overrides,
  });

  function createKdb(options) {
    return new KDB(options || { parent: { id: 'parent' }, content: { id: 'content' }, features: {} });
  }

  return { KDB, createKdb, log, alerts, consoleCalls, top, contributions, head };
}

export const idx = (log, entry) => log.indexOf(entry);

export function loadManifest() {
  const overrides = {};
  const noop = () => {};
  for (const rel of Object.values(CORE_STEP_PATHS)) overrides[rel] = noop;
  for (const feature of FEATURES) overrides[feature[1]] = noop;
  overrides[TOOLBAR_ENTRY] = noop;
  return loadAmd(path.join(JS_ROOT, 'bootstrap/featureManifest.js'), { overrides });
}

export function loadBootstrapModule(rel) {
  return loadAmd(path.join(JS_ROOT, rel));
}
