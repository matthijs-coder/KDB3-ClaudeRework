define([], function () {
  "use strict";

  function resolveInputResults(inputs, results) {
    return inputs.length === 1 ? results[0] : results;
  }

  return resolveInputResults;
});
