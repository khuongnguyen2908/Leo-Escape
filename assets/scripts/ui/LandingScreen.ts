import { _decorator, Camera, Color, Component, EventKeyboard, game, Graphics, Input, input, KeyCode, Label, Node, RenderTexture, resources, screen, Sprite, SpriteFrame, sys, Texture2D, Tween, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
import { Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { GameSession } from '../game/GameSession';
import { SlotData } from '../game/SaveSlots';
import { BootScreen, MENU_MUSIC } from './BootScreen';
import { DialogueBox } from './DialogueBox';
import { IrisWipe } from './IrisWipe';
import { SaveSlotPage } from './SaveSlotPage';
import { StoryPages } from './StoryPages';
import { PlayerInput } from '../player/PlayerInput';
import { PlayerVisual } from '../player/PlayerVisual';
import { CharacterSelect } from './CharacterSelect';
import { Lang, TextKey } from './Lang';
import { useGameFont } from './GameFont';
import { UI, uiButton, UiButton, uiDim, uiLabel, uiNode, uiPanel } from './UiKit';
const { ccclass, property } = _decorator;

type Page = 'boot' | 'drop' | 'start' | 'slots' | 'mode' | 'pick' | 'quit' | 'thanks' | 'credits' | 'intro';

/** Dòng menu được chọn: chữ phóng lên chừng này rồi thu về (khung chọn tính theo cỡ lúc to nhất nên chữ không tràn) */
const FOCUS_PULSE = 1.15;
/** Bảng Tác giả: [tên, ảnh logo trong thư mục art (chưa có thì vẽ khung LOGO)] */
const CREDITS: [string, string][] = [['Laris', 'credit_laris'], ['Flynt', 'credit_flynt']];

/** Các dòng của menu chính: [tên node trong Landing/Menu, chữ mặc định]. */
export const MENU_ITEMS: [string, string][] = [
    ['NewGame', 'NEW GAME'],
    ['Options', 'OPTIONS'],
    ['Achievements', 'ACHIEVEMENTS'],
    ['Credits', 'CREDITS'],
    ['Quit', 'QUIT'],
];

const TITLE_OUTLINE = new Color(0x46, 0x2c, 0x22, 255);
const SMALL = new Color(0x96, 0x87, 0x87, 255);
const SMALL_OUTLINE = new Color(0x2c, 0x1d, 0x17, 255);
/** Khung chọn selection.png rộng 385: hoa văn + mép bo mỗi đầu 70 (không giãn), phần đệm vuông nằm từ 38 tới 343. */
const SELECTION_ART_WIDTH = 385;
const SELECTION_EDGE = 70;
/** Khung chọn = bề ngang chữ + phần ngoài đệm hai bên (38 + 42) + chừa 12 mỗi bên để chữ không chạm mép đệm. */
const SELECTION_EXTRA = 38 + 42 + 24;

/**
 * Màn mở đầu. Mở game lần đầu: logo 1 → logo 2 → banner + thanh tải → PRESS ANY BUTTON (BootScreen) → menu rơi xuống.
 * NEW GAME → chọn 1 trong 3 ô lưu (SaveSlotPage) → màn đen zoom vào + vòng tải nhỏ (IrisWipe) →
 *   ô mới: 3 trang truyện (StoryPages) → màn đen → zoom ra bản đồ → hội thoại mèo 3 câu (DialogueBox) → vào chơi;
 *   ô đã lưu: zoom ra bản đồ ngay tại checkpoint đã lưu → vào chơi.
 * Về màn hình chính từ trong game thì bỏ qua logo, menu rơi xuống luôn.
 * Chi tiết các trang:
 *   1. Menu chính: logo, NEW GAME, OPTIONS, ACHIEVEMENTS, CREDITS, QUIT. W/S hoặc ↑/↓ dời khung chọn, rê chuột cũng được;
 *      Enter, phím Nhảy / Đánh hoặc chạm để chọn. Scene chưa có node Menu thì dùng nút START cũ.
 *   2. NEW GAME: chọn 1 NGƯỜI (điều khiển Leo, phím Đổi mèo để đổi) hoặc 2 NGƯỜI. Điện thoại bỏ qua bước này, vào thẳng 1 người.
 *   3. Chơi 2 người: màn chọn mèo (CharacterSelect). Esc để quay lại bước trước.
 * OPTIONS mở trang Cài đặt của PauseMenu. QUIT hỏi lại; trên web không đóng được tab thì hiện màn cảm ơn.
 * Chỉ hiện một lần khi mở game: thua rồi chơi lại thì vào thẳng màn chơi. "Về màn hình chính" trong menu thì hiện lại.
 * Gắn lên node Landing dưới Canvas (nút "⚙ Cập nhật" trên DemoLevelBuilder tự tạo nếu chưa có).
 * Nền: có node MenuBg (ảnh Background) thì dùng ảnh đó, không thì chụp màn chơi làm mờ.
 * Logo: kéo ảnh vào ô Logo Frame, hoặc đặt ảnh tên logo / MG_logo trong assets/resources/art là tự dùng; chưa có thì hiện chữ.
 */
@ccclass('LandingScreen')
export class LandingScreen extends Component {
    /** Đã bấm START trong lần mở game này (giữ qua các lần tải lại scene). */
    static passed = false;
    /** Đã chạy logo / thanh tải trong lần mở game này (về menu từ trong game thì không chạy lại). */
    static booted = false;
    static instance: LandingScreen | null = null;
    /** PauseMenu gắn vào: mở thẳng trang Cài đặt, và cho biết menu tạm dừng đang mở (để không nhận phím bên dưới). */
    static openOptions: (() => void) | null = null;
    static pauseOpen: () => boolean = () => false;

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh logo. Để trống thì tìm MG_logo trong thư mục ảnh' })
    logoFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Thư mục ảnh nằm trong assets/resources' })
    artFolder = 'art';

    @property({ tooltip: 'Độ mờ nền: ảnh màn chơi thu nhỏ bao nhiêu lần rồi phóng lại. Lớn hơn = mờ hơn', range: [2, 24, 1], slide: true })
    blur = 10;

    @property({ tooltip: 'Thời gian mờ dần khi vào chơi (giây)' })
    fadeTime = 0.45;

    private hidden: Node[] = [];
    private capture: Camera | null = null;
    private frames = 0;
    private leaving = false;
    private page: Page = 'start';
    private modeRoot: Node | null = null;
    private modeButtons: UiButton[] = [];
    private modeFocus = 0;
    private pick: CharacterSelect | null = null;
    private wasLeft = false;
    private wasRight = false;
    private menu: Node | null = null;
    private items: Node[] = [];
    private selection: Node | null = null;
    private selectionDy = 0;
    /** Bề ngang gốc của khung chọn; dòng chữ dài hơn thì kéo giãn phần đệm giữa. */
    private selectionWidth = 0;
    private focus = 0;
    private toast: Label | null = null;
    private quitRoot: Node | null = null;
    private quitButtons: UiButton[] = [];
    private quitFocus = 1;
    private thanksRoot: Node | null = null;
    private slotPage: SaveSlotPage | null = null;
    /** Ô lưu vừa chọn (null = ô mới) */
    private pendingSave: SlotData | null = null;

    /** Màn mở đầu đang hiện (chưa vào chơi). */
    get showing() { return this.node.activeInHierarchy && !this.leaving; }

    onLoad() {
        if (LandingScreen.passed) {
            GameSession.waitingForStart = false;
            this.node.active = false;
            return;
        }
        LandingScreen.instance = this;
        GameSession.waitingForStart = true;
        PlayerInput.init();
        // Nằm trên cùng Canvas để che HUD, nút cảm ứng
        this.node.setSiblingIndex(this.node.parent!.children.length - 1);
        for (const l of this.getComponentsInChildren(Label)) useGameFont(l);
        this.setupLogo();
        this.menu = this.node.getChildByName('Menu');
        if (this.menu) this.setupMenu();
        else this.setupStart();
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
        if (this.menu) {
            if (!LandingScreen.booted) this.startBoot();
            else this.dropMenu();
        }
    }

    start() {
        // Có ảnh nền menu thì không cần chụp màn chơi làm mờ
        if (this.node.getChildByName('MenuBg')) PlayerInput.clearQueues();
        else this.beginCapture();
    }

    onDestroy() {
        Lang.offChange(this.onLang);
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
        if (LandingScreen.instance === this) LandingScreen.instance = null;
    }

    update() {
        // Chờ 2 frame cho camera chụp xong màn chơi rồi mới hiện nền mờ, logo, nút
        if (this.capture) {
            if (++this.frames < 2) return;
            this.capture.enabled = false;
            this.capture.node.destroy();
            this.capture = null;
            for (const n of this.hidden) if (n.isValid) n.active = true;
            this.hidden.length = 0;
            PlayerInput.clearQueues();
            return;
        }
        if (this.leaving) return;
        const c = PlayerInput.merged;
        if (this.page === 'start' && this.menu) {
            const n = this.items.length;
            if (c.consumeUp()) this.focusMenu((this.focus + n - 1) % n);
            if (c.consumeDown()) this.focusMenu((this.focus + 1) % n);
            if (c.consumeJump() || c.consumeAttack()) this.chooseMenu(this.focus);
        } else if (this.page === 'start') {
            if (c.consumeJump() || c.consumeAttack()) this.onStart();
        } else if (this.page === 'quit') {
            const left = c.left, right = c.right;
            if ((left && !this.wasLeft) || (right && !this.wasRight)) this.focusQuit(this.quitFocus === 0 ? 1 : 0);
            this.wasLeft = left;
            this.wasRight = right;
            if (c.consumeJump() || c.consumeAttack()) this.answerQuit(this.quitFocus === 0);
        } else if (this.page === 'thanks') {
            if (c.consumeJump() || c.consumeAttack()) this.hideThanks();
        } else if (this.page === 'credits') {
            if (c.consumeJump() || c.consumeAttack()) this.hideCredits();
        } else if (this.page === 'mode') {
            const left = c.left, right = c.right;
            if ((left && !this.wasLeft) || (right && !this.wasRight)) this.focusMode(this.modeFocus === 0 ? 1 : 0);
            this.wasLeft = left;
            this.wasRight = right;
            if (c.consumeJump() || c.consumeAttack()) this.chooseMode(this.modeFocus === 0 ? 1 : 2);
        }
    }

    /** Esc / nút quay lại: lùi một bước. Trả về false nếu đang ở bước đầu (để mở menu). */
    back(): boolean {
        if (!this.showing || this.capture) return false;
        // Đang chạy logo / menu rơi / chuyển cảnh vào game: nuốt Esc, không mở menu tạm dừng
        if (this.page === 'boot' || this.page === 'drop' || this.page === 'intro') return true;
        if (this.page === 'slots') {
            this.slotPage?.back();
            return true;
        }
        if (this.page === 'pick') {
            this.pick?.node.destroy();
            this.pick = null;
            this.showMode();
            return true;
        }
        if (this.page === 'mode') {
            this.page = 'start';
            if (this.modeRoot) this.modeRoot.active = false;
            if (this.menu) this.menu.active = true;
            else this.setActive('Start', true);
            this.setActive('Logo', true);
            PlayerInput.clearQueues();
            return true;
        }
        if (this.page === 'quit') {
            this.answerQuit(false);
            return true;
        }
        if (this.page === 'thanks') {
            this.hideThanks();
            return true;
        }
        if (this.page === 'credits') {
            this.hideCredits();
            return true;
        }
        return false;
    }

    private setupMenu() {
        const menu = this.menu!;
        this.setActive('Start', false);
        this.items = MENU_ITEMS.map(([name]) => menu.getChildByName(name)).filter((n): n is Node => !!n && n.active);
        this.selection = menu.getChildByName('Selection');
        // Giữ khoảng lệch giữa khung chọn và dòng gần nó nhất như bạn đặt trong editor
        // (đặt khung ở dòng nào cũng được, không cần đúng dòng đầu)
        const sel = this.selection;
        if (sel && this.items.length) {
            const near = this.items.reduce((a, n) => Math.abs(n.position.y - sel.position.y) < Math.abs(a.position.y - sel.position.y) ? n : a);
            this.selectionDy = sel.position.y - near.position.y;
        }
        this.makeSelectionStretchy();
        // Chữ của từng dòng theo ngôn ngữ (đổi ngôn ngữ thì khung chọn giãn lại theo chữ mới)
        for (const n of this.items) {
            const label = n.getComponent(Label) ?? n.getComponentInChildren(Label);
            if (label) Lang.bind(label, `menu.${n.name}` as TextKey);
        }
        Lang.onChange(this.onLang);
        this.items.forEach((n, i) => {
            n.on(Node.EventType.MOUSE_ENTER, () => {
                if (this.page === 'start') this.focusMenu(i);
            });
            n.on(Node.EventType.TOUCH_END, () => {
                if (this.page !== 'start' || this.leaving) return;
                this.focusMenu(i);
                this.chooseMenu(i);
            });
        });
        this.focusMenu(0);
    }

    private readonly onLang = () => {
        if (this.isValid && this.page === 'start') this.focusMenu(this.focus, false);
    };

    /** Chọn dòng i. pulse: chữ phóng lên rồi thu về (chỉ khi đổi dòng). */
    private focusMenu(i: number, pulse = true) {
        const item = this.items[i];
        if (!item) return;
        if (pulse && i !== this.focus) {
            this.pulse(item);
            Sound.play('ui_move', 0.6);
        }
        this.focus = i;
        const sel = this.selection;
        if (sel) {
            sel.setPosition(sel.position.x, item.position.y + this.selectionDy, sel.position.z);
            // Chữ dài (ACHIEVEMENTS) thì kéo giãn phần đệm vuông ở giữa, hai hoa văn hai đầu giữ nguyên
            const ui = sel.getComponent(UITransform);
            const text = item.getComponent(UITransform)?.width ?? 0;
            if (ui && this.selectionWidth > 0) {
                ui.setContentSize(Math.max(this.selectionWidth, text * FOCUS_PULSE + SELECTION_EXTRA), ui.height);
            }
        }
    }

    /** Chữ dòng menu phóng lên FOCUS_PULSE lần rồi thu về cỡ gốc. */
    private pulse(item: Node) {
        let base = this.baseScale.get(item);
        if (!base) {
            base = item.scale.clone();
            this.baseScale.set(item, base);
        }
        Tween.stopAllByTarget(item);
        item.setScale(base);
        const b = base;
        tween(item)
            .to(0.1, { scale: new Vec3(b.x * FOCUS_PULSE, b.y * FOCUS_PULSE, b.z) }, { easing: 'quadOut' })
            .to(0.16, { scale: b }, { easing: 'quadIn' })
            .start();
    }

    private baseScale = new Map<Node, Vec3>();

    /**
     * Khung chọn (selection.png 385×81): hai hoa văn hai đầu rộng 70, giữa là phần đệm vuông.
     * Chuyển Sprite sang kiểu cắt 9 mảnh (Sliced) để chỉ phần giữa giãn ra.
     */
    private makeSelectionStretchy() {
        const sp = this.selection?.getComponent(Sprite);
        const ui = this.selection?.getComponent(UITransform);
        const frame = sp?.spriteFrame;
        if (!sp || !ui || !frame) return;
        this.selectionWidth = ui.width;
        const k = frame.rect.width / SELECTION_ART_WIDTH;
        frame.insetLeft = Math.round(SELECTION_EDGE * k);
        frame.insetRight = Math.round(SELECTION_EDGE * k);
        sp.type = Sprite.Type.SLICED;
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        ui.setContentSize(this.selectionWidth, ui.height);
    }

    private chooseMenu(i: number) {
        const item = this.items[i];
        if (!item || this.leaving) return;
        Sound.play(item.name === 'Achievements' ? 'ui_deny' : 'ui_click', 0.8);
        switch (item.name) {
            case 'NewGame': this.showSlots(); break;
            case 'Options': LandingScreen.openOptions?.(); break;
            case 'Quit': this.showQuit(); break;
            case 'Credits': this.showCredits(); break;
            default: this.showToast(item); break;
        }
    }

    /** Chữ nâu nhỏ hiện bên phải dòng menu chừng 1 giây. */
    private showToast(item: Node) {
        if (!this.toast) {
            this.toast = uiLabel(this.node, '', 30, SMALL, { outline: SMALL_OUTLINE, outlineWidth: 3, name: 'Toast' });
            this.toast.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
            this.toast.node.addComponent(UIOpacity);
        }
        const t = this.toast;
        Lang.bind(t, 'menu.soon');
        const p = new Vec3();
        item.getWorldPosition(p);
        this.node.getComponent(UITransform)!.convertToNodeSpaceAR(p, p);
        const w = item.getComponent(UITransform)?.width ?? 0;
        t.node.setPosition(p.x + w / 2 + 40, p.y, 0);
        t.node.setSiblingIndex(this.node.children.length - 1);
        const op = t.node.getComponent(UIOpacity)!;
        Tween.stopAllByTarget(op);
        op.opacity = 255;
        tween(op).delay(1).to(0.3, { opacity: 0 }).start();
    }

    /** Hỏi lại trước khi thoát. Mặc định chọn NO cho khỏi lỡ tay. */
    private showQuit() {
        const d = view.getDesignResolutionSize();
        if (!this.quitRoot) {
            const root = uiNode('QuitAsk', this.node, d.width, d.height);
            uiDim(root, d.width, d.height);
            uiPanel(root, 640, 320);
            const title = uiLabel(root, '', 60, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4 });
            Lang.bind(title, 'quit.title');
            title.node.setPosition(0, 60, 0);
            const yes = uiButton(root, '', 240, 90, () => this.answerQuit(true), { fontSize: 44, name: 'Yes' });
            const no = uiButton(root, '', 240, 90, () => this.answerQuit(false), { fontSize: 44, name: 'No' });
            Lang.bind(yes.label, 'yes');
            Lang.bind(no.label, 'no');
            yes.node.setPosition(-140, -70, 0);
            no.node.setPosition(140, -70, 0);
            yes.node.on(Node.EventType.MOUSE_ENTER, () => this.focusQuit(0));
            no.node.on(Node.EventType.MOUSE_ENTER, () => this.focusQuit(1));
            this.quitButtons = [yes, no];
            this.quitRoot = root;
        }
        this.quitRoot.setSiblingIndex(this.node.children.length - 1);
        this.quitRoot.active = true;
        this.page = 'quit';
        this.focusQuit(1);
        PlayerInput.clearQueues();
    }

    private focusQuit(i: number) {
        if (i !== this.quitFocus && this.quitRoot?.active) Sound.play('ui_move', 0.6);
        this.quitFocus = i;
        this.quitButtons.forEach((b, k) => b.setFocus(k === i));
    }

    private answerQuit(yes: boolean) {
        if (this.quitRoot) this.quitRoot.active = false;
        Sound.play(yes ? 'ui_click' : 'ui_back', 0.8);
        this.page = 'start';
        PlayerInput.clearQueues();
        if (!yes) return;
        // Bản build ra máy tính / điện thoại thì thoát thật
        if (sys.isNative) {
            game.end();
            return;
        }
        // Trình duyệt chỉ cho đóng tab do chính game mở; mở từ itch.io thì bị chặn, nên hiện màn cảm ơn
        try { window.close(); } catch (e) { /* bị chặn thì thôi */ }
        this.scheduleOnce(() => this.showThanks(), 0.2);
    }

    private showThanks() {
        if (screen.fullScreen()) screen.exitFullScreen().catch(() => { /* không thoát được thì thôi */ });
        Sound.stopMusic();
        const d = view.getDesignResolutionSize();
        if (!this.thanksRoot) {
            const root = uiNode('Thanks', this.node, d.width, d.height);
            uiDim(root, d.width, d.height);
            const title = uiLabel(root, '', 60, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4 });
            Lang.bind(title, 'thanks.title');
            title.node.setPosition(0, 90, 0);
            const sub = uiLabel(root, '', 30, SMALL, { outline: SMALL_OUTLINE, outlineWidth: 3 });
            Lang.bind(sub, 'thanks.sub');
            sub.node.setPosition(0, 20, 0);
            const back = uiButton(root, '', 480, 96, () => this.hideThanks(), { fontSize: 44, name: 'Back' });
            Lang.bind(back.label, 'thanks.back');
            back.node.setPosition(0, -100, 0);
            back.setFocus(true);
            this.thanksRoot = root;
        }
        this.thanksRoot.setSiblingIndex(this.node.children.length - 1);
        this.thanksRoot.active = true;
        this.page = 'thanks';
        PlayerInput.clearQueues();
    }

    /** Bảng Tác giả: hai ô logo (ảnh credit_laris, credit_flynt trong thư mục art; chưa có thì khung LOGO) và tên. */
    private showCredits() {
        const d = view.getDesignResolutionSize();
        if (!this.creditsRoot) {
            const root = uiNode('Credits', this.node, d.width, d.height);
            uiDim(root, d.width, d.height);
            const panel = uiPanel(root, 900, 620);
            const title = uiLabel(panel, '', 60, UI.text);
            Lang.bind(title, 'credits.title');
            title.node.setPosition(0, 225, 0);
            CREDITS.forEach(([name, art], i) => {
                const x = (i - (CREDITS.length - 1) / 2) * 340;
                const box = uiNode(`Logo_${name}`, panel, 240, 240);
                box.setPosition(x, 30, 0);
                const g = box.addComponent(Graphics);
                // Khung tạm: viền nét đứt + chữ LOGO (có ảnh thì ẩn)
                g.strokeColor = UI.brownDown;
                g.lineWidth = 6;
                const dash = (x0: number, y0: number, x1: number, y1: number) => {
                    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 26);
                    for (let k = 0; k < n; k += 2) {
                        g.moveTo(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
                        g.lineTo(x0 + ((x1 - x0) * (k + 1)) / n, y0 + ((y1 - y0) * (k + 1)) / n);
                    }
                };
                dash(-110, -110, 110, -110);
                dash(110, -110, 110, 110);
                dash(110, 110, -110, 110);
                dash(-110, 110, -110, -110);
                g.stroke();
                const ph = uiLabel(box, 'LOGO', 40, UI.brownDown);
                resources.load(`${this.artFolder}/${art}/spriteFrame`, SpriteFrame, (err, sf) => {
                    if (err || !sf || !box.isValid) return;
                    g.clear();
                    ph.node.active = false;
                    const pic = uiNode('Pic', box);
                    const sp = pic.addComponent(Sprite);
                    sp.spriteFrame = sf;
                    const k = 230 / Math.max(sf.rect.width, sf.rect.height);
                    pic.setScale(k, k, 1);
                });
                const label = uiLabel(panel, name, 50, UI.text);
                label.node.setPosition(x, -150, 0);
            });
            const close = uiButton(panel, '', 300, 90, () => this.hideCredits(), { fontSize: 42, name: 'Close' });
            Lang.bind(close.label, 'close');
            close.node.setPosition(0, -245, 0);
            close.setFocus(true);
            this.creditsRoot = root;
        }
        this.creditsRoot.setSiblingIndex(this.node.children.length - 1);
        this.creditsRoot.active = true;
        const panel = this.creditsRoot.getChildByName('Panel');
        if (panel) {
            panel.setScale(0.7, 0.7, 1);
            tween(panel).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        }
        this.page = 'credits';
        PlayerInput.clearQueues();
    }

    private hideCredits() {
        if (this.creditsRoot) this.creditsRoot.active = false;
        this.page = 'start';
        PlayerInput.clearQueues();
    }

    private creditsRoot: Node | null = null;

    private hideThanks() {
        if (this.thanksRoot) this.thanksRoot.active = false;
        this.page = 'start';
        PlayerInput.clearQueues();
        Sound.music(MENU_MUSIC);
    }

    // ---------- Logo, thanh tải, menu rơi xuống ----------

    /** Mở game lần đầu: logo 1 → logo 2 → banner + thanh tải → PRESS ANY BUTTON, xong thì menu rơi xuống. */
    private startBoot() {
        this.page = 'boot';
        if (this.menu) this.menu.active = false;
        const boot = this.addComponent(BootScreen);
        boot.onDone = () => {
            LandingScreen.booted = true;
            this.dropMenu();
        };
    }

    /** Các dòng menu rơi từ trên xuống lần lượt (nảy nhẹ khi chạm chỗ), xong mới hiện khung chọn và nhận phím. */
    private dropMenu() {
        const menu = this.menu;
        if (!menu) return;
        this.page = 'drop';
        menu.active = true;
        const sel = this.selection;
        if (sel) sel.active = false;
        const n = this.items.length;
        // Về menu từ trong game (đã qua logo, thanh tải): bật nhạc menu luôn
        if (LandingScreen.booted) Sound.music(MENU_MUSIC);
        this.items.forEach((item, i) => {
            let base = this.dropBase.get(item);
            if (!base) {
                base = item.position.clone();
                this.dropBase.set(item, base);
            }
            const op = item.getComponent(UIOpacity) ?? item.addComponent(UIOpacity);
            Tween.stopAllByTarget(item);
            Tween.stopAllByTarget(op);
            item.setPosition(base.x, base.y + 700, base.z);
            op.opacity = 0;
            const b = base;
            tween(op).delay(0.09 * i).to(0.2, { opacity: 255 }).start();
            // bounceOut chạm chỗ lần đầu ở khoảng 36% thời gian: lúc đó kêu bụp
            tween(item).delay(0.09 * i + 0.22).call(() => Sound.play('ui_drop', 0.5)).start();
            tween(item).delay(0.09 * i).to(0.6, { position: b }, { easing: 'bounceOut' }).call(() => {
                if (i !== n - 1 || !this.isValid) return;
                if (sel) sel.active = true;
                this.page = 'start';
                this.focusMenu(this.focus, false);
                PlayerInput.clearQueues();
            }).start();
        });
        if (n === 0) this.page = 'start';
    }

    private dropBase = new Map<Node, Vec3>();

    // ---------- Ô lưu ----------

    private showSlots() {
        if (this.capture) return;
        this.page = 'slots';
        if (this.menu) this.menu.active = false;
        this.setActive('Logo', false);
        if (!this.slotPage) {
            const n = uiNode('Slots', this.node);
            const page = n.addComponent(SaveSlotPage);
            page.onPick = (slot, data) => this.pickSlot(slot, data);
            page.onBack = () => this.hideSlots();
            this.slotPage = page;
        } else {
            this.slotPage.node.active = true;
        }
        this.slotPage.node.setSiblingIndex(this.node.children.length - 1);
    }

    private hideSlots() {
        if (this.slotPage) this.slotPage.node.active = false;
        this.setActive('Logo', true);
        // Về menu từ trang ô lưu: các dòng menu rơi xuống lại
        if (this.menu) this.dropMenu();
        else this.page = 'start';
        PlayerInput.clearQueues();
    }

    /** Chọn ô lưu: ô này nhận tiến độ từ giờ; rồi vào game (chọn số người nếu có Angelo). */
    private pickSlot(slot: number, data: SlotData | null) {
        GameSession.slot = slot;
        this.pendingSave = data;
        if (this.slotPage) this.slotPage.node.active = false;
        this.onStart();
    }

    private onStart() {
        if (this.capture) return;
        // Toàn màn hình chỉ bật được ngay sau một lần bấm của người chơi
        if (Settings.fullscreen && !screen.fullScreen()) screen.requestFullScreen().catch(() => { /* trình duyệt không cho thì thôi */ });
        const gm = GameManager.instance;
        if (sys.isMobile || !gm?.partner) this.chooseMode(1);
        else this.showMode();
    }

    private showMode() {
        this.page = 'mode';
        this.setActive('Start', false);
        if (this.menu) this.menu.active = false;
        this.setActive('Logo', true);
        if (!this.modeRoot) this.buildMode();
        this.modeRoot!.active = true;
        this.focusMode(0);
        PlayerInput.clearQueues();
    }

    private buildMode() {
        const root = uiNode('Mode', this.node);
        this.modeRoot = root;
        const start = this.node.getChildByName('Start');
        const frame = start?.getComponent(Sprite)?.spriteFrame ?? null;
        const y = start ? start.position.y : -322;
        const w = frame ? frame.rect.width : 386, h = frame ? frame.rect.height : 194;
        const one = uiButton(root, '', w, h, () => this.chooseMode(1), { frame, fontSize: 64, name: 'One' });
        const two = uiButton(root, '', w, h, () => this.chooseMode(2), { frame, fontSize: 64, name: 'Two' });
        Lang.bind(one.label, 'mode.one');
        Lang.bind(two.label, 'mode.two');
        one.node.setPosition(-250, y, 0);
        two.node.setPosition(250, y, 0);
        one.node.on(Node.EventType.MOUSE_ENTER, () => this.focusMode(0));
        two.node.on(Node.EventType.MOUSE_ENTER, () => this.focusMode(1));
        this.modeButtons = [one, two];
        const hint1 = uiLabel(root, '', 28, UI.cream, { outline: UI.brown, outlineWidth: 4 });
        Lang.bind(hint1, 'mode.oneHint');
        hint1.node.setPosition(-250, y - h / 2 - 34, 0);
        const hint2 = uiLabel(root, '', 28, UI.cream, { outline: UI.brown, outlineWidth: 4 });
        Lang.bind(hint2, 'mode.twoHint');
        hint2.node.setPosition(250, y - h / 2 - 34, 0);
    }

    private focusMode(i: number) {
        if (i !== this.modeFocus && this.page === 'mode') Sound.play('ui_move', 0.6);
        this.modeFocus = i;
        this.modeButtons.forEach((b, k) => {
            b.setFocus(k === i);
            b.node.setScale(k === i ? 1.06 : 0.94, k === i ? 1.06 : 0.94, 1);
        });
    }

    private chooseMode(mode: 1 | 2) {
        if (mode === 1) {
            GameSession.mode = 1;
            GameSession.leoPlayer = 0;
            this.go();
            return;
        }
        this.page = 'pick';
        if (this.modeRoot) this.modeRoot.active = false;
        this.setActive('Logo', false);
        const gm = GameManager.instance;
        const leoVis = gm?.player?.visual ?? null;
        const angVis: PlayerVisual | null = gm?.partner?.visual ?? null;
        const n = uiNode('Pick', this.node);
        const pick = n.addComponent(CharacterSelect);
        pick.setup(leoVis?.idleFrame ?? null, angVis?.idleFrame ?? null, angVis?.tint ?? Color.WHITE, angVis?.widthScale ?? 1);
        pick.onDone = (leo, angelo) => {
            GameSession.mode = 2;
            GameSession.leoPlayer = leo;
            GameSession.angeloPlayer = angelo;
            this.go();
        };
        this.pick = pick;
    }

    private onKey(e: EventKeyboard) {
        if (e.keyCode !== KeyCode.ENTER || this.leaving || LandingScreen.pauseOpen()) return;
        if (this.page === 'start') {
            if (this.menu) this.chooseMenu(this.focus);
            else this.onStart();
        } else if (this.page === 'mode') this.chooseMode(this.modeFocus === 0 ? 1 : 2);
        else if (this.page === 'quit') this.answerQuit(this.quitFocus === 0);
        else if (this.page === 'thanks') this.hideThanks();
        else if (this.page === 'credits') this.hideCredits();
    }

    private setActive(name: string, on: boolean) {
        const n = this.node.getChildByName(name);
        if (n) n.active = on;
    }

    /** Chụp màn chơi (không có HUD, logo, nút) vào một ảnh nhỏ; phóng ảnh nhỏ ra cả khung là thành nền mờ. */
    private beginCapture() {
        const canvas = this.node.parent!;
        const main = canvas.getComponentInChildren(Camera);
        if (!main) return;
        const d = view.getDesignResolutionSize();
        const k = Math.max(2, Math.round(this.blur));
        const rt = new RenderTexture();
        rt.reset({ width: Math.max(8, Math.round(d.width / k)), height: Math.max(8, Math.round(d.height / k)) });
        rt.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);

        const camNode = new Node('LandingCapture');
        canvas.addChild(camNode);
        camNode.setWorldPosition(main.node.worldPosition);
        camNode.setWorldRotation(main.node.worldRotation);
        const cam = camNode.addComponent(Camera);
        cam.projection = Camera.ProjectionType.ORTHO;
        cam.orthoHeight = d.height / 2;
        cam.near = main.near;
        cam.far = main.far;
        cam.visibility = main.visibility;
        cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        cam.clearColor = new Color(0, 0, 0, 255);
        cam.priority = main.priority - 1;
        cam.targetTexture = rt;
        this.capture = cam;

        // Trong lúc chụp thì giấu HUD, thanh máu boss, nút cảm ứng, menu và chính logo, nút START
        const hide = ['HUD', 'HUD_Angelo', 'BossBar', 'TouchControls', 'Menu']
            .map((name) => canvas.getChildByName(name))
            .filter((n): n is Node => !!n && n.active);
        for (const n of this.node.children) if (n.active) hide.push(n);
        for (const n of hide) n.active = false;
        this.hidden = hide;

        // Ảnh nhỏ phóng to thì vỡ ô vuông; chồng nhiều bản lệch nhau nửa ô rồi lấy trung bình (bản thứ i mờ 1/i) cho mịn
        const bg = new Node('Blur');
        bg.layer = this.node.layer;
        this.node.insertChild(bg, 0);
        bg.addComponent(UITransform).setContentSize(d.width, d.height);
        const sf = new SpriteFrame();
        sf.texture = rt;
        const offsets: [number, number][] = [[0, 0]];
        for (let i = 0; i < 6; i++) offsets.push([Math.cos(i * Math.PI / 3) * 0.5, Math.sin(i * Math.PI / 3) * 0.5]);
        for (let i = 0; i < 6; i++) offsets.push([Math.cos((i + 0.5) * Math.PI / 3), Math.sin((i + 0.5) * Math.PI / 3)]);
        offsets.forEach(([ox, oy], i) => {
            const layer = new Node(`Blur${i}`);
            layer.layer = this.node.layer;
            bg.addChild(layer);
            layer.setPosition(ox * k, oy * k, 0);
            const sp = layer.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.spriteFrame = sf;
            sp.color = new Color(255, 255, 255, Math.round(255 / (i + 1)));
            layer.getComponent(UITransform)!.setContentSize(d.width + 2 * k, d.height + 2 * k);
        });
        bg.active = false;
        this.hidden.push(bg);
    }

    private setupLogo() {
        const logo = this.node.getChildByName('Logo');
        if (!logo) return;
        const show = (sf: SpriteFrame) => {
            if (!this.isValid) return;
            const pic = logo.getChildByName('Pic') ?? this.child('Pic', logo);
            (pic.getComponent(Sprite) ?? pic.addComponent(Sprite)).spriteFrame = sf;
            const text = logo.getChildByName('Text');
            if (text) text.active = false;
        };
        if (this.logoFrame) {
            show(this.logoFrame);
            return;
        }
        resources.load(`${this.artFolder}/logo/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err && sf) show(sf);
            else resources.load(`${this.artFolder}/MG_logo/spriteFrame`, SpriteFrame, (err2, sf2) => {
                if (!err2 && sf2) show(sf2);
            });
        });
    }

    private setupStart() {
        const btn = this.node.getChildByName('Start');
        if (!btn) return;
        const s = btn.scale.clone();
        const press = (down: boolean) => btn.setScale(s.x * (down ? 0.93 : 1), s.y * (down ? 0.93 : 1), s.z);
        btn.on(Node.EventType.TOUCH_START, () => press(true));
        btn.on(Node.EventType.TOUCH_CANCEL, () => press(false));
        btn.on(Node.EventType.TOUCH_END, () => {
            press(false);
            this.onStart();
        });
    }

    /**
     * Vào game: màn đen zoom vào + vòng tải nhỏ; ô mới thì 3 trang truyện rồi zoom ra bản đồ + hội thoại,
     * ô đã lưu thì zoom ra bản đồ ngay ở checkpoint. Mèo chỉ chạy được khi xong hết (phím bấm chọn không làm mèo nhảy).
     */
    private go() {
        if (this.leaving || this.capture || this.page === 'intro') return;
        this.page = 'intro';
        LandingScreen.passed = true;
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
        const data = this.pendingSave;
        IrisWipe.close(0.6, () => {
            IrisWipe.showLoading(true);
            // Giờ thật: vòng tải nhỏ đứng chừng 1 giây
            setTimeout(() => {
                IrisWipe.showLoading(false);
                if (!this.isValid) return;
                if (data && !data.cleared) {
                    GameManager.instance?.applySave(data);
                    this.revealMap(false);
                } else {
                    this.playStory();
                }
            }, 900);
        });
    }

    /** 3 trang truyện trên nền riêng (che hết menu), lật hết thì màn đen rồi ra bản đồ. */
    private playStory() {
        for (const c of this.node.children) c.active = false;
        const n = uiNode('Story', this.node);
        const story = n.addComponent(StoryPages);
        IrisWipe.open(0.6);
        story.onDone = () => {
            IrisWipe.close(0.6, () => {
                n.destroy();
                this.revealMap(true);
            });
        };
    }

    /** Màn đen nở ra từ chỗ Leo đứng, lộ bản đồ; ô mới thì hội thoại mèo 3 câu, xong mới vào chơi. */
    /**
     * Màn đen nở ra từ chỗ Leo đứng, lộ bản đồ.
     * Ô mới: có màn hướng dẫn (TutorialRoom) thì vào đó trước (nhạc menu chạy tiếp; ra cửa EXIT thì TutorialRoom lo hội thoại + nhạc rừng),
     * không có thì hội thoại mèo 3 câu luôn. Ô đã lưu: vào chơi ngay.
     */
    private revealMap(withDialogue: boolean) {
        const gm = GameManager.instance;
        const canvas = this.node.parent;
        this.leaving = true;
        this.node.active = false;
        if (!canvas) return;
        const tutorial = withDialogue ? GameSession.tutorial : null;
        if (tutorial) tutorial.enter();
        // Ô mới không có màn hướng dẫn: hội thoại không có nhạc; nhạc rừng bật khi vào chơi (GameManager.beginPlay)
        else if (withDialogue) Sound.stopMusic();
        const startPlay = () => {
            GameSession.waitingForStart = false;
            GameManager.instance?.beginPlay();
        };
        // Chờ camera nhảy tới chỗ mèo (sau khi đặt mèo ở checkpoint / màn hướng dẫn) rồi mới lấy tâm lỗ tròn
        setTimeout(() => {
            const [cx, cy] = IrisWipe.centerOf(gm?.player?.node);
            IrisWipe.open(0.8, () => {
                if (tutorial) {
                    // Màn hướng dẫn: điều khiển được, chưa bật nhạc rừng
                    GameSession.waitingForStart = false;
                    GameManager.instance?.beginPlay(false);
                    return;
                }
                if (!withDialogue || !canvas.isValid) {
                    startPlay();
                    return;
                }
                const portrait = gm?.player?.visual?.idleFrame ?? null;
                DialogueBox.show(canvas, portrait, 'dialog.name', ['dialog.1', 'dialog.2', 'dialog.3'], startPlay);
            }, cx, cy);
        }, 120);
    }

    private child(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        parent.addChild(n);
        return n;
    }
}
