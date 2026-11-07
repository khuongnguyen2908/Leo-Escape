import { _decorator, Color, Component, director, EventKeyboard, EventTouch, Graphics, Input, input, KeyCode, Label, Node, screen, sys, UITransform, Vec3, view } from 'cc';
import { Action, ACTIONS, keyName, Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { GameSession, reloadScene } from '../game/GameSession';
import { PlayerInput } from '../player/PlayerInput';
import { actionName, Lang, T, TextKey } from './Lang';
import { LandingScreen } from './LandingScreen';
import { MenuNav, NavItem } from './MenuNav';
import { MENU_OUTLINE, MENU_SOFT, MENU_TEXT, MenuFocus, menuDivider, menuItem, menuShade, menuTitle, paintShade, ROW_SIZE } from './MenuStyle';
import { setText, UI, uiLabel, uiNode } from './UiKit';
const { ccclass, property } = _decorator;

type Page = 'main' | 'quit' | 'options' | 'game' | 'audio' | 'video' | 'controls';

/**
 * Bố cục các trang Cài đặt (cân giữa màn hình): tiêu đề, mép trái tên dòng, bề ngang dòng (hai hoa văn ở hai đầu),
 * tâm cột giá trị, thanh âm lượng, hai mục dưới đáy. Tên dòng từ -380, giá trị quanh +300, hoa văn ở ±490.
 */
const TITLE_Y = 360;
const ROW_X = -380;
const ROW_W = 920;
const VALUE_X = 300;
const BAR_W = 260;
const BAR_X0 = VALUE_X - BAR_W / 2 - 20;
/** Chơi 2 người: tâm cột phím Người 1, Người 2 */
const CELL_X2 = [190, 400];
/** Nút tròn Kiểu phím: tâm vòng WASD, vòng Mũi tên (so với VALUE_X), bán kính */
const RADIO_X = [-230, -40];
const RADIO_R = 13;
const RESET_Y = -290;
const BACK_Y = -380;
/** Bước chỉnh âm lượng (thang 0–10) */
const STEP = 0.1;
/** Nền tối: trong game (màn chơi có chỗ rất sáng như tờ giấy màn hướng dẫn, 205 vẫn còn sáng) và khi mở từ menu chính
 *  (nền menu vốn đã tối, tối nhẹ như trang Thành tích để vẫn thấy nền menu) */
const SHADE_GAME = 240;
const SHADE_MENU = 150;

/**
 * Menu tạm dừng và Cài đặt, cùng kiểu chữ menu chính (MenuStyle): nền tối, tiêu đề + đường hoa văn, các mục chữ trắng,
 * mục đang chọn có khung chọn + vệt sáng ngang chữ. Bấm Esc (hoặc nút bánh răng góc trên phải) để mở, game dừng lại.
 *   Tạm dừng: Tiếp tục · Cài đặt · Về menu chính (hỏi lại "Về menu chính?" với CÓ / KHÔNG hai hàng, mặc định KHÔNG).
 *   Cài đặt: Trò chơi · Âm thanh · Hình ảnh · Điều khiển · Quay lại. Mỗi trang con: tên dòng bên trái, giá trị bên phải,
 *   dòng đang chọn có « » hai đầu; cuối trang "Trả về mặc định" và "Quay lại". Chỉnh là áp dụng và lưu xuống máy luôn.
 *     - Trò chơi: Ngôn ngữ.   - Âm thanh: Âm lượng chung, Tiếng hiệu ứng, Nhạc nền (0–10).
 *     - Hình ảnh: Toàn màn hình, Rung màn hình.   - Điều khiển: Kiểu phím (WASD / Mũi tên), đổi lẻ từng phím.
 * Mọi trang chọn được bằng bàn phím (MenuNav): W/S ↑/↓ chọn, A/D ←/→ chỉnh, Enter / Space bấm, Esc quay lại.
 * OPTIONS ở menu chính mở thẳng trang Cài đặt (Quay lại thì đóng hẳn). DemoLevelBuilder tự tạo node Menu khi chơi.
 */
@ccclass('PauseMenu')
export class PauseMenu extends Component {
    static instance: PauseMenu | null = null;
    /** Màn khác (bảng kết quả...) đang hiện thì không mở menu tạm dừng. */
    static blockOpen: () => boolean = () => false;

    @property({ tooltip: 'Nút bánh răng cách mép phải và mép trên khung hình (x, y)' })
    gearRight = 70;

    @property
    gearTop = 230;

    private overlay: Node | null = null;
    private pages = new Map<Page, Node>();
    private navs = new Map<Page, MenuNav>();
    /** Đang mở từ OPTIONS của menu chính (không qua trang Tạm dừng). */
    private fromLanding = false;
    /** Vẽ lại giá trị các dòng (đổi ngôn ngữ, trả về mặc định, mở trang). */
    private refreshers: (() => void)[] = [];
    private keyCells: { p: number; a: Action; label: Label }[] = [];
    private layoutRows: { p: number; name: Label; draw: () => void }[] = [];
    private keyMessage: Label | null = null;
    private capturing: { p: number; a: Action } | null = null;
    private ignoreEscUntil = 0;
    /** Nút bánh răng: ẩn khi đang ở menu chính (ở đó đã có OPTIONS). */
    private gear: Node | null = null;
    private quitNo: NavItem | null = null;
    private shade: Graphics | null = null;
    /** Mở từ menu chính: gọi khi đóng (menu chính hiện lại logo, chữ menu) */
    private onClosed: (() => void) | null = null;

    get isOpen() { return !!this.overlay?.active; }

    onLoad() {
        PauseMenu.instance = this;
        LandingScreen.openOptions = (onClose) => this.openSettings(onClose);
        LandingScreen.pauseOpen = () => this.isOpen;
        const d = view.getDesignResolutionSize();
        this.makeGear(d.width, d.height);
        const overlay = uiNode('Overlay', this.node, d.width, d.height);
        this.shade = menuShade(overlay, d.width, d.height, SHADE_GAME).getComponent(Graphics);
        this.overlay = overlay;
        this.buildMain();
        this.buildQuit();
        this.buildOptions();
        this.buildGame();
        this.buildAudio();
        this.buildVideo();
        overlay.active = false;
        Lang.onChange(this.onLang);
    }

    start() {
        // Dựng trang Điều khiển ở start: lúc này GameManager đã biết có Angelo (chơi 2 người) hay không
        this.buildControls();
        // Nằm trên cùng, trên cả màn mở đầu
        this.node.setSiblingIndex(this.node.parent!.children.length - 1);
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    update() {
        // Đang ở menu chính (cả màn chọn số người, chọn mèo) hoặc bảng kết quả thì ẩn bánh răng
        if (this.gear) this.gear.active = !LandingScreen.instance?.showing && !PauseMenu.blockOpen();
    }

    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    onDestroy() {
        // Chỉ dọn dẹp, không vẽ lại gì (đổi scene: các nút đang bị xoá cùng lúc)
        Lang.offChange(this.onLang);
        for (const nav of this.navs.values()) nav.close(false);
        if (PauseMenu.instance === this) {
            PauseMenu.instance = null;
            LandingScreen.openOptions = null;
            LandingScreen.pauseOpen = () => false;
        }
        if (this.isOpen) director.resume();
    }

    /** Đổi ngôn ngữ: vẽ lại giá trị các dòng (BẬT / TẮT, tên phím...). */
    private readonly onLang = () => {
        if (this.isValid) this.refreshAll();
    };

    open() {
        if (this.isOpen || !this.overlay || PauseMenu.blockOpen()) return;
        this.overlay.active = true;
        this.fromLanding = false;
        this.paintOverlay(SHADE_GAME);
        this.show('main');
        director.pause();
    }

    /** OPTIONS ở menu chính: mở thẳng Cài đặt; Quay lại / Esc thì đóng hẳn, về menu chính (gọi onClose). */
    openSettings(onClose: (() => void) | null = null) {
        if (this.isOpen || !this.overlay) return;
        this.onClosed = onClose;
        this.overlay.active = true;
        this.fromLanding = true;
        this.paintOverlay(SHADE_MENU);
        this.show('options');
        director.pause();
    }

    private paintOverlay(alpha: number) {
        const d = view.getDesignResolutionSize();
        if (this.shade?.isValid) paintShade(this.shade, d.width, d.height, alpha);
    }

    close() {
        if (!this.isOpen || !this.overlay) return;
        this.stopCapture();
        for (const nav of this.navs.values()) nav.close();
        this.overlay.active = false;
        director.resume();
        PlayerInput.clearQueues();
        const done = this.onClosed;
        this.onClosed = null;
        done?.();
    }

    /** Esc khi menu đang đóng: mở menu (hoặc lùi một bước ở màn mở đầu). Menu đang mở thì MenuNav lo Esc. */
    private onKey(e: EventKeyboard) {
        if (e.keyCode !== KeyCode.ESCAPE && e.keyCode !== KeyCode.MOBILE_BACK) return;
        if (this.isOpen || this.capturing || Date.now() < this.ignoreEscUntil) return;
        // Đang ở màn chọn số người / chọn mèo thì Esc là quay lại bước trước
        if (LandingScreen.instance?.back()) return;
        if (MenuNav.busy) return; // bảng khác (kết quả, tác giả...) đang nhận phím
        this.open();
    }

    /** Mở trang page. back = true: quay lại từ trang con, giữ mục đang chọn lúc trước. */
    private show(page: Page, back = false) {
        this.stopCapture();
        for (const [k, n] of this.pages) n.active = k === page;
        this.refreshAll();
        this.say('');
        for (const [k, nav] of this.navs) if (k !== page) nav.close();
        this.navs.get(page)?.open(page === 'quit' ? this.quitNo ?? undefined : undefined, back);
    }

    private refreshAll() {
        for (const r of this.refreshers) r();
        this.refreshKeys();
    }

    private goHome() {
        this.close();
        LandingScreen.passed = false;
        GameSession.reset();
        reloadScene();
    }

    /** Một trang: node gốc, bộ điều hướng phím, chỗ đang chọn (khung + vệt sáng), tiêu đề nếu có. */
    private makePage(name: Page, back: () => void, title: TextKey | null): { root: Node; nav: MenuNav; focus: MenuFocus } {
        const d = view.getDesignResolutionSize();
        const root = uiNode(name, this.overlay!, d.width, d.height);
        const nav = new MenuNav(back);
        this.navs.set(name, nav);
        this.pages.set(name, root);
        const focus = new MenuFocus(root);
        if (title) menuTitle(root, title, TITLE_Y);
        root.active = false;
        return { root, nav, focus };
    }

    // ---------- Tạm dừng ----------

    private buildMain() {
        const { root, nav, focus } = this.makePage('main', () => this.close(), null);
        menuTitle(root, 'pause.title', 230);
        menuItem(root, 'pause.resume', 70, nav, focus, () => this.close());
        menuItem(root, 'pause.settings', -30, nav, focus, () => this.show('options'));
        menuItem(root, 'pause.quitMenu', -130, nav, focus, () => this.show('quit'));
    }

    /** Về menu chính? — đường hoa văn trên cùng, tiêu đề, dòng phụ, CÓ / KHÔNG hai hàng (mặc định KHÔNG). */
    private buildQuit() {
        const back = () => this.show('main', true);
        const { root, nav, focus } = this.makePage('quit', back, null);
        menuDivider(root, 240, 640);
        const title = uiLabel(root, '', 64, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 5 });
        Lang.bind(title, 'confirm.quitMenu');
        title.node.setPosition(0, 170, 0);
        const sub = uiLabel(root, '', 34, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3 });
        Lang.bind(sub, 'confirm.quitSub');
        sub.node.setPosition(0, 105, 0);
        menuItem(root, 'yes', -10, nav, focus, () => this.goHome());
        this.quitNo = menuItem(root, 'no', -110, nav, focus, back);
    }

    // ---------- Cài đặt ----------

    private leaveOptions() {
        if (this.fromLanding) this.close();
        else this.show('main', true);
    }

    private buildOptions() {
        const { root, nav, focus } = this.makePage('options', () => this.leaveOptions(), 'settings.title');
        menuItem(root, 'opt.game', 170, nav, focus, () => this.show('game'));
        menuItem(root, 'opt.audio', 80, nav, focus, () => this.show('audio'));
        menuItem(root, 'opt.video', -10, nav, focus, () => this.show('video'));
        menuItem(root, 'opt.controls', -100, nav, focus, () => this.show('controls'));
        menuItem(root, 'back', BACK_Y, nav, focus, () => this.leaveOptions());
    }

    /** Cuối mỗi trang con: Trả về mặc định, Quay lại. */
    private pageFooter(root: Node, nav: MenuNav, focus: MenuFocus, reset: () => void) {
        menuItem(root, 'opt.reset', RESET_Y, nav, focus, () => {
            reset();
            this.refreshAll();
        });
        menuItem(root, 'back', BACK_Y, nav, focus, () => this.show('options', true));
    }

    private buildGame() {
        const { root, nav, focus } = this.makePage('game', () => this.show('options', true), 'opt.gameTitle');
        const flipLang = () => { Lang.code = Lang.code === 'vi' ? 'en' : 'vi'; };
        this.choiceRow(root, nav, focus, 'settings.lang', 170, () => T('settings.langName'), flipLang);
        this.pageFooter(root, nav, focus, () => Settings.resetGame());
    }

    private buildAudio() {
        const { root, nav, focus } = this.makePage('audio', () => this.show('options', true), 'opt.audioTitle');
        this.sliderRow(root, nav, focus, 'opt.master', 170, () => Settings.master, (v) => { Settings.master = v; Sound.applySettings(); });
        this.sliderRow(root, nav, focus, 'settings.sfx', 80, () => Settings.sfx, (v) => {
            Settings.sfx = v;
            Sound.applySettings();
            Sound.play('coin', 0.8);
        });
        this.sliderRow(root, nav, focus, 'settings.music', -10, () => Settings.music, (v) => { Settings.music = v; Sound.applySettings(); });
        this.pageFooter(root, nav, focus, () => {
            Settings.resetAudio();
            Sound.applySettings();
        });
    }

    private buildVideo() {
        const { root, nav, focus } = this.makePage('video', () => this.show('options', true), 'opt.videoTitle');
        let y = 170;
        // Điện thoại không có toàn màn hình
        if (!sys.isMobile) {
            this.choiceRow(root, nav, focus, 'settings.fullscreen', y, () => T(screen.fullScreen() ? 'on' : 'off'), () => this.setFullscreen(!screen.fullScreen()));
            y -= 90;
        }
        this.choiceRow(root, nav, focus, 'settings.shake', y, () => T(Settings.shake ? 'on' : 'off'), () => { Settings.shake = !Settings.shake; });
        this.pageFooter(root, nav, focus, () => {
            Settings.resetVideo();
            if (screen.fullScreen() !== Settings.fullscreen) this.setFullscreen(Settings.fullscreen);
        });
    }

    private setFullscreen(on: boolean) {
        Settings.fullscreen = on;
        const done = on ? screen.requestFullScreen() : screen.exitFullScreen();
        // Trình duyệt bật / tắt xong mới đổi chữ BẬT / TẮT
        done?.then(() => this.refreshAll()).catch(() => { /* trình duyệt không cho thì thôi */ });
    }

    private buildControls() {
        const two = GameSession.angelo;
        const players = two ? 2 : 1;
        // Không có Angelo: chỉ phím của Người 1; bỏ dòng Đổi mèo, Kỹ năng, Tương tác (lướt chỉ bằng bấm đúp)
        const actions = two ? ACTIONS : ACTIONS.filter((a) => a !== 'swap' && a !== 'skill' && a !== 'interact');
        const cellX = two ? CELL_X2 : [VALUE_X];
        const step = two ? 46 : 62;
        const { root, nav, focus } = this.makePage('controls', () => this.show('options', true), 'opt.controlsTitle');
        let y = two ? 250 : 230;
        if (two) {
            for (let p = 0; p < 2; p++) {
                const head = uiLabel(root, '', 30, p === 0 ? UI.p1 : UI.p2, { outline: MENU_OUTLINE, outlineWidth: 3 });
                Lang.bind(head, 'keys.player', p + 1);
                head.node.setPosition(cellX[p], y + 4, 0);
            }
            y -= step;
        }
        // Kiểu phím: hai nút tròn WASD / Mũi tên (chơi 2 người thì mỗi người một dòng)
        for (let p = 0; p < players; p++) {
            this.layoutRow(root, nav, focus, y, p, two);
            y -= step;
        }
        for (const a of actions) {
            this.rowName(root, () => actionName(a), y, two ? 32 : 38);
            // 1 người: rê / bấm chỗ nào trên dòng cũng được; 2 người: mỗi ô một vùng, rê vào tên dòng thì chọn ô Người 1
            const cells: NavItem[] = [];
            for (let p = 0; p < players; p++) {
                const cell = this.cell(root, nav, focus, cellX[p], y, two ? 30 : 36, () => this.startCapture(p, a), null, !two);
                this.keyCells.push({ p, a, label: cell.label });
                cells.push(cell.item);
            }
            if (two) {
                const nameHit = this.rowHit(root, y, ROW_X + 140, 300);
                nameHit.on(Node.EventType.MOUSE_ENTER, () => { if (nav.isOpen) nav.focusItem(cells[0]); });
            }
            y -= step;
        }
        this.keyMessage = uiLabel(root, '', 28, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'Message' });
        this.keyMessage.node.setPosition(0, Math.min(y + step * 0.2, RESET_Y + 70), 0);
        this.pageFooter(root, nav, focus, () => {
            this.stopCapture();
            Settings.resetKeys();
            this.say(T('keys.resetDone'));
        });
        this.refreshKeys();
    }

    // ---------- Các kiểu dòng ----------

    /** Tên dòng: chữ trắng viền nâu, mép trái ở ROW_X. */
    private rowName(root: Node, key: TextKey | (() => string), y: number, size = ROW_SIZE): Label {
        const l = uiLabel(root, '', size, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 4, name: 'RowName' });
        if (typeof key === 'function') Lang.bindFn(l, key);
        else Lang.bind(l, key);
        l.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        l.node.setPosition(ROW_X, y, 0);
        return l;
    }

    /** Vùng bấm / rê chuột của cả dòng (nằm dưới chữ). */
    private rowHit(root: Node, y: number, x = 0, w = ROW_W): Node {
        const n = uiNode('RowHit', root, w, 64);
        n.setPosition(x, y, 0);
        n.setSiblingIndex(0);
        return n;
    }

    /** Dòng chọn giá trị (Ngôn ngữ, BẬT / TẮT): bấm, A, D đều đổi. */
    private choiceRow(root: Node, nav: MenuNav, focus: MenuFocus, key: TextKey, y: number, value: () => string, flip: () => void) {
        this.rowName(root, key, y);
        const val = uiLabel(root, '', 38, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'Value' });
        val.node.setPosition(VALUE_X, y, 0);
        const refresh = () => { if (val.isValid) setText(val, value()); };
        this.refreshers.push(refresh);
        const change = () => {
            Sound.play('ui_move', 0.7);
            flip();
            refresh();
        };
        const hit = this.rowHit(root, y);
        const item: NavItem = {
            node: hit, press: change, left: change, right: change,
            focus: (on) => {
                val.color = on ? MENU_TEXT : MENU_SOFT;
                if (on) focus.onRow(y, 0, ROW_W);
            },
        };
        hit.on(Node.EventType.TOUCH_END, () => { if (nav.isOpen) { nav.focusItem(item); change(); } });
        nav.add(item);
    }

    /** Dòng âm lượng: thanh ngang + số 0–10. A / D chỉnh từng nấc, kéo / bấm trên thanh cũng được. */
    private sliderRow(root: Node, nav: MenuNav, focus: MenuFocus, key: TextKey, y: number, get: () => number, set: (v: number) => void) {
        this.rowName(root, key, y);
        const bar = uiNode('Bar', root, BAR_W + 40, 60);
        bar.setPosition(BAR_X0 + BAR_W / 2, y, 0);
        const g = bar.addComponent(Graphics);
        const num = uiLabel(root, '', 36, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'Number' });
        num.node.setPosition(BAR_X0 + BAR_W + 60, y, 0);
        let focused = false;
        const paint = () => {
            if (!g.isValid) return;
            const v = get();
            g.clear();
            g.fillColor = new Color(250, 240, 222, 90);
            g.rect(-BAR_W / 2, -2, BAR_W, 4);
            g.fill();
            g.fillColor = focused ? MENU_TEXT : MENU_SOFT;
            g.rect(-BAR_W / 2, -2, BAR_W * v, 4);
            g.fill();
            g.circle(-BAR_W / 2 + BAR_W * v, 0, focused ? 11 : 8);
            g.fill();
            g.strokeColor = MENU_OUTLINE;
            g.lineWidth = 3;
            g.stroke();
            setText(num, `${Math.round(v * 10)}`);
            num.color = focused ? MENU_TEXT : MENU_SOFT;
        };
        this.refreshers.push(paint);
        const nudge = (dir: number) => {
            const v = Math.max(0, Math.min(1, Math.round((get() + dir * STEP) * 10) / 10));
            if (v === get()) return;
            set(v);
            paint();
            if (key !== 'settings.sfx') Sound.play('ui_move', 0.6);
        };
        const fromTouch = (e: EventTouch) => {
            const p = e.getUILocation();
            const local = bar.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
            const v = Math.round(Math.max(0, Math.min(1, (local.x + BAR_W / 2) / BAR_W)) * 10) / 10;
            if (v !== get()) {
                set(v);
                paint();
            }
        };
        bar.on(Node.EventType.TOUCH_START, fromTouch);
        bar.on(Node.EventType.TOUCH_MOVE, fromTouch);
        const hit = this.rowHit(root, y);
        const item: NavItem = {
            node: hit, left: () => nudge(-1), right: () => nudge(1),
            focus: (on) => {
                focused = on;
                paint();
                if (on) focus.onRow(y, 0, ROW_W);
            },
        };
        nav.add(item);
    }

    /** Một ô giá trị bấm được trong dòng (phím). wholeRow: vùng rê / bấm phủ cả dòng. Trả về chữ và mục điều hướng của ô. */
    private cell(root: Node, nav: MenuNav, focus: MenuFocus, x: number, y: number, size: number,
        press: () => void, side: (() => void) | null, wholeRow = false): { label: Label; item: NavItem } {
        const label = uiLabel(root, '', size, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'Cell' });
        label.node.setPosition(x, y, 0);
        const hit = wholeRow ? this.rowHit(root, y) : this.rowHit(root, y, x, 200);
        const run = () => {
            Sound.play('ui_click', 0.7);
            press();
        };
        const item: NavItem = {
            node: hit, press: run,
            left: side ?? undefined, right: side ?? undefined,
            focus: (on) => {
                label.color = on ? UI.accent : MENU_SOFT;
                if (on) focus.onRow(y, 0, ROW_W);
            },
        };
        hit.on(Node.EventType.TOUCH_END, () => { if (nav.isOpen) { nav.focusItem(item); run(); } });
        nav.add(item);
        return { label, item };
    }

    /**
     * Dòng Kiểu phím của người p: hai nút tròn (radio) WASD / Mũi tên, cái đang dùng được tô đặc.
     * A / D / bấm để đổi qua lại; bấm chuột vào từng lựa chọn để chọn thẳng. Đổi lẻ phím thì cả hai trống, tên dòng ghi (Tuỳ chỉnh).
     */
    private layoutRow(root: Node, nav: MenuNav, focus: MenuFocus, y: number, p: number, two: boolean) {
        const name = this.rowName(root, 'keys.layout', y, two ? 32 : ROW_SIZE);
        const radio = uiNode('Radio', root, 10, 10);
        radio.setPosition(VALUE_X, y, 0);
        const g = radio.addComponent(Graphics);
        const options: ('wasd' | 'arrows')[] = ['wasd', 'arrows'];
        const labels = options.map((o, i) => {
            const l = uiLabel(root, '', 34, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3, name: `Radio_${o}` });
            l.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
            l.node.setPosition(VALUE_X + RADIO_X[i] + RADIO_R + 14, y, 0);
            return l;
        });
        let focused = false;
        const draw = () => {
            if (!g.isValid) return;
            const layout = Settings.layout(p);
            g.clear();
            options.forEach((o, i) => {
                const on = layout === o;
                g.strokeColor = focused ? MENU_TEXT : MENU_SOFT;
                g.lineWidth = 3;
                g.circle(RADIO_X[i], 0, RADIO_R);
                g.stroke();
                if (on) {
                    g.fillColor = focused ? UI.accent : MENU_TEXT;
                    g.circle(RADIO_X[i], 0, RADIO_R - 6);
                    g.fill();
                }
                setText(labels[i], T(o === 'wasd' ? 'keys.wasd' : 'keys.arrows'));
                labels[i].color = on ? (focused ? UI.accent : MENU_TEXT) : MENU_SOFT;
            });
            const head = T('keys.layout') + (two ? ` · ${T('keys.player', p + 1)}` : '');
            setText(name, layout === 'custom' ? `${head} (${T('keys.custom')})` : head);
        };
        const choose = (next: 'wasd' | 'arrows') => {
            this.stopCapture();
            if (Settings.layout(p) === next) return;
            Sound.play('ui_move', 0.7);
            Settings.setLayout(p, next);
            this.refreshKeys();
            this.say(T('keys.layoutDone', T(next === 'wasd' ? 'keys.wasd' : 'keys.arrows')));
        };
        const flip = () => choose(Settings.layout(p) === 'wasd' ? 'arrows' : 'wasd');
        const hit = this.rowHit(root, y);
        const item: NavItem = {
            node: hit, press: flip, left: flip, right: flip,
            focus: (on) => {
                focused = on;
                draw();
                if (on) focus.onRow(y, 0, ROW_W);
            },
        };
        hit.on(Node.EventType.TOUCH_END, () => { if (nav.isOpen) { nav.focusItem(item); flip(); } });
        // Bấm thẳng vào từng lựa chọn (vòng tròn hoặc chữ)
        options.forEach((o, i) => {
            const opt = uiNode(`Pick_${o}`, root, 170, 56);
            opt.setPosition(VALUE_X + RADIO_X[i] + 70, y, 0);
            opt.on(Node.EventType.MOUSE_ENTER, () => { if (nav.isOpen) nav.focusItem(item); });
            opt.on(Node.EventType.TOUCH_END, () => {
                if (!nav.isOpen) return;
                nav.focusItem(item);
                choose(o);
            });
        });
        nav.add(item);
        this.layoutRows.push({ p, name, draw });
    }

    // ---------- Đổi phím ----------

    private refreshKeys() {
        for (const c of this.keyCells) {
            if (!c.label.isValid) continue;
            const busy = this.capturing && this.capturing.p === c.p && this.capturing.a === c.a;
            setText(c.label, busy ? T('keys.press') : keyName(Settings.key(c.p, c.a)), false);
        }
        for (const r of this.layoutRows) if (r.name.isValid) r.draw();
    }

    private startCapture(p: number, a: Action) {
        this.capturing = { p, a };
        this.refreshKeys();
        this.say(T('keys.prompt', p + 1, actionName(a)));
        PlayerInput.captureNextKey((code) => {
            const cell = this.capturing;
            this.capturing = null;
            this.ignoreEscUntil = Date.now() + 80;
            MenuNav.mute();
            if (!cell) return;
            if (code === KeyCode.ESCAPE || code === KeyCode.MOBILE_BACK) {
                this.say(T('keys.cancelled'));
            } else {
                const swapped = Settings.setKey(cell.p, cell.a, code);
                this.say(swapped
                    ? T('keys.swapped', keyName(code), swapped.player + 1, actionName(swapped.action))
                    : T('keys.set', cell.p + 1, actionName(cell.a), keyName(code)));
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
        if (this.keyMessage?.isValid) setText(this.keyMessage, text, false);
    }

    // ---------- Nút bánh răng ----------

    private makeGear(w: number, h: number) {
        const r = 40;
        const n = uiNode('Gear', this.node, r * 2.4, r * 2.4);
        this.gear = n;
        n.setPosition(w / 2 - this.gearRight, h / 2 - this.gearTop, 0);
        const g = n.addComponent(Graphics);
        const paint = (down: boolean) => {
            if (!g.isValid) return;
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
