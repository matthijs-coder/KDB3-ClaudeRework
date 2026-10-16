// Shared AMD source tooling: file walking, encoding-aware reading, a small JS
// tokenizer (skips strings/comments/regex/templates) and the define() dependency graph.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const JS_ROOT = path.join(REPO_ROOT, '_____________KDB3API', 'KDB3', 'js');
export const JS_ROOT_REPO_REL = '_____________KDB3API/KDB3/js';
export const SPEC_JSON = path.join(REPO_ROOT, '_____________KDB3API', 'KDB3', 'spec.json');
export const VENDOR_PREFIX = 'core/libraries/';
export const ENTRY_FILE = 'KDB.js';

// Directories that group several modules; module = group + next segment.
const MODULE_GROUPS = ['core/services', 'dashboard/canvas', 'dashboard/controls', 'dashboard/filters', 'dashboard/widgets'];
const SPECIAL_DEPS = new Set(['require', 'exports', 'module']);

export const toPosix = (p) => p.split(path.sep).join('/');
export const isVendored = (rel) => rel.startsWith(VENDOR_PREFIX);

export function decodeSource(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8');
  return buf.toString('utf8');
}

export function readSource(absPath) {
  return decodeSource(fs.readFileSync(absPath));
}

export function listJsFiles(root = JS_ROOT) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(abs);
      else if (ent.isFile() && ent.name.endsWith('.js')) out.push(toPosix(path.relative(root, abs)));
    }
  };
  walk(root);
  return out.sort();
}

export function moduleOf(rel) {
  const segs = rel.split('/');
  if (segs.length === 1) return rel;
  const dirs = segs.slice(0, -1);
  const two = dirs.slice(0, 2).join('/');
  if (dirs.length < 2) return dirs[0];
  if (MODULE_GROUPS.includes(two)) return dirs.length >= 3 ? dirs.slice(0, 3).join('/') : two;
  return two;
}

const REGEX_PRECEDING_KEYWORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const isIdStart = (c) => /[A-Za-z_$]/.test(c) || c > '\x7f';
const isIdPart = (c) => /[A-Za-z0-9_$]/.test(c) || c > '\x7f';
const isDigit = (c) => c >= '0' && c <= '9';

// Token: { t: 'id'|'str'|'num'|'regex'|'tpl'|'punct', v, s, e } (s/e = start/end offsets).
export function tokenize(src) {
  const tokens = [];
  const n = src.length;
  let i = 0;

  const prevAllowsRegex = () => {
    const p = tokens[tokens.length - 1];
    if (!p) return true;
    if (p.t === 'punct') return ![')', ']', '}'].includes(p.v);
    if (p.t === 'id') return REGEX_PRECEDING_KEYWORDS.has(p.v);
    return false;
  };

  const scanString = (quote) => {
    const s = i++;
    let v = '';
    while (i < n && src[i] !== quote) {
      if (src[i] === '\\') {
        v += src[i + 1] === undefined ? '' : src[i + 1];
        i += 2;
      } else if (src[i] === '\n') break;
      else v += src[i++];
    }
    i++;
    tokens.push({ t: 'str', v, s, e: i });
  };

  const scanTemplate = () => {
    const tok = { t: 'tpl', v: '', s: i, e: i };
    tokens.push(tok);
    i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') i += 2;
      else if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        scan(true);
      } else i++;
    }
    i++;
    tok.e = i;
  };

  const scanRegex = () => {
    const s = i++;
    let inClass = false;
    while (i < n && src[i] !== '\n') {
      const c = src[i];
      if (c === '\\') i += 2;
      else if (c === '[') { inClass = true; i++; }
      else if (c === ']') { inClass = false; i++; }
      else if (c === '/' && !inClass) break;
      else i++;
    }
    if (src[i] !== '/') { i = s + 1; tokens.push({ t: 'punct', v: '/', s, e: i }); return; }
    i++;
    while (i < n && isIdPart(src[i])) i++;
    tokens.push({ t: 'regex', v: src.slice(s, i), s, e: i });
  };

  function scan(stopAtBrace) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\ufeff' || c === '\u2028' || c === '\u2029' || c === '\u00a0') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? n : end + 2; continue; }
      if (c === '"' || c === "'") { scanString(c); continue; }
      if (c === '`') { scanTemplate(); continue; }
      if (isIdStart(c)) {
        const s = i++;
        while (i < n && isIdPart(src[i])) i++;
        tokens.push({ t: 'id', v: src.slice(s, i), s, e: i });
        continue;
      }
      if (isDigit(c) || (c === '.' && isDigit(src[i + 1] || ''))) {
        const s = i++;
        while (i < n && (isIdPart(src[i]) || src[i] === '.' || ((src[i] === '+' || src[i] === '-') && /[eE]/.test(src[i - 1]) && !/^0[xX]/.test(src.slice(s, i))))) i++;
        tokens.push({ t: 'num', v: src.slice(s, i), s, e: i });
        continue;
      }
      if (c === '/' && prevAllowsRegex()) { scanRegex(); continue; }
      if (stopAtBrace) {
        if (c === '{') depth++;
        else if (c === '}') {
          if (depth === 0) { i++; return; }
          depth--;
        }
      }
      tokens.push({ t: 'punct', v: c, s: i, e: i + 1 });
      i++;
    }
  }

  scan(false);
  return tokens;
}

export function makeLineIndex(src) {
  const starts = [0];
  for (let k = 0; k < src.length; k++) if (src[k] === '\n') starts.push(k + 1);
  return (pos) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, col: pos - starts[lo] + 1 };
  };
}

// Finds the first top-level `define(...)` call and extracts its dependency array.
// Returns { found, deps:[{spec,line}], nonLiteral, arrayRange } (arrayRange = [startTokenIdx, endTokenIdx]).
export function extractDefine(tokens, lineAt) {
  for (let k = 0; k < tokens.length - 1; k++) {
    const tk = tokens[k];
    if (tk.t !== 'id' || tk.v !== 'define' || tokens[k + 1].v !== '(') continue;
    if (k > 0 && tokens[k - 1].v === '.') continue;
    let j = k + 2;
    if (tokens[j] && tokens[j].t === 'str' && tokens[j + 1] && tokens[j + 1].v === ',') j += 2;
    if (!tokens[j] || tokens[j].v !== '[') return { found: true, deps: [], nonLiteral: false, hasArray: false, arrayRange: null };
    const startIdx = j;
    const deps = [];
    let nonLiteral = false;
    j++;
    while (j < tokens.length && tokens[j].v !== ']') {
      const t = tokens[j];
      if (t.t === 'str') {
        deps.push({ spec: t.v, line: lineAt(t.s).line });
        j++;
      } else { nonLiteral = true; j++; }
      if (tokens[j] && tokens[j].v === ',') j++;
      else if (tokens[j] && tokens[j].v !== ']') { nonLiteral = true; while (j < tokens.length && tokens[j].v !== ',' && tokens[j].v !== ']') j++; if (tokens[j] && tokens[j].v === ',') j++; }
    }
    return { found: true, deps, nonLiteral, hasArray: true, arrayRange: [startIdx, j] };
  }
  return { found: false, deps: [], nonLiteral: false, hasArray: false, arrayRange: null };
}

function classifyDep(spec) {
  if (spec.startsWith('./') || spec.startsWith('../')) return 'path';
  if (SPECIAL_DEPS.has(spec)) return 'special';
  if (spec.includes('!')) return 'plugin';
  return 'bare';
}

function readSpecRoots(files) {
  const roots = [];
  const missing = [];
  if (!fs.existsSync(SPEC_JSON)) return { roots, missing };
  const spec = JSON.parse(fs.readFileSync(SPEC_JSON, 'utf8'));
  const strings = [];
  (function collect(v) {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  })(spec);
  for (const s of strings) {
    const m = /(?:^|\/)ext\/KDB3\/js\/(.+)$/.exec(s);
    if (!m) continue;
    const rel = m[1].endsWith('.js') ? m[1] : `${m[1]}.js`;
    if (files.has(rel)) roots.push(rel); else missing.push({ spec: s, resolved: rel });
  }
  return { roots, missing };
}

// Builds the file graph. Edges: static (define dep array) and dynamic (relative .js string
// literals in files that depend on 'require', i.e. runtime require([...]) calls).
export function buildGraph() {
  const fileList = listJsFiles();
  const fileSet = new Set(fileList);
  const nodes = new Map();
  const edges = [];
  const broken = [];
  const nonPathDeps = [];
  const noDefine = [];
  const nonLiteralArrays = [];

  for (const rel of fileList) {
    const node = { rel, vendored: isVendored(rel), deps: [], hasDefine: false };
    nodes.set(rel, node);
    if (node.vendored) continue;
    const src = readSource(path.join(JS_ROOT, rel));
    const tokens = tokenize(src);
    const lineAt = makeLineIndex(src);
    const def = extractDefine(tokens, lineAt);
    node.hasDefine = def.found;
    if (!def.found) { noDefine.push(rel); continue; }
    if (def.nonLiteral) nonLiteralArrays.push(rel);
    const dir = path.posix.dirname(rel);
    const addEdge = (spec, line, dynamic) => {
      const resolved = path.posix.normalize(path.posix.join(dir, spec));
      const target = resolved.endsWith('.js') ? resolved : `${resolved}.js`;
      if (target.startsWith('../') || !fileSet.has(target)) {
        broken.push({ from: rel, spec, line, resolved: target });
        return;
      }
      edges.push({ from: rel, to: target, line, dynamic });
      node.deps.push(target);
    };
    let usesRequire = false;
    for (const d of def.deps) {
      const kind = classifyDep(d.spec);
      if (kind === 'path') addEdge(d.spec, d.line, false);
      else {
        if (d.spec === 'require') usesRequire = true;
        nonPathDeps.push({ from: rel, spec: d.spec, kind, line: d.line });
      }
    }
    if (usesRequire) {
      const [a, b] = def.arrayRange;
      tokens.forEach((t, idx) => {
        if (t.t !== 'str' || (idx >= a && idx <= b)) return;
        if (/^\.{1,2}\/.+\.js$/.test(t.v)) addEdge(t.v, lineAt(t.s).line, true);
      });
    }
  }

  const { roots: specRoots, missing: missingSpecRoots } = readSpecRoots(fileSet);
  const roots = [...new Set([ENTRY_FILE, ...specRoots])].filter((r) => fileSet.has(r));
  const reachable = new Set();
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop();
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    for (const t of nodes.get(cur).deps) stack.push(t);
  }

  return { files: fileList, nodes, edges, broken, nonPathDeps, noDefine, nonLiteralArrays, roots, specRoots, missingSpecRoots, reachable };
}

// Tarjan SCC over the static+dynamic file graph. Returns [{ size, members, path }] for components
// with size > 1 or self-loops; `path` is one concrete cycle (first member ... first member).
function concreteCycle(graph, members) {
  const inScc = new Set(members);
  const start = members[0];
  const parent = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const w of graph.nodes.get(cur).deps) {
      if (!inScc.has(w)) continue;
      if (w === start) {
        const chain = [start];
        for (let at = cur; at !== null && at !== start; at = parent.get(at)) chain.splice(1, 0, at);
        return [...chain, start];
      }
      if (!parent.has(w)) { parent.set(w, cur); queue.push(w); }
    }
  }
  return [...members, members[0]];
}

export function findCycles(graph) {
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];
  const strong = (v) => {
    idx.set(v, index); low.set(v, index); index++;
    stack.push(v); onStack.add(v);
    for (const w of graph.nodes.get(v).deps) {
      if (!idx.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const comp = [];
      let w;
      do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1 || graph.nodes.get(v).deps.includes(v)) {
        const members = comp.sort();
        cycles.push({ size: members.length, members, path: concreteCycle(graph, members) });
      }
    }
  };
  for (const v of graph.files) if (!idx.has(v)) strong(v);
  return cycles;
}
