import { _decorator, Color, Component, Graphics, Node, Size, UIOpacity, Vec2 } from 'cc';
import { EDITOR } from 'cc/env';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
const { ccclass, property, executeInEditMode } = _decorator;

const LEAF = new Color(104, 166, 88, 255);
const LEAF_LIGHT = new Color(158, 204, 118, 255);
const LEAF_LINE = new Color(36, 66, 40, 255);
const PETAL = new Color(170, 120, 214, 255);
const PETAL_LIGHT = new Color(214, 184, 240, 255);
const HEART = new Color(250, 214, 90, 255);

enum State { Float, Shake, Sink, Under, Rise }

/**
 * Lá sen nổi trên hồ (map thử): bục một chiều, mèo đứng lên Stand Time giây thì lá rung (Shake Time), rồi chìm xuống (Sink Time)
 * — lúc đó mèo rơi xuống nước —, nằm dưới nước Under Time giây rồi nổi lại chỗ cũ (Rise Time). Lá không ai đứng thì nổi yên.
 * Gốc node = mép trái, mặt lá. Hình vẽ tạm bằng code trong node con `La`; có art thật thì thay hình trong đó.
 */
@ccclass('LilyPad')
@executeInEditMode
export class LilyPad extends Component {
    @property({ tooltip: 'Bề ngang lá (chỗ đứng)' })
    width = 200;
    @property({ tooltip: 'Có bông lục bình tím trên lá' })
    flower = false;
    @property({ tooltip: 'Đứng lên bao nhiêu giây thì lá bắt đầu rung' })
    standTime = 1.0;
    @property({ tooltip: 'Giây rung báo trước khi chìm' })
    shakeTime = 0.4;
    @property({ tooltip: 'Giây chìm xuống' })
    sinkTime = 0.3;
    @property({ tooltip: 'Giây nằm dưới nước rồi mới nổi lại' })
    underTime = 2.5;
    @property({ tooltip: 'Giây nổi lên' })
    riseTime = 0.4;
    @property({ tooltip: 'Chìm sâu bao nhiêu dưới mặt nước' })
    sinkDepth = 60;

    private art: Node | null = null;
    private fade: UIOpacity | null = null;
    private solid: Solid | null = null;
    private state = State.Float;
    private time = 0;
    private stood = 0;

    setup(width: number, flower: boolean) {
        this.width = width;
        this.flower = flower;
        this.redraw();
    }

    onLoad() {
        this.redraw();
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        // Va chạm: bục một chiều dày 24 ngay dưới mặt lá. Dọn Solid thừa nếu bị chồng (Undo / nhân bản)
        const solids = this.getComponents(Solid);
        for (let i = 1; i < solids.length; i++) solids[i].destroy();
        this.solid = solids[0] ?? this.addComponent(Solid);
        this.solid.oneWay = true;
        this.solid.enabled = true;
        this.solid.size = new Size(this.width, 24);
        this.solid.offset = new Vec2(this.width / 2, -12);

        let n = this.node.getChildByName('La');
        if (!n) {
            n = new Node('La');
            n.layer = this.node.layer;
            this.node.addChild(n);
        }
        this.art = n;
        this.fade = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
        const g = n.getComponent(Graphics) ?? n.addComponent(Graphics);
        this.draw(g);
        this.place(0, 0, 255);
    }

    private draw(g: Graphics) {
        g.clear();
        const w = this.width, cx = w / 2, rx = w / 2 + 14, ry = 26, cy = -6;
        // Lá tròn dẹt có khe hình nêm (kiểu lá sen / lá súng), viền xanh đậm
        g.lineWidth = 4;
        g.strokeColor = LEAF_LINE;
        g.fillColor = LEAF;
        const notch = 0.32;
        g.moveTo(cx, cy);
        for (let i = 0; i <= 40; i++) {
            const a = notch + (Math.PI * 2 - notch * 2) * (i / 40) - Math.PI / 2;
            g.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
        }
        g.close();
        g.fill();
        g.stroke();
        // Gân lá
        g.lineWidth = 3;
        g.strokeColor = LEAF_LIGHT;
        for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2, 0.9, 1.6, 2.3]) {
            g.moveTo(cx, cy);
            g.lineTo(cx + Math.cos(a) * rx * 0.75, cy + Math.sin(a) * ry * 0.75);
        }
        g.stroke();
        if (!this.flower) return;
        // Bông lục bình tím mọc trên lá
        const fx = cx + rx * 0.35, fy = cy + 30;
        g.lineWidth = 3;
        g.strokeColor = LEAF_LINE;
        g.moveTo(fx, cy);
        g.lineTo(fx, fy - 10);
        g.stroke();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.fillColor = i % 2 ? PETAL : PETAL_LIGHT;
            g.circle(fx + Math.cos(a) * 14, fy + Math.sin(a) * 12, 11);
            g.fill();
        }
        g.fillColor = HEART;
        g.circle(fx, fy, 6);
        g.fill();
    }

    private place(dx: number, dy: number, alpha: number) {
        this.art?.setPosition(dx, dy, 0);
        if (this.fade) this.fade.opacity = alpha;
    }

    private standing(): boolean {
        const gm = GameManager.instance;
        if (!gm || !this.solid) return false;
        return gm.cats.some((c) => !c.downed && c.body.grounded && c.body.groundSolid === this.solid);
    }

    private go(s: State) {
        this.state = s;
        this.time = 0;
    }

    update(dt: number) {
        if (EDITOR || !this.solid) return;
        this.time += dt;
        switch (this.state) {
            case State.Float:
                // Đứng liên tục (rời lá thì đếm lại từ đầu)
                this.stood = this.standing() ? this.stood + dt : 0;
                if (this.stood >= this.standTime) this.go(State.Shake);
                break;
            case State.Shake:
                this.place(Math.sin(this.time * 70) * 5, -Math.min(1, this.time / this.shakeTime) * 6, 255);
                if (this.time >= this.shakeTime) {
                    this.solid.enabled = false;
                    Sound.play('drop', 0.5);
                    this.go(State.Sink);
                }
                break;
            case State.Sink: {
                const k = Math.min(1, this.time / this.sinkTime);
                this.place(0, -6 - k * this.sinkDepth, 255 * (1 - k));
                if (k >= 1) this.go(State.Under);
                break;
            }
            case State.Under:
                if (this.time >= this.underTime) this.go(State.Rise);
                break;
            case State.Rise: {
                const k = Math.min(1, this.time / this.riseTime);
                this.place(0, -(1 - k) * this.sinkDepth, 255 * k);
                if (k >= 1) {
                    this.solid.enabled = true;
                    this.stood = 0;
                    this.go(State.Float);
                }
                break;
            }
        }
    }
}
