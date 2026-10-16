define([
  "./readHostFilterItems.js",
  "./buildFilterItemDescriptor.js",
  "./buildFilterItemKeys.js",
  "./buildFilterOutcome.js",
  "./config/filterErrorCodes.js",
  "../../runtime/ensureCognosHostRuntime.js"
], function (
  _readHostFilterItems,
  _buildFilterItemDescriptor,
  _buildFilterItemKeys,
  _buildFilterOutcome,
  _filterErrorCodes,
  _ensureCognosHostRuntime
) {
  "use strict";

  // Sole writer of runtime.adapters.filterItemsByKey. One inventory pass reads
  // descriptor and values together (design doc section 2.3 point 4), so a
  // reconcile never has to do list-then-read and can not tear.

  var SEP = "\u001F";

  function copyOtherPartitions(_index, _scopeType) {
    var next = {};
    var keys = Object.keys(_index);
    var prefix = _scopeType + SEP;
    var index;
    for (index = 0; index < keys.length; index += 1) {
      if (keys[index].indexOf(prefix) !== 0) {
        next[keys[index]] = _index[keys[index]];
      }
    }
    return next;
  }

  // First item wins on BOTH keys, mirroring the loop-and-return semantics of the
  // lookups this index replaces. Deliberately silent: emitting a diagnostic for
  // a duplicate would make the whole inventory degraded, and a degraded
  // inventory is fail-closed at the owner boundary, so one duplicate would wipe
  // an entire scope.
  function indexEntry(_next, _scopeType, _entry) {
    var scope = { scopeType: _scopeType, scopeId: _entry.descriptor.scopeId };
    var idKey = _buildFilterItemKeys.buildIdKey(scope, _entry.descriptor.itemId);
    var nameKey = _buildFilterItemKeys.buildNameKey(scope, _entry.descriptor.itemName);
    if (idKey && !_next[idKey]) {
      _next[idKey] = _entry;
    }
    if (nameKey && !_next[nameKey]) {
      _next[nameKey] = _entry;
    }
  }

  function __controller(_ctx, _scopeType) {
    var read = _readHostFilterItems(_ctx._KDB, _scopeType);
    var runtime;
    var next;
    var descriptors = [];
    var diagnostics = [];
    var descriptor;
    var index;
    if (!read.ok) {
      return { ok: false, errorCode: read.errorCode, descriptors: descriptors, diagnostics: diagnostics };
    }
    runtime = _ensureCognosHostRuntime(_ctx._KDB);
    next = copyOtherPartitions(runtime.adapters.filterItemsByKey, _scopeType);
    for (index = 0; index < read.items.length; index += 1) {
      try {
        descriptor = _buildFilterItemDescriptor(read.filtersApi, read.items[index], true, _scopeType);
      } catch (error) {
        // Never drop a broken item silently (contract section 4): the caller
        // sees a degraded outcome carrying this diagnostic.
        diagnostics.push(_buildFilterOutcome.buildDiagnostic(
          _filterErrorCodes.READ_FAILED,
          "host item " + index + " could not be read: " + String(error && error.message ? error.message : error)
        ));
        continue;
      }
      indexEntry(next, _scopeType, {
        handle: read.items[index],
        descriptor: descriptor,
        generation: _ctx.generation
      });
      descriptors.push(descriptor);
    }
    // Atomic replace of this partition (design doc section 2.3 point 3).
    runtime.adapters.filterItemsByKey = next;
    return { ok: true, descriptors: descriptors, diagnostics: diagnostics };
  }

  return __controller;
});
