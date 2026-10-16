define([], function () {
  "use strict";

  var WAIT_DOCUMENT_HTML = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title></title></head><body><p></p></body></html>";

  function labelText(_labels, _key) {
    var value = _labels && _labels[_key];
    return typeof value === "string" ? value : "";
  }

  function writeDrillthroughWaitDocument(_handle, _labels) {
    var doc;
    try {
      doc = _handle.document;
      doc.open();
      doc.write(WAIT_DOCUMENT_HTML);
      doc.close();
      doc.title = labelText(_labels, "waitWindowTitle");
      doc.body.firstChild.textContent = labelText(_labels, "waitWindowBody");
    } catch (error) {
      console.error("[drillthrough.writeDrillthroughWaitDocument]", error);
      throw error;
    }
  }

  function replaceDrillthroughWaitBody(_handle, _labels, _body) {
    var doc;
    try {
      doc = _handle.document;
      doc.title = labelText(_labels, "waitWindowTitle");
      doc.body.textContent = typeof _body === "string" ? _body : "";
    } catch (error) {
      console.error("[drillthrough.replaceDrillthroughWaitBody]", error);
      throw error;
    }
  }

  return {
    writeDrillthroughWaitDocument: writeDrillthroughWaitDocument,
    replaceDrillthroughWaitBody: replaceDrillthroughWaitBody
  };
});
