import { EventKeyboard, Input, input, KeyCode } from 'cc';

export type TouchButton = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack';

const keys = new Set<KeyCode>();
const touch: Record<TouchButton, boolean> = { left: false, right: false, up: false, down: false, jump: false, attack: false };
let jumpQueued = false;
let attackQueued = false;
let upQueued = false;
let downQueued = false;
let listening = false;

const LEFT = [KeyCode.KEY_A, KeyCode.ARROW_LEFT];
const RIGHT = [KeyCode.KEY_D, KeyCode.ARROW_RIGHT];
const UP = [KeyCode.KEY_W, KeyCode.ARROW_UP];
const DOWN = [KeyCode.KEY_S, KeyCode.ARROW_DOWN];
const JUMP = [KeyCode.SPACE];
const ATTACK = [KeyCode.KEY_J, KeyCode.KEY_X];

const anyKey = (list: KeyCode[]) => list.some((k) => keys.has(k));

function onKeyDown(e: EventKeyboard) {
    if (keys.has(e.keyCode)) return; // bỏ qua lặp phím khi giữ
    keys.add(e.keyCode);
    if (JUMP.indexOf(e.keyCode) >= 0) jumpQueued = true;
    if (ATTACK.indexOf(e.keyCode) >= 0) attackQueued = true;
    if (UP.indexOf(e.keyCode) >= 0) upQueued = true;
    if (DOWN.indexOf(e.keyCode) >= 0) downQueued = true;
}

function onKeyUp(e: EventKeyboard) {
    keys.delete(e.keyCode);
}

/**
 * Gom input bàn phím và nút cảm ứng về một chỗ.
 * Space = nhảy · W / ↑ = đi lên bục phía trên · S / ↓ = xuống khỏi bục · J / X = chém (giữ để lướt).
 */
export const PlayerInput = {
    init() {
        if (listening) return;
        listening = true;
        input.on(Input.EventType.KEY_DOWN, onKeyDown);
        input.on(Input.EventType.KEY_UP, onKeyUp);
    },

    reset() {
        keys.clear();
        touch.left = touch.right = touch.up = touch.down = touch.jump = touch.attack = false;
        jumpQueued = attackQueued = upQueued = downQueued = false;
    },

    get left() { return touch.left || anyKey(LEFT); },
    get right() { return touch.right || anyKey(RIGHT); },
    get down() { return touch.down || anyKey(DOWN); },
    get jumpHeld() { return touch.jump || anyKey(JUMP); },
    /** Đang giữ nút chém (giữ đủ lâu thì lướt). */
    get attackHeld() { return touch.attack || anyKey(ATTACK); },

    /** Trả về true một lần cho mỗi lần bấm nhảy. */
    consumeJump(): boolean {
        const j = jumpQueued;
        jumpQueued = false;
        return j;
    },

    /** Trả về true một lần cho mỗi lần bấm chém. */
    consumeAttack(): boolean {
        const a = attackQueued;
        attackQueued = false;
        return a;
    },

    /** Trả về true một lần cho mỗi lần bấm đi lên (W / ↑ / đẩy joystick lên). */
    consumeUp(): boolean {
        const u = upQueued;
        upQueued = false;
        return u;
    },

    /** Trả về true một lần cho mỗi lần bấm xuống (S / ↓ / kéo joystick xuống). */
    consumeDown(): boolean {
        const d = downQueued;
        downQueued = false;
        return d;
    },

    setTouch(button: TouchButton, pressed: boolean) {
        if (pressed && !touch[button]) {
            if (button === 'jump') jumpQueued = true;
            if (button === 'attack') attackQueued = true;
            if (button === 'up') upQueued = true;
            if (button === 'down') downQueued = true;
        }
        touch[button] = pressed;
    },
};
