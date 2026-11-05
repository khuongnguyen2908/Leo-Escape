import { EventKeyboard, Input, input, KeyCode, Node } from 'cc';
import { Settings } from '../core/Settings';
import { PlayerInput } from '../player/PlayerInput';

/** Một ô chọn được trong bảng: nút, thanh trượt, công tắc... */
export interface NavItem {
    node: Node;
    /** Enter / Space / Nhảy: bấm */
    press?: () => void;
    /** A / ←: giảm (thanh trượt), đổi lựa chọn */
    left?: () => void;
    /** D / →: tăng, đổi lựa chọn */
    right?: () => void;
    /** Hiện / tắt viền đang chọn */
    focus?: (on: boolean) => void;
}

const stack: MenuNav[] = [];
let listening = false;
let mutedUntil = 0;

/**
 * Điều khiển một bảng (menu tạm dừng, cài đặt, kết quả, hỏi lại...) bằng bàn phím:
 * W/S hoặc ↑/↓ chọn ô · A/D hoặc ←/→ chỉnh ô · Enter, Space hoặc phím Nhảy / Đánh của Người 1 để bấm · Esc gọi onBack.
 * Rê chuột lên ô cũng chọn ô đó. Nhiều bảng chồng nhau thì chỉ bảng mở sau cùng nhận phím.
 * Nghe thẳng sự kiện phím (không đọc trong update) nên vẫn chạy khi game đang tạm dừng (director.pause).
 */
export class MenuNav {
    private items: NavItem[] = [];
    private index = 0;
    /** Vừa mở trong lúc đang xử lý một lần bấm phím (Esc mở menu, Enter mở bảng hỏi lại): bỏ qua chính lần bấm đó. */
    private justOpened = false;

    /** onBack: bấm Esc (để trống thì Esc không làm gì ở bảng này). */
    constructor(public onBack: (() => void) | null = null) {}

    /** Bỏ qua phím trong ms mili giây (vừa đổi phím xong, khỏi bấm nhầm). */
    static mute(ms = 120) {
        mutedUntil = Date.now() + ms;
    }

    /** Có bảng nào đang nhận phím không. */
    static get busy(): boolean {
        return stack.length > 0;
    }

    add(item: NavItem): NavItem {
        this.items.push(item);
        item.node.on(Node.EventType.MOUSE_ENTER, () => {
            if (this.isOpen) this.focusItem(item);
        });
        return item;
    }

    get isOpen(): boolean {
        return stack.indexOf(this) >= 0;
    }

    /**
     * Bắt đầu nhận phím; first: ô được chọn sẵn (mặc định ô đầu tiên đang hiện).
     * keep = true: quay lại bảng này từ bảng con (Quay lại, KHÔNG) thì giữ ô đang chọn lúc trước.
     */
    open(first?: NavItem, keep = false) {
        MenuNav.listen();
        const i = stack.indexOf(this);
        if (i >= 0) stack.splice(i, 1);
        stack.push(this);
        // setTimeout 0 chạy sau khi sự kiện phím hiện tại đã xử lý xong (kể cả khi game đang tạm dừng)
        this.justOpened = true;
        setTimeout(() => { this.justOpened = false; }, 0);
        const kept = keep && this.items[this.index] && this.visible(this.items[this.index]) ? this.index : -1;
        const start = first ? this.items.indexOf(first) : kept;
        this.index = start >= 0 ? start : this.items.findIndex((it) => this.visible(it));
        this.refresh();
    }

    /** Thôi nhận phím. repaint = false khi bảng đang bị xoá (đổi scene): không vẽ lại nút nữa. */
    close(repaint = true) {
        const i = stack.indexOf(this);
        if (i >= 0) stack.splice(i, 1);
        if (repaint) for (const it of this.items) if (it.node.isValid) it.focus?.(false);
    }

    focusItem(item: NavItem) {
        const i = this.items.indexOf(item);
        if (i < 0) return;
        this.index = i;
        this.refresh();
    }

    get current(): NavItem | null {
        return this.items[this.index] ?? null;
    }

    private visible(it: NavItem): boolean {
        return it.node.isValid && it.node.activeInHierarchy;
    }

    private refresh() {
        this.items.forEach((it, k) => it.focus?.(k === this.index));
    }

    private move(step: number) {
        const n = this.items.length;
        for (let k = 1; k <= n; k++) {
            const j = (this.index + step * k + n * k) % n;
            if (this.visible(this.items[j])) {
                this.index = j;
                this.refresh();
                return;
            }
        }
    }

    private handle(code: number) {
        const it = this.current;
        const p1 = (a: 'jump' | 'attack' | 'up' | 'down' | 'left' | 'right') => Settings.key(0, a) === code;
        if (code === KeyCode.ESCAPE || code === KeyCode.MOBILE_BACK) {
            this.onBack?.();
        } else if (code === KeyCode.ARROW_UP || code === KeyCode.KEY_W || p1('up')) {
            this.move(-1);
        } else if (code === KeyCode.ARROW_DOWN || code === KeyCode.KEY_S || p1('down')) {
            this.move(1);
        } else if (code === KeyCode.ARROW_LEFT || code === KeyCode.KEY_A || p1('left')) {
            if (it && this.visible(it)) it.left?.();
        } else if (code === KeyCode.ARROW_RIGHT || code === KeyCode.KEY_D || p1('right')) {
            if (it && this.visible(it)) it.right?.();
        } else if (code === KeyCode.ENTER || code === KeyCode.NUM_ENTER || code === KeyCode.SPACE || p1('jump') || p1('attack')) {
            if (it && this.visible(it)) it.press?.();
        }
    }

    private static listen() {
        if (listening) return;
        listening = true;
        input.on(Input.EventType.KEY_DOWN, (e: EventKeyboard) => {
            if (PlayerInput.capturing || Date.now() < mutedUntil) return;
            const top = stack[stack.length - 1];
            if (top && !top.justOpened) top.handle(e.keyCode);
        });
    }
}
