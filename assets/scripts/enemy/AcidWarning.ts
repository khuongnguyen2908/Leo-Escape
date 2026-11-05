import { _decorator, Color, Component, Graphics, Node } from 'cc';
const { ccclass } = _decorator;

const GLOW = new Color(150, 255, 90, 255);
const RING = new Color(220, 255, 170, 255);
const MARK = new Color(235, 60, 50, 255);
const MARK_EDGE = new Color(255, 245, 225, 255);

/**
 * Dấu cảnh báo trên mặt đất chỗ cột lửa (Axit 3) sắp mọc: vệt sáng xanh độc hình bầu dục rộng bằng cột,
 * nhấp nháy nhanh dần, dấu ! đỏ phía trên. Tự xoá sau life giây (hoặc BossBrain xoá khi cột mọc).
 * Vẽ bằng code; sau này có ảnh riêng thì thay ở đây.
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
        // Dấu ! đỏ viền trắng phía trên vệt sáng
        const y = 90 + 6 * Math.sin(this.time * 8);
        const mark = MARK.clone();
        mark.a = Math.round(255 * Math.min(1, 0.4 + blink));
        g.fillColor = MARK_EDGE;
        g.roundRect(-13, y - 4, 26, 64, 10);
        g.fill();
        g.circle(0, y - 26, 15);
        g.fill();
        g.fillColor = mark;
        g.roundRect(-8, y + 1, 16, 54, 7);
        g.fill();
        g.circle(0, y - 26, 10);
        g.fill();
    }
}
