define([], function () {
  function __controller(_source, _fallbackIndex) {
    const source = _source || {};
    const corTabIndex = readNumber(source.corTabIndex, readNumber(source.index, _fallbackIndex));
    const childIndex = readNumber(source.childIndex, corTabIndex);
    const sourcePageId = readString(source.pageId, readString(source.page, null));
    const tabId = readString(source.tabId, readString(source.id, readString(sourcePageId, "tab-" + corTabIndex)));
    const pageId = tabId;

    return {
      tabId: tabId,
      pageId: pageId,
      aliases: readAliases(tabId, pageId),
      corTabIndex: corTabIndex,
      childIndex: childIndex
    };
  }

  function readNumber(value, fallback) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }

    return Number.isFinite(fallback) ? fallback : 0;
  }

  function readString(value, fallback) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }

    return fallback;
  }

  function readAliases(tabId, pageId) {
    const aliases = [];

    appendAlias(aliases, tabId);
    appendAlias(aliases, pageId);

    return aliases;
  }

  function appendAlias(aliases, value) {
    if (typeof value === "string" && value.length > 0 && aliases.indexOf(value) === -1) {
      aliases.push(value);
    }
  }

  return __controller;
});
