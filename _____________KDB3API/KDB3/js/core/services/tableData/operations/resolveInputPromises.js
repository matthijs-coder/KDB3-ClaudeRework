define([], function () {
  "use strict";

  function resolveInputPromises(inputs, promises) {
    return inputs.length === 1 ? promises[0] : Promise.all(promises);
  }

  return resolveInputPromises;
});
