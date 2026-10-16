define([], function () {
  "use strict";

  function matchIdentityNode(_node, _identity, _fields) {
    var idx;
    if (!_node || !_node.getAttribute) return false;
    for (idx = 0; idx < _fields.length; idx += 1) {
      if (_node.getAttribute(_fields[idx]) === _identity) return true;
    }
    return false;
  }

  return matchIdentityNode;
});
