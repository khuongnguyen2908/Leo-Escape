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

const DEFAULT_KEYS: KeyMap[] = [
    {
        left: KeyCode.KEY_A, right: KeyCode.KEY_D, up: KeyCode.KEY_W, down: KeyCode.KEY_S,
        jump: KeyCode.SPACE, attack: KeyCode.KEY_J, skill: KeyCode.KEY_K, interact: KeyCode.KEY_L, swap: KeyCode.TAB,
    },
    {
        left: KeyCode.ARROW_LEFT, right: KeyCode.ARROW_RIGHT, up: KeyCode.ARROW_UP, down: KeyCode.ARROW_DOWN,
        jump: KeyCode.NUM_0, attack: KeyCode.NUM_1, skill: KeyCode.NUM_2, interact: KeyCode.NUM_3, swap: KeyCode.NONE,
    },
];

interface Data {
    music: number;
    sfx: number;
    fullscreen: boolean;
    shake: boolean;
    keys: KeyMap[];
}

const STORE_KEY = 'leo-escape-settings';

function defaults(): Data {
    return { music: 0.35, sfx: 0.8, fullscreen: false, shake: true, keys: DEFAULT_KEYS.map((k) => ({ ...k })) };
}

function load(): Data {
    const d = defaults();
    try {
        const raw = sys.localStorage.getItem(STORE_KEY);
        if (!raw) return d;
        const saved = JSON.parse(raw);
        if (typeof saved.music === 'number') d.music = saved.music;
        if (typeof saved.sfx === 'number') d.sfx = saved.sfx;
        if (typeof saved.fullscreen === 'boolean') d.fullscreen = saved.fullscreen;
        if (typeof saved.shake === 'boolean') d.shake = saved.shake;
        for (let p = 0; p < 2; p++) {
            for (const a of ACTIONS) {
                const k = saved.keys?.[p]?.[a];
                if (typeof k === 'number') d.keys[p][a] = k;
            }
        }
    } catch (e) {
        console.warn('[Settings] Không đọc được cài đặt đã lưu, dùng mặc định.', e);
    }
    return d;
}

let data: Data | null = null;
const listeners: (() => void)[] = [];

function get(): Data {
    if (!data) data = load();
    return data;
}

function save() {
    try {
        sys.localStorage.setItem(STORE_KEY, JSON.stringify(get()));
    } catch (e) {
        console.warn('[Settings] Không lưu được cài đặt.', e);
    }
    for (const l of listeners) l();
}

export const Settings = {
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

/** Tên phím để hiện trên màn hình. */
export function keyName(code: number): string {
    if (KEY_NAMES[code] !== undefined) return KEY_NAMES[code];
    if (code >= KeyCode.KEY_A && code <= KeyCode.KEY_A + 25) return String.fromCharCode(code);
    if (code >= KeyCode.DIGIT_0 && code <= KeyCode.DIGIT_0 + 9) return String(code - KeyCode.DIGIT_0);
    if (code >= KeyCode.NUM_0 && code <= KeyCode.NUM_0 + 9) return `Num ${code - KeyCode.NUM_0}`;
    if (code >= KeyCode.F1 && code <= KeyCode.F1 + 11) return `F${code - KeyCode.F1 + 1}`;
    return `Phím ${code}`;
}
