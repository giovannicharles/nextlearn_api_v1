/**
 * Calcul du streak — jours consécutifs avec au moins une lecture de document.
 *
 * L'action qualifiante est la lecture effective d'un document, matérialisée
 * par une StudySession. Le streak s'incrémente une fois par jour calendaire et
 * repart à zéro dès qu'un jour est manqué.
 *
 * Le jour en cours ne casse jamais le streak : tant que la dernière lecture
 * date d'hier, le compteur reste affiché — c'est seulement une journée
 * entièrement manquée qui le remet à zéro.
 *
 * Toutes les dates sont ramenées à un fuseau fixe (le Cameroun, UTC+1, sans
 * heure d'été) et non au fuseau du serveur : sur un hébergement en UTC, la
 * frontière de journée aurait été décalée d'une heure, et une lecture tardive
 * aurait compté pour le lendemain.
 */

/** Décalage du fuseau applicatif, en heures. */
export const APP_TIMEZONE_OFFSET_HOURS = Number(process.env.APP_TIMEZONE_OFFSET ?? 1);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Clé de journée `YYYY-MM-DD` dans le fuseau applicatif. */
export function dayKey(date: Date): string {
  const shifted = new Date(date.getTime() + APP_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Numéro de journée absolu, pour comparer deux jours sans souci de mois. */
function dayNumber(date: Date): number {
  return Math.floor(
    (date.getTime() + APP_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000) / DAY_MS
  );
}

export interface StreakResult {
  /** Jours consécutifs, 0 si le streak est rompu. */
  current: number;
  /** true si l'action qualifiante a déjà été faite aujourd'hui. */
  doneToday: boolean;
  /** Dernier jour d'activité (`YYYY-MM-DD`), null si aucun. */
  lastActiveDay: string | null;
}

/**
 * @param dates dates des sessions qualifiantes, dans n'importe quel ordre
 * @param now   instant de référence (heure serveur)
 */
export function computeStreak(dates: Date[], now: Date = new Date()): StreakResult {
  if (dates.length === 0) {
    return { current: 0, doneToday: false, lastActiveDay: null };
  }

  // Jours distincts, du plus récent au plus ancien.
  const days = [...new Set(dates.map(dayNumber))].sort((a, b) => b - a);

  const today = dayNumber(now);
  const mostRecent = days[0];

  const doneToday = mostRecent === today;

  // Plus d'une journée complète sans lecture : le streak est rompu.
  if (today - mostRecent > 1) {
    return {
      current: 0,
      doneToday: false,
      lastActiveDay: dayKeyFromNumber(mostRecent),
    };
  }

  let current = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] - days[i] === 1) {
      current++;
    } else {
      break;
    }
  }

  return { current, doneToday, lastActiveDay: dayKeyFromNumber(mostRecent) };
}

function dayKeyFromNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}
