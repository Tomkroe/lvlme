/** Farben je Verwandlungsstufe (0–5). Zentrale Tabelle – nicht hart im Code verteilen. Zuständig: avatar-art. */
export interface StageColors {
  name: string;
  aura: string | null;
  gi: string;
  giShade: string;
  belt: string;
  /** [dunkel, hell] */
  hair: [string, string];
  /** [dunkel, hell] */
  eyes: [string, string];
  bolts?: boolean;
  sparks?: boolean;
}

export const STAGE_COLORS: StageColors[] = [
  { name: 'Grundform', aura: null, gi: '#41507e', giShade: '#2d385c', belt: '#151a2c', hair: ['#1f2238', '#4a5590'], eyes: ['#4a2c1a', '#b07a48'] },
  { name: 'Erwacht', aura: '#46d4ff', gi: '#2f73c9', giShade: '#1f4f92', belt: '#14213b', hair: ['#1f2238', '#4a5590'], eyes: ['#4a2c1a', '#b07a48'] },
  { name: 'Entfesselt', aura: '#5ef0ff', gi: '#1c9aa3', giShade: '#11686f', belt: '#0d3135', hair: ['#1f2238', '#4a5590'], eyes: ['#0f5f7a', '#7fe0ff'], bolts: true },
  { name: 'Aufgestiegen', aura: '#b07bff', gi: '#6a47c4', giShade: '#47308a', belt: '#22174a', hair: ['#2f1f58', '#7b5bd0'], eyes: ['#0f6f96', '#86e8ff'], bolts: true },
  { name: 'Meisterform', aura: '#ff6fae', gi: '#c23a5e', giShade: '#8a2340', belt: '#3a0f1f', hair: ['#3a1730', '#a04a86'], eyes: ['#0f6f96', '#86e8ff'], bolts: true, sparks: true },
  { name: 'Legende', aura: '#7dffc8', gi: '#eef0f8', giShade: '#c3c7da', belt: '#262b46', hair: ['#c9d2ee', '#ffffff'], eyes: ['#b34f00', '#ffb347'], bolts: true, sparks: true },
];
