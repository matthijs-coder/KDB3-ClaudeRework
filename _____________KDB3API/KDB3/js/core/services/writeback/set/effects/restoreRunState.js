define([
  "../state/ensureWritebackRuntime.js",
  "../state/buildRestoreResult.js"
], function (_ensureWritebackRuntime, _buildRestoreResult) {
  "use strict";

  return {
    ensureWritebackRuntime: _ensureWritebackRuntime,
    captureBaseline: _buildRestoreResult.captureBaseline,
    buildRestoreResult: _buildRestoreResult.buildRestoreResult
  };
});
