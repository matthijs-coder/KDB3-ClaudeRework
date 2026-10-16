define(["./localFilterRecipes.js"], function (_localFilterRecipes) {
    "use strict";

    function resolveParkFilters(tables, _recipes) {
        var key;
        var recipe;
        var id;
        try {
            for (key in tables) {
                if (!tables.hasOwnProperty(key)) {
                    continue;
                }
                if (!tables[key] || typeof tables[key].parkFilter !== "string") {
                    continue;
                }
                id = tables[key].parkFilter;
                recipe = _recipes[id];
                if (recipe && typeof recipe === "object" && recipe.itemId && recipe.body) {
                    tables[key].parkFilter = recipe;
                } else {
                    delete tables[key].parkFilter;
                    console.error("[resolveParkFilters] unknown parkFilter id", id);
                }
            }
            return tables;
        } catch (err) {
            console.error("[resolveParkFilters] failed", err);
            if (tables) {
                for (key in tables) {
                    if (!tables.hasOwnProperty(key)) {
                        continue;
                    }
                    if (tables[key] && typeof tables[key].parkFilter === "string") {
                        delete tables[key].parkFilter;
                    }
                }
            }
            return tables;
        }
    }

    return resolveParkFilters({
    //tables & hierarchies 

    //source ready

    // pick selects cell output values, e.g. ["display"] or [{ display: "d" }].
    // Source "display" and "use" apply the default fallback logic.



    personal_berechtigung_dienststelle_kdb_ready: {
        name: "Personal_Berechtigung_Dienststelle_KDBReady",
        role: "source_ready",
        description: "indicates whether the source 'personal_berechtigung_dienststelle_kdb' is ready and available ",
        load: true
      },
      personal_berechtigung_kdb_ready: {
        name: "Personal_Berechtigung_KDBReady",
        role: "source_ready",
        description: "indicates whether the source 'personal_berechtigung_dienststelle_kdb' is ready and available ",
        load: true
      },
      personal_kdb_ready: {
        name: "Personal_KDBReady",
        role: "source_ready",
        description: "indicates whether the source 'personal_kdb' is ready and available ",
        load: true
      },  

      //rights
      superuser: {
          name: "SuperUser",
          role: "superuser",
          description: "superuser indicates whether the user has superuser rights",
          load: true
        },
        alle: {
            name: "Alle",
            role: "special_right",
            description: "alle indicates whether the user has rights for all the MA's",
            load: true
          },
        personengruppe: {
            name: "Personengruppe",
            role: "special_right",
            description: "personengruppe indicates whether the user has rights to see the 'Lehrlinge' personengruppe",
            load: true
          },

        dienststellenleitung: {
          name: "Dienststellenleitung",
          role: "special_right",
          description: "dienststellenleitung indicates whether the user has rights to see the'dienststellenleitung'",
          load: true
        },

        //kennzahlen
        personal_kdb: {
            name: "Personal_KDB",
            role: "kennzahlen",
            description: "personal_kdb is a fact table containing kennzahlen",
            load: true,
            isCoreTable: true,
            launchpad: false,
            shape: "row",
            pick: [{"display": "d"}],
            // Recipe id comes from ./localFilterRecipes.js
            parkFilter: "hideDataContainsB"
          },

        //singleSelect filter options (display label + TM1 use value)
        berufsfamilie_filter: {
          name: "Berufsfamilie_Filter",
          role: "single_select_options",
          description: "lookup options for the Berufsfamilie singleSelect filter",
          load: true,
          shape: "row",
          pick: [{ display: "d" }, { use: "u" }]
        },
        dienstverhältnis_filter: {
          name: "Dienstverhältnis_Filter",
          role: "single_select_options",
          description: "lookup options for the Dienstverhältnis singleSelect filter",
          load: true,
          shape: "row",
          pick: [{ display: "d" }, { use: "u" }]
        },
        geschlecht_filter: {
          name: "Geschlecht_Filter",
          role: "single_select_options",
          description: "lookup options for the Geschlecht singleSelect filter",
          load: true,
          shape: "row",
          pick: [{ display: "d" }, { use: "u" }]
        },
        altersgruppe_filter: {
          name: "Altersgruppe_Filter",
          role: "single_select_options",
          description: "lookup options for the Altersgruppe singleSelect filter",
          load: true,
          shape: "row",
          pick: [{ display: "d" }, { use: "u" }]
        },
        personengruppe_filter: {
          name: "Personengruppe_Filter",
          role: "single_select_options",
          description: "lookup options for the Personengruppe singleSelect filter",
          load: true,
          shape: "row",
          pick: [{ display: "d" }, { use: "u" }]
        },
        dienststellenleitung_filter: {
          name: "Dienststellenleitung_Filter",
          role: "single_select_options",
          description: "lookup options for the Dienststellenleitung singleSelect filter",
          load: true,
          shape: "row",
          pick: [{ display: "d" }, { use: "u" }]
        },

        //sichten en dienststellen  
        sicht_bw: {
            name: "Sichten_BW",
            role: "sicht_option",
            description: "indicates whether the bw sicht option is loaded and is available",
            load: true,
            shape: "row",
            pick: [{ display: "d" }, { use: "u" }],
          },
        sicht_dezpv: {
            name: "Sichten_DEZPV",
            role: "sicht_option",
            description: "indicates whether the dezpv sicht option is loaded and is available",
            load: true,
            shape: "row",
            pick: [{ display: "d" }, { use: "u" }]
          },
          dienststelle_bw_default: {
            name: "Dienststelle_BWDefault",
            role: "dienststelle_default",
            description: "contains the single default value for the bw dienststelle",
            load: true
          },
          dienststelle_dezpv_default: {
            name: "Dienststelle_DEZPVDefault",
            role: "dienststelle_default",
            description: "contains the single default value for the dezpv dienststelle",
            load: true
          },

        // Hiërarchie-tabellen laden NIET eager (load: false, opvolgfix 2026-08-20):
        // bij boot is de actieve Sicht nog onbekend en de helper-widget van de
        // inactieve variant levert nooit een query-resultaat (60s-timeout + fouttoast
        // op elke schone boot). De actieve variant wordt opgewarmd zodra de Sicht
        // bekend is (dienststelle/syncDienststelleFromSicht) en de writeback-restore
        // awaited hem zelf (parameterSetRestore via awaitDienststelleDataReady).
        dienststelle_dezpv_hierarchy: {
          name: "Dienststelle_DEZPVHierarchy",
          role: "dienststelle_hierarchy",
          description: "dienststelle_dezpv_hierarchy conatains all the stellen in the dezpv dienststellen hierarchy",
          load: false,
          launchpad: false,
          parkFilter: "hideDataContainsB"
        },
        dienststelle_bw_hierarchy: {
          name: "Dienststelle_BWHierarchy",
          role: "dienststelle_hierarchy",
          description: "dienststelle_bw_hierarchy conatains all the stellen in the bw dienststellen hierarchy",
          load: false,
          launchpad: false,
          parkFilter: "hideDataContainsB"
        },

        //footer
        update_date: {
          name: "aktualisierungsDatum",
          role: "update_date",
          description: "contains the date of the last update of the data",
          load: true,
          shape: "row",
          pick: ["display", "use"]
        },
        //topN
        year: {
          name: "Jahr",
          role: "year",
          description: "Contains the latest year in the data",
          load: true
        },
        newestStichtag: {
          name: "NewestStichtag",
          role: "newest_stichtag",
          description: "Dashboard-max leftover List; TopN period pin; load false so boot does not preload",
          load: false
        },

        //writeback
        writeback: {
            name: "WritebackTabel",
            role: "writeback",
            description: "contains the saved parametersets - loaded in the writeback extension",
            load: false
          },

    }, _localFilterRecipes);

  });