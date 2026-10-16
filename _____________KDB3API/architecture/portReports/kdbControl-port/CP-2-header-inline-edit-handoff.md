# CP-2 Header Inline Edit Handoff

## Tranche
Header inline title/subtitle edit.

## CP-2 Status
Groen. Browser-tested by user.

## Oplevering
- kdbControl radio's dispatchen alleen.
- Header owns edit-state, contenteditable, focus, commit en text storage.
- Enter, blur, click-away en switch target committen de actieve edit.
- `header:confirmedChanged` emit alleen bij committed payload delta.

## Acceptance Checks
- Pass: header active + title radio maakt title editable/focused.
- Pass: nieuwe title typen + Enter update state/DOM en cleart edit.
- Pass: subtitle toggle + subtitle radio maakt subtitle editable/focused.
- Pass: lege subtitle commit verwijdert subtitle.
- Pass: blur/click-away commit werkt.
- Pass: switch title/subtitle commit vorige edit eerst.
- Pass: `header:confirmedChanged` alleen op committed text/status change.
- Pass: destroy cleans edit listeners.

## Out Of Scope
- Geen Cognos.
- Geen persistence/history.
- Geen footer wijzigingen.
- Geen production copy.

## Changed Areas
- Header state/reducer/selectors.
- Header controller/effects.
- Header DOM sync/contenteditable behavior.
- Harness header CSS.
- Harness state seed.

## Next Recommended Tranche
kdbControl remaining action mapping.
