define([
  "../state/actionTypes.js",
  "../state/selectors.js"
], function (_types, _selectors) {
  "use strict";

  function findAttributeUp(target, attribute) {
    var node = target;
    while (node && node !== document.body) {
      if (node.getAttribute && node.getAttribute(attribute)) return node.getAttribute(attribute);
      node = node.parentNode;
    }
    return null;
  }

  // Click, or Enter/Space on the element: `resolveTarget(event.target)` returns the activation value (null = ignore).
  function bindActivation(el, signal, resolveTarget, activate) {
    function onActivate(event) {
      var value = resolveTarget(event.target);
      if (value == null) return;
      event.preventDefault();
      activate(value);
    }
    el.addEventListener("click", onActivate, { signal: signal });
    el.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") onActivate(event);
    }, { signal: signal });
  }

  // Collapse arrow, top panel toggles, expandable sections and the header settings button.
  function bindPanelToggles(ctx, signal) {
    var domRefs = ctx._KDB.runtime.kdbControl.domRefs;

    if (domRefs.arrowEl) {
      bindActivation(domRefs.arrowEl, signal, function () { return true; }, function () {
        var isCollapsed = _selectors.readFrameworkCollapsed(ctx.getState());
        ctx.dispatch({ type: _types.ACTION_FRAMEWORK_TOGGLE_COLLAPSE, payload: { isCollapsed: !isCollapsed } });
        ctx.syncView();
      });
    }
    if (domRefs.mainTogglesEl) {
      bindActivation(domRefs.mainTogglesEl, signal, function (target) {
        return findAttributeUp(target, "data-panel-id");
      }, function (panelId) {
        ctx.dispatch({ type: _types.ACTION_FRAMEWORK_SELECT_PANEL, payload: { panelId: panelId } });
        ctx.syncView();
      });
    }
    bindActivation(ctx.contentEl, signal, function (target) {
      return findAttributeUp(target, "data-section-id");
    }, function (sectionId) {
      ctx.dispatch({ type: _types.ACTION_FRAMEWORK_TOGGLE_SECTION, payload: { sectionId: sectionId } });
      ctx.syncView();
    });
    ctx.rootEl.addEventListener("click", function (event) {
      var button = event.target && event.target.closest && event.target.closest('[data-header-action="select-settings"]');
      if (!button) return;
      event.preventDefault();
      ctx.dispatch({ type: _types.ACTION_FRAMEWORK_SELECT_PANEL, payload: { panelId: "settings" } });
      ctx.syncView();
    }, { signal: signal });
  }

  return bindPanelToggles;
});
