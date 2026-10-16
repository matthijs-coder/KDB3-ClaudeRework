define(["./config.js"], function (_config) {
  "use strict";

  function createElement(_tag, _className, _attrs) {
    var node = document.createElement(_tag);
    if (_className) node.className = _className;
    if (_attrs) {
      Object.keys(_attrs).forEach(function (name) {
        node.setAttribute(name, _attrs[name]);
      });
    }
    return node;
  }

  function normalizeBase(_path) {
    if (!_path || typeof _path !== "string") return "";
    var trimmed = _path.trim();
    if (!trimmed) return "";
    return trimmed.charAt(trimmed.length - 1) === "/" ? trimmed : trimmed + "/";
  }

  function resolveImagesBase(_KDB) {
    var assetPaths = _KDB && _KDB.config && _KDB.config.extAssetPaths;
    var override = assetPaths && typeof assetPaths.kdb3ImagesBase === "string" ? normalizeBase(assetPaths.kdb3ImagesBase) : "";
    return override || _config.IMAGES_BASE_PATH;
  }

  // The link targets are owned by core config (config.links), not by the header.
  function readConfiguredLink(_KDB, _key) {
    var links = _KDB && _KDB.config && _KDB.config.links;
    return links && typeof links[_key] === "string" ? links[_key] : "";
  }

  function buildLinkIcon(_wrapClass, _label, _href, _imgId, _imgSrc) {
    var wrap = createElement("div", _wrapClass, { title: _label });
    var link = createElement("a", null, { href: _href, target: "_blank", rel: "noopener noreferrer" });
    link.appendChild(createElement("img", null, { id: _imgId, src: _imgSrc, alt: _label }));
    wrap.appendChild(link);
    return wrap;
  }

  function buildHeaderChrome(_KDB) {
    var imagesBase = resolveImagesBase(_KDB);
    var wrapper = createElement("div", "KDB_topHeaderWrapper", { "data-kdb-header-root": "1" });
    var top = createElement("div", "KDB_topHeader", null);
    top.id = "KDB_topHeader";
    var leftEmpty = createElement("div", "KDB_topHeader_leftEmptyContainer", null);
    var textColumn = createElement("div", "KDB_topHeader_textContainer", null);
    var title = createElement("p", "KDB_topHeader_headerText", null);
    title.id = "KDB__topHeader_headerText";
    title.setAttribute("tabindex", "0");
    var subtitle = createElement("p", "kdb-header-subtitle-text", null);
    subtitle.id = "KDB__topHeader_subtitleText";
    subtitle.setAttribute("tabindex", "0");
    textColumn.appendChild(title);
    textColumn.appendChild(subtitle);

    var right = createElement("div", "KDB_topHeader_right", null);
    var state = _KDB && _KDB.state && _KDB.state.header;
    var iconKey = (state && state.iconKey) || _config.DEFAULT_ICON_KEY;
    var iconWrap = createElement("div", "KDB_topHeader_iconContainer", null);
    var headerIcon = createElement("img", "headerIcon", {
      id: "Stadt-wien",
      alt: _config.LABELS.stadtWien,
      src: imagesBase + iconKey + ".png",
      "data-icon-key": iconKey
    });
    iconWrap.appendChild(headerIcon);
    // LTR: user manual, dataspot, Stadt-wien (= RTL: Stadt-wien, dataspot, benutzerHandbuch).
    right.appendChild(
      buildLinkIcon(
        "KDB_topHeader_userManualIconContainer",
        _config.LABELS.userManual,
        readConfiguredLink(_KDB, "userManualUrl"),
        "KDB_userManual",
        imagesBase + "benutzerHandbuch.png"
      )
    );
    right.appendChild(
      buildLinkIcon(
        "KDB_topHeader_dataSpotIconContainer",
        _config.LABELS.dataspot,
        readConfiguredLink(_KDB, "dataSpotUrl"),
        "KDB_dataSpotIcon",
        imagesBase + "dataspot.png"
      )
    );
    right.appendChild(iconWrap);

    top.appendChild(leftEmpty);
    top.appendChild(textColumn);
    top.appendChild(right);
    wrapper.appendChild(top);
    return { root: wrapper, titleEl: title, subtitleEl: subtitle, iconEl: headerIcon };
  }

  function placeHeader(_mountTarget, _rootEl) {
    if (!_mountTarget || !_rootEl) return;
    if (_mountTarget.firstChild) {
      _mountTarget.insertBefore(_rootEl, _mountTarget.firstChild);
      return;
    }
    _mountTarget.appendChild(_rootEl);
  }

  function setHidden(_node, _hidden) {
    if (!_node) return;
    if (_hidden) {
      _node.setAttribute("hidden", "hidden");
      _node.style.display = "none";
    } else {
      _node.removeAttribute("hidden");
      _node.style.display = "";
    }
  }

  function setEditable(_node, _editable) {
    if (!_node) return;
    if (_editable) {
      _node.setAttribute("contenteditable", "true");
      _node.setAttribute("tabindex", "-1");
    } else {
      _node.removeAttribute("contenteditable");
      _node.setAttribute("tabindex", "0");
    }
    if (_node.classList) _node.classList.toggle("kdb-header-edit-selected", _editable);
  }

  function syncHeaderIcon(_KDB, _domRefs, _state) {
    if (!_domRefs.iconEl) return;
    var iconKey = _state.iconKey || _config.DEFAULT_ICON_KEY;
    var src = resolveImagesBase(_KDB) + iconKey + ".png";
    if (_domRefs.iconEl.getAttribute("src") !== src) _domRefs.iconEl.setAttribute("src", src);
    if (_domRefs.iconEl.getAttribute("data-icon-key") !== iconKey) _domRefs.iconEl.setAttribute("data-icon-key", iconKey);
  }

  function syncHeaderView(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.header;
    var domRefs = _KDB && _KDB.runtime && _KDB.runtime.header && _KDB.runtime.header.domRefs;
    if (!state || !domRefs || !domRefs.rootEl) return;
    var isActive = state.status === "active";
    setHidden(domRefs.rootEl, !isActive);
    if (!isActive) {
      if (domRefs.rootEl.classList) domRefs.rootEl.classList.remove("KDB_topHeaderWrapper--hasSubtitle");
      return;
    }
    var editTarget = state.activeEditableTarget || (state.editTarget === "mainTitle" ? "title" : state.editTarget);
    if (editTarget !== "title") domRefs.titleEl.textContent = state.titleText || "";
    if (editTarget !== "subtitle") domRefs.subtitleEl.textContent = state.subtitleText || "";
    var isSubtitleOn = state.subtitleStatus === "active" || state.subtitleStatus === "visible";
    if (domRefs.rootEl.classList) domRefs.rootEl.classList.toggle("KDB_topHeaderWrapper--hasSubtitle", isSubtitleOn);
    setHidden(domRefs.subtitleEl, !isSubtitleOn);
    setEditable(domRefs.titleEl, editTarget === "title");
    setEditable(domRefs.subtitleEl, editTarget === "subtitle");
    syncHeaderIcon(_KDB, domRefs, state);
  }

  function ensureHeaderChrome(_KDB) {
    var rt = _KDB.runtime.header;
    var domRefs = rt.domRefs;
    if (_KDB.state.header.status !== "active" || domRefs.rootEl) return;
    var built = buildHeaderChrome(_KDB);
    domRefs.rootEl = built.root;
    domRefs.titleEl = built.titleEl;
    domRefs.subtitleEl = built.subtitleEl;
    domRefs.iconEl = built.iconEl;
    placeHeader(domRefs.mountTargetEl, domRefs.rootEl);
  }

  function removeHeaderChrome(_KDB) {
    var domRefs = _KDB.runtime.header.domRefs;
    if (domRefs.rootEl && domRefs.rootEl.parentNode) domRefs.rootEl.parentNode.removeChild(domRefs.rootEl);
    domRefs.rootEl = null;
    domRefs.titleEl = null;
    domRefs.subtitleEl = null;
    domRefs.iconEl = null;
  }

  return {
    ensureHeaderChrome: ensureHeaderChrome,
    removeHeaderChrome: removeHeaderChrome,
    syncHeaderView: syncHeaderView
  };
});
