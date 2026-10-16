define([], function () {
  "use strict";

  var PATH_EXT_KDB3_IMAGES = "v1/ext/KDB3/images/";
  var PATH_EXT_KDB3_IMAGES_PREVIEW = "v1/ext/KDB3/images/";

  function normalizeBase(s) {
    if (!s || typeof s !== "string") return "";
    var t = s.trim();
    if (!t) return "";
    return t.charAt(t.length - 1) === "/" ? t : t + "/";
  }

  function resolveKdb3ExtImagesBase(_KDB) {
    var ep = _KDB && _KDB.config && _KDB.config.extAssetPaths;
    if (ep && typeof ep.kdb3ImagesBase === "string") {
      var o = normalizeBase(ep.kdb3ImagesBase);
      if (o) return o;
    }
    if (ep && ep.useKdb3ImagesTest === true) return PATH_EXT_KDB3_IMAGES_PREVIEW;
    return PATH_EXT_KDB3_IMAGES;
  }

  return {
    PATH_EXT_KDB3_IMAGES: PATH_EXT_KDB3_IMAGES,
    PATH_EXT_KDB3_IMAGES_PREVIEW: PATH_EXT_KDB3_IMAGES_PREVIEW,
    resolveKdb3ExtImagesBase: resolveKdb3ExtImagesBase
  };
});