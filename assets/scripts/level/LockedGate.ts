import { _decorator, Color, Component, Graphics, Label, Node, Size, tween, Tween, UIOpacity, Vec2, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { T } from '../ui/Lang';
import { UI, uiLabel } from '../ui/UiKit';
import { drawKey, KEY_EDGE, KEY_GOLD } from './KeyPickup';
const { ccclass, property, executeInEditMode } = _decorator;

const BAR = new Color(163, 45, 45, 255);
const BAR_EDGE = new Color(80, 19, 19, 255);
const LOCK_OFF = new Color(70, 60, 58, 255);

/**
 * Cổng khoá (map thử): bức tường chắn đường, có N ổ khoá (mặc định 2). Mỗi chìa nhặt được thì một ổ sáng lên.
 * Leo tới gần: thiếu chìa thì hiện chữ "Còn thiếu N chìa khoá"; đủ chìa thì cổng trượt lên, hết chặn đường.
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
        // Song sắt đỏ
        g.fillColor = BAR;
        g.strokeColor = BAR_EDGE;
        g.lineWidth = 4;
        g.rect(-w / 2, 0, w, h);
        g.fill();
        g.stroke();
        g.strokeColor = BAR_EDGE;
        g.lineWidth = 3;
        for (let y = 120; y < h; y += 120) {
            g.moveTo(-w / 2, y);
            g.lineTo(w / 2, y);
        }
        g.stroke();
        // Ổ khoá: vòng tròn tối, có chìa thì vẽ chìa vàng vào
        const lit = this.lit;
        this.shownLit = lit;
        for (let i = 0; i < this.keysNeeded; i++) {
            const cy = 120 + i * 130;
            g.fillColor = LOCK_OFF;
            g.strokeColor = BAR_EDGE;
            g.lineWidth = 4;
            g.circle(0, cy, 46);
            g.fill();
            g.stroke();
            if (i < lit) drawKey(g, 0, cy - 6, 18, KEY_GOLD, KEY_EDGE);
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

    /** Đủ chìa: cổng trượt lên rồi tắt va chạm. */
    private unlock() {
        this.open = true;
        this.showHint(T('gate.open'));
        Sound.play('checkpoint', 1);
        const solid = this.getComponent(Solid);
        if (solid) solid.enabled = false;
        const p = this.node.position;
        tween(this.node).to(1.2, { position: new Vec3(p.x, p.y + this.height, p.z) }, { easing: 'quadIn' }).start();
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
