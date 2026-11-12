import { _decorator, CCString, Color, Component, Enum, Graphics, Label, Node, UITransform } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/** Loại hình vẽ tạm. Gốc node ở góc DƯỚI TRÁI của hình (Rope: điểm đầu dây). */
export enum PropKind {
    /** Mặt nhà: tường, cửa sổ, mái hiên trên đỉnh */
    House = 0,
    /** Bạt che sọc, mép dưới lượn sóng (mặt trên phẳng: làm bục đứng được) */
    Awning = 1,
    /** Tán cây: cụm hình tròn */
    Canopy = 2,
    /** Thân cây: cột nâu thuôn lên trên */
    Trunk = 3,
    /** Dây / cành treo: đoạn thẳng từ gốc node tới (Width, Height) */
    Rope = 4,
    /** Cột gỗ đứng */
    Pole = 5,
    /** Chậu cây */
    Pot = 6,
    /** Bảng quảng cáo trên khung sắt (khung cao Height2 bên dưới bảng) */
    Billboard = 7,
    /** Bảng hiệu dọc (chữ xếp dọc) */
    Sign = 8,
    /** Cục máy lạnh */
    AirCon = 9,
    /** Tổ chim */
    Nest = 10,
    /** Thanh gỗ chống: tấm ván từ gốc node tới (Width, Height), dày Height2 (0 = 22) */
    Beam = 11,
    /** Bồn nước inox nằm ngang trên giàn sắt (giàn cao Height2 bên dưới bồn) */
    WaterTank = 12,
    /** Ban công: lan can cao Height phía trên gốc node (gốc = mép trên bục, phía tường); Width âm = tường bên phải */
    Balcony = 13,
    /** Lòng kênh ngầm: các cột bê tông, vòm trên đỉnh, vệt nước bẩn ở độ cao Height2 */
    Culvert = 14,
    /** Bè thùng xốp: vài thùng trắng buộc dây */
    FoamRaft = 15,
}

const LINE = new Color(70, 44, 34, 255);

/**
 * Hình vẽ tạm bằng code cho map thử (không dùng ảnh): nhà, bạt che, tán cây, thân cây, dây treo, cột gỗ, chậu cây,
 * bảng quảng cáo, bảng hiệu dọc, máy lạnh, tổ chim, thanh chống gỗ, bồn nước, ban công. Màu phẳng, viền nâu đậm như nét art của game.
 * Chỉ là hình, không có va chạm (bục đứng được vẫn là MapBlock). Kéo node để dời, đổi Width / Height / màu trong Inspector.
 */
@ccclass('PropArt')
@executeInEditMode
export class PropArt extends Component {
    @property
    _kind = PropKind.House;

    @property
    _w = 300;

    @property
    _h = 300;

    @property
    _h2 = 0;

    @property
    _color = new Color(214, 170, 120, 255);

    @property
    _color2 = new Color(250, 240, 222, 255);

    @property
    _text = '';

    @property({ type: Enum(PropKind), tooltip: 'Loại hình' })
    get kind() { return this._kind; }
    set kind(v: PropKind) { this._kind = v; this.redraw(); }

    @property({ tooltip: 'Bề ngang (Rope: lệch ngang của đầu dây kia)' })
    get width() { return this._w; }
    set width(v: number) { this._w = v; this.redraw(); }

    @property({ tooltip: 'Chiều cao (Rope: lệch dọc của đầu dây kia)' })
    get height() { return this._h; }
    set height(v: number) { this._h = v; this.redraw(); }

    @property({ tooltip: 'Billboard, WaterTank: chiều cao khung sắt bên dưới. House: số tầng cửa sổ (0 = tự tính). Beam: độ dày ván' })
    get height2() { return this._h2; }
    set height2(v: number) { this._h2 = v; this.redraw(); }

    @property({ tooltip: 'Màu chính' })
    get color() { return this._color; }
    set color(v: Color) { this._color = v.clone(); this.redraw(); }

    @property({ tooltip: 'Màu phụ (sọc bạt, cửa sổ, mặt bảng...)' })
    get color2() { return this._color2; }
    set color2(v: Color) { this._color2 = v.clone(); this.redraw(); }

    @property({ type: CCString, tooltip: 'Chữ (bảng quảng cáo, bảng hiệu)' })
    get text() { return this._text; }
    set text(v: string) { this._text = v; this.redraw(); }

    setup(kind: PropKind, w: number, h: number, color: Color, color2?: Color, text = '', h2 = 0) {
        this._kind = kind;
        this._w = w;
        this._h = h;
        this._h2 = h2;
        this._color = color.clone();
        if (color2) this._color2 = color2.clone();
        this._text = text;
        this.redraw();
    }

    onLoad() {
        this.redraw();
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        const ut = this.getComponent(UITransform) ?? this.addComponent(UITransform);
        ut.setAnchorPoint(0, 0);
        ut.setContentSize(Math.abs(this._w), Math.abs(this._h));
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.lineJoin = Graphics.LineJoin.ROUND;
        g.lineCap = Graphics.LineCap.ROUND;
        g.strokeColor = LINE;
        g.lineWidth = 6;
        let label = '';
        switch (this._kind) {
            case PropKind.House: this.house(g); break;
            case PropKind.Awning: this.awning(g); break;
            case PropKind.Canopy: this.canopy(g); break;
            case PropKind.Trunk: this.trunk(g); break;
            case PropKind.Rope: this.rope(g); break;
            case PropKind.Pole: this.pole(g); break;
            case PropKind.Pot: this.pot(g); break;
            case PropKind.Billboard: label = this.billboard(g); break;
            case PropKind.Sign: label = this.sign(g); break;
            case PropKind.AirCon: this.aircon(g); break;
            case PropKind.Nest: this.nest(g); break;
            case PropKind.Beam: this.beam(g); break;
            case PropKind.WaterTank: this.waterTank(g); break;
            case PropKind.Balcony: this.balcony(g); break;
            case PropKind.Culvert: label = this.culvert(g); break;
            case PropKind.FoamRaft: this.foamRaft(g); break;
        }
        this.setLabel(label);
    }

    private dark(c: Color, k = 0.75): Color {
        return new Color(Math.round(c.r * k), Math.round(c.g * k), Math.round(c.b * k), 255);
    }

    private house(g: Graphics) {
        const w = this._w, h = this._h;
        g.fillColor = this._color;
        g.rect(0, 0, w, h);
        g.fill();
        g.stroke();
        // Gờ mái trên đỉnh
        g.fillColor = this.dark(this._color, 0.6);
        g.rect(-16, h - 24, w + 32, 30);
        g.fill();
        g.stroke();
        // Cửa sổ theo tầng
        const floors = this._h2 > 0 ? Math.round(this._h2) : Math.max(1, Math.floor((h - 60) / 220));
        const cols = Math.max(1, Math.floor(w / 170));
        const cw = 90, ch = 110, gapX = (w - cols * cw) / (cols + 1), floorH = (h - 40) / floors;
        for (let f = 0; f < floors; f++) {
            for (let c = 0; c < cols; c++) {
                const x = gapX + c * (cw + gapX), y = f * floorH + (floorH - ch) / 2 + 20;
                g.fillColor = this._color2;
                g.rect(x, y, cw, ch);
                g.fill();
                g.stroke();
                g.moveTo(x + cw / 2, y);
                g.lineTo(x + cw / 2, y + ch);
                g.moveTo(x, y + ch / 2);
                g.lineTo(x + cw, y + ch / 2);
                g.stroke();
            }
        }
    }

    private awning(g: Graphics) {
        // Mặt trên phẳng ở y = h (đứng được), thân bạt dốc xuống phía ngoài, mép dưới lượn sóng
        const w = this._w, h = this._h, stripe = 56;
        const sag = h * 0.65;
        for (let x = 0, i = 0; x < w; x += stripe, i++) {
            const x1 = Math.min(w, x + stripe);
            g.fillColor = i % 2 ? this._color2 : this._color;
            g.moveTo(x, h);
            g.lineTo(x1, h);
            g.lineTo(x1, h - sag);
            g.lineTo(x, h - sag);
            g.close();
            g.fill();
            // Diềm lượn sóng
            g.moveTo(x, h - sag);
            g.bezierCurveTo(x, h - sag - 36, x1, h - sag - 36, x1, h - sag);
            g.close();
            g.fill();
        }
        g.moveTo(0, h);
        g.lineTo(w, h);
        g.lineTo(w, h - sag);
        for (let x = w; x > 0; x -= stripe) {
            const x0 = Math.max(0, x - stripe);
            g.bezierCurveTo(x, h - sag - 36, x0, h - sag - 36, x0, h - sag);
        }
        g.lineTo(0, h);
        g.stroke();
        // Hai thanh sắt chống bạt
        g.lineWidth = 8;
        g.moveTo(10, h - sag);
        g.lineTo(10, 0);
        g.moveTo(w - 10, h - sag);
        g.lineTo(w - 10, 0);
        g.stroke();
    }

    private canopy(g: Graphics) {
        const w = this._w, h = this._h;
        const blobs: [number, number, number][] = [
            [0.18, 0.4, 0.3], [0.4, 0.6, 0.36], [0.62, 0.55, 0.34], [0.82, 0.38, 0.28], [0.5, 0.3, 0.32], [0.3, 0.75, 0.22], [0.7, 0.78, 0.22],
        ];
        const r = Math.min(w, h * 1.6);
        g.fillColor = this.dark(this._color, 0.8);
        for (const [fx, fy, fr] of blobs) {
            g.circle(fx * w, fy * h - 10, fr * r * 0.5);
        }
        g.fill();
        // Viền: vẽ nét từng vòng trước, rồi tô màu chính đè lên nên chỉ còn viền ngoài cả cụm (không lộ vòng tròn chồng nhau)
        for (const [fx, fy, fr] of blobs) {
            g.circle(fx * w, fy * h, fr * r * 0.5);
        }
        g.stroke();
        g.fillColor = this._color;
        for (const [fx, fy, fr] of blobs) {
            g.circle(fx * w, fy * h, fr * r * 0.5 - 3);
        }
        g.fill();
        // Đốm sáng
        g.fillColor = this._color2;
        for (const [fx, fy, fr] of blobs.slice(0, 4)) g.circle(fx * w - fr * r * 0.15, fy * h + fr * r * 0.18, fr * r * 0.12);
        g.fill();
    }

    private trunk(g: Graphics) {
        const w = this._w, h = this._h;
        g.fillColor = this._color;
        g.moveTo(0, 0);
        g.lineTo(w, 0);
        g.lineTo(w * 0.8, h);
        g.lineTo(w * 0.2, h);
        g.close();
        g.fill();
        g.stroke();
        g.lineWidth = 4;
        for (let y = 80; y < h - 40; y += 140) {
            g.moveTo(w * 0.35, y);
            g.lineTo(w * 0.5, y + 50);
        }
        g.stroke();
    }

    private rope(g: Graphics) {
        g.strokeColor = this._color;
        g.lineWidth = 10;
        g.moveTo(0, 0);
        g.lineTo(this._w, this._h);
        g.stroke();
        g.strokeColor = LINE;
        g.lineWidth = 3;
        g.moveTo(0, 0);
        g.lineTo(this._w, this._h);
        g.stroke();
    }

    private pole(g: Graphics) {
        const w = this._w, h = this._h;
        g.fillColor = this._color;
        g.rect(0, 0, w, h);
        g.fill();
        g.stroke();
        g.lineWidth = 3;
        for (let y = 60; y < h; y += 90) {
            g.moveTo(4, y);
            g.lineTo(w - 4, y - 14);
        }
        g.stroke();
    }

    private pot(g: Graphics) {
        const w = this._w, h = this._h, potH = h * 0.4;
        g.fillColor = this._color2;
        for (const [fx, fy, fr] of [[0.3, 0.7, 0.3], [0.55, 0.85, 0.32], [0.75, 0.65, 0.26], [0.5, 0.55, 0.3]]) g.circle(fx * w, fy * h, fr * w);
        g.fill();
        g.stroke();
        g.fillColor = this._color;
        g.moveTo(0, potH);
        g.lineTo(w, potH);
        g.lineTo(w * 0.82, 0);
        g.lineTo(w * 0.18, 0);
        g.close();
        g.fill();
        g.stroke();
    }

    /** Khung sắt chân chữ X từ y 0 xuống -legH (dưới bảng quảng cáo, bồn nước) */
    private steelLegs(g: Graphics, w: number, legH: number) {
        if (legH <= 0) return;
        g.strokeColor = new Color(70, 70, 76, 255);
        g.lineWidth = 12;
        for (const x of [w * 0.2, w * 0.8]) {
            g.moveTo(x, 0);
            g.lineTo(x, -legH);
        }
        g.moveTo(w * 0.2, -legH * 0.15);
        g.lineTo(w * 0.8, -legH * 0.85);
        g.moveTo(w * 0.8, -legH * 0.15);
        g.lineTo(w * 0.2, -legH * 0.85);
        g.stroke();
        g.strokeColor = LINE;
        g.lineWidth = 6;
    }

    private beam(g: Graphics) {
        const t = this._h2 > 0 ? this._h2 : 22;
        g.lineCap = Graphics.LineCap.BUTT;
        g.lineWidth = t + 8;
        g.moveTo(0, 0);
        g.lineTo(this._w, this._h);
        g.stroke();
        g.strokeColor = this._color;
        g.lineWidth = t;
        g.moveTo(0, 0);
        g.lineTo(this._w, this._h);
        g.stroke();
        // Chốt gỗ hai đầu
        g.fillColor = LINE;
        const len = Math.hypot(this._w, this._h) || 1, ux = this._w / len, uy = this._h / len;
        for (const d of [t * 0.9, len - t * 0.9]) g.circle(ux * d, uy * d, t * 0.18);
        g.fill();
    }

    private waterTank(g: Graphics) {
        const w = this._w, h = this._h;
        this.steelLegs(g, w, this._h2);
        // Ống nước từ đáy bồn xuống mái
        if (this._h2 > 0) {
            g.strokeColor = new Color(120, 126, 134, 255);
            g.lineWidth = 10;
            g.moveTo(w * 0.1, h * 0.2);
            g.lineTo(w * 0.1, -this._h2);
            g.stroke();
            g.strokeColor = LINE;
            g.lineWidth = 6;
        }
        g.fillColor = this._color;
        g.roundRect(0, 0, w, h, h * 0.45);
        g.fill();
        g.stroke();
        // Vệt sáng inox và hai đai bồn
        g.fillColor = this._color2;
        g.roundRect(w * 0.12, h * 0.62, w * 0.76, h * 0.12, h * 0.06);
        g.fill();
        g.lineWidth = 4;
        for (const fx of [0.3, 0.7]) {
            g.moveTo(w * fx, 4);
            g.lineTo(w * fx, h - 4);
        }
        g.stroke();
    }

    private balcony(g: Graphics) {
        // Gốc node = mép trên bục, sát tường. Width âm: tường ở bên phải, ban công chìa sang trái.
        const s = this._w < 0 ? -1 : 1, w = Math.abs(this._w), h = this._h, X = (x: number) => x * s;
        // Hai thanh chống tam giác dưới sàn
        g.fillColor = this.dark(this._color, 0.7);
        g.moveTo(0, -30);
        g.lineTo(X(w * 0.45), -30);
        g.lineTo(0, -120);
        g.close();
        g.fill();
        g.stroke();
        // Lan can sắt: tay vịn trên + song chắn
        g.strokeColor = this._color;
        g.lineWidth = 8;
        g.moveTo(0, h);
        g.lineTo(X(w), h);
        for (let x = 0; x <= w + 1; x += Math.max(30, w / Math.round(w / 40))) {
            g.moveTo(X(x), 0);
            g.lineTo(X(x), h);
        }
        g.stroke();
        g.strokeColor = LINE;
        g.lineWidth = 3;
        g.moveTo(0, h + 4);
        g.lineTo(X(w), h + 4);
        g.stroke();
    }

    private culvert(g: Graphics): string {
        const w = this._w, h = this._h, step = 320, pw = 46, archH = 110;
        // Vệt nước bẩn ngang tường
        if (this._h2 > 0) {
            g.fillColor = this._color2;
            g.rect(0, this._h2, w, 40);
            g.fill();
        }
        // Cột bê tông + vòm nối đỉnh hai cột
        g.fillColor = this._color;
        g.lineWidth = 5;
        for (let x = 0; x <= w; x += step) {
            g.rect(x - pw / 2, 0, pw, h);
            g.fill();
            g.stroke();
            if (x + step <= w + 1) {
                g.moveTo(x + pw / 2, h - archH);
                g.bezierCurveTo(x + pw / 2, h - 10, x + step - pw / 2, h - 10, x + step - pw / 2, h - archH);
                g.lineTo(x + step - pw / 2, h);
                g.lineTo(x + pw / 2, h);
                g.close();
                g.fill();
                g.stroke();
            }
        }
        return this._text;
    }

    private foamRaft(g: Graphics) {
        const w = this._w, h = this._h, n = Math.max(2, Math.round(w / 70)), bw = w / n;
        for (let i = 0; i < n; i++) {
            g.fillColor = this._color;
            g.rect(i * bw + 2, 0, bw - 4, h);
            g.fill();
            g.stroke();
            // Nắp thùng
            g.fillColor = this.dark(this._color, 0.88);
            g.rect(i * bw + 2, h - 12, bw - 4, 12);
            g.fill();
            g.stroke();
        }
        // Dây buộc ngang
        g.strokeColor = this._color2;
        g.lineWidth = 6;
        g.moveTo(0, h * 0.45);
        g.lineTo(w, h * 0.45);
        g.stroke();
    }

    private billboard(g: Graphics): string {
        const w = this._w, h = this._h;
        this.steelLegs(g, w, this._h2);
        g.fillColor = this._color;
        g.rect(0, 0, w, h);
        g.fill();
        g.stroke();
        g.fillColor = this._color2;
        g.rect(16, 16, w - 32, h - 32);
        g.fill();
        g.stroke();
        return this._text;
    }

    private sign(g: Graphics): string {
        const w = this._w, h = this._h;
        g.fillColor = this._color;
        g.rect(0, 0, w, h);
        g.fill();
        g.stroke();
        g.fillColor = this._color2;
        g.rect(10, 10, w - 20, h - 20);
        g.fill();
        return this._text.split('').join('\n');
    }

    private aircon(g: Graphics) {
        const w = this._w, h = this._h;
        g.fillColor = this._color;
        g.rect(0, 0, w, h);
        g.fill();
        g.stroke();
        g.fillColor = this.dark(this._color, 0.7);
        g.circle(w * 0.35, h / 2, h * 0.32);
        g.fill();
        g.stroke();
        g.lineWidth = 3;
        for (let y = h * 0.25; y < h * 0.8; y += h * 0.15) {
            g.moveTo(w * 0.65, y);
            g.lineTo(w * 0.9, y);
        }
        g.stroke();
    }

    private nest(g: Graphics) {
        const w = this._w, h = this._h;
        g.fillColor = this._color;
        g.ellipse(w / 2, h / 2, w / 2, h / 2);
        g.fill();
        g.stroke();
        g.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
            const x = (i + 0.5) * w / 7;
            g.moveTo(x - 30, h * 0.3);
            g.lineTo(x + 30, h * 0.75);
        }
        g.stroke();
        g.fillColor = this._color2;
        for (const x of [0.38, 0.5, 0.62]) g.ellipse(x * w, h * 0.85, w * 0.06, h * 0.12);
        g.fill();
        g.stroke();
    }

    private setLabel(text: string) {
        let t = this.node.getChildByName('Label');
        if (!text) {
            t?.destroy();
            return;
        }
        if (!t) {
            t = new Node('Label');
            t.layer = this.node.layer;
            this.node.addChild(t);
        }
        t.setPosition(this._w / 2, this._h / 2, 0);
        const label = t.getComponent(Label) ?? t.addComponent(Label);
        const vertical = this._kind === PropKind.Sign;
        label.string = text;
        label.fontSize = vertical ? 44 : Math.min(56, Math.max(26, this._h * 0.3));
        label.lineHeight = vertical ? 50 : label.fontSize + 6;
        label.isBold = true;
        // Nền tối (kênh ngầm) thì chữ sáng cho dễ đọc
        label.color = this._kind === PropKind.Culvert ? new Color(236, 232, 214, 255) : LINE;
    }
}
