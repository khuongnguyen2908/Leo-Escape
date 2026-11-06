import { _decorator, Color, Component, Enum, Graphics, Size, Vec2 } from 'cc';
import { Solid } from '../core/Solid';
const { ccclass, property, executeInEditMode } = _decorator;

enum BlockKind { Box, Pillar, Platform }

const PAPER = new Color(246, 238, 222, 255);
const SHADE = new Color(214, 200, 182, 255);
const INK = new Color(70, 52, 48, 255);
const HATCH = new Color(120, 96, 86, 120);

/**
 * Khối vẽ kiểu phác thảo bút chì cho màn hướng dẫn: thùng (Box), cột (Pillar), bục một chiều (Platform).
 * Gốc node: Box / Pillar = giữa đáy; Platform = giữa mặt trên. Tự gắn Solid khớp hình (Platform là bục một chiều).
 * Node phải là con trực tiếp của Gameplay (như mọi khối va chạm).
 */
@ccclass('TutorialBlock')
@executeInEditMode
export class TutorialBlock extends Component {
    @property({ type: Enum(BlockKind) })
    get kind() { return this._kind; }
    set kind(v: BlockKind) { this._kind = v; this.redraw(); }

    @property
    get width() { return this._width; }
    set width(v: number) { this._width = v; this.redraw(); }

    @property({ tooltip: 'Cao (Platform: bề dày)' })
    get height() { return this._height; }
    set height(v: number) { this._height = v; this.redraw(); }

    @property
    _kind: BlockKind = BlockKind.Box;

    @property
    _width = 220;

    @property
    _height = 160;

    onLoad() {
        this.redraw();
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        const w = this._width, h = this._height;
        const plat = this._kind === BlockKind.Platform;
        // Khung va chạm khớp hình
        const solid = this.getComponent(Solid) ?? this.addComponent(Solid);
        solid.oneWay = plat;
        solid.size = new Size(w, h);
        solid.offset = new Vec2(0, plat ? -h / 2 : h / 2);
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        const y0 = plat ? -h : 0, y1 = plat ? 0 : h;
        const x0 = -w / 2, x1 = w / 2;
        // Bóng dưới chân
        if (!plat) {
            g.fillColor = new Color(60, 45, 40, 50);
            g.ellipse(0, 0, w * 0.62, 14);
            g.fill();
        }
        // Mặt trước + mặt trên nghiêng (phối cảnh nhẹ)
        const d = Math.min(36, w * 0.18);
        g.fillColor = SHADE;
        g.moveTo(x0, y1);
        g.lineTo(x0 + d, y1 + d * 0.6);
        g.lineTo(x1 + d, y1 + d * 0.6);
        g.lineTo(x1, y1);
        g.close();
        g.fill();
        g.fillColor = PAPER;
        g.rect(x0, y0, w, y1 - y0);
        g.fill();
        if (!plat) {
            g.fillColor = SHADE;
            g.moveTo(x1, y0);
            g.lineTo(x1 + d, y0 + d * 0.6);
            g.lineTo(x1 + d, y1 + d * 0.6);
            g.lineTo(x1, y1);
            g.close();
            g.fill();
        }
        // Gạch bóng bút chì ở mặt trước
        g.strokeColor = HATCH;
        g.lineWidth = 2;
        for (let x = x0 + 14; x < x1 - 6; x += 16) {
            g.moveTo(x, y0 + 6);
            g.lineTo(Math.min(x1 - 4, x + (y1 - y0) * 0.35), y1 - 6);
        }
        g.stroke();
        // Nét viền
        g.strokeColor = INK;
        g.lineWidth = 4;
        g.rect(x0, y0, w, y1 - y0);
        g.moveTo(x0, y1);
        g.lineTo(x0 + d, y1 + d * 0.6);
        g.lineTo(x1 + d, y1 + d * 0.6);
        g.lineTo(x1, y1);
        if (!plat) {
            g.moveTo(x1 + d, y1 + d * 0.6);
            g.lineTo(x1 + d, y0 + d * 0.6);
            g.lineTo(x1, y0);
        }
        g.stroke();
    }
}

export { BlockKind };
