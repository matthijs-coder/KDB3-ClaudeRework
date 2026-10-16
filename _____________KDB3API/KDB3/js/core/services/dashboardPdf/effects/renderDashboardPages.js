define([], function () {
  "use strict";

  var MM_TO_PT = 72 / 25.4;
  var TITLE_FALLBACK = "konfigurierbares Personaldashboard";
  var SUBTITLE_FALLBACK = "PER130 konfigurierbares Personaldashboard";
  var FOOTER_FONT_SIZE_PT = 10;
  var FOOTER_MARGIN_RIGHT_PT = 10 * MM_TO_PT;
  var FOOTER_MARGIN_BOTTOM_PT = 10 * MM_TO_PT;
  var FOOTER_LINE_GAP_PT = 5 * MM_TO_PT;
  var SUBTITLE_OFFSET_PT = 10 * MM_TO_PT;

  function readTitleText(_manifest) {
    var title = _manifest && _manifest.title ? String(_manifest.title).trim() : "";
    return title || TITLE_FALLBACK;
  }

  function readSubtitleText(_manifest) {
    var subtitle = _manifest && _manifest.subtitle ? String(_manifest.subtitle).trim() : "";
    return subtitle || SUBTITLE_FALLBACK;
  }

  function addTitlePage(_doc, _manifest) {
    var pageWidth = _doc.internal.pageSize.getWidth();
    var pageHeight = _doc.internal.pageSize.getHeight();
    var titleY = pageHeight / 2;
    _doc.setFont("helvetica", "bold");
    _doc.setFontSize(24);
    _doc.text(readTitleText(_manifest), pageWidth / 2, titleY, { align: "center" });
    _doc.setFontSize(14);
    _doc.text(readSubtitleText(_manifest), pageWidth / 2, titleY + SUBTITLE_OFFSET_PT, { align: "center" });
  }

  function addScreenshotPage(_doc, _imageDataUrl, _title, _tabName, _tabNumber) {
    var footerTitle = String(_title || "").trim() || TITLE_FALLBACK;
    var pageWidth = _doc.internal.pageSize.getWidth();
    var pageHeight = _doc.internal.pageSize.getHeight();
    var props = _doc.getImageProperties(_imageDataUrl);
    var widthRatio = pageWidth / props.width;
    var heightAtPageWidth = props.height * widthRatio;
    var isHeightLimited = heightAtPageWidth > pageHeight;
    var ratio = isHeightLimited ? pageHeight / props.height : widthRatio;
    var drawW = props.width * ratio;
    var drawH = props.height * ratio;
    var x = (pageWidth - drawW) / 2;
    var y = isHeightLimited ? 0 : (pageHeight - drawH) / 2;
    _doc.addPage("a4", "landscape");
    if (isHeightLimited) _doc.addImage(_imageDataUrl, "PNG", x, y, drawW, drawH);
    else _doc.addImage(_imageDataUrl, "PNG", x, y, drawW, drawH, undefined, "FAST");
    _doc.setFont("helvetica", "normal");
    _doc.setFontSize(FOOTER_FONT_SIZE_PT);
    _doc.text(
      footerTitle,
      pageWidth - FOOTER_MARGIN_RIGHT_PT,
      pageHeight - FOOTER_MARGIN_BOTTOM_PT - FOOTER_LINE_GAP_PT,
      { align: "right" }
    );
    _doc.text(
      "Seite " + String(_tabNumber) + ": " + String(_tabName || "-"),
      pageWidth - FOOTER_MARGIN_RIGHT_PT,
      pageHeight - FOOTER_MARGIN_BOTTOM_PT,
      { align: "right" }
    );
  }

  return { addTitlePage: addTitlePage, addScreenshotPage: addScreenshotPage };
});
