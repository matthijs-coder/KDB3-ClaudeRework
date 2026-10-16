define(["../config.js"], function (_config) {
  "use strict";

  var ALLE_HTML =
    '<div class="ba-common-listItem-wrapper KDB_singleSelect_AlleOption"><div data-tid="KDB_singleSelect_AlleOption" role="option" class="ba-common-flexLayout ba-common-listItem is-selectable" aria-selected="false"><div class="list-item-children"><div class="ba-common-flexLayout" style="max-width: 100%; display: flex;"><div class="ba-common-container ba-common-flexLayout-item" style="flex-grow: 0; flex-shrink: 0; padding: 0px 8px 0px 0px;"><div class="bx--form-item bx--checkbox-wrapper ba-common-checkbox is-visual"><input tabindex="-1" data-tid="buc-Checkbox" type="checkbox" class="bx--checkbox"><label class="bx--checkbox-label"><span class="bx--checkbox-label-text"></span></label></div></div><div class="ba-common-container ba-common-flexLayout-item" style="flex: 1 1 0px;"><div class="ba-common-truncatedText" style="max-width: 216px; display: table;"><div class="ba-common-truncatedText__text" aria-label="Alle" dir="ltr">Alle</div></div></div></div></div></div></div>';

  function readPopupOptionLabel(_el) {
    var textNode;
    if (!_el) {
      return "";
    }
    if (_el.classList.contains(_config.domSelectors.alleOptionClass)) {
      return "Alle";
    }
    textNode = _el.querySelector(_config.domSelectors.optionLabelSelector);
    return textNode
      ? String(textNode.getAttribute("aria-label") || textNode.textContent || "").trim()
      : "";
  }

  function resolvePopupMountSelector(_KDB) {
    var filterDock =
      _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.filterDock : null;
    if (filterDock && filterDock.popupMountSelector) {
      return filterDock.popupMountSelector;
    }
    return _config.domSelectors.popupMountFallbackSelector;
  }

  function ensureAlleOption(_root, _hasAlle, _KDB) {
    var alleSelector = "." + _config.domSelectors.alleOptionClass;
    var a = _root.querySelectorAll(alleSelector);
    var alleMount;
    var i;
    if (_hasAlle !== true) {
      for (i = 0; i < a.length; i += 1) {
        a[i].remove();
      }
      return;
    }
    if (!_root.querySelector(alleSelector)) {
      alleMount = _root.querySelector(_KDB.elements.selectors.singleSelect.alleOptionMountSelector);
      if (alleMount) {
        alleMount.insertAdjacentHTML("afterbegin", ALLE_HTML);
      }
    }
  }

  return {
    readPopupOptionLabel: readPopupOptionLabel,
    resolvePopupMountSelector: resolvePopupMountSelector,
    ensureAlleOption: ensureAlleOption
  };
});
