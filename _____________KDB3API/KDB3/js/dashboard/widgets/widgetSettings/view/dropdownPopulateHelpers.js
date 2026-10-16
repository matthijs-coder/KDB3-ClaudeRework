define([
  "../config/selectors.js"
], function (_selectors) {
  function clearDropdownChildren(dropdown) {
    try {
      var node = dropdown.firstChild;
      var next;
      while (node) {
        next = node.nextSibling;
        if (!isSparedNestNode(node)) {
          dropdown.removeChild(node);
        }
        node = next;
      }
    } catch (err) {
      console.error("[widgetSettings.clearDropdownChildren] failed", err);
      throw err;
    }
  }

  function isSparedNestNode(node) {
    try {
      return !!(node && node.nodeType === 1 && node.getAttribute("data-kdb-showvalues-row"));
    } catch (err) {
      console.error("[widgetSettings.isSparedNestNode] failed", err);
      throw err;
    }
  }

  function queryHostOption(dropdown, selector) {
    try {
      var children = dropdown.children;
      var index = 0;
      var node;
      while (index < children.length) {
        node = children[index];
        if (node.matches && node.matches(selector)) {
          return node;
        }
        index += 1;
      }
      return null;
    } catch (err) {
      console.error("[widgetSettings.queryHostOption] failed", err);
      throw err;
    }
  }

  function ensureDropdownSelected(dropdown) {
    try {
      var defaultOption = queryHostOption(dropdown, _selectors.byAttr(_selectors.defaultOptionAttr, "1"));
      var first = queryHostOption(dropdown, _selectors.dropdownOptionSelector);
      var selected = queryHostOption(dropdown, "." + _selectors.optionSelectedClass);
      if (!selected && defaultOption) {
        defaultOption.classList.add(_selectors.optionSelectedClass);
        return;
      }
      if (!selected && first) {
        first.classList.add(_selectors.optionSelectedClass);
      }
    } catch (err) {
      console.error("[widgetSettings.ensureDropdownSelected] failed", err);
      throw err;
    }
  }

  function findSparedRowNode(dropdown, kind, className) {
    try {
      var children = dropdown.children;
      var index = 0;
      var node;
      while (index < children.length) {
        node = children[index];
        if (node.getAttribute("data-kdb-showvalues-row") === kind && node.classList.contains(className)) {
          return node;
        }
        index += 1;
      }
      return null;
    } catch (err) {
      console.error("[widgetSettings.findSparedRowNode] failed", { kind: kind }, err);
      throw err;
    }
  }

  function ensureToggleNest(dropdown, kind, phraseText) {
    try {
      var phrase = findSparedRowNode(dropdown, kind, "KDB_showValuesRowPhrase");
      var inner = findSparedRowNode(dropdown, kind, "KDB_IconsDropdown");
      if (!phrase) {
        phrase = document.createElement("div");
        phrase.className = "KDB_showValuesRowPhrase";
        phrase.setAttribute("data-kdb-showvalues-row", kind);
        phrase.textContent = phraseText;
        dropdown.appendChild(phrase);
      }
      if (!inner) {
        inner = document.createElement("div");
        inner.className = "KDB_IconsDropdown";
        inner.setAttribute(_selectors.dropdownKindAttr, kind);
        inner.setAttribute("data-kdb-showvalues-row", kind);
        inner.setAttribute("tabindex", "-1");
        dropdown.appendChild(inner);
      }
      return inner;
    } catch (err) {
      console.error("[widgetSettings.ensureToggleNest] failed", { kind: kind }, err);
      throw err;
    }
  }

  function appendHostOption(dropdown, node) {
    try {
      var nest = dropdown.firstChild;
      while (nest && !isSparedNestNode(nest)) {
        nest = nest.nextSibling;
      }
      if (nest) {
        dropdown.insertBefore(node, nest);
        return;
      }
      dropdown.appendChild(node);
    } catch (err) {
      console.error("[widgetSettings.appendHostOption] failed", err);
      throw err;
    }
  }

  return {
    clearDropdownChildren: clearDropdownChildren,
    ensureDropdownSelected: ensureDropdownSelected,
    ensureToggleNest: ensureToggleNest,
    appendHostOption: appendHostOption
  };
});
