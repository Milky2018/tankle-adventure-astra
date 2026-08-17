import type { Progress } from './types';

const SAVE_KEY = 'rejected-prototype-save-v1';

export const NEW_PROGRESS: Progress = {
  checkpoint: 'a',
  overdrive: false,
  westRelay: false,
  eastRelay: false,
  eliteDefeated: false,
  bossDefeated: false,
  completed: false,
  discovered: ['a'],
};

export function loadProgress(): Progress | null {
  try {
    const value = localStorage.getItem(SAVE_KEY);
    if (!value) return null;
    return { ...structuredClone(NEW_PROGRESS), ...JSON.parse(value) as Partial<Progress> };
  } catch {
    return null;
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
}

export function clearProgress(): void {
  localStorage.removeItem(SAVE_KEY);
}
