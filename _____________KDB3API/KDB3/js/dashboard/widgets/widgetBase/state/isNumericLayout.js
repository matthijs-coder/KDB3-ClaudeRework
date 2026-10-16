define([], function () {
  function isNumericLayout(layout) {
    return (
      layout &&
      typeof layout.x === "number" &&
      typeof layout.y === "number" &&
      typeof layout.width === "number" &&
      typeof layout.height === "number"
    );
  }

  return isNumericLayout;
});
