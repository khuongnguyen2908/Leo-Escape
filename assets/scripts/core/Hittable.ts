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
    /** Không bắt buộc: bị trói chân (Angelo), đứng yên trong seconds giây. */
    bind?(seconds: number): void;
    /** Không bắt buộc: bị choáng (Leo đập bụng), đứng yên trong seconds giây, có sao xoay trên đầu. */
    daze?(seconds: number): void;
    /** Không bắt buộc: bị hất tung lên cao height (Leo chém hất). Boss to xác không bị hất. */
    launch?(height: number): void;
    /** Không bắt buộc: bị quét chân té nằm seconds giây (ngã ra xa khỏi fromX). Boss to xác không bị té. */
    trip?(seconds: number, fromX?: number): void;
    /** Không bắt buộc: to xác (boss) thì không bị quét chân, không bị hất. */
    readonly big?: boolean;
}

export const Hittables: Hittable[] = [];

export function registerHittable(h: Hittable) {
    Hittables.push(h);
}

export function unregisterHittable(h: Hittable) {
    const i = Hittables.indexOf(h);
    if (i >= 0) Hittables.splice(i, 1);
}
