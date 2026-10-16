define([], function () {
  "use strict";

  function __controller(hex) {
    var raw = String(hex || "").trim().toLowerCase();
    if (raw === "transparent") {
      return "#000000";
    }
    var h = raw.replace(/^#/, "");
    if (h.length === 8 && h.slice(6, 8) === "00") {
      return "#000000";
    }
    var six = h;
    if (h.length === 8) {
      six = h.slice(0, 6);
    } else if (h.length === 3) {
      six = h.split("").map(function (c) {
        return c + c;
      }).join("");
    }
    if (six.length !== 6) {
      return "#000000";
    }
    var r = parseInt(six.slice(0, 2), 16);
    var g = parseInt(six.slice(2, 4), 16);
    var b = parseInt(six.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000000" : "#FFFFFF";
  }

  return __controller;
});
