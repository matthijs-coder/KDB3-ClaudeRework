define([], function () {
  "use strict";

  function cloneSerializable(_value) {
    if (_value === null || _value === undefined) {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (err) {
      console.error("[widgetTopN.cloneSerializable] failed", err);
      return undefined;
    }
  }

  return cloneSerializable;
});
