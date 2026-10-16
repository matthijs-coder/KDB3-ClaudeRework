define([], function () {
  "use strict";

  function cloneSerializableValue(_value) {
    if (_value == null || typeof _value !== "object") {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (error) {
      return null;
    }
  }

  function cloneCapabilities(_capabilities) {
    if (!_capabilities) {
      return {
        isUpstream: false,
        isDownstream: false,
        isHierarchy: false,
        isSingleSelect: false,
        isNative: false,
        hasAlleOption: false,
        condition: null
      };
    }
    return {
      isUpstream: _capabilities.isUpstream === true,
      isDownstream: _capabilities.isDownstream === true,
      isHierarchy: _capabilities.isHierarchy === true,
      isSingleSelect: _capabilities.isSingleSelect === true,
      isNative: _capabilities.isNative === true,
      hasAlleOption: _capabilities.hasAlleOption === true,
      condition: _capabilities.condition != null ? _capabilities.condition : null
    };
  }

  return {
    cloneSerializableValue: cloneSerializableValue,
    cloneCapabilities: cloneCapabilities
  };
});
