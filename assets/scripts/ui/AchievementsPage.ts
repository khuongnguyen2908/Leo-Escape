import { _decorator, Color, Component, EventKeyboard, EventMouse, Graphics, Input, input, KeyCode, Label, Mask, Node, sys, UITransform, view } from 'cc';
import { Sound } from '../core/Sound';
import { ACHIEVEMENTS, Achievements } from '../game/Achievements';
import { PlayerInput } from '../player/PlayerInput';
import { achievementIcon } from './AchievementToast';
import { T, TextKey } from './Lang';
import { bump, MENU_OUTLINE, MENU_SOFT, MENU_TEXT, MenuFocus, menuShade, menuTitle, PRESS_DELAY } from './MenuStyle';
import { setText, uiBackCircle, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

/** Khung danh sách (cuộn bên trong), cao mỗi dòng, cỡ biểu tượng */
const VIEW_W = 1320;
const VIEW_H = 600;
const VIEW_Y = -10;
const ROW_H = 120;
const ICON = 92;
const ICON_X = -540;
const TEXT_X = -460;
const ROW_FOCUS_W = 1200;
const BACK_Y = -400;
const LOCKED_TEXT = new Color(150, 140, 135, 255);
const BAR = new Color(250, 240, 222, 255);

interface Row {
    node: Node;
    name: Label;
}

/**
 * Trang Thành tích (ACHIEVEMENTS ở menu chính): tiêu đề + đường hoa văn, danh sách cuộn được, mỗi dòng có ô biểu tượng,
 * tên và mô tả (chưa đạt thì mờ, biểu tượng ổ khoá), thanh cuộn mảnh bên phải, QUAY LẠI ở dưới.
 * W/S ↑/↓ hoặc lăn chuột để dò, Esc / QUAY LẠI về menu (điện thoại: nút ← tròn góc trên trái).
 * LandingScreen tạo trang này và nghe onBack.
 */
@ccclass('AchievementsPage')
export class AchievementsPage extends Component {
    onBack: (() => void) | null = null;

    private content!: Node;
    private rowFocus!: MenuFocus;
    private backFocus!: MenuFocus;
    private backLabel!: Label;
    private bar!: Graphics;
    private rows: Row[] = [];
    /** 0..rows-1 là dòng, rows.length là QUAY LẠI */
    private focus = 0;
    private scroll = 0;
    private scrollTarget = 0;
    private acceptAt = 0;

    onLoad() {
        const d = view.getDesignResolutionSize();
        menuShade(this.node, d.width, d.height, 150);
        menuTitle(this.node, 'ach.title', 400);
        const viewport = uiNode('Viewport', this.node, VIEW_W, VIEW_H);
        viewport.setPosition(0, VIEW_Y, 0);
        viewport.addComponent(Mask);
        viewport.on(Node.EventType.MOUSE_WHEEL, (e: EventMouse) => this.wheel(e.getScrollY()));
        this.content = uiNode('Content', viewport, VIEW_W, VIEW_H);
        this.rowFocus = new MenuFocus(this.content);
        this.backFocus = new MenuFocus(this.node);
        const barNode = uiNode('ScrollBar', this.node, 20, VIEW_H);
        barNode.setPosition(VIEW_W / 2 + 30, VIEW_Y, 0);
        this.bar = barNode.addComponent(Graphics);
        this.backLabel = uiLabel(this.node, '', 56, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 4, name: 'Back' });
        this.backLabel.node.setPosition(0, BACK_Y, 0);
        this.backLabel.node.on(Node.EventType.MOUSE_ENTER, () => this.setFocus(this.rows.length));
        this.backLabel.node.on(Node.EventType.TOUCH_END, () => this.pressBack());
        if (sys.isMobile) uiBackCircle(this.node, -d.width / 2 + 90, d.height / 2 - 90, () => this.back(), 44);
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    onEnable() {
        this.build();
        setText(this.backLabel, T('back'));
        this.scroll = this.scrollTarget = 0;
        this.focus = 0;
        this.setFocus(0, false);
        this.acceptAt = Date.now() + 200;
        PlayerInput.clearQueues();
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    /** Esc / QUAY LẠI: về menu chính. */
    back() {
        Sound.play('ui_back', 0.8);
        this.onBack?.();
    }

    update(dt: number) {
        // Cuộn mượt tới chỗ cần
        this.scroll += (this.scrollTarget - this.scroll) * Math.min(1, dt * 12);
        this.content.setPosition(0, this.scroll, 0);
        this.paintBar();
        if (Date.now() < this.acceptAt) return;
        const c = PlayerInput.merged;
        const n = this.rows.length + 1;
        if (c.consumeUp()) this.setFocus((this.focus + n - 1) % n);
        if (c.consumeDown()) this.setFocus((this.focus + 1) % n);
        if ((c.consumeJump() || c.consumeAttack()) && this.focus === this.rows.length) this.pressBack();
    }

    /** Bấm QUAY LẠI: vệt sáng loé rồi về menu. */
    private pressBack() {
        if (this.leaving) return;
        this.leaving = true;
        this.backFocus.flashItem(this.backLabel);
        setTimeout(() => {
            this.leaving = false;
            if (this.isValid && this.node.activeInHierarchy) this.back();
        }, PRESS_DELAY);
    }

    private leaving = false;

    private onKey(e: EventKeyboard) {
        if (!this.node.activeInHierarchy || Date.now() < this.acceptAt) return;
        if (e.keyCode === KeyCode.ENTER && this.focus === this.rows.length) this.pressBack();
    }

    /** Dựng lại các dòng (mỗi lần mở trang: thành tích có thể vừa đạt thêm, ngôn ngữ có thể vừa đổi). */
    private build() {
        for (const r of this.rows) r.node.destroy();
        this.rows = [];
        ACHIEVEMENTS.forEach((def, i) => {
            const locked = !Achievements.isUnlocked(def.id);
            const y = VIEW_H / 2 - ROW_H / 2 - i * ROW_H;
            const row = uiNode(`Row_${def.id}`, this.content, ROW_FOCUS_W, ROW_H - 10);
            row.setPosition(0, y, 0);
            const icon = achievementIcon(row, def.id, ICON, locked);
            icon.setPosition(ICON_X, 0, 0);
            const name = uiLabel(row, '', 44, locked ? LOCKED_TEXT : MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 4, name: 'Name' });
            setText(name, T(`ach.${def.id}` as TextKey));
            const desc = uiLabel(row, '', 28, locked ? LOCKED_TEXT : MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'Desc' });
            setText(desc, T(`ach.${def.id}.d` as TextKey, Achievements.birds));
            for (const [l, ly] of [[name, 20], [desc, -26]] as const) {
                l.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
                l.node.setPosition(TEXT_X, ly, 0);
            }
            row.on(Node.EventType.MOUSE_ENTER, () => this.setFocus(i, true, false));
            this.rows.push({ node: row, name });
        });
    }

    /** Lăn chuột: cuộn danh sách. */
    private wheel(dy: number) {
        this.scrollTarget = Math.max(0, Math.min(this.maxScroll(), this.scrollTarget - Math.sign(dy) * ROW_H));
    }

    private maxScroll(): number {
        return Math.max(0, this.rows.length * ROW_H - VIEW_H);
    }

    /** Chọn dòng i (hoặc QUAY LẠI); keepVisible: cuộn cho dòng đó lọt hẳn vào khung. */
    private setFocus(i: number, sound = true, keepVisible = true) {
        if (i !== this.focus && sound) Sound.play('ui_move', 0.6);
        this.focus = i;
        if (i >= this.rows.length) {
            this.rowFocus.hide();
            this.backFocus.onItem(this.backLabel);
            bump(this.backLabel.node);
            return;
        }
        this.backFocus.hide();
        const r = this.rows[i];
        this.rowFocus.onRow(r.node.position.y, 0, ROW_FOCUS_W);
        if (!keepVisible) return;
        const top = i * ROW_H, bottom = top + ROW_H;
        if (top < this.scrollTarget) this.scrollTarget = top;
        else if (bottom > this.scrollTarget + VIEW_H) this.scrollTarget = bottom - VIEW_H;
        this.scrollTarget = Math.max(0, Math.min(this.maxScroll(), this.scrollTarget));
    }

    /** Thanh cuộn mảnh: đường dọc nhạt + đoạn sáng chỉ phần đang xem. */
    private paintBar() {
        const g = this.bar;
        if (!g.isValid) return;
        g.clear();
        const total = this.rows.length * ROW_H;
        if (total <= VIEW_H) return;
        g.fillColor = new Color(BAR.r, BAR.g, BAR.b, 70);
        g.rect(-2, -VIEW_H / 2, 4, VIEW_H);
        g.fill();
        const h = VIEW_H * (VIEW_H / total);
        const y = VIEW_H / 2 - h - (VIEW_H - h) * (this.scroll / this.maxScroll());
        g.fillColor = new Color(BAR.r, BAR.g, BAR.b, 230);
        g.roundRect(-4, y, 8, h, 4);
        g.fill();
    }
}
