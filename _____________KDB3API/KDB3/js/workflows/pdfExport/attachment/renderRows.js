define([], function () {
  "use strict";

  function toPt(millimeters) {
    return millimeters * (72 / 25.4);
  }

  function normalizeLines(lines) {
    return Array.isArray(lines) && lines.length ? lines : [""];
  }

  function setRowStyle(doc, options) {
    doc.setFillColor(options.fillColor[0], options.fillColor[1], options.fillColor[2]);
    doc.setFont("helvetica", options.fontStyle);
    doc.setFontSize(options.fontSize);
    doc.setTextColor(0, 0, 0);
  }

  function wrapCellText(doc, text, maxWidth) {
    var out = [];
    String(text == null ? "" : text).split("\n").forEach(function (paragraph) {
      normalizeLines(doc.splitTextToSize(String(paragraph), Math.max(1, maxWidth))).forEach(function (line) {
        out.push(String(line || ""));
      });
    });
    return out.length ? out : [""];
  }

  function addContinuationPage(doc, layout) {
    doc.addPage("a4", "landscape");
    return layout.continueY;
  }

  function computeFragment(layout, availableHeight, remainingLines) {
    var fitLines = Math.floor((availableHeight - (layout.cellPadding * 2)) / layout.lineHeight);
    var lineCount = Math.min(remainingLines, Math.max(1, fitLines));
    return {
      lineCount: lineCount,
      height: Math.max(layout.minRowHeight, (lineCount * layout.lineHeight) + (layout.cellPadding * 2))
    };
  }

  function drawTextLines(doc, lines, startIndex, count, x, y, layout) {
    for (var i = 0; i < count; i += 1) {
      doc.text(
        String(lines[startIndex + i] || ""),
        x + layout.cellPadding,
        y + layout.cellPadding + layout.textBaselineOffset + (i * layout.lineHeight)
      );
    }
  }

  function drawFragment(doc, layout, options, cells, lineIndex, fragment, y) {
    setRowStyle(doc, options);
    if (options.fullWidthBand) {
      doc.rect(layout.startX, y, layout.tableWidth, fragment.height, "FD");
    } else {
      doc.rect(layout.startX, y, layout.col1Width, fragment.height, "FD");
      doc.rect(layout.startX + layout.col1Width, y, layout.col2Width, fragment.height, "FD");
    }
    drawTextLines(doc, cells.labelLines, lineIndex, fragment.lineCount, layout.startX, y, layout);
    drawTextLines(doc, cells.valueLines, lineIndex, fragment.lineCount, layout.startX + layout.col1Width, y, layout);
  }

  // A row taller than the rest of the page is split into fragments over continuation pages.
  function renderSplitRow(doc, row, layout, startY, options) {
    setRowStyle(doc, options);
    var cells = {
      labelLines: wrapCellText(doc, row.label, layout.col1Width - (layout.cellPadding * 2)),
      valueLines: wrapCellText(doc, row.value, layout.col2Width - (layout.cellPadding * 2))
    };
    var totalLines = Math.max(cells.labelLines.length, cells.valueLines.length);
    var lineIndex = 0;
    var y = startY;
    while (lineIndex < totalLines) {
      var fragment = computeFragment(layout, layout.pageHeight - y, totalLines - lineIndex);
      if (fragment.height > layout.pageHeight - y) {
        y = addContinuationPage(doc, layout);
        continue;
      }
      drawFragment(doc, layout, options, cells, lineIndex, fragment, y);
      lineIndex += fragment.lineCount;
      y += fragment.height;
    }
    return y;
  }

  function renderSpacerRow(doc, layout, startY) {
    var rowHeight = Math.max(layout.minRowHeight, layout.lineHeight + (layout.cellPadding * 2));
    var shortHeight = Math.max(2 * layout.oneMm, rowHeight - (6 * layout.oneMm));
    var y = startY;
    if (rowHeight > layout.pageHeight - y) y = addContinuationPage(doc, layout);
    doc.setFillColor(255, 255, 255);
    doc.rect(layout.startX, y + layout.oneMm, layout.tableWidth, shortHeight, "F");
    return y + rowHeight;
  }

  function readRowOptions(row) {
    if (row.kind === "section") {
      return { fillColor: [211, 211, 211], fontStyle: "bold", fontSize: 12, fullWidthBand: true };
    }
    return { fillColor: [255, 255, 255], fontStyle: "normal", fontSize: 10, fullWidthBand: false };
  }

  function renderAttachmentRows(doc, rows, layout) {
    var y = layout.tableStartY;
    (rows || []).forEach(function (row) {
      var safeRow = row || { kind: "data", label: "", value: "" };
      y = safeRow.kind === "spacer"
        ? renderSpacerRow(doc, layout, y)
        : renderSplitRow(doc, safeRow, layout, y, readRowOptions(safeRow));
    });
  }

  function createPageLayout(doc) {
    var pageWidth = doc.internal.pageSize.getWidth();
    var oneMm = toPt(1);
    return {
      pageWidth: pageWidth,
      pageHeight: doc.internal.pageSize.getHeight(),
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
  }

  /** Adds the "Anhang" page(s) to the jsPDF document. */
  function renderAttachmentPages(doc, rows, title) {
    var layout = createPageLayout(doc);
    doc.addPage("a4", "landscape");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(title, (layout.pageWidth - doc.getTextWidth(title)) / 2, layout.titleY);
    renderAttachmentRows(doc, rows, layout);
  }

  return { renderAttachmentPages: renderAttachmentPages };
});
