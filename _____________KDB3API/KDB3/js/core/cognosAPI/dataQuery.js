define([], function () {
  "use strict";

  function isThenable(_value) {
    return !!(_value && typeof _value.then === "function");
  }

  function getWidgetContent(_widgetOrId) {
    if (typeof _widgetOrId === "string") {
      return __getDashboardAPI().getCanvas().getContent(_widgetOrId);
    }
    return _widgetOrId;
  }

  // Raw `getResult()` of the current query execution (value or promise), or null when the host chain is incomplete.
  function readCurrentResult(_widgetOrId) {
    var widget = getWidgetContent(_widgetOrId);
    var dq;
    var current;
    if (!widget || typeof widget.getFeature !== "function") return null;
    dq = widget.getFeature("DataQueryExecution");
    if (!dq || typeof dq.getCurrentQueryResults !== "function") return null;
    current = dq.getCurrentQueryResults();
    if (!current || typeof current.getResult !== "function") return null;
    return current.getResult();
  }

  async function getDataQueryResult(_widgetOrId) {
    var resultMaybe = readCurrentResult(_widgetOrId);
    var result = isThenable(resultMaybe) ? await resultMaybe : resultMaybe;
    return result || null;
  }

  function peekCurrentQueryResult(_widgetOrId) {
    var resultMaybe;
    try {
      resultMaybe = readCurrentResult(_widgetOrId);
      if (isThenable(resultMaybe)) return null;
      return resultMaybe || null;
    } catch (error) {
      console.error("[cognosAPI.dataQuery.peekCurrentQueryResult] failed", error);
      return null;
    }
  }

  function createDataQueryApi() {
    return {
      getDataQueryResult: getDataQueryResult,
      peekCurrentQueryResult: peekCurrentQueryResult
    };
  }

  return createDataQueryApi;
});
