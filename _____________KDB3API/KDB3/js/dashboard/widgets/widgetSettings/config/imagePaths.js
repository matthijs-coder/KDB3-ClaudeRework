// shim: seam for widgetSettings view files until Phase B; remove in Phase B
define(["../config.js"], function (_m) { return { basePath: _m.IMAGE_BASE_PATH, readImagePath: _m.readImagePath }; });
