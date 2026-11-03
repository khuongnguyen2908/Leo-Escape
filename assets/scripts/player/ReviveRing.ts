import { _decorator, Color, Component, Graphics, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

const BG = new Color(40, 30, 30, 170);
const RING = new Color(255, 236, 200, 255);
const FILL = new Color(120, 220, 140, 255);

/**
 * Vòng tròn trên đầu con mèo đang gục: hiện phím cần giữ, đầy dần khi đồng đội đang kéo dậy.
 * GameManager tự gắn và điều khiển; không cần đặt trong scene.
 */
@ccclass('ReviveRing')
export class ReviveRing extends Component {
    @property({ tooltip: 'Cao hơn chân mèo bao nhiêu' })
    height = 190;

    private gfx: Graphics | null = null;
    private label: Label | null = null;
    private root: Node | null = null;

    onLoad() {
        const root = new Node('ReviveRing');
        root.layer = this.node.layer;
        this.node.addChild(root);
        root.setPosition(0, this.height, 0);
        this.gfx = root.addComponent(Graphics);
        const t = new Node('Hint');
        t.layer = this.node.layer;
        root.addChild(t);
        t.setPosition(0, 62, 0);
        const label = t.addComponent(Label);
        label.fontSize = 28;
        label.lineHeight = 32;
        label.isBold = true;
        label.color = RING;
        label.enableOutline = true;
        label.outlineWidth = 4;
        label.outlineColor = new Color(40, 30, 30, 255);
        this.label = label;
        this.root = root;
        root.active = false;
    }

    /** progress 0..1; hint: chữ hiện phía trên vòng (ví dụ "Giữ L"). */
    show(progress: number, hint: string) {
        if (!this.root || !this.gfx || !this.label) return;
        this.root.active = true;
        // Mèo quay trái thì node cha bị lật, giữ chữ và vòng không bị ngược
        const sx = this.node.scale.x < 0 ? -1 : 1;
        this.root.setScale(sx, 1, 1);
        this.label.string = hint;
        const g = this.gfx;
        const r = 34;
        g.clear();
        g.fillColor = BG;
        g.circle(0, 0, r + 8);
        g.fill();
        g.lineWidth = 6;
        g.strokeColor = RING;
        g.circle(0, 0, r);
        g.stroke();
        if (progress > 0) {
            g.lineWidth = 10;
            g.strokeColor = FILL;
            const start = Math.PI / 2;
            g.arc(0, 0, r, start, start - Math.PI * 2 * Math.min(1, progress), false);
            g.stroke();
        }
    }

    hide() {
        if (this.root) this.root.active = false;
    }
}
