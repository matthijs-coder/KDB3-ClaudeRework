define([], function () {
  "use strict";

  var DEFAULT_ICON_SRC = {
    kdbControlHeaderIconSettingsSrc: "v1/ext/KDB3/images/settings.svg",
    kdbControlHeaderIconInfoSrc: "v1/ext/KDB3/images/info.svg"
  };

  function readIconSrc(_KDB, optionKey) {
    var options = _KDB && _KDB.config && _KDB.config.options;
    var configured = options && options[optionKey];
    return typeof configured === "string" && configured ? configured : DEFAULT_ICON_SRC[optionKey];
  }

  function readHandbookUrl(_KDB) {
    var links = _KDB && _KDB.config && _KDB.config.links;
    var url = links && links.kdbControlHandbookUrl;
    return typeof url === "string" && url.trim() ? url.trim() : "";
  }

  return { readIconSrc: readIconSrc, readHandbookUrl: readHandbookUrl };
});
