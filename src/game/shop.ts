/**
 * Münzen und Shop. Zuständig: game-balance.
 * Münzen gibt es für Tagesaktivität, Level-ups und Ziele; man kauft damit Outfits. Reine Funktionen.
 * Regeln aus CLAUDE.md: Ruhetage und schlechte Tage werden nie bestraft (jeder verbuchte Tag gibt Münzen,
 * aktive etwas mehr); Münzen lassen sich nicht verlieren und nicht für Gesundheitsdaten „kaufen“.
 * Die Gegenstände sind Körper-Ebenen aus assets/avatar (BodyId ≥ 5). Neue Kleidung kommt hier als weiterer Eintrag dazu.
 */
import type { BodyId, Progress } from '../types.ts';

export const COIN_NAME = 'Münzen';

/** Verdienstregeln an einer Stelle */
export const COINS = {
  /** Jeder verbuchte Tag, auch Ruhetage */
  restDay: 5,
  /** Verbuchter aktiver Tag (6.000 Schritte oder Belastung ab 8) */
  activeDay: 10,
  /** Je erreichtem Level */
  level: 20,
  /** Zusätzlich bei einer neuen Verwandlungsstufe */
  stage: 100,
  /** Je erreichtem Tagesziel und zusätzlich, wenn alle gesetzten Ziele erreicht sind */
  goal: 5,
  allGoals: 5,
  /** Langzeitziel: Anteil der XP-Belohnung als Münzen */
  longGoalPerXp: 0.5,
} as const;

export interface ShopItem {
  /** gleichzeitig die BodyId des Outfits */
  id: BodyId;
  name: string;
  /** 0 = von Anfang an freigeschaltet */
  price: number;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 5, name: 'T-Shirt', price: 0 },
  { id: 9, name: 'Oberkörperfrei', price: 80 },
  { id: 6, name: 'Hoodie', price: 150 },
  { id: 8, name: 'Trikot', price: 200 },
  { id: 7, name: 'Trainingsanzug', price: 250 },
];

export function shopItem(id: number): ShopItem | undefined {
  return SHOP_ITEMS.find(i => i.id === id);
}

export const coinsOf = (p: Progress): number => Math.max(0, Math.floor(p.coins ?? 0));

/** Gehört dem Spieler (Körpertypen 0–4 sind frei, Outfits ab Preis 0 oder gekauft) */
export function isOwned(p: Progress, id: number): boolean {
  const item = shopItem(id);
  if (!item) return true;
  return item.price === 0 || (p.owned ?? []).includes(id as BodyId);
}

export const dayCoins = (active: boolean): number => (active ? COINS.activeDay : COINS.restDay);

export function levelCoins(levelsGained: number, stageBefore: number, stageAfter: number): number {
  if (levelsGained <= 0) return 0;
  return levelsGained * COINS.level + (stageAfter > stageBefore ? (stageAfter - stageBefore) * COINS.stage : 0);
}

export function goalCoins(hitCount: number, allHit: boolean): number {
  return hitCount * COINS.goal + (allHit ? COINS.allGoals : 0);
}

export const longGoalCoins = (xp: number): number => Math.round(Math.max(0, xp) * COINS.longGoalPerXp);

export function awardCoins(p: Progress, n: number): Progress {
  const gain = Math.max(0, Math.round(n));
  return gain === 0 ? p : { ...p, coins: coinsOf(p) + gain };
}

export type BuyResult = { ok: true; progress: Progress } | { ok: false; reason: 'unknown' | 'owned' | 'poor' };

export function buyItem(p: Progress, id: number): BuyResult {
  const item = shopItem(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (isOwned(p, id)) return { ok: false, reason: 'owned' };
  if (coinsOf(p) < item.price) return { ok: false, reason: 'poor' };
  return { ok: true, progress: { ...p, coins: coinsOf(p) - item.price, owned: [...(p.owned ?? []), item.id] } };
}
