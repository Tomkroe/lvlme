/**
 * Bild-Ebenen des Avatars. Zuständig: avatar-art.
 * Erzeugt aus Leonardo-Bildern (Quellen in assets/avatar/raw, Prompts in docs/Avatar-Design-Prompts.md):
 * Hintergrund freigestellt, Kopf an der Halslinie abgetrennt. Alle Körper und Köpfe liegen im selben
 * Koordinatensystem (AVATAR_W × AVATAR_H): Hals und Füße sind auf dieselbe Höhe ausgerichtet,
 * daher passt jeder Kopf auf jeden Körper. Die Komponente legt sie nur übereinander.
 */
import type { BodyId, HairId } from '../types.ts';
import body0 from '../../assets/avatar/body.png';
import bodyDefined from '../../assets/avatar/body-defined.png';
import bodySlim from '../../assets/avatar/body-slim.png';
import bodyStrength from '../../assets/avatar/body-strength.png';
import bodyStocky from '../../assets/avatar/body-stocky.png';
import outfitTshirt from '../../assets/avatar/outfit-tshirt.png';
import outfitHoodie from '../../assets/avatar/outfit-hoodie.png';
import outfitGi from '../../assets/avatar/outfit-gi.png';
import outfitJersey from '../../assets/avatar/outfit-jersey.png';
import outfitShirtless from '../../assets/avatar/outfit-shirtless.png';
import head0 from '../../assets/avatar/head-0.png';
import head1 from '../../assets/avatar/head-1.png';
import head2 from '../../assets/avatar/head-2.png';
import head3 from '../../assets/avatar/head-3.png';
import head4 from '../../assets/avatar/head-4.png';
import head5 from '../../assets/avatar/head-5.png';
import head6 from '../../assets/avatar/head-6.png';

export const AVATAR_W = 624;
export const AVATAR_H = 936;
/** Fußsohlen liegen bei diesem Anteil der Höhe (für die Platzierung auf dem Boden) */
export const AVATAR_FEET = 0.956;

export interface Hairstyle {
  id: HairId;
  name: string;
  image: number;
}

export const HAIRSTYLES: readonly Hairstyle[] = [
  { id: 0, name: 'Stachelig', image: head0 },
  { id: 1, name: 'Undercut', image: head1 },
  { id: 2, name: 'Wellen', image: head2 },
  { id: 3, name: 'Buzz Cut', image: head3 },
  { id: 4, name: 'Schulterlang', image: head4 },
  { id: 5, name: 'Afro', image: head5 },
  { id: 6, name: 'Slick-back', image: head6 },
];

export const DEFAULT_HAIR: HairId = 0;

export function hairstyle(id: number | undefined): Hairstyle {
  return HAIRSTYLES.find(h => h.id === id) ?? HAIRSTYLES[0];
}

/**
 * Körper: Körpertypen (verschiedene Statur, Sportshorts) und Outfits (athletische Statur, andere Kleidung).
 * Weil jedes Bild ein ganzer Körper ist, schließen sich Körpertyp und Outfit gegenseitig aus.
 * Später soll der Körpertyp aus den Stats kommen; bis dahin ist er frei wählbar.
 */
export interface BodyOption {
  id: BodyId;
  name: string;
  kind: 'type' | 'outfit';
  image: number;
}

export const BODIES: readonly BodyOption[] = [
  { id: 0, name: 'Athletisch', kind: 'type', image: body0 },
  { id: 1, name: 'Definiert', kind: 'type', image: bodyDefined },
  { id: 2, name: 'Schlank', kind: 'type', image: bodySlim },
  { id: 3, name: 'Kraftsport', kind: 'type', image: bodyStrength },
  { id: 4, name: 'Stämmig', kind: 'type', image: bodyStocky },
  { id: 5, name: 'T-Shirt', kind: 'outfit', image: outfitTshirt },
  { id: 6, name: 'Hoodie', kind: 'outfit', image: outfitHoodie },
  { id: 7, name: 'Trainingsanzug', kind: 'outfit', image: outfitGi },
  { id: 8, name: 'Trikot', kind: 'outfit', image: outfitJersey },
  { id: 9, name: 'Oberkörperfrei', kind: 'outfit', image: outfitShirtless },
];

export const DEFAULT_BODY: BodyId = 0;

export function bodyOption(id: number | undefined): BodyOption {
  return BODIES.find(b => b.id === id) ?? BODIES[0];
}
