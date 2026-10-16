define([
  "../../../../core/authoring/state/selectors",
  "../../../../core/events/authoringMode",
], function (_readIsAuthoring, _authoringEventNames) {
  "use strict";
  function syncAuthoringClassFromBoolean(_KDB, isAuthoring) {
    var rt = _KDB.runtime.kdbControl;
    var el = rt && rt.domRefs && rt.domRefs.rootEl;
    if (el && el.classList) {
      el.classList.toggle("kdb-control--authoring", isAuthoring === true);
    }
  }
  function enteredHandler(_KDB) {
    return function (_payload) {
      void _payload;
      syncAuthoringClassFromBoolean(_KDB, _readIsAuthoring(_KDB));
    };
  }
  function exitedHandler(_KDB) {
    return function (_payload) {
      void _payload;
      syncAuthoringClassFromBoolean(_KDB, _readIsAuthoring(_KDB));
    };
  }
  function ensureAuthoringSubscriptions(_KDB) {
    var rt = _KDB.runtime.kdbControl;
    if (!rt || !rt.subscriptions) return;
    if (rt.subscriptions.authoringEntered) return;
    syncAuthoringClassFromBoolean(_KDB, _readIsAuthoring(_KDB));
    var uIn = _KDB.events.subscribe(_authoringEventNames.AUTHORING_ENTERED, enteredHandler(_KDB));
    var uOut = _KDB.events.subscribe(_authoringEventNames.AUTHORING_EXITED, exitedHandler(_KDB));
    rt.subscriptions.authoringEntered = uIn;
    rt.subscriptions.authoringExited = uOut;
  }
  function __orchestratorAuthoringMode(_KDB) {
    ensureAuthoringSubscriptions(_KDB);
  }
  return __orchestratorAuthoringMode;
});
