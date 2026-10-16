define([], function () {
  "use strict";

  function extractUniqueNameLeaf(_useValue) {
    var text;
    var re;
    var match;
    var last;
    try {
      text = String(_useValue == null ? "" : _useValue);
      re = /\[([^\]]+)\]/g;
      last = "";
      while ((match = re.exec(text)) !== null) {
        last = match[1];
      }
      return last;
    } catch (error) {
      console.error("[dienststelle.extractUniqueNameLeaf] failed", error);
      throw error;
    }
  }

  return extractUniqueNameLeaf;
});
