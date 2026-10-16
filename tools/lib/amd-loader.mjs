// Loads AMD `define([...], factory)` modules from KDB3/js in plain Node (for golden tests of pure modules).
// Modules run in the main realm (so assert.deepStrictEqual works); stubbed globals are shadowed as
// function parameters of the module wrapper, so they never leak into globalThis.
import path from 'node:path';
import vm from 'node:vm';
import { JS_ROOT, readSource } from './amd-graph.mjs';

const SPECIAL = new Set(['require', 'exports', 'module']);

export function loadAmd(absPath, { stubs = {}, modules = {}, overrides = {} } = {}) {
  const overrideByPath = new Map(Object.entries(overrides).map(([rel, value]) => [path.resolve(JS_ROOT, rel), value]));
  const cache = new Map();
  const loading = new Set();
  const globalNames = Object.keys(stubs);

  function evaluate(abs) {
    if (overrideByPath.has(abs)) return overrideByPath.get(abs);
    if (cache.has(abs)) return cache.get(abs).exports;
    if (loading.has(abs)) throw new Error(`loadAmd: circular dependency at ${abs}`);
    loading.add(abs);
    const record = { exports: {} };
    const dir = path.dirname(abs);
    let captured = null;

    const define = (...args) => {
      const factory = args[args.length - 1];
      const deps = Array.isArray(args[args.length - 2]) ? args[args.length - 2] : Array.isArray(args[0]) ? args[0] : null;
      captured = { factory, deps: deps || (typeof factory === 'function' ? ['require', 'exports', 'module'].slice(0, factory.length) : []) };
    };
    define.amd = {};
    const localRequire = (deps, cb) => {
      if (typeof deps === 'string') return resolveDep(deps);
      const loaded = deps.map(resolveDep);
      if (cb) cb(...loaded);
      return undefined;
    };

    function resolveDep(spec) {
      if (spec === 'require') return localRequire;
      if (spec === 'exports') return record.exports;
      if (spec === 'module') return record;
      if (Object.prototype.hasOwnProperty.call(modules, spec)) return modules[spec];
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const target = path.resolve(dir, spec.endsWith('.js') ? spec : `${spec}.js`);
        return evaluate(target);
      }
      throw new Error(`loadAmd: no stub for non-relative dependency "${spec}" required by ${abs}; pass it via {modules: {"${spec}": ...}}`);
    }

    const wrapper = vm.compileFunction(readSource(abs), ['define', ...globalNames], { filename: abs });
    wrapper(define, ...globalNames.map((k) => stubs[k]));
    if (!captured) throw new Error(`loadAmd: ${abs} did not call define()`);

    const { factory, deps } = captured;
    let value;
    if (typeof factory === 'function') {
      value = factory(...deps.map(resolveDep));
      if (value === undefined) value = record.exports;
    } else value = factory;
    loading.delete(abs);
    cache.set(abs, { exports: value });
    return value;
  }

  return evaluate(path.resolve(absPath));
}
