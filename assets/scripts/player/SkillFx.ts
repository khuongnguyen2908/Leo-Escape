import { _decorator, Color, Component, Graphics, Node } from 'cc';
const { ccclass } = _decorator;

export const YARN = new Color(232, 92, 132, 255);
const _c = new Color();

type Mode = 'line' | 'ring';

/**
 * Hiệu ứng vẽ tạm cho kỹ năng, tự xoá khi xong:
 *  - line: dây len vụt ra từ A tới B rồi thu về (Angelo quất dây, trói chân).
 *  - ring: vòng sóng loang ra sát mặt đất kèm bụi (Leo đập bụng, nhảy lần 2).
 * Gọi SkillFx.line(...) / SkillFx.ring(...) với node cha là lớp Gameplay.
 */
@ccclass('SkillFx')
export class SkillFx extends Component {
    private mode: Mode = 'line';
    private gfx: Graphics | null = null;
    private time = 0;
    private duration = 0.25;
    private color = new Color();
    private a = [0, 0];
    private b = [0, 0];
    private radius = 100;
    private width = 6;
    private dust: { x: number; y: number; vx: number; vy: number; r: number }[] = [];

    static line(parent: Node, x1: number, y1: number, x2: number, y2: number, color = YARN, duration = 0.24, width = 7): SkillFx {
        const fx = SkillFx.make(parent, 'line', color, duration);
        fx.a = [x1, y1];
        fx.b = [x2, y2];
        fx.width = width;
        return fx;
    }

    static ring(parent: Node, x: number, y: number, radius: number, color: Color, duration = 0.35, dust = 10): SkillFx {
        const fx = SkillFx.make(parent, 'ring', color, duration);
        fx.a = [x, y];
        fx.radius = radius;
        for (let i = 0; i < dust; i++) {
            const dir = i % 2 === 0 ? 1 : -1;
            fx.dust.push({ x, y: y + 6, vx: dir * (200 + Math.random() * 360), vy: 80 + Math.random() * 220, r: 10 + Math.random() * 14 });
        }
        return fx;
    }

    private static make(parent: Node, mode: Mode, color: Color, duration: number): SkillFx {
        const n = new Node(mode === 'line' ? 'YarnFx' : 'RingFx');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setSiblingIndex(parent.children.length - 1);
        const fx = n.addComponent(SkillFx);
        fx.gfx = n.addComponent(Graphics);
        fx.mode = mode;
        fx.color.set(color);
        fx.duration = duration;
        return fx;
    }

    update(dt: number) {
        this.time += dt;
        const k = Math.min(1, this.time / this.duration);
        const g = this.gfx;
        if (!g) return;
        g.clear();
        if (this.mode === 'line') this.drawLine(g, k);
        else this.drawRing(g, k, dt);
        if (k >= 1) this.node.destroy();
    }

    /** Nửa đầu dây vụt ra, nửa sau thu về; dây hơi võng như sợi len thật. */
    private drawLine(g: Graphics, k: number) {
        const reach = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) / 0.5 * 0.85;
        const [x1, y1] = this.a, [x2, y2] = this.b;
        const ex = x1 + (x2 - x1) * reach, ey = y1 + (y2 - y1) * reach;
        const sag = 26 * Math.sin(Math.PI * reach) * (1 - k);
        const c = this.color;
        g.lineWidth = this.width;
        g.strokeColor = _c.set(c.r, c.g, c.b, 255 * (1 - k * 0.6));
        g.moveTo(x1, y1);
        g.quadraticCurveTo((x1 + ex) / 2, (y1 + ey) / 2 - sag, ex, ey);
        g.stroke();
        g.fillColor = _c.set(Math.min(255, c.r + 20), c.g, c.b, 255);
        g.circle(ex, ey, this.width * 1.6);
        g.fill();
    }

    private drawRing(g: Graphics, k: number, dt: number) {
        const [x, y] = this.a;
        const c = this.color;
        const r = this.radius * (0.2 + 0.8 * k);
        // Vòng dẹt sát mặt đất
        g.lineWidth = 12 * (1 - k) + 2;
        g.strokeColor = _c.set(c.r, c.g, c.b, 220 * (1 - k));
        g.ellipse(x, y + 8, r, r * 0.22);
        g.stroke();
        for (const d of this.dust) {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vx *= 0.9;
            d.vy -= 600 * dt;
            if (d.y < y) d.y = y;
            g.fillColor = _c.set(205, 190, 170, 200 * (1 - k));
            g.circle(d.x, d.y + d.r * 0.5, d.r * (0.6 + 0.6 * k));
            g.fill();
        }
    }
}
