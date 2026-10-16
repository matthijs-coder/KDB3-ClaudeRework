define([], function () {
  "use strict";
  /** Fact: emitted only after confirmed header chrome/text change + DOM sync (see header.md §7). */
  var HEADER_CONFIRMED_CHANGED = "header:confirmedChanged";
  return { HEADER_CONFIRMED_CHANGED: HEADER_CONFIRMED_CHANGED };
});
