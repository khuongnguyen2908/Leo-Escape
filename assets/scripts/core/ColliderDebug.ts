import { _decorator, Color, Component, Graphics, Node, Rect } from 'cc';
import { PlatformerBody } from './PlatformerBody';
import { Solid } from './Solid';
const { ccclass } = _decorator;

const SOLID = new Color(60, 220, 90, 255);
const ONE_WAY = new Color(60, 200, 255, 255);
const BODY = new Color(255, 80, 200, 255);
const _r = new Rect();

/** Vẽ khung va chạm để canh chỉnh. Gắn lên node lớp Gameplay. */
@ccclass('ColliderDebug')
export class ColliderDebug extends Component {
    private g: Graphics | null = null;

    start() {
        const n = new Node('ColliderDebug');
        n.layer = this.node.layer;
        this.node.addChild(n);
        this.g = n.addComponent(Graphics);
        this.g.lineWidth = 3;
    }

    lateUpdate() {
        const g = this.g;
        if (!g) return;
        g.node.setSiblingIndex(this.node.children.length - 1);
        g.clear();
        for (const s of Solid.all) {
            if (s.node.parent !== this.node) continue;
            this.box(g, s.getRect(_r), s.oneWay ? ONE_WAY : SOLID);
        }
        for (const b of this.node.getComponentsInChildren(PlatformerBody)) {
            this.box(g, b.getRect(_r), BODY);
        }
    }

    private box(g: Graphics, r: Rect, c: Color) {
        g.strokeColor = c;
        g.rect(r.x, r.y, r.width, r.height);
        g.stroke();
    }
}
