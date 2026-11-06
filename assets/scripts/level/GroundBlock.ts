import { _decorator, Color, Component, Graphics, Node, Size, Sprite, SpriteFrame, UITransform, Vec2 } from 'cc';
import { Solid } from '../core/Solid';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

// Cùng tông với phần đá tối ở đáy ảnh MG_tile, để thân tường nối liền mép đá
const WALL = new Color(74, 68, 80, 255);
const WALL_LINE = new Color(60, 55, 66, 255);
const LIP = new Color(176, 168, 156, 255);

/**
 * Khối nền đá: mép trên lát ảnh MG_tile thành hàng, thân tường vẽ bằng Graphics, kèm Solid.
 * Các ô đá chồng lên nhau một đoạn (Overlap) để không lộ khe giữa 2 ô, và giãn nhẹ cho vừa khít
 * bề dài khối, nên 2 đầu khối luôn là mép đá bo tròn chứ không bị cắt ngang giữa ô.
 * Gốc node là góc trên-trái mặt đất. Kéo node để đổi chỗ / độ cao, đổi Width để dài ngắn.
 * Ô có nắng: ô đá nào có tâm nằm trong đoạn Lit From → Lit To (tính từ mép trái khối) thì dùng ảnh Lit Frame (MG_tile_3).
 * Ảnh thay phiên (Variants): ô 1 dùng Tile Frame, ô 2 dùng ảnh đầu danh sách, ô 3 ảnh kế... hết thì quay lại Tile Frame.
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

    @property
    _overlap = 24;

    @property({ type: SpriteFrame })
    _litFrame: SpriteFrame | null = null;

    @property
    _litFrom = 0;

    @property({ type: [SpriteFrame] })
    _variants: SpriteFrame[] = [];

    @property
    _litTo = 0;

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

    @property({ tooltip: 'Hai ô đá cạnh nhau chồng lên nhau bao nhiêu (px trên ảnh gốc). Còn thấy khe thì tăng lên' })
    get overlap() { return this._overlap; }
    set overlap(v: number) { this._overlap = Math.max(0, v); this.redraw(); }

    @property({ type: SpriteFrame, tooltip: 'Ảnh ô đá có nắng (MG_tile_3), dùng cho các ô nằm trong đoạn Lit From → Lit To' })
    get litFrame() { return this._litFrame; }
    set litFrame(v: SpriteFrame | null) { this._litFrame = v; this.redraw(); }

    @property({ tooltip: 'Đoạn có nắng: bắt đầu (tính từ mép trái khối). Lit From = Lit To thì không ô nào có nắng' })
    get litFrom() { return this._litFrom; }
    set litFrom(v: number) { this._litFrom = v; this.redraw(); }

    @property({ tooltip: 'Đoạn có nắng: kết thúc (tính từ mép trái khối)' })
    get litTo() { return this._litTo; }
    set litTo(v: number) { this._litTo = v; this.redraw(); }

    @property({ type: [SpriteFrame], tooltip: 'Ảnh mép đá thay phiên: ô 1 dùng Tile Frame, ô 2 dùng ảnh đầu danh sách này, ô 3 ảnh kế... (để trống = mọi ô dùng Tile Frame)' })
    get variants() { return this._variants; }
    set variants(v: SpriteFrame[]) { this._variants = v ?? []; this.redraw(); }

    /** Đặt danh sách ảnh thay phiên (chỉ vẽ lại khi có đổi). Trả về true nếu có đổi. */
    setVariants(list: SpriteFrame[]): boolean {
        const cur = this._variants ?? [];
        if (cur.length === list.length && cur.every((f, i) => f === list[i])) return false;
        this._variants = list.slice();
        this.redraw();
        return true;
    }

    /** Đặt ảnh ô có nắng và đoạn có nắng một lần (chỉ vẽ lại khi có đổi). Trả về true nếu có đổi. */
    setLit(frame: SpriteFrame | null, from: number, to: number): boolean {
        if (this._litFrame === frame && Math.abs(this._litFrom - from) < 0.5 && Math.abs(this._litTo - to) < 0.5) return false;
        this._litFrame = frame;
        this._litFrom = from;
        this._litTo = to;
        this.redraw();
        return true;
    }

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
            // Bản cũ lát bằng một Sprite TILED nằm ngay trên node Top, gỡ đi để thay bằng từng ô
            const old = top.getComponent(Sprite);
            if (old) old.destroy();
            top.setScale(1, 1, 1);
            top.setPosition(0, this._sink, 0);
            this.layTiles(top, frame, w);
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

    /** Xếp n ô đá chồng mép lên nhau, giãn ngang một chút để vừa khít bề dài w. */
    private layTiles(top: Node, frame: SpriteFrame, w: number) {
        const fw = frame.rect.width, fh = frame.rect.height;
        const s = this._tileHeight / fh;
        const tw = fw * s;
        const ov = Math.min(this._overlap * s, tw * 0.5);
        const n = Math.max(1, Math.round((w - ov) / (tw - ov)));
        const width = (w + (n - 1) * ov) / n; // bề ngang mỗi ô sau khi giãn
        const sx = width / fw;

        const tiles = top.children.slice();
        const lit = this._litFrame && this._litTo > this._litFrom ? this._litFrame : null;
        const pool = [frame, ...(this._variants ?? []).filter((f) => !!f)];
        for (let i = 0; i < n; i++) {
            let t = tiles[i];
            if (!t) {
                t = new Node('Tile');
                t.layer = this.node.layer;
                top.addChild(t);
            }
            // Ô có tâm nằm trong đoạn có nắng thì dùng ảnh có nắng (cùng khổ ảnh, giãn theo kích thước của chính nó)
            const x = i * (width - ov);
            const center = x + width / 2;
            const f = lit && center >= this._litFrom && center <= this._litTo ? lit : pool[i % pool.length];
            const ffw = f.rect.width, ffh = f.rect.height;
            const sp = t.getComponent(Sprite) ?? t.addComponent(Sprite);
            sp.spriteFrame = f;
            sp.type = Sprite.Type.SIMPLE;
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            const ui = t.getComponent(UITransform)!;
            ui.setAnchorPoint(0, 1);
            ui.setContentSize(ffw, ffh);
            t.setScale(width / ffw, this._tileHeight / ffh, 1);
            t.setPosition(x, 0, 0);
        }
        for (let i = n; i < tiles.length; i++) {
            tiles[i].removeFromParent();
            tiles[i].destroy();
        }
    }
}
