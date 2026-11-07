import { sys } from 'cc';

/** Một thành tích: tên và mô tả trong Lang là ach.<id> và ach.<id>.d; biểu tượng là ảnh art/ach_<id> (chưa có thì vẽ tạm). */
export interface AchievementDef {
    id: string;
}

/** Thứ tự hiện trong trang Thành tích */
export const ACHIEVEMENTS: AchievementDef[] = [
    { id: 'tutorial' },
    { id: 'boss' },
    { id: 'clear' },
    { id: 'fish' },
    { id: 'nodown' },
    { id: 'fast' },
    { id: 'maniac' },
    { id: 'hunter' },
];

/** Thợ săn chim: hạ chừng này con (cộng dồn qua mọi lượt chơi) */
export const HUNTER_GOAL = 20;
/** Nhanh như mèo: qua chương 1 dưới chừng này giây */
export const FAST_TIME = 300;

interface Data {
    /** id → lúc đạt (Date.now()) */
    unlocked: Record<string, number>;
    birds: number;
}

const STORE_KEY = 'leo-escape-achievements';
let data: Data | null = null;
const listeners: ((id: string) => void)[] = [];

function get(): Data {
    if (data) return data;
    data = { unlocked: {}, birds: 0 };
    try {
        const raw = sys.localStorage.getItem(STORE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            if (saved && typeof saved.unlocked === 'object') data.unlocked = saved.unlocked;
            if (typeof saved?.birds === 'number') data.birds = saved.birds;
        }
    } catch (e) {
        console.warn('[Achievements] Không đọc được thành tích đã lưu.', e);
    }
    return data;
}

function write() {
    try {
        sys.localStorage.setItem(STORE_KEY, JSON.stringify(get()));
    } catch (e) {
        console.warn('[Achievements] Không lưu được thành tích.', e);
    }
}

/**
 * Thành tích, lưu trên máy (localStorage, dùng chung cho mọi ô lưu). Đạt cái mới thì báo cho các hàm đã đăng ký
 * (AchievementToast hiện thông báo nhỏ góc màn hình).
 * Chỗ gọi: TutorialRoom.exit (tutorial), BossArena.defeated (boss), GameManager.win (clear, fish, nodown, fast, maniac),
 * EnemyPatrol.die của quái nhỏ (hunter).
 */
export const Achievements = {
    isUnlocked(id: string): boolean {
        return !!get().unlocked[id];
    },

    /** Đạt thành tích id (đạt rồi thì thôi). */
    unlock(id: string) {
        const d = get();
        if (d.unlocked[id]) return;
        d.unlocked[id] = Date.now();
        write();
        for (const l of listeners.slice()) l(id);
    },

    /** Số chim đã hạ (cộng dồn). */
    get birds(): number {
        return get().birds;
    },

    /** Hạ một con quái nhỏ: cộng dồn, đủ HUNTER_GOAL thì đạt Thợ săn chim. */
    addBirdKill() {
        const d = get();
        if (d.birds < HUNTER_GOAL) {
            d.birds++;
            write();
        }
        if (d.birds >= HUNTER_GOAL) this.unlock('hunter');
    },

    onUnlock(fn: (id: string) => void) {
        if (listeners.indexOf(fn) < 0) listeners.push(fn);
    },
};
