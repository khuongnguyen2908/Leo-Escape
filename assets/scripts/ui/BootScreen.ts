import { _decorator, Color, Component, EventKeyboard, Graphics, Input, input, instantiate, KeyCode, Label, Node, resources, Sprite, SpriteFrame, Tween, tween, UIOpacity, Vec3, view } from 'cc';
import { Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { menuDivider, MENU_OUTLINE, MENU_SOFT } from './MenuStyle';
import { PatternBackdrop } from './PatternBackdrop';
import { pawIcon, PawIcon } from './PawIcon';
import { T } from './Lang';
import { setText, UI, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

const BLACK = new Color(0, 0, 0, 255);
const TITLE_OUTLINE = new Color(0x46, 0x2c, 0x22, 255);
/** Chữ START khi scene không có node Start để nhân bản: cỡ 90, viền 7 xanh lá */
const START_OUTLINE = new Color(0x3b, 0x71, 0x13, 255);
/** Ảnh logo trong assets/resources/art (chưa có thì hiện khung chữ LOGO 1 / LOGO 2) */
const LOGOS = ['boot_logo1', 'boot_logo2'];
/** Logo: hiện dần, đứng, mờ dần (giây) — mỗi logo 3 giây */
const LOGO_IN = 1;
const LOGO_HOLD = 1;
const LOGO_OUT = 1;
/** Màn thông báo tự lưu: hiện dần, đứng, mờ dần (giây); bấm phím / chạm để qua nhanh */
const NOTICE_IN = 0.5;
const NOTICE_HOLD = 3;
const NOTICE_OUT = 0.5;
/** Thanh tải chạy ít nhất chừng này giây (tải nhanh quá thì người chơi không kịp thấy) */
const LOAD_MIN = 1.4;
/** Thư mục tải trước trong lúc chạy thanh tải (hiệu ứng ảnh nhiều khung) */
const PRELOAD_DIR = 'art/fx';
/** Nhạc menu (assets/resources/sounds/bgm.wav): bật khi thanh tải chạy xong */
export const MENU_MUSIC = 'bgm';

type Step = 'logo' | 'notice' | 'loading' | 'press' | 'done';

/**
 * Màn khởi động, chạy một lần khi mở game (LandingScreen gắn vào node Landing):
 *   1. Logo 1, 2. Logo 2 (màn đen, mỗi logo 3 giây; không bấm để bỏ qua được),
 *   2b. Thông báo tự lưu (nền giống màn tải: BG_loading + hoạ tiết trôi + lớp lọc): chân mèo Icon_paw phát sáng giữa màn + 2 dòng "game tự lưu, đừng tắt khi biểu tượng này hiện" (SaveIcon hiện
 *       chân mèo đó ở góc màn hình mỗi lần lưu); tự qua sau ~4 giây, không bấm để qua nhanh được,
 *   3. Banner (nền + logo game của Landing) kèm thanh tải, tải trước ảnh hiệu ứng,
 *   4. Thanh tải đổi thành nút START phập phồng (nhân bản node Start của Landing: ảnh nút + chữ START, chỉnh trong scene).
 *      Bấm nút, hoặc Enter / Space / phím Nhảy / Đánh, thì gọi onDone (LandingScreen cho menu hiện ra). Phím khác không tính.
 */
@ccclass('BootScreen')
export class BootScreen extends Component {
    onDone: (() => void) | null = null;

    private root!: Node;
    private black!: UIOpacity;
    private step: Step = 'logo';
    private logoIndex = -1;
    private logoNode: Node | null = null;
    private bar: Node | null = null;
    private barFill: Graphics | null = null;
    private barLabel: Label | null = null;
    private progress = 0;
    private shown = 0;
    private loadTime = 0;
    private loaded = false;
    private press: Node | null = null;
    private pressTime = 0;
    private pressReady = false;
    private pressHover = false;
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
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
        this.nextLogo();
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    update(dt: number) {
        if (this.step === 'notice') {
            this.pressTime += dt;
            this.updateNotice(dt, this.pressTime);
        } else if (this.step === 'loading') {
            this.loadTime += dt;
            // Thanh chạy theo tiến độ tải thật nhưng không nhanh hơn LOAD_MIN giây
            const target = Math.min(this.progress, this.loadTime / LOAD_MIN);
            this.shown += (target - this.shown) * Math.min(1, dt * 10);
            if (this.loaded && this.loadTime >= LOAD_MIN) this.shown = Math.max(this.shown, target);
            this.paintBar(this.shown);
            if (this.loaded && this.loadTime >= LOAD_MIN && this.shown > 0.995) this.showPress();
        } else if (this.step === 'press' && this.press && this.pressReady) {
            // Nút START phập phồng nhẹ
            this.pressTime += dt;
            const k = this.pressHover ? 1.08 : 1 + 0.045 * Math.sin(this.pressTime * 4);
            this.press.setScale(k, k, 1);
        }
    }

    // ---------- Logo ----------

    private nextLogo() {
        this.logoIndex++;
        if (this.logoNode && this.logoNode.isValid) this.logoNode.destroy();
        this.logoNode = null;
        if (this.logoIndex >= LOGOS.length) {
            this.showNotice();
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
        // Hiện, giữ, mờ đi trọn nhịp (không cho bấm bỏ qua)
        tween(op).to(LOGO_IN, { opacity: 255 }).delay(LOGO_HOLD).to(LOGO_OUT, { opacity: 0 }).call(() => this.nextLogo()).start();
    }

    // ---------- Thông báo tự lưu ----------

    private noticeBackdrop: PatternBackdrop | null = null;
    private noticePaw: PawIcon | null = null;

    private showNotice() {
        this.step = 'notice';
        const n = uiNode('Notice', this.root);
        const op = n.addComponent(UIOpacity);
        op.opacity = 0;
        // Nền giống màn tải: ảnh BG_loading, hoạ tiết trôi, lớp lọc
        this.noticeBackdrop = new PatternBackdrop(n);
        // Chân mèo Icon_paw tô trắng viền nâu, quầng sáng phồng xẹp như thở (trong update) — cùng hình với dấu tự lưu trong game
        const paw = pawIcon(n, 130);
        paw.node.setPosition(0, 150, 0);
        this.noticePaw = paw;
        menuDivider(n, 10, 520);
        const l1 = uiLabel(n, '', 34, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'Line1' });
        setText(l1, T('boot.notice1'));
        l1.node.setPosition(0, -50, 0);
        const l2 = uiLabel(n, '', 34, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'Line2' });
        setText(l2, T('boot.notice2'));
        l2.node.setPosition(0, -100, 0);
        menuDivider(n, -165, 300);
        // Hiện, giữ, mờ đi trọn nhịp (không cho bấm qua nhanh) rồi sang thanh tải
        tween(op).to(NOTICE_IN, { opacity: 255 }).delay(NOTICE_HOLD).to(NOTICE_OUT, { opacity: 0 }).call(() => {
            if (n.isValid) n.destroy();
            this.noticeBackdrop = null;
            this.noticePaw = null;
            this.startLoading();
        }).start();
    }

    /** Màn thông báo: hoạ tiết trôi, quầng sáng quanh chân mèo phồng xẹp như thở. */
    private updateNotice(dt: number, t: number) {
        this.noticeBackdrop?.update(dt);
        this.noticePaw?.setGlow(0.55 + 0.45 * Math.sin(t * 2.2));
    }

    // ---------- Banner + thanh tải ----------

    private startLoading() {
        this.step = 'loading';
        this.pressTime = 0;
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

    // ---------- Nút START ----------

    private showPress() {
        this.step = 'press';
        Sound.music(MENU_MUSIC);
        if (this.bar) this.bar.active = false;
        const btn = this.makeStart();
        btn.setScale(0.6, 0.6, 1);
        tween(btn).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).call(() => { this.pressReady = true; }).start();
        btn.on(Node.EventType.TOUCH_START, () => { if (this.pressReady) btn.setScale(0.93, 0.93, 1); });
        btn.on(Node.EventType.TOUCH_CANCEL, () => { this.pressHover = false; });
        btn.on(Node.EventType.TOUCH_END, () => this.confirm());
        btn.on(Node.EventType.MOUSE_ENTER, () => { this.pressHover = true; });
        btn.on(Node.EventType.MOUSE_LEAVE, () => { this.pressHover = false; });
        this.press = btn;
        // Phím đang giữ từ lúc bỏ qua logo không tính
        this.acceptAt = Date.now() + 250;
    }

    /** Nút START: nhân bản node Start của Landing (ảnh nút + chữ, chỉnh trong scene); không có thì vẽ tạm. */
    private makeStart(): Node {
        const d = view.getDesignResolutionSize();
        const src = this.node.getChildByName('Start');
        let btn: Node;
        if (src) {
            btn = instantiate(src);
            btn.name = 'StartButton';
            btn.active = true;
            this.root.addChild(btn);
            btn.setPosition(src.position);
        } else {
            btn = uiNode('StartButton', this.root, 386, 194);
            btn.setPosition(0, -d.height / 2 + 200, 0);
            const g = btn.addComponent(Graphics);
            g.fillColor = UI.accent;
            g.strokeColor = UI.brown;
            g.lineWidth = 8;
            g.roundRect(-180, -70, 360, 140, 40);
            g.fill();
            g.stroke();
            uiLabel(btn, 'START', 90, Color.WHITE, { outline: START_OUTLINE, outlineWidth: 7 });
        }
        return btn;
    }

    private onKey(e: EventKeyboard) {
        // Logo, thông báo tự lưu, thanh tải: phím nào cũng không tính
        if (this.step !== 'press') return;
        const k = e.keyCode;
        const ok = k === KeyCode.ENTER || k === KeyCode.NUM_ENTER || k === KeyCode.SPACE
            || [0, 1].some((p) => k === Settings.key(p, 'jump') || k === Settings.key(p, 'attack'));
        if (ok) this.confirm();
    }

    /** Bấm START: nút lún xuống một nhịp rồi mờ đi, menu hiện ra. */
    private confirm() {
        if (this.step !== 'press' || Date.now() < this.acceptAt) return;
        this.step = 'done';
        Sound.play('ui_start', 0.9);
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
        const btn = this.press;
        if (btn) {
            this.pressReady = false;
            const op = btn.getComponent(UIOpacity) ?? btn.addComponent(UIOpacity);
            Tween.stopAllByTarget(btn);
            tween(btn).to(0.06, { scale: new Vec3(0.92, 0.92, 1) }).to(0.1, { scale: new Vec3(1.08, 1.08, 1) }).start();
            tween(op).delay(0.08).to(0.2, { opacity: 0 }).start();
        }
        setTimeout(() => {
            if (!this.isValid) return;
            const done = this.onDone;
            this.root.destroy();
            this.destroy();
            done?.();
        }, 220); // chờ nút lún xuống xong; menu cũng không nhận luôn chính lần bấm này
    }
}
