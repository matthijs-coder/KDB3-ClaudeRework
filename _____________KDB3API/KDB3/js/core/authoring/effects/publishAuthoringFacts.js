define(["../../events/authoringMode"], function (_authoringMode) {
  "use strict";
  var SOURCES = { "cognos-ui": 1, api: 1, bootstrap: 1 };
  /** _prev/_next: authoring slice `{ isAuthoring }` snapshots. */
  function publishAuthoringFacts(_KDB, _prev, _next, _source) {
    if (!_prev || !_next || _prev.isAuthoring === _next.isAuthoring) return;
    if (!SOURCES[_source]) return;
    var payload = { isAuthoring: _next.isAuthoring, source: _source };
    if (_next.isAuthoring === true) {
      _KDB.events.emit(_authoringMode.AUTHORING_ENTERED, payload);
    } else {
      _KDB.events.emit(_authoringMode.AUTHORING_EXITED, payload);
    }
  }
  return publishAuthoringFacts;
});
