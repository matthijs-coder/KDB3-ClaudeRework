define([
  "../config/selectors.js",
  "./ensureSichtRuntime.js",
  "./resolveSichtPopupMount.js",
  "./readSichtOptionLabel.js",
  "./hideDuplicateSichtOptions.js",
  "./applySichtOptionState.js"
], function (
  _selectors,
  _ensureSichtRuntime,
  _resolveSichtPopupMount,
  _readSichtOptionLabel,
  _hideDuplicateSichtOptions,
  _applySichtOptionState
) {
  "use strict";

  function readActiveSichtValue(_KDB) {
    var sichtState = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    if (!sichtState) {
      return null;
    }
    if (sichtState.activeSichtValue != null && String(sichtState.activeSichtValue).trim() !== "") {
      return String(sichtState.activeSichtValue);
    }
    return (sichtState.currentSelection && sichtState.currentSelection.displayValue)
      ? String(sichtState.currentSelection.displayValue)
      : null;
  }

  function readOptionKey(_label) {
    if (_label === "BW" || _label === "DEZPV") {
      return _label;
    }
    return null;
  }

  function syncSichtOptionAvailability(_KDB, _mappedHandoff, _byOption) {
    var popupMount;
    var dockSelectors;
    var optionElArr;
    var activeSichtValue;
    var visibleCount;
    var enabledCount;
    var idx;
    var optionEl;
    var label;
    var optionKey;
    var optionState;
    var appliedState;
    if (!_KDB || !_mappedHandoff || !_byOption) {
      return { didSync: false, visibleCount: 0, enabledCount: 0 };
    }
    popupMount = _resolveSichtPopupMount(_KDB, _mappedHandoff, true);
    if (!popupMount || !popupMount.querySelectorAll) {
      return { didSync: false, visibleCount: 0, enabledCount: 0 };
    }
    _ensureSichtRuntime(_KDB).domRefs.popupMount = popupMount;
    popupMount.classList.add(_selectors.rootClass);
    dockSelectors = _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.filterDock
      : null;
    optionElArr = Array.prototype.slice.call(
      popupMount.querySelectorAll(
        dockSelectors && dockSelectors.optionSelector
          ? dockSelectors.optionSelector
          : _selectors.optionSelector
      )
    );
    _hideDuplicateSichtOptions(optionElArr);
    activeSichtValue = readActiveSichtValue(_KDB);
    visibleCount = 0;
    enabledCount = 0;
    for (idx = 0; idx < optionElArr.length; idx += 1) {
      optionEl = optionElArr[idx];
      label = _readSichtOptionLabel.readSichtOptionLabel(optionEl);
      optionKey = readOptionKey(label);
      optionState = optionKey ? _byOption[optionKey] : null;
      appliedState = _applySichtOptionState(
        optionEl,
        optionKey,
        optionState,
        _readSichtOptionLabel.isSichtOptionSelected(optionEl) || label === activeSichtValue
      );
      if (appliedState.isVisible) {
        visibleCount += 1;
      }
      if (appliedState.isEnabled) {
        enabledCount += 1;
      }
    }
    return { didSync: true, visibleCount: visibleCount, enabledCount: enabledCount };
  }

  return syncSichtOptionAvailability;
});
