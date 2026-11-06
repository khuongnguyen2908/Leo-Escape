import { _decorator, Color, Component, EventKeyboard, Graphics, Input, input, KeyCode, Label, Node, resources, Sprite, SpriteFrame, sys, Tween, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
import { Sound } from '../core/Sound';
import { T } from './Lang';
import { setText, UI, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

const BLACK = new Color(0, 0, 0, 255);
const TITLE_OUTLINE = new Color(0x46, 0x2c, 0x22, 255);
/** Ảnh logo trong assets/resources/art (chưa có thì hiện khung chữ LOGO 1 / LOGO 2) */
const LOGOS = ['boot_logo1', 'boot_logo2'];
/** Logo: hiện dần, đứng, mờ dần (giây) */
const LOGO_IN = 0.45;
const LOGO_HOLD = 1.1;
const LOGO_OUT = 0.45;
/** Thanh tải chạy ít nhất chừng này giây (tải nhanh quá thì người chơi không kịp thấy) */
const LOAD_MIN = 1.4;
/** Thư mục tải trước trong lúc chạy thanh tải (hiệu ứng ảnh nhiều khung) */
const PRELOAD_DIR = 'art/fx';
/** Nhạc menu (assets/resources/sounds/bgm.wav): bật khi thanh tải chạy xong */
export const MENU_MUSIC = 'bgm';

type Step = 'logo' | 'loading' | 'press' | 'done';

/**
 * Màn khởi động, chạy một lần khi mở game (LandingScreen gắn vào node Landing):
 *   1. Logo 1, 2. Logo 2 (màn đen; bấm phím / chạm để bỏ qua logo đang hiện),
 *   3. Banner (nền + logo game của Landing) kèm thanh tải, tải trước ảnh hiệu ứng,
 *   4. Thanh tải đổi thành chữ PRESS ANY BUTTON nhấp nháy; bấm phím / chạm thì gọi onDone (LandingScreen cho menu rơi xuống).
 */
@ccclass('BootScreen')
export class BootScreen extends Component {
    onDone: (() => void) | null = null;

    private root!: Node;
    private black!: UIOpacity;
    private step: Step = 'logo';
    private logoIndex = -1;
    private logoNode: Node | null = null;
    private skipLogo: (() => void) | null = null;
    private bar: Node | null = null;
    private barFill: Graphics | null = null;
    private barLabel: Label | null = null;
    private progress = 0;
    private shown = 0;
    private loadTime = 0;
    private loaded = false;
    private press: Node | null = null;
    private pressTime = 0;
    private acceptAt = 0;

    onLoad() {
        const d = view.getDesignResolutionSize();
        // Lớp trên cùng của Landing: màn đen cho logo + chỗ đặt thanh tải, chữ PRESS
        this.root = uiNode('Boot', this.node, d.width, d.height);
        this.root.setSiblingIndex(this.node.children.length - 1);
        const bg = uiNode('Black', this.root, d.width * 3, d.height * 3);
        const g = bg.addComponent(Graphics);
        g.fillColor = BLACK;
        g.rect(-d.width * 1.5, -d.height * 1.5, d.width * 3, d.height * 3);
        g.fill();
        this.black = bg.addComponent(UIOpacity);
        this.root.on(Node.EventType.TOUCH_END, this.onAny, this);
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
        this.nextLogo();
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    update(dt: number) {
        if (this.step === 'loading') {
            this.loadTime += dt;
            // Thanh chạy theo tiến độ tải thật nhưng không nhanh hơn LOAD_MIN giây
            const target = Math.min(this.progress, this.loadTime / LOAD_MIN);
            this.shown += (target - this.shown) * Math.min(1, dt * 10);
            if (this.loaded && this.loadTime >= LOAD_MIN) this.shown = Math.max(this.shown, target);
            this.paintBar(this.shown);
            if (this.loaded && this.loadTime >= LOAD_MIN && this.shown > 0.995) this.showPress();
        } else if (this.step === 'press' && this.press) {
            this.pressTime += dt;
            const op = this.press.getComponent(UIOpacity)!;
            op.opacity = Math.round(140 + 115 * Math.abs(Math.cos(this.pressTime * 2.6)));
        }
    }

    // ---------- Logo ----------

    private nextLogo() {
        this.logoIndex++;
        if (this.logoNode && this.logoNode.isValid) this.logoNode.destroy();
        this.logoNode = null;
        if (this.logoIndex >= LOGOS.length) {
            this.startLoading();
            return;
        }
        const n = uiNode(`Logo${this.logoIndex + 1}`, this.root, 900, 500);
        const op = n.addComponent(UIOpacity);
        op.opacity = 0;
        this.logoNode = n;
        // Khung tạm: viền nét đứt + chữ LOGO 1 / LOGO 2 (có ảnh thì thay)
        const g = n.addComponent(Graphics);
        g.strokeColor = UI.creamDim;
        g.lineWidth = 6;
        const w = 520, h = 300;
        for (let x = -w / 2; x < w / 2; x += 40) {
            g.moveTo(x, h / 2); g.lineTo(Math.min(x + 22, w / 2), h / 2);
            g.moveTo(x, -h / 2); g.lineTo(Math.min(x + 22, w / 2), -h / 2);
        }
        for (let y = -h / 2; y < h / 2; y += 40) {
            g.moveTo(-w / 2, y); g.lineTo(-w / 2, Math.min(y + 22, h / 2));
            g.moveTo(w / 2, y); g.lineTo(w / 2, Math.min(y + 22, h / 2));
        }
        g.stroke();
        const label = uiLabel(n, `LOGO ${this.logoIndex + 1}`, 80, UI.cream);
        resources.load(`art/${LOGOS[this.logoIndex]}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (err || !sf || !n.isValid) return;
            g.clear();
            label.node.active = false;
            const pic = uiNode('Pic', n);
            pic.addComponent(Sprite).spriteFrame = sf;
            const k = Math.min(1, 900 / sf.rect.width, 500 / sf.rect.height);
            pic.setScale(k, k, 1);
        });
        let skipped = false;
        const out = () => {
            if (skipped || !n.isValid) return;
            skipped = true;
            this.skipLogo = null;
            Tween.stopAllByTarget(op);
            tween(op).to(LOGO_OUT * (op.opacity / 255), { opacity: 0 }).call(() => this.nextLogo()).start();
        };
        this.skipLogo = out;
        tween(op).to(LOGO_IN, { opacity: 255 }).delay(LOGO_HOLD).call(out).start();
    }

    // ---------- Banner + thanh tải ----------

    private startLoading() {
        this.step = 'loading';
        // Màn đen mờ đi, lộ banner (nền + logo game của Landing)
        tween(this.black).to(0.5, { opacity: 0 }).start();
        const d = view.getDesignResolutionSize();
        const bar = uiNode('LoadBar', this.root, 760, 40);
        bar.setPosition(0, -d.height / 2 + 150, 0);
        this.bar = bar;
        this.barFill = bar.addComponent(Graphics);
        this.barLabel = uiLabel(bar, '', 30, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 3 });
        this.barLabel.node.setPosition(0, 50, 0);
        this.paintBar(0);
        const dirs = resources.getDirWithPath(PRELOAD_DIR, SpriteFrame);
        if (dirs.length === 0) {
            this.progress = 1;
            this.loaded = true;
            return;
        }
        resources.preloadDir(PRELOAD_DIR, (done, total) => {
            this.progress = total > 0 ? done / total : 1;
        }, () => {
            this.progress = 1;
            this.loaded = true;
        });
    }

    private paintBar(t: number) {
        const g = this.barFill;
        if (!g || !g.isValid) return;
        const w = 760, h = 40;
        g.clear();
        g.fillColor = UI.brown;
        g.roundRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 16);
        g.fill();
        g.fillColor = UI.creamDim;
        g.roundRect(-w / 2, -h / 2, w, h, 12);
        g.fill();
        if (t > 0.01) {
            g.fillColor = UI.accent;
            g.roundRect(-w / 2, -h / 2, Math.max(24, w * Math.min(1, t)), h, 12);
            g.fill();
        }
        if (this.barLabel) setText(this.barLabel, T('boot.loading', Math.round(Math.min(1, t) * 100)));
    }

    // ---------- PRESS ANY BUTTON ----------

    private showPress() {
        this.step = 'press';
        Sound.music(MENU_MUSIC);
        if (this.bar) this.bar.active = false;
        const d = view.getDesignResolutionSize();
        const label = uiLabel(this.root, '', 56, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4, name: 'Press' });
        setText(label, T(sys.isMobile ? 'boot.tap' : 'boot.press'));
        label.node.setPosition(0, -d.height / 2 + 160, 0);
        label.node.addComponent(UIOpacity);
        label.node.setScale(0.8, 0.8, 1);
        tween(label.node).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        this.press = label.node;
        // Phím đang giữ từ lúc bỏ qua logo không tính là "bấm phím bất kỳ"
        this.acceptAt = Date.now() + 250;
    }

    private onKey(e: EventKeyboard) {
        // Esc để mở Cài đặt / thoát không tính
        if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.MOBILE_BACK) return;
        this.onAny();
    }

    private onAny() {
        if (this.step === 'logo') {
            this.skipLogo?.();
            return;
        }
        if (this.step !== 'press' || Date.now() < this.acceptAt) return;
        this.step = 'done';
        Sound.play('ui_start', 0.9);
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
        const op = this.press?.getComponent(UIOpacity);
        if (op) tween(op).to(0.2, { opacity: 0 }).start();
        // Gọi sau khi sự kiện phím này xử lý xong, để menu không nhận luôn chính lần bấm này
        setTimeout(() => {
            if (!this.isValid) return;
            const done = this.onDone;
            this.root.destroy();
            this.destroy();
            done?.();
        }, 0);
    }
}
