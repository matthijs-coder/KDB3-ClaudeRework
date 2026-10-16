# Saved properties

Paste sources for the Cognos property panel. Each file is `const x = JSON.stringify({...})`: paste the resulting string into the property field with the same id (the field ids are declared in `../KDB3/spec.json`). **No code imports these files**; the runtime reads the pasted values from the Cognos properties (`core/properties/`). `core/config/mapping/parameterMap.js:5` cites this folder by path, so keep the folder where it is.

| File | In `spec.json` | Runtime key (`core/properties/propertyDefinitions.js`) | Note |
|---|---|---|---|
| `loadingTablesPropId.js` | yes | `loadingTablesPropObj` | Array of table names (not an object). |
| `kennzahlenTablesPropId.js` | yes | `kennzahlenTablesPropObj` | |
| `kennzahlenTreePropId.js` | yes | `kennzahlenTreePropObj` | `dashboard/metricsTree/catalog.js` reads `properties.metricsTreePropObj`, not this key (see `contracts/metricsTree.md`). |
| `filterPropId.js` | yes | `filterPropObj` | |
| `textWidgetPropId.js` | yes | `textWidgetPropObj` | Also read for default widget dimensions (`widgetBase/view/placement.js`, `dragDrop/avatar.js`). |
| `visualizationsPropId.js` | yes | `visualizationsPropObj` | Also read for default widget dimensions (`widgetBase/view/placement.js`, `dragDrop/avatar.js`). |
| `visualizationsDataPropId.js` | yes | `visualizationsDataPropObj` | |
| `linePropId.js` | yes | `linePropObj` | |
| `piePropId.js` | yes | `piePropObj` | |
| `stackedBarPropId.js` | yes | `stackedBarPropObj` | |
| `stackedColumnPropId.js` | yes | `stackedColumnPropObj` | |
| `listPropId.js` | yes | `listPropObj` | |
| `com.ibm.vis.custom.prognoseyearlinechartPropId.js` | yes | `prognosePropObj` | |
| `kennzahlSpecificSlotDefaultId.js` | yes | `kennzahlSpecificSlotDefaultObj` | About 113 KB; the largest paste source. |
| `headerWidgetPropId.js` | **no** | `headerWidgetPropObj` | Read at runtime but missing in `spec.json`. |
| `pdfAttachmentPageId.js` | yes | `pdfAttachmentPageObj` | |
| `parameterMappingId.js` | yes | **not read** | The mapping lives in `core/config/mapping/parameterMap.js`; this file is only its source dump. |

## Known drift (spec.json is frozen)

- `headerWidgetPropId` is read by the runtime but not declared in `spec.json`.
- `parameterMappingId` is declared in `spec.json` but not read by the runtime.
- `spec.json` has three `"comment"` keys at the top of the extension object (duplicate keys; JSON keeps the last).
- Fixing any of these changes the extension and needs a re-upload; tracked as a Phase 2 request.

## `_archive/`

- `kennzahlSpecificTranslated.js`: unimplemented profile-based draft format (`lineProfile` / `slotProfile`); no code or doc uses it.
