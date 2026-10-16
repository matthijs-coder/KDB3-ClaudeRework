// shim (WS-L phase A): remove in Phase B; re-exports the merged implementation
define(["../effects.js"], function (_m) {
  return { resolveMetricByCode: _m.resolveMetricByCode, resolveContentApi: _m.resolveContentApi, dispatchContentAction: _m.dispatchContentAction };
});
