import { _decorator, Camera, Color, Component, EventKeyboard, game, Input, input, KeyCode, Label, Node, RenderTexture, resources, screen, Sprite, SpriteFrame, sys, Texture2D, Tween, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
import { Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { GameSession } from '../game/GameSession';
import { PlayerInput } from '../player/PlayerInput';
import { PlayerVisual } from '../player/PlayerVisual';
import { CharacterSelect } from './CharacterSelect';
import { useGameFont } from './GameFont';
import { UI, uiButton, UiButton, uiDim, uiLabel, uiNode, uiPanel } from './UiKit';
const { ccclass, property } = _decorator;

type Page = 'start' | 'mode' | 'pick' | 'quit' | 'thanks';

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

/**
 * Màn mở đầu:
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
    private focus = 0;
    private toast: Label | null = null;
    private quitRoot: Node | null = null;
    private quitButtons: UiButton[] = [];
    private quitFocus = 1;
    private thanksRoot: Node | null = null;

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
    }

    start() {
        // Có ảnh nền menu thì không cần chụp màn chơi làm mờ
        if (this.node.getChildByName('MenuBg')) PlayerInput.clearQueues();
        else this.beginCapture();
    }

    onDestroy() {
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
        return false;
    }

    private setupMenu() {
        const menu = this.menu!;
        this.setActive('Start', false);
        this.items = MENU_ITEMS.map(([name]) => menu.getChildByName(name)).filter((n): n is Node => !!n && n.active);
        this.selection = menu.getChildByName('Selection');
        // Giữ khoảng lệch giữa khung chọn và dòng đầu như bạn đặt trong editor
        if (this.selection && this.items.length) this.selectionDy = this.selection.position.y - this.items[0].position.y;
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

    private focusMenu(i: number) {
        const item = this.items[i];
        if (!item) return;
        this.focus = i;
        const sel = this.selection;
        if (sel) sel.setPosition(sel.position.x, item.position.y + this.selectionDy, sel.position.z);
    }

    private chooseMenu(i: number) {
        const item = this.items[i];
        if (!item || this.leaving) return;
        switch (item.name) {
            case 'NewGame': this.onStart(); break;
            case 'Options': LandingScreen.openOptions?.(); break;
            case 'Quit': this.showQuit(); break;
            default: this.showToast(item, 'COMING SOON'); break;
        }
    }

    /** Chữ nâu nhỏ hiện bên phải dòng menu chừng 1 giây. */
    private showToast(item: Node, text: string) {
        if (!this.toast) {
            this.toast = uiLabel(this.node, '', 30, SMALL, { outline: SMALL_OUTLINE, outlineWidth: 3, name: 'Toast' });
            this.toast.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
            this.toast.node.addComponent(UIOpacity);
        }
        const t = this.toast;
        t.string = text;
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
            uiLabel(root, 'QUIT GAME?', 60, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4 }).node.setPosition(0, 60, 0);
            const yes = uiButton(root, 'YES', 240, 90, () => this.answerQuit(true), { fontSize: 44, name: 'Yes' });
            const no = uiButton(root, 'NO', 240, 90, () => this.answerQuit(false), { fontSize: 44, name: 'No' });
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
        this.quitFocus = i;
        this.quitButtons.forEach((b, k) => b.setFocus(k === i));
    }

    private answerQuit(yes: boolean) {
        if (this.quitRoot) this.quitRoot.active = false;
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
            uiLabel(root, 'THANKS FOR PLAYING!', 60, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4 }).node.setPosition(0, 90, 0);
            uiLabel(root, 'YOU CAN CLOSE THIS TAB NOW.', 30, SMALL, { outline: SMALL_OUTLINE, outlineWidth: 3 }).node.setPosition(0, 20, 0);
            const back = uiButton(root, 'BACK TO MENU', 480, 96, () => this.hideThanks(), { fontSize: 44, name: 'Back' });
            back.node.setPosition(0, -100, 0);
            back.setFocus(true);
            this.thanksRoot = root;
        }
        this.thanksRoot.setSiblingIndex(this.node.children.length - 1);
        this.thanksRoot.active = true;
        this.page = 'thanks';
        PlayerInput.clearQueues();
    }

    private hideThanks() {
        if (this.thanksRoot) this.thanksRoot.active = false;
        this.page = 'start';
        PlayerInput.clearQueues();
        const music = GameManager.instance?.music;
        if (music) Sound.music(music);
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
        const one = uiButton(root, '1 NGƯỜI', w, h, () => this.chooseMode(1), { frame, fontSize: 64, name: 'One' });
        const two = uiButton(root, '2 NGƯỜI', w, h, () => this.chooseMode(2), { frame, fontSize: 64, name: 'Two' });
        one.node.setPosition(-250, y, 0);
        two.node.setPosition(250, y, 0);
        one.node.on(Node.EventType.MOUSE_ENTER, () => this.focusMode(0));
        two.node.on(Node.EventType.MOUSE_ENTER, () => this.focusMode(1));
        this.modeButtons = [one, two];
        const hint1 = uiLabel(root, 'Đổi qua lại 2 mèo bằng phím Đổi mèo', 28, UI.cream, { outline: UI.brown, outlineWidth: 4 });
        hint1.node.setPosition(-250, y - h / 2 - 34, 0);
        const hint2 = uiLabel(root, 'Mỗi người một bộ phím', 28, UI.cream, { outline: UI.brown, outlineWidth: 4 });
        hint2.node.setPosition(250, y - h / 2 - 34, 0);
    }

    private focusMode(i: number) {
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

    /** Vào chơi: màn mở đầu mờ dần, xong thì mèo mới chạy được (để phím bấm chọn không làm mèo nhảy). */
    private go() {
        if (this.leaving || this.capture) return;
        this.leaving = true;
        LandingScreen.passed = true;
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
        const fade = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        tween(fade)
            .to(this.fadeTime, { opacity: 0 })
            .call(() => {
                GameSession.waitingForStart = false;
                GameManager.instance?.beginPlay();
                this.node.active = false;
            })
            .start();
        // Phóng nhẹ logo lên khi biến mất
        const logo = this.node.getChildByName('Logo');
        if (logo && logo.active) tween(logo).by(this.fadeTime, { position: new Vec3(0, 40, 0) }).start();
    }

    private child(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        parent.addChild(n);
        return n;
    }
}
