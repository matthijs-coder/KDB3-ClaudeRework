# Future TODO: oude parameterset bij edit wissen of overschrijven

**Aangelegd:** 2026-10-06. Nog niet onderzoeken tot daar expliciet opdracht voor is. Geen code in deze notitie.

## Aanleiding

Een edit schrijft een nieuw document. De Set-load kan daarna meerdere complete blobs met dezelfde naam terugkrijgen. Sinds 2026-10-06 kiest `selectNewestSetDatab` in `WritebackFunction2/js/getDataFromTable.js` de groep met het laatste ruwe `TIMESTAMP` (`u` op de Set-lijst). Oudere groepen blijven in de database staan. De read-regel negeert ze alleen wanneer één groep een strikt nieuwere, parseerbare tijd heeft.

## Open vraag

Kan een edit de vorige parameterset met dezelfde naam veilig wissen of overschrijven, zodat de Set-lijst nog maar één document teruggeeft?

## Wat al vaststaat, en wat niet

- Create post `p_action` 0. Update post `p_action` 1 met `p_oldhash` (`parameterSetActions.js`). `p_hid` is `sha1(payload + Date.now())` tenzij een niet-lege `JSON_KEY` als override meegaat (`writebackTransport.js`).
- De databasefunctie `DXRIP_ADMIN.DX_PARAMSMAP.SAVE_FORM_CLOB_BASE_FUNCTION` zit niet in deze repo. `readme.txt` zegt niet of actie 1 het vorige document vervangt, verwijdert of laat staan.
- De client kan oude rijen niet zelf verwijderen. Een `p_hid` die gelijk is aan `p_oldhash` stuurt geen derde sleutel en wist niets.
- Voor de set `urlid - test 1` was de Get-`JSON_KEY` leeg. De optiewaarde was de base64-`NAME`. Of de Set-rijen wel een gevulde `JSON_KEY` hebben, is een feit van de live lijst, niet van deze notitie.

## Grenzen van een later onderzoek

- Eerst vaststellen wat actie 1 in de database doet. Niet gokken dat een nieuwe `p_hid` de oude rijen vervangt.
- Wissen alleen als de match de oude documenten van díe naam is, en het nieuwe document al succesvol is opgeslagen.
- De share-link gebruikt de optiewaarde. Die waarde en de KDB-dialoogtekst blijven buiten dit onderzoek.
- De read-regel van 2026-10-06 blijft de fallback zolang oude rijen kunnen blijven bestaan.
