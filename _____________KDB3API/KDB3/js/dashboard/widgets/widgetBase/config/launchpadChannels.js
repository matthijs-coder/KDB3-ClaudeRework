// shim (WS-L phase A): remove in Phase B; re-exports the merged implementation
define(["../config.js"], function (_m) {
  return { CHANNELS: _m.CHANNELS, SKIP_REASON: _m.SKIP_REASON, CHART_TYPES: _m.CHART_TYPES, WRITE_BACK_TITLES: _m.WRITE_BACK_TITLES };
});
