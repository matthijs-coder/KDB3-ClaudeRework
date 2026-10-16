define(["./core/events/createEventBus.js", "./core/cognosHost/registerCognosHostSelectors.js", "./core/config/__orchestratorConfig.js", "./core/css/__orchestratorCss.js", "./core/cognosAPI/__orchestratorCognosAPI.js", "./core/authoring/__orchestratorAuthoring.js", "./core/services/__orchestratorServices.js", "./core/homeDialog/__orchestratorHomeDialog.js", "./core/properties/__orchestratorProperties.js", "./core/utils/__orchestratorUtils.js", "./dashboard/header/__orchestratorHeader.js", "./dashboard/footer/__orchestratorFooter.js", "./dashboard/tabs/__orchestratorTabs.js", "./dashboard/canvas/kdbControl/__orchestratorKdbControl.js", "./dashboard/canvas/pageSurface/__orchestratorPageSurface.js", "./dashboard/controls/historyControls/__orchestratorHistoryControls.js", "./dashboard/controls/pdfExportControls/__orchestratorPdfExportControls.js", "./dashboard/controls/wienKiControls/__orchestratorWienKiControls.js", "./dashboard/controls/shareControls/__orchestratorShareControls.js", "./dashboard/launchpad/__orchestratorLaunchpad.js", "./dashboard/widgets/widgetBase/__orchestratorWidgetBase.js", "./dashboard/widgets/widgetSettings/__orchestratorWidgetSettings.js", "./dashboard/widgets/widgetText/__orchestratorWidgetText.js", "./dashboard/widgets/widgetVis/__orchestratorWidgetVis.js", "./dashboard/widgets/widgetDataTable/__orchestratorWidgetDataTable.js", "./dashboard/widgets/widgetTopN/__orchestratorWidgetTopN.js", "./dashboard/canvas/dragDrop/__orchestratorDragDrop.js", "./dashboard/metricsTree/__orchestratorMetricsTree.js", "./dashboard/filters/filterDock/__orchestratorFilterDock.js", "./dashboard/filters/singleSelect/__orchestratorSingleSelect.js", "./dashboard/filters/dienststelle/__orchestratorDienststelle.js", "./dashboard/filters/sicht/__orchestratorSicht.js", "./dashboard/filters/specialSingleSelect/__orchestratorSpecialSingleSelect.js", "./dashboard/filters/nativeMultiSelect/__orchestratorNativeMultiSelect.js"], function (_createEventBus, _registerCognosHostSelectors, _orchestratorConfig, _orchestratorCss, _orchestratorCognosAPI, _orchestratorAuthoring, _orchestratorServices, _orchestratorHomeDialog, _orchestratorProperties, _orchestratorUtils, _orchestratorHeader, _orchestratorFooter, _orchestratorTabs, _orchestratorKdbControl, _orchestratorPageSurface, _orchestratorHistoryControls, _orchestratorPdfExportControls, _orchestratorWienKiControls, _orchestratorShareControls, _orchestratorLaunchpad, _orchestratorWidgetBase, _orchestratorWidgetSettings, _orchestratorWidgetText, _orchestratorWidgetVis, _orchestratorWidgetDataTable, _orchestratorWidgetTopN, _orchestratorDragDrop, _orchestratorMetricsTree, _orchestratorFilterDock, _orchestratorSingleSelect, _orchestratorDienststelle, _orchestratorSicht, _orchestratorSpecialSingleSelect, _orchestratorNativeMultiSelect) {
  // Lifecycle terms for rootLifecycle: idle, initializing, ready, error, disposed.
  function createInitialRootLifecycle() {
    return { lifecycle: "idle", errorCode: null, errorMessage: null };
  }
  function setRootLifecycle(_KDB, _lifecycle, _error) {
    _KDB.state.rootLifecycle = {
      lifecycle: _lifecycle,
      errorCode: _error ? "ROOT_LIFECYCLE_ERROR" : null,
      errorMessage: _error ? String(_error.message || _error) : null
    };
  }
  function createRuntimeCore(_options) {
    const features = (_options && _options.features) || {};
    const renderParentEl = _options ? _options.parent || _options.content || null : null;
    return {
      domRefs: { renderParentEl: renderParentEl, kdbWidget: renderParentEl},
      subscriptions: [],
      abortControllers: [],
      adapters: {
        options: _options,
        kdbWidget: _options.parent,
        content: _options ? _options.content || null : null,  
        features: features,
        dashboardCanvas: features["Dashboard.Canvas"],
        userProfile: features.UserProfile,
        properties: features.Properties,
        dashboardApi: features["Dashboard.API"]
      },
      pendingPromises: []
    };
  }
  function setupCoreFactories(_KDB) {
    _registerCognosHostSelectors(_KDB);
    _orchestratorProperties(_KDB);
    _orchestratorConfig(_KDB);
    _orchestratorCss(_KDB);
    _orchestratorCognosAPI(_KDB);
    _orchestratorAuthoring(_KDB);
    _orchestratorServices(_KDB);
    _orchestratorHomeDialog(_KDB);
    _orchestratorUtils(_KDB);
    registerFeatureModules(_KDB);
  }
  function registerFeatureModules(_KDB) {
    _orchestratorHeader(_KDB);
    _orchestratorFooter(_KDB);
    _orchestratorTabs(_KDB);
    _orchestratorKdbControl(_KDB);
    _orchestratorPageSurface(_KDB);
    _orchestratorHistoryControls(_KDB);
    _orchestratorPdfExportControls(_KDB);
    _orchestratorWienKiControls(_KDB);
    _orchestratorShareControls(_KDB);
    _orchestratorLaunchpad(_KDB);
    _orchestratorWidgetBase(_KDB);
    _orchestratorWidgetSettings(_KDB);
    _orchestratorWidgetText(_KDB);
    _orchestratorWidgetVis(_KDB);
    _orchestratorWidgetDataTable(_KDB);
    _orchestratorWidgetTopN(_KDB);
    _orchestratorDragDrop(_KDB);
    _orchestratorMetricsTree(_KDB);
    _orchestratorFilterDock(_KDB);
    _orchestratorSingleSelect(_KDB);
    _orchestratorDienststelle(_KDB);
    _orchestratorSicht(_KDB);
    _orchestratorSpecialSingleSelect(_KDB);
    _orchestratorNativeMultiSelect(_KDB);
  }
  function mountFeatureModules(_KDB, _renderOptions) {
    const domRefs = _KDB.runtime.core.domRefs;
    if (_renderOptions && _renderOptions.parent) {
      domRefs.renderParentEl = _renderOptions.parent;
    }
    _KDB.api.header.mount({});
    _KDB.api.footer.mount({});
    _KDB.api.tabs.mount({});
    _KDB.api.kdbControl.mount({});
    _KDB.api.canvas.mount({});
    _orchestratorServices(_KDB, { bindHistoryReplayHandlersOnly: true });
    _KDB.api.historyControls.mount({});
    _KDB.api.pdfExportControls.mount({});
    _KDB.api.wienKiControls.mount({});
    _KDB.api.shareControls.mount({});
    _KDB.api.launchpad.mount({});
    _KDB.api.widgetBase.mount({});
    _KDB.api.widgetSettings.mount({});
    _KDB.api.widgetText.mount({});
    _KDB.api.widgetVis.mount({ enableDrillthrough: true });
    _KDB.api.widgetDataTable.mount({});
    _KDB.api.widgetTopN.mount({});
    _KDB.api.dragDrop.mount({});
    _KDB.api.metricsTree.mount({});
    _KDB.api.singleSelect.mount({});
    _KDB.api.dienststelle.mount({});
    _KDB.api.sicht.mount({});
    _KDB.api.specialSingleSelect.mount({});
    _KDB.api.nativeMultiSelect.mount({});
    _orchestratorServices(_KDB, { bindHistoryReplayHandlersOnly: true });
  }

  function destroyFeatureApi(_api) {
    if (_api && typeof _api.destroy === "function") {
      _api.destroy();
    }
  }
  function destroyCoreServices(_KDB) {
    const services = _KDB.services || {};
    const orderedServices = [
      services.writebackBridge,
      services.writebackSet,
      services.writebackGet,
      services.writebackMap,
      services.dashboardPdf,
      services.widgetBindingApply,
      services.history,
      services.message,
      services.loading,
      services.tableData,
      // cognosHost is destroyed last: consumers may still see a live (but already
      // aborting) host adapter during their own teardown.
      services.cognosHost
    ];
    let firstError = null;
    let index;
    for (index = 0; index < orderedServices.length; index += 1) {
      try {
        destroyFeatureApi(orderedServices[index]);
      } catch (error) {
        firstError = firstError || error;
        console.error("[core.destroy] service cleanup failed", error);
      }
    }
    if (firstError) throw firstError;
  }
  function destroyRegisteredFeatures(_KDB) {
    const api = _KDB.api || {};
    const orderedFeatures = [
      api.nativeMultiSelect,
      api.specialSingleSelect,
      api.sicht,
      api.dienststelle,
      api.singleSelect,
      api.filterDock,
      api.metricsTree,
      api.pdfExportControls,
      api.wienKiControls,
      api.shareControls,
      api.canvas,
      api.kdbControl,
      api.tabs,
      api.historyControls,
      api.dragDrop,
      api.widgetTopN,
      api.widgetDataTable,
      api.widgetVis,
      api.widgetText,
      api.widgetSettings,
      api.widgetBase,
      api.launchpad,
      api.authoring,
      api.footer,
      api.header
    ];
    let firstError = null;
    let index;
    for (index = 0; index < orderedFeatures.length; index += 1) {
      try {
        destroyFeatureApi(orderedFeatures[index]);
      } catch (error) {
        firstError = firstError || error;
        console.error("[core.destroy] feature cleanup failed", error);
      }
    }
    try {
      if (_KDB.runtime.properties && _KDB.runtime.properties.controller && typeof _KDB.runtime.properties.controller.destroy === "function") {
        _KDB.runtime.properties.controller.destroy();
      }
    } catch (error) {
      firstError = firstError || error;
      console.error("[core.destroy] feature cleanup failed", error);
    }
    if (firstError) throw firstError;
  }
  function clearRuntimeCore(_KDB) {
    const runtimeCore = _KDB.runtime.core || {};
    const subscriptions = runtimeCore.subscriptions || [];
    const abortControllers = runtimeCore.abortControllers || [];
    let index;
    for (index = 0; index < subscriptions.length; index += 1) {
      if (typeof subscriptions[index] === "function") {
        subscriptions[index]();
      }
    }
    for (index = 0; index < abortControllers.length; index += 1) {
      if (abortControllers[index] && typeof abortControllers[index].abort === "function") {
        abortControllers[index].abort();
      }
    }
    _KDB.runtime.core = {};
  }
  function uninstallGetKDB(_KDB) {
    let topWindow;
    try {
      topWindow = window.top;
      void topWindow.document; // cross-origin access check
    } catch (accessError) {
      return;
    }
    const anchor = topWindow.getKDB;
    if (typeof anchor !== "function") { return; }
    // Eigenaarschapscheck (dubbel-boot): wijst het anker al naar een nieuwere
    // boot-instantie, dan mag deze destroy het niet weghalen. Stamp eerst;
    // probe-call alleen als fallback (bijv. bij een meet-wrapper om getKDB).
    let owned = anchor.__kdbOwner === _KDB;
    if (!owned) {
      let anchorTarget = null;
      try { anchorTarget = anchor(); } catch (anchorError) { anchorTarget = null; }
      owned = anchorTarget === _KDB;
    }
    if (!owned) { return; }
    try {
      if (!(delete topWindow.getKDB)) { topWindow.getKDB = undefined; }
    } catch (deleteError) {
      topWindow.getKDB = undefined;
    }
  }
  function releaseRootNamespaces(_KDB) {
    _KDB.events = null;
    _KDB.services = null;
    _KDB.api = null;
    _KDB.cognosAPI = null;
  }
  function scheduleChromeCapabilityFlush(_KDB) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.scheduleFlush !== "function") return;
    try {
      checks.scheduleFlush(_KDB);
    } catch (error) {
      console.error("[core.chromeCapability] scheduleFlush failed", error);
    }
  }
  // Boot-boundary (B1): bij een boot-fout de overlay meteen legen (zelfde keten
  // als het succespad) en de fout aan de user tonen. Nooit op een gedisposede
  // instantie: destroy ruimt de overlay zelf op en messageService is dan al weg.
  function reportRenderFailure(_KDB, _rootLoadingHandle, _error) {
    if (_KDB._isDisposed) { return; }
    const loadingService = _KDB.services && _KDB.services.loading;
    if (_rootLoadingHandle && loadingService && typeof loadingService.finishLoading === "function") {
      try {
        loadingService.finishLoading({ handle: _rootLoadingHandle });
      } catch (loadingError) {
        console.error("[core.renderKDB] loading cleanup failed", loadingError);
      }
    }
    const messageService = _KDB.services && _KDB.services.message;
    if (messageService && typeof messageService.showAlert === "function") {
      try {
        messageService.showAlert({
          title: "Dashboard",
          severity: "error",
          message: "Das KDB-Dashboard konnte nicht geladen werden. Bitte das Dashboard schließen und erneut öffnen. Details: " + String((_error && _error.message) || _error)
        });
      } catch (messageError) {
        console.warn("[core.renderKDB] failure message failed", messageError);
      }
    }
  }
  async function awaitCubesUnavailableHomeDialog(_KDB) {
    try {
      const present = _KDB.runtime && _KDB.runtime.homeDialog && typeof _KDB.runtime.homeDialog.presentCubesUnavailable === "function"
        ? _KDB.runtime.homeDialog.presentCubesUnavailable
        : null;
      if (!present) { return; }
      await present(_KDB);
    } catch (error) {
      console.error("[core.awaitCubesUnavailableHomeDialog]", error);
    }
  }
  class KDB {
    constructor(_options) {
      this.state = { rootLifecycle: createInitialRootLifecycle() };
      this.runtime = { core: createRuntimeCore(_options || {}) };
      this.services = {}; this.api = {}; this.events = _createEventBus();
      this.config = { options: {} }; this.properties = {}; this.elements = { selectors: {} };
      this.utils = {}; this.cognosAPI = {}; this.data = {};
      this._isDisposed = false;
      this._teardownComplete = false;
      this.version = "2026.10.16 HH03.30";
       
                  
    }
    // Host-contract (geverifieerd 2026-08-19; spec.json "renderer" + runtime-meting M1):
    // Cognos laadt deze AMD-klasse via spec.json renderer.class, doet `new KDB(options)`
    // en rendert via getAPI().render(options). Teardown loopt NIET via getAPI():
    // Cognos' content-API roept instance.destroy() rechtstreeks aan
    // (removeDialog -> destroyContentMap -> api-utils t.destroy -> KDB.destroy).
    // destroy() is dus het enige teardown-entrypoint; getAPI() blijft bewust { render }.
    // Let op: een heropening boot 2 instanties en disposet #1 tijdens de open-sequentie
    // (dubbel-boot); opruimen van window.top-ankers moet daarom eigenaarschap checken.
    getAPI() {
      return { render: this.renderKDB.bind(this) };
    }
    installGetKDB() {
      const anchor = () => this;
      anchor.__kdbOwner = this;
      window.top.getKDB = anchor;
    }
    async setupCore() {
      try {
        if (this._isDisposed) { console.warn("[core.setupCore] called after destroy"); return false; }
        this.installGetKDB();
        setupCoreFactories(this);
        return true;
      } catch (error) {
        console.error("[core.setupCore] failed", error);
        setRootLifecycle(this, "error", error);
        throw error;
      }
    }
    async startModules(_renderOptions) {
      try {
        if (this._isDisposed) { console.warn("[core.startModules] called after destroy"); return false; }
        await mountFeatureModules(this, _renderOptions);
        return true;
      } catch (error) {
        console.error("[core.startModules] failed", error);
        setRootLifecycle(this, "error", error);
        throw error;
      }
    }
    async renderKDB(_renderOptions) {
      // rootLoadingHandle staat buiten de try zodat het faalpad (B1) de
      // boot-overlay via dezelfde finishLoading-keten kan legen als het succespad.
      let rootLoadingHandle = null;
      try {
        if (this._isDisposed) { console.warn("[core.renderKDB] called after destroy"); return false; }
        setRootLifecycle(this, "initializing");
        await this.setupCore();
        if (this.properties.KDBReadyToggle !== true) {
          console.warn("[core.renderKDB] KDBReadyToggle is not true; halt before modules");
          return false;
        }
        rootLoadingHandle = await this.startDashboardInitialization();
        await awaitCubesUnavailableHomeDialog(this);
        await this.startModules(_renderOptions);
        scheduleChromeCapabilityFlush(this);
        return await this.finishDashboardInitialization(rootLoadingHandle);
      } catch (error) {
        console.error("[core.renderKDB] failed", error);
        setRootLifecycle(this, "error", error);
        reportRenderFailure(this, rootLoadingHandle, error);
        return false;
      }
    }
    async startDashboardInitialization() {
      const loadingService = this.services && this.services.loading;
      if (this.properties.KDBPlayLoadingImageToggle === true && loadingService) {
        return loadingService.startLoading({
          mountEl: document.querySelector(this.elements.selectors.root.pageViewContent), 
          mountKey: "kdb-root-loading-animation-mount",
          transparent: this.properties.KDBLoadingImageTransparentToggle === true,
          messageKey: "dashboard"
        });
      }
      return null;
    }
    async finishDashboardInitialization(rootLoadingHandle) {
      const loadingService = this.services && this.services.loading;
      const writebackSet = this.services && this.services.writebackSet;
      if (!this._isDisposed && this.state.rootLifecycle.lifecycle !== "disposed" && this.state.rootLifecycle.lifecycle !== "error") {
        setRootLifecycle(this, "ready");
      }
      // Cognos does not create #selectParameterSet / #filterDockContainer while the
      // boot spinner is mounted (PO poll 2026-08-29: select false until after lift).
      if (rootLoadingHandle && loadingService) {
        loadingService.finishLoading({ handle: rootLoadingHandle });
      }
      if (!this._isDisposed) {
        this.api.filterDock.mount({});
      }
      if (!this._isDisposed && this.api.shareControls && typeof this.api.shareControls.applyReadOnlyChrome === "function") {
        this.api.shareControls.applyReadOnlyChrome();
      }
      if (!this._isDisposed && writebackSet && typeof writebackSet.whenUrlShareRestoreSettled === "function") {
        writebackSet.whenUrlShareRestoreSettled();
      }
      return this.state.rootLifecycle.lifecycle === "ready";
    }
    destroy() {
      let destroyError = null;
      if (this._teardownComplete) { return; }
      this._isDisposed = true;
      try {
        destroyRegisteredFeatures(this);
      } catch (error) {
        destroyError = error;
        console.error("[core.destroy] feature cleanup failed", error);
      }
      try {
        destroyCoreServices(this);
      } catch (error) {
        destroyError = destroyError || error;
        console.error("[core.destroy] service cleanup failed", error);
      }
      try {
        clearRuntimeCore(this);
      } catch (error) {
        destroyError = destroyError || error;
        console.error("[core.destroy] runtime cleanup failed", error);
      }
      try {
        uninstallGetKDB(this);
      } catch (error) {
        destroyError = destroyError || error;
        console.error("[core.destroy] getKDB uninstall failed", error);
      }
      this._teardownComplete = true;
      setRootLifecycle(this, destroyError ? "error" : "disposed", destroyError);
      try {
        releaseRootNamespaces(this);
      } catch (releaseError) {
        console.error("[core.destroy] namespace release failed", releaseError);
      }
    }
  }
  return KDB;
});
