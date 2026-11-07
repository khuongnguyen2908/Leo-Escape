import { Color, director, Graphics, Node, view } from 'cc';
import { uiNode } from './UiKit';

/** Hiện bao lâu (giây): mờ vào, nhấp nháy, mờ ra */
const SHOW = 1.6;
const SIZE = 30;
const PAW = new Color(250, 246, 236, 255);

/** Vẽ chân mèo (đệm thịt + 4 ngón) tâm (0, 0), cỡ r; dùng chung cho màn thông báo tự lưu. */
export function drawPaw(g: Graphics, r: number, color: Color) {
    g.fillColor = color;
    g.ellipse(0, -r * 0.28, r * 0.62, r * 0.5);
    g.fill();
    const toes: [number, number, number][] = [[-0.62, 0.3, 0.22], [-0.24, 0.62, 0.24], [0.24, 0.62, 0.24], [0.62, 0.3, 0.22]];
    for (const [x, y, s] of toes) {
        g.ellipse(x * r, y * r, s * r, s * r * 1.2);
        g.fill();
    }
}

let current: Node | null = null;

/**
 * Biểu tượng đang lưu: chân mèo nhỏ ở góc dưới phải, mờ vào, nhấp nháy rồi mờ ra (~1.6 giây).
 * GameManager gọi SaveIcon.show() mỗi lần ghi ô lưu (chạm checkpoint, qua màn). Chạy bằng setInterval, độ mờ nằm trong màu vẽ.
 */
export const SaveIcon = {
    show() {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        if (current?.isValid) current.destroy();
        const d = view.getDesignResolutionSize();
        const n = uiNode('SaveIcon', canvas, SIZE * 3, SIZE * 3);
        n.setPosition(d.width / 2 - 80, -d.height / 2 + 80, 0);
        n.setSiblingIndex(canvas.children.length - 1);
        current = n;
        const g = n.addComponent(Graphics);
        const start = Date.now();
        const timer = setInterval(() => {
            if (!g.isValid) {
                clearInterval(timer);
                return;
            }
            // Luôn nằm trên cùng (màn đen chuyển cảnh cũng tự đưa mình lên trên cùng)
            const top = canvas.children.length - 1;
            if (n.getSiblingIndex() !== top) n.setSiblingIndex(top);
            const t = (Date.now() - start) / 1000;
            const fade = Math.min(1, t / 0.25, Math.max(0, (SHOW - t) / 0.35));
            const blink = 0.7 + 0.3 * Math.abs(Math.cos(t * 5));
            g.clear();
            // Quầng sáng mờ phía sau
            for (let i = 0; i < 4; i++) {
                g.fillColor = new Color(200, 225, 255, Math.round(22 * fade));
                g.circle(0, 0, SIZE * (0.8 + i * 0.25));
                g.fill();
            }
            drawPaw(g, SIZE, new Color(PAW.r, PAW.g, PAW.b, Math.round(255 * fade * blink)));
            if (t >= SHOW) {
                clearInterval(timer);
                n.destroy();
                if (current === n) current = null;
            }
        }, 16);
    },
};
