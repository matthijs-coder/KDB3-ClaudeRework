define([], function () {
  "use strict";

  // Which boot instances use a <link> that KDB created. The page (document.head) is shared by the two
  // instances of a double boot, so this registry is module-level on purpose: a link is removed only when
  // its last user releases it. Links that were not created here are never tracked and never removed.
  var ownersByLink = new WeakMap();

  function createOwnedLink(_KDB, _href) {
    var linkEl = document.createElement("link");
    linkEl.rel = "stylesheet";
    linkEl.href = _href;
    document.head.appendChild(linkEl);
    ownersByLink.set(linkEl, new Set([_KDB]));
    return linkEl;
  }

  function joinOwnedLink(_KDB, _linkEl) {
    var owners = ownersByLink.get(_linkEl);
    if (!owners) {
      return false;
    }
    owners.add(_KDB);
    return true;
  }

  function releaseLink(_KDB, _linkEl) {
    var owners = ownersByLink.get(_linkEl);
    if (!owners) {
      return;
    }
    owners.delete(_KDB);
    if (owners.size > 0) {
      return;
    }
    ownersByLink.delete(_linkEl);
    if (_linkEl.parentNode) {
      _linkEl.parentNode.removeChild(_linkEl);
    }
  }

  return {
    createOwnedLink: createOwnedLink,
    joinOwnedLink: joinOwnedLink,
    releaseLink: releaseLink
  };
});
