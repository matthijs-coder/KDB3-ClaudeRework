# Architecture archive

Historical architecture documents (design reviews, port reports, legacy surveys, structure audits, hand-off templates), moved here in the KDB3 cleanup refactor. Historical only: do not implement against it.

- `cursor-rules-old/` holds the pre-redesign `.cursor` rules. They sit outside a `.cursor/` folder on purpose, so Cursor does not load them. The current rules are `.cursor/rules/*.mdc`.
- `cursor-rules-old/filters-special-rights.mdc` is superseded by `../../contracts/specialSingleSelect.md`.
- `cursor-rules-old/live-visualization-binding.mdc` is superseded by `../../contracts/widgetBindingPlan.md` and `widgetBindingApply.md`.
- `widgets-domain-design-communique.md` and `-v2.md` are two different versions of the same design review.
- `textWidgetSettings.md` and `visWidgetSettings.md` are single-line raw HTML dumps of the legacy settings-panel DOM (reference snapshots, not design docs).
- History is preserved (`git log --follow <file>`).
