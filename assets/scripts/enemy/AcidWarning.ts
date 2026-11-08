import { _decorator, Color, Component, Graphics, Node } from 'cc';
import { DustPuff } from '../player/DustPuff';
const { ccclass } = _decorator;

const GLOW = new Color(150, 255, 90, 255);
const RING = new Color(220, 255, 170, 255);

/**
 * Dấu cảnh báo trên mặt đất chỗ cột lửa (Axit 3) sắp mọc: vệt sáng xanh độc hình bầu dục rộng bằng cột,
 * nhấp nháy nhanh dần, dấu ! (ảnh art/fx/Boss/Warn) nhảy phía trên. Tự xoá sau life giây (hoặc BossBrain xoá khi cột mọc).
 */
@ccclass('AcidWarning')
export class AcidWarning extends Component {
    private g!: Graphics;
    private life = 1;
    private time = 0;
    private width = 140;

    /** Đặt dấu tại (x, groundY) trong node cha (lớp Gameplay), rộng width, tồn tại life giây. */
    static spawn(parent: Node, x: number, groundY: number, width: number, life: number): AcidWarning {
        const n = new Node('AcidWarning');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x, groundY, 0);
        const w = n.addComponent(AcidWarning);
        w.g = n.addComponent(Graphics);
        w.life = life;
        w.width = width;
        w.draw();
        DustPuff.spawn('Boss/Warn/frame', n, 0, 200, { scale: 1.6, fps: 14, loopFor: life }); // cao hơn đầu mèo, như dấu ! của các đòn khác
        return w;
    }

    update(dt: number) {
        this.time += dt;
        if (this.time >= this.life) {
            this.node.destroy();
            return;
        }
        this.draw();
    }

    private draw() {
        const g = this.g;
        const t = this.time / Math.max(0.01, this.life);
        // Nhấp nháy nhanh dần: 4 lần/giây lúc đầu, 12 lần/giây lúc sắp mọc
        const blink = 0.55 + 0.45 * Math.abs(Math.sin(this.time * Math.PI * (4 + 8 * t)));
        const w = this.width / 2;
        g.clear();
        const glow = GLOW.clone();
        glow.a = Math.round(120 * blink);
        g.fillColor = glow;
        g.ellipse(0, 4, w, 18);
        g.fill();
        const ring = RING.clone();
        ring.a = Math.round(255 * blink);
        g.strokeColor = ring;
        g.lineWidth = 5;
        g.ellipse(0, 4, w, 18);
        g.stroke();
    }
}
