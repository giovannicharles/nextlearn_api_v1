import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

/** Construit une date à midi (fuseau applicatif), N jours avant `now`. */
const daysAgo = (n: number, now = new Date('2026-08-12T10:00:00Z')) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

const NOW = new Date('2026-08-12T10:00:00Z');

describe('computeStreak', () => {
  it('renvoie 0 sans aucune session', () => {
    expect(computeStreak([], NOW)).toEqual({
      current: 0,
      doneToday: false,
      lastActiveDay: null,
    });
  });

  it('compte 1 pour une lecture aujourd’hui', () => {
    const result = computeStreak([daysAgo(0)], NOW);
    expect(result.current).toBe(1);
    expect(result.doneToday).toBe(true);
  });

  it('compte trois jours consécutifs (cas faux dans l’ancien calcul)', () => {
    const result = computeStreak([daysAgo(0), daysAgo(1), daysAgo(2)], NOW);
    expect(result.current).toBe(3);
  });

  it('ne compte qu’une fois plusieurs lectures le même jour', () => {
    const sameDay = [
      new Date('2026-08-12T08:00:00Z'),
      new Date('2026-08-12T09:30:00Z'),
      new Date('2026-08-12T10:00:00Z'),
    ];
    expect(computeStreak(sameDay, NOW).current).toBe(1);
  });

  it('conserve le streak si la dernière lecture date d’hier', () => {
    const result = computeStreak([daysAgo(1), daysAgo(2)], NOW);
    expect(result.current).toBe(2);
    expect(result.doneToday).toBe(false);
  });

  it('remet à zéro dès qu’un jour entier est manqué', () => {
    // Lectures avant-hier et il y a 3 jours : hier a été manqué.
    const result = computeStreak([daysAgo(2), daysAgo(3)], NOW);
    expect(result.current).toBe(0);
  });

  it('ignore l’historique antérieur à la rupture', () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(5), daysAgo(6), daysAgo(7)];
    expect(computeStreak(dates, NOW).current).toBe(2);
  });

  it('accepte des dates non triées', () => {
    const dates = [daysAgo(2), daysAgo(0), daysAgo(1)];
    expect(computeStreak(dates, NOW).current).toBe(3);
  });
});
