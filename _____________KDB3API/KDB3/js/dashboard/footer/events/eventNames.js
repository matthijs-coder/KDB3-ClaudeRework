define(["../../header/events/eventNames", "../../tabs/events/eventNames"], function (_headerEvents, _tabsEvents) {
  "use strict";
  /** Re-export for subscribe only; footer does not emit. */
  var HEADER_CONFIRMED_CHANGED = _headerEvents.HEADER_CONFIRMED_CHANGED;
  var TABS_CHANGED = _tabsEvents.CHANGED;
  return { HEADER_CONFIRMED_CHANGED: HEADER_CONFIRMED_CHANGED, TABS_CHANGED: TABS_CHANGED };
});
