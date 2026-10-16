define([], function () {
  "use strict";

  // Finds the Cognos "save parameter set" popup: a direct <smq-popup> child of body in this document or
  // window.top. The popup whose title mentions "parameterset" wins, else the first popup.
  function listPersistDocuments() {
    const docs = [];
    if (typeof document !== "undefined") { docs.push(document); }
    try {
      const topDoc = window.top && window.top.document;
      if (topDoc && topDoc !== document) { docs.push(topDoc); }
    } catch (error) { /* cross-origin top: KDB document only */ }
    return docs;
  }

  function hasParametersetTitle(_popup) {
    if (!_popup || typeof _popup.querySelector !== "function") { return false; }
    const title = _popup.querySelector("h1.api-title");
    const text = title && title.textContent ? String(title.textContent) : "";
    return text.toLowerCase().indexOf("parameterset") !== -1;
  }

  function readDirectBodyPersistPopup(_body) {
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
  }

  function readWritebackGetPersistPopup() {
    const docs = listPersistDocuments();
    for (let index = 0; index < docs.length; index += 1) {
      const popup = readDirectBodyPersistPopup(docs[index] && docs[index].body);
      if (popup) { return popup; }
    }
    return null;
  }

  return readWritebackGetPersistPopup;
});
