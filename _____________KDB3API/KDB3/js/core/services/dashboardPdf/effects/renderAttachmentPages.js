define(["./renderAttachmentRows.js"], function (_renderAttachmentRows) {
  "use strict";

  function toPt(_millimeters) {
    return _millimeters * (72 / 25.4);
  }

  function renderAttachmentPages(_doc, _rows) {
    var pageWidth = _doc.internal.pageSize.getWidth();
    var pageHeight = _doc.internal.pageSize.getHeight();
    var oneMm = toPt(1);
    var layout = {
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      oneMm: oneMm,
      startX: 10 * oneMm,
      tableStartY: 20 * oneMm,
      continueY: 10 * oneMm,
      titleY: 15 * oneMm,
      col1Width: 40 * oneMm,
      col2Width: pageWidth - (60 * oneMm),
      minRowHeight: 8 * oneMm,
      cellPadding: 2 * oneMm,
      textBaselineOffset: 3 * oneMm,
      lineHeight: 5 * oneMm,
      tableWidth: pageWidth - (20 * oneMm)
    };
    var title = "Anhang";
    _doc.addPage("a4", "landscape");
    _doc.setFont("helvetica", "bold");
    _doc.setFontSize(16);
    _doc.setTextColor(0, 0, 0);
    _doc.text(title, (layout.pageWidth - _doc.getTextWidth(title)) / 2, layout.titleY);
    _renderAttachmentRows(_doc, _rows, layout);
  }

  return renderAttachmentPages;
});
