define([], function () {
  return {
    info: { kind: "info", ariaLabel: "info", className: "KDB_widgetInfoButton", icon: "info.svg", title: "Optionen zur Steuerung des Text- oder Diagrammelements" },
    focusOnly: {
      unmaximize: {
        kind: "unmaximize",
        ariaLabel: "unmaximize",
        className: "KDB_unmaximizeButton",
        icon: "minimize.svg",
        title: "Normale Größe",
        action: "unmaximize"
      }
    },
    live: [
      {
        kind: "visualization",
        ariaLabel: "visualization",
        className: "KDB_visualizationsButton",
        icon: "change-visualization_32.svg",
        title: "Diagrammtyp",
        dropdownClass: "KDB_visualizationsContainer"
      },
      { kind: "grouping", ariaLabel: "grouping", className: "KDB_groupingButton", icon: "grouping.svg", title: "Zeitebene", dropdownClass: "KDB_groupingContainer" },
      {
        kind: "dimension",
        ariaLabel: "dimensions",
        className: "KDB_dimensionsButton",
        icon: "dimensions.png",
        title: "Dimensionen",
        dropdownClass: "KDB_dimensionsContainer",
        usesTable: true
      },
      { kind: "topN", ariaLabel: "topN", className: "KDB_topNButton", icon: "top10.png", title: "TopN", dropdownClass: "KDB_topNContainer" },
      { kind: "move", ariaLabel: "move", className: "KDB_moveButton", icon: "move.svg", title: "Verschieben", action: "move" },
      { kind: "resize", ariaLabel: "resize", className: "KDB_resizeButton", icon: "resize.svg", title: "Größe ändern", action: "resize" },
      { kind: "maximize", ariaLabel: "maximize", className: "KDB_maximizeButton", icon: "maximize_32.svg", title: "Vollbild", action: "maximize" },
      {
        kind: "backgroundColor",
        ariaLabel: "backgroundColor",
        className: "KDB_backgroundColorButton",
        icon: "backgroundColor.png",
        title: "Hintergrundfarbe",
        dropdownClass: "KDB_backgroundColorContainer"
      },
      { kind: "showValues", ariaLabel: "showValues", className: "KDB_showValuesButton", icon: "adjust.svg", title: "Zusatzoptionen", dropdownClass: "KDB_showValuesContainer" },
      { kind: "reset", ariaLabel: "reset", className: "KDB_deleteButton", icon: "delete_32.svg", title: "Löschen", action: "reset" }
    ],
    text: [
      { kind: "title", ariaLabel: "text", className: "KDB_textButton", icon: "text--creation_32.svg", title: "Text", action: "title" },
      { kind: "move", ariaLabel: "move", className: "KDB_moveButton", icon: "move.svg", title: "Verschieben", action: "move" },
      { kind: "resize", ariaLabel: "resize", className: "KDB_resizeButton", icon: "resize.svg", title: "Größe ändern", action: "resize" },
      {
        kind: "backgroundColor",
        ariaLabel: "backgroundColor",
        className: "KDB_backgroundColorButton",
        icon: "backgroundColor.png",
        title: "Hintergrundfarbe",
        dropdownClass: "KDB_backgroundColorContainer"
      },
      { kind: "fontSize", ariaLabel: "fontSize", className: "KDB_fontSizeButton", icon: "fontSize.png", title: "Schriftgröße", dropdownClass: "KDB_fontSizeContainer" },
      { kind: "layout", ariaLabel: "restyle", className: "KDB_restyleButton", icon: "borders.svg", title: "Umstylen", dropdownClass: "KDB_layoutContainer" },
      { kind: "reset", ariaLabel: "reset", className: "KDB_deleteButton", icon: "delete_32.svg", title: "Löschen", action: "reset" }
    ]
  };
});
