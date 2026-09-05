import type * as THREE from 'three';

export type Action =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'overdrive'
  | 'map'
  | 'interact';

export type BindingMap = Record<Action, string>;

export type Collider = Readonly<{
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  enabled?: () => boolean;
}>;

export type Conveyor = Readonly<{
  bounds: Collider;
  velocity: THREE.Vector3;
  mesh: THREE.Group;
}>;

export type ZoneId = 'a' | 'b' | 'c' | 'branch-west' | 'branch-east' | 'elite' | 'boss' | 'exit';

export type Progress = {
  checkpoint: 'a' | 'c' | 'exit';
  overdrive: boolean;
  westRelay: boolean;
  eastRelay: boolean;
  eliteDefeated: boolean;
  bossDefeated: boolean;
  completed: boolean;
  discovered: ZoneId[];
};

export type EnemyKind = 'scout' | 'turret' | 'guard' | 'elite' | 'boss';
