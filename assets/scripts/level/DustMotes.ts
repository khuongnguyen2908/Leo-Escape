import { _decorator, Color, Component, Graphics, Size } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Bụi sáng lấp lánh trôi lơ lửng trong vùng nắng. Vùng bụi là hình chữ nhật Size, tâm ở gốc node.
 * Vẽ bằng Graphics nên vẽ lại mỗi frame (không lưu hình vào scene).
 */
@ccclass('DustMotes')
@executeInEditMode
export class DustMotes extends Component {
    @property({ tooltip: 'Vùng bụi bay (tâm ở gốc node)' })
    size = new Size(800, 600);

    @property({ tooltip: 'Số hạt bụi' })
    count = 36;

    @property
    color = new Color(255, 246, 205, 230);

    @property({ tooltip: 'Bán kính hạt lớn nhất' })
    maxRadius = 4;

    @property({ tooltip: 'Tốc độ bay lên' })
    speed = 14;

    @property({ tooltip: 'Đổi số này để ra cách rải hạt khác' })
    seed = 1;

    private g: Graphics | null = null;
    private time = 0;
    private motes: { x: number; y: number; r: number; phase: number; sway: number }[] = [];
    private builtFor = '';

    update(dt: number) {
        this.time += dt;
        this.draw();
    }

    private draw() {
        const key = `${this.count}|${this.seed}|${this.size.width}|${this.size.height}|${this.maxRadius}`;
        if (key !== this.builtFor) this.scatter(key);
        if (!this.g || !this.g.isValid) this.g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        const g = this.g;
        const h = this.size.height;
        const c = this.color.clone();
        g.clear();
        for (const m of this.motes) {
            // Bay lên chậm, lắc ngang, ra khỏi mép trên thì quay lại từ dưới
            const y = ((m.y + this.time * this.speed * (0.5 + m.r / this.maxRadius)) % h + h) % h - h / 2;
            const x = m.x + Math.sin(this.time * 0.7 + m.phase) * m.sway;
            // Mờ dần ở mép trên/dưới, lấp lánh theo thời gian
            const edge = Math.min(1, (h / 2 - Math.abs(y)) / (h * 0.2));
            const twinkle = 0.55 + 0.45 * Math.sin(this.time * 2.3 + m.phase * 3);
            const a = this.color.a * edge * twinkle;
            c.a = Math.round(a * 0.25);
            g.fillColor = c;
            g.circle(x, y, m.r * 2.4);
            g.fill();
            c.a = Math.round(a);
            g.fillColor = c;
            g.circle(x, y, m.r);
            g.fill();
        }
    }

    private scatter(key: string) {
        let s = this.seed * 9301 + 49297;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        const { width: w, height: h } = this.size;
        this.motes = [];
        for (let i = 0; i < this.count; i++) {
            this.motes.push({
                x: (rand() - 0.5) * w,
                y: rand() * h,
                r: this.maxRadius * (0.35 + 0.65 * rand()),
                phase: rand() * Math.PI * 2,
                sway: 8 + rand() * 18,
            });
        }
        this.builtFor = key;
    }
}
