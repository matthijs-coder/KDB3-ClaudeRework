define([], function () {
  "use strict";
  var didWarnMissingHeaderApi = false;
  var didWarnMissingFooterApi = false;
  function warnMissingHeaderDispatch() {
    if (didWarnMissingHeaderApi) return;
    didWarnMissingHeaderApi = true;
    console.warn("[kdbControl] _KDB.api.header.dispatch is missing; toolbox header actions are ignored.");
  }
  function warnMissingFooterDispatch() {
    if (didWarnMissingFooterApi) return;
    didWarnMissingFooterApi = true;
    console.warn("[kdbControl] _KDB.api.footer.dispatch is missing; toolbox footer actions are ignored.");
  }
  return { warnMissingHeaderDispatch: warnMissingHeaderDispatch, warnMissingFooterDispatch: warnMissingFooterDispatch };
});
