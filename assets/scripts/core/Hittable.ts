import { Rect } from 'cc';

/** Thứ có thể bị mèo đánh trúng (kẻ địch, boss...). Để riêng file này cho khỏi vòng import. */
export interface Hittable {
    getHitRect(out: Rect): Rect;
    readonly canBeHit: boolean;
    /**
     * fromX: chỗ đòn đánh tới (để bị đẩy lùi ra xa); power: độ mạnh đẩy lùi, nhát cuối combo mạnh hơn;
     * damage: số máu bị trừ (mặc định 1).
     */
    takeHit(fromX?: number, power?: number, damage?: number): void;
}

export const Hittables: Hittable[] = [];

export function registerHittable(h: Hittable) {
    Hittables.push(h);
}

export function unregisterHittable(h: Hittable) {
    const i = Hittables.indexOf(h);
    if (i >= 0) Hittables.splice(i, 1);
}
