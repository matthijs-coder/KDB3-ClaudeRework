define([
  "../effects/widgetFocusMode.js"
], function (_widgetFocusMode) {
  "use strict";

  return {
    exitNativeFocus: _widgetFocusMode.exitNativeFocus,
    disposeFocusMode: _widgetFocusMode.disposeFocusMode
  };
});
