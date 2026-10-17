#!/usr/bin/env node
// Inventory of German/Dutch words inside JS identifiers (strings and comments are not scanned).
// TECHNICAL words are leftovers that naming.mdc forbids (must stay at zero); DOMAIN words are product nouns,
// Cognos/BW data names or persisted/URL keys and are only reported.
// Usage: node tools/german-identifiers.mjs [--json] [--domain]   Exit 1 when a TECHNICAL word is found.
import path from 'node:path';
import { JS_ROOT, JS_ROOT_REPO_REL, listJsFiles, readSource, tokenize, isVendored } from './lib/amd-graph.mjs';

export const TECHNICAL_WORDS = [
  'wert', 'werte', 'auswahl', 'speichern', 'laden', 'schliessen', 'oeffnen', 'zurueck', 'weiter', 'anzeigen', 'verbergen',
  'loeschen', 'hinzufuegen', 'entfernen', 'aendern', 'leer', 'pruefen', 'setzen', 'holen', 'suchen', 'liste', 'tabelle',
  'zeile', 'spalte', 'knopf', 'eingabe', 'ausgabe', 'ergebnis', 'bereich', 'stufe', 'ebene', 'einstellung', 'ansicht',
  'breite', 'hoehe', 'farbe', 'schrift', 'titel', 'datei', 'benutzer', 'zeit', 'wiederherstellen', 'rueckgaengig', 'zustand',
  'vorschau', 'bericht', 'verarbeiten', 'selectie', 'bevestig', 'bevestigd', 'bevestigen', 'waarde', 'ophalen', 'lijst', 'knop',
  'zoeken', 'kleur', 'breedte', 'hoogte', 'opslaan', 'verwijder', 'toevoegen', 'fout', 'resultaat', 'tabel', 'rij', 'kolom'
];
export const DOMAIN_WORDS = [
  'alle', 'aufriss', 'aufspannen', 'aktmon', 'datenart', 'kz', 'gruppe', 'dstl', 'dezpv', 'gdb', 'gfo', 'langtext', 'freigabe',
  'kennzahl', 'kennzahlen', 'aktualisierungs', 'datum', 'monat', 'jahr', 'stichtag', 'sicht', 'dienststelle', 'prognose',
  'beendet', 'mag', 'erfolg', 'fehler', 'interaktiv', 'linkbesucht', 'zentriert', 'reinigen', 'berechtigung'
];

export function splitWords(identifier) {
  return identifier.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[_\s$]+/).filter(Boolean).map((p) => p.toLowerCase());
}

export function scanIdentifiers(wordList) {
  const set = new Set(wordList);
  const hits = new Map();
  for (const rel of listJsFiles()) {
    if (isVendored(rel)) continue;
    for (const t of tokenize(readSource(path.join(JS_ROOT, rel)))) {
      if (t.t !== 'id') continue;
      const words = splitWords(t.v).filter((w) => set.has(w));
      if (!words.length) continue;
      const entry = hits.get(t.v) || { identifier: t.v, words, files: new Set(), count: 0 };
      entry.files.add(`${JS_ROOT_REPO_REL}/${rel}`);
      entry.count += 1;
      hits.set(t.v, entry);
    }
  }
  return [...hits.values()].map((h) => ({ ...h, files: [...h.files] })).sort((a, b) => a.identifier.localeCompare(b.identifier));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const argv = process.argv.slice(2);
  const technical = scanIdentifiers(TECHNICAL_WORDS);
  const domain = argv.includes('--domain') || argv.includes('--json') ? scanIdentifiers(DOMAIN_WORDS) : [];
  if (argv.includes('--json')) console.log(JSON.stringify({ technical, domain }, null, 2));
  else {
    console.log(`german-identifiers: ${technical.length} technical leftover identifier(s)`);
    for (const h of technical) console.log(`  ${h.identifier} x${h.count} (${h.words.join(',')}) ${h.files.slice(0, 3).join(' ')}`);
    if (domain.length) {
      console.log(`domain identifiers (kept): ${domain.length}`);
      for (const h of domain) console.log(`  ${h.identifier} x${h.count} (${h.files.length} file(s))`);
    }
  }
  process.exit(technical.length ? 1 : 0);
}
