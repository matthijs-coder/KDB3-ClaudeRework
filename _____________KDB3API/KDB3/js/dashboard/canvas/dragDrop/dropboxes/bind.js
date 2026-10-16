define([
  "../config.js",
  "./hover.js",
  "./lookup.js",
  "./publish.js"
], function (_config, _hover, _lookup, _publishValidatedDrop) {
  "use strict";

  const BIND_STATUS = {
    BOUND: "bound",
    HELPER: "helper",
    MISSING: "missing"
  };

  // ctx = { _KDB, rt, dispatch, completeDrop }. Each dropbox element is bound once; its four listeners share
  // one AbortController, kept in rt.dropboxBindings (element -> controller), so a rebind pass leaves bound
  // dropboxes untouched.

  function bindAllDropboxes(ctx) {
    const dropboxEls = _lookup.readDashboardDropboxes(ctx._KDB);
    const helperTabIds = beginBindPass(ctx);

    dropboxEls.forEach(function (dropboxEl) {
      bindDropbox(ctx, dropboxEl, helperTabIds);
    });
    ctx.rt.dropboxBindings.forEach(function (controller, boundEl) {
      if (dropboxEls.indexOf(boundEl) === -1) {
        unbindDropbox(ctx.rt, boundEl);
      }
    });
    return true;
  }

  // Binds only the dropbox(es) of one page. pageIds are candidate element ids (page id first, tab id second).
  function bindPageDropboxes(ctx, pageIds) {
    const dropboxEls = readFirstPageDropboxes(ctx._KDB, pageIds);
    const helperTabIds = beginBindPass(ctx);
    const statuses = dropboxEls.map(function (dropboxEl) {
      return bindDropbox(ctx, dropboxEl, helperTabIds);
    });

    if (statuses.length === 0) {
      return BIND_STATUS.MISSING;
    }
    return statuses.indexOf(BIND_STATUS.BOUND) === -1 ? BIND_STATUS.HELPER : BIND_STATUS.BOUND;
  }

  function readFirstPageDropboxes(_KDB, pageIds) {
    let dropboxEls = [];
    let index = 0;

    while (dropboxEls.length === 0 && index < pageIds.length) {
      dropboxEls = _lookup.readPageDropboxes(_KDB, pageIds[index]);
      index += 1;
    }
    return dropboxEls;
  }

  function beginBindPass(ctx) {
    const helperTabIds = _lookup.readHelperTabIds(ctx._KDB);

    ctx.rt.helperTabIds = helperTabIds;
    ctx.rt.dropboxBindings.forEach(function (controller, boundEl) {
      if (!boundEl.isConnected) {
        unbindDropbox(ctx.rt, boundEl);
      }
    });
    return helperTabIds;
  }

  function bindDropbox(ctx, dropboxEl, helperTabIds) {
    const rt = ctx.rt;
    const dropboxId = dropboxEl.id ? String(dropboxEl.id).trim() : "";
    let controller;

    if (_lookup.isHelperDropbox(ctx._KDB, dropboxEl, helperTabIds)) {
      unbindDropbox(rt, dropboxEl);
      return BIND_STATUS.HELPER;
    }
    if (!rt.dropboxBindings.has(dropboxEl)) {
      controller = new AbortController();
      rt.dropboxBindings.set(dropboxEl, controller);
      addDropboxListener(ctx, dropboxEl, controller, "dragenter", _hover.handleDragEnter);
      addDropboxListener(ctx, dropboxEl, controller, "dragover", _hover.handleDragOver);
      addDropboxListener(ctx, dropboxEl, controller, "dragleave", _hover.handleDragLeave);
      dropboxEl.addEventListener("drop", publishOnDrop.bind(null, ctx), { signal: controller.signal });
    }
    dropboxEl.setAttribute(_config.attributes.bound, "true");
    dropboxEl.setAttribute(_config.attributes.dropbox, "true");
    if (dropboxId) {
      rt.dropboxesById[dropboxId] = dropboxEl;
    }
    return BIND_STATUS.BOUND;
  }

  // Boundary: DOM event callback; a failing hover handler must not break the native drag.
  function addDropboxListener(ctx, dropboxEl, controller, type, handler) {
    dropboxEl.addEventListener(type, function (event) {
      try {
        handler(ctx._KDB, event, ctx.rt);
      } catch (error) {
        console.error("[dragDrop." + type + "] failed", error);
      }
    }, { signal: controller.signal });
  }

  function publishOnDrop(ctx, event) {
    _publishValidatedDrop(ctx._KDB, event, ctx.rt, ctx.dispatch, ctx.completeDrop);
  }

  function unbindDropbox(rt, dropboxEl) {
    const controller = rt.dropboxBindings.get(dropboxEl);

    if (!controller) {
      return;
    }
    controller.abort();
    rt.dropboxBindings.delete(dropboxEl);
    dropboxEl.removeAttribute(_config.attributes.bound);
    dropboxEl.removeAttribute(_config.attributes.dropbox);
    if (dropboxEl.id && rt.dropboxesById[String(dropboxEl.id).trim()] === dropboxEl) {
      delete rt.dropboxesById[String(dropboxEl.id).trim()];
    }
  }

  function unbindAllDropboxes(rt) {
    rt.dropboxBindings.forEach(function (controller, boundEl) {
      unbindDropbox(rt, boundEl);
    });
    rt.dropboxesById = {};
  }

  return {
    BIND_STATUS: BIND_STATUS,
    bindAllDropboxes: bindAllDropboxes,
    bindPageDropboxes: bindPageDropboxes,
    unbindAllDropboxes: unbindAllDropboxes
  };
});
