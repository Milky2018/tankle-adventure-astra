const elapsed = new WeakMap();

// Only presentation may use this clock; collision, combat and puzzle timers run every step.
export function animationDelta(object,dt,near) {
  const accumulated=(elapsed.get(object)??0)+dt;
  if(near||accumulated>=.1){elapsed.set(object,0);return accumulated;}
  elapsed.set(object,accumulated);return 0;
}
