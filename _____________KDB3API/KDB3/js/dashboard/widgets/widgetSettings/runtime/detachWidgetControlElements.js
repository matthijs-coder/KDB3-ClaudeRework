define([], function () {
  function detachControlElement(el) {
    try {
      if (!el) {
        return;
      }
      if (el.parentNode && typeof el.parentNode.removeChild === "function") {
        el.parentNode.removeChild(el);
        return;
      }
      if (typeof el.remove === "function") {
        el.remove();
      }
    } catch (err) {
      console.error("[widgetSettings.detachControlElement] failed", err);
      throw err;
    }
  }

  function detachAllMatching(parentEl, selector) {
    try {
      const nodes = parentEl.querySelectorAll(selector);
      let index = 0;
      while (index < nodes.length) {
        detachControlElement(nodes[index]);
        index += 1;
      }
    } catch (err) {
      console.error("[widgetSettings.detachAllMatching] failed", { selector: selector }, err);
      throw err;
    }
  }

  return {
    detachControlElement: detachControlElement,
    detachAllMatching: detachAllMatching
  };
});
