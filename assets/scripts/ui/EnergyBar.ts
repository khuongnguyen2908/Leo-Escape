import { _decorator, Color, Component, Graphics, Node, Size, Sprite, SpriteFrame } from 'cc';
import { GameManager } from '../game/GameManager';
const { ccclass, property } = _decorator;

const OUTLINE = new Color(60, 42, 40, 255);
const TRACK = new Color(118, 100, 98, 255);
const FILL = new Color(96, 190, 222, 255);
const SHINE = new Color(190, 235, 248, 255);

/**
 * Thanh năng lượng dưới hàng tim, đọc năng lượng của mèo mỗi frame.
 * Chưa có ảnh thì tự vẽ; kéo ảnh khung + ảnh thanh vào là tự đổi sang dùng ảnh.
 */
@ccclass('EnergyBar')
export class EnergyBar extends Component {
    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh khung thanh năng lượng' })
    frameFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh phần thanh màu (co lại theo năng lượng)' })
    fillFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Kích thước thanh khi tự vẽ' })
    size = new Size(450, 27);

    private fillSprite: Sprite | null = null;
    private fillGfx: Graphics | null = null;
    private shown = 1;

    start() {
        if (this.frameFrame) this.child('Frame').addComponent(Sprite).spriteFrame = this.frameFrame;
        if (this.fillFrame) {
            const sp = this.child('Fill').addComponent(Sprite);
            sp.spriteFrame = this.fillFrame;
            sp.type = Sprite.Type.FILLED;
            sp.fillType = Sprite.FillType.HORIZONTAL;
            sp.fillStart = 0;
            sp.fillRange = 1;
            this.fillSprite = sp;
        }
        if (!this.frameFrame && !this.fillFrame) {
            const { width: w, height: h } = this.size;
            const g = this.child('Back').addComponent(Graphics);
            g.fillColor = TRACK;
            g.strokeColor = OUTLINE;
            g.lineWidth = 5;
            g.roundRect(-w / 2, -h / 2, w, h, h / 2);
            g.fill();
            g.stroke();
            this.fillGfx = this.child('Fill').addComponent(Graphics);
        }
    }

    update(dt: number) {
        const p = GameManager.instance?.player;
        const ratio = p ? Math.max(0, Math.min(1, p.energy / p.maxEnergy)) : 1;
        this.shown += (ratio - this.shown) * Math.min(1, dt * 10);
        if (this.fillSprite) this.fillSprite.fillRange = this.shown;
        if (this.fillGfx) this.drawFill(this.fillGfx, this.shown);
    }

    private drawFill(g: Graphics, ratio: number) {
        const { width: w, height: h } = this.size;
        const pad = 5;
        const innerH = h - pad * 2;
        const fw = Math.max(0, (w - pad * 2) * ratio);
        g.clear();
        if (fw < innerH) return;
        g.fillColor = FILL;
        g.roundRect(-w / 2 + pad, -innerH / 2, fw, innerH, innerH / 2);
        g.fill();
        g.fillColor = SHINE;
        g.roundRect(-w / 2 + pad + 4, 0, Math.max(0, fw - 8), innerH / 2 - 2, innerH / 4);
        g.fill();
    }

    private child(name: string): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        this.node.addChild(n);
        return n;
    }
}
