define([], function () {
  function cloneState(_value) {
    if (_value === null || _value === undefined) {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (_err) {
      return undefined;
    }
  }
  return cloneState;
});
