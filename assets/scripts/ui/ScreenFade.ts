import { Color, director, Graphics, Node, Tween, tween, UIOpacity, view } from 'cc';
import { uiNode } from './UiKit';

let overlay: Node | null = null;

function getOverlay(): Node | null {
    if (overlay && overlay.isValid) return overlay;
    const canvas = director.getScene()?.getChildByName('Canvas');
    if (!canvas) return null;
    const d = view.getDesignResolutionSize();
    // Rộng hơn khung hình để màn hình dài (điện thoại) cũng che kín
    const n = uiNode('ScreenFade', canvas, d.width * 3, d.height * 3);
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, 255);
    g.rect(-d.width * 1.5, -d.height * 1.5, d.width * 3, d.height * 3);
    g.fill();
    n.addComponent(UIOpacity).opacity = 0;
    n.active = false;
    overlay = n;
    return n;
}

/**
 * Màn đen mờ vào / mờ ra che cả khung hình (sống lại ở checkpoint, chuyển cảnh, nền bảng kết quả).
 * Nằm trên cùng Canvas, dưới các bảng gọi sau nó. Không chặn bấm.
 */
export const ScreenFade = {
    /** Mờ tới độ đậm opacity (0..255) trong time giây rồi gọi done. */
    to(opacity: number, time: number, done?: () => void) {
        const n = getOverlay();
        if (!n) {
            done?.();
            return;
        }
        n.active = true;
        n.setSiblingIndex(n.parent!.children.length - 1);
        const op = n.getComponent(UIOpacity)!;
        Tween.stopAllByTarget(op);
        tween(op).to(time, { opacity }).call(() => {
            if (opacity <= 0) n.active = false;
            done?.();
        }).start();
    },

    /** Chớp trắng cả màn hình rồi tắt dần trong time giây (hạ boss). */
    flash(time = 0.35) {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        const d = view.getDesignResolutionSize();
        const n = uiNode('Flash', canvas, d.width * 3, d.height * 3);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(255, 255, 240, 255);
        g.rect(-d.width * 1.5, -d.height * 1.5, d.width * 3, d.height * 3);
        g.fill();
        const op = n.addComponent(UIOpacity);
        op.opacity = 220;
        tween(op).to(time, { opacity: 0 }).call(() => n.destroy()).start();
    },

    /** Tối hẳn rồi gọi mid (đổi chỗ, tải lại...), xong sáng lại. */
    blink(mid: () => void, out = 0.3, back = 0.35) {
        this.to(255, out, () => {
            mid();
            this.to(0, back);
        });
    },
};
