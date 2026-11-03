import { _decorator, Color, Component, Graphics, Size } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Quầng sáng tròn/bầu dục mềm vẽ bằng code (không cần ảnh): nhiều vòng mờ chồng lên nhau,
 * sáng nhất ở giữa, nhạt dần ra mép. Dùng cho sương sáng nền xa và hào quang sau cá vàng.
 */
@ccclass('SoftGlow')
@executeInEditMode
export class SoftGlow extends Component {
    @property({ tooltip: 'Bề ngang, bề cao của quầng sáng' })
    size = new Size(150, 150);

    @property({ tooltip: 'Màu; alpha là độ sáng ở giữa' })
    color = new Color(255, 226, 120, 170);

    @property({ tooltip: 'Số vòng (nhiều = mềm hơn)' })
    rings = 14;

    private drawnFor = '';

    onLoad() {
        this.redraw();
    }

    update() {
        this.redraw(); // chỉ vẽ lại khi bạn đổi thông số
    }

    redraw() {
        const c = this.color;
        const key = `${this.size.width}|${this.size.height}|${c.r},${c.g},${c.b},${c.a}|${this.rings}`;
        if (key === this.drawnFor) return;
        this.drawnFor = key;

        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        const n = Math.max(1, this.rings);
        const fill = c.clone();
        // Mỗi vòng cùng độ mờ, chồng lại thì ở giữa đạt đúng alpha đã chọn
        fill.a = Math.max(1, Math.round(255 * (1 - Math.pow(1 - c.a / 255, 1 / n))));
        g.fillColor = fill;
        for (let i = n; i >= 1; i--) {
            const f = i / n;
            g.ellipse(0, 0, this.size.width / 2 * f, this.size.height / 2 * f);
            g.fill();
        }
    }
}
