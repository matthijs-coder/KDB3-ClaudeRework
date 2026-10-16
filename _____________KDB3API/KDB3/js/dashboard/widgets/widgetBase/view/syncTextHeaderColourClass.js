define(["../../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  var widget = _widgetChrome.widget.strings;
  function isTextWidget(widgetType, shellEl) {
    const type = String(widgetType || "").toLowerCase();
    if (type === "text") {
      return true;
    }
    if (type === "live" || type === "vis" || type === "visualization") {
      return false;
    }
    return shellEl && typeof shellEl.querySelector === "function" && !!shellEl.querySelector(widget.staticContentSelector);
  }

  function syncTextHeaderColourClass(shellEl) {
    const widgetHeader = shellEl.querySelector(widget.widgetHeaderSelector);
    const textArea = shellEl.querySelector(widget.staticContentSelector);
    if (!widgetHeader || !textArea) {
      return;
    }
    const oldColorClass = findFillCustomColorClass(widgetHeader);
    const newColorClass = findFillCustomColorClass(textArea);
    if (oldColorClass) {
      widgetHeader.classList.remove(oldColorClass);
    }
    if (newColorClass) {
      widgetHeader.classList.add(newColorClass);
    }
  }

  function findFillCustomColorClass(element) {
    if (!element || !element.classList) {
      return null;
    }
    const classes = Array.from(element.classList);
    let index = 0;
    while (index < classes.length) {
      if (classes[index].indexOf("fill-customColor") === 0) {
        return classes[index];
      }
      index += 1;
    }
    return null;
  }

  return { isTextWidget: isTextWidget, syncTextHeaderColourClass: syncTextHeaderColourClass };
});
