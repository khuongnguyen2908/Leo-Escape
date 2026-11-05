import { sys } from 'cc';

/** Kỷ lục tốt nhất của một màn: thời gian nhanh nhất và số sao cao nhất (tính riêng, không cần cùng một lần chơi). */
export interface LevelRecord {
    time: number;
    stars: number;
}

const STORE_KEY = 'leo-escape-records';

function loadAll(): Record<string, LevelRecord> {
    try {
        const raw = sys.localStorage.getItem(STORE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

/** Kỷ lục từng màn, lưu trên máy (localStorage) như Cài đặt. */
export const Records = {
    get(level: string): LevelRecord | null {
        const r = loadAll()[level];
        return r && typeof r.time === 'number' && typeof r.stars === 'number' ? r : null;
    },

    /** Ghi lần chơi vừa xong; trả về true nếu phá kỷ lục (nhanh hơn hoặc nhiều sao hơn). */
    submit(level: string, time: number, stars: number): boolean {
        const all = loadAll();
        const old = all[level];
        const better = !old || time < old.time || stars > old.stars;
        all[level] = { time: old ? Math.min(old.time, time) : time, stars: old ? Math.max(old.stars, stars) : stars };
        try {
            sys.localStorage.setItem(STORE_KEY, JSON.stringify(all));
        } catch (e) {
            console.warn('[Records] Không lưu được kỷ lục.', e);
        }
        return better;
    },
};

/** 83.4 giây → "01:23.4" */
export function formatTime(seconds: number): string {
    // Làm tròn tới 0.1 giây trước rồi mới tách phút / giây (69.96 → 70.0 → "01:10.0", không ra "01:010.0")
    const tenths = Math.round(seconds * 10);
    const m = Math.floor(tenths / 600);
    const s = (tenths % 600) / 10;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}
