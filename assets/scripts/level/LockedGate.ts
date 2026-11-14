import { _decorator, Color, Component, Graphics, Label, Node, Size, tween, Tween, UIOpacity, Vec2 } from 'cc';
import { EDITOR } from 'cc/env';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { T } from '../ui/Lang';
import { UI, uiLabel } from '../ui/UiKit';
import { drawKey, KEY_EDGE, KEY_GOLD } from './KeyPickup';
const { ccclass, property, executeInEditMode } = _decorator;

const WIRE = new Color(150, 150, 158, 255);
const WIRE_DARK = new Color(64, 62, 70, 255);
const LOCK = new Color(232, 112, 170, 255);
const LOCK_EDGE = new Color(112, 40, 78, 255);
const SHACKLE = new Color(176, 176, 186, 255);
/** Độ cao 2 ổ khoá so với chân cổng, theo 2 đốm hồng trong bản vẽ của người dùng (ổ thứ 3 trở đi cách nhau 345) */
const LOCK_Y = [330, 675];

/**
 * Cổng khoá (map thử): cuộn dây kẽm gai chắn đường, có N ổ khoá (mặc định 2). Mỗi chìa nhặt được thì một ổ cắm chìa vàng.
 * Leo tới gần: thiếu chìa thì hiện chữ "Còn thiếu N chìa khoá"; đủ chìa thì dây kẽm gai mờ dần rồi biến mất, hết chặn đường.
 * Hình tạm vẽ bằng code. Gốc node là chân cổng (giữa); cổng cao Height, rộng Width (va chạm đúng cỡ đó).
 */
@ccclass('LockedGate')
@executeInEditMode
export class LockedGate extends Component {
    @property({ tooltip: 'Cần bao nhiêu chìa' })
    keysNeeded = 2;

    @property({ tooltip: 'Bề ngang cổng' })
    width = 60;

    @property({ tooltip: 'Chiều cao cổng (cao hẳn để không nhảy qua được)' })
    height = 3600;

    @property({ tooltip: 'Leo cách cổng chừng này thì hiện chữ / mở cổng' })
    range = 260;

    private open = false;
    private hint: Node | null = null;
    private shownLit = -1;
    private readonly onKeys = () => this.redraw();

    onLoad() {
        this.redraw();
    }

    start() {
        if (EDITOR) return;
        GameManager.instance?.keyListeners.push(this.onKeys);
    }

    onDestroy() {
        const list = GameManager.instance?.keyListeners;
        const i = list ? list.indexOf(this.onKeys) : -1;
        if (list && i >= 0) list.splice(i, 1);
    }

    private get lit(): number {
        return EDITOR ? 0 : Math.min(this.keysNeeded, GameManager.instance?.keys ?? 0);
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        const w = this.width, h = this.height;
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.lineJoin = Graphics.LineJoin.ROUND;
        g.lineCap = Graphics.LineCap.ROUND;
        // Dây kẽm gai: 2 sợi xoắn chéo nhau suốt chiều cao (viền tối vẽ trước, sợi sáng đè lên), gai nhọn ở mỗi chỗ chéo
        const half = w / 2, period = 90;
        const strand = (phase: number) => {
            for (let y = 0; y <= h; y += 15) {
                const x = Math.sin((y / period) * Math.PI * 2 + phase) * half;
                if (y === 0) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
        };
        for (const [color, lw] of [[WIRE_DARK, 9], [WIRE, 4]] as [Color, number][]) {
            g.strokeColor = color;
            g.lineWidth = lw;
            strand(0);
            strand(Math.PI);
            g.stroke();
        }
        g.strokeColor = WIRE_DARK;
        g.lineWidth = 4;
        for (let y = 0; y <= h; y += period / 2) {
            g.moveTo(-14, y - 14);
            g.lineTo(14, y + 14);
            g.moveTo(-14, y + 14);
            g.lineTo(14, y - 14);
        }
        g.stroke();
        // Ổ khoá: quai bạc + thân hồng có lỗ khoá; có chìa thì cắm chìa vàng vào
        const lit = this.lit;
        this.shownLit = lit;
        for (let i = 0; i < this.keysNeeded; i++) {
            const cy = LOCK_Y[i] ?? LOCK_Y[LOCK_Y.length - 1] + (i - LOCK_Y.length + 1) * 345;
            g.strokeColor = LOCK_EDGE;
            g.lineWidth = 14;
            g.arc(0, cy + 28, 24, 0, Math.PI, true);
            g.stroke();
            g.strokeColor = SHACKLE;
            g.lineWidth = 8;
            g.arc(0, cy + 28, 24, 0, Math.PI, true);
            g.stroke();
            g.fillColor = LOCK;
            g.strokeColor = LOCK_EDGE;
            g.lineWidth = 5;
            g.roundRect(-38, cy - 36, 76, 66, 12);
            g.fill();
            g.stroke();
            if (i < lit) drawKey(g, 0, cy - 4, 18, KEY_GOLD, KEY_EDGE);
            else {
                g.fillColor = LOCK_EDGE;
                g.circle(0, cy + 2, 8);
                g.fill();
                g.rect(-4, cy - 20, 8, 20);
                g.fill();
            }
        }
        // Va chạm
        const solid = this.getComponent(Solid) ?? this.addComponent(Solid);
        solid.size = new Size(w, h);
        solid.offset = new Vec2(0, h / 2);
        solid.enabled = !this.open;
    }

    update() {
        if (EDITOR || this.open) return;
        const gm = GameManager.instance;
        const cat = gm?.player;
        if (!gm || !cat) return;
        if (this.lit !== this.shownLit) this.redraw();
        const p = cat.node.position, me = this.node.position;
        const near = Math.abs(p.x - me.x) < this.range && p.y > me.y - 80 && p.y < me.y + 600;
        if (near && gm.keys >= this.keysNeeded) {
            this.unlock();
            return;
        }
        this.showHint(near ? T('gate.need', this.keysNeeded - gm.keys) : '');
    }

    /** Đủ chìa: tắt va chạm, dây kẽm gai mờ dần rồi ẩn hẳn. */
    private unlock() {
        this.open = true;
        this.showHint(T('gate.open'));
        Sound.play('checkpoint', 1);
        const solid = this.getComponent(Solid);
        if (solid) solid.enabled = false;
        const op = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        tween(op).to(1.0, { opacity: 0 }, { easing: 'quadIn' }).call(() => { this.getComponent(Graphics)!.enabled = false; }).start();
        this.scheduleOnce(() => this.showHint(''), 2);
    }

    private showHint(text: string) {
        const parent = this.node.parent;
        if (!parent) return;
        if (!text) {
            if (this.hint?.isValid) {
                const op = this.hint.getComponent(UIOpacity)!;
                Tween.stopAllByTarget(op);
                const n = this.hint;
                this.hint = null;
                tween(op).to(0.2, { opacity: 0 }).call(() => n.destroy()).start();
            }
            return;
        }
        if (!this.hint || !this.hint.isValid) {
            const label = uiLabel(parent, text, 40, UI.cream, { outline: UI.brown, outlineWidth: 5, name: 'GateHint' });
            const n = label.node;
            n.addComponent(UIOpacity).opacity = 0;
            tween(n.getComponent(UIOpacity)!).to(0.2, { opacity: 255 }).start();
            this.hint = n;
        } else {
            const label = this.hint.getComponent(Label);
            if (label && label.string !== text) label.string = text;
        }
        const me = this.node.position;
        this.hint.setPosition(me.x - 260, me.y + 420, 0);
    }
}
