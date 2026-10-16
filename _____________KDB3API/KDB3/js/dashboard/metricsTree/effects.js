define([
  "./catalog.js",
  "./config.js",
  "./view.js",
  "./dragSource.js",
  "../canvas/kdbControl/config/domSelectors.js",
  "../../core/utils/readRightFlag.js"
], function (_catalog, _config, _view, _dragSource, _kdbControlSelectors, _readRightFlag) {
  "use strict";

  function mountMetricsTree(_instance) {
    const runtime = _instance._KDB.runtime.metricsTree;
    const activeRender = runtime.pendingPromises.render;
    if (activeRender) { return activeRender; }

    const controller = new AbortController();
    runtime.abortControllers.mount = controller;

    const pending = runMountPipeline(_instance, controller.signal).then(
      function (didMount) { return didMount === true; },
      function (err) { return controller.signal.aborted ? false : handleMountError(_instance, err); }
    ).then(function (didMount) {
      if (runtime.pendingPromises.render === pending) { delete runtime.pendingPromises.render; }
      return didMount;
    });
    runtime.pendingPromises.render = pending;
    return pending;
  }

  async function runMountPipeline(_instance, signal) {
    const _KDB = _instance._KDB;
    const api = _instance.api;
    try {
      if (signal.aborted) { return false; }
      api.dispatch({ type: "metricsTree/loadStarted" });
      startLoading(_KDB);
      const sourceInput = await readSourceInput(_KDB);
      if (signal.aborted) { return false; }
      sourceInput.isSuperUserAllowed = await readSuperUserAllowed(_KDB);
      const sourceResult = _catalog.buildMetricsTreeSources(_KDB, sourceInput);
      if (signal.aborted) { return false; }
      api.dispatch({
        type: "metricsTree/loadSucceeded",
        payload: {
          bySource: sourceResult.bySource,
          sourceOrder: sourceResult.sourceOrder,
          hasRenderableData: sourceResult.hasRenderableData,
          lastBuildAt: Date.now()
        }
      });
      const didRender = await _view.renderMetricsTrees(_KDB);
      if (signal.aborted) { return false; }
      _view.bindMetricsTreeSearch(_KDB);
      _dragSource.bindMetricsTreeDragSources(_KDB);
      api.dispatch({
        type: "metricsTree/rendered",
        payload: { lastRenderedAt: Date.now(), readyResolvedAt: Date.now() }
      });
      return didRender === true && sourceResult.hasRenderableData === true;
    } finally {
      finishLoading(_KDB);
    }
  }

  async function readSourceInput(_KDB) {
    const tableKey = _config.METRICS_TABLE_KEY;
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
  }

  async function readSuperUserAllowed(_KDB) {
    const tableData = _KDB.services ? _KDB.services.tableData : null;
    if (!tableData || typeof tableData.waitForRows !== "function") {
      return false;
    }

    const input = [{ tableName: _config.SUPERUSER_TABLE_NAME, isCoreTable: true }];
    try {
      const waitedRows = await tableData.waitForRows(input);
      const rows = typeof tableData.readRows === "function" ? tableData.readRows(input) : null;
      const superUserRows = Array.isArray(rows) ? rows : waitedRows;
      return Array.isArray(superUserRows) && superUserRows.length > 0
        && _readRightFlag(superUserRows) === true;
    } catch (err) {
      if (!(err && err.name === "AbortError")) {
        console.error("[metricsTree.readSuperUserAllowed]", err);
      }
      return false;
    }
  }

  function startLoading(_KDB) {
    const loading = _KDB.services && _KDB.services.loading;
    if (!loading || typeof loading.startLoading !== "function") { return; }
    const rootSelector = _kdbControlSelectors && _kdbControlSelectors.mainBlocksSelector;
    const mountEl = rootSelector ? document.querySelector(rootSelector) : null;
    if (!mountEl) { return; }
    loading.startLoading({
      mountEl: mountEl,
      mountKey: _config.LOADING_MOUNT_KEY,
      messageKey: _config.LOADING_MESSAGE_KEY
    });
  }

  function finishLoading(_KDB) {
    const loading = _KDB.services && _KDB.services.loading;
    if (loading && typeof loading.finishLoading === "function") {
      loading.finishLoading({ mountKey: _config.LOADING_MOUNT_KEY });
    }
  }

  function handleMountError(_instance, err) {
    finishLoading(_instance._KDB);
    if (_instance.isDisposed() || (err && err.name === "AbortError")) { return false; }
    console.error("[metricsTree.mount] mount failed", err);
    _instance.api.dispatch({
      type: "metricsTree/loadFailed",
      payload: { errorCode: "METRICS_TREE_MOUNT_FAILED", errorMessage: err && err.message ? err.message : String(err) }
    });
    return false;
  }

  return { mountMetricsTree: mountMetricsTree, handleMountError: handleMountError };
});
