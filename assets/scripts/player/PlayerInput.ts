import { EventKeyboard, Game, game, Input, input } from 'cc';
import { Action, ACTIONS, Settings } from '../core/Settings';

export type TouchButton = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'swap' | 'skill' | 'interact';

/** Bộ điều khiển của một con mèo: đọc phím của một hoặc nhiều người chơi. */
export interface Controls {
    readonly left: boolean;
    readonly right: boolean;
    readonly down: boolean;
    /** Đang giữ Lên (leo dây). */
    readonly upHeld: boolean;
    readonly jumpHeld: boolean;
    /** Đang giữ nút đánh (giữ đủ lâu thì lướt). */
    readonly attackHeld: boolean;
    readonly interactHeld: boolean;
    /** Đang giữ nút Kỹ năng (Angelo giữ để nằm lì). */
    readonly skillHeld: boolean;
    /** Mỗi hàm consume trả về true một lần cho mỗi lần bấm. */
    consumeJump(): boolean;
    consumeAttack(): boolean;
    consumeUp(): boolean;
    consumeDown(): boolean;
    consumeSkill(): boolean;
    consumeInteract(): boolean;
    consumeSwap(): boolean;
}

const keys = new Set<number>();
const touch = new Set<Action>(); // nút cảm ứng luôn thuộc Người 1
const queued = [new Set<Action>(), new Set<Action>()];
let listening = false;
let capture: ((code: number) => void) | null = null;

function held(p: number, a: Action): boolean {
    const k = Settings.key(p, a);
    return (k > 0 && keys.has(k)) || (p === 0 && touch.has(a));
}

function onKeyDown(e: EventKeyboard) {
    if (capture) {
        const cb = capture;
        capture = null;
        cb(e.keyCode);
        return;
    }
    if (keys.has(e.keyCode)) return; // bỏ qua lặp phím khi giữ
    keys.add(e.keyCode);
    for (let p = 0; p < 2; p++) {
        for (const a of ACTIONS) if (Settings.key(p, a) === e.keyCode) queued[p].add(a);
    }
}

function onKeyUp(e: EventKeyboard) {
    keys.delete(e.keyCode);
}

/** Điều khiển ghép từ phím của các người chơi trong danh sách (rỗng = không điều khiển gì). */
class PlayerControls implements Controls {
    constructor(private readonly players: number[]) {}

    private held(a: Action) { return this.players.some((p) => held(p, a)); }

    private consume(a: Action): boolean {
        let hit = false;
        for (const p of this.players) {
            if (queued[p].has(a)) {
                queued[p].delete(a);
                hit = true;
            }
        }
        return hit;
    }

    get left() { return this.held('left'); }
    get right() { return this.held('right'); }
    get down() { return this.held('down'); }
    get upHeld() { return this.held('up'); }
    get jumpHeld() { return this.held('jump'); }
    get attackHeld() { return this.held('attack'); }
    get interactHeld() { return this.held('interact'); }
    get skillHeld() { return this.held('skill'); }
    consumeJump() { return this.consume('jump'); }
    consumeAttack() { return this.consume('attack'); }
    consumeUp() { return this.consume('up'); }
    consumeDown() { return this.consume('down'); }
    consumeSkill() { return this.consume('skill'); }
    consumeInteract() { return this.consume('interact'); }
    consumeSwap() { return this.consume('swap'); }
}

const single = [new PlayerControls([0]), new PlayerControls([1])];
const merged = new PlayerControls([0, 1]);
const none = new PlayerControls([]);

/**
 * Gom bàn phím và nút cảm ứng, chia theo người chơi. Phím của từng người đặt trong Settings (menu → Cài đặt → Bàn phím).
 * Chơi 1 người thì mèo chỉ nhận bộ phím Người 1 (GameManager gán PlayerInput.player(0)).
 */
export const PlayerInput = {
    init() {
        if (listening) return;
        listening = true;
        input.on(Input.EventType.KEY_DOWN, onKeyDown);
        input.on(Input.EventType.KEY_UP, onKeyUp);
        // Cửa sổ mất tiêu điểm / tab bị ẩn (Alt+Tab, bấm ra ngoài): trình duyệt không báo lúc nhả phím,
        // nên coi như nhả hết, khỏi cảnh mèo tự chạy tiếp tới khi bấm lại phím đó
        const releaseAll = () => { keys.clear(); touch.clear(); };
        game.on(Game.EVENT_HIDE, releaseAll);
        if (typeof window !== 'undefined') window.addEventListener('blur', releaseAll);
    },

    reset() {
        keys.clear();
        touch.clear();
        this.clearQueues();
    },

    /** Bỏ các lần bấm chưa dùng (ví dụ bấm trong lúc mở menu). */
    clearQueues() {
        queued[0].clear();
        queued[1].clear();
    },

    /** Điều khiển của Người 1 (0) hoặc Người 2 (1). */
    player(p: number): Controls {
        return single[p === 1 ? 1 : 0];
    },

    /** Phím của cả hai người chơi. */
    get merged(): Controls { return merged; },

    /** Không điều khiển gì (mèo đứng chờ). */
    get none(): Controls { return none; },

    /** Lần bấm phím kế tiếp không điều khiển game mà gửi cho cb (dùng khi đổi phím trong menu). */
    captureNextKey(cb: (code: number) => void) {
        capture = cb;
    },

    cancelCapture() {
        capture = null;
    },

    get capturing() { return capture !== null; },

    setTouch(button: TouchButton, pressed: boolean) {
        if (pressed && !touch.has(button)) queued[0].add(button);
        if (pressed) touch.add(button);
        else touch.delete(button);
    },
};
