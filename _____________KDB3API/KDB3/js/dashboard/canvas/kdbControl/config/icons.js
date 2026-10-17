define(["../../../../core/config/assetBase.js"], function (_assetBase) {
  "use strict";

  var DEFAULT_ICON_SRC = {
    kdbControlHeaderIconSettingsSrc: _assetBase.assetPath("images/settings.svg"),
    kdbControlHeaderIconInfoSrc: _assetBase.assetPath("images/info.svg")
  };

  function readIconSrc(_KDB, optionKey) {
    var options = _KDB && _KDB.config && _KDB.config.options;
    var configured = options && options[optionKey];
    return typeof configured === "string" && configured ? configured : DEFAULT_ICON_SRC[optionKey];
  }

  return { readIconSrc: readIconSrc };
});
