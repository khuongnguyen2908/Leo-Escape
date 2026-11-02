import { EventKeyboard, Input, input, KeyCode } from 'cc';

export type TouchButton = 'left' | 'right' | 'down' | 'jump' | 'attack';

const keys = new Set<KeyCode>();
const touch: Record<TouchButton, boolean> = { left: false, right: false, down: false, jump: false, attack: false };
let jumpQueued = false;
let attackQueued = false;
let listening = false;

const LEFT = [KeyCode.KEY_A, KeyCode.ARROW_LEFT];
const RIGHT = [KeyCode.KEY_D, KeyCode.ARROW_RIGHT];
const DOWN = [KeyCode.KEY_S, KeyCode.ARROW_DOWN];
const JUMP = [KeyCode.SPACE, KeyCode.KEY_W, KeyCode.ARROW_UP, KeyCode.KEY_K];
const ATTACK = [KeyCode.KEY_J, KeyCode.KEY_X];

const anyKey = (list: KeyCode[]) => list.some((k) => keys.has(k));

function onKeyDown(e: EventKeyboard) {
    if (keys.has(e.keyCode)) return; // bỏ qua lặp phím khi giữ
    keys.add(e.keyCode);
    if (JUMP.indexOf(e.keyCode) >= 0) jumpQueued = true;
    if (ATTACK.indexOf(e.keyCode) >= 0) attackQueued = true;
}

function onKeyUp(e: EventKeyboard) {
    keys.delete(e.keyCode);
}

/** Gom input bàn phím và nút cảm ứng về một chỗ. */
export const PlayerInput = {
    init() {
        if (listening) return;
        listening = true;
        input.on(Input.EventType.KEY_DOWN, onKeyDown);
        input.on(Input.EventType.KEY_UP, onKeyUp);
    },

    reset() {
        keys.clear();
        touch.left = touch.right = touch.down = touch.jump = touch.attack = false;
        jumpQueued = attackQueued = false;
    },

    get left() { return touch.left || anyKey(LEFT); },
    get right() { return touch.right || anyKey(RIGHT); },
    get down() { return touch.down || anyKey(DOWN); },
    get jumpHeld() { return touch.jump || anyKey(JUMP); },

    /** Trả về true một lần cho mỗi lần bấm nhảy. */
    consumeJump(): boolean {
        const j = jumpQueued;
        jumpQueued = false;
        return j;
    },

    /** Trả về true một lần cho mỗi lần bấm tấn công. */
    consumeAttack(): boolean {
        const a = attackQueued;
        attackQueued = false;
        return a;
    },

    setTouch(button: TouchButton, pressed: boolean) {
        if (button === 'jump' && pressed && !touch.jump) jumpQueued = true;
        if (button === 'attack' && pressed && !touch.attack) attackQueued = true;
        touch[button] = pressed;
    },
};
