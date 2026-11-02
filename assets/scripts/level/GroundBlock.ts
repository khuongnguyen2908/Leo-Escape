import { _decorator, Color, Component, Graphics, Node, Size, Sprite, SpriteFrame, UITransform, Vec2 } from 'cc';
import { Solid } from '../core/Solid';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

// Cùng tông với phần đá tối ở đáy ảnh MG_tile, để thân tường nối liền mép đá
const WALL = new Color(74, 68, 80, 255);
const WALL_LINE = new Color(60, 55, 66, 255);
const LIP = new Color(176, 168, 156, 255);

/**
 * Khối nền đá: mép trên lát ảnh MG_tile lặp ngang, thân tường vẽ bằng Graphics, kèm Solid.
 * Gốc node là góc trên-trái mặt đất. Kéo node để đổi chỗ / độ cao, đổi Width để dài ngắn.
 */
@ccclass('GroundBlock')
@executeInEditMode
@requireComponent(Graphics)
export class GroundBlock extends Component {
    @property
    _width = 1000;

    @property
    _depth = 800;

    @property({ type: SpriteFrame })
    _tileFrame: SpriteFrame | null = null;

    @property
    _tileHeight = 240;

    @property
    _sink = 14;

    @property({ tooltip: 'Chiều dài khối' })
    get width() { return this._width; }
    set width(v: number) { this._width = Math.max(10, v); this.redraw(); }

    @property({ tooltip: 'Thân tường kéo xuống bao sâu' })
    get depth() { return this._depth; }
    set depth(v: number) { this._depth = Math.max(10, v); this.redraw(); }

    @property({ type: SpriteFrame, tooltip: 'Ảnh mép đá (MG_tile_2, MG_tile_3)' })
    get tileFrame() { return this._tileFrame; }
    set tileFrame(v: SpriteFrame | null) { this._tileFrame = v; this.redraw(); }

    @property({ tooltip: 'Chiều cao hiển thị của mép đá' })
    get tileHeight() { return this._tileHeight; }
    set tileHeight(v: number) { this._tileHeight = Math.max(1, v); this.redraw(); }

    @property({ tooltip: 'Mép đá nhô cao hơn mặt va chạm bao nhiêu (cho chân "lún" vào)' })
    get sink() { return this._sink; }
    set sink(v: number) { this._sink = v; this.redraw(); }

    onLoad() {
        this.redraw();
    }

    redraw() {
        const g = this.getComponent(Graphics);
        if (!g) return;
        const w = this._width, d = this._depth;

        g.clear();
        g.fillColor = WALL;
        g.rect(0, -d, w, d);
        g.fill();
        g.strokeColor = WALL_LINE;
        g.lineWidth = 4;
        for (let y = -this._tileHeight + 40; y > -d; y -= 80) {
            g.moveTo(0, y);
            g.lineTo(w, y);
        }
        g.stroke();

        let top = this.node.getChildByName('Top');
        const frame = this._tileFrame;
        if (frame) {
            if (!top) {
                top = new Node('Top');
                top.layer = this.node.layer;
                this.node.addChild(top);
            }
            const sp = top.getComponent(Sprite) ?? top.addComponent(Sprite);
            sp.spriteFrame = frame;
            sp.type = Sprite.Type.TILED;
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            const s = this._tileHeight / frame.rect.height;
            const ui = top.getComponent(UITransform)!;
            ui.setAnchorPoint(0, 1);
            ui.setContentSize(w / s, frame.rect.height);
            top.setScale(s, s, 1);
            top.setPosition(0, this._sink, 0);
        } else {
            if (top) top.destroy();
            g.fillColor = LIP;
            g.rect(0, -40, w, 40 + this._sink);
            g.fill();
        }

        const solid = this.getComponent(Solid) ?? this.addComponent(Solid);
        solid.size = new Size(w, d);
        solid.offset = new Vec2(w / 2, -d / 2);
    }
}
