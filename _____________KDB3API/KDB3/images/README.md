# Images

Static icons served from `./v1/ext/KDB3/images/`. All files are kept: none is provably unused (see below).

## How images resolve

- Fixed paths in JS config: `js/dashboard/widgets/widgetSettings/config/imagePaths.js`, `controlDefinitions.js`, `options.js`, `js/dashboard/tabs/config/defaults.js`, `js/dashboard/header/config/extAssetPaths.js`, `js/dashboard/canvas/dragDrop/config/defaults.js`, and the controls `iconAssets.js` files (`js/dashboard/controls/*/`).
- CSS `url()` in `css/widgets/widgetVis.css`.
- Header icon `<stem>.png`: resolved as `images/<stem>.png` from the Cognos-side `headerWidgetPropObj.icons` catalog (`dashboard/header/config/headerIconKeys.js`, `buildHeaderChrome.js`, `syncHeaderFromState.js`). `Stadt-wien.png` is the default header icon.
- Option `icon`: widget option icons come from `option.icon` of configured options (`widgetSettings/config/configuredDefaultOptionUtils.js`), so names can come from properties.

## Images without a by-name reference

No file name appears in `js/`, `css/` or `spec.json` for these 25 files, but they may still be reached through property catalogs or configured options:

add_32.svg, backgroundColor16.png, categories.png, columnAvatar.png, com.ibm.vis.custom.prognoseyear.png, copy.png, copytoclipboard.png, delete.png, filter.png, fontSize16.png, headerAvatar.png, icons.png, infoVis.png, kz.png, lineAvatar.png, list.svg, listAvatar.png, ma01.svg, pencil.png, pieAvatar.png, prognoseAvatar.png, settings.png, share-black.png, share-white.png, textAvatar.png

`Stadt-wien.png` also has no full-name reference, but it is **used** (default header icon, built from `DEFAULT_ICON_KEY` + `.png`).

Policy: keep all files until the production property values (`headerWidgetPropId.icons`, option icons) are checked.

## Recompute the list

Run from `KDB3/`:

```bash
for f in images/*; do n=$(basename "$f"); rg -qF -- "$n" js css spec.json || echo "$n"; done
```
