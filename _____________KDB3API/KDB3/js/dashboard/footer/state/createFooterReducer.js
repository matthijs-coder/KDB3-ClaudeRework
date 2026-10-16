define([], function () {
  "use strict";
  function copy(s) {
    return {
      status: s.status,
      aktualisierungsDatumRaw: s.aktualisierungsDatumRaw == null ? null : s.aktualisierungsDatumRaw,
      aktualisierungsDatumFormatted: s.aktualisierungsDatumFormatted == null ? null : s.aktualisierungsDatumFormatted,
      createdUserName: s.createdUserName == null ? null : s.createdUserName
    };
  }
  function createFooterReducer() {
    return function reduce(state, action) {
      if (!state || !action || typeof action.type !== "string") return state;
      var t = action.type;
      var next = copy(state);
      if (t === "footer/toggle") {
        if (next.status === "active") next.status = "removed";
        else next.status = "active";
        return next;
      }
      if (t === "footer/show") {
        if (state.status === "active") return state;
        next.status = "active";
        return next;
      }
      if (t === "footer/hide") {
        if (state.status !== "active") return state;
        next.status = "removed";
        return next;
      }
      if (t === "footer/applyUpdateDate") {
        var p = action.payload || {};
        var raw = p.raw == null || p.raw === "" ? null : String(p.raw);
        var formatted = p.formatted == null || p.formatted === "" ? "n.v." : String(p.formatted);
        if (raw === state.aktualisierungsDatumRaw && formatted === state.aktualisierungsDatumFormatted) return state;
        next.aktualisierungsDatumRaw = raw;
        next.aktualisierungsDatumFormatted = formatted;
        return next;
      }
      if (t === "footer/applyCreatedUser") {
        var createdPayload = action.payload || {};
        var userName = createdPayload.userName == null || createdPayload.userName === "" ? null : String(createdPayload.userName);
        if (userName === state.createdUserName) return state;
        next.createdUserName = userName;
        return next;
      }
      return state;
    };
  }
  return createFooterReducer;
});
