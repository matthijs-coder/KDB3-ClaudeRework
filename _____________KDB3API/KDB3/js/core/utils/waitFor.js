define([], function () {
  "use strict";

  async function entryWaitFor(
    _conditionFn,
    { interval = 100, timeoutMs = 0, predicate = (v) => !!v } = {}
  ) {
    const start = Date.now();

    while (true) {
      let value;
      try {
        value = _conditionFn();
        if (value && typeof value.then === "function") {
          value = await value;
        }
      } catch (e) {
        // condition threw transiently — retry silently
      }

      if (predicate(value)) {
        return value;
      }

      if (timeoutMs > 0 && Date.now() - start >= timeoutMs) {
        const err = new Error(`waitFor timed out after ${timeoutMs}ms`);
        err.code = "WAITFOR_TIMEOUT";
        throw err;
      }

      await new Promise((r) => setTimeout(r, interval));
    }
  }

  return entryWaitFor;
});
