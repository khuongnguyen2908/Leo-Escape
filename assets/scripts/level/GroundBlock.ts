import { _decorator, CCObject, Color, Component, Graphics, Node, Rect, Size, Sprite, SpriteFrame, UITransform, Vec2 } from 'cc';
import { Solid } from '../core/Solid';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

const LIP = new Color(176, 168, 156, 255);
/** Ô đá do code dựng lại mỗi lần mở: không ghi vào scene, không hiện trong Hierarchy */
const GENERATED = CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;

/** Ảnh cắt từ ảnh ô đá (bỏ viền trái/phải, hoặc lấy dải đáy), nhớ lại để khỏi tạo lại */
const cropCache = new WeakMap<SpriteFrame, Map<string, SpriteFrame>>();
function crop(f: SpriteFrame, left: number, right: number, top = 0, height = 0): SpriteFrame {
    if (f.rotated || (!left && !right && !top && !height)) return f;
    let m = cropCache.get(f);
    if (!m) cropCache.set(f, (m = new Map()));
    const key = `${left}|${right}|${top}|${height}`;
    let sf = m.get(key);
    if (!sf) {
        const r = f.rect;
        const w = Math.max(1, r.width - left - right);
        const h = height || r.height - top;
        sf = new SpriteFrame();
        sf.reset({ texture: f.texture, rect: new Rect(r.x + left, r.y + top, w, h), originalSize: new Size(w, h), offset: new Vec2(0, 0) });
        m.set(key, sf);
    }
    return sf;
}

/** Số ngẫu nhiên có hạt giống: cùng hạt giống thì lần nào mở cũng xếp y hệt */
function rng(seed: number) {
    let s = (seed >>> 0) || 1;
    return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
}

function hash(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
}

/**
 * Khối nền đá: lát ảnh ô đá (MG_tile) thành hàng, kèm Solid. Không vẽ màu nền bên dưới.
 * Các ô lấy ngẫu nhiên từ Tile Frame + Variants, hai ô liền nhau không trùng ảnh (ô Seed đổi cách xếp).
 * Viền tối hai bên ô đá chỉ giữ ở hai đầu khối; chỗ hai ô giáp nhau thì cắt bỏ viền (ô Edge Cut) và chồng nhẹ (ô Overlap),
 * rồi giãn cả hàng cho vừa khít bề dài khối.
 * Ô Extend: kéo dài phần đá tối ở đáy ô xuống thêm (cho khối thấp khỏi hở đáy màn hình lúc rung).
 * Ô đá do code dựng lại mỗi lần mở scene / chạy game, không lưu vào scene.
 * Manual (xếp tay): code không dựng ô đá nữa; các ô là node con thật (Tile_1, Tile_2... do ⚙ tạo sẵn bằng bake()),
 * bạn tự kéo, đổi ảnh, xoá, Ctrl+D. Khung va chạm vẫn theo Width / Depth.
 * Gốc node là góc trên-trái mặt đất. Kéo node để đổi chỗ / độ cao, đổi Width để dài ngắn.
 * Ô có nắng (cũ): ô nào có tâm nằm trong đoạn Lit From → Lit To thì dùng Lit Frame.
 * Góc ngoài: đầu khối lộ ra ngoài (Cap Left / Cap Right) giữ nguyên viền ngoài. Đầu phải dùng End Frames (mép PHẢI nét liền,
 * như MG_tile_3); đầu trái dùng Left End Frame (mép TRÁI nét liền, như MG_tile_4), để trống thì lấy ảnh góc phải lật ngang (Flip Left Cap).
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

    @property
    _edgeCut = 16;

    @property
    _extend = 0;

    @property
    _seed = 0;

    @property
    _bleedLeft = 0;

    @property
    _bleedRight = 0;

    @property({ type: [SpriteFrame] })
    _endFrames: SpriteFrame[] = [];

    @property
    _capLeft = false;

    @property
    _capRight = false;

    @property
    _flipLeftCap = true;

    @property({ type: SpriteFrame })
    _leftEndFrame: SpriteFrame | null = null;

    @property
    _manual = false;

    /** Cách bake() đã dùng: 2 = ô đầu / cuối khớp đúng hai mép khối. Bản cũ (0) có thể thò ra hoặc hụt so với mép khối. */
    @property
    _bakeVersion = 0;

    @property({ tooltip: 'Xếp tay: code không tự xếp ô đá nữa, các ô là node con thật (Tile_...) để bạn tự kéo, đổi ảnh, xoá, Ctrl+D. Khung va chạm vẫn theo Width / Depth' })
    get manual() { return this._manual; }
    set manual(v: boolean) { this._manual = v; this.redraw(); }

    /** Nút ⚙ đã đặt ảnh cho khối này chưa (đặt rồi thì ⚙ để yên phần bạn chỉnh). Đổi về 0 để ⚙ đặt lại. */
    @property({ tooltip: 'Nút ⚙ đã tự đặt ảnh cho khối này (2). Đặt về 0 thì lần bấm ⚙ sau sẽ đặt lại ảnh, Sink, góc như mặc định' })
    autoTiled = 0;

    @property({ tooltip: 'Chiều dài khối' })
    get width() { return this._width; }
    set width(v: number) { this._width = Math.max(10, v); this.redraw(); }

    @property({ tooltip: 'Khung va chạm kéo xuống bao sâu' })
    get depth() { return this._depth; }
    set depth(v: number) { this._depth = Math.max(10, v); this.redraw(); }

    @property({ type: SpriteFrame, tooltip: 'Ảnh ô đá chính (MG_tile_1, MG_tile_high_1)' })
    get tileFrame() { return this._tileFrame; }
    set tileFrame(v: SpriteFrame | null) { this._tileFrame = v; this.redraw(); }

    @property({ tooltip: 'Chiều cao hiển thị của ô đá' })
    get tileHeight() { return this._tileHeight; }
    set tileHeight(v: number) { this._tileHeight = Math.max(1, v); this.redraw(); }

    @property({ tooltip: 'Mép đá nhô cao hơn mặt va chạm bao nhiêu (cho chân "lún" vào)' })
    get sink() { return this._sink; }
    set sink(v: number) { this._sink = v; this.redraw(); }

    @property({ tooltip: 'Hai ô đá cạnh nhau chồng lên nhau bao nhiêu (px trên ảnh gốc)' })
    get overlap() { return this._overlap; }
    set overlap(v: number) { this._overlap = Math.max(0, v); this.redraw(); }

    @property({ type: SpriteFrame, tooltip: 'Ảnh ô đá có nắng, dùng cho các ô nằm trong đoạn Lit From → Lit To (để trống = không dùng)' })
    get litFrame() { return this._litFrame; }
    set litFrame(v: SpriteFrame | null) { this._litFrame = v; this.redraw(); }

    @property({ tooltip: 'Đoạn có nắng: bắt đầu (tính từ mép trái khối). Lit From = Lit To thì không ô nào có nắng' })
    get litFrom() { return this._litFrom; }
    set litFrom(v: number) { this._litFrom = v; this.redraw(); }

    @property({ tooltip: 'Đoạn có nắng: kết thúc (tính từ mép trái khối)' })
    get litTo() { return this._litTo; }
    set litTo(v: number) { this._litTo = v; this.redraw(); }

    @property({ type: [SpriteFrame], tooltip: 'Các ảnh ô đá khác, xếp ngẫu nhiên cùng Tile Frame (hai ô liền nhau không trùng ảnh)' })
    get variants() { return this._variants; }
    set variants(v: SpriteFrame[]) { this._variants = v ?? []; this.redraw(); }

    @property({ tooltip: 'Cắt bỏ bao nhiêu px viền tối ở chỗ hai ô giáp nhau (px trên ảnh gốc). Còn thấy vạch tối giữa hai ô thì tăng lên' })
    get edgeCut() { return this._edgeCut; }
    set edgeCut(v: number) { this._edgeCut = Math.max(0, v); this.redraw(); }

    @property({ tooltip: 'Kéo dài phần đá tối ở đáy ô xuống thêm bao nhiêu (0 = không)' })
    get extend() { return this._extend; }
    set extend(v: number) { this._extend = Math.max(0, v); this.redraw(); }

    @property({ tooltip: 'Đổi số này để xếp ngẫu nhiên kiểu khác (0 = theo node)' })
    get seed() { return this._seed; }
    set seed(v: number) { this._seed = Math.round(v); this.redraw(); }

    @property({ tooltip: 'Hình ô đá lấn sang trái bao nhiêu (chỉ hình, khung va chạm giữ nguyên). Dùng để đè lên mép khối cao bên cạnh' })
    get bleedLeft() { return this._bleedLeft; }
    set bleedLeft(v: number) { this._bleedLeft = Math.max(0, v); this.redraw(); }

    @property({ tooltip: 'Hình ô đá lấn sang phải bao nhiêu (chỉ hình, khung va chạm giữ nguyên)' })
    get bleedRight() { return this._bleedRight; }
    set bleedRight(v: number) { this._bleedRight = Math.max(0, v); this.redraw(); }

    @property({ type: SpriteFrame, tooltip: 'Ảnh góc TRÁI (mép trái nét liền, như MG_tile_4) cho đầu trái lộ ra. Để trống thì lấy ảnh góc phải lật ngang' })
    get leftEndFrame() { return this._leftEndFrame; }
    set leftEndFrame(v: SpriteFrame | null) { this._leftEndFrame = v; this.redraw(); }

    @property({ type: [SpriteFrame], tooltip: 'Ảnh góc PHẢI (mép phải nét liền, như MG_tile_3) cho đầu phải lộ ra; nhiều ảnh thì chọn ngẫu nhiên' })
    get endFrames() { return this._endFrames; }
    set endFrames(v: SpriteFrame[]) { this._endFrames = v ?? []; this.redraw(); }

    @property({ tooltip: 'Đầu TRÁI khối lộ ra ngoài: dùng ảnh góc ngoài' })
    get capLeft() { return this._capLeft; }
    set capLeft(v: boolean) { this._capLeft = v; this.redraw(); }

    @property({ tooltip: 'Đầu PHẢI khối lộ ra ngoài: dùng ảnh góc ngoài' })
    get capRight() { return this._capRight; }
    set capRight(v: boolean) { this._capRight = v; this.redraw(); }

    @property({ tooltip: 'Lật ngang ảnh góc ở đầu trái (để mép nét liền quay ra ngoài). Bỏ tích nếu bạn vẽ ảnh góc trái riêng' })
    get flipLeftCap() { return this._flipLeftCap; }
    set flipLeftCap(v: boolean) { this._flipLeftCap = v; this.redraw(); }

    /** Đặt ảnh góc và hai đầu lộ ra (chỉ vẽ lại khi có đổi). Trả về true nếu có đổi. */
    setCaps(ends: SpriteFrame[], left: boolean, right: boolean, leftEnd: SpriteFrame | null = null): boolean {
        const cur = this._endFrames ?? [];
        const same = cur.length === ends.length && cur.every((f, i) => f === ends[i]);
        if (same && this._capLeft === left && this._capRight === right && this._leftEndFrame === leftEnd) return false;
        this._endFrames = ends.slice();
        this._leftEndFrame = leftEnd;
        this._capLeft = left;
        this._capRight = right;
        this.redraw();
        return true;
    }

    /** Đặt độ lấn hai bên (chỉ vẽ lại khi có đổi). Trả về true nếu có đổi. */
    setBleed(left: number, right: number): boolean {
        if (Math.abs(this._bleedLeft - left) < 0.5 && Math.abs(this._bleedRight - right) < 0.5) return false;
        this._bleedLeft = left;
        this._bleedRight = right;
        this.redraw();
        return true;
    }

    /** Đặt danh sách ảnh xếp ngẫu nhiên (chỉ vẽ lại khi có đổi). Trả về true nếu có đổi. */
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
        if (!g || !this.node || !this.node.isValid) return;
        const w = this._width, d = this._depth;
        g.clear();

        // Bản cũ lưu ô đá vào scene (node Top thường): bỏ đi, dựng lại bằng node không lưu
        let top = this.node.getChildByName('Top');
        if (top && !(top.hideFlags & CCObject.Flags.DontSave)) {
            top.removeFromParent();
            top.destroy();
            top = null;
        }
        const frame = this._tileFrame;
        if (this._manual) {
            // Xếp tay: bỏ ô do code dựng, để yên các ô con của bạn
            if (top) {
                top.removeFromParent();
                top.destroy();
            }
        } else if (frame) {
            if (!top) {
                top = new Node('Top');
                top.layer = this.node.layer;
                top.hideFlags |= GENERATED;
                this.node.addChild(top);
            }
            top.setScale(1, 1, 1);
            // Hình lấn sang hai bên (Bleed): hàng ô đá rộng thêm, dời sang trái; khung va chạm không đổi
            top.setPosition(-this._bleedLeft, this._sink, 0);
            this.layTiles(top, frame, w + this._bleedLeft + this._bleedRight);
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

    /**
     * Chuyển sang xếp tay: tạo các ô đá thành node con thật Tile_1, Tile_2... (lưu trong scene), cùng ảnh và thứ tự ngẫu nhiên
     * như lúc tự xếp (góc trái / phải ở đầu lộ ra), nhưng ảnh nguyên, cỡ gốc (theo Tile Height), không cắt viền, không giãn;
     * hai ô cạnh nhau chồng nhau Overlap. Ô sau nằm trên ô trước. Xong thì bật Manual. Trả về số ô đã tạo.
     */
    bake(): number {
        const frame = this._tileFrame;
        if (!frame || this._manual) return 0;
        const th = this._tileHeight;
        const pool = [frame, ...(this._variants ?? []).filter((f) => !!f)];
        const scaleOf = (f: SpriteFrame) => th / f.rect.height;
        const ov = this._overlap * scaleOf(frame);
        const total = this._width + this._bleedLeft + this._bleedRight;
        const avg = pool.reduce((a, f) => a + f.rect.width * scaleOf(f), 0) / pool.length;
        // Đủ ô để phủ hết khối (ô giữ nguyên cỡ, không giãn), phần thừa chia đều vào chỗ chồng giữa các ô
        const n = Math.max(1, Math.ceil((total - ov) / Math.max(1, avg - ov)));
        const frames = this.pickFrames(n, pool);
        const flips = frames.map(() => false);
        const ends = (this._endFrames ?? []).filter((f) => !!f);
        if (ends.length || this._leftEndFrame) {
            const rand = rng(((this._seed || hash(this.node.uuid)) ^ 0x9e3779b9) >>> 0);
            const pickEnd = () => ends[Math.floor(rand() * ends.length) % ends.length];
            if (this._capRight && ends.length) frames[n - 1] = pickEnd();
            if (this._capLeft && (n > 1 || !this._capRight)) {
                if (this._leftEndFrame) frames[0] = this._leftEndFrame;
                else if (ends.length) {
                    frames[0] = pickEnd();
                    flips[0] = this._flipLeftCap;
                }
            }
        }
        const sum = frames.reduce((a, f) => a + f.rect.width * scaleOf(f), 0);
        const step = n > 1 ? Math.max(0, (sum - total) / (n - 1)) : 0; // mỗi chỗ giáp chồng bao nhiêu để ô cuối khớp mép phải
        let x = -this._bleedLeft;
        frames.forEach((f, i) => {
            const s = scaleOf(f);
            const ww = f.rect.width * s;
            const t = new Node(`Tile_${i + 1}`);
            t.layer = this.node.layer;
            this.node.addChild(t);
            const sp = t.addComponent(Sprite);
            sp.spriteFrame = f;
            sp.sizeMode = Sprite.SizeMode.TRIMMED;
            t.getComponent(UITransform)!.setAnchorPoint(0, 1);
            t.setPosition(flips[i] ? x + ww : x, this._sink, 0);
            t.setScale(flips[i] ? -s : s, s, 1);
            x += ww - step;
        });
        this._manual = true;
        this._bakeVersion = 2;
        this.redraw();
        return n;
    }

    /**
     * Khối đã bake bằng bản cũ (ô có thể thò ra / hụt khỏi mép khối): xoá các ô Tile_số, tắt Manual rồi bake lại.
     * Chỉ dùng khi chắc chắn chưa ai chỉnh tay các ô đó. Trả về số ô mới.
     */
    rebakeOld(): number {
        if (!this._manual || this._bakeVersion >= 2) return 0;
        for (const c of this.node.children.slice()) {
            if (/^Tile_\d+$/.test(c.name)) {
                c.removeFromParent();
                c.destroy();
            }
        }
        this._manual = false;
        return this.bake();
    }

    /** Chọn ảnh cho n ô: ngẫu nhiên theo hạt giống, hai ô liền nhau không trùng. */
    private pickFrames(n: number, pool: SpriteFrame[]): SpriteFrame[] {
        const rand = rng(this._seed || hash(this.node.uuid));
        const out: SpriteFrame[] = [];
        for (let i = 0; i < n; i++) {
            const choices = pool.length > 1 ? pool.filter((f) => f !== out[i - 1]) : pool;
            out.push(choices[Math.floor(rand() * choices.length) % choices.length]);
        }
        return out;
    }

    /** Xếp n ô đá: cắt viền chỗ giáp nhau, chồng nhẹ, giãn ngang cho vừa khít bề dài w. */
    private layTiles(top: Node, frame: SpriteFrame, w: number) {
        const th = this._tileHeight;
        const pool = [frame, ...(this._variants ?? []).filter((f) => !!f)];
        const cut = this._edgeCut;
        const scaleOf = (f: SpriteFrame) => th / f.rect.height;
        const avg = pool.reduce((a, f) => a + (f.rect.width - 2 * cut) * scaleOf(f), 0) / pool.length;
        const ov = this._overlap * scaleOf(frame);
        const n = Math.max(1, Math.round((w - 2 * cut * scaleOf(frame) - ov) / Math.max(1, avg - ov)));

        const frames = this.pickFrames(n, pool);
        const cuts: number[][] = frames.map((_, i) => [i > 0 ? cut : 0, i < n - 1 ? cut : 0]);
        const natural = () => frames.map((f, i) => (f.rect.width - cuts[i][0] - cuts[i][1]) * scaleOf(f));
        let widths = natural();
        // Ô có nắng (nếu còn dùng): ô có tâm trong đoạn Lit From → Lit To thì đổi sang Lit Frame
        const lit = this._litFrame && this._litTo > this._litFrom ? this._litFrame : null;
        if (lit) {
            let x = 0;
            const k0 = w / Math.max(1, widths.reduce((a, b) => a + b, 0) - (n - 1) * ov);
            widths.forEach((ww, i) => {
                const center = x + (ww * k0) / 2 - this._bleedLeft;
                if (center >= this._litFrom && center <= this._litTo) frames[i] = lit;
                x += (ww - ov) * k0;
            });
            widths = natural();
        }
        // Góc ngoài: đầu lộ ra dùng ảnh góc (mép phải nét liền); đầu trái lật ngang. Ô góc giữ nguyên viền ngoài
        const ends = (this._endFrames ?? []).filter((f) => !!f);
        const flips = frames.map(() => false);
        if (ends.length || this._leftEndFrame) {
            const rand = rng(((this._seed || hash(this.node.uuid)) ^ 0x9e3779b9) >>> 0);
            const pickEnd = () => ends[Math.floor(rand() * ends.length) % ends.length];
            if (this._capRight && ends.length) frames[n - 1] = pickEnd();
            if (this._capLeft && (n > 1 || !this._capRight)) {
                if (this._leftEndFrame) frames[0] = this._leftEndFrame;
                else if (ends.length) {
                    frames[0] = pickEnd();
                    flips[0] = this._flipLeftCap;
                }
            }
            // Ô lật ngang: cạnh cắt (phía trong) nằm ở mép trái của ảnh gốc
            flips.forEach((f, i) => { if (f) cuts[i] = [cuts[i][1], cuts[i][0]]; });
            widths = natural();
        }
        const k = w / Math.max(1, widths.reduce((a, b) => a + b, 0) - (n - 1) * ov);

        const old = top.children.slice();
        old.forEach((c) => { c.removeFromParent(); c.destroy(); });
        let x = 0;
        frames.forEach((f, i) => {
            const piece = crop(f, cuts[i][0], cuts[i][1]);
            const ww = widths[i] * k;
            this.addSprite(top, piece, x, 0, ww, th, flips[i]);
            // Kéo dài đáy: lấy dải đá tối gần đáy ảnh (bỏ 6 px sát mép) kéo xuống thêm Extend
            if (this._extend > 0) {
                const strip = crop(f, cuts[i][0], cuts[i][1], Math.max(0, f.rect.height - 30), 24);
                this.addSprite(top, strip, x, -th + 4, ww, this._extend + 4, flips[i]);
            }
            x += ww - ov * k;
        });
    }

    private addSprite(parent: Node, f: SpriteFrame, x: number, y: number, w: number, h: number, flip = false) {
        const t = new Node('Tile');
        t.layer = this.node.layer;
        t.hideFlags |= GENERATED;
        parent.addChild(t);
        const sp = t.addComponent(Sprite);
        sp.spriteFrame = f;
        sp.type = Sprite.Type.SIMPLE;
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        const ui = t.getComponent(UITransform)!;
        ui.setAnchorPoint(0, 1);
        ui.setContentSize(w, h);
        // Lật ngang: đặt gốc ở mép phải, lật scale x để hình phủ đúng đoạn x → x + w
        t.setPosition(flip ? x + w : x, y, 0);
        if (flip) t.setScale(-1, 1, 1);
    }
}
