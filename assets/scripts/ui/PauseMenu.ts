import { _decorator, Color, Component, director, EventKeyboard, Graphics, Input, input, KeyCode, Label, Node, screen, sys, view } from 'cc';
import { Action, ACTIONS, keyName, Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { GameSession, reloadScene } from '../game/GameSession';
import { PlayerInput } from '../player/PlayerInput';
import { actionName, Lang, T, TextKey } from './Lang';
import { LandingScreen } from './LandingScreen';
import { MenuNav, NavItem } from './MenuNav';
import { navButton, setText, UI, uiButton, UiButton, uiDim, uiLabel, uiNode, uiPanel, uiSlider, uiToggle } from './UiKit';
const { ccclass, property } = _decorator;

type Page = 'main' | 'settings' | 'confirm';
type Tab = 'system' | 'controls';

const SAVE_GREEN = new Color(0x3b, 0x71, 0x13, 255);
const SAVE_GREEN_DOWN = new Color(0x52, 0x8c, 0x22, 255);

/**
 * Menu tạm dừng: bấm Esc (hoặc nút bánh răng góc trên phải) để mở, game dừng lại.
 *   Tiếp tục · Chơi lại màn · Cài đặt · Về màn hình chính (hai nút làm mất tiến độ thì hỏi lại, mặc định KHÔNG).
 *   Cài đặt: một bảng hai tab, thanh tab trên cùng, thanh Lưu · Quay lại cố định dưới đáy cho cả hai tab.
 *     - Hệ thống: âm lượng nhạc nền, tiếng hiệu ứng, toàn màn hình, rung màn hình, ngôn ngữ.
 *     - Điều khiển: Kiểu phím (WASD / Mũi tên), đổi lẻ từng phím, Trả về mặc định.
 *     Chỉnh là áp dụng ngay để thử; bấm Lưu mới ghi xuống máy. Quay lại khi chưa lưu thì hỏi "Bỏ thay đổi?".
 * Mọi trang chọn được bằng bàn phím (MenuNav): W/S ↑/↓ chọn, A/D ←/→ chỉnh (ở thanh tab: đổi tab), Enter / Space bấm, Esc quay lại.
 * Hình vẽ tạm bằng code. DemoLevelBuilder tự tạo node Menu khi chơi.
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
    private page: Page = 'main';
    private tab: Tab = 'system';
    private tabRoots = new Map<Tab, Node>();
    private tabLabels: { tab: Tab; node: Node; draw: () => void }[] = [];
    private restartButton: UiButton | null = null;
    private homeButton: UiButton | null = null;
    private keyCells: { p: number; a: Action; button: UiButton }[] = [];
    private keyMessage: Label | null = null;
    private saveMessage: Label | null = null;
    private layoutLabels: Label[] = [];
    private capturing: { p: number; a: Action } | null = null;
    private ignoreEscUntil = 0;
    private refreshSettings: (() => void) | null = null;
    /** Nút bánh răng: ẩn khi đang ở menu chính (ở đó đã có OPTIONS). */
    private gear: Node | null = null;
    /** Đang mở từ OPTIONS của menu chính (không qua trang Tạm dừng). */
    private fromLanding = false;
    private confirmTitle: Label | null = null;
    private confirmSub: Label | null = null;
    private confirmYes: (() => void) | null = null;
    private confirmFrom: Page = 'main';
    private confirmNo: NavItem | null = null;

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
        this.pages.set('confirm', this.buildConfirm());
        overlay.active = false;
        Lang.onChange(this.onLang);
    }

    start() {
        // Dựng Cài đặt ở start: lúc này GameManager đã biết có Angelo (chơi 2 người) hay không
        const settings = this.buildSettings();
        settings.active = false;
        this.pages.set('settings', settings);
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
        if (Settings.dirty) Settings.cancelEdit();
        else Settings.endEdit();
        if (PauseMenu.instance === this) {
            PauseMenu.instance = null;
            LandingScreen.openOptions = null;
            LandingScreen.pauseOpen = () => false;
        }
        if (this.isOpen) director.resume();
    }

    /** Đổi ngôn ngữ: vẽ lại chữ BẬT / TẮT của công tắc, ô phím, thanh tab. */
    private readonly onLang = () => {
        if (!this.isValid) return;
        this.refreshSettings?.();
        this.refreshKeys();
        for (const t of this.tabLabels) t.draw();
    };

    open() {
        if (this.isOpen || !this.overlay || PauseMenu.blockOpen()) return;
        this.overlay.active = true;
        this.fromLanding = false;
        this.show('main');
        director.pause();
    }

    /** OPTIONS ở menu chính: mở thẳng Cài đặt; Quay lại / Esc thì đóng hẳn, về menu chính. */
    openSettings() {
        if (this.isOpen || !this.overlay) return;
        this.overlay.active = true;
        this.fromLanding = true;
        this.show('settings');
        director.pause();
    }

    close() {
        if (!this.isOpen || !this.overlay) return;
        this.stopCapture();
        for (const nav of this.navs.values()) nav.close();
        this.overlay.active = false;
        director.resume();
        PlayerInput.clearQueues();
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

    /** Mở trang page. back = true: quay lại từ trang con, giữ ô đang chọn lúc trước. */
    private show(page: Page, back = false) {
        this.stopCapture();
        const from = this.page;
        this.page = page;
        for (const [k, n] of this.pages) n.active = k === page;
        if (page === 'main') {
            // Đang ở màn mở đầu thì không cần nút về màn hình chính / chơi lại
            const playing = !LandingScreen.instance?.showing;
            if (this.homeButton) this.homeButton.node.active = playing;
            if (this.restartButton) this.restartButton.node.active = playing;
        }
        if (page === 'settings') {
            // Vào Cài đặt (không phải quay lại từ bảng hỏi): bắt đầu phiên chỉnh, chưa ghi xuống máy
            if (from !== 'confirm') {
                Settings.beginEdit();
                this.setTab('system');
                this.say('');
                if (this.saveMessage) setText(this.saveMessage, '');
            }
            this.refreshSettings?.();
            this.refreshKeys();
        }
        for (const [k, nav] of this.navs) if (k !== page) nav.close();
        this.navs.get(page)?.open(undefined, back);
    }

    private goHome() {
        this.close();
        LandingScreen.passed = false;
        GameSession.reset();
        reloadScene();
    }

    private restart() {
        this.close();
        reloadScene();
    }

    // ---------- Trang chính ----------

    private buildMain(): Node {
        const nav = new MenuNav(() => this.close());
        this.navs.set('main', nav);
        const panel = uiPanel(this.overlay!, 640, 680, 'Main');
        const title = uiLabel(panel, '', 64, UI.text);
        Lang.bind(title, 'pause.title');
        title.node.setPosition(0, 250, 0);
        const button = (key: TextKey, y: number, onClick: () => void) => {
            const b = uiButton(panel, '', 440, 96, onClick, { fontSize: 42 });
            Lang.bind(b.label, key);
            b.node.setPosition(0, y, 0);
            nav.add(navButton(b));
            return b;
        };
        button('pause.resume', 120, () => this.close());
        this.restartButton = button('pause.restart', 0, () => this.ask('confirm.restart', 'confirm.lost', () => this.restart()));
        button('pause.settings', -120, () => this.show('settings'));
        this.homeButton = button('pause.home', -240, () => this.ask('confirm.home', 'confirm.lost', () => this.goHome()));
        return panel;
    }

    // ---------- Hỏi lại ----------

    private buildConfirm(): Node {
        const panel = uiPanel(this.overlay!, 820, 400, 'Confirm');
        this.confirmTitle = uiLabel(panel, '', 52, UI.text);
        this.confirmTitle.node.setPosition(0, 100, 0);
        this.confirmSub = uiLabel(panel, '', 32, UI.text);
        this.confirmSub.node.setPosition(0, 30, 0);
        const back = () => this.show(this.confirmFrom, true);
        const nav = new MenuNav(back);
        this.navs.set('confirm', nav);
        const yes = uiButton(panel, '', 260, 96, () => this.confirmYes?.(), { fontSize: 44, name: 'Yes' });
        const no = uiButton(panel, '', 260, 96, back, { fontSize: 44, name: 'No' });
        Lang.bind(yes.label, 'yes');
        Lang.bind(no.label, 'no');
        yes.node.setPosition(-160, -90, 0);
        no.node.setPosition(160, -90, 0);
        // Trái / phải đổi qua lại giữa CÓ và KHÔNG
        const yesItem: NavItem = navButton(yes);
        const noItem: NavItem = navButton(no);
        yesItem.right = () => nav.focusItem(noItem);
        noItem.left = () => nav.focusItem(yesItem);
        nav.add(yesItem);
        nav.add(noItem);
        this.confirmNo = noItem;
        return panel;
    }

    /** Hỏi lại trước khi làm việc mất tiến độ / bỏ thay đổi; mặc định chọn KHÔNG cho khỏi lỡ tay. */
    private ask(title: TextKey, sub: TextKey, yes: () => void) {
        this.confirmFrom = this.page;
        this.confirmYes = yes;
        if (this.confirmTitle) Lang.bind(this.confirmTitle, title);
        if (this.confirmSub) Lang.bind(this.confirmSub, sub);
        this.show('confirm');
        if (this.confirmNo) this.navs.get('confirm')?.focusItem(this.confirmNo);
    }

    // ---------- Cài đặt (hai tab) ----------

    /** Quay lại / Esc: chưa lưu thì hỏi bỏ thay đổi; xong thì về trang Tạm dừng (hoặc đóng hẳn nếu mở từ menu chính). */
    private backFromSettings() {
        if (Settings.dirty) {
            this.ask('confirm.discard', 'confirm.discardSub', () => {
                Settings.cancelEdit();
                this.applySystem();
                this.leaveSettings();
            });
            return;
        }
        Settings.endEdit();
        this.leaveSettings();
    }

    private leaveSettings() {
        if (this.fromLanding) this.close();
        else this.show('main', true);
    }

    private save() {
        this.stopCapture();
        Settings.commitEdit();
        const l = this.saveMessage;
        if (l) {
            setText(l, T('settings.saved'));
            // setTimeout: tween / scheduleOnce không chạy khi game đang tạm dừng
            setTimeout(() => { if (l.isValid) setText(l, ''); }, 1500);
        }
    }

    /** Áp lại âm lượng, toàn màn hình theo cài đặt hiện có (sau khi bỏ thay đổi). */
    private applySystem() {
        Sound.setVolumes(Settings.music, Settings.sfx);
        if (Settings.fullscreen !== screen.fullScreen()) {
            const done = Settings.fullscreen ? screen.requestFullScreen() : screen.exitFullScreen();
            done?.catch(() => { /* trình duyệt không cho thì thôi */ });
        }
    }

    private setTab(tab: Tab) {
        this.stopCapture();
        this.tab = tab;
        for (const [k, n] of this.tabRoots) n.active = k === tab;
        for (const t of this.tabLabels) t.draw();
    }

    private buildSettings(): Node {
        const nav = new MenuNav(() => this.backFromSettings());
        this.navs.set('settings', nav);
        const panel = uiPanel(this.overlay!, 1180, 1000, 'Settings');
        const title = uiLabel(panel, '', 56, UI.text);
        Lang.bind(title, 'settings.title');
        title.node.setPosition(0, 435, 0);

        // Thanh tab: một ô điều hướng, A/D đổi tab; bấm chuột vào từng tab cũng được
        const tabBar = uiNode('Tabs', panel, 600, 72);
        tabBar.setPosition(0, 345, 0);
        const ring = tabBar.addComponent(Graphics);
        let barFocus = false;
        const drawRing = () => {
            if (!ring.isValid) return;
            ring.clear();
            if (!barFocus) return;
            ring.strokeColor = UI.accent;
            ring.lineWidth = 7;
            ring.roundRect(-308, -44, 616, 88, 22);
            ring.stroke();
        };
        const makeTab = (tab: Tab, x: number, key: TextKey) => {
            const n = uiNode(`Tab_${tab}`, tabBar, 290, 72);
            n.setPosition(x, 0, 0);
            const g = n.addComponent(Graphics);
            const label = uiLabel(n, '', 36, UI.cream);
            Lang.bind(label, key);
            const draw = () => {
                if (!g.isValid) return;
                const on = this.tab === tab;
                g.clear();
                g.fillColor = on ? UI.brown : UI.creamDim;
                g.roundRect(-145, -36, 290, 72, 18);
                g.fill();
                label.color = on ? UI.cream : UI.text;
            };
            n.on(Node.EventType.TOUCH_END, () => { this.setTab(tab); nav.focusItem(tabItem); });
            this.tabLabels.push({ tab, node: n, draw });
            draw();
        };
        makeTab('system', -150, 'settings.tabSystem');
        makeTab('controls', 150, 'settings.tabControls');
        const flipTab = () => this.setTab(this.tab === 'system' ? 'controls' : 'system');
        const tabItem: NavItem = { node: tabBar, left: flipTab, right: flipTab, press: flipTab, focus: (on) => { barFocus = on; drawRing(); } };
        nav.add(tabItem);

        // Nội dung hai tab (chỉ phần này đổi khi đổi tab)
        const system = uiNode('System', panel, 1100, 640);
        system.setPosition(0, -20, 0);
        const controls = uiNode('Controls', panel, 1100, 640);
        controls.setPosition(0, -20, 0);
        this.tabRoots.set('system', system);
        this.tabRoots.set('controls', controls);
        this.buildSystemTab(system, nav);
        this.buildControlsTab(controls, nav);

        // Thanh dưới đáy, cố định cho cả hai tab
        const line = uiNode('Line', panel, 1060, 4);
        line.setPosition(0, -375, 0);
        const lg = line.addComponent(Graphics);
        lg.fillColor = UI.creamDim;
        lg.rect(-530, -2, 1060, 4);
        lg.fill();
        const saveBtn = uiButton(panel, '', 360, 92, () => this.save(), { fontSize: 42, name: 'Save' });
        Lang.bind(saveBtn.label, 'settings.save');
        saveBtn.node.setPosition(-200, -440, 0);
        this.paintGreen(saveBtn);
        const backBtn = uiButton(panel, '', 360, 92, () => this.backFromSettings(), { fontSize: 42, name: 'Back' });
        Lang.bind(backBtn.label, 'back');
        backBtn.node.setPosition(200, -440, 0);
        this.saveMessage = uiLabel(panel, '', 30, SAVE_GREEN);
        this.saveMessage.node.setPosition(-200, -385, 0);
        const saveItem: NavItem = navButton(saveBtn);
        const backItem: NavItem = navButton(backBtn);
        saveItem.right = () => nav.focusItem(backItem);
        backItem.left = () => nav.focusItem(saveItem);
        nav.add(saveItem);
        nav.add(backItem);
        this.setTab('system');
        return panel;
    }

    /** Nút Lưu xanh lá: vẽ lại nền nút (giữ viền cam khi đang chọn). */
    private paintGreen(b: UiButton) {
        const g = b.node.getComponent(Graphics);
        if (!g) return;
        const w = 360, h = 92;
        let focus = false, down = false;
        const paint = () => {
            if (!g.isValid) return;
            g.clear();
            g.fillColor = down ? SAVE_GREEN_DOWN : SAVE_GREEN;
            g.strokeColor = focus ? UI.accent : UI.cream;
            g.lineWidth = focus ? 7 : 4;
            g.roundRect(-w / 2, -h / 2, w, h, 24);
            g.fill();
            g.stroke();
        };
        const setFocus = b.setFocus;
        b.setFocus = (on: boolean) => { setFocus(on); focus = on; paint(); };
        b.node.on(Node.EventType.TOUCH_START, () => { down = true; paint(); });
        b.node.on(Node.EventType.TOUCH_CANCEL, () => { down = false; paint(); });
        b.node.on(Node.EventType.TOUCH_END, () => { down = false; paint(); });
        const click = b.click;
        b.click = () => { click(); paint(); };
        paint();
    }

    private buildSystemTab(root: Node, nav: MenuNav) {
        const row = (y: number, key: TextKey) => {
            const l = uiLabel(root, '', 38, UI.text);
            Lang.bind(l, key);
            l.node.setPosition(-230, y, 0);
            return y;
        };
        const apply = () => Sound.setVolumes(Settings.music, Settings.sfx);
        const music = uiSlider(root, 360, Settings.music, (v) => { Settings.music = v; apply(); });
        music.node.setPosition(200, row(220, 'settings.music'), 0);
        const sfx = uiSlider(root, 360, Settings.sfx, (v) => {
            Settings.sfx = v;
            apply();
            Sound.play('coin', 0.8);
        });
        sfx.node.setPosition(200, row(120, 'settings.sfx'), 0);
        const full = uiToggle(root, Settings.fullscreen, (v) => {
            Settings.fullscreen = v;
            const done = v ? screen.requestFullScreen() : screen.exitFullScreen();
            done?.catch(() => { /* trình duyệt không cho thì thôi */ });
        });
        full.node.setPosition(200, row(20, 'settings.fullscreen'), 0);
        const shake = uiToggle(root, Settings.shake, (v) => { Settings.shake = v; });
        shake.node.setPosition(200, row(-80, 'settings.shake'), 0);
        if (sys.isMobile) full.node.active = false;

        // Ngôn ngữ: bấm hoặc A/D để đổi Tiếng Việt ↔ English
        const flipLang = () => { Lang.code = Lang.code === 'vi' ? 'en' : 'vi'; };
        const lang = uiButton(root, '', 300, 70, flipLang, { fontSize: 34, name: 'Lang' });
        Lang.bindFn(lang.label, () => `◀  ${T('settings.langName')}  ▶`, false);
        lang.node.setPosition(200, row(-180, 'settings.lang'), 0);

        const step = 0.1;
        nav.add({ node: music.node, left: () => music.nudge(-step), right: () => music.nudge(step), focus: (on) => music.setFocus(on) });
        nav.add({ node: sfx.node, left: () => sfx.nudge(-step), right: () => sfx.nudge(step), focus: (on) => sfx.setFocus(on) });
        nav.add({ node: full.node, press: () => full.flip(), left: () => full.flip(), right: () => full.flip(), focus: (on) => full.setFocus(on) });
        nav.add({ node: shake.node, press: () => shake.flip(), left: () => shake.flip(), right: () => shake.flip(), focus: (on) => shake.setFocus(on) });
        nav.add({ ...navButton(lang), left: flipLang, right: flipLang });

        this.refreshSettings = () => {
            music.set(Settings.music);
            sfx.set(Settings.sfx);
            full.set(screen.fullScreen());
            shake.set(Settings.shake);
        };
    }

    private buildControlsTab(root: Node, nav: MenuNav) {
        // Không có Angelo: chỉ hiện phím của Người 1; bỏ dòng Đổi mèo, Kỹ năng, Tương tác (lướt chỉ bằng bấm đúp)
        const two = GameSession.angelo;
        const players = two ? 2 : 1;
        const actions = two ? ACTIONS : ACTIONS.filter((a) => a !== 'swap' && a !== 'skill' && a !== 'interact');
        const colX = two ? [-330, 100, 400] : [-200, 250];
        const rowH = two ? 52 : 58;

        // Kiểu phím của từng người: bấm / A / D để đổi WASD ↔ Mũi tên
        const layoutY = 285;
        const layoutName = uiLabel(root, '', 34, UI.text);
        Lang.bind(layoutName, 'keys.layout');
        layoutName.node.setPosition(colX[0], layoutY, 0);
        this.layoutLabels = [];
        for (let p = 0; p < players; p++) {
            const flip = () => {
                this.stopCapture();
                const next = Settings.layout(p) === 'wasd' ? 'arrows' : 'wasd';
                Settings.setLayout(p, next);
                this.refreshKeys();
                this.say(T('keys.layoutDone', T(next === 'wasd' ? 'keys.wasd' : 'keys.arrows')));
            };
            const b = uiButton(root, '', 260, 58, flip, { fontSize: 30 });
            b.node.setPosition(colX[p + 1], layoutY, 0);
            this.layoutLabels.push(b.label);
            nav.add({ ...navButton(b), left: flip, right: flip });
        }

        if (two) {
            const head = (x: number, p: number, color: Color) => {
                const l = uiLabel(root, '', 34, color);
                Lang.bind(l, 'keys.player', p);
                l.node.setPosition(x, 225, 0);
            };
            head(colX[1], 1, UI.p1);
            head(colX[2], 2, UI.p2);
        }

        const top = two ? 170 : 205;
        actions.forEach((a, i) => {
            const y = top - i * rowH;
            const name = uiLabel(root, '', 32, UI.text);
            Lang.bindFn(name, () => actionName(a));
            name.node.setPosition(colX[0], y, 0);
            for (let p = 0; p < players; p++) {
                const b = uiButton(root, '', 260, rowH - 6, () => this.startCapture(p, a), { fontSize: 28 });
                b.node.setPosition(colX[p + 1], y, 0);
                this.keyCells.push({ p, a, button: b });
                nav.add(navButton(b));
            }
        });

        const reset = uiButton(root, '', 420, 72, () => {
            this.stopCapture();
            Settings.resetKeys();
            this.refreshKeys();
            this.say(T('keys.resetDone'));
        }, { fontSize: 32 });
        Lang.bind(reset.label, 'keys.reset');
        reset.node.setPosition(0, two ? -290 : -255, 0);
        nav.add(navButton(reset));
        this.keyMessage = uiLabel(root, '', 26, UI.text);
        this.keyMessage.node.setPosition(0, two ? -335 : -315, 0);
    }

    private refreshKeys() {
        if (!this.keyCells) return;
        for (const c of this.keyCells) {
            const busy = this.capturing && this.capturing.p === c.p && this.capturing.a === c.a;
            setText(c.button.label, busy ? T('keys.press') : keyName(Settings.key(c.p, c.a)), false);
        }
        this.layoutLabels.forEach((l, p) => {
            const layout = Settings.layout(p);
            const key: TextKey = layout === 'wasd' ? 'keys.wasd' : layout === 'arrows' ? 'keys.arrows' : 'keys.custom';
            setText(l, `◀  ${T(key)}  ▶`, false);
        });
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
        if (this.keyMessage) setText(this.keyMessage, text, false);
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

