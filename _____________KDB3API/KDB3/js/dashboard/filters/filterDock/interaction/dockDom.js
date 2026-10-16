define(["../identity.js", "../ownerRoutes.js", "../selectors.js"], function (_identity, _ownerRoutes, _selectors) {
  "use strict";

  function readDockRoot(_KDB) {
    var dockSelectors = _selectors.readDockSelectors(_KDB);
    var rootSelector = dockSelectors ? dockSelectors.rootSelector : null;
    if (!rootSelector || typeof document === "undefined") {
      return null;
    }
    return document.querySelector(rootSelector);
  }

  function readActiveFilterEl(runtime) {
    return runtime && runtime.domRefs ? runtime.domRefs.activeFilterEl : null;
  }

  function resolvePopupMount(filterEl, dockRoot, selectors, runtime) {
    var mountSelector = selectors && selectors.popupMountSelector;
    var activeFilterEl;
    if (!mountSelector) {
      return null;
    }
    activeFilterEl = filterEl || readActiveFilterEl(runtime);
    if (activeFilterEl && activeFilterEl.querySelector) {
      return activeFilterEl.querySelector(mountSelector);
    }
    if (dockRoot && dockRoot.querySelector) {
      return dockRoot.querySelector(mountSelector);
    }
    return null;
  }

  function readBucketSelector(scopeType, selectors) {
    return scopeType === "global" ? selectors.globalDockSelector : selectors.pageContextDockSelector;
  }

  function activeFilterElMatchesScope(activeFilterEl, scopeType, selectors, hostDataId) {
    var bucketSelector;
    if (!activeFilterEl || !hostDataId) {
      return false;
    }
    bucketSelector = readBucketSelector(scopeType, selectors);
    if (!bucketSelector || !activeFilterEl.closest) {
      return false;
    }
    if (!activeFilterEl.closest(bucketSelector)) {
      return false;
    }
    return _identity.readFilterLabel(activeFilterEl, selectors) === hostDataId;
  }

  function resolveMountFromBucket(dockRoot, scopeType, selectors, hostDataId, mountSelector) {
    var bucketSelector;
    var bucket;
    var hostEl;
    var wrapper;
    if (!dockRoot || !hostDataId || !mountSelector) {
      return null;
    }
    bucketSelector = readBucketSelector(scopeType, selectors);
    if (!bucketSelector) {
      return null;
    }
    bucket = dockRoot.querySelector(bucketSelector);
    if (!bucket || !selectors.filterDataIdAttr) {
      return null;
    }
    hostEl = bucket.querySelector("[" + selectors.filterDataIdAttr + "=\"" + CSS.escape(hostDataId) + "\"]");
    if (!hostEl || !selectors.filterItemSelector) {
      return null;
    }
    wrapper = hostEl.closest(selectors.filterItemSelector);
    return wrapper ? wrapper.querySelector(mountSelector) : null;
  }

  function resolveScopedPopupMount(context) {
    var mountSelector;
    var activeFilterEl;
    if (!context || !context.selectors || !context.hostDataId || !context.scopeType) {
      return null;
    }
    mountSelector = context.selectors.popupMountSelector;
    if (!mountSelector) {
      return null;
    }
    activeFilterEl = context.filterEl || readActiveFilterEl(context.runtime);
    if (activeFilterElMatchesScope(activeFilterEl, context.scopeType, context.selectors, context.hostDataId)) {
      return activeFilterEl.querySelector(mountSelector);
    }
    return resolveMountFromBucket(
      context.dockRoot,
      context.scopeType,
      context.selectors,
      context.hostDataId,
      mountSelector
    );
  }

  function matchVariantHostId(value, variants) {
    var key = value != null ? String(value).trim() : "";
    var index;
    if (variants.indexOf(key) !== -1) {
      return key;
    }
    for (index = 0; index < variants.length; index += 1) {
      if (key.indexOf(variants[index]) !== -1) {
        return variants[index];
      }
    }
    return null;
  }

  function resolveVariantHostDataId(lastClickedFilter, labelFromDom, variants) {
    var candidates;
    var index;
    var matched = matchVariantHostId(labelFromDom, variants);
    if (matched) {
      return matched;
    }
    if (!lastClickedFilter) {
      return null;
    }
    candidates = [lastClickedFilter.filterLabel, lastClickedFilter.filterKey, lastClickedFilter.filterId];
    for (index = 0; index < candidates.length; index += 1) {
      matched = matchVariantHostId(candidates[index], variants);
      if (matched) {
        return matched;
      }
    }
    console.warn(
      "[filterDock.resolveHostDataId] missing activeFilterKey for dienststelle; " +
        "tried activeFilterEl data-id, filterLabel, filterKey, filterId"
    );
    return null;
  }

  function resolveHostDataId(lastClickedFilter, selectors, runtime) {
    var activeFilterEl = readActiveFilterEl(runtime);
    var labelFromDom = activeFilterEl ? _identity.readFilterLabel(activeFilterEl, selectors) : "";
    var filterType = lastClickedFilter && lastClickedFilter.filterType;
    var variants = _ownerRoutes.readHostDataIdVariants(filterType);
    if (variants.length > 0) {
      return resolveVariantHostDataId(lastClickedFilter, labelFromDom, variants);
    }
    if (labelFromDom) {
      return labelFromDom;
    }
    if (lastClickedFilter && lastClickedFilter.filterLabel) {
      return String(lastClickedFilter.filterLabel).trim();
    }
    return null;
  }

  function buildScopeContext(lastClickedFilter, selectors, runtime) {
    var scopeType = lastClickedFilter && (lastClickedFilter.scopeType || lastClickedFilter.filterScope);
    var hostDataId = resolveHostDataId(lastClickedFilter, selectors, runtime);
    if (!scopeType || !hostDataId) {
      return null;
    }
    return { scopeType: scopeType, hostDataId: hostDataId };
  }

  function resolvePopupRoot(filterEl, dockRoot, selectors, runtime, scopeContext) {
    if (scopeContext && scopeContext.scopeType && scopeContext.hostDataId) {
      return resolveScopedPopupMount({
        filterEl: filterEl,
        dockRoot: dockRoot,
        selectors: selectors,
        runtime: runtime,
        scopeType: scopeContext.scopeType,
        hostDataId: scopeContext.hostDataId
      });
    }
    return resolvePopupMount(filterEl, dockRoot, selectors, runtime);
  }

  function readPopupSnapshot(filterEl, dockRoot, selectors, filterId, filterType, observedAt, runtime, scopeContext) {
    var popupRoot = resolvePopupRoot(filterEl, dockRoot, selectors, runtime, scopeContext);
    var optionCount = popupRoot && selectors.optionSelector
      ? popupRoot.querySelectorAll(selectors.optionSelector).length
      : 0;
    if (popupRoot && runtime && runtime.domRefs) {
      runtime.domRefs.activePopupEl = popupRoot;
    }
    return {
      isVisible: !!popupRoot,
      activeFilterId: filterId || null,
      activeFilterType: filterType || null,
      hasOptions: optionCount > 0,
      optionCount: optionCount,
      hasOkButton: !!(popupRoot && selectors.okButtonSelector && popupRoot.querySelector(selectors.okButtonSelector)),
      hasCancelButton: !!(popupRoot && selectors.cancelButtonSelector && popupRoot.querySelector(selectors.cancelButtonSelector)),
      observedAt: observedAt
    };
  }

  function isNativeSelected(wrapper, selectors) {
    var roleOption;
    var checkbox;
    var selectedClass = selectors && selectors.selectedOptionClass;
    if (!wrapper) {
      return false;
    }
    if ((selectedClass && wrapper.classList.contains(selectedClass)) || wrapper.getAttribute("aria-selected") === "true") {
      return true;
    }
    if (selectors && selectors.roleOptionSelector) {
      roleOption = wrapper.querySelector(selectors.roleOptionSelector);
      if (roleOption && roleOption.getAttribute("aria-selected") === "true") {
        return true;
      }
    }
    if (selectors && selectors.checkboxSelector) {
      checkbox = wrapper.querySelector(selectors.checkboxSelector);
      return !!(checkbox && checkbox.checked === true);
    }
    return false;
  }

  function readOptionLabelText(wrapper, selectors) {
    var labelEl;
    if (!wrapper || !selectors || !selectors.optionLabelSelector) {
      return "";
    }
    labelEl = wrapper.querySelector(selectors.optionLabelSelector);
    return labelEl ? String(labelEl.getAttribute("aria-label") || labelEl.textContent || "").trim() : "";
  }

  function readPopupSelectionSyncGap(dockRoot, selectors, runtime) {
    var popupRoot;
    var options;
    var index;
    if (!dockRoot || !selectors) {
      return false;
    }
    popupRoot = resolvePopupMount(null, dockRoot, selectors, runtime);
    if (!popupRoot || !selectors.optionSelector) {
      return false;
    }
    options = popupRoot.querySelectorAll(selectors.optionSelector);
    for (index = 0; index < options.length; index += 1) {
      if (isNativeSelected(options[index], selectors) && !options[index].classList.contains(selectors.kdbSelectedOptionClass)) {
        return true;
      }
    }
    return false;
  }

  function readConfirmedNativeSelectLabels(filterEl, dockRoot, selectors, runtime) {
    var popupRoot;
    var options;
    var labels = [];
    var index;
    var label;
    if (!selectors) {
      return null;
    }
    popupRoot = resolvePopupMount(filterEl, dockRoot, selectors, runtime);
    if (!popupRoot || !selectors.optionSelector) {
      return null;
    }
    options = popupRoot.querySelectorAll(selectors.optionSelector);
    for (index = 0; index < options.length; index += 1) {
      if (!isNativeSelected(options[index], selectors)) {
        continue;
      }
      label = readOptionLabelText(options[index], selectors);
      if (label) {
        labels.push(label);
      }
    }
    return labels;
  }

  return {
    readDockRoot: readDockRoot,
    resolvePopupMount: resolvePopupMount,
    resolveScopedPopupMount: resolveScopedPopupMount,
    buildScopeContext: buildScopeContext,
    resolveHostDataId: resolveHostDataId,
    readPopupSnapshot: readPopupSnapshot,
    isNativeSelected: isNativeSelected,
    readOptionLabelText: readOptionLabelText,
    readPopupSelectionSyncGap: readPopupSelectionSyncGap,
    readConfirmedNativeSelectLabels: readConfirmedNativeSelectLabels
  };
});
