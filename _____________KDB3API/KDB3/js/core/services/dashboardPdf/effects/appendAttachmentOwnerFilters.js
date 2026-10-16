define([], function () {
  "use strict";

  function warnMissingDisplay(_warnings, _message) {
    _warnings.push({ code: "DASHBOARD_PDF_FILTER_DISPLAY_UNAVAILABLE", message: _message });
  }

  function appendSicht(_owner, _globalByLabel, _warnings, _ops) {
    _ops.ensureBucket(_globalByLabel, "Sicht");
    if (!_owner.sichtState) {
      warnMissingDisplay(_warnings, "Sicht state is unavailable.");
      return;
    }
    if (_owner.sichtState.currentSelection && _owner.sichtState.currentSelection.displayValue != null) {
      _ops.pushDisplay(_globalByLabel, "Sicht", _owner.sichtState.currentSelection.displayValue);
      if (_globalByLabel.Sicht.values.length > 0) return;
    }
    if (_owner.sichtState.activeSichtValue != null) {
      _ops.pushDisplay(_globalByLabel, "Sicht", _owner.sichtState.activeSichtValue);
      _warnings.push({
        code: "DASHBOARD_PDF_SICHT_FALLBACK_USED",
        message: "Sicht used activeSichtValue fallback because currentSelection.displayValue is unavailable."
      });
      return;
    }
    warnMissingDisplay(_warnings, "Sicht display value is unavailable.");
  }

  function appendVisibleSpecials(_visibleLabels, _globalByLabel, _warnings, _ops) {
    Object.keys(_visibleLabels).forEach(function (label) {
      if (_ops.specialLabelGuard[label] && !_globalByLabel[label]) {
        _ops.ensureBucket(_globalByLabel, label);
        warnMissingDisplay(_warnings, label + " canonical display value is unavailable.");
      }
    });
  }

  function appendGlobalDienststelle(_entry, _globalByLabel, _warnings, _ops) {
    var globalEntry = _entry && _entry.currentSelectionByScope && _entry.currentSelectionByScope.global;
    var values = globalEntry && Array.isArray(globalEntry.currentValues) ? globalEntry.currentValues : [];
    _ops.ensureBucket(_globalByLabel, "Dienststelle");
    values.forEach(function (value) {
      if (value && value.displayValue != null) {
        _ops.pushDisplay(_globalByLabel, "Dienststelle", value.displayValue);
      }
    });
    if (_globalByLabel.Dienststelle.values.length === 0) {
      warnMissingDisplay(_warnings, "Dienststelle global display values are unavailable.");
    }
  }

  function appendScopedDienststelle(_entry, _scopeToTabId, _tabById, _warnings, _ops) {
    var pageContext = _entry && _entry.currentSelectionByScope && _entry.currentSelectionByScope.pageContext;
    Object.keys(pageContext || {}).sort().forEach(function (scopeId) {
      var scopedEntry = pageContext[scopeId];
      var values = scopedEntry && Array.isArray(scopedEntry.currentValues) ? scopedEntry.currentValues : [];
      var tabId = _scopeToTabId[_ops.normalizeScopeId(scopeId)];
      if (!tabId || !_tabById[tabId]) {
        _warnings.push({
          code: "DASHBOARD_PDF_ATTACHMENT_SCOPE_MAP_WARNING",
          message: "Skipped scoped Dienststelle values: tab mapping unresolved for scope '" + scopeId + "'."
        });
        return;
      }
      _ops.ensureBucket(_tabById[tabId], "Dienststelle");
      values.forEach(function (value) {
        var before = _tabById[tabId].Dienststelle.values.length;
        if (value && value.displayValue != null) {
          _ops.pushDisplay(_tabById[tabId], "Dienststelle", value.displayValue);
        }
        if (_tabById[tabId].Dienststelle.values.length === before) {
          warnMissingDisplay(_warnings, "Dienststelle scoped display value is unavailable for scope '" + scopeId + "'.");
        }
      });
    });
  }

  function appendAttachmentOwnerFilters(_owner, _visibleLabels, _scopeToTabId, _tabById, _globalByLabel, _warnings, _ops) {
    var state = _owner.dienststelleState || {};
    var activeKey = state.activeFilterKey;
    var activeEntry = state.byFilter && activeKey ? state.byFilter[activeKey] : null;
    appendSicht(_owner, _globalByLabel, _warnings, _ops);
    appendVisibleSpecials(_visibleLabels, _globalByLabel, _warnings, _ops);
    appendGlobalDienststelle(activeEntry, _globalByLabel, _warnings, _ops);
    appendScopedDienststelle(activeEntry, _scopeToTabId, _tabById, _warnings, _ops);
  }

  return appendAttachmentOwnerFilters;
});
