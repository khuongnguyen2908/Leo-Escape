import { _decorator, Component, Node, UIOpacity, UITransform } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Hào quang sau con cá vàng (gắn cùng SoftGlow, chỉnh độ lớn và màu ở SoftGlow). Node hào quang nằm
 * ngay trước con cá trong cùng lớp, nên được vẽ phía sau cá; tự bám theo cá, kể cả khi bạn kéo cá trong editor.
 * Cá bị nhặt thì hào quang tắt dần.
 */
@ccclass('CoinGlow')
@executeInEditMode
export class CoinGlow extends Component {
    @property({ type: Node, tooltip: 'Con cá cần toả sáng' })
    target: Node | null = null;

    @property({ tooltip: 'Phập phồng nhiều bao nhiêu khi chơi (0.08 = 8%)' })
    pulse = 0.08;

    private time = 0;
    private fading = false;

    lateUpdate(dt: number) {
        if (!this.target || !this.target.isValid) {
            if (!EDITOR && !this.fading) this.fadeOut();
            return;
        }
        // Tâm con cá: gốc cá ở đáy-giữa, nên cộng nửa chiều cao đã nhân tỉ lệ
        const t = this.target;
        const ut = t.getComponent(UITransform);
        const cy = ut ? (0.5 - ut.anchorY) * ut.height * Math.abs(t.scale.y) : 0;
        const p = t.position;
        this.node.setPosition(p.x, p.y + cy, p.z);

        this.time += dt;
        const k = EDITOR ? 1 : 1 + this.pulse * Math.sin(this.time * 3);
        this.node.setScale(k, k, 1);
    }

    private fadeOut() {
        this.fading = true;
        const op = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        const step = () => {
            if (!this.node.isValid) return;
            op.opacity = Math.max(0, op.opacity - 40);
            if (op.opacity <= 0) this.node.destroy();
            else this.scheduleOnce(step, 0.03);
        };
        step();
    }
}
