define([], function () {
  "use strict";

  // Host option values are the UTF-8-safe base64 of the parameter-set NAME
  // (btoa(unescape(encodeURIComponent(name))); KDB3 does not encode).
  // Latin-1 names (German umlauts via plain btoa) still decode via the atob string.
  function decodeParameterSetId(_id) {
    var raw = _id == null ? "" : String(_id);
    var binary;
    if (!raw || raw.length % 4 !== 0) return raw;
    try {
      binary = atob(raw);
    } catch (_error) {
      return raw;
    }
    try {
      return decodeURIComponent(escape(binary));
    } catch (_error) {
      return binary;
    }
  }

  return decodeParameterSetId;
});
