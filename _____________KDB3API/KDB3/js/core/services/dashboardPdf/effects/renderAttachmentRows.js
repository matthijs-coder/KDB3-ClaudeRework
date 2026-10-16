define([], function () {
  "use strict";

  function normalizeLines(_lines) {
    return Array.isArray(_lines) && _lines.length ? _lines : [""];
  }

  function setRowStyle(_doc, _options) {
    _doc.setFillColor(_options.fillColor[0], _options.fillColor[1], _options.fillColor[2]);
    _doc.setFont("helvetica", _options.fontStyle);
    _doc.setFontSize(_options.fontSize);
    _doc.setTextColor(0, 0, 0);
  }

  function wrapCellText(_doc, _text, _maxWidth) {
    var out = [];
    String(_text == null ? "" : _text).split("\n").forEach(function (paragraph) {
      normalizeLines(_doc.splitTextToSize(String(paragraph), Math.max(1, _maxWidth))).forEach(function (line) {
        out.push(String(line || ""));
      });
    });
    return out.length ? out : [""];
  }

  function addContinuationPage(_doc, _layout) {
    _doc.addPage("a4", "landscape");
    return _layout.continueY;
  }

  function computeFragment(_layout, _availableHeight, _remainingLines) {
    var fitLines = Math.floor((_availableHeight - (_layout.cellPadding * 2)) / _layout.lineHeight);
    var lineCount = Math.min(_remainingLines, Math.max(1, fitLines));
    return {
      lineCount: lineCount,
      height: Math.max(_layout.minRowHeight, (lineCount * _layout.lineHeight) + (_layout.cellPadding * 2))
    };
  }

  function drawTextLines(_doc, _lines, _startIndex, _count, _x, _y, _layout) {
    var i;
    for (i = 0; i < _count; i += 1) {
      _doc.text(
        String(_lines[_startIndex + i] || ""),
        _x + _layout.cellPadding,
        _y + _layout.cellPadding + _layout.textBaselineOffset + (i * _layout.lineHeight)
      );
    }
  }

  function drawFragment(_doc, _layout, _options, _labelLines, _valueLines, _lineIndex, _fragment, _y) {
    setRowStyle(_doc, _options);
    if (_options.fullWidthBand) {
      _doc.rect(_layout.startX, _y, _layout.tableWidth, _fragment.height, "FD");
    } else {
      _doc.rect(_layout.startX, _y, _layout.col1Width, _fragment.height, "FD");
      _doc.rect(_layout.startX + _layout.col1Width, _y, _layout.col2Width, _fragment.height, "FD");
    }
    drawTextLines(_doc, _labelLines, _lineIndex, _fragment.lineCount, _layout.startX, _y, _layout);
    drawTextLines(_doc, _valueLines, _lineIndex, _fragment.lineCount, _layout.startX + _layout.col1Width, _y, _layout);
  }

  function renderSplitRow(_doc, _row, _layout, _startY, _options) {
    var lineIndex = 0;
    var y = _startY;
    var labelLines;
    var valueLines;
    var totalLines;
    var fragment;
    setRowStyle(_doc, _options);
    labelLines = wrapCellText(_doc, _row.label, _layout.col1Width - (_layout.cellPadding * 2));
    valueLines = wrapCellText(_doc, _row.value, _layout.col2Width - (_layout.cellPadding * 2));
    totalLines = Math.max(labelLines.length, valueLines.length);
    while (lineIndex < totalLines) {
      fragment = computeFragment(_layout, _layout.pageHeight - y, totalLines - lineIndex);
      if (fragment.height > _layout.pageHeight - y) {
        y = addContinuationPage(_doc, _layout);
        continue;
      }
      drawFragment(_doc, _layout, _options, labelLines, valueLines, lineIndex, fragment, y);
      lineIndex += fragment.lineCount;
      y += fragment.height;
    }
    return y;
  }

  function renderSpacerRow(_doc, _layout, _startY) {
    var rowHeight = Math.max(_layout.minRowHeight, _layout.lineHeight + (_layout.cellPadding * 2));
    var y = _startY;
    var shortHeight = Math.max(2 * _layout.oneMm, rowHeight - (6 * _layout.oneMm));
    if (rowHeight > _layout.pageHeight - y) y = addContinuationPage(_doc, _layout);
    _doc.setFillColor(255, 255, 255);
    _doc.rect(_layout.startX, y + _layout.oneMm, _layout.tableWidth, shortHeight, "F");
    return y + rowHeight;
  }

  function rowOptions(_row) {
    if (_row.kind === "section") {
      return { fillColor: [211, 211, 211], fontStyle: "bold", fontSize: 12, fullWidthBand: true };
    }
    return { fillColor: [255, 255, 255], fontStyle: "normal", fontSize: 10, fullWidthBand: false };
  }

  function renderAttachmentRows(_doc, _rows, _layout) {
    var y = _layout.tableStartY;
    (_rows || []).forEach(function (row) {
      var safeRow = row || { kind: "data", label: "", value: "" };
      y = safeRow.kind === "spacer"
        ? renderSpacerRow(_doc, _layout, y)
        : renderSplitRow(_doc, safeRow, _layout, y, rowOptions(safeRow));
    });
  }

  return renderAttachmentRows;
});
