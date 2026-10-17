define([
  "./config.js",
  "./buildDrillthroughUrl.js",
  "./open.js"
], function (_config, _build, _createOpener) {
  "use strict";

  function bindIfFunction(_owner, _name) {
    return _owner && typeof _owner[_name] === "function" ? _owner[_name].bind(_owner) : null;
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
    var opener = _createOpener();
    return {
      buildDrillthroughUrl: function (_spec) {
        return _build.buildDrillthroughUrl(_spec, deps);
      },
      openDrillthrough: function (_spec) {
        return opener.openDrillthrough(_spec, deps);
      },
      destroy: function () {
        opener.destroy();
      }
    };
  }

  function registerDrillthrough(_KDB) {
    var tableData;
    var existing;
    var service;
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    existing = _KDB.config.labels.de.drillthrough && typeof _KDB.config.labels.de.drillthrough === "object"
      ? _KDB.config.labels.de.drillthrough
      : {};
    _KDB.config.labels.de.drillthrough = Object.assign({}, _config.drillthroughLabels, existing);
    tableData = _KDB.services.tableData;
    service = createDrillthroughService({
      links: _KDB.config.links || null,
      readRows: bindIfFunction(tableData, "readRows"),
      readPendingLoad: bindIfFunction(tableData, "readPendingLoad"),
      readTableState: bindIfFunction(tableData, "readTableState"),
      labels: _KDB.config.labels.de.drillthrough
    });
    _KDB.services.drillthrough = service;
    return service;
  }

  return registerDrillthrough;
});
