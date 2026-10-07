import { describe, expect, it } from 'vitest';
import { REQUEUE_GAP, Session } from './session';

const words = ['a', 'b', 'c', 'd', 'e'].map((s) => ({ spanish: s, english: s, notes: '' }));

describe('Session', () => {
  it('finishes after every card is marked known', () => {
    const s = new Session(words, 'es-en');
    while (!s.done) s.markKnown();
    expect(s.known).toBe(words.length);
    expect(s.missed.size).toBe(0);
  });

  it('requeues a missed card a few positions later', () => {
    const s = new Session(words, 'es-en');
    s.markAgain();
    expect(s.missed.has(words[0])).toBe(true);
    for (let i = 0; i < REQUEUE_GAP; i++) s.markKnown();
    expect(s.current?.word).toBe(words[0]);
  });

  it('keeps showing the last card until it is known', () => {
    const s = new Session([words[0]], 'en-es');
    s.markAgain();
    expect(s.current?.spanishFront).toBe(false);
    s.markKnown();
    expect(s.done).toBe(true);
  });
});
