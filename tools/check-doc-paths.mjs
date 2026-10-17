#!/usr/bin/env node
// Living docs must not cite code paths that do not exist. Checked docs: contracts/*.md and architecture/*.md (top level,
// `_archive/` and `futureTodo/` excluded), .cursor/rules/*.mdc, AGENTS.md, README.md, tools/README.md. JS comments are out of scope.
// Cited path = `[_____________KDB3API/][KDB3/js/](dashboard|core|workflows|bootstrap)/...` or `tools/...`; wildcards truncate to
// the existing directory prefix. Known historical references live in tools/doc-paths-allowlist.txt (`<doc> | <path>  # reason`);
// an entry that no longer matches a stale citation fails, so the list only shrinks.
// Usage: node tools/check-doc-paths.mjs [--json] [--suggest] [--fix]
//   --suggest  print the current location of a moved/renamed file (git rename history) next to each stale citation
//   --fix      rewrite stale citations in place where the rename history gives one existing target
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(toolsDir);
const APP_DIR = '_____________KDB3API';
const ALLOWLIST = path.join(toolsDir, 'doc-paths-allowlist.txt');

const CITATION_RE = /(?<![\w./-])((?:_____________KDB3API\/)?(?:KDB3\/js\/)?(?:dashboard|core|workflows|bootstrap)\/[\w.\-/*{},<>@[\]…]*[\w/*}])|(?<![\w./-])(tools\/[\w.\-/*]*[\w/*])/g;

export function findCitations(text) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    CITATION_RE.lastIndex = 0;
    let m;
    while ((m = CITATION_RE.exec(line))) {
      const cited = (m[1] || m[2]).replace(/[.,;:)]+$/, '');
      if (cited) out.push({ line: i + 1, path: cited });
    }
  });
  return out;
}

export function citedExists(cited, repoRoot = REPO_ROOT) {
  const wildcard = cited.search(/[*{<[…]/);
  const prefix = wildcard >= 0 ? cited.slice(0, wildcard).replace(/[^/]*$/, '') : cited;
  if (!prefix) return true;
  const roots = [repoRoot, path.join(repoRoot, APP_DIR), path.join(repoRoot, APP_DIR, 'KDB3', 'js')];
  return roots.some((r) => {
    const target = path.join(r, prefix);
    return fs.existsSync(target) || (wildcard < 0 && fs.existsSync(`${target}.js`));
  });
}

export function listLivingDocs(repoRoot = REPO_ROOT) {
  const app = path.join(repoRoot, APP_DIR);
  const docs = [];
  const addDir = (dir, ext) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      if (name.endsWith(ext) && fs.statSync(abs).isFile()) docs.push(abs);
    }
  };
  addDir(path.join(app, 'contracts'), '.md');
  addDir(path.join(app, 'architecture'), '.md');
  addDir(path.join(app, '.cursor', 'rules'), '.mdc');
  for (const f of [path.join(app, 'AGENTS.md'), path.join(app, 'README.md'), path.join(repoRoot, 'tools', 'README.md')]) {
    if (fs.existsSync(f)) docs.push(f);
  }
  return docs.map((abs) => path.relative(repoRoot, abs).split(path.sep).join('/'));
}

export function collectStale(repoRoot = REPO_ROOT) {
  const stale = [];
  for (const doc of listLivingDocs(repoRoot)) {
    const text = fs.readFileSync(path.join(repoRoot, doc), 'utf8');
    for (const c of findCitations(text)) {
      if (!citedExists(c.path, repoRoot)) stale.push({ doc, line: c.line, path: c.path });
    }
  }
  return stale;
}

export function parseAllowlist(text) {
  return text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#')).map((l) => {
    const [entry, ...rest] = l.split(/\s+#/);
    const [doc, cited] = entry.split('|').map((s) => s.trim());
    return { doc, path: cited, reason: rest.join(' ').trim() };
  });
}

export function evaluate(stale, allowlist) {
  const key = (doc, p) => `${doc}\u0000${p}`;
  const allowed = new Set(allowlist.map((a) => key(a.doc, a.path)));
  const staleKeys = new Set(stale.map((s) => key(s.doc, s.path)));
  return {
    failing: stale.filter((s) => !allowed.has(key(s.doc, s.path))),
    allowlisted: stale.filter((s) => allowed.has(key(s.doc, s.path))),
    staleAllowlist: allowlist.filter((a) => !staleKeys.has(key(a.doc, a.path)))
  };
}

// old repo-relative path -> newest repo-relative path, following rename chains in `git log -M`.
export function buildRenameMap(repoRoot = REPO_ROOT) {
  const r = spawnSync('git', ['log', '--diff-filter=R', '-M', '--name-status', '--format='], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const map = new Map();
  if (r.status !== 0) return map;
  const renames = r.stdout.split('\n').filter((l) => l.startsWith('R')).map((l) => l.split('\t')).filter((p) => p.length === 3);
  // git log lists newest first: later (older) renames resolve through the already known newer ones
  for (const [, from, to] of renames) map.set(from, map.get(to) || to);
  return map;
}

export function suggestPath(cited, renameMap, repoRoot = REPO_ROOT) {
  const candidates = [cited, `${APP_DIR}/${cited}`, `${APP_DIR}/KDB3/js/${cited}`, `${APP_DIR}/${cited.replace(/^_____________KDB3API\//, '')}`];
  for (const rel of candidates) {
    for (const withJs of [rel, `${rel}.js`]) {
      const to = renameMap.get(withJs);
      if (to && fs.existsSync(path.join(repoRoot, to))) {
        const keepApp = cited.startsWith(`${APP_DIR}/`);
        const keepJs = /^(_____________KDB3API\/)?KDB3\/js\//.test(cited);
        let out = to;
        if (!keepApp) out = out.replace(`${APP_DIR}/`, '');
        if (!keepJs) out = out.replace('KDB3/js/', '');
        if (!withJs.endsWith('.js') || rel.endsWith('.js')) return out;
        return out.replace(/\.js$/, '');
      }
    }
  }
  return null;
}

function main() {
  const argv = new Set(process.argv.slice(2));
  const stale = collectStale();
  const allowlist = fs.existsSync(ALLOWLIST) ? parseAllowlist(fs.readFileSync(ALLOWLIST, 'utf8')) : [];
  const renameMap = argv.has('--suggest') || argv.has('--fix') ? buildRenameMap() : null;

  if (argv.has('--fix')) {
    const byDoc = new Map();
    for (const s of stale) {
      const to = suggestPath(s.path, renameMap);
      if (to) (byDoc.get(s.doc) || byDoc.set(s.doc, []).get(s.doc)).push([s.path, to]);
    }
    for (const [doc, pairs] of byDoc) {
      const abs = path.join(REPO_ROOT, doc);
      let text = fs.readFileSync(abs, 'utf8');
      for (const [from, to] of pairs) text = text.split(from).join(to);
      fs.writeFileSync(abs, text);
      console.log(`fixed ${pairs.length} citation(s) in ${doc}`);
    }
    return;
  }

  const result = evaluate(stale, allowlist);
  const pass = result.failing.length === 0 && result.staleAllowlist.length === 0;
  if (argv.has('--json')) {
    console.log(JSON.stringify({ pass, stale: stale.length, ...result }, null, 2));
    process.exit(pass ? 0 : 1);
  }
  console.log(`check-doc-paths: ${listLivingDocs().length} living docs, ${stale.length} stale citation(s) (${result.allowlisted.length} allowlisted, ${result.failing.length} failing)`);
  for (const f of result.failing) {
    const hint = renameMap ? suggestPath(f.path, renameMap) : null;
    console.log(`FAIL ${f.doc}:${f.line} cites missing path ${f.path}${hint ? `  (moved to ${hint})` : ''}`);
  }
  for (const a of result.staleAllowlist) console.log(`FAIL tools/doc-paths-allowlist.txt: entry no longer needed: ${a.doc} | ${a.path}`);
  console.log(pass ? 'check-doc-paths: PASS' : 'check-doc-paths: FAIL');
  process.exit(pass ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
