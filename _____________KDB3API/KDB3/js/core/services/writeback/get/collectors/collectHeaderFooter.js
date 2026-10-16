define([
  "../../schema/v3Defaults.js",
], function (_v3Defaults) {
  "use strict";

  // GET collector for v3 `head` / `foot` per contracts/writeback.md §4.2/§4.7.
  // Reads owner snapshots via _KDB.api.header/footer.getState() (state.mdc read
  // pattern). Owner values: header.status / footer.status in {idle, active,
  // removed}, header.subtitleStatus in {active, removed} (reducer-normalized).
  //
  // Encoding rules applied here:
  // - status "idle" -> omit the whole head/foot node (owner default).
  // - head.title / head.sub omitted when empty.
  // - head.subOn is only emitted for the edge case "subtitle active but text
  //   empty"; a non-empty head.sub implies a visible subtitle, and the owner
  //   default (subtitle removed, text cleared) is expressed by omission.
  function collectHeaderFooter(_KDB, _diagnostics) {
    const result = {};
    const head = collectHead(readOwnerState(_KDB, "header"));
    if (head) {
      result.head = head;
    }
    const foot = collectFoot(readOwnerState(_KDB, "footer"));
    if (foot) {
      result.foot = foot;
    }
    return result;
  }

  function readOwnerState(_KDB, owner) {
    const api = _KDB && _KDB.api ? _KDB.api[owner] : null;
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  function collectHead(headerState) {
    if (!headerState) {
      return null;
    }
    const on = mapStatusToOn(headerState.status, _v3Defaults.HEADER_STATUS_TO_ON);
    if (on === null) {
      return null; // idle/unknown -> owner default, omit head
    }
    const head = { on: on };
    if (on === 1) {
      const title = typeof headerState.titleText === "string" ? headerState.titleText : "";
      if (title !== "") {
        head.title = title;
      }
      const subtitleActive = headerState.subtitleStatus === "active";
      const subtitle = typeof headerState.subtitleText === "string" ? headerState.subtitleText : "";
      if (subtitleActive && subtitle !== "") {
        head.sub = subtitle;
      } else if (subtitleActive) {
        head.subOn = 1;
      }
      if (typeof headerState.iconKey === "string" && !_v3Defaults.isDefaultHeadIcon(headerState.iconKey)) {
        const iconStem = headerState.iconKey.trim().replace(/\.png$/i, "");
        if (iconStem) {
          head.icon = iconStem;
        }
      }
    }
    return head;
  }

  function collectFoot(footerState) {
    if (!footerState) {
      return null;
    }
    const on = mapStatusToOn(footerState.status, _v3Defaults.FOOTER_STATUS_TO_ON);
    if (on === null) {
      return null;
    }
    return { on: on };
  }

  function mapStatusToOn(status, statusMap) {
    if (typeof status !== "string" || !(status in statusMap)) {
      return null;
    }
    return statusMap[status];
  }

  return collectHeaderFooter;
});
