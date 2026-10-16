// shim (WS-L phase A): remove in Phase B; re-exports the merged implementation
define(["../runtime.js"], function (_m) {
  return { ensureWidgetBaseRuntime: _m.ensureWidgetBaseRuntime, ensureWidgetBaseWidgetRuntime: _m.ensureWidgetBaseWidgetRuntime };
});
