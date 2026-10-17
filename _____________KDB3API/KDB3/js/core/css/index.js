define(["./config/cssHrefList.js", "./addCssLinks.js"], function (_cssHrefList, _addCssLinks) {
  function registerCss(_KDB) {
    _addCssLinks(_KDB, _cssHrefList);
  }

  return registerCss;
});
