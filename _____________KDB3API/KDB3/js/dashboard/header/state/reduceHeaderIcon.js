define(["./headerReducerHelpers", "../config/headerIconKeys"], function (_h, _iconKeys) {
  "use strict";

  function reduceHeaderIcon(_state, _next, _payload) {
    var raw = _payload && _payload.iconKey;
    if (typeof raw !== "string") return _state;
    var iconKey = _iconKeys.isDefaultHeaderIcon(raw)
      ? _iconKeys.DEFAULT_ICON_KEY
      : _iconKeys.normalizeHeaderIconStem(raw);
    if (!iconKey) iconKey = _iconKeys.DEFAULT_ICON_KEY;
    if (String(_state.iconKey || "") === iconKey) return _state;
    _next.iconKey = iconKey;
    return _h.normalizeInactive(_next);
  }

  return reduceHeaderIcon;
});
