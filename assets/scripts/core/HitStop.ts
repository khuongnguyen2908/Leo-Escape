/**
 * Khựng hình rất ngắn khi chém trúng, cho đòn đánh có cảm giác "ăn".
 * Mèo và kẻ địch kiểm tra HitStop.frozen ở đầu update; đang khựng thì đứng yên.
 */
let until = 0;

export const HitStop = {
    /** Khựng trong ms mili giây (không cộng dồn, lấy cái dài hơn). */
    trigger(ms: number) {
        until = Math.max(until, Date.now() + ms);
    },
    get frozen(): boolean {
        return Date.now() < until;
    },
};
