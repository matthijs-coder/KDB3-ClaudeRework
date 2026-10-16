define([], function () {
  function applyShellLayoutStyles(shellEl, layout) {
    shellEl.style.left = layout.x + "px";
    shellEl.style.top = layout.y + "px";
    shellEl.style.width = layout.width + "px";
    shellEl.style.height = layout.height + "px";
  }

  return applyShellLayoutStyles;
});
