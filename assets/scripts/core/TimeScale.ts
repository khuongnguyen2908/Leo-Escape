import { director } from 'cc';

let scale = 1;
let patched = false;
let timer: ReturnType<typeof setInterval> | null = null;

/** Gắn một lần: mỗi khung engine gọi director.tick(dt), ta nhân dt với scale (mọi update, tween, hẹn giờ đều chậm theo). */
function patch() {
    if (patched) return;
    patched = true;
    const d = director as unknown as { tick(dt: number): void };
    const orig = d.tick.bind(director);
    d.tick = (dt: number) => orig(dt * scale);
}

/**
 * Tốc độ thời gian của cả game (1 = bình thường, 0.15 = chậm còn 15%).
 * Dùng cho slow motion lúc hạ boss. Âm thanh không bị chậm theo. Đổi scene thì GameManager gọi reset().
 */
export const TimeScale = {
    get value() { return scale; },

    /** Đặt tốc độ ngay. */
    set(v: number) {
        patch();
        scale = Math.max(0, v);
    },

    /** Về bình thường, huỷ slow motion đang chạy. */
    reset() {
        if (timer) clearInterval(timer);
        timer = null;
        scale = 1;
    },

    /**
     * Slow motion: chậm dần xuống low trong rampIn giây, giữ hold giây, rồi nhanh dần về 1 trong rampOut giây.
     * Thời gian ở đây là giờ thật (không bị chậm theo chính nó).
     */
    slowMotion(low: number, rampIn: number, hold: number, rampOut: number) {
        patch();
        this.reset();
        const start = Date.now();
        const smooth = (k: number) => k * k * (3 - 2 * k);
        timer = setInterval(() => {
            const t = (Date.now() - start) / 1000;
            if (t < rampIn) scale = 1 + (low - 1) * smooth(t / rampIn);
            else if (t < rampIn + hold) scale = low;
            else if (t < rampIn + hold + rampOut) scale = low + (1 - low) * smooth((t - rampIn - hold) / rampOut);
            else this.reset();
        }, 16);
    },
};
