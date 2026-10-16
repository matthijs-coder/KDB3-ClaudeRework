define([], function () {
  "use strict";

  function buildClosedResult(request, reason) {
    try {
      if (request.kind === "confirm") return { confirmed: false, reason: reason };
      if (request.kind === "choose") return { choice: null, reason: reason };
      if (request.kind === "copyable") return { action: null, reason: reason };
      return null;
    } catch (err) {
      console.error("[messageService.buildClosedResult] failed", err);
      throw err;
    }
  }

  function buildActionResult(request, actionPayload) {
    try {
      var action = actionPayload.action;
      if (request.kind === "confirm") {
        return action === "confirm"
          ? { confirmed: true, reason: "selected" }
          : { confirmed: false, reason: action === "cancel" ? "cancelled" : "dismissed" };
      }
      if (request.kind === "choose") {
        return action === "choose"
          ? { choice: actionPayload.choice, reason: "selected" }
          : { choice: null, reason: action === "cancel" ? "cancelled" : "dismissed" };
      }
      if (request.kind === "copyable") {
        return action === "action"
          ? { action: "selected", reason: "selected" }
          : { action: null, reason: "dismissed" };
      }
      return null;
    } catch (err) {
      console.error("[messageService.buildActionResult] failed", err);
      throw err;
    }
  }

  function buildDestroyedResult(kind) {
    try {
      if (kind === "confirm") return { confirmed: false, reason: "destroyed" };
      if (kind === "copyable") return { action: null, reason: "destroyed" };
      return { choice: null, reason: "destroyed" };
    } catch (err) {
      console.error("[messageService.buildDestroyedResult] failed", err);
      throw err;
    }
  }

  return {
    buildActionResult: buildActionResult,
    buildClosedResult: buildClosedResult,
    buildDestroyedResult: buildDestroyedResult
  };
});
