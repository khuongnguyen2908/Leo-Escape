import { KeyCode, sys } from 'cc';

/**
 * Cài đặt của người chơi: âm lượng, toàn màn hình, rung màn hình, phím của Người 1 và Người 2.
 * Lưu trong bộ nhớ trình duyệt / máy (localStorage), mở game lần sau vẫn còn. Chỉnh trong menu (Esc → Cài đặt).
 */
export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'skill' | 'interact' | 'swap';

export const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'attack', 'skill', 'interact', 'swap'];

export const ACTION_NAMES: Record<Action, string> = {
    left: 'Sang trái',
    right: 'Sang phải',
    up: 'Lên bục',
    down: 'Xuống bục',
    jump: 'Nhảy',
    attack: 'Đánh',
    skill: 'Kỹ năng',
    interact: 'Tương tác',
    swap: 'Đổi mèo',
};

type KeyMap = Record<Action, number>;

/**
 * Kiểu phím có sẵn: WASD (J đánh, K nhảy) hoặc Mũi tên (X đánh, Z nhảy). 'custom' = đã đổi lẻ phím.
 * Game chỉ có 2 nút: Đánh và Nhảy (không còn Angelo): Kỹ năng, Tương tác, Đổi mèo không gán phím (NONE).
 */
export type KeyLayout = 'wasd' | 'arrows' | 'custom';

export type LangCode = 'vi' | 'en';

const LAYOUT_KEYS: Record<'wasd' | 'arrows', KeyMap> = {
    wasd: {
        left: KeyCode.KEY_A, right: KeyCode.KEY_D, up: KeyCode.KEY_W, down: KeyCode.KEY_S,
        jump: KeyCode.KEY_K, attack: KeyCode.KEY_J, skill: KeyCode.NONE, interact: KeyCode.NONE, swap: KeyCode.NONE,
    },
    arrows: {
        left: KeyCode.ARROW_LEFT, right: KeyCode.ARROW_RIGHT, up: KeyCode.ARROW_UP, down: KeyCode.ARROW_DOWN,
        jump: KeyCode.KEY_Z, attack: KeyCode.KEY_X, skill: KeyCode.NONE, interact: KeyCode.NONE, swap: KeyCode.NONE,
    },
};

/** Bộ phím mặc định của các bản trước (Space nhảy, K kỹ năng, L tương tác...): máy nào còn lưu đúng bộ này thì tự đổi sang bộ mới. */
const OLD_LAYOUTS: Partial<KeyMap>[] = [
    { left: KeyCode.KEY_A, right: KeyCode.KEY_D, up: KeyCode.KEY_W, down: KeyCode.KEY_S, jump: KeyCode.SPACE, attack: KeyCode.KEY_J },
    { left: KeyCode.ARROW_LEFT, right: KeyCode.ARROW_RIGHT, up: KeyCode.ARROW_UP, down: KeyCode.ARROW_DOWN, jump: KeyCode.KEY_Z, attack: KeyCode.KEY_X },
];

const DEFAULT_KEYS: KeyMap[] = [
    {
        left: KeyCode.KEY_A, right: KeyCode.KEY_D, up: KeyCode.KEY_W, down: KeyCode.KEY_S,
        jump: KeyCode.KEY_K, attack: KeyCode.KEY_J, skill: KeyCode.NONE, interact: KeyCode.NONE, swap: KeyCode.NONE,
    },
    {
        left: KeyCode.ARROW_LEFT, right: KeyCode.ARROW_RIGHT, up: KeyCode.ARROW_UP, down: KeyCode.ARROW_DOWN,
        jump: KeyCode.NUM_0, attack: KeyCode.NUM_1, skill: KeyCode.NUM_2, interact: KeyCode.NUM_3, swap: KeyCode.NONE,
    },
];

interface Data {
    /** Âm lượng chung, nhân với nhạc nền và tiếng hiệu ứng */
    master: number;
    music: number;
    sfx: number;
    fullscreen: boolean;
    shake: boolean;
    lang: LangCode;
    keys: KeyMap[];
}

const STORE_KEY = 'leo-escape-settings';

function defaults(): Data {
    return { master: 1, music: 0.35, sfx: 0.8, fullscreen: false, shake: true, lang: 'en', keys: DEFAULT_KEYS.map((k) => ({ ...k })) };
}

function load(): Data {
    const d = defaults();
    try {
        const raw = sys.localStorage.getItem(STORE_KEY);
        if (!raw) return d;
        const saved = JSON.parse(raw);
        if (typeof saved.master === 'number') d.master = saved.master;
        if (typeof saved.music === 'number') d.music = saved.music;
        if (typeof saved.sfx === 'number') d.sfx = saved.sfx;
        if (typeof saved.fullscreen === 'boolean') d.fullscreen = saved.fullscreen;
        if (typeof saved.shake === 'boolean') d.shake = saved.shake;
        if (saved.lang === 'vi' || saved.lang === 'en') d.lang = saved.lang;
        for (let p = 0; p < 2; p++) {
            for (const a of ACTIONS) {
                const k = saved.keys?.[p]?.[a];
                if (typeof k === 'number') d.keys[p][a] = k;
            }
        }
        // Còn đúng bộ phím mặc định cũ (6 phím chính) thì đổi sang bộ mới (WASD: K nhảy; bỏ Kỹ năng / Tương tác / Đổi mèo)
        const p0 = d.keys[0];
        OLD_LAYOUTS.forEach((old, i) => {
            const same = (Object.keys(old) as Action[]).every((a) => p0[a] === old[a]);
            const stale = p0.skill !== KeyCode.NONE || p0.interact !== KeyCode.NONE || p0.swap !== KeyCode.NONE;
            if (same && stale) d.keys[0] = { ...LAYOUT_KEYS[i === 0 ? 'wasd' : 'arrows'] };
        });
    } catch (e) {
        console.warn('[Settings] Không đọc được cài đặt đã lưu, dùng mặc định.', e);
    }
    return d;
}

let data: Data | null = null;
const listeners: (() => void)[] = [];
/** Đang mở bảng Cài đặt: đổi thì áp dụng ngay nhưng chưa ghi xuống máy, bấm Lưu mới ghi (bản lúc mở để trả lại). */
let editSnapshot: string | null = null;

function get(): Data {
    if (!data) data = load();
    return data;
}

function write() {
    try {
        sys.localStorage.setItem(STORE_KEY, JSON.stringify(get()));
    } catch (e) {
        console.warn('[Settings] Không lưu được cài đặt.', e);
    }
}

function save() {
    if (editSnapshot === null) write();
    for (const l of listeners.slice()) l();
}

export const Settings = {
    get master() { return get().master; },
    set master(v: number) { get().master = Math.max(0, Math.min(1, v)); save(); },

    get music() { return get().music; },
    set music(v: number) { get().music = Math.max(0, Math.min(1, v)); save(); },

    get sfx() { return get().sfx; },
    set sfx(v: number) { get().sfx = Math.max(0, Math.min(1, v)); save(); },

    get fullscreen() { return get().fullscreen; },
    set fullscreen(v: boolean) { get().fullscreen = v; save(); },

    get shake() { return get().shake; },
    set shake(v: boolean) { get().shake = v; save(); },

    /** Phím của người chơi p (0 = Người 1, 1 = Người 2) cho hành động a. 0 = chưa gán. */
    key(p: number, a: Action): number {
        return get().keys[p]?.[a] ?? KeyCode.NONE;
    },

    /**
     * Gán phím. Phím đó đang dùng cho chỗ khác thì đổi chỗ hai phím cho nhau, và trả về chỗ bị đổi để báo người chơi.
     */
    setKey(p: number, a: Action, code: number): { player: number; action: Action } | null {
        const keys = get().keys;
        const old = keys[p][a];
        let swapped: { player: number; action: Action } | null = null;
        for (let q = 0; q < 2 && !swapped; q++) {
            for (const b of ACTIONS) {
                if ((q !== p || b !== a) && code !== KeyCode.NONE && keys[q][b] === code) {
                    keys[q][b] = old;
                    swapped = { player: q, action: b };
                    break;
                }
            }
        }
        keys[p][a] = code;
        save();
        return swapped;
    },

    resetKeys() {
        get().keys = DEFAULT_KEYS.map((k) => ({ ...k }));
        save();
    },

    /** Trả về mặc định: trang Âm thanh (âm lượng chung, nhạc nền, tiếng hiệu ứng). */
    resetAudio() {
        const d = defaults();
        Object.assign(get(), { master: d.master, music: d.music, sfx: d.sfx });
        save();
    },

    /** Trả về mặc định: trang Hình ảnh (toàn màn hình, rung màn hình). */
    resetVideo() {
        const d = defaults();
        Object.assign(get(), { fullscreen: d.fullscreen, shake: d.shake });
        save();
    },

    /** Trả về mặc định: trang Trò chơi (ngôn ngữ). */
    resetGame() {
        get().lang = defaults().lang;
        save();
    },

    /** Mở bảng Cài đặt: từ giờ đổi gì cũng áp dụng ngay nhưng chưa ghi xuống máy. */
    beginEdit() {
        if (editSnapshot === null) editSnapshot = JSON.stringify(get());
    },

    /** Có đổi gì so với lúc mở bảng không. */
    get dirty(): boolean {
        return editSnapshot !== null && editSnapshot !== JSON.stringify(get());
    },

    /** Bấm Lưu: ghi xuống máy, bản này thành mốc mới (vẫn đang trong bảng). */
    commitEdit() {
        write();
        if (editSnapshot !== null) editSnapshot = JSON.stringify(get());
    },

    /** Bỏ thay đổi: trả mọi cài đặt về như lúc mở bảng, rồi kết thúc phiên. */
    cancelEdit() {
        if (editSnapshot === null) return;
        data = JSON.parse(editSnapshot);
        editSnapshot = null;
        for (const l of listeners.slice()) l();
    },

    /** Đóng bảng (đã lưu hoặc không đổi gì). */
    endEdit() {
        editSnapshot = null;
    },

    get lang(): LangCode { return get().lang; },
    set lang(v: LangCode) { get().lang = v; save(); },

    /** Kiểu phím người chơi p đang dùng (đổi lẻ phím thì là 'custom'). */
    layout(p: number): KeyLayout {
        const keys = get().keys[p];
        for (const name of ['wasd', 'arrows'] as const) {
            const preset = LAYOUT_KEYS[name];
            // Người 2 không có phím Đổi mèo nên bỏ qua ô đó khi so
            if (ACTIONS.every((a) => (p === 1 && a === 'swap') || keys[a] === preset[a])) return name;
        }
        return 'custom';
    },

    /** Đặt cả hàng phím của người chơi p theo kiểu layout; người kia lấy kiểu còn lại để hai người không trùng phím. */
    setLayout(p: number, layout: 'wasd' | 'arrows') {
        const keys = get().keys;
        const other: 'wasd' | 'arrows' = layout === 'wasd' ? 'arrows' : 'wasd';
        keys[p] = { ...LAYOUT_KEYS[layout] };
        keys[1 - p] = { ...LAYOUT_KEYS[other] };
        keys[1].swap = KeyCode.NONE; // chỉ Người 1 đổi mèo
        if (p === 1) keys[0].swap = KeyCode.TAB;
        save();
    },

    /** Gọi cb mỗi khi cài đặt đổi. */
    onChange(cb: () => void) {
        listeners.push(cb);
    },

    offChange(cb: () => void) {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
    },
};

const KEY_NAMES: Record<number, string> = {
    [KeyCode.NONE]: '—',
    [KeyCode.SPACE]: 'Space',
    [KeyCode.TAB]: 'Tab',
    [KeyCode.ENTER]: 'Enter',
    [KeyCode.BACKSPACE]: 'Backspace',
    [KeyCode.SHIFT_LEFT]: 'Shift',
    [KeyCode.SHIFT_RIGHT]: 'Shift phải',
    [KeyCode.CTRL_LEFT]: 'Ctrl',
    [KeyCode.CTRL_RIGHT]: 'Ctrl phải',
    [KeyCode.ALT_LEFT]: 'Alt',
    [KeyCode.ALT_RIGHT]: 'Alt phải',
    [KeyCode.CAPS_LOCK]: 'Caps',
    [KeyCode.ARROW_LEFT]: '← Trái',
    [KeyCode.ARROW_RIGHT]: '→ Phải',
    [KeyCode.ARROW_UP]: '↑ Lên',
    [KeyCode.ARROW_DOWN]: '↓ Xuống',
    [KeyCode.INSERT]: 'Insert',
    [KeyCode.DELETE]: 'Delete',
    [KeyCode.HOME]: 'Home',
    [KeyCode.END]: 'End',
    [KeyCode.PAGE_UP]: 'PgUp',
    [KeyCode.PAGE_DOWN]: 'PgDn',
    [KeyCode.NUM_ENTER]: 'Num Enter',
    [KeyCode.NUM_DECIMAL]: 'Num .',
    [KeyCode.NUM_MULTIPLY]: 'Num *',
    [KeyCode.NUM_SUBTRACT]: 'Num -',
    [KeyCode.NUM_DIVIDE]: 'Num /',
    [KeyCode.SEMICOLON]: ';',
    [KeyCode.EQUAL]: '=',
    [KeyCode.COMMA]: ',',
    [KeyCode.DASH]: '-',
    [KeyCode.PERIOD]: '.',
    [KeyCode.SLASH]: '/',
    [KeyCode.BACK_QUOTE]: '`',
    [KeyCode.BRACKET_LEFT]: '[',
    [KeyCode.BACKSLASH]: '\\',
    [KeyCode.QUOTE]: "'",
};

/** Tên phím tiếng Anh (chỉ những phím có chữ khác tiếng Việt). */
const KEY_NAMES_EN: Record<number, string> = {
    [KeyCode.SHIFT_RIGHT]: 'R-Shift',
    [KeyCode.CTRL_RIGHT]: 'R-Ctrl',
    [KeyCode.ALT_RIGHT]: 'R-Alt',
    [KeyCode.ARROW_LEFT]: '← Left',
    [KeyCode.ARROW_RIGHT]: '→ Right',
    [KeyCode.ARROW_UP]: '↑ Up',
    [KeyCode.ARROW_DOWN]: '↓ Down',
};

/** Tên phím để hiện trên màn hình (theo ngôn ngữ đang chọn). */
export function keyName(code: number): string {
    if (Settings.lang === 'en' && KEY_NAMES_EN[code] !== undefined) return KEY_NAMES_EN[code];
    if (KEY_NAMES[code] !== undefined) return KEY_NAMES[code];
    if (code >= KeyCode.KEY_A && code <= KeyCode.KEY_A + 25) return String.fromCharCode(code);
    if (code >= KeyCode.DIGIT_0 && code <= KeyCode.DIGIT_0 + 9) return String(code - KeyCode.DIGIT_0);
    if (code >= KeyCode.NUM_0 && code <= KeyCode.NUM_0 + 9) return `Num ${code - KeyCode.NUM_0}`;
    if (code >= KeyCode.F1 && code <= KeyCode.F1 + 11) return `F${code - KeyCode.F1 + 1}`;
    return Settings.lang === 'en' ? `Key ${code}` : `Phím ${code}`;
}

/** Tên phím ngắn cho gợi ý trong màn (mũi tên chỉ còn ký hiệu). */
export function keyShort(code: number): string {
    switch (code) {
        case KeyCode.ARROW_LEFT: return '←';
        case KeyCode.ARROW_RIGHT: return '→';
        case KeyCode.ARROW_UP: return '↑';
        case KeyCode.ARROW_DOWN: return '↓';
        default: return keyName(code);
    }
}
