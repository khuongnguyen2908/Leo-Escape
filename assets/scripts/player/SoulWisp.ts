import { _decorator, Color, Component, Graphics, Node, Vec2 } from 'cc';
const { ccclass } = _decorator;

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; }

const TRAIL = 16;
const STEPS = 3; // số vòng vẽ xen giữa hai điểm của đuôi
const BURST_TIME = 0.32;
const _c = new Color();

/**
 * Linh hồn phát sáng bay vòng từ con mèo này sang con mèo kia (khi đổi mèo, hoặc khi con đi theo bị kẹt và dịch chuyển).
 * Lõi sáng + quầng mờ + đuôi dài + tia lấp lánh; tới nơi thì loé một vòng sáng. Vẽ bằng Graphics, tự xoá khi xong.
 * Gọi SoulWisp.fly(...); không cần đặt trong scene.
 */
@ccclass('SoulWisp')
export class SoulWisp extends Component {
    private from = new Vec2();
    private target: Node | null = null;
    private targetLift = 0;
    private color = new Color(255, 255, 255, 255);
    private duration = 0.45;
    private time = 0;
    private burst = -1;
    private onArrive: (() => void) | null = null;
    private trail: Vec2[] = [];
    private sparks: Spark[] = [];
    private gfx: Graphics | null = null;
    private readonly pos = new Vec2();

    /**
     * Bay từ điểm (fromX, fromY) tới ngực của node to (cao toLift so với chân). Node to có thể đang di chuyển, linh hồn bám theo.
     * parent: lớp chứa hai con mèo (Gameplay). onArrive gọi lúc linh hồn chạm tới nơi.
     */
    static fly(parent: Node, fromX: number, fromY: number, to: Node, toLift: number, color: Color, onArrive?: () => void): SoulWisp {
        const n = new Node('SoulWisp');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setSiblingIndex(parent.children.length - 1); // vẽ trên cả hai con mèo
        const w = n.addComponent(SoulWisp);
        w.gfx = n.addComponent(Graphics);
        w.from.set(fromX, fromY);
        w.target = to;
        w.targetLift = toLift;
        w.color.set(color);
        w.onArrive = onArrive ?? null;
        const dist = Math.abs(to.position.x - fromX) + Math.abs(to.position.y + toLift - fromY);
        w.duration = Math.min(0.9, 0.55 + dist / 3000);
        w.pos.set(fromX, fromY);
        return w;
    }

    update(dt: number) {
        const g = this.gfx;
        if (!g) return;
        // Luôn vẽ trên cùng (bóng mờ khi lướt, tia lửa... có thể chen lên sau)
        const parent = this.node.parent;
        if (parent && this.node.getSiblingIndex() !== parent.children.length - 1) this.node.setSiblingIndex(parent.children.length - 1);
        if (this.burst < 0) this.flyStep(dt);
        else this.burst += dt;
        this.stepSparks(dt);
        this.draw(g);
        if (this.burst >= BURST_TIME && this.sparks.length === 0) this.node.destroy();
    }

    private flyStep(dt: number) {
        this.time += dt;
        const t = Math.min(1, this.time / this.duration);
        const e = 0.5 - 0.5 * Math.cos(Math.PI * t); // chậm đầu, nhanh giữa, chậm cuối
        const tx = this.target && this.target.isValid ? this.target.position.x : this.pos.x;
        const ty = this.target && this.target.isValid ? this.target.position.y + this.targetLift : this.pos.y;
        // Đường cong vòng lên trên: điểm giữa nâng cao theo khoảng cách
        const dist = Math.hypot(tx - this.from.x, ty - this.from.y);
        const cx = (this.from.x + tx) / 2;
        const cy = Math.max(this.from.y, ty) + 220 + dist * 0.25;
        const u = 1 - e;
        // Lắc nhẹ như ngọn lửa ma trơi
        const wob = Math.sin(this.time * 26) * 6 * (1 - t);
        this.pos.set(
            u * u * this.from.x + 2 * u * e * cx + e * e * tx + wob,
            u * u * this.from.y + 2 * u * e * cy + e * e * ty,
        );
        this.trail.unshift(this.pos.clone());
        if (this.trail.length > TRAIL) this.trail.pop();
        for (let i = 0; i < 3; i++) this.spawnSpark(this.pos.x, this.pos.y, 70, 0.4);
        if (t >= 1) {
            this.burst = 0;
            for (let i = 0; i < 22; i++) this.spawnSpark(this.pos.x, this.pos.y, 380, 0.5);
            this.onArrive?.();
            this.onArrive = null;
        }
    }

    private spawnSpark(x: number, y: number, speed: number, life: number) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7);
        this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 30, life, max: life, size: 3 + Math.random() * 5 });
    }

    private stepSparks(dt: number) {
        for (const p of this.sparks) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.92;
            p.vy = p.vy * 0.92 + 40 * dt; // bay lên như đốm lửa
        }
        this.sparks = this.sparks.filter((p) => p.life > 0);
    }

    private draw(g: Graphics) {
        g.clear();
        const c = this.color;
        const flying = this.burst < 0;
        // Đuôi: các vòng nhỏ dần, mờ dần; vẽ thêm vòng xen giữa hai điểm để đuôi liền thành vệt, không rời như chuỗi hạt
        const fade = flying ? 1 : Math.max(0, 1 - this.burst / 0.18);
        const n = this.trail.length;
        for (let i = n - 1; i >= 1; i--) {
            const a = this.trail[i], b = this.trail[i - 1];
            for (let s = 0; s < STEPS; s++) {
                const f = s / STEPS;
                const k = 1 - (i - f) / n;
                g.fillColor = _c.set(c.r, c.g, c.b, 120 * k * fade);
                g.circle(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 6 + 22 * k);
                g.fill();
            }
        }
        if (flying) {
            const { x, y } = this.pos;
            const pulse = 1 + 0.12 * Math.sin(this.time * 30);
            for (const [r, a] of [[70, 45], [48, 90], [32, 160]]) {
                g.fillColor = _c.set(c.r, c.g, c.b, a);
                g.circle(x, y, r * pulse);
                g.fill();
            }
            g.fillColor = _c.set(255, 255, 245, 255);
            g.circle(x, y, 16 * pulse);
            g.fill();
        } else {
            // Tới nơi: vòng sáng loé ra rồi tan
            const k = Math.min(1, this.burst / BURST_TIME);
            const { x, y } = this.pos;
            g.lineWidth = 14 * (1 - k) + 3;
            g.strokeColor = _c.set(c.r, c.g, c.b, 240 * (1 - k));
            g.circle(x, y, 24 + 170 * k);
            g.stroke();
            g.fillColor = _c.set(255, 255, 240, 220 * (1 - k));
            g.circle(x, y, 56 * (1 - k));
            g.fill();
        }
        for (const p of this.sparks) {
            const k = p.life / p.max;
            g.fillColor = _c.set(Math.min(255, c.r + 60), Math.min(255, c.g + 60), Math.min(255, c.b + 60), 255 * k);
            g.circle(p.x, p.y, p.size * k);
            g.fill();
        }
    }
}
