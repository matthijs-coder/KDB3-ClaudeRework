define([], function () {
  "use strict";

  async function waitForElObserver(_selector, _root, _opts) {
    const selector = _selector;
    const root = _root || document;
    const opts = _opts || {};
    const timeoutMs =
      typeof opts.timeoutMs === "number" && opts.timeoutMs >= 0
        ? opts.timeoutMs
        : 30000;
    const signal = opts.signal;

    if (!root) throw new Error("waitForElObserver: root is null/undefined");

    if (signal && signal.aborted) {
      const err = new Error("waitForElObserver aborted");
      err.code = "ABORTED";
      throw err;
    }

    const found = root.querySelector(selector);
    if (found) return found;

    return await new Promise(function (resolve, reject) {
      var done = false;
      var timeoutHandle = null;

      function cleanup() {
        if (done) return;
        done = true;
        observer.disconnect();
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (signal && typeof signal.removeEventListener === "function") {
          signal.removeEventListener("abort", onAbort);
        }
      }

      function onAbort() {
        cleanup();
        const err = new Error("waitForElObserver aborted");
        err.code = "ABORTED";
        reject(err);
      }

      var observer = new MutationObserver(function () {
        var el = root.querySelector(selector);
        if (el) {
          cleanup();
          resolve(el);
        }
      });
      observer.observe(root, { childList: true, subtree: true });

      if (signal && typeof signal.addEventListener === "function") {
        signal.addEventListener("abort", onAbort, { once: true });
      }

      if (timeoutMs > 0) {
        timeoutHandle = setTimeout(function () {
          cleanup();
          reject(new Error("Timeout waiting for " + selector));
        }, timeoutMs);
      }
    });
  }

  return waitForElObserver;
});
