import { _decorator, Color, Component, Graphics, Size, Sprite, SpriteFrame, UITransform } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Tán lá tối che mép trên màn hình (đặt trong lớp FR_Top). Gốc node ở đáy-giữa tán lá.
 * Chưa có ảnh thì vẽ tạm bằng các vòng tròn chồng lên nhau; kéo ảnh vào ô Frame là tự đổi sang ảnh.
 */
@ccclass('LeafCanopy')
@executeInEditMode
export class LeafCanopy extends Component {
    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh tán lá (gốc ở đáy-giữa)' })
    frame: SpriteFrame | null = null;

    @property({ tooltip: 'Kích thước tán lá khi tự vẽ' })
    size = new Size(900, 380);

    @property
    dark = new Color(34, 52, 50, 235);

    @property
    light = new Color(52, 76, 66, 235);

    @property({ tooltip: 'Đổi số này để ra hình tán lá khác' })
    seed = 1;

    onLoad() {
        this.redraw();
    }

    redraw() {
        if (this.frame) {
            const sp = this.getComponent(Sprite) ?? this.addComponent(Sprite);
            sp.spriteFrame = this.frame;
            this.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
            return;
        }
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        const { width: w, height: h } = this.size;
        let s = this.seed * 9301 + 49297;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };

        g.clear();
        // Phần trên đặc (vượt ra ngoài màn hình), mép dưới lởm chởm bằng các chùm lá
        g.fillColor = this.dark;
        g.rect(-w / 2, h * 0.45, w, h * 0.8);
        g.fill();
        for (let i = 0; i < 26; i++) {
            const x = -w / 2 + rand() * w;
            const edge = Math.abs(x) / (w / 2);            // càng ra 2 bên càng thòng thấp
            const y = h * (0.15 + 0.45 * rand()) + h * 0.25 * (1 - edge);
            const r = h * (0.14 + 0.16 * rand());
            g.fillColor = rand() < 0.35 ? this.light : this.dark;
            g.circle(x, y, r);
            g.fill();
        }
    }
}
