define([], function () {

  "use strict";

  function __controller(_tagName, _id, _className, _attributes) {

    var el = document.createElement(_tagName);

    if (_id) el.id = _id;

    if (_className) el.className = _className;

    if (_attributes) {

      var k;

      for (k in _attributes) {

        if (Object.prototype.hasOwnProperty.call(_attributes, k)) el.setAttribute(k, _attributes[k]);

      }

    }

    return el;

  }

  return __controller;

});


