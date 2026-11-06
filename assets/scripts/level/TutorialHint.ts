import { _decorator, Color, Graphics, Label, Node, tween, Tween, UIOpacity, UITransform, Vec3, view } from 'cc';
import { EDITOR } from 'cc/env';
import { Action, keyShort, Settings } from '../core/Settings';
import { GameManager } from '../game/GameManager';
import { GameSession } from '../game/GameSession';
import { PlayerController } from '../player/PlayerController';
import { Lang, T, TextKey } from '../ui/Lang';
import { UI, uiLabel, uiNode } from '../ui/UiKit';
import { GroundBlock } from './GroundBlock';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, property } = _decorator;

const PANEL = new Color(40, 30, 28, 215);
const CHIP = new Color(250, 240, 222, 255);
const DONE = new Color(150, 210, 110, 255);
const MARK = new Color(255, 205, 60, 255);
const MARK_LINE = new Color(90, 55, 20, 255);
const ROW_H = 64;
const WIDTH = 820;
/** Chữ mô tả bắt đầu ít nhất ở đây (tính từ mép trái bảng), và luôn sau ô phím cuối một khoảng TEXT_GAP */
const TEXT_X = 250;
const TEXT_GAP = 34;
/** Dải HUD trên cùng (tim, năng lượng, cá): bảng không lên cao hơn */
const HUD_BAND = 250;
/** Mép dưới bảng cao hơn đỉnh dấu ! chừng này */
const PANEL_GAP = 40;
/** Dấu ! cao bao nhiêu (tính từ mặt đất) */
const MARK_Y = 190;

type Topic = 'move' | 'jump' | 'doubleJump' | 'attack' | 'dash' | 'wave' | 'sweep' | 'launch';

/** Một ô phím: hành động (lấy phím đang cài), '+' giữa hai phím bấm cùng lúc, hoặc 'x2:hành động' = bấm hai lần (ô ghi "×2 Space"). */
type Chip = Action | '+' | `x2:${Action}`;

/** Mỗi gợi ý: phím (theo phím người chơi đã cài), dòng chữ, và cách biết người chơi đã làm được. */
const TOPICS: Record<Topic, { keys: Chip[]; text: TextKey }> = {
    move: { keys: ['left', 'right'], text: 'tut.run' },
    jump: { keys: ['jump'], text: 'tut.jump' },
    doubleJump: { keys: ['x2:jump'], text: 'tut.doubleJump' },
    attack: { keys: ['attack'], text: 'tut.attack' },
    dash: { keys: ['x2:left', 'x2:right'], text: 'tut.dash' },
    wave: { keys: ['attack'], text: 'tut.wave' },
    sweep: { keys: ['down', '+', 'attack'], text: 'tut.sweep' },
    launch: { keys: ['up', '+', 'attack'], text: 'tut.launch' },
};

/**
 * Điểm hướng dẫn trong lớp Gameplay: một dấu ! vàng đứng trên mặt đất ngay chỗ node. Mèo đang điều khiển vào vùng
 * (Size / Offset) thì bảng gợi ý bật ra phía trên dấu ! và đứng yên ở đó; tên phím lấy theo phím đang cài.
 * Làm được đòn nào thì dòng đó tích xanh. Nút X góc bảng để tắt; đi ra khỏi vùng thì bảng tự tắt.
 * Đi ra rồi quay lại thì bảng hiện lại (bấm X thì phải ra khỏi vùng rồi vào lại mới hiện). Làm đủ các đòn thì dấu ! mờ đi.
 * Tích các ô đòn cần dạy. Kéo node để dời (nút ⚙ Cập nhật tạo sẵn 3 điểm).
 */
@ccclass('TutorialHint')
export class TutorialHint extends PlayerTrigger {
    @property({ group: 'Dạy đòn', tooltip: 'Chạy (trái / phải)' })
    move = false;

    @property({ group: 'Dạy đòn', tooltip: 'Nhảy' })
    jump = false;

    @property({ group: 'Dạy đòn', tooltip: 'Nhảy 2 lần' })
    doubleJump = false;

    @property({ group: 'Dạy đòn', tooltip: 'Chém, combo' })
    attack = false;

    @property({ group: 'Dạy đòn', tooltip: 'Lướt (bấm đúp trái / phải)' })
    dash = false;

    @property({ group: 'Dạy đòn', tooltip: 'Giữ đánh rồi thả: sóng kiếm' })
    wave = false;

    @property({ group: 'Dạy đòn', tooltip: 'Xuống + đánh: quét chân' })
    sweep = false;

    @property({ group: 'Dạy đòn', tooltip: 'Lên + đánh: chém hất' })
    launch = false;

    private panel: Node | null = null;
    private rows: { topic: Topic; label: Label; check: Node }[] = [];
    private readonly done = new Set<Topic>();
    private inside = false;
    /** Đã bấm X: không hiện lại tới khi mèo ra khỏi vùng */
    private closedByX = false;
    private cat: PlayerController | null = null;
    private watch = { moveTime: 0, airJumped: false, lastVy: 0, holdTime: 0 };
    private mark: Node | null = null;
    private markTime = 0;
    private groundY = 0;

    private get topics(): Topic[] {
        return (Object.keys(TOPICS) as Topic[]).filter((t) => this[t]);
    }

    start() {
        if (EDITOR || !this.topics.length) return;
        this.groundY = this.findGround();
        this.makeMark();
    }

    onDestroy() {
        // Chỉ dọn dẹp: gỡ đăng ký nghe đổi cài đặt (bị xoá rồi mà còn nghe thì đổi ngôn ngữ sẽ lỗi)
        Settings.offChange(this.redraw);
        if (this.panel?.isValid) this.panel.destroy();
        if (this.mark?.isValid) this.mark.destroy();
    }

    protected onPlayerEnter(gm: GameManager, cat: PlayerController) {
        // Chơi 1 người: chỉ con đang điều khiển (con đi theo đi ngang không tính)
        if (gm.activeCat && cat !== gm.activeCat) return;
        this.inside = true;
        this.cat = cat;
    }

    protected tick(dt: number) {
        if (EDITOR) return;
        const inside = this.inside;
        this.inside = false; // onPlayerEnter (chạy trước tick) bật lại nếu mèo còn trong vùng
        this.animateMark(dt);
        // Chưa vào chơi (menu, truyện) hoặc đang cảnh diễn (hội thoại mở đầu, mở màn boss): chưa hiện bảng
        if (GameSession.waitingForStart || GameManager.instance?.cutscene) {
            this.hidePanel();
            return;
        }
        if (!inside) {
            // Ra khỏi vùng: tắt bảng, lần sau vào lại thì hiện (kể cả đã bấm X)
            this.closedByX = false;
            this.hidePanel();
            return;
        }
        this.watchCat(dt);
        if (!this.panel && !this.closedByX && this.topics.length) this.showPanel();
    }

    /** Mặt đất ngay dưới dấu !: khối nền cao nhất phủ qua chỗ node (không có thì lấy y của node). */
    private findGround(): number {
        const x = this.node.position.x;
        let best = -Infinity;
        for (const g of this.node.parent?.getComponentsInChildren(GroundBlock) ?? []) {
            const gx = g.node.position.x, gy = g.node.position.y;
            if (x >= gx && x <= gx + g.width && gy > best && gy < this.node.position.y + 900) best = gy;
        }
        return best > -Infinity ? best : this.node.position.y;
    }

    // ---------- Dấu ! ----------

    private makeMark() {
        const parent = this.node.parent;
        if (!parent) return;
        const n = uiNode('TutorialMark', parent, 90, 90);
        n.setPosition(this.node.position.x, this.groundY + MARK_Y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = MARK;
        g.strokeColor = MARK_LINE;
        g.lineWidth = 6;
        g.circle(0, 0, 40);
        g.fill();
        g.stroke();
        uiLabel(n, '!', 64, MARK_LINE).node.setPosition(0, 2, 0);
        n.addComponent(UIOpacity);
        this.mark = n;
    }

    /** Nhấp nhô nhẹ; làm đủ các đòn thì mờ đi. */
    private animateMark(dt: number) {
        const n = this.mark;
        if (!n || !n.isValid) return;
        this.markTime += dt;
        n.setPosition(this.node.position.x, this.groundY + MARK_Y + Math.sin(this.markTime * 3) * 10, 0);
        const all = this.topics.every((t) => this.done.has(t));
        const op = n.getComponent(UIOpacity)!;
        const target = all ? 90 : 255;
        op.opacity += (target - op.opacity) * Math.min(1, dt * 4);
    }

    // ---------- Bảng ----------

    private showPanel() {
        const parent = this.node.parent;
        if (!parent) return;
        const topics = this.topics;
        const h = topics.length * ROW_H + 40;
        const panel = uiNode('TutorialPanel', parent, WIDTH, h);
        this.panel = panel;
        const g = panel.addComponent(Graphics);
        g.fillColor = PANEL;
        g.roundRect(-WIDTH / 2, -h / 2, WIDTH, h, 26);
        g.fill();
        this.rows = [];
        topics.forEach((topic, i) => {
            const y = h / 2 - 20 - ROW_H / 2 - i * ROW_H;
            const row = uiNode(`Row_${topic}`, panel, WIDTH, ROW_H);
            row.setPosition(0, y, 0);
            const chips = uiNode('Keys', row);
            chips.setPosition(-WIDTH / 2 + 30, 0, 0);
            const label = uiLabel(row, '', 32, UI.cream);
            label.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
            const check = uiLabel(row, '✔', 40, DONE).node;
            check.setPosition(WIDTH / 2 - 90, 0, 0);
            const isDone = this.done.has(topic);
            check.active = isDone;
            if (isDone) label.color = DONE;
            this.rows.push({ topic, label, check });
            const render = () => {
                // Chữ mô tả bắt đầu sau ô phím cuối (phím dài như "Num 0", "×2 Space" cũng không đè lên chữ)
                const used = this.drawChips(chips, topic);
                label.node.setPosition(-WIDTH / 2 + Math.max(TEXT_X, 30 + used + TEXT_GAP), 0, 0);
                return T(TOPICS[topic].text);
            };
            Lang.bindFn(label, render);
        });
        this.makeCloseButton(panel, h);
        // Đổi Kiểu phím / ngôn ngữ trong menu thì vẽ lại phím
        Settings.onChange(this.redraw);
        this.placePanel(panel, h);
        panel.setScale(0.7, 0.7, 1);
        const op = panel.addComponent(UIOpacity);
        op.opacity = 0;
        tween(panel).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        tween(op).to(0.18, { opacity: 255 }).start();
    }

    /** Nút X góc trên phải: tắt bảng, ra khỏi vùng rồi vào lại mới hiện. */
    private makeCloseButton(panel: Node, h: number) {
        const r = 30;
        const n = uiNode('Close', panel, r * 2.4, r * 2.4);
        n.setPosition(WIDTH / 2 - 36, h / 2 - 36, 0);
        const g = n.addComponent(Graphics);
        const paint = (down: boolean) => {
            if (!g.isValid) return;
            g.clear();
            g.fillColor = down ? UI.brownDown : UI.brown;
            g.strokeColor = UI.cream;
            g.lineWidth = 4;
            g.circle(0, 0, r);
            g.fill();
            g.stroke();
            g.lineWidth = 6;
            g.lineCap = Graphics.LineCap.ROUND;
            const k = r * 0.38;
            g.moveTo(-k, -k);
            g.lineTo(k, k);
            g.moveTo(k, -k);
            g.lineTo(-k, k);
            g.stroke();
        };
        paint(false);
        n.on(Node.EventType.TOUCH_START, () => paint(true));
        n.on(Node.EventType.TOUCH_CANCEL, () => paint(false));
        n.on(Node.EventType.TOUCH_END, () => {
            paint(false);
            this.closedByX = true;
            this.hidePanel();
        });
    }

    /** Bảng đứng yên phía trên dấu !; không lên cao quá dải HUD. */
    private placePanel(panel: Node, h: number) {
        let y = this.groundY + MARK_Y + 40 + PANEL_GAP + h / 2;
        // Lớp Gameplay là con của Canvas (tâm khung hình): chỗ trên màn hình = toạ độ trong màn + vị trí lớp.
        // Camera dịch lớp theo mèo, nên tính theo vị trí lớp lúc bảng hiện ra.
        const layer = panel.parent;
        if (layer) {
            const top = (view.getDesignResolutionSize().height / 2 - HUD_BAND - layer.position.y) / (layer.scale.y || 1);
            if (y + h / 2 > top) y = top - h / 2;
        }
        panel.setPosition(this.node.position.x, y, 0);
    }

    private hidePanel() {
        const panel = this.panel;
        if (!panel) return;
        this.panel = null;
        this.rows = [];
        Settings.offChange(this.redraw);
        if (!panel.isValid) return;
        const op = panel.getComponent(UIOpacity) ?? panel.addComponent(UIOpacity);
        Tween.stopAllByTarget(op);
        Tween.stopAllByTarget(panel);
        tween(op).to(0.2, { opacity: 0 }).call(() => panel.destroy()).start();
    }

    private readonly redraw = () => {
        if (!this.panel?.isValid) return;
        for (const r of this.rows) {
            const chips = r.label.node.parent?.getChildByName('Keys');
            if (!chips) continue;
            const used = this.drawChips(chips, r.topic);
            r.label.node.setPosition(-WIDTH / 2 + Math.max(TEXT_X, 30 + used + TEXT_GAP), 0, 0);
        }
    };

    /** Ô phím: mỗi phím một ô kem viền nâu, "+" ở giữa khi phải bấm cùng lúc, "×2 Space" khi bấm hai lần. Trả về bề ngang đã dùng. */
    private drawChips(root: Node, topic: Topic): number {
        root.removeAllChildren();
        let x = 0;
        const keys = TOPICS[topic].keys;
        keys.forEach((k, i) => {
            if (k === '+') {
                const plus = uiLabel(root, '+', 30, UI.cream);
                plus.node.setPosition(x + 14, 0, 0);
                x += 28;
                return;
            }
            const twice = k.startsWith('x2:');
            const action = (twice ? k.slice(3) : k) as Action;
            const text = (twice ? '×2 ' : '') + keyShort(Settings.key(0, action));
            const w = Math.max(54, text.length * 18 + 26);
            const chip = uiNode('Chip', root, w, 50);
            chip.setPosition(x + w / 2, 0, 0);
            const g = chip.addComponent(Graphics);
            g.fillColor = CHIP;
            g.strokeColor = UI.brown;
            g.lineWidth = 4;
            g.roundRect(-w / 2, -25, w, 50, 10);
            g.fill();
            g.stroke();
            uiLabel(chip, text, 26, UI.text);
            x += w + (i < keys.length - 1 && keys[i + 1] !== '+' ? 10 : 0);
        });
        return x;
    }

    // ---------- Biết người chơi đã làm được đòn nào ----------

    private watchCat(dt: number) {
        const c = this.cat;
        if (!c) return;
        const b = c.body, ctl = c.controls, w = this.watch;
        const vx = Math.abs(b.velocity.x), vy = b.velocity.y;
        if (vx > 150 && b.grounded) w.moveTime += dt;
        if (!b.grounded && vy - w.lastVy > 500 && w.lastVy < 600) w.airJumped = true; // vọt lên giữa không trung
        w.lastVy = b.grounded ? 0 : vy;
        if (ctl.attackHeld) w.holdTime += dt;
        else w.holdTime = 0;
        for (const topic of this.topics) {
            if (this.done.has(topic)) continue;
            let ok = false;
            switch (topic) {
                case 'move': ok = w.moveTime > 0.4; break;
                case 'jump': ok = !b.grounded && vy > 400; break;
                case 'doubleJump': ok = w.airJumped; break;
                case 'attack': ok = ctl.attackHeld && !ctl.down && !ctl.upHeld; break;
                case 'dash': ok = c.evading; break;
                case 'wave': ok = w.holdTime > 0.9; break;
                case 'sweep': ok = ctl.attackHeld && ctl.down && b.grounded; break;
                case 'launch': ok = ctl.attackHeld && ctl.upHeld && b.grounded; break;
            }
            if (ok) this.markDone(topic);
        }
    }

    private markDone(topic: Topic) {
        this.done.add(topic);
        const r = this.rows.find((x) => x.topic === topic);
        if (!r) return;
        r.check.active = true;
        r.check.setScale(0.3, 0.3, 1);
        tween(r.check).to(0.2, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' }).to(0.1, { scale: Vec3.ONE }).start();
        r.label.color = DONE;
    }
}
