define([], function () {
  "use strict";

  function toString(value) {
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

  function createResolved(code, attrs, sourceNode, sourceKey) {
    const display = toString(attrs.display);
    const title = toString(attrs.title);
    let langtext = toString(attrs.langtext);
    if (langtext === "") {
      langtext = title;
    }

    return {
      resolved: true,
      code: code,
      display: display,
      langtext: langtext,
      title: title,
      metricsTable: toString(sourceNode && sourceNode.sourceKey || sourceKey),
      url: toString(attrs["data-url"]),
      draggedElementType: toString(attrs.draggedElementType)
    };
  }

  function findMetricInNodes(nodes, trimmedCode) {
    const queue = Array.isArray(nodes) ? nodes.slice() : [];

    while (queue.length > 0) {
      const node = queue.shift();
      const attrs = node && node.a_attr;

      if (attrs && toString(attrs.code) === trimmedCode) {
        return node;
      }

      const children = node && Array.isArray(node.children) ? node.children : [];
      for (let index = 0; index < children.length; index += 1) {
        queue.push(children[index]);
      }
    }

    return null;
  }

  function resolveMetricByCode(_KDB, _code) {
    const trimmedCode = toString(_code).trim();

    if (trimmedCode === "") {
      return createUnresolved("");
    }

    const state = _KDB && _KDB.state ? _KDB.state.metricsTree : null;
    if (!state || state.lifecycle !== "ready") {
      return createUnresolved(trimmedCode);
    }

    const bySource = state.bySource && typeof state.bySource === "object" ? state.bySource : {};
    const sourceOrder = Array.isArray(state.sourceOrder) ? state.sourceOrder : Object.keys(bySource);

    for (let index = 0; index < sourceOrder.length; index += 1) {
      const sourceKey = sourceOrder[index];
      const sourceNode = bySource[sourceKey];
      const nodes = sourceNode && Array.isArray(sourceNode.nodes) ? sourceNode.nodes : [];
      const matchedNode = findMetricInNodes(nodes, trimmedCode);

      if (matchedNode) {
        return createResolved(trimmedCode, matchedNode.a_attr, sourceNode, sourceKey);
      }
    }

    return createUnresolved(trimmedCode);
  }

  return {
    resolveMetricByCode: resolveMetricByCode
  };
});
