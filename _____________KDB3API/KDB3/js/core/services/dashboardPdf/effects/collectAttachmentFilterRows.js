define([
  "./sanitizeAttachmentText.js",
  "../../../utils/normalizeCognosScopeId.js",
  "./resolveAttachmentScopeTargets.js",
  "./attachmentFilterInstanceSupport.js",
  "./appendAttachmentOwnerFilters.js"
], function (_sanitizeAttachmentText, _normalizeCognosScopeId, _resolveAttachmentScopeTargets, _instanceSupport, _appendOwnerFilters) {
  "use strict";

  var ORDERED_LABELS = _instanceSupport.ORDERED_LABELS;

  function toDisplay(_value) {
    return _sanitizeAttachmentText.cleanValue(_value == null ? "" : String(_value));
  }

  function ensureLabelBucket(_bucket, _label) {
    if (!_bucket[_label]) {
      _bucket[_label] = { values: [], seen: {} };
    }
    return _bucket[_label];
  }

  function pushDisplay(_bucket, _label, _value) {
    var entry = ensureLabelBucket(_bucket, _label);
    var value = toDisplay(_value);
    if (!value || entry.seen[value]) return;
    entry.seen[value] = true;
    entry.values.push(value);
  }

  function namedMultilineText(_named) {
    if (!_named || !_named.length) return "";
    return _named.map(function (item) { return item.label + ": " + item.value; }).join("\n");
  }

  async function collectAttachmentFilterRows(_KDB, _manifest, _owner, _warnings) {
    var globalByLabel = {};
    var tabById = {};
    var singleSelectState = await _instanceSupport.ensureFreshSingleSelectInventory(_KDB);
    var visibleSpecialLabels = _instanceSupport.collectSpecialVisibility(_owner.specialState);
    var scopeToTabId = await _resolveAttachmentScopeTargets(_KDB, _manifest, _warnings);
    var instancesById = singleSelectState.instancesById || {};
    (_manifest.tabs || []).forEach(function (tab) {
      tabById[tab.tabId] = {};
    });
    Object.keys(instancesById).sort().forEach(function (id) {
      var instance = instancesById[id];
      var label = _sanitizeAttachmentText.cleanLabel(instance && instance.filterLabel);
      var targetTabId;
      if (!instance || !label || ORDERED_LABELS.indexOf(label) === -1) return;
      if (label === "Dienststelle" || label === "Sicht") return;
      if (instance.selectionOwner !== "singleSelect" || instance.status !== "active" || instance.hostStatus !== "present") return;
      if (_instanceSupport.SPECIAL_LABEL_GUARD[label] && visibleSpecialLabels[label] !== true) return;
      if (instance.scopeType === "global") {
        pushDisplay(globalByLabel, label, _instanceSupport.readCanonicalDisplay(instance, _warnings));
        return;
      }
      if (instance.scopeType !== "pageContext") return;
      targetTabId = scopeToTabId[_normalizeCognosScopeId(instance.scopeId)];
      if (!targetTabId || !tabById[targetTabId]) {
        _warnings.push({
          code: "DASHBOARD_PDF_ATTACHMENT_SCOPE_MAP_WARNING",
          message: "Skipped page-context filter '" + label + "' because tab mapping is unresolved for scope '" + String(instance.scopeId || "") + "'.",
          filterInstanceId: instance.filterInstanceId
        });
        return;
      }
      pushDisplay(tabById[targetTabId], label, _instanceSupport.readCanonicalDisplay(instance, _warnings));
    });
    _appendOwnerFilters(_owner, visibleSpecialLabels, scopeToTabId, tabById, globalByLabel, _warnings, {
      ensureBucket: ensureLabelBucket,
      pushDisplay: pushDisplay,
      normalizeScopeId: _normalizeCognosScopeId,
      specialLabelGuard: _instanceSupport.SPECIAL_LABEL_GUARD
    });
    return {
      globalText: namedMultilineText(ORDERED_LABELS.filter(function (label) { return !!globalByLabel[label]; }).map(function (label) {
        return { label: label, value: globalByLabel[label].values.join("; ") };
      })),
      tabRows: (_manifest.tabs || []).map(function (tab) {
        var byLabel = tabById[tab.tabId] || {};
        var named = ORDERED_LABELS.filter(function (label) { return !!byLabel[label]; }).map(function (label) {
          return { label: label, value: byLabel[label].values.join("; ") };
        });
        return {
          label: _sanitizeAttachmentText.cleanLabel(tab.name) + " -Tab Filter: ",
          value: namedMultilineText(named)
        };
      })
    };
  }

  return collectAttachmentFilterRows;
});
