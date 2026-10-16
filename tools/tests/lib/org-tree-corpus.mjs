// Shared corpus for the org-tree / hierarchy-cell golden tests (Phase 2 W7): cells, hierarchy row sets, and the
// selections derived from a tree. Inputs only; the recorded outputs live in tools/tests/fixtures/org-tree-*.json.

export const CELLS = [
  ["plain string", "Magistrat"],
  ["padded string", "  plain  "],
  ["empty string", ""],
  ["blank string", "   "],
  ["null", null],
  ["undefined", undefined],
  ["number 0", 0],
  ["number 42", 42],
  ["boolean false", false],
  ["bracketed string", "[Org].[level02].[Abt 7]"],
  ["empty array", []],
  ["array of text", ["a", "b"]],
  ["text only", { text: "T" }],
  ["text with padded id", { text: "T", id: " 7 " }],
  ["text with numeric id", { text: "T", id: 7 }],
  ["text with id 0", { text: "T", id: 0 }],
  ["text with empty id and use", { text: "T", id: "", use: "[a].[b]" }],
  ["id equals text", { text: "Same", id: "Same" }],
  ["label with use", { label: "L", use: "[a].[b]" }],
  ["display with useValue", { display: "D", useValue: "[x].[y].[z]" }],
  ["d with useValue single", { d: "D", useValue: "[z]" }],
  ["d with u", { d: "D", u: "[Org].[Org].[Org].&[1].&[10]" }],
  ["value only", { value: "V" }],
  ["value is a bracket token", { value: "[v]" }],
  ["value bracket after empty use", { value: "[v].[w]", use: "plain" }],
  ["id only", { id: "ID-1" }],
  ["text key precedence", { id: "i", value: "v", d: "d", display: "dis", label: "lab", text: "tex" }],
  ["text key falls through blanks", { text: "  ", label: "", display: null, d: "dd" }],
  ["all blank", { text: "  ", label: "" }],
  ["empty object", {}],
  ["use key precedence", { text: "T", use: "[u1]", useValue: "[uv]", u: "[uu]", value: "[val]" }],
  ["useValue before u", { text: "T", useValue: "[uv]", u: "[uu]" }],
  ["u before value", { text: "T", u: "[uu]", value: "[val]" }],
  ["bracket with spaces", { text: "T", use: "[ a ]" }],
  ["bracket empty token", { text: "T", use: "[ ]" }],
  ["bracket token padded unique name", { text: "T", use: "  [Org].[Org].[ Abt 7 ]  " }],
  ["bracket newline between", { text: "T", use: "[a]\n[b]" }],
  ["bracket trailing newline", { text: "T", use: "[a]\n" }],
  ["bracket inside text", { text: "T", use: "prefix [a] mid [b] suffix" }],
  ["bracket unbalanced", { text: "T", use: "[a" }],
  ["bracket nested", { text: "T", use: "[a[b]]" }],
  ["bracket members with &", { text: "T", use: "[Org].[Org].[Org].&[1].&[10]" }],
  ["ids ending in hash", { text: "Geschäftsgruppe Finanzen", id: "GGF#" }],
  ["id with hash in the middle", { text: "MA 05", id: "MA05#1" }],
  ["dezpv root", { text: "DS_KAV|ALLE" }],
  ["dash value", { text: "---" }],
  ["umlauts", { text: "Bürgermeister", id: "Bü#" }],
  ["numeric text", { text: 12 }],
  ["boolean true text", { text: true }],
  ["nested object text", { text: { x: 1 } }]
];

export const BW_ROWS = [
  { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe Finanzen", id: "GGF#" }, level02: { text: "MA 05", id: "MA05#1" } },
  { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe Finanzen", id: "GGF#" }, level02: { text: "MA 06", id: "MA06" } },
  { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe Bildung", id: "GGB#" }, level02: { text: "MA 10", id: "MA10#" } }
];

export const DEZPV_ROWS = [
  { level0: { text: "DS_KAV|ALLE" }, level1: { text: "KAV Klinik A" } },
  { level0: { text: "DS_KAV|ALLE" }, level1: { text: "KAV Klinik B" } },
  { level0: { text: "DS_WSTW" }, level1: { text: "WSTW Werk 1" } },
  { level0: { text: "DS_WSTW" }, level1: { text: "WSTW Werk 2" } }
];

const MEMBER = "[Org].[Org].[Org]";

export const ROW_SETS = [
  ["bw realistic", BW_ROWS],
  ["dezpv realistic", DEZPV_ROWS],
  ["cognos use values", [
    { c1: { display: "Bundeswehr", use: MEMBER + ".&[1]" }, c2: { d: "Heer", u: MEMBER + ".&[1].&[10]" } },
    { c1: MEMBER + ".&[1]", c2: { display: "Heer", use: MEMBER + ".&[1].&[10]" } },
    { c1: { display: "Luftwaffe", useValue: MEMBER + ".&[2]" }, c2: { display: "Dup", use: MEMBER + ".&[3]" } },
    { c1: { display: "Dup2", use: MEMBER + ".&[3]" }, c2: { display: "Heer", use: MEMBER + ".&[4]" } },
    { c1: 42, c2: null, c3: "", c4: [], c5: { display: "x" }, c6: "  " },
    null,
    "str"
  ]],
  ["widgetVis fixture", [
    { level01: { text: "Land" }, level02: { text: "Stadt", id: "S1" }, level03: "Bezirk" },
    { level01: "Land", level02: { label: "Dorf", use: "[H].[Dorf]" }, level03: "" },
    { level01: { text: "Root" }, level02: null },
    { level00: { text: "Root" }, level01: { text: "Child" } }
  ]],
  ["deep chain", [
    { level00: "A", level01: "B", level02: "C", level03: "D", level04: "E", level05: "F", level06: { text: "G", id: "G#" } },
    { level00: "A", level01: "B", level02: "C", level03: "D2", level04: "E2" },
    { level00: "A", level01: "B2" }
  ]],
  ["shallow single level", [{ level0: "Only" }, { level0: "Other" }, { level0: "Only" }]],
  ["array rows", [["Root", "Mid", { text: "Leaf", id: "L1" }], ["Root", "Mid2"], [null, "Skipped Root", "Child of skipped"]]],
  ["keys without level numbers", [{ a: "X", b: "Y", c: "Z" }, { a: "X", b: "Y2" }]],
  ["numeric keys", [{ 1: "One", 0: "Zero", 2: "Two" }, { 0: "Zero", 1: "One2" }]],
  ["level keys with padding", [{ level001: "P1", level002: "P2" }, { LEVEL3: "P3", Level04: "P4" }]],
  ["level keys out of order", [{ level02: "C2", level01: "C1", level00: "C0" }, { level10: "T10", level2: "T2" }]],
  ["rank lowering reparents", [
    { level02: "Deep", level03: "Leaf" },
    { level00: "Top", level01: "Deep" }
  ]],
  ["parent filled after orphan", [
    { level01: "Mid" },
    { level01: "Mid", level02: "Child" },
    { level00: "Top", level01: "Mid" }
  ]],
  ["cycle between texts", [{ level00: "A", level01: "B" }, { level00: "B", level01: "A" }]],
  ["same text different source ids", [
    { level00: { text: "Dup", id: "d1" }, level01: { text: "K1", id: "k#" } },
    { level00: { text: "Dup", id: "d2" }, level01: { text: "K2", id: "k#" } }
  ]],
  ["source id equals another text", [
    { level00: { text: "Alpha", id: "Beta" }, level01: "Beta" },
    { level00: "Gamma", level01: { text: "Delta", id: "Alpha" } }
  ]],
  ["blank and odd cells", [
    { level00: "Root", level01: "", level02: "   ", level03: null, level04: undefined, level05: 0, level06: false },
    { level00: { text: "" }, level01: {}, level02: "Kept" },
    42,
    "string row",
    null,
    undefined,
    true
  ]],
  ["ids ending in hash", [
    { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe X", id: "GGX#" }, level02: { text: "Stelle X1", id: "SX1#" } },
    { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe X", id: "GGX#" }, level02: { text: "Stelle X2", id: "SX2#7" } }
  ]],
  ["dezpv DS_ prefixes", [
    { level0: { text: "DS_A|ALLE", id: "DS_A|ALLE" }, level1: { text: "DS_A1", id: "DS_A1" }, level2: "DS_A1|x" },
    { level0: { text: "---" }, level1: { text: "Fallback" } }
  ]],
  ["empty rows", []],
  ["all rows invalid", [null, 1, "x"]]
];

export const NON_ARRAY_ROWS = [["null", null], ["undefined", undefined], ["object", { level0: "x" }], ["string", "rows"], ["number", 3]];

export const SICHTS = [
  ["BW", "BW"],
  ["DEZPV", "DEZPV"],
  ["padded lower dezpv", " dezpv "],
  ["lower bw", "bw"],
  ["other", "other"],
  ["empty", ""],
  ["null", null],
  ["undefined", undefined]
];

export function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value === undefined ? "__undefined__" : value, (key, item) => (item === undefined ? "__undefined__" : item)));
}

export function selectionsOf(tree) {
  const sel = (node) => {
    const member = tree.idToMember[node.id] || {};
    return { idValue: member.dataId != null ? member.dataId : member.text, displayValue: member.text, level: node.levelRank };
  };
  const nodes = Object.keys(tree.nodesById).map((key) => tree.nodesById[key]);
  const singles = nodes.map((node) => [sel(node)]);
  const pairs = [];
  for (let i = 0; i + 1 < nodes.length; i += 2) pairs.push([sel(nodes[i]), sel(nodes[i + 1])]);
  const children = nodes.filter((node) => node.children.length > 1).map((node) => node.children.map((id) => sel(tree.nodesById[id])));
  return { singles, pairs, children, all: nodes.length ? [nodes.map(sel)] : [] };
}
