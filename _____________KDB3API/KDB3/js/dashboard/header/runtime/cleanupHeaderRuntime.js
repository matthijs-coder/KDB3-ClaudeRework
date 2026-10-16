define([], function () {
  "use strict";
  function cleanupHeaderRuntime(_KDB) {
    var rt = _KDB.runtime.header;
    var acs = rt.abortControllers || {};
    var key;
    for (key in acs) {
      if (Object.prototype.hasOwnProperty.call(acs, key)) {
        var ac = acs[key];
        if (ac && typeof ac.abort === "function") ac.abort();
        delete acs[key];
      }
    }
    if (rt.domRefs && rt.domRefs.rootEl && rt.domRefs.rootEl.parentNode) {
      rt.domRefs.rootEl.parentNode.removeChild(rt.domRefs.rootEl);
    }
    rt.domRefs = { rootEl: null, titleEl: null, subtitleEl: null, draftTitleEl: null, draftSubtitleEl: null, iconEl: null, mountTargetEl: null };
    rt.historyReplayHandlerContribution = null;
  }
  return cleanupHeaderRuntime;
});
