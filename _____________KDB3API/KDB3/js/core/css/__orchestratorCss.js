define(["./config/cssHrefList.js", "./addCssLinks.js"], function (_cssHrefList, _addCssLinks) {
  function __orchestrator(_KDB) {
    _addCssLinks(_KDB, _cssHrefList);
  }

  return __orchestrator;
});
