import { _decorator, Color, Component, EventKeyboard, Graphics, Input, input, KeyCode, Label, Node, resources, Sprite, SpriteFrame, sys, Tween, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
import { DIFFICULTY_COUNT } from '../core/Difficulty';
import { Sound } from '../core/Sound';
import { PlayerInput } from '../player/PlayerInput';
import { keyHintRow } from './KeyCap';
import { Lang, T, TextKey } from './Lang';
import { UI, uiBackCircle, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

/** Màu dải của từng mức (CASUAL vàng rêu, NORMAL cam, MANIAC đỏ thẫm); nhãn độ khó trên ô lưu dùng chung */
export const DIFF_COLORS = [
    new Color(150, 128, 24, 255),
    new Color(196, 88, 18, 255),
    new Color(150, 16, 52, 255),
];
/** Màu tên mức */
const NAME_COLORS = [
    new Color(246, 236, 196, 255),
    new Color(255, 150, 72, 255),
    new Color(255, 92, 140, 255),
];
const TITLE_OUTLINE = new Color(0x2c, 0x1d, 0x17, 255);
const SHADE = new Color(0, 0, 0, 255);
/** Dải ngang: cao, khoảng cách tâm hai dải */
const BAND_H = 128;
const BAND_STEP = 140;
/** Tên (mép trái), mô tả (mép trái) */
const NAME_X = -230;
const DESC_X = 290;
const DESC_W = 640;
/** Biểu tượng độ khó: ảnh đầu boss, mức n có n cái xếp ngang sát bên trái tên mức */
const BOSS_ICON = 'art/MG_icon_boss';
/** Phóng so với cỡ gốc của ảnh, cách giữa hai icon, icon gần tên nhất cách mép trái tên */
const ICON_SCALE = 1.4;
const ICON_GAP = 6;
const ICON_TO_NAME = 24;
/** Cỡ hình tạm (chưa có ảnh) */
const ICON_FALLBACK = 88;

interface Band {
    root: Node;
    bg: Graphics;
    content: UIOpacity;
    icons: Node[];
}

/**
 * Trang chọn độ khó (ô lưu mới, sau trang ô lưu): 3 dải ngang chạy hết bề ngang, mỗi dải có biểu tượng trôi nhấp nhô,
 * tên mức và một dòng mô tả. Dải đang chọn sáng rõ và cao hơn, hai dải kia mờ. Biểu tượng: ảnh MG_icon_boss trong
 * assets/resources/art, mức 1 một cái, mức 2 hai cái, mức 3 ba cái (chưa có ảnh thì vẽ tạm). ↑ / ↓ hoặc rê chuột để chọn; Enter / Nhảy / Đánh / chạm để vào;
 * Esc (điện thoại: nút ← tròn góc trên trái) quay lại trang ô lưu. LandingScreen tạo trang này và nghe onPick / onBack.
 */
@ccclass('DifficultyPage')
export class DifficultyPage extends Component {
    onPick: ((level: number) => void) | null = null;
    onBack: (() => void) | null = null;

    private bands: Band[] = [];
    private focus = 1;
    private time = 0;
    private acceptAt = 0;
    private picked = false;

    onLoad() {
        const d = view.getDesignResolutionSize();
        // Nền tối phủ lên nền menu (bụi menu vẫn thấy mờ mờ)
        const shade = uiNode('Shade', this.node, d.width, d.height);
        const sg = shade.addComponent(Graphics);
        sg.fillColor = new Color(0, 0, 0, 170);
        sg.rect(-d.width * 1.5, -d.height * 1.5, d.width * 3, d.height * 3);
        sg.fill();
        const title = uiLabel(this.node, '', 34, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 3, name: 'Title' });
        Lang.bind(title, 'diff.title');
        title.node.setPosition(0, BAND_STEP + BAND_H / 2 + 70, 0);
        for (let i = 0; i < DIFFICULTY_COUNT; i++) this.bands.push(this.makeBand(i));
        const note = uiLabel(this.node, '', 32, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 3, name: 'Note' });
        Lang.bind(note, 'diff.note');
        note.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        note.node.setPosition(DESC_X, -BAND_STEP - BAND_H / 2 - 60, 0);
        if (sys.isMobile) uiBackCircle(this.node, -d.width / 2 + 90, d.height / 2 - 90, () => this.back(), 44);
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    onEnable() {
        this.picked = false;
        this.acceptAt = Date.now() + 250;
        PlayerInput.clearQueues();
        this.buildHints();
        this.setFocus(this.focus, false);
        // Các dải trượt vào từ bên phải lần lượt
        const d = view.getDesignResolutionSize();
        this.bands.forEach((b, i) => {
            const y = this.bandY(i);
            Tween.stopAllByTarget(b.root);
            b.root.setPosition(d.width, y, 0);
            tween(b.root).delay(0.06 * i).to(0.35, { position: new Vec3(0, y, 0) }, { easing: 'quadOut' }).start();
        });
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    update(dt: number) {
        this.time += dt;
        // Biểu tượng trôi nhấp nhô, mỗi cái lệch nhịp nhau (cả trong cùng một dải); dải đang chọn trôi mạnh hơn
        this.bands.forEach((b, i) => {
            const on = i === this.focus;
            const amp = on ? 12 : 6;
            b.icons.forEach((icon, k) => {
                const t = this.time * 1.7 + i * 2.1 + k * 1.3;
                icon.setPosition(icon.position.x, Math.sin(t) * amp, 0);
                icon.angle = Math.sin(t * 0.8 + 1) * (on ? 6 : 3);
            });
        });
        if (this.picked || Date.now() < this.acceptAt) return;
        const c = PlayerInput.merged;
        if (c.consumeUp()) this.setFocus((this.focus + DIFFICULTY_COUNT - 1) % DIFFICULTY_COUNT);
        if (c.consumeDown()) this.setFocus((this.focus + 1) % DIFFICULTY_COUNT);
        if (c.consumeJump() || c.consumeAttack()) this.pick(this.focus);
    }

    /** Esc / nút ←: về trang ô lưu. */
    back() {
        if (this.picked) return;
        Sound.play('ui_back', 0.8);
        this.onBack?.();
    }

    private onKey(e: EventKeyboard) {
        if (!this.node.activeInHierarchy || this.picked || Date.now() < this.acceptAt) return;
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.NUM_ENTER) this.pick(this.focus);
    }

    private bandY(i: number): number {
        return ((DIFFICULTY_COUNT - 1) / 2 - i) * BAND_STEP;
    }

    private buildHints() {
        this.node.getChildByName('KeyHints')?.destroy();
        if (sys.isMobile) return;
        const d = view.getDesignResolutionSize();
        keyHintRow(this.node, [
            [['ENTER'], T('slots.hConfirm')],
            [['ESC'], T('slots.hBack')],
        ], -d.height / 2 + 60, 44, 28, UI.cream, d.width / 2 - 60);
    }

    private makeBand(i: number): Band {
        const d = view.getDesignResolutionSize();
        const root = uiNode(`Band${i + 1}`, this.node, d.width, BAND_H);
        root.setPosition(0, this.bandY(i), 0);
        const bg = uiNode('Bg', root, d.width, BAND_H).addComponent(Graphics);
        const content = uiNode('Content', root).addComponent(UIOpacity);
        const box = content.node;
        // Biểu tượng: i + 1 đầu boss xếp ngang, cái cuối sát bên trái tên mức (vị trí đặt lại khi ảnh tải xong)
        const icons: Node[] = [];
        const place = (w: number) => {
            icons.forEach((icon, k) => {
                const fromName = icons.length - 1 - k;
                icon.setPosition(NAME_X - ICON_TO_NAME - w / 2 - fromName * (w + ICON_GAP), icon.position.y, 0);
            });
        };
        for (let k = 0; k <= i; k++) {
            const icon = uiNode(`Icon${k + 1}`, box, ICON_FALLBACK, ICON_FALLBACK);
            this.drawIcon(icon.addComponent(Graphics));
            icons.push(icon);
        }
        place(ICON_FALLBACK);
        resources.load(`${BOSS_ICON}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (err || !sf || !box.isValid) return;
            for (const icon of icons) {
                icon.getComponent(Graphics)?.clear();
                // Ảnh trên node con (không gắn Sprite cùng node với Graphics)
                const pic = uiNode('Pic', icon);
                pic.addComponent(Sprite).spriteFrame = sf;
                pic.setScale(ICON_SCALE, ICON_SCALE, 1);
            }
            place(sf.rect.width * ICON_SCALE);
        });
        const name = uiLabel(box, '', 84, NAME_COLORS[i], { outline: TITLE_OUTLINE, outlineWidth: 3, name: 'Name' });
        Lang.bind(name, `diff.${i}` as TextKey);
        name.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        name.node.setPosition(NAME_X, 0, 0);
        const desc = uiLabel(box, '', 32, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 3, name: 'Desc' });
        desc.overflow = Label.Overflow.RESIZE_HEIGHT;
        desc.horizontalAlign = Label.HorizontalAlign.LEFT;
        desc.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        desc.node.getComponent(UITransform)!.width = DESC_W;
        Lang.bind(desc, `diff.${i}.d` as TextKey);
        desc.node.setPosition(DESC_X, 0, 0);
        root.on(Node.EventType.MOUSE_ENTER, () => { if (!this.picked) this.setFocus(i); });
        root.on(Node.EventType.TOUCH_END, () => {
            if (this.picked || Date.now() < this.acceptAt) return;
            this.setFocus(i, false);
            this.pick(i);
        });
        return { root, bg, content, icons };
    }

    /** Hình tạm khi chưa có ảnh MG_icon_boss: đầu lâu xám viền nâu. */
    private drawIcon(g: Graphics) {
        const r = ICON_FALLBACK * 0.4;
        g.clear();
        g.lineWidth = 5;
        g.strokeColor = UI.brown;
        g.fillColor = new Color(190, 184, 186, 255);
        g.circle(0, 0, r);
        g.fill();
        g.stroke();
        g.fillColor = new Color(60, 20, 30, 255);
        g.circle(-r * 0.38, r * 0.05, r * 0.25);
        g.circle(r * 0.38, r * 0.05, r * 0.25);
        g.fill();
    }

    /** Dải ngang: đậm dần từ trái sang (mép trái tan vào nền), viền sáng trên dưới khi đang chọn. */
    private paintBand(b: Band, i: number, on: boolean) {
        const g = b.bg;
        if (!g.isValid) return;
        const d = view.getDesignResolutionSize();
        // Dải đang chọn cao hơn (vẽ cao lên chứ không phóng node, để chữ không bị kéo dẹt)
        const w = d.width * 1.4, h = on ? BAND_H * 1.1 : BAND_H * 0.92;
        const base = DIFF_COLORS[i];
        const top = on ? 235 : 105;
        const slices = 28, fadeSlices = 9;
        g.clear();
        for (let k = 0; k < slices; k++) {
            const a = k < fadeSlices ? top * (k + 1) / (fadeSlices + 1) : top;
            g.fillColor = new Color(base.r, base.g, base.b, Math.round(a));
            g.rect(-w / 2 + (w / slices) * k, -h / 2, w / slices + 1, h);
            g.fill();
        }
        if (on) {
            g.fillColor = new Color(255, 255, 255, 60);
            g.rect(-w / 2, h / 2 - 5, w, 5);
            g.rect(-w / 2, -h / 2, w, 5);
            g.fill();
        } else {
            g.fillColor = new Color(SHADE.r, SHADE.g, SHADE.b, 70);
            g.rect(-w / 2, -h / 2, w, h);
            g.fill();
        }
    }

    private setFocus(i: number, sound = true) {
        if (i !== this.focus && sound) Sound.play('ui_move', 0.6);
        this.focus = i;
        this.bands.forEach((b, k) => {
            const on = k === i;
            this.paintBand(b, k, on);
            Tween.stopAllByTarget(b.content);
            tween(b.content).to(0.12, { opacity: on ? 255 : 140 }).start();
            const box = b.content.node;
            Tween.stopAllByTarget(box);
            tween(box).to(0.12, { scale: on ? new Vec3(1.06, 1.06, 1) : new Vec3(0.94, 0.94, 1) }).start();
        });
    }

    private pick(i: number) {
        if (this.picked) return;
        this.picked = true;
        Sound.play('ui_click', 0.9);
        const b = this.bands[i];
        // Dải được chọn nảy một nhịp, hai dải kia mờ đi, rồi mới vào
        const box = b.content.node;
        Tween.stopAllByTarget(box);
        tween(box).to(0.08, { scale: new Vec3(1.14, 1.14, 1) }).to(0.12, { scale: new Vec3(1.06, 1.06, 1) }).start();
        this.bands.forEach((o, k) => {
            if (k === i) return;
            Tween.stopAllByTarget(o.content);
            tween(o.content).to(0.25, { opacity: 40 }).start();
        });
        setTimeout(() => {
            if (this.isValid) this.onPick?.(i);
        }, 380);
    }
}
