define([
  "./buildDrillthroughUrl.js",
  "./openDrillthrough.js"
], function (_buildDrillthroughUrl, _openDrillthrough) {
  "use strict";

  function bindBuild(_deps, _spec) {
    return _buildDrillthroughUrl(_spec, _deps);
  }

  function bindOpen(_deps, _spec) {
    return _openDrillthrough(_spec, _deps);
  }

  function createDrillthroughService(_options) {
    var options = _options || {};
    var deps = {
      links: options.links ? options.links : null,
      readRows: typeof options.readRows === "function" ? options.readRows : null
    };
    if (typeof options.readPendingLoad === "function") {
      deps.readPendingLoad = options.readPendingLoad;
    }
    if (typeof options.readTableState === "function") {
      deps.readTableState = options.readTableState;
    }
    if (options.labels != null && typeof options.labels === "object") {
      deps.labels = options.labels;
    }
    return {
      buildDrillthroughUrl: bindBuild.bind(null, deps),
      openDrillthrough: bindOpen.bind(null, deps)
    };
  }

  return createDrillthroughService;
});
