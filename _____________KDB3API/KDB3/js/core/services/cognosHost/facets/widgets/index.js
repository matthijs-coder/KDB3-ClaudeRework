define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../hostOps.js"
], function (_outcome, _errorCodes, _hostAccess, _hostOps) {
  "use strict";

  var CODES = _errorCodes.widgets;

  function isValidKey(_key) {
    return typeof _key === "string" && _key !== "";
  }

  // Equivalent of the previous owner check getContent(widgetId) != null. An empty id is a normal
  // "no" (ok + false), matching claimShellById's early null.
  function hasContent(_ctx, _widgetId) {
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (!_hostAccess.isValidWidgetId(_widgetId)) {
      return _outcome.buildOk(false);
    }
    return _hostOps.runSync(_ctx, {
      codes: CODES,
      theme: "widgets",
      method: "getContent",
      label: "widgets.hasContent",
      info: { widgetId: _widgetId },
      call: function (api) {
        return api.getContent(_widgetId) != null;
      }
    });
  }

  // Live content is resolved per call and never returned. A missing content is ITEM_NOT_FOUND;
  // colour/font owners swallow that as they swallowed a boolean false.
  function setWidgetProperty(_ctx, _widgetId, _key, _value, _options) {
    return _hostOps.writeOp(_ctx, _options, _hostAccess.isValidWidgetId(_widgetId) && isValidKey(_key), {
      codes: CODES,
      theme: "widgets",
      method: "getContent",
      label: "widgets.setWidgetProperty",
      info: { widgetId: _widgetId, key: _key },
      call: function (api) {
        var content = api.getContent(_widgetId);
        if (!content || typeof content.setPropertyValue !== "function") {
          return _hostOps.hostFail(CODES.ITEM_NOT_FOUND);
        }
        return content.setPropertyValue(_key, _value);
      }
    });
  }

  function setWidgetLayout(_ctx, _widgetId, _layout, _options) {
    var layout = _layout || {};
    return _hostOps.writeOp(_ctx, _options, _hostAccess.isValidWidgetId(_widgetId), {
      codes: CODES,
      theme: "widgets",
      method: "setLayoutPosition",
      label: "widgets.setWidgetLayout",
      info: { widgetId: _widgetId },
      call: function (api) {
        return api.setLayoutPosition(_widgetId, {
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height
        });
      }
    });
  }

  function renderWidget(_ctx, _widgetId, _options) {
    return _hostOps.writeOp(_ctx, _options, _hostAccess.isValidWidgetId(_widgetId), {
      codes: CODES,
      theme: "widgets",
      method: "renderWidget",
      label: "widgets.renderWidget",
      info: { widgetId: _widgetId },
      call: function (api) {
        return api.renderWidget(_widgetId);
      }
    });
  }

  // Chrome-labelled: layer 1 clicks a catalogue selector. A selector break or a missing click
  // target is HOST_CAPABILITY_MISSING, never a silent no-op.
  function runFocusMode(_ctx, _widgetId, _method, _label) {
    return _hostOps.readOp(_ctx, _hostAccess.isValidWidgetId(_widgetId), {
      codes: CODES,
      theme: "widgets",
      method: _method,
      label: _label,
      info: { widgetId: _widgetId },
      errorCode: CODES.WRITE_FAILED,
      call: function (api) {
        return api[_method](_widgetId) === true ? undefined : _hostOps.hostFail(CODES.HOST_CAPABILITY_MISSING);
      }
    });
  }

  // The widgets facet of the cognosHost service (ops: hasContent, setWidgetProperty, setWidgetLayout,
  // renderWidget, enterFocusMode, exitFocusMode). Built once; the operations close over one ctx.
  function createWidgetsAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return {
      hasContent: hasContent.bind(null, ctx),
      setWidgetProperty: setWidgetProperty.bind(null, ctx),
      setWidgetLayout: setWidgetLayout.bind(null, ctx),
      renderWidget: renderWidget.bind(null, ctx),
      enterFocusMode: function enterFocusMode(_widgetId) {
        return runFocusMode(ctx, _widgetId, "enterWidgetFocusMode", "widgets.enterFocusMode");
      },
      exitFocusMode: function exitFocusMode(_widgetId) {
        return runFocusMode(ctx, _widgetId, "exitWidgetFocusMode", "widgets.exitFocusMode");
      }
    };
  }

  return createWidgetsAdapter;
});
