define([], function () {
  function cloneSerializable(_value) {
    if (_value === null || _value === undefined) {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (_err) {
      console.error("[widgetText.cloneSerializable] failed", _err);
      return undefined;
    }
  }
  return cloneSerializable;
});
