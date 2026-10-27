define([
  "./core/events/createEventBus.js",
  "./bootstrap/featureManifest.js",
  "./core/bootstrap/lifecycle.js",
  "./core/bootstrap/rootLifecycle.js",
  "./core/bootstrap/runtimeCore.js",
  "./core/bootstrap/getKDBAnchor.js",
  "./core/bootstrap/renderBoundary.js"
], function (_createEventBus, _manifest, _lifecycle, _rootLifecycle, _runtimeCore, _getKDBAnchor, _renderBoundary) {
  const setRootLifecycle = _rootLifecycle.setRootLifecycle;

  function releaseRootNamespaces(_KDB) {
    _KDB.events = null;
    _KDB.services = null;
    _KDB.api = null;
    _KDB.cognosAPI = null;
  }

  // destroy() already lifted the boot overlay and tore the modules down: nothing is mounted or finished.
  function abandonDisposedRender(_step) {
    console.warn("[core.renderKDB] destroyed during render, stopped after " + _step);
    return false;
  }

  class KDB {
    constructor(_options) {
      this.state = { rootLifecycle: _rootLifecycle.createInitialRootLifecycle() };
      this.runtime = { core: _runtimeCore.createRuntimeCore(_options || {}) };
      this.services = {}; this.api = {}; this.events = _createEventBus();
      this.config = { options: {} }; this.properties = {}; this.elements = { selectors: {} };
      this.utils = {}; this.cognosAPI = {}; this.data = {};
      this._isDisposed = false;
      this._teardownComplete = false;
      this._renderPromise = null;
      this._renderParent = undefined;
      this.version = "2026.10.27 HH20.57";
    }

    // Host contract (verified 2026-08-19; spec.json "renderer" + runtime measurement M1):
    // Cognos loads this AMD class via spec.json renderer.class, does `new KDB(options)`
    // and renders through getAPI().render(options). Teardown does NOT go through getAPI():
    // the Cognos content API calls instance.destroy() directly
    // (removeDialog -> destroyContentMap -> api-utils t.destroy -> KDB.destroy).
    // destroy() is therefore the only teardown entry point; getAPI() deliberately stays { render }.
    // Note: a reopen boots 2 instances and disposes #1 during the open sequence
    // (double boot); cleaning up window.top anchors must therefore check ownership.
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
        _lifecycle.registerAll(this, _manifest);
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
        _lifecycle.mountBootModules(this, _manifest, _renderOptions);
        return true;
      } catch (error) {
        console.error("[core.startModules] failed", error);
        setRootLifecycle(this, "error", error);
        throw error;
      }
    }

    // One render per instance: a second call (for example render() from the console, or a host re-render)
    // returns the first call's promise and registers or mounts nothing again. A new open creates a new instance.
    renderKDB(_renderOptions) {
      if (this._isDisposed) {
        console.warn("[core.renderKDB] called after destroy");
        return Promise.resolve(false);
      }
      if (!this._renderPromise) {
        this._renderParent = _renderOptions ? _renderOptions.parent : undefined;
        this._renderPromise = this._runRender(_renderOptions);
        return this._renderPromise;
      }
      const ignoredParent = _renderOptions ? _renderOptions.parent : undefined;
      if (ignoredParent !== this._renderParent) {
        console.warn("[core.renderKDB] second render() ignored: it passed a different parent than the first call", ignoredParent);
      }
      return this._renderPromise;
    }

    async _runRender(_renderOptions) {
      // The loading handle lives outside the try so the failure path can lift the boot overlay
      // through the same finishLoading chain as the success path.
      let rootLoadingHandle = null;
      try {
        setRootLifecycle(this, "initializing");
        await this.setupCore();
        if (this._isDisposed) { return abandonDisposedRender("setupCore"); }
        if (this.properties.KDBReadyToggle !== true) {
          console.warn("[core.renderKDB] KDBReadyToggle is not true; halt before modules");
          return false;
        }
        rootLoadingHandle = await this.startDashboardInitialization();
        if (this._isDisposed) { return abandonDisposedRender("startDashboardInitialization"); }
        await _renderBoundary.awaitCubesUnavailableHomeDialog(this);
        if (this._isDisposed) { return abandonDisposedRender("cubes dialog"); }
        await this.startModules(_renderOptions);
        if (this._isDisposed) { return abandonDisposedRender("startModules"); }
        _renderBoundary.scheduleChromeCapabilityFlush(this);
        return await this.finishDashboardInitialization(rootLoadingHandle);
      } catch (error) {
        console.error("[core.renderKDB] failed", error);
        if (this._isDisposed) { return false; }
        setRootLifecycle(this, "error", error);
        _renderBoundary.reportRenderFailure(this, rootLoadingHandle, error);
        return false;
      }
    }

    async startDashboardInitialization() {
      return _renderBoundary.startBootLoading(this);
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
        _lifecycle.mountPhase(this, _manifest, "afterLoading");
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
        _lifecycle.destroyFeatures(this, _manifest);
      } catch (error) {
        destroyError = error;
        console.error("[core.destroy] feature cleanup failed", error);
      }
      try {
        _lifecycle.destroyServices(this, _manifest);
      } catch (error) {
        destroyError = destroyError || error;
        console.error("[core.destroy] service cleanup failed", error);
      }
      try {
        _runtimeCore.clearRuntimeCore(this);
      } catch (error) {
        destroyError = destroyError || error;
        console.error("[core.destroy] runtime cleanup failed", error);
      }
      try {
        if (this.events && typeof this.events.dispose === "function") { this.events.dispose(); }
      } catch (error) {
        destroyError = destroyError || error;
        console.error("[core.destroy] event bus dispose failed", error);
      }
      try {
        _getKDBAnchor.uninstallGetKDB(this);
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
