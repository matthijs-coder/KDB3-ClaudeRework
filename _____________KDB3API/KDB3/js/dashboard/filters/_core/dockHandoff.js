/*
 * Filter owner kit: the normalised filterDock handoff.
 *
 * mapDockHandoff(handoff, profile) -> mapped | null
 *     Maps the raw handoff the filterDock sends to an owner (filterDockStateChanged / filterDockPopupReady) to the flat
 *     object the owner works with. null for a non-object, for a filterType other than profile.filterType, and when
 *     profile.finish returns null. The raw handoff is never mutated.
 *
 * profile
 *     filterType      only this raw filterType is accepted (omit: every object is accepted)
 *     labelDefault    filterLabel when the handoff has none
 *     scopeMode       "filterScopeFirst": filterScope = filterScope || scopeType || "global", scopeType = scopeType || filterScope
 *                     "scopeTypeOnly":    scopeType = scopeType || "global", filterScope = scopeType
 *     keyScope        scope part of the generated filterKey (filterKey || filterId || <scope>__<label>):
 *                     "filterScope" (derived filterScope) or "scopeType" (scopeType || "global")
 *     timestamp       "observedAtNullable" (observedAt, even 0, else now), "timestampFirst" (timestamp || observedAt || now),
 *                     "observedAtOnly" (observedAt || now)
 *     fields          [[name, rule, sourceKey?]...] in output order; sourceKey defaults to name
 *     finish          optional (mapped, raw) -> mapped | null for owner-only post processing
 *
 * rule (string)
 *     orNull          raw[key] || null                  nonNull     raw[key] != null ? raw[key] : null
 *     isTrue          raw[key] === true                 optionLabel optionLabel || selectedOptionLabel || null
 *     filterType      raw.filterType || "unknown"       alwaysNull  null
 *     copyOrEmpty     shallow copy of raw[key], {} when falsy      copyOrNull  same with null
 *     refOrEmpty      raw[key] || {} (same object)
 *     scopeIdPair / scopePair   scopeId || scope || null  /  scope || scopeId || null
 *     scopeIdNullable           scopeId != null ? scopeId : scope || null
 *     scopeIdGlobalDefault      scopeId != null ? scopeId : "global" for the global scope, else null
 *     derived         the value the kit computed for that name: filterLabel, filterKey, filterScope, scopeType,
 *                     interactionType, capabilities (copy), clickedOk / clickedCancel / clickedClear / clickedClose, timestamp
 * rule (function)    (raw, derived) -> value; derived.caps is the raw capabilities object or {}.
 */
define([], function () {
  "use strict";

  var TIMESTAMP_MODES = {
    observedAtNullable: function (_raw) { return _raw.observedAt != null ? _raw.observedAt : Date.now(); },
    timestampFirst: function (_raw) { return _raw.timestamp || _raw.observedAt || Date.now(); },
    observedAtOnly: function (_raw) { return _raw.observedAt || Date.now(); }
  };

  var RULES = {
    orNull: function (_raw, _derived, _key) { return _raw[_key] || null; },
    nonNull: function (_raw, _derived, _key) { return _raw[_key] != null ? _raw[_key] : null; },
    isTrue: function (_raw, _derived, _key) { return _raw[_key] === true; },
    optionLabel: function (_raw) { return _raw.optionLabel || _raw.selectedOptionLabel || null; },
    filterType: function (_raw) { return _raw.filterType || "unknown"; },
    alwaysNull: function () { return null; },
    copyOrEmpty: function (_raw, _derived, _key) { return _raw[_key] ? Object.assign({}, _raw[_key]) : {}; },
    copyOrNull: function (_raw, _derived, _key) { return _raw[_key] ? Object.assign({}, _raw[_key]) : null; },
    refOrEmpty: function (_raw, _derived, _key) { return _raw[_key] || {}; },
    scopeIdPair: function (_raw) { return _raw.scopeId || _raw.scope || null; },
    scopePair: function (_raw) { return _raw.scope || _raw.scopeId || null; },
    scopeIdNullable: function (_raw) { return _raw.scopeId != null ? _raw.scopeId : _raw.scope || null; },
    scopeIdGlobalDefault: function (_raw, _derived) {
      return _raw.scopeId != null ? _raw.scopeId : (_derived.scopeType === "global" ? "global" : null);
    },
    derived: function (_raw, _derived, _key) { return _derived[_key]; }
  };

  function deriveScopes(_raw, _mode) {
    var scopeType;
    var filterScope;
    if (_mode === "scopeTypeOnly") {
      scopeType = _raw.scopeType || "global";
      return { filterScope: scopeType, scopeType: scopeType };
    }
    filterScope = _raw.filterScope || _raw.scopeType || "global";
    return { filterScope: filterScope, scopeType: _raw.scopeType || filterScope };
  }

  function derive(_raw, _profile) {
    var scopes = deriveScopes(_raw, _profile.scopeMode);
    var label = _raw.filterLabel || _profile.labelDefault || "";
    var keyScope = _profile.keyScope === "scopeType" ? (_raw.scopeType || "global") : scopes.filterScope;
    var interactionType = _raw.interactionType || "unknown";
    var caps = _raw.capabilities ? _raw.capabilities : {};
    return {
      filterLabel: label,
      filterKey: _raw.filterKey || _raw.filterId || keyScope + "__" + label,
      filterScope: scopes.filterScope,
      scopeType: scopes.scopeType,
      interactionType: interactionType,
      caps: caps,
      capabilities: Object.assign({}, caps),
      clickedOk: interactionType === "confirm",
      clickedCancel: interactionType === "cancel",
      clickedClear: interactionType === "clear",
      clickedClose: interactionType === "close",
      timestamp: TIMESTAMP_MODES[_profile.timestamp](_raw)
    };
  }

  function mapDockHandoff(_handoff, _profile) {
    var derived;
    var mapped = {};
    if (!_handoff || typeof _handoff !== "object") {
      return null;
    }
    if (_profile.filterType && _handoff.filterType !== _profile.filterType) {
      return null;
    }
    derived = derive(_handoff, _profile);
    _profile.fields.forEach(function (_field) {
      var rule = _field[1];
      var key = _field[2] || _field[0];
      mapped[_field[0]] = typeof rule === "function" ? rule(_handoff, derived) : RULES[rule](_handoff, derived, key);
    });
    return typeof _profile.finish === "function" ? _profile.finish(mapped, _handoff) : mapped;
  }

  return { mapDockHandoff: mapDockHandoff };
});
