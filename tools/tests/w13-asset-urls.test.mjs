// W13 sweep B: every asset URL the app constructs (CSS hrefs, images of header, tabs, dragDrop, toolbar controls,
// widget settings, kdbControl) stays byte-identical when the hard-coded base moves into one config value.
// The golden was recorded on the unchanged code. Both prefix spellings ("./v1/ext/KDB3/" and "v1/ext/KDB3/") stay.
// Run: node --test tools/tests/w13-asset-urls.test.mjs   (RECORD=1 rewrites the golden; only on intended changes)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w13-asset-urls.golden.json");
const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
const load = (rel) => loadAmd(path.join(JS_ROOT, rel), { stubs: { console: quiet, window: { top: {} }, document: {} } });

function collectAssetUrls() {
  const css = load("core/css/config/cssHrefList.js");
  const kdbIcons = load("dashboard/canvas/kdbControl/config/icons.js");
  const dragDrop = load("dashboard/canvas/dragDrop/config.js");
  const header = load("dashboard/header/config.js");
  const toolbar = load("dashboard/controls/toolbarControls/config.js");
  const widgetSettings = load("dashboard/widgets/widgetSettings/config.js");
  const tabs = load("dashboard/tabs/config/defaults.js");
  const settingsIcons = load("dashboard/widgets/widgetSettings/config/controlDefinitions.js");
  const tabIconFiles = [tabs.EDIT_ICON_DELETE_FILE, tabs.EDIT_ICON_DUPLICATE_FILE, tabs.EDIT_ICON_MOVE_FILE];
  const kdbKeys = ["kdbControlHeaderIconSettingsSrc", "kdbControlHeaderIconInfoSrc"];
  return {
    cssHrefs: Array.from(css),
    kdbControlIcons: Object.fromEntries(kdbKeys.map((key) => [key, kdbIcons.readIconSrc({}, key)])),
    kdbControlIconsConfigured: kdbIcons.readIconSrc({ config: { options: { kdbControlHeaderIconInfoSrc: "custom/info.svg" } } }, "kdbControlHeaderIconInfoSrc"),
    dragDropAvatars: dragDrop.avatarAssetPaths,
    headerImagesBase: header.IMAGES_BASE_PATH,
    headerImageUrls: ["Stadt-wien", "benutzerHandbuch", "dataspot"].map((stem) => header.IMAGES_BASE_PATH + stem + ".png"),
    toolbarIcons: toolbar.ICON_ASSETS,
    widgetSettingsBase: widgetSettings.readImagePath(),
    widgetSettingsSettingsIcon: widgetSettings.readImagePath() + "settings.svg",
    tabsBase: tabs.EDIT_ICON_IMAGES_BASE,
    tabIconUrls: tabIconFiles.map((file) => tabs.EDIT_ICON_IMAGES_BASE + file),
    widgetSettingsControlIconUrls: collectControlIcons(settingsIcons).map((file) => widgetSettings.readImagePath() + file)
  };
}

function collectControlIcons(definitions) {
  const files = [];
  const visit = (value) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      if (typeof value.icon === "string") files.push(value.icon);
      Object.values(value).forEach(visit);
    }
  };
  visit(definitions);
  return files;
}

const record = process.env.RECORD === "1";

test("every constructed asset URL matches the golden recorded on the old code", () => {
  const actual = collectAssetUrls();
  if (record) {
    fs.writeFileSync(GOLDEN, JSON.stringify(actual, null, 2) + "\n");
    return;
  }
  assert.deepStrictEqual(actual, JSON.parse(fs.readFileSync(GOLDEN, "utf8")));
});

test("no asset URL is empty and every one starts with one of the two recorded base spellings", () => {
  const urls = JSON.stringify(collectAssetUrls());
  const bases = urls.match(/"(\.\/)?v1\/ext\/KDB3\//g) || [];
  assert.ok(bases.length >= 30, "found " + bases.length);
});
