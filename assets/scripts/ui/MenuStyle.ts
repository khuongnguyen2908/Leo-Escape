import { BlockInputEvents, Color, Graphics, Label, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import { Sound } from '../core/Sound';
import { Lang, TextKey } from './Lang';
import { MenuNav, NavItem } from './MenuNav';
import { uiLabel, uiNode } from './UiKit';

/**
 * Kiểu chữ menu chính dùng chung cho bảng Tạm dừng, Cài đặt, Thành tích:
 * chữ trắng viền nâu, tiêu đề có đường hoa văn bên dưới, mục đang chọn có khung chọn (selection.png) hoặc hai hoa văn
 * selection_left / selection_right hai đầu dòng; bấm chọn thì vệt sáng ngang chữ loé rất nhẹ một lần.
 * Hình vẽ ở đây không dùng UIOpacity (Graphics không mờ theo UIOpacity): độ trong suốt nằm trong màu tô.
 * Mọi hiệu ứng chạy bằng setInterval để vẫn chạy khi game đang tạm dừng (director.pause).
 */
export const MENU_OUTLINE = new Color(0x46, 0x2c, 0x22, 255);
export const MENU_TEXT = new Color(255, 255, 255, 255);
/** Chữ phụ, giá trị chưa chọn */
export const MENU_SOFT = new Color(236, 226, 212, 255);
const ORNAMENT = new Color(250, 240, 222, 255);
const GLOW = new Color(255, 248, 228, 255);

/** Khung chọn selection.png 385×81: hoa văn hai đầu rộng 70 không giãn */
const SELECTION_ART_WIDTH = 385;
const SELECTION_EDGE = 70;
const SELECTION_H = 81;
/** Khung chọn rộng hơn chữ chừng này */
const SELECTION_EXTRA = 38 + 42 + 24;

/** Bấm chọn một mục: chờ chừng này mili giây (thấy vệt sáng loé) rồi mới chuyển trang / làm việc của mục đó */
export const PRESS_DELAY = 200;

/** Cỡ chữ mục danh sách và dòng cài đặt */
export const ITEM_SIZE = 56;
export const ROW_SIZE = 42;

/** Lớp phủ tối cả khung hình, chặn bấm xuyên xuống. */
export function menuShade(parent: Node, w: number, h: number, alpha = 200): Node {
    const n = uiNode('Shade', parent, w, h);
    n.addComponent(BlockInputEvents);
    paintShade(n.addComponent(Graphics), w, h, alpha);
    return n;
}

/** Vẽ lại lớp phủ tối với độ đậm alpha (0..255). */
export function paintShade(g: Graphics, w: number, h: number, alpha: number) {
    g.clear();
    g.fillColor = new Color(14, 10, 10, alpha);
    g.rect(-w * 1.5, -h * 1.5, w * 3, h * 3);
    g.fill();
}

/** Tiêu đề to + đường hoa văn ngay bên dưới. */
export function menuTitle(parent: Node, key: TextKey, y: number, size = 76): Label {
    const label = uiLabel(parent, '', size, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 5, name: 'Title' });
    Lang.bind(label, key);
    label.node.setPosition(0, y, 0);
    menuDivider(parent, y - size * 0.78, 640);
    return label;
}

/** Đường hoa văn: ảnh art/ui_divider nếu có, chưa có thì vẽ tạm (hai nét mảnh nhạt dần ra hai đầu, hình thoi giữa). */
export function menuDivider(parent: Node, y: number, w = 640): Node {
    const n = uiNode('Divider', parent, w, 40);
    n.setPosition(0, y, 0);
    const g = n.addComponent(Graphics);
    const half = w / 2, gap = 34, slices = 18;
    for (const side of [-1, 1]) {
        for (let k = 0; k < slices; k++) {
            const a = Math.round(235 * Math.pow(1 - k / slices, 1.2));
            g.fillColor = new Color(ORNAMENT.r, ORNAMENT.g, ORNAMENT.b, a);
            const seg = (half - gap) / slices;
            const x0 = side > 0 ? gap + k * seg : -gap - (k + 1) * seg;
            g.rect(x0, -1.5, seg + 0.5, 3);
            g.fill();
        }
        // Vòng xoắn nhỏ cạnh hình thoi
        g.strokeColor = ORNAMENT;
        g.lineWidth = 3;
        g.circle(side * 22, 4, 6);
        g.stroke();
    }
    g.fillColor = ORNAMENT;
    g.moveTo(0, 12); g.lineTo(11, 0); g.lineTo(0, -12); g.lineTo(-11, 0); g.close();
    g.fill();
    resources.load('art/ui_divider/spriteFrame', SpriteFrame, (err, sf) => {
        if (err || !sf || !n.isValid) return;
        g.clear();
        const pic = uiNode('Pic', n);
        pic.addComponent(Sprite).spriteFrame = sf;
        const k = w / sf.rect.width;
        pic.setScale(k, k, 1);
    });
    return n;
}

/** Bề ngang hiện tại của chữ (đã dựng lại theo chữ mới). */
export function textWidth(label: Label): number {
    label.updateRenderData(true);
    return label.node.getComponent(UITransform)!.width * Math.abs(label.node.scale.x);
}

/** Vệt sáng khi bấm: loé ra từ giữa trong FLASH_GROW giây, tắt hẳn sau FLASH_TIME giây; độ sáng lớn nhất (rất nhẹ) */
const FLASH_GROW = 0.22;
const FLASH_TIME = 0.55;
const FLASH_LINE = 95;
const FLASH_GLOW = 9;

/**
 * Vệt sáng ngang chữ khi bấm chọn một mục: nét sáng mảnh (đậm giữa, nhạt dần ra hai đầu) + quầng rất mờ,
 * loé ra từ giữa rồi tắt hẳn (~0.55 giây). Không hiện khi chỉ rê / dời chọn. Nằm sau chữ.
 */
export class MenuShine {
    readonly node: Node;
    private g: Graphics;
    private width = 0;
    private t = 0;
    private timer: ReturnType<typeof setInterval> | null = null;
    private last = 0;

    constructor(parent: Node) {
        this.node = uiNode('Shine', parent, 10, 10);
        this.g = this.node.addComponent(Graphics);
    }

    /** Loé một lần ở (x, y), ôm chữ rộng w. */
    flash(x: number, y: number, w: number) {
        this.node.setPosition(x, y, 0);
        this.width = w;
        this.t = 0;
        if (this.timer) return;
        this.last = Date.now();
        this.timer = setInterval(() => this.tick(), 16);
    }

    hide() {
        this.stop();
        if (this.g.isValid) this.g.clear();
    }

    private stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    private tick() {
        if (!this.g.isValid) {
            this.stop();
            return;
        }
        const now = Date.now();
        this.t += Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        if (this.t >= FLASH_TIME) {
            this.hide();
            return;
        }
        this.draw();
    }

    private draw() {
        const g = this.g;
        g.clear();
        const grow = 1 - Math.pow(1 - Math.min(1, this.t / FLASH_GROW), 3);
        // Sáng nhanh lên rồi tắt dần
        const fade = this.t < FLASH_GROW * 0.5 ? this.t / (FLASH_GROW * 0.5) : Math.max(0, 1 - (this.t - FLASH_GROW * 0.5) / (FLASH_TIME - FLASH_GROW * 0.5));
        const half = (this.width / 2 + 160) * grow;
        for (let i = 0; i < 5; i++) {
            const k = i / 5;
            g.fillColor = new Color(GLOW.r, GLOW.g, GLOW.b, Math.round(FLASH_GLOW * fade));
            g.ellipse(0, 0, Math.max(1, half * (0.35 + 0.65 * (1 - k))), 34 * (0.3 + 0.7 * (1 - k)));
            g.fill();
        }
        const slices = 20;
        for (let k = 0; k < slices; k++) {
            g.fillColor = new Color(255, 252, 240, Math.round(FLASH_LINE * fade * Math.pow(1 - k / slices, 1.4)));
            const seg = half / slices;
            g.rect(k * seg, -1, seg + 0.5, 2);
            g.rect(-(k + 1) * seg, -1, seg + 0.5, 2);
            g.fill();
        }
    }
}

/**
 * Chỗ đang chọn của một bảng: mục danh sách có khung chọn (selection.png, giãn theo chữ);
 * dòng cài đặt có hai hoa văn selection_left / selection_right ở hai đầu dòng. Bấm chọn thì vệt sáng loé (flashItem).
 * Tạo một cái cho mỗi trang, đặt sau chữ (gọi trước khi tạo chữ).
 */
export class MenuFocus {
    private frame: Node;
    private sprite: Sprite;
    private left: Node;
    private right: Node;
    readonly shine: MenuShine;

    constructor(parent: Node) {
        this.frame = uiNode('Selection', parent, SELECTION_ART_WIDTH, SELECTION_H);
        this.sprite = this.frame.addComponent(Sprite);
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.frame.active = false;
        resources.load('art/selection/spriteFrame', SpriteFrame, (err, sf) => {
            if (err || !sf || !this.frame.isValid) return;
            const k = sf.rect.width / SELECTION_ART_WIDTH;
            sf.insetLeft = Math.round(SELECTION_EDGE * k);
            sf.insetRight = Math.round(SELECTION_EDGE * k);
            this.sprite.spriteFrame = sf;
            this.sprite.type = Sprite.Type.SLICED;
        });
        this.left = this.ornament(parent, 'selection_left');
        this.right = this.ornament(parent, 'selection_right');
        this.shine = new MenuShine(parent);
    }

    /** Hoa văn một đầu dòng (ảnh trong art; cỡ gốc 37–39 × 81). */
    private ornament(parent: Node, image: string): Node {
        const n = uiNode(image, parent, 40, SELECTION_H);
        const sp = n.addComponent(Sprite);
        n.active = false;
        resources.load(`art/${image}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (err || !sf || !n.isValid) return;
            sp.spriteFrame = sf;
        });
        return n;
    }

    /** Mục danh sách: khung chọn ôm chữ. */
    onItem(label: Label) {
        const w = textWidth(label);
        const p = label.node.position;
        this.left.active = this.right.active = false;
        this.frame.active = true;
        this.frame.setPosition(p.x, p.y - 4, 0);
        this.frame.getComponent(UITransform)!.setContentSize(Math.max(SELECTION_ART_WIDTH, w + SELECTION_EXTRA), SELECTION_H);
    }

    /** Dòng cài đặt: hoa văn trái / phải ở hai đầu dòng (tâm x, rộng w). */
    onRow(y: number, x: number, w: number) {
        this.frame.active = false;
        this.left.active = this.right.active = true;
        this.left.setPosition(x - w / 2 - 30, y, 0);
        this.right.setPosition(x + w / 2 + 30, y, 0);
    }

    /** Bấm chọn mục có chữ label: vệt sáng loé một lần. */
    flashItem(label: Label) {
        const lw = textWidth(label);
        const lp = label.node.position;
        const ax = label.node.getComponent(UITransform)!.anchorX;
        this.shine.flash(lp.x + lw * (0.5 - ax), lp.y, lw);
    }

    hide() {
        this.frame.active = false;
        this.left.active = this.right.active = false;
        this.shine.hide();
    }
}

/**
 * Một mục chữ trong danh sách (Tiếp tục, Cài đặt, CÓ, KHÔNG, Quay lại...): chọn thì khung + vệt sáng nhảy tới, chữ nảy nhẹ.
 * Rê chuột để chọn (MenuNav lo), chạm / bấm để chạy onPress.
 */
export function menuItem(parent: Node, key: TextKey, y: number, nav: MenuNav, focus: MenuFocus, onPress: () => void, size = ITEM_SIZE): NavItem {
    const label = uiLabel(parent, '', size, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 4, name: `Item_${key}` });
    Lang.bind(label, key);
    label.node.setPosition(0, y, 0);
    let pending = false;
    const press = () => {
        if (pending) return;
        pending = true;
        Sound.play('ui_click', 0.8);
        bump(label.node);
        focus.flashItem(label);
        setTimeout(() => {
            pending = false;
            if (label.isValid) onPress();
        }, PRESS_DELAY);
    };
    const item: NavItem = {
        node: label.node,
        press,
        focus: (on) => { if (on) focus.onItem(label); },
    };
    label.node.on(Node.EventType.TOUCH_END, () => {
        if (!nav.isOpen) return;
        nav.focusItem(item);
        press();
    });
    nav.add(item);
    return item;
}

/** Chữ nảy lên một nhịp (chạy bằng setInterval vì game có thể đang tạm dừng). */
export function bump(n: Node) {
    const start = Date.now();
    const timer = setInterval(() => {
        if (!n.isValid) {
            clearInterval(timer);
            return;
        }
        const t = (Date.now() - start) / 1000;
        const k = t < 0.08 ? 1 + 0.12 * (t / 0.08) : 1 + 0.12 * Math.max(0, 1 - (t - 0.08) / 0.14);
        n.setScale(k, k, 1);
        if (t > 0.22) {
            n.setScale(1, 1, 1);
            clearInterval(timer);
        }
    }, 16);
}
