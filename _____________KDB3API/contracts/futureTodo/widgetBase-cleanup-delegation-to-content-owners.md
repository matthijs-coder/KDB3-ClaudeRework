# Future Todo: Delegate Widget Cleanup From `widgetBase` To Content Owners

## Context

`widgetBase` currently performs transfer cleanup while routing widget shells to the launchpad. That includes content-sensitive cleanup for live widgets, such as Cognos slot/filter clearing.

This is acceptable only as a temporary composed-port bridge while `widgetVis`, `widgetText`, settings, TopN and related content modules are incomplete.

> **2026-06 note:** After the closed `widgetBase` cleanup tranche, `cleanWidgetForTransfer` is **frame-only** (launchpad chrome + runtime bucket teardown). It does **not** replicate legacy Cognos slot/filter clearing. Settings-delete already calls `widgetVis/cleanupContent` via `widgetSettings` before `routeToLaunchpad`. See `_archive/futureTodo-cleanup-backlogs/widgetBase-cleanup-followup-backlog.md` for the (archived) reopen triggers.

## Required Future Direction

`widgetBase` should own frame transfer only:

- shell movement between canvas and launchpad;
- base-frame runtime cleanup;
- base placement/layout state;
- launchpad slot routing.

Content cleanup should be delegated to the content owners:

- `widgetVis` for visualization slots, local filters, Cognos binding/render cleanup, legend/tooltip/drillthrough/focus-related cleanup;
- `widgetText` for text content/editor/settings cleanup;
- `widgetTopN` for TopN helper cleanup;
- settings modules/builders for settings DOM and settings-specific teardown.

`widgetBase` should call public owner APIs/dispatch actions for content cleanup instead of directly manipulating Cognos APIs, content slots, local filters, or content-module DOM internals.

## Rule / Contract Follow-Up

When the content modules exist, update the relevant contracts and rules so this boundary is explicit:

- `widgetBase` may not directly perform content-owner cleanup beyond temporary compatibility code;
- content modules own their content-specific Cognos and settings teardown;
- launchpad transfer cleanup is choreographed through public APIs, not through foreign state/runtime writes or direct Cognos content mutation from `widgetBase`.

Do not implement this boundary change opportunistically inside a positioning/debug tranche. Treat it as a cleanup-ownership tranche after `widgetVis`, `widgetText`, `widgetTopN` and settings ownership are available.

