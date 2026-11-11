import { _decorator, CCString, Color, Component, Enum, Graphics, Label, Node, Size, UITransform, Vec2 } from 'cc';
import { Solid } from '../core/Solid';
const { ccclass, property, executeInEditMode } = _decorator;

/** Khối này là gì: tường / nền cứng, bục một chiều (nhảy xuyên từ dưới lên), hay chỉ là hình nền không chạm được. */
export enum MapBlockKind {
    Wall = 0,
    Platform = 1,
    Backdrop = 2,
}

const LINE = new Color(40, 30, 28, 255);

/**
 * Khối dựng map thử (hình tạm vẽ bằng code, không dùng ảnh): hình chữ nhật màu kèm chữ, có va chạm theo loại.
 * Gốc node là góc TRÊN TRÁI (như GroundBlock): kéo node để dời, đổi Width / Height để to nhỏ, đổi Kind để đổi loại.
 * Hình vẽ bằng Graphics nên vẽ lại mỗi lần mở scene (không lưu vào scene); chữ là node con Label.
 */
@ccclass('MapBlock')
@executeInEditMode
export class MapBlock extends Component {
    @property
    _width = 400;

    @property
    _height = 60;

    @property
    _kind = MapBlockKind.Wall;

    @property
    _color = new Color(120, 110, 100, 255);

    @property
    _text = '';

    @property
    _stripes = false;

    @property({ tooltip: 'Bề ngang' })
    get width() { return this._width; }
    set width(v: number) { this._width = Math.max(4, v); this.redraw(); }

    @property({ tooltip: 'Chiều cao (từ gốc node xuống dưới)' })
    get height() { return this._height; }
    set height(v: number) { this._height = Math.max(4, v); this.redraw(); }

    @property({ type: Enum(MapBlockKind), tooltip: 'Wall: tường / nền cứng. Platform: bục một chiều (nhảy xuyên từ dưới lên, S S để rơi xuống). Backdrop: chỉ là hình nền' })
    get kind() { return this._kind; }
    set kind(v: MapBlockKind) { this._kind = v; this.redraw(); }

    @property({ tooltip: 'Màu khối' })
    get color() { return this._color; }
    set color(v: Color) { this._color = v.clone(); this.redraw(); }

    @property({ type: CCString, tooltip: 'Chữ ghi trên khối (để trống = không ghi)' })
    get text() { return this._text; }
    set text(v: string) { this._text = v; this.redraw(); }

    @property({ tooltip: 'Kẻ sọc chéo (dùng cho chỗ cần chú ý: cổng, ống, cửa)' })
    get stripes() { return this._stripes; }
    set stripes(v: boolean) { this._stripes = v; this.redraw(); }

    /** Đặt hết một lần (nút dựng map dùng). */
    setup(w: number, h: number, kind: MapBlockKind, color: Color, text = '', stripes = false) {
        this._width = Math.max(4, w);
        this._height = Math.max(4, h);
        this._kind = kind;
        this._color = color.clone();
        this._text = text;
        this._stripes = stripes;
        this.redraw();
    }

    onLoad() {
        this.redraw();
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        const w = this._width, h = this._height;
        const ut = this.getComponent(UITransform) ?? this.addComponent(UITransform);
        ut.setAnchorPoint(0, 1);
        ut.setContentSize(w, h);

        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.fillColor = this._color;
        g.rect(0, -h, w, h);
        g.fill();
        if (this._stripes) {
            const c = this._color;
            g.strokeColor = new Color(Math.max(0, c.r - 40), Math.max(0, c.g - 40), Math.max(0, c.b - 40), 255);
            g.lineWidth = 10;
            for (let x = -h; x < w; x += 60) {
                const x0 = Math.max(0, x), y0 = -(x0 - x);
                const x1 = Math.min(w, x + h), y1 = -(x1 - x);
                g.moveTo(x0, y0);
                g.lineTo(x1, y1);
            }
            g.stroke();
        }
        g.strokeColor = LINE;
        g.lineWidth = this._kind === MapBlockKind.Platform ? 6 : 3;
        if (this._kind === MapBlockKind.Platform) {
            // Bục một chiều: chỉ kẻ đậm mép trên
            g.moveTo(0, 0);
            g.lineTo(w, 0);
        } else {
            g.rect(0, -h, w, h);
        }
        g.stroke();

        // Chữ
        let t = this.node.getChildByName('Label');
        if (this._text) {
            if (!t) {
                t = new Node('Label');
                t.layer = this.node.layer;
                this.node.addChild(t);
            }
            t.setPosition(w / 2, -Math.min(h / 2, 60), 0);
            const label = t.getComponent(Label) ?? t.addComponent(Label);
            label.string = this._text;
            label.fontSize = 34;
            label.lineHeight = 40;
            label.isBold = true;
            label.color = this._color.r + this._color.g + this._color.b > 380 ? LINE : Color.WHITE;
        } else if (t) {
            t.destroy();
        }

        // Va chạm: Wall / Platform có một Solid đúng cỡ khối, Backdrop thì không
        const solids = this.getComponents(Solid);
        for (let i = 1; i < solids.length; i++) solids[i].destroy();
        let solid: Solid | null = solids[0] ?? null;
        if (this._kind === MapBlockKind.Backdrop) {
            if (solid) solid.destroy();
            return;
        }
        if (!solid) solid = this.addComponent(Solid);
        solid.oneWay = this._kind === MapBlockKind.Platform;
        solid.size = new Size(w, this._kind === MapBlockKind.Platform ? Math.min(h, 30) : h);
        solid.offset = new Vec2(w / 2, -solid.size.height / 2);
    }
}
