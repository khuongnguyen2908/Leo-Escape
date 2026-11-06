import { _decorator, Component, UIOpacity, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property } = _decorator;

/**
 * Anim cho ảnh bụi (BG_bui): trôi lững lờ qua lại, lên xuống, sáng mờ dần đều và phồng nhẹ.
 * Gắn vào node có Sprite. Chỉ chạy khi chơi (trong editor ảnh đứng yên đúng chỗ bạn đặt).
 */
@ccclass('DustDrift')
export class DustDrift extends Component {
    @property({ tooltip: 'Trôi qua lại bao xa (ngang)' })
    swayX = 45;

    @property({ tooltip: 'Trôi lên xuống bao xa' })
    swayY = 28;

    @property({ tooltip: 'Bao nhiêu giây trôi hết một vòng qua lại' })
    period = 16;

    @property({ tooltip: 'Độ đậm thấp nhất (0 → 1)' })
    fadeMin = 0.35;

    @property({ tooltip: 'Độ đậm cao nhất (0 → 1)' })
    fadeMax = 0.9;

    @property({ tooltip: 'Bao nhiêu giây sáng lên rồi mờ đi một lần' })
    twinkle = 5;

    @property({ tooltip: 'Phồng to nhỏ bao nhiêu (0.04 = 4%)' })
    breathe = 0.04;

    private base = new Vec3();
    private baseScale = new Vec3();
    private opacity: UIOpacity | null = null;
    private t = 0;

    start() {
        if (EDITOR) return;
        this.base.set(this.node.position);
        this.baseScale.set(this.node.scale);
        this.opacity = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        this.t = Math.random() * 100;
    }

    update(dt: number) {
        if (EDITOR || !this.opacity) return;
        this.t += dt;
        const w = (Math.PI * 2) / Math.max(0.1, this.period);
        const t = this.t;
        this.node.setPosition(
            this.base.x + Math.sin(t * w) * this.swayX + Math.sin(t * w * 2.3) * this.swayX * 0.25,
            this.base.y + Math.sin(t * w * 0.73 + 1.3) * this.swayY,
            this.base.z,
        );
        const glow = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / Math.max(0.1, this.twinkle));
        this.opacity.opacity = 255 * (this.fadeMin + (this.fadeMax - this.fadeMin) * glow);
        const k = 1 + Math.sin(t * w * 1.6) * this.breathe;
        this.node.setScale(this.baseScale.x * k, this.baseScale.y * k, this.baseScale.z);
    }
}
