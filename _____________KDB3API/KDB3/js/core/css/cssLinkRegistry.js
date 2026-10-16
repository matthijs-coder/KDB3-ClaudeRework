define([], function () {
  "use strict";

  // Which boot instances use a <link> that KDB created. The page (document.head) is shared by the two
  // instances of a double boot, so the owner set lives on the element itself: it survives a second loaded
  // copy of this module. A link is removed only when its last user releases it. Links that were not created
  // here have no owner set and are never joined, tracked or removed.
  var OWNERS_PROPERTY = "__kdbOwners";

  function createOwnedLink(_KDB, _href) {
    var linkEl = document.createElement("link");
    linkEl.rel = "stylesheet";
    linkEl.href = _href;
    linkEl[OWNERS_PROPERTY] = new Set([_KDB]);
    document.head.appendChild(linkEl);
    return linkEl;
  }

  function joinOwnedLink(_KDB, _linkEl) {
    var owners = _linkEl[OWNERS_PROPERTY];
    if (!owners) {
      return false;
    }
    owners.add(_KDB);
    return true;
  }

  function releaseLink(_KDB, _linkEl) {
    var owners = _linkEl[OWNERS_PROPERTY];
    if (!owners) {
      return;
    }
    owners.delete(_KDB);
    if (owners.size > 0) {
      return;
    }
    delete _linkEl[OWNERS_PROPERTY];
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
