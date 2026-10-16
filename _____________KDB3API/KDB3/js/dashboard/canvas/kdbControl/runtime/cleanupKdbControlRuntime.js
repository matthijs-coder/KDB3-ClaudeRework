define([], function () {
  "use strict";
  function abortAllControllers(rt) {
    var acs = rt.abortControllers || {};
    var k;
    for (k in acs) {
      if (Object.prototype.hasOwnProperty.call(acs, k)) {
        var c = acs[k];
        if (c && typeof c.abort === "function") c.abort();
        delete acs[k];
      }
    }
  }
  function runListenerCleanups(rt) {
    var lis = rt.listeners || {};
    var lk;
    for (lk in lis) {
      if (Object.prototype.hasOwnProperty.call(lis, lk)) {
        var fn = lis[lk];
        if (typeof fn === "function") fn();
        delete lis[lk];
      }
    }
  }
  function detachPlacedShell(rt) {
    var dr = rt.domRefs;
    if (dr && dr.placedShell && dr.placedShell.parentNode) {
      dr.placedShell.parentNode.removeChild(dr.placedShell);
    }
  }
  function unsubscribeAll(rt) {
    var subs = rt.subscriptions || {};
    var sk;
    for (sk in subs) {
      if (Object.prototype.hasOwnProperty.call(subs, sk)) {
        var u = subs[sk];
        if (typeof u === "function") u();
        delete subs[sk];
      }
    }
  }
  function abortSettingsForm(rt) {
    var sf = rt.abortControllers && rt.abortControllers.settingsForm;
    if (sf && typeof sf.abort === "function") sf.abort();
    if (rt.abortControllers) delete rt.abortControllers.settingsForm;
  }
  function cleanupKdbControlRuntime(_rt) {
    if (!_rt) {
      return;
    }
    unsubscribeAll(_rt);
    abortSettingsForm(_rt);
    abortAllControllers(_rt);
    detachPlacedShell(_rt);
    runListenerCleanups(_rt);
    _rt.frameworkBindContext = null;
  }
  return cleanupKdbControlRuntime;
});
