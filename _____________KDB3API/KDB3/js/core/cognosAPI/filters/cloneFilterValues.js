define([], function () {
  "use strict";

  function cloneFilterValue(_value) {
    return {
      d: _value && Object.prototype.hasOwnProperty.call(_value, "d") ? _value.d : null,
      u: _value && Object.prototype.hasOwnProperty.call(_value, "u") ? _value.u : null
    };
  }

  function __controller(_values) {
    try {
      if (!Array.isArray(_values) || _values.length === 0) {
        return [];
      }
      return _values.map(cloneFilterValue);
    } catch (error) {
      console.error("[cognosAPI.filters.cloneFilterValues] failed", error);
      throw error;
    }
  }

  return __controller;
});
