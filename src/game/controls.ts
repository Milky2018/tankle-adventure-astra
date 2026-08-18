export type GroundPoint = Readonly<{ x: number; z: number }>;

const FORWARD = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 } as const;
const RIGHT = { x: Math.SQRT1_2, z: -Math.SQRT1_2 } as const;

export function movementDirection(horizontal: number, vertical: number): GroundPoint {
  const x = RIGHT.x * horizontal + FORWARD.x * vertical;
  const z = RIGHT.z * horizontal + FORWARD.z * vertical;
  const length = Math.hypot(x, z);
  if (length === 0) return { x: 0, z: 0 };
  if (length <= 1 + Number.EPSILON) return { x, z };
  return { x: x / length, z: z / length };
}

export function aimHeading(origin: GroundPoint, target: GroundPoint): number {
  return Math.atan2(-(target.x - origin.x), -(target.z - origin.z));
}
