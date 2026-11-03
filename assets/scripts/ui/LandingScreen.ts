import { _decorator, Camera, Color, Component, EventKeyboard, Input, input, KeyCode, Label, Node, RenderTexture, resources, screen, Sprite, SpriteFrame, sys, Texture2D, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
import { Settings } from '../core/Settings';
import { GameManager } from '../game/GameManager';
import { GameSession } from '../game/GameSession';
import { PlayerInput } from '../player/PlayerInput';
import { PlayerVisual } from '../player/PlayerVisual';
import { CharacterSelect } from './CharacterSelect';
import { useGameFont } from './GameFont';
import { UI, uiButton, UiButton, uiLabel, uiNode } from './UiKit';
const { ccclass, property } = _decorator;

type Page = 'start' | 'mode' | 'pick';

/**
 * Màn mở đầu trên nền là chính màn chơi làm mờ:
 *   1. Logo + nút START (Enter, hoặc phím Nhảy / Đánh của người chơi nào cũng được).
 *   2. Chọn 1 NGƯỜI (điều khiển Leo, phím Đổi mèo để đổi) hoặc 2 NGƯỜI. Điện thoại bỏ qua bước này, vào thẳng 1 người.
 *   3. Chơi 2 người: màn chọn mèo (CharacterSelect). Esc để quay lại bước trước.
 * Chỉ hiện một lần khi mở game: thua rồi chơi lại thì vào thẳng màn chơi. "Về màn hình chính" trong menu thì hiện lại.
 * Gắn lên node Landing dưới Canvas (nút "⚙ Cập nhật" trên DemoLevelBuilder tự tạo nếu chưa có).
 * Logo: kéo ảnh vào ô Logo Frame, hoặc đặt ảnh tên MG_logo trong assets/resources/art là tự dùng; chưa có thì hiện chữ.
 */
@ccclass('LandingScreen')
export class LandingScreen extends Component {
    /** Đã bấm START trong lần mở game này (giữ qua các lần tải lại scene). */
    static passed = false;
    static instance: LandingScreen | null = null;

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
        this.setupStart();
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    start() {
        this.beginCapture();
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
        if (this.page === 'start') {
            if (c.consumeJump() || c.consumeAttack()) this.onStart();
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
            this.setActive('Start', true);
            this.setActive('Logo', true);
            return true;
        }
        return false;
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
        if (e.keyCode === KeyCode.ENTER && this.page === 'start' && !this.leaving) this.onStart();
        else if (e.keyCode === KeyCode.ENTER && this.page === 'mode' && !this.leaving) this.chooseMode(this.modeFocus === 0 ? 1 : 2);
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
        resources.load(`${this.artFolder}/MG_logo/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err && sf) show(sf);
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
