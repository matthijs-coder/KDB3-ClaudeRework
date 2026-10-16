define([], function () {
  "use strict";

  function readWritebackGetPersistPopup() {
    try {
      const docs = listPersistDocuments();
      for (let index = 0; index < docs.length; index += 1) {
        const popup = readDirectBodyPersistPopup(docs[index] && docs[index].body);
        if (popup) { return popup; }
      }
      return null;
    } catch (error) {
      console.warn("[writebackGet.persistLanding] persist popup query failed", error);
      return null;
    }
  }

  function listPersistDocuments() {
    try {
      const docs = [];
      if (typeof document !== "undefined") { docs.push(document); }
      try {
        const topDoc = window.top && window.top.document;
        if (topDoc && topDoc !== document) { docs.push(topDoc); }
      } catch (error) { /* cross-origin top: KDB document only */ }
      return docs;
    } catch (error) {
      return [];
    }
  }

  function readDirectBodyPersistPopup(_body) {
    try {
      const children = _body && _body.children;
      if (!children) { return null; }
      let firstPopup = null;
      for (let index = 0; index < children.length; index += 1) {
        const node = children[index];
        if (!node || String(node.tagName).toLowerCase() !== "smq-popup") { continue; }
        if (!firstPopup) { firstPopup = node; }
        if (hasParametersetTitle(node)) { return node; }
      }
      return firstPopup;
    } catch (error) {
      return null;
    }
  }

  function hasParametersetTitle(_popup) {
    try {
      if (!_popup || typeof _popup.querySelector !== "function") { return false; }
      const title = _popup.querySelector("h1.api-title");
      const text = title && title.textContent ? String(title.textContent) : "";
      return text.toLowerCase().indexOf("parameterset") !== -1;
    } catch (error) {
      return false;
    }
  }

  return readWritebackGetPersistPopup;
});
