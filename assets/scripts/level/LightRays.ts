import { _decorator, Color, Component, Graphics, UIOpacity } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Tia nắng xiên vẽ bằng code (không cần ảnh). Gốc node ở đỉnh chùm tia; tia chiếu xuống dưới,
 * nghiêng từ trên phải xuống dưới trái. Mỗi vệt được tô bằng nhiều lớp mờ chồng lên nhau để mép mềm,
 * và nhạt dần về phía dưới. Khi chơi thì sáng tối nhẹ như nắng xuyên qua lá.
 */
@ccclass('LightRays')
@executeInEditMode
export class LightRays extends Component {
    @property({ tooltip: 'Tia dài bao nhiêu (từ gốc node xuống)' })
    length = 850;

    @property({ tooltip: 'Độ nghiêng (độ). Âm = nghiêng ngược lại' })
    angle = 20;

    @property({ tooltip: 'Chùm tia rộng bao nhiêu ở đỉnh' })
    spread = 380;

    @property({ tooltip: 'Số vệt sáng' })
    shafts = 5;

    @property({ tooltip: 'Vệt rộng ra bao nhiêu lần ở chân' })
    widen = 2;

    @property({ tooltip: 'Màu tia; alpha là độ sáng chỗ đậm nhất' })
    color = new Color(255, 246, 214, 120);

    @property({ tooltip: 'Đổi số này để ra cách xếp vệt khác' })
    seed = 1;

    @property({ tooltip: 'Khi chơi: mờ đi tối đa bao nhiêu phần (0 = đứng yên)' })
    flicker = 0.35;

    @property({ tooltip: 'Tốc độ sáng tối' })
    speed = 0.6;

    private drawnFor = '';
    private opacity: UIOpacity | null = null;
    private time = 0;

    onLoad() {
        this.redraw();
    }

    start() {
        if (EDITOR) return;
        this.opacity = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        this.time = this.node.position.x * 0.003; // lệch pha giữa các chùm tia
    }

    update(dt: number) {
        if (EDITOR) {
            this.redraw(); // chỉ vẽ lại khi bạn đổi thông số
            return;
        }
        if (!this.opacity) return;
        this.time += dt * this.speed;
        // Hai sóng chồng nhau cho nhịp không đều
        const wave = 0.5 + 0.3 * Math.sin(this.time * 2.1) + 0.2 * Math.sin(this.time * 5.3 + 1.7);
        this.opacity.opacity = Math.round(255 * (1 - this.flicker * wave));
    }

    redraw() {
        const c = this.color;
        const key = `${this.length}|${this.angle}|${this.spread}|${this.shafts}|${this.widen}|${c.r},${c.g},${c.b},${c.a}|${this.seed}`;
        if (key === this.drawnFor) return;
        this.drawnFor = key;

        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        let s = this.seed * 9301 + 49297;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        const len = this.length;
        const slope = Math.tan(this.angle * Math.PI / 180); // dịch sang trái mỗi đơn vị đi xuống
        const LAYERS = 7;    // lớp chồng theo bề ngang → mép mềm
        const SEGMENTS = 12; // đoạn theo chiều dọc → nhạt dần xuống dưới
        const fill = c.clone();

        for (let i = 0; i < this.shafts; i++) {
            const xt = (rand() - 0.5) * this.spread;
            const wt = 25 + rand() * 80;
            const wb = wt * this.widen;
            const strength = 0.45 + 0.55 * rand();
            for (let k = 0; k < SEGMENTS; k++) {
                const v0 = k / SEGMENTS;
                const v1 = (k + 1) / SEGMENTS;
                const vm = (v0 + v1) / 2;
                // Đậm dần ở đỉnh rồi nhạt dần xuống chân
                const fade = Math.min(1, vm / 0.1) * Math.pow(1 - vm, 1.3);
                const layerAlpha = (c.a * strength * fade) / LAYERS;
                if (layerAlpha < 0.5) continue;
                fill.a = Math.max(1, Math.round(layerAlpha));
                g.fillColor = fill;
                const y0 = -v0 * len;
                const y1 = -v1 * len;
                const x0 = xt - v0 * len * slope;
                const x1 = xt - v1 * len * slope;
                const w0 = wt + (wb - wt) * v0;
                const w1 = wt + (wb - wt) * v1;
                for (let j = 1; j <= LAYERS; j++) {
                    const f = j / LAYERS;
                    g.moveTo(x0 - w0 * f / 2, y0);
                    g.lineTo(x0 + w0 * f / 2, y0);
                    g.lineTo(x1 + w1 * f / 2, y1);
                    g.lineTo(x1 - w1 * f / 2, y1);
                    g.close();
                    g.fill();
                }
            }
        }
    }
}
