define([
  "../state/buildMetricsTreeSources.js",
  "../view/renderMetricsTrees.js",
  "../view/bindMetricsTreeSearch.js",
  "../view/bindMetricsTreeDragDrop.js",
  "../adapters/createDragDropAdapter.js",
  "../runtime/ensureMetricsTreeRuntime.js",
  "./readSuperUserAllowed.js",
  "./applyMetricsTreeLoading.js"
], function (
  _buildMetricsTreeSources,
  _renderMetricsTrees,
  _bindMetricsTreeSearch,
  _bindMetricsTreeDragDrop,
  _createDragDropAdapter,
  _ensureMetricsTreeRuntime,
  _readSuperUserAllowed,
  _applyMetricsTreeLoading
) {
  "use strict";

  function __controller(_instance, _options) {
    try {
      const runtime = _ensureMetricsTreeRuntime(_instance._KDB);
      const activeRender = asThenable(runtime.pendingPromises && runtime.pendingPromises.render);
      if (activeRender) { return activeRender; }
      const mountOptions = Object.assign({}, _instance.options, _options || {});
      const controller = new AbortController();
      runtime.abortControllers.mount = controller;
      runtime.adapters.dragDrop = _createDragDropAdapter(_instance._KDB, mountOptions);
      mountOptions.dragDropAdapter = runtime.adapters.dragDrop;
      const promise = runMountPipeline(_instance._KDB, mountOptions, _instance.api, controller.signal);
      const guardedPromise = promise.then(resolveMountSuccess, handleMountError.bind(null, _instance));
      runtime.pendingPromises.render = guardedPromise;
      return guardedPromise.then(
        clearPendingRenderAndReturn.bind(null, _instance._KDB),
        clearPendingRenderAndFail.bind(null, _instance._KDB)
      );
    } catch (err) {
      return Promise.resolve(handleMountError(_instance, err));
    }
  }

  async function runMountPipeline(_KDB, options, controllerApi, signal) {
    try {
      if (signal.aborted) { return false; }
      controllerApi.dispatch({ type: "metricsTree/loadStarted" });
      _applyMetricsTreeLoading.start({ _KDB: _KDB });
      const dataReadyPromise = readDataReadyPromise(_KDB, options);
      if (dataReadyPromise) {
        await dataReadyPromise;
        if (signal.aborted) { return false; }
      }
      const sourceInput = await readSourceInput(_KDB, options);
      if (signal.aborted) { return false; }
      sourceInput.isSuperUserAllowed = await _readSuperUserAllowed(_KDB);
      const sourceResult = _buildMetricsTreeSources(_KDB, sourceInput);
      if (signal.aborted) { return false; }
      controllerApi.dispatch({
        type: "metricsTree/loadSucceeded",
        payload: {
          bySource: sourceResult.bySource,
          sourceOrder: sourceResult.sourceOrder,
          hasRenderableData: sourceResult.hasRenderableData,
          lastBuildAt: Date.now()
        }
      });
      const didRender = await _renderMetricsTrees(_KDB, options);
      if (signal.aborted) { return false; }
      _bindMetricsTreeSearch(_KDB);
      _bindMetricsTreeDragDrop(_KDB, options.dragDropAdapter);
      controllerApi.dispatch({
        type: "metricsTree/rendered",
        payload: { lastRenderedAt: Date.now(), readyResolvedAt: Date.now() }
      });
      return didRender === true && sourceResult.hasRenderableData === true;
    } catch (err) {
      if (isAbortError(err) || (signal && signal.aborted)) { return false; }
      throw err;
    } finally {
      _applyMetricsTreeLoading.finish({ _KDB: _KDB });
    }
  }

  function readDataReadyPromise(_KDB, options) {
    return asThenable(options.dataReadyPromise) || asThenable(_KDB.runtime.metricsTree.pendingPromises.dataReady);
  }

  async function readSourceInput(_KDB, options) {
    try {
      const tableKey = options.tableConfigKey || "personal_kdb";
      const getTableConfigObject = _KDB.utils && _KDB.utils.getTableConfigObject;
      if (typeof getTableConfigObject !== "function") {
        throw new Error("metricsTree requires _KDB.utils.getTableConfigObject.");
      }
      const tableConfig = getTableConfigObject(_KDB, tableKey);
      if (!tableConfig || !tableConfig.key) {
        throw new Error("metricsTree table config missing: " + tableKey);
      }
      const input = [{
        tableName: tableKey,
        ..._KDB.config.tables[tableKey]
      }];
      const tableData = _KDB.services && _KDB.services.tableData;
      if (!tableData || typeof tableData.waitForRows !== "function" || typeof tableData.readRows !== "function") {
        throw new Error("metricsTree requires _KDB.services.tableData waitForRows/readRows.");
      }
      const waitedRows = await tableData.waitForRows(input);
      const rows = tableData.readRows(input);
      return {
        sourceKey: tableConfig.key,
        tableName: tableConfig.name,
        rows: Array.isArray(rows) ? rows : (Array.isArray(waitedRows) ? waitedRows : []),
        tableConfigObject: tableConfig
      };
    } catch (err) {
      throw err;
    }
  }

  function handleMountError(instance, err) {
    _applyMetricsTreeLoading.finish({ _KDB: instance._KDB });
    if (instance.isDisposed || isAbortError(err)) { return false; }
    console.error("[metricsTree.mount] mount failed", err);
    instance.api.dispatch({
      type: "metricsTree/loadFailed",
      payload: { errorCode: "METRICS_TREE_MOUNT_FAILED", errorMessage: err && err.message ? err.message : String(err) }
    });
    return false;
  }

  function resolveMountSuccess(value) { return value === true; }
  function clearPendingRenderAndReturn(_KDB, value) {
    clearPendingRender(_KDB);
    return value;
  }
  function clearPendingRenderAndFail(_KDB, err) {
    clearPendingRender(_KDB);
    return Promise.reject(err);
  }
  function clearPendingRender(_KDB) {
    const runtime = _ensureMetricsTreeRuntime(_KDB);
    if (runtime.pendingPromises) { delete runtime.pendingPromises.render; }
  }
  function asThenable(value) { return value && typeof value.then === "function" ? value : null; }
  function isAbortError(err) { return Boolean(err && err.name === "AbortError"); }

  __controller.handleMountError = handleMountError;
  return __controller;
});
