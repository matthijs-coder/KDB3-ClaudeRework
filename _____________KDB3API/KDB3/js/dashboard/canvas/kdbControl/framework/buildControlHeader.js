define(["./createFrameworkElement"], function (_createFrameworkElement) {

  "use strict";

  function headerImgSrc(_KDB, key, fallback) {

    var o = _KDB && _KDB.config && _KDB.config.options;

    if (o && typeof o[key] === "string" && o[key]) return o[key];

    return fallback;

  }

  function readHandbookUrl(_KDB) {

    var links = _KDB && _KDB.config && _KDB.config.links;

    var u = links && links.kdbControlHandbookUrl;

    if (typeof u === "string" && u.trim()) return u.trim();

    return "";

  }

  function __controller(_KDB) {

    var wrap = _createFrameworkElement("div", null, "kdb-control__header", null);

    var title = _createFrameworkElement("div", "kdb-control-header-title", "kdb-control__header-title", null);

    title.textContent = "Dashboard-Steuerung";

    var actions = _createFrameworkElement("div", null, "kdb-control__header-actions", null);

    var settingsSrc = headerImgSrc(_KDB, "kdbControlHeaderIconSettingsSrc", "v1/ext/KDB3/images/settings.svg");

    var infoSrc = headerImgSrc(_KDB, "kdbControlHeaderIconInfoSrc", "v1/ext/KDB3/images/info.svg");

    var settingsBtn = _createFrameworkElement(

      "button",

      "kdb-control-header-settings",

      "kdb-control__header-icon-button kdb-control__header-icon-settings",

      {

        type: "button",

        "data-header-action": "select-settings",

        "aria-label": "Allgemeine Dashboard-Einstellungen",

        title: "Allgemeine Dashboard-Einstellungen",

      }

    );

    var settingsImg = document.createElement("img");

    settingsImg.className = "kdb-control__header-icon kdb-control__header-icon--settings-glyph";

    settingsImg.src = settingsSrc;

    settingsImg.setAttribute("role", "presentation");

    settingsImg.alt = "";

    settingsBtn.appendChild(settingsImg);

    var handbookUrl = readHandbookUrl(_KDB);

    var infoLink = _createFrameworkElement("a", null, "kdb-control__header-icon-button kdb-control__header-icon-info", handbookUrl

      ? {

          href: handbookUrl,

          target: "_blank",

          rel: "noopener noreferrer",

          title: "Benutzerhandbuch",

          "aria-label": "Benutzerhandbuch",

        }

      : {

          href: "#",

          tabindex: "-1",

          "aria-label": "Handbuch (Platzhalter, inaktiv)",

          "aria-hidden": "true",

        });

    var infoImg = document.createElement("img");

    infoImg.className = "kdb-control__header-icon";

    infoImg.src = infoSrc;

    if (handbookUrl) {

      infoImg.alt = "Benutzerhandbuch";

    } else {

      infoImg.setAttribute("role", "presentation");

      infoImg.alt = "";

    }

    infoLink.appendChild(infoImg);

    if (!handbookUrl) {

      infoLink.addEventListener("click", function (ev) {

        ev.preventDefault();

      });

    }

    actions.appendChild(settingsBtn);

    actions.appendChild(infoLink);

    wrap.appendChild(title);

    wrap.appendChild(actions);

    return wrap;

  }

  return __controller;

});
