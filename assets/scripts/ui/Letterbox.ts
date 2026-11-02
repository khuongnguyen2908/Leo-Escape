import { _decorator, Color, Component, Graphics, Node, ResolutionPolicy, screen, Size, UITransform, view } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property } = _decorator;

/**
 * Giữ khung hình cố định (mặc định 1920×1080) trên mọi màn hình và mọi trang xem trước:
 * - Màn rộng hơn khung: bám chiều cao, che hai bên bằng dải màu.
 * - Màn hẹp/cao hơn khung: bám chiều ngang, che trên dưới bằng dải màu.
 * Không dùng SHOW_ALL của Cocos vì trang xem trước trên trình duyệt có thể làm lệch nó.
 * Gắn lên Canvas.
 */
@ccclass('Letterbox')
export class Letterbox extends Component {
    @property({ tooltip: 'Kích thước khung hình muốn giữ' })
    frameSize = new Size(1920, 1080);

    @property
    color = new Color(0, 0, 0, 255);

    private bars: Node[] = [];
    private lastKey = '';

    start() {
        if (EDITOR) return;
        this.applyPolicy();
        screen.on('window-resize', this.applyPolicy, this);
    }

    onDestroy() {
        if (!EDITOR) screen.off('window-resize', this.applyPolicy, this);
    }

    /** Chọn bám chiều cao hay chiều ngang tuỳ cửa sổ dẹt hay cao hơn khung. */
    applyPolicy() {
        const ws = screen.windowSize;
        const fw = this.frameSize.width, fh = this.frameSize.height;
        const wide = ws.width / Math.max(1, ws.height) >= fw / fh;
        view.setDesignResolutionSize(fw, fh, wide ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH);
        this.lastKey = '';
    }

    lateUpdate() {
        if (EDITOR) return;
        const ui = this.getComponent(UITransform);
        if (!ui) return;
        const w = ui.width, h = ui.height;
        const fw = this.frameSize.width, fh = this.frameSize.height;
        const key = `${w}x${h}`;
        if (key !== this.lastKey) {
            this.lastKey = key;
            const sideW = Math.max(0, (w - fw) / 2) + 2;
            const capH = Math.max(0, (h - fh) / 2) + 2;
            // [x, y, rộng, cao] của 4 dải: trái, phải, trên, dưới
            const rects: [number, number, number, number][] = [
                [-fw / 2 - sideW, -h / 2, sideW, h],
                [fw / 2, -h / 2, sideW, h],
                [-w / 2, fh / 2, w, capH],
                [-w / 2, -fh / 2 - capH, w, capH],
            ];
            rects.forEach((r, i) => this.drawBar(i, r, i < 2 ? w > fw + 1 : h > fh + 1));
        }
        // Luôn nằm trên cùng để che mọi thứ ngoài khung
        for (const b of this.bars) if (b.active) b.setSiblingIndex(this.node.children.length - 1);
    }

    private drawBar(i: number, [x, y, bw, bh]: [number, number, number, number], show: boolean) {
        let n = this.bars[i];
        if (!n) {
            n = new Node(`Letterbox${i}`);
            n.layer = this.node.layer;
            this.node.addChild(n);
            n.addComponent(Graphics);
            this.bars[i] = n;
        }
        n.active = show;
        if (!show) return;
        const g = n.getComponent(Graphics)!;
        g.clear();
        g.fillColor = this.color;
        g.rect(x, y, bw, bh);
        g.fill();
    }
}
