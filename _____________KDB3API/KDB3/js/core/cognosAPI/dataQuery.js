define([], function () {
  "use strict";

  function getWidgetContent(_widgetOrId) {
    if (typeof _widgetOrId === "string") {
      return __getDashboardAPI().getCanvas().getContent(_widgetOrId);
    }
    return _widgetOrId;
  }

  function peekCurrentQueryResult(_widgetOrId) {
    try {
      const widget = getWidgetContent(_widgetOrId);
      if (!widget || typeof widget.getFeature !== "function") {
        return null;
      }
      const dq = widget.getFeature("DataQueryExecution");
      if (!dq || typeof dq.getCurrentQueryResults !== "function") {
        return null;
      }
      const current = dq.getCurrentQueryResults();
      if (!current || typeof current.getResult !== "function") {
        return null;
      }
      const resultMaybe = current.getResult();
      if (resultMaybe && typeof resultMaybe.then === "function") {
        return null;
      }
      return resultMaybe || null;
    } catch (error) {
      console.error("[cognosAPI.dataQuery.peekCurrentQueryResult] failed", error);
      return null;
    }
  }

  function __controller(_KDB) {
    try {
      return {
        getDataQueryResult: async function (_widgetOrId) {
          const widget = getWidgetContent(_widgetOrId);
          if (!widget || typeof widget.getFeature !== "function") {
            return null;
          }
          const dq = widget.getFeature("DataQueryExecution");
          if (!dq || typeof dq.getCurrentQueryResults !== "function") {
            return null;
          }
          const current = dq.getCurrentQueryResults();
          if (!current || typeof current.getResult !== "function") {
            return null;
          }
          const resultMaybe = current.getResult();
          const result =
            resultMaybe && typeof resultMaybe.then === "function" ? await resultMaybe : resultMaybe;
          return result || null;
        },
        peekCurrentQueryResult: peekCurrentQueryResult,
      };
    } catch (error) {
      console.error("[KDB][__controller] failed", error);
      throw error;
    }
  }

  return __controller;
});
