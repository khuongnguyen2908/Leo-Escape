import { Rect } from 'cc';

/** Thứ có thể bị mèo đánh trúng (kẻ địch, boss...). Để riêng file này cho khỏi vòng import. */
export interface Hittable {
    getHitRect(out: Rect): Rect;
    readonly canBeHit: boolean;
    takeHit(fromX?: number): void;
}

export const Hittables: Hittable[] = [];

export function registerHittable(h: Hittable) {
    Hittables.push(h);
}

export function unregisterHittable(h: Hittable) {
    const i = Hittables.indexOf(h);
    if (i >= 0) Hittables.splice(i, 1);
}
