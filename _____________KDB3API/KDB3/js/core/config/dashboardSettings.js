define([], function () {
  "use strict";

  var links = {
    kdbControlHandbookUrl: "https://www.intern.magwien.gv.at/web/md-pr/konfigurierbares-personaldashboard",
    userManualUrl: "https://www.intern.magwien.gv.at/web/md-pr/konfigurierbares-personaldashboard",
    wienKiUrl: "https://wienki.intern.wien.gv.at/assistant/#/chat",
    dataSpotUrl: "https://dxmeta.wien.gv.at/dataspot/web/dxmeta/datasets/0d1344b9-6253-4ca3-ac24-f506db843e58",
    pkzAnalysetool: {
      dev: "https://bi-dev.digital-wien.gv.at/dxportal/bi/?pathRef=.public_folders%2FPersonal%2FPKZ%2F10_Standardberichte%2FPER125%2BPersonalkennzahlen-Analysetool",
      test: "https://bi-test.digital-wien.gv.at/dxportal/bi/?pathRef=.public_folders%2FPersonal%2FPKZ%2F10_Standardberichte%2FPER125%2BPersonalkennzahlen-Analysetool",
      prod: "https://bi.digital-wien.gv.at/dxportal/bi/?pathRef=.public_folders%2FPersonal%2FPKZ%2F10_Standardberichte%2FPER125%2BPersonalkennzahlen-Analysetool"
    }
  };

  var tabs = {
    "0": { role: "dashboard" },
    "1": { role: "dashboard" },
    "2": { role: "dashboard" },
    "3": { role: "dashboard" },
    "4": { role: "dashboard" },
    "5": { role: "helper" }
  };

  var dataSources = {
    metrics: {
      default: { name: "Personal_KDB", prefix: "Personal_KDB_TM1" }
    }
  };

  return { links: links, tabs: tabs, dataSources: dataSources };
});
