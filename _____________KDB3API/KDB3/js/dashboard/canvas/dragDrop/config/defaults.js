define([], function () {
  "use strict";

  return {
    acceptedDraggedElementTypes: {
      text: true,
      visualization: true
    },
    avatarAssetPaths: {
      text: "./v1/ext/KDB3/images/text--creation_32.svg",
      visualization: "./v1/ext/KDB3/images/change-visualization_32.svg"
    },
    classNames: {
      activeDropbox: "kdb_drag-over",
      activeSource: "kdb_drag-source-active",
      avatarClone: "avatarClone",
      hiddenMount: "KDB_hidden",
      itemCopy: "itemCopy",
      itemOriginal: "itemOriginal",
      layoutGrid: "KDB_absoluteLayoutGrid",
      template: "KDB_dragAvatarTemplate"
    },
    defaultDimensions: {
      text: {
        height: 75,
        width: 300
      },
      visualization: {
        height: 300,
        width: 300
      }
    },
    fallbackPadKeys: {
      text: "text",
      visualization: "visualization"
    },
    sourceKinds: {
      metricsTreeLeaf: "metricsTreeLeaf",
      kennzahlenTreeLeaf: "kennzahlenTreeLeaf",
      toolboxTextButton: "toolboxTextButton",
      unknown: "unknown"
    },
    templateIds: {
      hiddenMount: "KDB_dragAvatarTemplates",
      text: "kdbTextAvatar",
      visualization: "kdbVisualizationAvatar"
    }
  };
});
