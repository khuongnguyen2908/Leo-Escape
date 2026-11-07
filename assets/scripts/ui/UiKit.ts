import { BlockInputEvents, Color, EventTouch, Graphics, Label, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { keepSystemFont, useGameFont } from './GameFont';
import { Sound } from '../core/Sound';

/**
 * Các mảnh giao diện vẽ bằng code (nút, khung, thanh trượt, công tắc) cho menu và màn chọn,
 * cùng tông nâu kem với nút cảm ứng. Không phải component; gọi từ PauseMenu, LandingScreen, CharacterSelect.
 * Chữ có dấu tiếng Việt dùng font hệ thống vì font Super Bouncer thiếu nhiều chữ (ẾỤẶỀƯỢ...).
 */
export const UI = {
    brown: new Color(78, 60, 56, 255),
    brownDown: new Color(110, 86, 78, 255),
    cream: new Color(250, 240, 222, 255),
    creamDim: new Color(214, 200, 182, 255),
    text: new Color(70, 52, 48, 255),
    accent: new Color(240, 165, 72, 255),
    green: new Color(0x3b, 0x71, 0x13, 255),
    dim: new Color(20, 14, 12, 170),
    p1: new Color(240, 150, 60, 255),
    p2: new Color(80, 150, 225, 255),
};

const _p = new Vec3();

export function uiNode(name: string, parent: Node, w = 0, h = 0): Node {
    const n = new Node(name);
    n.layer = parent.layer;
    parent.addChild(n);
    const ut = n.addComponent(UITransform);
    if (w > 0 || h > 0) ut.setContentSize(w, h);
    return n;
}

/**
 * Chữ: chuỗi chỉ có chữ không dấu thì dùng font game, có dấu tiếng Việt thì dùng font hệ thống.
 * Chữ đổi qua lại giữa có dấu và không dấu (ô phím) thì truyền gameFont = false để luôn dùng font hệ thống.
 */
export function setText(label: Label, text: string, gameFont = true) {
    label.string = text;
    if (text === '') return;
    if (gameFont && /^[\x20-\x7E]*$/.test(text)) {
        keepSystemFont(label, false);
        useGameFont(label);
    } else {
        keepSystemFont(label, true);
        label.useSystemFont = true;
        label.fontFamily = 'Arial';
        label.isBold = true;
    }
}

export function uiLabel(parent: Node, text: string, size: number, color: Color, opts: { outline?: Color; outlineWidth?: number; name?: string } = {}): Label {
    const n = uiNode(opts.name ?? 'Text', parent);
    const label = n.addComponent(Label);
    label.fontSize = size;
    label.lineHeight = Math.round(size * 1.2);
    label.color = color;
    if (opts.outline) {
        label.enableOutline = true;
        label.outlineWidth = opts.outlineWidth ?? 4;
        label.outlineColor = opts.outline;
    }
    setText(label, text);
    return label;
}

/** Lớp phủ tối cả khung hình, chặn bấm xuyên xuống dưới. */
export function uiDim(parent: Node, w: number, h: number): Node {
    const n = uiNode('Dim', parent, w, h);
    n.addComponent(BlockInputEvents);
    const g = n.addComponent(Graphics);
    g.fillColor = UI.dim;
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    return n;
}

/** Khung kem viền nâu bo góc. */
export function uiPanel(parent: Node, w: number, h: number, name = 'Panel'): Node {
    const n = uiNode(name, parent, w, h);
    n.addComponent(BlockInputEvents);
    const g = n.addComponent(Graphics);
    g.fillColor = UI.cream;
    g.strokeColor = UI.brown;
    g.lineWidth = 8;
    g.roundRect(-w / 2, -h / 2, w, h, 36);
    g.fill();
    g.stroke();
    return n;
}

/** Nút tròn nhỏ có mũi tên ← (quay lại trên điện thoại, nơi không có phím Esc). */
export function uiBackCircle(parent: Node, x: number, y: number, onClick: () => void, r = 44): Node {
    const n = uiNode('BackCircle', parent, r * 2 + 16, r * 2 + 16);
    n.setPosition(x, y, 0);
    const g = n.addComponent(Graphics);
    const paint = (down: boolean) => {
        if (!g.isValid) return;
        g.clear();
        g.fillColor = down ? UI.brownDown : UI.brown;
        g.circle(0, 0, r);
        g.fill();
        g.strokeColor = UI.cream;
        g.lineWidth = 5;
        g.circle(0, 0, r);
        g.stroke();
        const k = r * 0.42;
        g.lineWidth = 8;
        g.lineCap = Graphics.LineCap.ROUND;
        g.lineJoin = Graphics.LineJoin.ROUND;
        g.moveTo(k, 0);
        g.lineTo(-k, 0);
        g.moveTo(-k * 0.15, k * 0.85);
        g.lineTo(-k, 0);
        g.lineTo(-k * 0.15, -k * 0.85);
        g.stroke();
    };
    paint(false);
    n.on(Node.EventType.TOUCH_START, () => paint(true));
    n.on(Node.EventType.TOUCH_CANCEL, () => paint(false));
    n.on(Node.EventType.TOUCH_END, () => {
        paint(false);
        Sound.play('ui_back', 0.8);
        onClick();
    });
    return n;
}

export interface UiButton {
    node: Node;
    label: Label;
    setText(text: string): void;
    /** Đang được chọn bằng bàn phím: viền cam. */
    setFocus(on: boolean): void;
    /** Bấm bằng bàn phím: nút lún xuống một nhịp rồi gọi onClick. */
    click(): void;
}

/** Nút bo góc có chữ. Có frame thì dùng ảnh đó làm nền thay cho hình vẽ. */
export function uiButton(parent: Node, text: string, w: number, h: number, onClick: () => void,
    opts: { frame?: SpriteFrame | null; fontSize?: number; name?: string; sound?: string } = {}): UiButton {
    // Tiếng khi bấm: mặc định ui_click; nút quay lại / huỷ truyền 'ui_back'; '' = không kêu
    const sound = opts.sound ?? 'ui_click';
    const n = uiNode(opts.name ?? 'Button', parent, w, h);
    let focus = false;
    let down = false;
    let paint: () => void;
    if (opts.frame) {
        const pic = uiNode('Pic', n);
        const sp = pic.addComponent(Sprite);
        sp.spriteFrame = opts.frame;
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        pic.getComponent(UITransform)!.setContentSize(w, h);
        const ring = n.addComponent(Graphics);
        paint = () => {
            if (!ring.isValid) return; // nút đã bị xoá (đổi scene)
            ring.clear();
            if (focus) {
                ring.strokeColor = UI.accent;
                ring.lineWidth = 8;
                ring.roundRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, h / 2);
                ring.stroke();
            }
            pic.setScale(down ? 0.94 : 1, down ? 0.94 : 1, 1);
        };
    } else {
        const g = n.addComponent(Graphics);
        paint = () => {
            if (!g.isValid) return; // nút đã bị xoá (đổi scene)
            g.clear();
            g.fillColor = down ? UI.brownDown : UI.brown;
            g.strokeColor = focus ? UI.accent : UI.cream;
            g.lineWidth = focus ? 7 : 4;
            g.roundRect(-w / 2, -h / 2, w, h, Math.min(24, h / 2));
            g.fill();
            g.stroke();
        };
    }
    const label = uiLabel(n, text, opts.fontSize ?? 40, opts.frame ? Color.WHITE : UI.cream,
        { outline: opts.frame ? UI.green : undefined, outlineWidth: opts.frame ? 6 : 0 });
    if (opts.frame) label.node.setPosition(0, -h * 0.04, 0);
    paint();
    n.on(Node.EventType.TOUCH_START, () => { down = true; paint(); });
    n.on(Node.EventType.TOUCH_CANCEL, () => { down = false; paint(); });
    n.on(Node.EventType.TOUCH_END, () => {
        down = false;
        paint();
        if (sound) Sound.play(sound, 0.8);
        onClick();
    });
    return {
        node: n,
        label,
        setText: (t: string) => setText(label, t),
        setFocus: (on: boolean) => {
            focus = on;
            paint();
        },
        click: () => {
            // setTimeout chạy cả khi game đang tạm dừng (director.pause)
            down = true;
            paint();
            setTimeout(() => {
                down = false;
                if (n.isValid) paint();
            }, 90);
            if (sound) Sound.play(sound, 0.8);
            onClick();
        },
    };
}

/** Ô điều hướng bàn phím (MenuNav) cho một nút. */
export function navButton(b: UiButton): { node: Node; press: () => void; focus: (on: boolean) => void } {
    return { node: b.node, press: () => b.click(), focus: (on) => b.setFocus(on) };
}

export interface UiSlider {
    node: Node;
    set(v: number): void;
    setFocus(on: boolean): void;
    /** Tăng / giảm d (bàn phím A/D), có gọi onChange. */
    nudge(d: number): void;
}

/** Thanh trượt 0..1. */
export function uiSlider(parent: Node, w: number, value: number, onChange: (v: number) => void): UiSlider {
    const h = 56;
    const n = uiNode('Slider', parent, w + 40, h);
    const g = n.addComponent(Graphics);
    let v = value;
    let focus = false;
    const draw = () => {
        g.clear();
        if (focus) {
            g.strokeColor = UI.accent;
            g.lineWidth = 5;
            g.roundRect(-w / 2 - 34, -h / 2 - 4, w + 68, h + 8, (h + 8) / 2);
            g.stroke();
        }
        g.fillColor = UI.creamDim;
        g.roundRect(-w / 2, -8, w, 16, 8);
        g.fill();
        g.fillColor = UI.accent;
        g.roundRect(-w / 2, -8, w * v, 16, 8);
        g.fill();
        g.fillColor = UI.brown;
        g.circle(-w / 2 + w * v, 0, 20);
        g.fill();
        g.strokeColor = UI.cream;
        g.lineWidth = 4;
        g.circle(-w / 2 + w * v, 0, 20);
        g.stroke();
    };
    const ut = n.getComponent(UITransform)!;
    const pick = (e: EventTouch) => {
        const loc = e.getUILocation();
        _p.set(loc.x, loc.y, 0);
        ut.convertToNodeSpaceAR(_p, _p);
        v = Math.max(0, Math.min(1, (_p.x + w / 2) / w));
        draw();
        onChange(v);
    };
    n.on(Node.EventType.TOUCH_START, pick);
    n.on(Node.EventType.TOUCH_MOVE, pick);
    draw();
    return {
        node: n,
        set: (x: number) => { v = x; draw(); },
        setFocus: (on: boolean) => { focus = on; draw(); },
        nudge: (d: number) => {
            v = Math.max(0, Math.min(1, Math.round((v + d) * 20) / 20));
            draw();
            onChange(v);
        },
    };
}

export interface UiToggle {
    node: Node;
    set(v: boolean): void;
    setFocus(on: boolean): void;
    /** Bật ↔ tắt (bàn phím), có gọi onChange. */
    flip(): void;
}

/** Chữ BẬT / TẮT của công tắc (Lang gắn vào để đổi theo ngôn ngữ). */
export const toggleText = { on: 'BẬT', off: 'TẮT' };

/** Công tắc bật/tắt. */
export function uiToggle(parent: Node, value: boolean, onChange: (v: boolean) => void): UiToggle {
    const w = 120, h = 56;
    const n = uiNode('Toggle', parent, w, h);
    const g = n.addComponent(Graphics);
    const label = uiLabel(n, '', 24, Color.WHITE);
    let v = value;
    let focus = false;
    const draw = () => {
        g.clear();
        if (focus) {
            g.strokeColor = UI.accent;
            g.lineWidth = 5;
            g.roundRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, (h + 16) / 2);
            g.stroke();
        }
        g.fillColor = v ? UI.green : UI.creamDim;
        g.roundRect(-w / 2, -h / 2, w, h, h / 2);
        g.fill();
        g.fillColor = UI.cream;
        g.strokeColor = UI.brown;
        g.lineWidth = 4;
        const x = v ? w / 2 - h / 2 : -w / 2 + h / 2;
        g.circle(x, 0, h / 2 - 6);
        g.fill();
        g.stroke();
        setText(label, v ? toggleText.on : toggleText.off);
        label.color = v ? Color.WHITE : UI.text;
        label.node.setPosition(v ? -18 : 18, 0, 0);
    };
    const flip = () => {
        v = !v;
        draw();
        onChange(v);
    };
    n.on(Node.EventType.TOUCH_END, flip);
    draw();
    return {
        node: n,
        set: (x: boolean) => { v = x; draw(); },
        setFocus: (on: boolean) => { focus = on; draw(); },
        flip,
    };
}
