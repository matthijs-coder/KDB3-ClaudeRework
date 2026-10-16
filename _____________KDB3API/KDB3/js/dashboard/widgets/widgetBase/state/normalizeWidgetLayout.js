define([], function () {
  function normalizeWidgetLayout(layout) {
    const value = layout || {};
    return {
      x: Math.round(value.x || 0),
      y: Math.round(value.y || 0),
      width: Math.round(value.width || 300),
      height: Math.round(value.height || 200)
    };
  }

  return normalizeWidgetLayout;
});
