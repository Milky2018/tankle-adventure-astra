import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameProfiler } from './folded-profiler.js';

function fixture(supported = true) {
  let disjoint = false,
    next = 0;
  const live = new Set(),
    ready = new Set(),
    deleted = [];
  const gl = {
    QUERY_RESULT_AVAILABLE: 'ready',
    QUERY_RESULT: 'result',
    getExtension: () =>
      supported ? { GPU_DISJOINT_EXT: 'disjoint', TIME_ELAPSED_EXT: 'elapsed' } : null,
    getParameter: () => disjoint,
    createQuery: () => {
      const q = ++next;
      live.add(q);
      return q;
    },
    beginQuery() {},
    endQuery() {},
    getQueryParameter: (q, property) => (property === 'ready' ? ready.has(q) : 2000000),
    deleteQuery: (q) => {
      live.delete(q);
      deleted.push(q);
    },
  };
  const renderer = {
    getContext: () => gl,
    render() {
      assert.equal(this, renderer);
      return 42;
    },
  };
  const profile = createFrameProfiler(renderer);
  return {
    profile,
    renderer,
    live,
    ready,
    deleted,
    disjoint: () => {
      disjoint = true;
    },
  };
}

test('profiling preserves return values, receivers and exceptions', () => {
  const { profile, renderer, live } = fixture();
  assert.equal(renderer.render(), 42);
  assert.deepEqual(profile.stats, {});
  profile.start({ gpu: false });
  assert.equal(renderer.render(), 42);
  const expected = new Error('sentinel');
  const owner = {
    run: profile.wrap('failure', function () {
      assert.equal(this, owner);
      throw expected;
    }),
  };
  assert.throws(
    () => owner.run(),
    (error) => error === expected,
  );
  assert.equal(profile.stats.failure.count, 1);
  assert.equal(profile.stats.render.count, 1);
  assert.equal(live.size, 0);
  profile.stop();
  renderer.render();
  assert.equal(profile.stats.render.count, 1);
});

test('GPU samples are collected only when ready and queries are released', () => {
  const { profile, renderer, live, ready } = fixture();
  profile.start();
  renderer.render();
  assert.equal(live.size, 1);
  ready.add([...live][0]);
  renderer.render();
  assert.deepEqual(profile.gpu, [2]);
  assert.equal(live.size, 0);
  for (let i = 0; i < 9; i++) renderer.render();
  assert.equal(live.size, 1);
  profile.stop();
  assert.equal(live.size, 0);
});

test('restarting and disjoint timing discard stale GPU samples', () => {
  const { profile, renderer, live, ready, deleted, disjoint } = fixture();
  profile.start();
  renderer.render();
  const first = [...live][0];
  profile.start();
  assert.ok(deleted.includes(first));
  ready.add(first);
  renderer.render();
  assert.deepEqual(profile.gpu, []);
  for (const q of live) ready.add(q);
  disjoint();
  renderer.render();
  assert.equal(live.size, 0);
  assert.deepEqual(profile.gpu, []);
});

test('CPU statistics remain available without the GPU timer extension', () => {
  const { profile, renderer, live } = fixture(false);
  profile.start();
  renderer.render();
  assert.equal(profile.stats.render.count, 1);
  assert.equal(live.size, 0);
  assert.deepEqual(profile.gpu, []);
});
