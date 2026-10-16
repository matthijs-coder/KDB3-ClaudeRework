define(["../config/selectors.js"], function (_selectors) {
  "use strict";

  function clickTabChromeButton(button) {
    const target = button && button.querySelector ? button.querySelector(_selectors.tabButtonItemSelector) || button : button;
    if (target && typeof target.click === "function") { target.click(); }
  }

  return clickTabChromeButton;
});
