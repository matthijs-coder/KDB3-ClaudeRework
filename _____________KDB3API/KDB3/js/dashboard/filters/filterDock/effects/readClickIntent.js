define([], function () {
  "use strict";

  function readOkCancelState(_target, _selectors) {
    var okEl =
      _target && _target.closest && _selectors.okButtonSelector
        ? _target.closest(_selectors.okButtonSelector)
        : null;
    var cancelEl =
      _target && _target.closest && _selectors.cancelButtonSelector
        ? _target.closest(_selectors.cancelButtonSelector)
        : null;
    if (okEl && okEl.classList && okEl.classList.contains(_selectors.disabledButtonClass)) {
      return null;
    }
    if (cancelEl && cancelEl.classList && cancelEl.classList.contains(_selectors.disabledButtonClass)) {
      return null;
    }
    if (!okEl && !cancelEl) {
      return {
        clickedOk: false,
        clickedCancel: false
      };
    }
    return {
      clickedOk: !!okEl,
      clickedCancel: !!cancelEl
    };
  }

  function readClickFlags(_target, _selectors, _okCancelState) {
    return {
      clickedOk: _okCancelState.clickedOk,
      clickedCancel: _okCancelState.clickedCancel,
      clickedClear: !!(_selectors.clearButtonSelector && _target.closest(_selectors.clearButtonSelector)),
      clickedClose: !!(_selectors.closeButtonSelector && _target.closest(_selectors.closeButtonSelector))
    };
  }

  function readOptionLabel(_target, _selectors) {
    var optionEl =
      _target && _selectors.optionSelector ? _target.closest(_selectors.optionSelector) : null;
    if (!optionEl || !_selectors.optionLabelSelector) {
      return null;
    }
    var labelEl = optionEl.querySelector(_selectors.optionLabelSelector);
    if (!labelEl) {
      return null;
    }
    var label = String(labelEl.getAttribute("aria-label") || labelEl.textContent || "").trim();
    return label || null;
  }

  function resolveAlleAndOption(_target, _selectors) {
    var alleSelector = _selectors.alleOptionSelector;
    var isAlleOption = !!(alleSelector && _target && _target.closest && _target.closest(alleSelector));
    if (isAlleOption) {
      return {
        isAlleOption: true,
        optionLabel: "Alle"
      };
    }
    var optionEl =
      _target && _selectors.optionSelector ? _target.closest(_selectors.optionSelector) : null;
    if (optionEl) {
      return {
        isAlleOption: false,
        optionLabel: readOptionLabel(_target, _selectors)
      };
    }
    return {
      isAlleOption: false,
      optionLabel: null
    };
  }

  function resolveInteractionType(_target, _selectors, _flags, _alleAndOption) {
    if (_flags.clickedOk) {
      return "confirm";
    }
    if (_flags.clickedCancel) {
      return "cancel";
    }
    if (_flags.clickedClear) {
      return "clear";
    }
    if (_flags.clickedClose) {
      return "close";
    }
    if (_alleAndOption.isAlleOption) {
      return "alle";
    }
    if (_target && _selectors.optionSelector && _target.closest(_selectors.optionSelector)) {
      return "option";
    }
    return "open";
  }

  function isPopupControlClick(_target, _selectors) {
    if (!_target || !_selectors) {
      return false;
    }
    if (_selectors.popupMountSelector && _target.closest(_selectors.popupMountSelector)) {
      return true;
    }
    if (_selectors.optionSelector && _target.closest(_selectors.optionSelector)) {
      return true;
    }
    if (_selectors.alleOptionSelector && _target.closest(_selectors.alleOptionSelector)) {
      return true;
    }
    if (_selectors.okButtonSelector && _target.closest(_selectors.okButtonSelector)) {
      return true;
    }
    if (_selectors.cancelButtonSelector && _target.closest(_selectors.cancelButtonSelector)) {
      return true;
    }
    if (_selectors.clearButtonSelector && _target.closest(_selectors.clearButtonSelector)) {
      return true;
    }
    if (_selectors.closeButtonSelector && _target.closest(_selectors.closeButtonSelector)) {
      return true;
    }
    return false;
  }

  return {
    readOkCancelState: readOkCancelState,
    readClickFlags: readClickFlags,
    isPopupControlClick: isPopupControlClick,
    resolveAlleAndOption: resolveAlleAndOption,
    resolveInteractionType: resolveInteractionType
  };
});
