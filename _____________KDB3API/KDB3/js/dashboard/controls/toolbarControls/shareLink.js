define(["./config.js"], function (_config) {
  "use strict";

  var LINK = _config.SHARE_LINK;

  function readNonEmptyLabel(label, emptyParameterLabel) {
    var text = label == null ? "" : String(label);
    return text.length > 0 ? text : emptyParameterLabel;
  }

  function buildShareDashboardLink(input) {
    var params = new URLSearchParams();
    params.set("perspective", LINK.hashKeys.perspective);
    params.set("pathRef", input.pathRef);
    params.set("action", LINK.hashKeys.action);
    params.set("mode", LINK.hashKeys.mode);
    if (typeof input.subView === "string" && input.subView.length > 0) params.set("subView", input.subView);
    params.set("nav_filter", LINK.hashKeys.navFilter);
    if (input.id != null) params.set("parameterId", String(input.id));
    params.set("parameterLabel", readNonEmptyLabel(input.label, input.emptyParameterLabel));
    if (input.isKdbReadOnly === true) params.set(LINK.readOnlyTokenKey, LINK.readOnlyTokenValue);
    return String(input.biBase || "") + "?" + params.toString();
  }

  function openShareCopyDialog(_KDB, input) {
    var labels = input.labels || {};
    var linkInput = {
      biBase: input.biBase,
      pathRef: input.pathRef,
      subView: input.subView,
      id: input.id,
      label: input.label,
      emptyParameterLabel: input.emptyParameterLabel
    };
    var editUrl = buildShareDashboardLink(Object.assign({}, linkInput, { isKdbReadOnly: false }));
    var readOnlyUrl = buildShareDashboardLink(Object.assign({}, linkInput, { isKdbReadOnly: true }));
    _KDB.services.message.showCopyable({
      title: input.title,
      message: "",
      copyText: readOnlyUrl,
      toggle: {
        label: labels.readOnlyToggleLabel,
        title: labels.readOnlyToggleTitle,
        isChecked: true,
        copyTextChecked: readOnlyUrl,
        copyTextUnchecked: editUrl
      }
    });
  }

  function readNavigationName() {
    var entries;
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return null;
    entries = performance.getEntriesByType("navigation");
    return entries && entries[0] && entries[0].name ? entries[0].name : null;
  }

  function readDocumentLocation() {
    return typeof document !== "undefined" && document.location ? document.location : null;
  }

  function readHashTokenValue(hash) {
    var stripped = String(hash || "").replace(/^#/, "");
    var queryPart;
    if (!stripped) return null;
    queryPart = stripped.indexOf("?") !== -1 ? stripped.split("?")[1] : stripped;
    return new URLSearchParams(queryPart).get(LINK.readOnlyTokenKey);
  }

  // Returns null when the candidate is not a parseable URL.
  function hasReadOnlyToken(href, origin) {
    var url;
    try {
      url = new URL(href, origin);
    } catch (_error) {
      return null;
    }
    if (url.searchParams.get(LINK.readOnlyTokenKey) === LINK.readOnlyTokenValue) return true;
    return readHashTokenValue(url.hash) === LINK.readOnlyTokenValue;
  }

  function readShareReadOnlyTokenPresent() {
    var location = readDocumentLocation();
    var candidates = [readNavigationName(), location && location.href].filter(Boolean);
    var results = candidates.map(function (href) { return hasReadOnlyToken(href, (location && location.origin) || undefined); });
    if (results.indexOf(true) !== -1) return true;
    if (candidates.length > 0 && results.every(function (result) { return result === null; })) {
      console.warn("[shareControls.readShareReadOnlyTokenPresent] invalid URL candidates", { count: candidates.length });
    }
    return false;
  }

  function readDashboardClassHostSelector(_KDB) {
    var root = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root;
    return (root && root.dashboardClassHost) || null;
  }

  // Public API entry point (KDB.js calls it once the root is ready): boundary with its own log.
  function applyShareReadOnlyChrome(_KDB) {
    var selector = readDashboardClassHostSelector(_KDB);
    var host;
    try {
      host = selector && typeof document !== "undefined" ? document.querySelector(selector) : null;
      if (!host || !host.classList) {
        console.warn("[shareControls.applyShareReadOnlyChrome] dashboardClassHost node missing");
        return;
      }
      host.classList.toggle(LINK.readOnlyClass, readShareReadOnlyTokenPresent());
    } catch (error) {
      console.error("[shareControls.applyShareReadOnlyChrome] failed", error);
    }
  }

  return {
    buildShareDashboardLink: buildShareDashboardLink,
    openShareCopyDialog: openShareCopyDialog,
    readShareReadOnlyTokenPresent: readShareReadOnlyTokenPresent,
    applyShareReadOnlyChrome: applyShareReadOnlyChrome
  };
});
