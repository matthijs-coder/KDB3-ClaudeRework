define([], function () {
  "use strict";

  function __controller(_routePromise, _onFailure) {
    return _routePromise
      .then(function (_result) {
        return _result === true;
      })
      .catch(function (_error) {
        _onFailure(_error);
        return false;
      });
  }

  return __controller;
});
