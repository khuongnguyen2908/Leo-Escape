import { _decorator, Color, Component, Graphics, Node } from 'cc';
const { ccclass } = _decorator;

const FLASH = new Color(255, 255, 255, 255);
const RAY = new Color(255, 232, 150, 255);
const RING = new Color(255, 210, 120, 255);
const LIFE = 0.28;

/**
 * Tia lửa khi chém trúng, vẽ bằng code: chớp trắng ở giữa, vòng sóng nở ra và các tia bắn
 * về phía đòn đánh đi tới. Tự xoá sau chưa tới nửa giây.
 */
@ccclass('HitSpark')
export class HitSpark extends Component {
    private g!: Graphics;
    private t = 0;
    private scale = 1;
    private rays: { ang: number; len: number; w: number }[] = [];

    /** Tạo tia lửa tại (x, y) trong node cha; dir là hướng đòn đánh (1 phải, -1 trái). */
    static spawn(parent: Node, x: number, y: number, dir: number, big = false) {
        const n = new Node('HitSpark');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x, y, 0);
        n.addComponent(HitSpark).setup(dir, big);
    }

    setup(dir: number, big: boolean) {
        this.g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        this.scale = big ? 1.4 : 1;
        const base = dir >= 0 ? 0 : Math.PI;
        const count = big ? 9 : 7;
        for (let i = 0; i < count; i++) {
            // Phần lớn tia bắn theo hướng chém, vài tia toả ngược lại
            const spread = i < count - 2 ? 1.1 : Math.PI;
            this.rays.push({
                ang: base + (Math.random() - 0.5) * 2 * spread,
                len: (45 + Math.random() * 45) * this.scale,
                w: (5 + Math.random() * 5) * this.scale,
            });
        }
        this.draw();
    }

    update(dt: number) {
        this.t += dt;
        if (this.t >= LIFE) {
            this.node.destroy();
            return;
        }
        this.draw();
    }

    private draw() {
        const g = this.g;
        const k = this.t / LIFE;        // 0 → 1
        const out = 1 - Math.pow(1 - k, 3); // nở nhanh rồi chậm lại
        const fade = 1 - k;
        g.clear();

        // Chớp trắng
        const flash = FLASH.clone();
        flash.a = Math.round(255 * Math.max(0, 1 - k * 2.5));
        g.fillColor = flash;
        g.circle(0, 0, (16 + 30 * out) * this.scale);
        g.fill();

        // Vòng sóng
        const ring = RING.clone();
        ring.a = Math.round(220 * fade);
        g.strokeColor = ring;
        g.lineWidth = Math.max(1, 7 * fade) * this.scale;
        g.circle(0, 0, (20 + 55 * out) * this.scale);
        g.stroke();

        // Tia bắn ra: hình thoi mảnh, bay ra ngoài và ngắn dần
        const ray = RAY.clone();
        ray.a = Math.round(255 * fade);
        g.fillColor = ray;
        for (const r of this.rays) {
            const r0 = 12 * this.scale + r.len * 0.6 * out;
            const r1 = r0 + r.len * (1 - k * 0.7);
            const cos = Math.cos(r.ang), sin = Math.sin(r.ang);
            const w = r.w * fade;
            const mid = (r0 + r1) / 2;
            g.moveTo(cos * r0, sin * r0);
            g.lineTo(cos * mid - sin * w, sin * mid + cos * w);
            g.lineTo(cos * r1, sin * r1);
            g.lineTo(cos * mid + sin * w, sin * mid - cos * w);
            g.close();
            g.fill();
        }
    }
}
