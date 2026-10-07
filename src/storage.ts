import type { Word } from './csv';

export interface Stats {
  right: number;
  wrong: number;
}

const CUSTOM_SETS_KEY = 'spanish-vocab-learner:custom-sets';
const STATS_KEY = 'spanish-vocab-learner:stats';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked; the app still works for this visit.
  }
}

export function loadCustomSets(): Record<string, Word[]> {
  return load(CUSTOM_SETS_KEY, {});
}

export function saveCustomSet(name: string, words: Word[]): void {
  save(CUSTOM_SETS_KEY, { ...loadCustomSets(), [name]: words });
}

export function deleteCustomSet(name: string): void {
  const sets = loadCustomSets();
  delete sets[name];
  save(CUSTOM_SETS_KEY, sets);
}

export function loadStats(): Record<string, Stats> {
  return load(STATS_KEY, {});
}

export function recordAnswer(word: Word, correct: boolean): void {
  const stats = loadStats();
  const s = stats[word.spanish] ?? { right: 0, wrong: 0 };
  if (correct) s.right++;
  else s.wrong++;
  stats[word.spanish] = s;
  save(STATS_KEY, stats);
}

/** Higher means the word has been missed more often relative to how often it was seen. */
export function difficulty(s: Stats | undefined): number {
  if (!s) return 0.5;
  return (s.wrong + 1) / (s.right + s.wrong + 2);
}
