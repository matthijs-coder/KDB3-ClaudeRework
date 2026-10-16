define([], function () {
  "use strict";

  function __controller(_KDB) {
    var runtime;
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.cognosHostService = _KDB.runtime.cognosHostService || {};
    runtime = _KDB.runtime.cognosHostService;
    runtime.generation = typeof runtime.generation === "number" ? runtime.generation : 0;
    runtime.subscriptions = runtime.subscriptions || [];
    runtime.abortControllers = runtime.abortControllers || {};
    // Key counter for abortControllers: two concurrent waits must never share a
    // slot, or destroy would abort only the last one and leave the other timer
    // running past teardown.
    runtime.waitSequence = typeof runtime.waitSequence === "number" ? runtime.waitSequence : 0;
    // Handle index (design doc section 2.3): live host filter items stay
    // adapter-internal and never cross the facet boundary. The "adapters"
    // bucket name is reused for filterItemsByKey. Slice 1 replaced
    // singleSelect's filterApisByInstanceId cache with this index; slice 6
    // removed that vestigial cache.
    runtime.adapters = runtime.adapters || {};
    runtime.adapters.filterItemsByKey = runtime.adapters.filterItemsByKey || {};
    // Per-widgetId replace: previous content.on is released before a new listener is armed.
    runtime.adapters.selectionUnsubscribeByWidgetId = runtime.adapters.selectionUnsubscribeByWidgetId || {};
    // Last subscribe DTO per widgetId when host getSelections is missing/null/empty.
    runtime.adapters.lastSelectionDtoByWidgetId = runtime.adapters.lastSelectionDtoByWidgetId || {};
    // Per-key host-write chain (design doc section 3.6 point 5). Destroy
    // drops the bookkeeping; an in-flight host call still lands and is
    // normalised to aborted-after-effect by the write itself.
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.pendingPromises.filterWritesByKey = runtime.pendingPromises.filterWritesByKey || {};
    return runtime;
  }

  return __controller;
});
