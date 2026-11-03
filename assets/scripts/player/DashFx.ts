import { _decorator, Color, Component, Graphics, Node } from 'cc';
const { ccclass } = _decorator;

const GLOW = new Color(255, 196, 110, 255);
const BODY = new Color(255, 247, 228, 255);
const CORE = new Color(255, 255, 255, 255);
const LINE = new Color(255, 236, 200, 255);
const FADE = 0.28;

/**
 * Vệt chém dài khi lướt (vẽ bằng code, chưa cần ảnh): một dải sáng nằm ngang từ chỗ bắt đầu lướt
 * tới chỗ mèo đang ở, nhọn ở đuôi, dày ở đầu, kèm vài đường gió. Hết lướt thì mờ dần rồi tự xoá.
 */
@ccclass('DashFx')
export class DashFx extends Component {
    private g!: Graphics;
    private dir = 1;
    private length = 0;
    private fading = -1;
    private lines: { y: number; from: number; to: number }[] = [];

    /** Tạo vệt tại (x, y) trong node cha (lớp Gameplay); dir là hướng lướt. */
    static spawn(parent: Node, x: number, y: number, dir: number): DashFx {
        const n = new Node('DashFx');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x, y, 0);
        const fx = n.addComponent(DashFx);
        fx.dir = dir >= 0 ? 1 : -1;
        fx.g = n.addComponent(Graphics);
        for (let i = 0; i < 5; i++) {
            fx.lines.push({ y: (Math.random() - 0.5) * 140, from: Math.random() * 0.4, to: 0.5 + Math.random() * 0.45 });
        }
        return fx;
    }

    /** Kéo dài vệt tới toạ độ x (trong node cha) của mèo. */
    extendTo(x: number) {
        this.length = Math.max(this.length, (x - this.node.position.x) * this.dir);
        this.draw(1);
    }

    /** Hết lướt: mờ dần rồi xoá. */
    release() {
        this.fading = 0;
    }

    update(dt: number) {
        if (this.fading < 0) return;
        this.fading += dt;
        if (this.fading >= FADE) {
            this.node.destroy();
            return;
        }
        this.draw(1 - this.fading / FADE);
    }

    private draw(alpha: number) {
        const g = this.g;
        g.clear();
        const len = this.length;
        if (len < 4) return;
        // Đường gió mảnh phía trên và dưới
        const line = LINE.clone();
        line.a = Math.round(170 * alpha);
        g.strokeColor = line;
        g.lineWidth = 4;
        for (const l of this.lines) {
            g.moveTo(this.dir * len * l.from, l.y);
            g.lineTo(this.dir * len * l.to, l.y);
            g.stroke();
        }
        // Dải chém: nhọn ở đuôi (chỗ bắt đầu), dày nhất gần đầu (chỗ mèo)
        this.band(g, len, 44, GLOW, 0.35 * alpha);
        this.band(g, len, 26, BODY, 0.95 * alpha);
        this.band(g, len, 9, CORE, alpha);
    }

    private band(g: Graphics, len: number, thick: number, color: Color, alpha: number) {
        const c = color.clone();
        c.a = Math.round(255 * Math.max(0, Math.min(1, alpha)));
        g.fillColor = c;
        const d = this.dir;
        const head = len * 0.88;
        g.moveTo(0, 0);
        g.lineTo(d * head, thick / 2);
        g.lineTo(d * len, 0);
        g.lineTo(d * head, -thick / 2);
        g.close();
        g.fill();
    }
}
