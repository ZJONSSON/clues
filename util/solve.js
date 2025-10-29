const clues = require('../clues');

/* ─────────────────────── Path proxy (typed) ─────────────────────── */
const PATH = Symbol('clues.path');

function joinPath(segs) {
  return segs.map(String).join('.');
}

function createPathProxy(segs = []) {
  const handler = {
    get(_t, prop) {
      if (prop === PATH) return joinPath(segs);
      if (prop === '$path') return joinPath(segs);
      if (prop === Symbol.toPrimitive) return () => joinPath(segs);
      if (prop === 'toString') return () => joinPath(segs);
      return createPathProxy([...segs, prop]);
    },
    apply() {
      return createPathProxy(segs);
    } // ignore accidental calls during selection
  };
  return new Proxy(() => {}, handler);
}

function pathOf(pick) {
  return pick[PATH];
}

/* ─────────────────────────── solve API ─────────────────────────── */

async function solve(obj, selector, global) {
  const root = createPathProxy([]);
  const sel = selector(root);
  if (Array.isArray(sel)) {
    const paths = sel.map(pathOf);
    return Promise.all(paths.map((path) => clues(obj, path, global)));
  }
  return clues(obj, pathOf(sel), global);
}

module.exports = {
  PATH,
  solve
}