import { _decorator, Color, Component, Graphics, Node } from 'cc';
import { YARN } from './SkillFx';
const { ccclass } = _decorator;

const KNOT = new Color(255, 170, 196, 255);

/**
 * Sợi dây len Angelo thả từ mép bục cao xuống, để Leo giữ phím Lên mà leo lên.
 * x: chỗ dây treo; topY: mép bục (chỗ Angelo đứng); bottomY: đất phía dưới;
 * ledgeSide: bục nằm về phía nào của dây (1 = bên phải, -1 = bên trái), leo tới đỉnh thì bước sang phía đó.
 * AngeloSkills tạo và gỡ; LeoSkills tìm trong YarnRope.all để leo.
 */
@ccclass('YarnRope')
export class YarnRope extends Component {
    static readonly all: YarnRope[] = [];

    x = 0;
    topY = 0;
    bottomY = 0;
    ledgeSide = 1;

    private gfx: Graphics | null = null;
    private time = 0;
    private drop = 0; // dây đang thả dần xuống (0..1)

    static spawn(parent: Node, x: number, topY: number, bottomY: number, ledgeSide: number): YarnRope {
        const n = new Node('YarnRope');
        n.layer = parent.layer;
        parent.addChild(n);
        const r = n.addComponent(YarnRope);
        r.gfx = n.addComponent(Graphics);
        r.x = x;
        r.topY = topY;
        r.bottomY = bottomY;
        r.ledgeSide = ledgeSide;
        return r;
    }

    onEnable() {
        YarnRope.all.push(this);
    }

    onDisable() {
        const i = YarnRope.all.indexOf(this);
        if (i >= 0) YarnRope.all.splice(i, 1);
    }

    /** Dây đã thả xuống hết chưa (thả xong mới leo được). */
    get ready() { return this.drop >= 1; }

    /** Điểm (px, py) có nằm sát dây không (để nắm lấy dây). */
    reachable(px: number, py: number): boolean {
        return this.ready && Math.abs(px - this.x) < 60 && py >= this.bottomY - 20 && py <= this.topY - 40;
    }

    remove() {
        this.node.destroy();
    }

    update(dt: number) {
        this.time += dt;
        this.drop = Math.min(1, this.drop + dt / 0.35);
        const g = this.gfx;
        if (!g) return;
        const len = (this.topY - this.bottomY) * this.drop;
        const end = this.topY - len;
        const sway = 6 * Math.sin(this.time * 2.2);
        g.clear();
        g.lineWidth = 7;
        g.strokeColor = YARN;
        g.moveTo(this.x, this.topY);
        g.quadraticCurveTo(this.x + sway, (this.topY + end) / 2, this.x + sway * 0.5, end);
        g.stroke();
        // Nút thắt dọc sợi dây để dễ nhìn là chỗ leo
        g.fillColor = KNOT;
        for (let y = this.topY - 60; y > end + 10; y -= 70) {
            const t = (this.topY - y) / Math.max(1, len);
            g.circle(this.x + sway * Math.sin(Math.PI * t), y, 7);
            g.fill();
        }
    }
}
