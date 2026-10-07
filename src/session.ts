import type { Word } from './csv';

export type Direction = 'es-en' | 'en-es' | 'mixed';

export interface Card {
  word: Word;
  /** True when the Spanish side is shown first. */
  spanishFront: boolean;
}

/** How many cards ahead a missed card is reinserted. */
export const REQUEUE_GAP = 3;

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A study run: cards marked "again" come back later until every card is answered correctly. */
export class Session {
  private queue: Card[];
  readonly total: number;
  private knownCount = 0;
  readonly missed = new Set<Word>();

  constructor(words: Word[], direction: Direction, random: () => number = Math.random) {
    this.queue = words.map((word) => ({
      word,
      spanishFront: direction === 'mixed' ? random() < 0.5 : direction === 'es-en',
    }));
    this.total = words.length;
  }

  get current(): Card | undefined {
    return this.queue[0];
  }

  get known(): number {
    return this.knownCount;
  }

  get done(): boolean {
    return this.queue.length === 0;
  }

  markKnown(): void {
    if (this.queue.shift()) this.knownCount++;
  }

  markAgain(): void {
    const card = this.queue.shift();
    if (!card) return;
    this.missed.add(card.word);
    this.queue.splice(Math.min(REQUEUE_GAP, this.queue.length), 0, card);
  }
}
