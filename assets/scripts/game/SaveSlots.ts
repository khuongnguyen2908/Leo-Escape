import { sys } from 'cc';

/** Tiến độ lưu trong một ô. */
export interface SlotData {
    /** Chương (hiện chỉ có chương 1) */
    chapter: number;
    /** Tên màn (GameManager.levelId) */
    level: string;
    /** Checkpoint thứ mấy (đếm từ trái sang, bắt đầu 1); 0 = đầu màn */
    checkpoint: number;
    /** Chỗ hồi sinh (toạ độ trong lớp Gameplay) */
    x: number;
    y: number;
    /** Thời gian chơi (giây), số cá đã ăn, số điểm cá, số lần gục */
    time: number;
    fish: number;
    coins: number;
    downs: number;
    /** uuid các con cá đã ăn (vào lại thì không còn cá đó) */
    collected: string[];
    /** Đã qua màn */
    cleared: boolean;
    /** Độ khó chọn lúc tạo ô (0 CASUAL, 1 NORMAL, 2 MANIAC). Ô lưu cũ chưa có thì tính là CASUAL. */
    difficulty?: number;
    /** Lúc lưu (Date.now()) */
    savedAt: number;
}

export const SLOT_COUNT = 3;
const STORE_KEY = 'leo-escape-saves';

function loadAll(): (SlotData | null)[] {
    let list: (SlotData | null)[] = [];
    try {
        const raw = sys.localStorage.getItem(STORE_KEY);
        if (raw) list = JSON.parse(raw);
    } catch (e) {
        list = [];
    }
    const out: (SlotData | null)[] = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
        const s = list[i];
        out.push(s && typeof s.x === 'number' && typeof s.y === 'number' ? s : null);
    }
    return out;
}

function saveAll(list: (SlotData | null)[]) {
    try {
        sys.localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('[SaveSlots] Không lưu được tiến độ.', e);
    }
}

/**
 * 3 ô lưu tiến độ (localStorage, như Cài đặt). Ô trống hiện "NEW".
 * Chạm checkpoint (xa hơn chỗ đã lưu) hoặc qua màn thì ghi đè ô đang chơi (GameSession.slot).
 */
export const SaveSlots = {
    get(i: number): SlotData | null {
        return loadAll()[i] ?? null;
    },

    all(): (SlotData | null)[] {
        return loadAll();
    },

    write(i: number, data: SlotData) {
        if (i < 0 || i >= SLOT_COUNT) return;
        const list = loadAll();
        list[i] = data;
        saveAll(list);
    },

    clear(i: number) {
        if (i < 0 || i >= SLOT_COUNT) return;
        const list = loadAll();
        list[i] = null;
        saveAll(list);
    },
};
