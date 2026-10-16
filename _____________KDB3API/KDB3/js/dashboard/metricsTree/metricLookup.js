define([], function () {
  "use strict";

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function createUnresolved(code) {
    return {
      resolved: false,
      code: code,
      display: "",
      langtext: "",
      title: "",
      metricsTable: "",
      url: "",
      draggedElementType: ""
    };
  }

  function createResolved(code, entry) {
    const attrs = entry.attrs;
    const title = toText(attrs.title);
    const langtext = toText(attrs.langtext);

    return {
      resolved: true,
      code: code,
      display: toText(attrs.display),
      langtext: langtext === "" ? title : langtext,
      title: title,
      metricsTable: toText(entry.sourceNode && entry.sourceNode.sourceKey || entry.sourceKey),
      url: toText(attrs["data-url"]),
      draggedElementType: toText(attrs.draggedElementType)
    };
  }

  // First occurrence wins, in sourceOrder then node order. Keys are the raw (untrimmed) code attribute.
  function buildMetricCodeIndex(_bySource, _sourceOrder) {
    const bySource = _bySource && typeof _bySource === "object" ? _bySource : {};
    const sourceOrder = Array.isArray(_sourceOrder) ? _sourceOrder : Object.keys(bySource);
    const byCode = new Map();

    for (let sourceIndex = 0; sourceIndex < sourceOrder.length; sourceIndex += 1) {
      const sourceKey = sourceOrder[sourceIndex];
      const sourceNode = bySource[sourceKey];
      const nodes = sourceNode && Array.isArray(sourceNode.nodes) ? sourceNode.nodes : [];

      for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
        const attrs = nodes[nodeIndex] && nodes[nodeIndex].a_attr;
        if (!attrs || attrs.code == null) {
          continue;
        }

        const key = String(attrs.code);
        if (!byCode.has(key)) {
          byCode.set(key, { attrs: attrs, sourceNode: sourceNode, sourceKey: sourceKey });
        }
      }
    }

    return byCode;
  }

  function readMetricIndex(_runtime, _state) {
    const cached = _runtime.metricIndex;
    if (cached && cached.bySource === _state.bySource && cached.sourceOrder === _state.sourceOrder) {
      return cached.byCode;
    }

    const byCode = buildMetricCodeIndex(_state.bySource, _state.sourceOrder);
    _runtime.metricIndex = { bySource: _state.bySource, sourceOrder: _state.sourceOrder, byCode: byCode };
    return byCode;
  }

  function resolveMetricByCode(_KDB, _code) {
    const trimmedCode = toText(_code).trim();

    if (trimmedCode === "") {
      return createUnresolved("");
    }

    const state = _KDB && _KDB.state ? _KDB.state.metricsTree : null;
    if (!state || state.lifecycle !== "ready") {
      return createUnresolved(trimmedCode);
    }

    const entry = readMetricIndex(_KDB.runtime.metricsTree, state).get(trimmedCode);
    return entry ? createResolved(trimmedCode, entry) : createUnresolved(trimmedCode);
  }

  return {
    buildMetricCodeIndex: buildMetricCodeIndex,
    resolveMetricByCode: resolveMetricByCode
  };
});
