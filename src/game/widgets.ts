/**
 * Widgets der Startseite: Plätze rund um den Avatar, frei belegbar. Zuständig: app-ui. Reine Funktionen.
 * Das Layout bleibt lokal auf dem Gerät. Widgets zeigen eigene Werte nur dem Nutzer selbst (nie in der teilbaren Karte).
 */
export const SLOTS = ['l1', 'l2', 'l3', 'r1', 'r2', 'r3'] as const;
export type SlotId = (typeof SLOTS)[number];

export const WIDGET_IDS = ['energy', 'strain', 'sleep', 'xp', 'steps', 'workout', 'goals', 'longgoal', 'streak', 'calories', 'coins', 'stage'] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export const WIDGET_LABEL: Record<WidgetId, string> = {
  energy: 'Energie', strain: 'Belastung', sleep: 'Schlaf', xp: 'Level & XP', steps: 'Schritte', workout: 'Training',
  goals: 'Tagesziele', longgoal: 'Langzeitziel', streak: 'Serie', calories: 'Kalorien', coins: 'Münzen', stage: 'Verwandlung',
};

/** Belegung: Widget-ID, oder null = bewusst leer */
export type WidgetLayout = Partial<Record<SlotId, WidgetId | null>>;

export const DEFAULT_LAYOUT: Record<SlotId, WidgetId | null> = {
  l1: 'energy', l2: 'sleep', l3: 'steps', r1: 'xp', r2: 'goals', r3: 'streak',
};

const isWidget = (v: unknown): v is WidgetId => typeof v === 'string' && (WIDGET_IDS as readonly string[]).includes(v);

/** Gespeichertes (oder fremdes) Layout bereinigen: nur bekannte Plätze und Widgets, jedes Widget höchstens einmal. Fehlt das Feld ganz, gilt die Standardbelegung. */
export function resolveLayout(raw: unknown): Record<SlotId, WidgetId | null> {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LAYOUT };
  const src = raw as Record<string, unknown>;
  const out = {} as Record<SlotId, WidgetId | null>;
  const used = new Set<WidgetId>();
  for (const s of SLOTS) {
    const v = src[s];
    if (v === null) { out[s] = null; continue; }
    if (isWidget(v) && !used.has(v)) { out[s] = v; used.add(v); continue; }
    out[s] = null;
  }
  return out;
}

/** Widget auf einen Platz setzen (oder mit null leeren). Steht es schon woanders, zieht es um. */
export function placeWidget(layout: Record<SlotId, WidgetId | null>, slot: SlotId, id: WidgetId | null): Record<SlotId, WidgetId | null> {
  const next = { ...layout };
  if (id) for (const s of SLOTS) if (next[s] === id) next[s] = null;
  next[slot] = id;
  return next;
}

/** Widgets, die gerade keinen Platz haben */
export const unplaced = (layout: Record<SlotId, WidgetId | null>): WidgetId[] =>
  WIDGET_IDS.filter(w => !SLOTS.some(s => layout[s] === w));
