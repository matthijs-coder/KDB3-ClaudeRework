define([
  "./readFilterLabel.js",
  "./readFilterScope.js",
  "./resolveFilterType.js",
  "./cloneFilterIdentityValues.js",
  "./readFilterInstanceHints.js",
  "../../../../core/utils/getKennzahlenSource.js"
], function (
  _readFilterLabel,
  _readFilterScope,
  _resolveFilterType,
  _cloneFilterIdentityValues,
  _readFilterInstanceHints,
  _getKennzahlenSource
) {
  "use strict";

  function buildElementSignature(_element) {
    if (!_element || _element.nodeType !== 1) {
      return "";
    }
    var parts = [_element.tagName || "UNKNOWN"];
    var dataTid = _element.getAttribute ? _element.getAttribute("data-tid") : null;
    if (dataTid) {
      parts.push("data-tid=" + dataTid);
    }
    if (_element.id) {
      parts.push("id=" + _element.id);
    }
    if (_element.className) {
      parts.push("class=" + String(_element.className).split(/\s+/).slice(0, 3).join("."));
    }
    return parts.join("|");
  }

  function resolveFilterIdentity(
    _KDB,
    _filterEl,
    _selectors,
    _getFilterConfig,
    _resolveFilterCapabilities
  ) {
    var filterLabel = _readFilterLabel.readFilterLabel(_filterEl, _selectors);
    var scopeType = _filterEl.closest(_selectors.globalDockSelector) ? "global" : "pageContext";
    var filterScope = scopeType;
    var scopeContext = _readFilterScope.readScopeContext(_KDB, scopeType);
    var tabId = scopeContext.tabId;
    var runtimeScope = scopeType === "global" ? "global" : tabId || "pageContext";
    var kennzahlenSource = _getKennzahlenSource(_KDB);
    var filterConfig = _getFilterConfig(_KDB, filterLabel, scopeType, kennzahlenSource);
    var filterInstanceHints = _readFilterInstanceHints(
      _KDB,
      scopeType,
      filterLabel,
      filterConfig,
      kennzahlenSource
    );
    var capabilities = _cloneFilterIdentityValues.cloneCapabilities(
      _resolveFilterCapabilities(filterConfig, _KDB)
    );
    var filterType = _resolveFilterType.resolveFilterType(capabilities);

    return {
      filterLabel: filterLabel,
      scopeType: scopeType,
      filterScope: filterScope,
      tabId: tabId,
      scopeId: scopeContext.scopeId,
      scopeResolution: scopeContext.scopeResolution,
      legacyScope: scopeContext.legacyScope,
      legacyScopeId: scopeContext.legacyScopeId,
      tabContextDiagnostic: scopeContext.tabContextDiagnostic,
      filterInstanceId: null,
      itemNameHint: filterInstanceHints.itemNameHint,
      itemIdHint: filterInstanceHints.itemIdHint,
      semanticInstanceKeyHint: filterInstanceHints.semanticInstanceKeyHint,
      filterConfig: _cloneFilterIdentityValues.cloneSerializableValue(filterConfig),
      capabilities: capabilities,
      filterType: filterType,
      filterKey: filterScope + "__" + filterLabel,
      filterId: runtimeScope + "__" + filterLabel
    };
  }

  function buildFilterIdFromElement(_KDB, _filterEl, _selectors) {
    var filterLabel = _readFilterLabel.readFilterLabel(_filterEl, _selectors);
    if (!filterLabel) {
      return null;
    }
    var scopeType = _filterEl.closest(_selectors.globalDockSelector) ? "global" : "pageContext";
    return _readFilterScope.readRuntimeScope(_KDB, scopeType) + "__" + filterLabel;
  }

  return {
    buildElementSignature: buildElementSignature,
    buildFilterIdFromElement: buildFilterIdFromElement,
    resolveFilterIdentity: resolveFilterIdentity
  };
});
