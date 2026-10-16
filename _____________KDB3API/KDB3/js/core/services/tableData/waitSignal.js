define([], function () {
  "use strict";

  function createAbortError() {
    const error = new Error("tableData wait aborted");
    error.name = "AbortError";
    return error;
  }

  function isAborted(signal) {
    return !!signal && signal.aborted === true;
  }

  function canListen(signal) {
    return !!signal && typeof signal.addEventListener === "function" && typeof signal.removeEventListener === "function";
  }

  // Ends the WAIT when the signal aborts; the load behind `waiting` is shared with other callers and keeps running.
  function raceAbort(waiting, signal) {
    if (!canListen(signal)) {
      return waiting;
    }
    return new Promise(function (resolve, reject) {
      function onAbort() {
        reject(createAbortError());
      }
      signal.addEventListener("abort", onAbort, { once: true });
      waiting.then(function (value) {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      }, function (error) {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      });
    });
  }

  return {
    createAbortError: createAbortError,
    isAborted: isAborted,
    raceAbort: raceAbort,
  };
});
