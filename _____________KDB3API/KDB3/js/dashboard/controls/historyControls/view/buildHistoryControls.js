define([], function () {
  "use strict";

  function __controller(_KDB) {
    var rootEl;
    var undoItemEl;
    var redoItemEl;
    var undoButtonEl;
    var redoButtonEl;
    var undoIconEl;
    var redoIconEl;

    rootEl = document.createElement("div");
    rootEl.className = "kdb-history-controls";
    rootEl.setAttribute("data-kdb-history-controls", "true");

    undoItemEl = document.createElement("div");
    undoItemEl.className = "kdb-history-controls__item";
    undoButtonEl = document.createElement("button");
    undoButtonEl.type = "button";
    undoButtonEl.className = "kdb-history-controls__button";
    undoButtonEl.setAttribute("data-kdb-history-action", "undo");
    undoButtonEl.setAttribute("aria-label", "Undo");
    undoButtonEl.title = "Undo";
    undoIconEl = document.createElement("span");
    undoIconEl.className = "kdb-history-controls__icon";
    undoIconEl.setAttribute("aria-hidden", "true");
    undoIconEl.textContent = "\u21B6";
    undoButtonEl.appendChild(undoIconEl);
    undoItemEl.appendChild(undoButtonEl);

    redoItemEl = document.createElement("div");
    redoItemEl.className = "kdb-history-controls__item";
    redoButtonEl = document.createElement("button");
    redoButtonEl.type = "button";
    redoButtonEl.className = "kdb-history-controls__button";
    redoButtonEl.setAttribute("data-kdb-history-action", "redo");
    redoButtonEl.setAttribute("aria-label", "Redo");
    redoButtonEl.title = "Redo";
    redoIconEl = document.createElement("span");
    redoIconEl.className = "kdb-history-controls__icon";
    redoIconEl.setAttribute("aria-hidden", "true");
    redoIconEl.textContent = "\u21B7";
    redoButtonEl.appendChild(redoIconEl);
    redoItemEl.appendChild(redoButtonEl);

    rootEl.appendChild(undoItemEl);
    rootEl.appendChild(redoItemEl);
    return rootEl;
  }

  return __controller;
});
