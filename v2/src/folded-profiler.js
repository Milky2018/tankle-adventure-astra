// Loaded only by development test mode. Normal and production play install no wrappers.
export function createFrameProfiler(renderer) {
  const stats = {},
    gpu = [],
    pending = [];
  const gl = renderer.getContext();
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  let collecting = false,
    gpuFrame = 0,
    measureGPU = false;
  function wrap(name, fn) {
    return function (...args) {
      if (!collecting) return fn.apply(this, args);
      const start = performance.now();
      try {
        return fn.apply(this, args);
      } finally {
        const duration = performance.now() - start;
        const sample = (stats[name] ||= { total: 0, count: 0, max: 0 });
        sample.total += duration;
        sample.count++;
        sample.max = Math.max(sample.max, duration);
      }
    };
  }
  function clearQueries() {
    for (const query of pending) gl.deleteQuery(query);
    pending.length = 0;
  }
  const render = renderer.render;
  renderer.render = wrap('render', function (...args) {
    if (!collecting || !measureGPU || !timer) return render.apply(this, args);
    const disjoint = timer && gl.getParameter(timer.GPU_DISJOINT_EXT);
    if (disjoint) clearQueries();
    for (let i = pending.length - 1; i >= 0; i--) {
      const query = pending[i];
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) continue;
      if (collecting) gpu.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(query);
      pending.splice(i, 1);
    }
    let query;
    if (collecting && measureGPU && timer && !disjoint && gpuFrame++ % 10 === 0) {
      query = gl.createQuery();
      gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
    }
    try {
      return render.apply(this, args);
    } finally {
      if (query) {
        gl.endQuery(timer.TIME_ELAPSED_EXT);
        pending.push(query);
      }
    }
  });
  return {
    stats,
    gpu,
    wrap,
    start({ gpu: enabled = true } = {}) {
      clearQueries();
      for (const key of Object.keys(stats)) delete stats[key];
      gpu.length = 0;
      gpuFrame = 0;
      measureGPU = enabled;
      collecting = true;
    },
    stop() {
      collecting = false;
      clearQueries();
    },
  };
}
