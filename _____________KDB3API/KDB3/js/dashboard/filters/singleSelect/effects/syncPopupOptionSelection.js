define([
  "../config.js",
  "../state/selectionState.js",
  "./readPopupOptionLabel.js"
], function (_config, _selectionState, _readPopupOptionLabel) {
  "use strict";

  function setCheckboxState(_wrapper, _on) {
    var checkbox;
    var roleOption;
    if (!_wrapper) {
      return;
    }
    checkbox = _wrapper.querySelector(_config.domSelectors.checkboxInputSelector);
    if (checkbox) {
      checkbox.checked = _on === true;
      checkbox.setAttribute("aria-checked", _on ? "true" : "false");
    }
    roleOption = _wrapper.querySelector(_config.domSelectors.roleOptionSelector);
    if (roleOption) {
      roleOption.setAttribute("aria-selected", _on ? "true" : "false");
    }
  }

  function setOptionSelected(_wrapper, _on) {
    if (!_wrapper) {
      return;
    }
    _wrapper.classList.toggle("KDB_selectedOption", _on);
    _wrapper.classList.toggle(_config.domSelectors.selectedOptionClass, _on);
    _wrapper.setAttribute("aria-selected", _on ? "true" : "false");
    setCheckboxState(_wrapper, _on);
  }

  function syncPopupOptionSelection(_popupMount, _filterState) {
    var want;
    var options;
    var i;
    var el;
    var lab;
    if (!_popupMount || !_filterState) {
      return;
    }
    want = _selectionState.getPendingDisplayValue(_filterState.pendingSelection);
    options = _popupMount.querySelectorAll(_config.domSelectors.optionWrapperSelector);
    for (i = 0; i < options.length; i += 1) {
      setOptionSelected(options[i], false);
    }
    for (i = 0; i < options.length; i += 1) {
      el = options[i];
      lab = _readPopupOptionLabel.readPopupOptionLabel(el);
      if (lab === want) {
        setOptionSelected(el, true);
      }
    }
  }

  return syncPopupOptionSelection;
});
