import { _decorator, BlockInputEvents, Color, Component, EventKeyboard, Graphics, Input, input, KeyCode, Label, Node, sys, Tween, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
import { keyHintRow } from './KeyCap';
import { formatTime } from '../game/Records';
import { SaveSlots, SLOT_COUNT, SlotData } from '../game/SaveSlots';
import { DIFF_COLORS } from './DifficultyPage';
import { MENU_OUTLINE, MENU_SOFT, MENU_TEXT, menuDivider, MenuFocus } from './MenuStyle';
import { PlayerInput } from '../player/PlayerInput';
import { Sound } from '../core/Sound';
import { Lang, T, TextKey } from './Lang';
import { setText, UI, uiBackCircle, uiButton, UiButton, uiDim, uiLabel, uiNode, uiPanel } from './UiKit';
const { ccclass } = _decorator;

const TITLE_OUTLINE = new Color(0x46, 0x2c, 0x22, 255);
const CARD_W = 440;
const CARD_H = 420;
/** Thẻ kiểu mới: nền tối trong mờ, viền kem (đang chọn thì sáng hơn) */
const CARD_BG = new Color(30, 22, 20, 200);
const CARD_BG_ON = new Color(66, 50, 44, 230);
const CARD_EDGE = new Color(250, 240, 222, 130);
const CARD_EDGE_ON = new Color(250, 240, 222, 255);
const GAP = 60;
/** Nút X xoá ô: tròn đỏ, nằm đè lên góc trên phải của ô */
const DEL_R = 34;
const DEL_RED = new Color(206, 58, 48, 255);
const DEL_RED_DOWN = new Color(168, 40, 34, 255);

interface Card {
    root: Node;
    /** Nền + viền thẻ (vẽ lại khi đổi ô đang chọn) */
    body: Graphics;
    del: Node;
    /** Nhãn màu ghi độ khó của ô */
    badge: Node;
    data: SlotData | null;
}

/** Nhãn độ khó trên ô lưu: cao chừng này, đè lên mép dưới ô */
const BADGE_H = 46;
const BADGE_Y = -CARD_H / 2 + 2;

/**
 * Trang chọn ô lưu (NEW GAME → đây): 3 thẻ ngang kiểu menu mới (nền tối trong mờ viền kem, tên ô + đường hoa văn;
 * thẻ đang chọn sáng hơn, có hoa văn selection_left / selection_right hai bên). Ô trống ghi NEW; ô có tiến độ ghi chương, checkpoint (hoặc Đã qua màn),
 * thời gian chơi, số cá, nhãn độ khó, kèm nút X xoá (hỏi lại). Trái / phải hoặc rê chuột để chọn, Enter / Nhảy / Đánh / chạm để vào,
 * Delete để xoá ô đang chọn, Esc về menu (điện thoại: nút ← tròn góc trên trái). Dàn phím gợi ý ở góc phải dưới.
 * LandingScreen tạo trang này và nghe onPick / onBack.
 */
@ccclass('SaveSlotPage')
export class SaveSlotPage extends Component {
    onPick: ((slot: number, data: SlotData | null) => void) | null = null;
    onBack: (() => void) | null = null;

    private cards: Card[] = [];
    private focus = 0;
    private wasLeft = false;
    private wasRight = false;
    private askRoot: Node | null = null;
    private askButtons: UiButton[] = [];
    private askFocus = 1;
    private acceptAt = 0;
    private focusUi: MenuFocus | null = null;

    onLoad() {
        const d = view.getDesignResolutionSize();
        uiNode('Hit', this.node, d.width, d.height);
        const title = uiLabel(this.node, '', 64, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4 });
        Lang.bind(title, 'slots.title');
        title.node.setPosition(0, 330, 0);
        menuDivider(this.node, 280, 560);
        this.focusUi = new MenuFocus(this.node);
        for (let i = 0; i < SLOT_COUNT; i++) this.cards.push(this.makeCard(i));
        // Điện thoại không có phím Esc: nút ← tròn nhỏ góc trên trái
        if (sys.isMobile) uiBackCircle(this.node, -d.width / 2 + 90, d.height / 2 - 90, () => this.back(), 44);
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    /** Dòng gợi ý bằng hình phím (vẽ lại mỗi lần mở trang: theo phím đang cài và ngôn ngữ). Điện thoại thì không có. */
    private buildHints() {
        this.node.getChildByName('KeyHints')?.destroy();
        if (sys.isMobile) return;
        const d = view.getDesignResolutionSize();
        keyHintRow(this.node, [
            [['ENTER'], T('slots.hConfirm')],
            [['DEL'], T('slots.hErase')],
            [['ESC'], T('slots.hBack')],
        ], -d.height / 2 + 60, 44, 28, UI.cream, d.width / 2 - 60);
    }

    onEnable() {
        this.buildHints();
        this.refresh();
        this.setFocus(this.focus);
        this.acceptAt = Date.now() + 200;
        PlayerInput.clearQueues();
        // Các ô hiện dần và trồi lên nhẹ, lần lượt từ trái sang
        this.cards.forEach((c, i) => {
            const x = (i - (SLOT_COUNT - 1) / 2) * (CARD_W + GAP);
            const op = c.root.getComponent(UIOpacity) ?? c.root.addComponent(UIOpacity);
            Tween.stopAllByTarget(c.root);
            Tween.stopAllByTarget(op);
            c.root.setPosition(x, -40, 0);
            op.opacity = 0;
            tween(c.root).delay(0.08 * i).to(0.45, { position: new Vec3(x, 20, 0) }, { easing: 'quadOut' }).start();
            tween(op).delay(0.08 * i).to(0.45, { opacity: 255 }).start();
        });
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    /** Esc / nút ←: đang hỏi xoá thì thôi xoá, không thì về menu. */
    back() {
        Sound.play('ui_back', 0.8);
        if (this.askRoot?.active) this.answerDelete(false);
        else this.onBack?.();
    }

    update() {
        if (Date.now() < this.acceptAt) return;
        const c = PlayerInput.merged;
        const left = c.left, right = c.right;
        if (this.askRoot?.active) {
            if ((left && !this.wasLeft) || (right && !this.wasRight)) this.focusAsk(this.askFocus === 0 ? 1 : 0);
            if (c.consumeJump() || c.consumeAttack()) this.answerDelete(this.askFocus === 0);
        } else {
            if (left && !this.wasLeft) this.setFocus((this.focus + SLOT_COUNT - 1) % SLOT_COUNT);
            if (right && !this.wasRight) this.setFocus((this.focus + 1) % SLOT_COUNT);
            if (c.consumeJump() || c.consumeAttack()) this.pick(this.focus);
        }
        this.wasLeft = left;
        this.wasRight = right;
    }

    private onKey(e: EventKeyboard) {
        if (!this.node.activeInHierarchy || Date.now() < this.acceptAt) return;
        if (this.askRoot?.active) {
            if (e.keyCode === KeyCode.ENTER) this.answerDelete(this.askFocus === 0);
            return;
        }
        if (e.keyCode === KeyCode.ENTER) this.pick(this.focus);
        else if (e.keyCode === KeyCode.DELETE || e.keyCode === KeyCode.BACKSPACE) this.askDelete(this.focus);
    }

    private makeCard(i: number): Card {
        const root = uiNode(`Slot${i + 1}`, this.node, CARD_W, CARD_H);
        const panel = uiNode('Panel', root, CARD_W, CARD_H);
        panel.addComponent(BlockInputEvents);
        const body = panel.addComponent(Graphics);
        const head = uiLabel(panel, '', 40, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 4, name: 'Head' });
        head.node.setPosition(0, CARD_H / 2 - 48, 0);
        Lang.bind(head, 'slots.slot', i + 1);
        menuDivider(panel, CARD_H / 2 - 92, 300);
        const big = uiLabel(panel, '', 84, UI.accent, { outline: UI.brown, outlineWidth: 5, name: 'New' });
        big.node.setPosition(0, -20, 0);
        for (let k = 0; k < 4; k++) {
            const l = uiLabel(panel, '', k === 0 ? 42 : 30, k === 0 ? MENU_TEXT : MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: k === 0 ? 4 : 3, name: `Line${k}` });
            l.node.setPosition(0, 50 - k * 56, 0);
        }
        // Nút X: tròn đỏ, tâm đúng góc trên phải nên đè lên viền ô
        const del = uiNode('Delete', root, DEL_R * 2 + 10, DEL_R * 2 + 10);
        del.setPosition(CARD_W / 2 - 10, CARD_H / 2 - 10, 0);
        const dg = del.addComponent(Graphics);
        const paintDel = (down: boolean) => {
            dg.clear();
            dg.fillColor = down ? DEL_RED_DOWN : DEL_RED;
            dg.circle(0, 0, DEL_R);
            dg.fill();
            dg.strokeColor = UI.cream;
            dg.lineWidth = 6;
            dg.circle(0, 0, DEL_R);
            dg.stroke();
            const k = DEL_R * 0.38;
            dg.lineWidth = 8;
            dg.lineCap = Graphics.LineCap.ROUND;
            dg.moveTo(-k, -k);
            dg.lineTo(k, k);
            dg.moveTo(-k, k);
            dg.lineTo(k, -k);
            dg.stroke();
        };
        paintDel(false);
        del.on(Node.EventType.TOUCH_START, () => paintDel(true));
        del.on(Node.EventType.TOUCH_CANCEL, () => paintDel(false));
        del.on(Node.EventType.TOUCH_END, () => {
            paintDel(false);
            this.askDelete(i);
        });
        del.on(Node.EventType.MOUSE_ENTER, () => del.setScale(1.12, 1.12, 1));
        del.on(Node.EventType.MOUSE_LEAVE, () => del.setScale(1, 1, 1));
        // Nhãn độ khó: viên thuốc màu đè lên mép dưới ô
        const badge = uiNode('Difficulty', root, 300, BADGE_H);
        badge.setPosition(0, BADGE_Y, 0);
        badge.addComponent(Graphics);
        uiLabel(badge, '', 28, Color.WHITE, { outline: UI.brown, outlineWidth: 4, name: 'Text' });
        panel.on(Node.EventType.MOUSE_ENTER, () => { if (!this.askRoot?.active) this.setFocus(i); });
        panel.on(Node.EventType.TOUCH_END, () => {
            if (this.askRoot?.active || Date.now() < this.acceptAt) return;
            this.setFocus(i);
            this.pick(i);
        });
        this.paintCard(body, false);
        return { root, body, del, badge, data: null };
    }

    /** Đọc lại 3 ô từ máy và vẽ chữ. */
    private refresh() {
        const all = SaveSlots.all();
        this.cards.forEach((c, i) => {
            const data = all[i];
            c.data = data;
            const panel = c.root.getChildByName('Panel')!;
            const big = panel.getChildByName('New')!;
            const lines = [0, 1, 2, 3].map((k) => panel.getChildByName(`Line${k}`)!.getComponent(Label)!);
            big.active = !data;
            c.del.active = !!data;
            c.badge.active = !!data;
            if (!data) {
                setText(big.getComponent(Label)!, T('slots.new'));
                for (const l of lines) l.node.active = false;
                return;
            }
            for (const l of lines) l.node.active = true;
            setText(lines[0], T('slots.chapter', data.chapter));
            setText(lines[1], data.cleared ? T('slots.cleared') : data.checkpoint > 0 ? T('slots.checkpoint', data.checkpoint) : T('slots.start'));
            setText(lines[2], T('slots.time', formatTime(data.time)));
            setText(lines[3], T('slots.fish', data.fish));
            this.paintBadge(c.badge, data.difficulty ?? 0);
        });
    }

    /** Viên thuốc màu theo độ khó, ghi tên mức (CASUAL / NORMAL / MANIAC). */
    private paintBadge(badge: Node, level: number) {
        const lv = Math.max(0, Math.min(DIFF_COLORS.length - 1, level));
        const label = badge.getChildByName('Text')!.getComponent(Label)!;
        setText(label, T(('diff.' + lv) as TextKey));
        label.updateRenderData(true);
        const w = Math.max(160, label.node.getComponent(UITransform)!.width + 48);
        const g = badge.getComponent(Graphics)!;
        g.clear();
        g.fillColor = DIFF_COLORS[lv];
        g.strokeColor = UI.brown;
        g.lineWidth = 5;
        g.roundRect(-w / 2, -BADGE_H / 2, w, BADGE_H, BADGE_H / 2);
        g.fill();
        g.stroke();
    }

    /** Nền tối trong mờ + viền kem; thẻ đang chọn nền sáng hơn, viền rõ. */
    private paintCard(g: Graphics, on: boolean) {
        if (!g.isValid) return;
        g.clear();
        g.fillColor = on ? CARD_BG_ON : CARD_BG;
        g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 26);
        g.fill();
        g.strokeColor = on ? CARD_EDGE_ON : CARD_EDGE;
        g.lineWidth = on ? 5 : 3;
        g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 26);
        g.stroke();
    }

    private setFocus(i: number) {
        if (i !== this.focus) Sound.play('ui_move', 0.6);
        this.focus = i;
        // Hoa văn hai bên thẻ đang chọn (đặt theo chỗ thẻ đứng yên sau khi hiện xong)
        const x = (i - (SLOT_COUNT - 1) / 2) * (CARD_W + GAP);
        this.focusUi?.onRow(20, x, CARD_W * 1.06);
        this.cards.forEach((c, k) => {
            const on = k === i;
            this.paintCard(c.body, on);
            const panel = c.root.getChildByName('Panel')!;
            Tween.stopAllByTarget(panel);
            tween(panel).to(0.12, { scale: on ? new Vec3(1.06, 1.06, 1) : new Vec3(0.96, 0.96, 1) }).start();
        });
    }

    private pick(i: number) {
        if (Date.now() < this.acceptAt) return;
        this.acceptAt = Date.now() + 1000; // không cho bấm 2 lần
        Sound.play('ui_click', 0.9);
        const c = this.cards[i];
        const panel = c.root.getChildByName('Panel')!;
        tween(panel).to(0.08, { scale: new Vec3(1.12, 1.12, 1) }).to(0.1, { scale: new Vec3(1.06, 1.06, 1) }).start();
        this.onPick?.(i, c.data);
    }

    // ---------- Xoá ô ----------

    private askDelete(i: number) {
        if (!this.cards[i]?.data) return;
        this.setFocus(i);
        const d = view.getDesignResolutionSize();
        if (!this.askRoot) {
            const root = uiNode('AskDelete', this.node, d.width, d.height);
            uiDim(root, d.width, d.height);
            uiPanel(root, 700, 320);
            const title = uiLabel(root, '', 56, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4 });
            Lang.bind(title, 'slots.delete');
            title.node.setPosition(0, 60, 0);
            const yes = uiButton(root, '', 240, 90, () => this.answerDelete(true), { fontSize: 44, name: 'Yes' });
            const no = uiButton(root, '', 240, 90, () => this.answerDelete(false), { fontSize: 44, name: 'No' });
            Lang.bind(yes.label, 'yes');
            Lang.bind(no.label, 'no');
            yes.node.setPosition(-140, -70, 0);
            no.node.setPosition(140, -70, 0);
            yes.node.on(Node.EventType.MOUSE_ENTER, () => this.focusAsk(0));
            no.node.on(Node.EventType.MOUSE_ENTER, () => this.focusAsk(1));
            this.askButtons = [yes, no];
            this.askRoot = root;
        }
        this.askRoot.setSiblingIndex(this.node.children.length - 1);
        this.askRoot.active = true;
        Sound.play('ui_deny', 0.7);
        this.focusAsk(1); // mặc định KHÔNG cho khỏi lỡ tay
        this.acceptAt = Date.now() + 150;
        PlayerInput.clearQueues();
    }

    private focusAsk(i: number) {
        if (i !== this.askFocus && this.askRoot?.active) Sound.play('ui_move', 0.6);
        this.askFocus = i;
        this.askButtons.forEach((b, k) => b.setFocus(k === i));
    }

    private answerDelete(yes: boolean) {
        if (this.askRoot) this.askRoot.active = false;
        if (yes) SaveSlots.clear(this.focus);
        Sound.play(yes ? 'ui_delete' : 'ui_back', 0.8);
        this.refresh();
        this.acceptAt = Date.now() + 150;
        PlayerInput.clearQueues();
        const op = this.cards[this.focus].root.getComponent(UIOpacity) ?? this.cards[this.focus].root.addComponent(UIOpacity);
        if (yes) {
            op.opacity = 80;
            tween(op).to(0.3, { opacity: 255 }).start();
        }
    }
}
