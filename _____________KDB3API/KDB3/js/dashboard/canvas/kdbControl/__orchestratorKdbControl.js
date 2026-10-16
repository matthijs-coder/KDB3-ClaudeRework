define(["./createKdbControlController"], function (_createKdbControlController) {
  "use strict";
  // kdbControl root lifecycle subset: idle, mounted, ready, error, disposed (see lifecycleVocabulary.md).
  function __orchestratorKdbControl(_KDB) {
    _KDB.api.kdbControl = _createKdbControlController(_KDB);
  }
  return __orchestratorKdbControl;
});
