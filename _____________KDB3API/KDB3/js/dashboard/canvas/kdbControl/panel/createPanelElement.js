define([], function () {
  "use strict";

  function createPanelElement(tagName, id, className, attributes) {
    var el = document.createElement(tagName);
    if (id) el.id = id;
    if (className) el.className = className;
    if (attributes) {
      Object.keys(attributes).forEach(function (name) {
        el.setAttribute(name, attributes[name]);
      });
    }
    return el;
  }

  return createPanelElement;
});
