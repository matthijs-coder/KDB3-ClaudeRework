define([], function () {
  "use strict";

  // The one place that names where the extension serves its static files (css/, images/) from.
  // Two URL spellings are in use and both stay byte-identical: `assetPath` ("v1/ext/KDB3/images/x.png") and
  // `dotAssetPath` ("./v1/ext/KDB3/css/x.css"); the browser resolves both against the same host path.
  var ASSET_BASE = "v1/ext/KDB3/";

  function assetPath(_relative) {
    return ASSET_BASE + _relative;
  }

  function dotAssetPath(_relative) {
    return "./" + ASSET_BASE + _relative;
  }

  return {
    ASSET_BASE: ASSET_BASE,
    assetPath: assetPath,
    dotAssetPath: dotAssetPath
  };
});
