// shim: seam for widgetSettings view files until Phase B; remove in Phase B
define(["../config.js"], function (_m) { return { applyConfiguredDefault: _m.applyConfiguredDefault, isOptionInitiallySelected: _m.isOptionInitiallySelected }; });
