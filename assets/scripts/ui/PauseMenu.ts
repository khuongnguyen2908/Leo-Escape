import { _decorator, Color, Component, director, EventKeyboard, Graphics, Input, input, KeyCode, Label, Node, screen, sys, view } from 'cc';
import { Action, ACTION_NAMES, ACTIONS, keyName, Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { GameSession, reloadScene } from '../game/GameSession';
import { PlayerInput } from '../player/PlayerInput';
import { LandingScreen } from './LandingScreen';
import { setText, UI, uiButton, UiButton, uiDim, uiLabel, uiNode, uiPanel, uiSlider, uiToggle } from './UiKit';
const { ccclass, property } = _decorator;

type Page = 'main' | 'settings' | 'keys';

/**
 * Menu tạm dừng: bấm Esc (hoặc nút bánh răng góc trên phải) để mở, game dừng lại.
 *   Tiếp tục · Cài đặt · Về màn hình chính.
 *   Cài đặt: âm lượng nhạc nền, tiếng hiệu ứng, toàn màn hình, rung màn hình, bàn phím.
 *   Bàn phím: bấm vào một ô rồi bấm phím mới để đổi; phím đang dùng chỗ khác thì hai phím đổi chỗ cho nhau.
 * Mọi cài đặt lưu trên máy (Settings). Hình vẽ tạm bằng code. DemoLevelBuilder tự tạo node Menu khi chơi.
 */
@ccclass('PauseMenu')
export class PauseMenu extends Component {
    static instance: PauseMenu | null = null;

    @property({ tooltip: 'Nút bánh răng cách mép phải và mép trên khung hình (x, y)' })
    gearRight = 70;

    @property
    gearTop = 230;

    private overlay: Node | null = null;
    private pages = new Map<Page, Node>();
    private page: Page = 'main';
    private homeButton: UiButton | null = null;
    private keyCells: { p: number; a: Action; button: UiButton }[] = [];
    private keyMessage: Label | null = null;
    private capturing: { p: number; a: Action } | null = null;
    private ignoreEscUntil = 0;
    private refreshSettings: (() => void) | null = null;
    /** Đang mở từ OPTIONS của menu chính (không qua trang Tạm dừng). */
    private fromLanding = false;

    get isOpen() { return !!this.overlay?.active; }

    onLoad() {
        PauseMenu.instance = this;
        LandingScreen.openOptions = () => this.openSettings();
        LandingScreen.pauseOpen = () => this.isOpen;
        const d = view.getDesignResolutionSize();
        this.makeGear(d.width, d.height);
        const overlay = uiNode('Overlay', this.node, d.width, d.height);
        uiDim(overlay, d.width, d.height);
        this.overlay = overlay;
        this.pages.set('main', this.buildMain());
        this.pages.set('settings', this.buildSettings());
        overlay.active = false;
    }

    start() {
        // Dựng trang phím ở start: lúc này GameManager đã biết có Angelo (chơi 2 người) hay không
        const keys = this.buildKeys();
        keys.active = this.page === 'keys';
        this.pages.set('keys', keys);
        // Nằm trên cùng, trên cả màn mở đầu
        this.node.setSiblingIndex(this.node.parent!.children.length - 1);
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    onDestroy() {
        if (PauseMenu.instance === this) {
            PauseMenu.instance = null;
            LandingScreen.openOptions = null;
            LandingScreen.pauseOpen = () => false;
        }
        if (this.isOpen) director.resume();
    }

    open() {
        if (this.isOpen || !this.overlay) return;
        this.overlay.active = true;
        this.fromLanding = false;
        this.show('main');
        director.pause();
    }

    /** OPTIONS ở menu chính: mở thẳng trang Cài đặt; Quay lại / Esc thì đóng hẳn, về menu chính. */
    openSettings() {
        if (this.isOpen || !this.overlay) return;
        this.overlay.active = true;
        this.fromLanding = true;
        this.show('settings');
        director.pause();
    }

    private backFromSettings() {
        if (this.fromLanding) this.close();
        else this.show('main');
    }

    close() {
        if (!this.isOpen || !this.overlay) return;
        this.stopCapture();
        this.overlay.active = false;
        director.resume();
        PlayerInput.clearQueues();
    }

    private onKey(e: EventKeyboard) {
        if (e.keyCode !== KeyCode.ESCAPE && e.keyCode !== KeyCode.MOBILE_BACK) return;
        if (this.capturing || Date.now() < this.ignoreEscUntil) return;
        if (!this.isOpen) {
            // Đang ở màn chọn số người / chọn mèo thì Esc là quay lại bước trước
            if (LandingScreen.instance?.back()) return;
            this.open();
        } else if (this.page === 'keys') {
            this.show('settings');
        } else if (this.page === 'settings') {
            this.backFromSettings();
        } else {
            this.close();
        }
    }

    private show(page: Page) {
        this.stopCapture();
        this.page = page;
        for (const [k, n] of this.pages) n.active = k === page;
        if (page === 'main' && this.homeButton) {
            // Đang ở màn mở đầu thì không cần nút về màn hình chính
            this.homeButton.node.active = !LandingScreen.instance?.showing;
        }
        if (page === 'settings') this.refreshSettings?.();
        if (page === 'keys') this.refreshKeys();
    }

    private goHome() {
        this.close();
        LandingScreen.passed = false;
        GameSession.reset();
        reloadScene();
    }

    // ---------- Trang chính ----------

    private buildMain(): Node {
        const panel = uiPanel(this.overlay!, 640, 560, 'Main');
        const title = uiLabel(panel, 'TẠM DỪNG', 64, UI.text);
        title.node.setPosition(0, 200, 0);
        uiButton(panel, 'Tiếp tục', 420, 96, () => this.close(), { fontSize: 44 }).node.setPosition(0, 70, 0);
        uiButton(panel, 'Cài đặt', 420, 96, () => this.show('settings'), { fontSize: 44 }).node.setPosition(0, -50, 0);
        this.homeButton = uiButton(panel, 'Về màn hình chính', 420, 96, () => this.goHome(), { fontSize: 40 });
        this.homeButton.node.setPosition(0, -170, 0);
        return panel;
    }

    // ---------- Cài đặt ----------

    private buildSettings(): Node {
        const panel = uiPanel(this.overlay!, 980, 760, 'Settings');
        const title = uiLabel(panel, 'CÀI ĐẶT', 60, UI.text);
        title.node.setPosition(0, 300, 0);

        const row = (y: number, text: string) => {
            const l = uiLabel(panel, text, 38, UI.text);
            l.node.setPosition(-230, y, 0);
            return y;
        };
        const apply = () => Sound.setVolumes(Settings.music, Settings.sfx);
        const music = uiSlider(panel, 360, Settings.music, (v) => { Settings.music = v; apply(); });
        music.node.setPosition(200, row(190, 'Nhạc nền'), 0);
        const sfx = uiSlider(panel, 360, Settings.sfx, (v) => {
            Settings.sfx = v;
            apply();
            Sound.play('coin', 0.8);
        });
        sfx.node.setPosition(200, row(95, 'Tiếng hiệu ứng'), 0);
        const full = uiToggle(panel, Settings.fullscreen, (v) => {
            Settings.fullscreen = v;
            const done = v ? screen.requestFullScreen() : screen.exitFullScreen();
            done?.catch(() => { /* trình duyệt không cho thì thôi */ });
        });
        full.node.setPosition(200, row(0, 'Toàn màn hình'), 0);
        const shake = uiToggle(panel, Settings.shake, (v) => { Settings.shake = v; });
        shake.node.setPosition(200, row(-95, 'Rung màn hình'), 0);
        if (sys.isMobile) full.node.active = false;

        uiButton(panel, 'Bàn phím', 380, 90, () => this.show('keys'), { fontSize: 40 }).node.setPosition(-210, -240, 0);
        uiButton(panel, 'Quay lại', 380, 90, () => this.backFromSettings(), { fontSize: 40 }).node.setPosition(210, -240, 0);

        this.refreshSettings = () => {
            music.set(Settings.music);
            sfx.set(Settings.sfx);
            full.set(screen.fullScreen());
            shake.set(Settings.shake);
        };
        return panel;
    }

    // ---------- Bàn phím ----------

    private buildKeys(): Node {
        const panel = uiPanel(this.overlay!, 1180, 1000, 'Keys');
        const title = uiLabel(panel, 'BÀN PHÍM', 56, UI.text);
        title.node.setPosition(0, 435, 0);
        // Không có Angelo: chỉ hiện phím của Người 1, bỏ dòng Đổi mèo và Kỹ năng (K)
        const two = GameSession.angelo;
        const players = two ? 2 : 1;
        const actions = two ? ACTIONS : ACTIONS.filter((a) => a !== 'swap' && a !== 'skill');
        const colX = two ? [-330, 100, 400] : [-200, 250];
        const head = (x: number, text: string, color: Color) => uiLabel(panel, text, 36, color).node.setPosition(x, 365, 0);
        head(colX[1], 'Người 1', UI.p1);
        if (two) head(colX[2], 'Người 2', UI.p2);

        actions.forEach((a, i) => {
            const y = 300 - i * 66;
            // Chưa có Angelo thì phím Tương tác dùng để lướt
            const name = uiLabel(panel, !two && a === 'interact' ? 'Lướt' : ACTION_NAMES[a], 34, UI.text);
            name.node.setPosition(colX[0], y, 0);
            for (let p = 0; p < players; p++) {
                const b = uiButton(panel, '', 260, 56, () => this.startCapture(p, a), { fontSize: 30 });
                b.node.setPosition(colX[p + 1], y, 0);
                this.keyCells.push({ p, a, button: b });
            }
        });

        this.keyMessage = uiLabel(panel, '', 28, UI.text);
        this.keyMessage.node.setPosition(0, -320, 0);
        uiButton(panel, 'Trả về mặc định', 420, 84, () => {
            this.stopCapture();
            Settings.resetKeys();
            this.refreshKeys();
            this.say('Đã trả về phím mặc định.');
        }, { fontSize: 36 }).node.setPosition(-230, -420, 0);
        uiButton(panel, 'Quay lại', 380, 84, () => this.show('settings'), { fontSize: 36 }).node.setPosition(230, -420, 0);
        return panel;
    }

    private refreshKeys() {
        for (const c of this.keyCells) {
            const busy = this.capturing && this.capturing.p === c.p && this.capturing.a === c.a;
            setText(c.button.label, busy ? 'Bấm phím...' : keyName(Settings.key(c.p, c.a)), false);
            c.button.setFocus(!!busy);
        }
    }

    private startCapture(p: number, a: Action) {
        this.capturing = { p, a };
        this.refreshKeys();
        this.say(`Bấm phím mới cho Người ${p + 1} · ${ACTION_NAMES[a]} (Esc để huỷ)`);
        PlayerInput.captureNextKey((code) => {
            const cell = this.capturing;
            this.capturing = null;
            this.ignoreEscUntil = Date.now() + 80;
            if (!cell) return;
            if (code === KeyCode.ESCAPE || code === KeyCode.MOBILE_BACK) {
                this.say('Đã huỷ.');
            } else {
                const swapped = Settings.setKey(cell.p, cell.a, code);
                this.say(swapped
                    ? `${keyName(code)} đang dùng cho Người ${swapped.player + 1} · ${ACTION_NAMES[swapped.action]}, đã đổi chỗ hai phím.`
                    : `Người ${cell.p + 1} · ${ACTION_NAMES[cell.a]}: ${keyName(code)}`);
            }
            this.refreshKeys();
        });
    }

    private stopCapture() {
        if (!this.capturing) return;
        this.capturing = null;
        PlayerInput.cancelCapture();
        this.refreshKeys();
    }

    private say(text: string) {
        if (this.keyMessage) setText(this.keyMessage, text, false);
    }

    // ---------- Nút bánh răng ----------

    private makeGear(w: number, h: number) {
        const r = 40;
        const n = uiNode('Gear', this.node, r * 2.4, r * 2.4);
        n.setPosition(w / 2 - this.gearRight, h / 2 - this.gearTop, 0);
        const g = n.addComponent(Graphics);
        const paint = (down: boolean) => {
            g.clear();
            g.fillColor = down ? UI.brownDown : UI.brown;
            g.circle(0, 0, r);
            g.fill();
            g.strokeColor = UI.cream;
            g.lineWidth = 4;
            g.circle(0, 0, r * 0.84);
            g.stroke();
            // Bánh răng: 8 răng quanh một vòng tròn
            g.fillColor = UI.cream;
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const cx = Math.cos(a) * r * 0.46, cy = Math.sin(a) * r * 0.46;
                g.circle(cx, cy, r * 0.13);
            }
            g.fill();
            g.circle(0, 0, r * 0.42);
            g.fill();
            g.fillColor = down ? UI.brownDown : UI.brown;
            g.circle(0, 0, r * 0.18);
            g.fill();
        };
        paint(false);
        n.on(Node.EventType.TOUCH_START, () => paint(true));
        n.on(Node.EventType.TOUCH_CANCEL, () => paint(false));
        n.on(Node.EventType.TOUCH_END, () => {
            paint(false);
            if (this.isOpen) this.close();
            else this.open();
        });
    }
}
