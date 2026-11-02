import { _decorator, Color, Component, Graphics, Size } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/** Nền trời chuyển màu dọc. */
@ccclass('SkyGradient')
@executeInEditMode
@requireComponent(Graphics)
export class SkyGradient extends Component {
    @property
    top = new Color(140, 200, 225, 255);

    @property
    bottom = new Color(230, 243, 236, 255);

    @property
    size = new Size(3840, 2160);

    @property
    bands = 16;

    onLoad() {
        this.redraw();
    }

    redraw() {
        const g = this.getComponent(Graphics)!;
        const { width: w, height: h } = this.size;
        const n = Math.max(2, this.bands);
        const c = new Color();
        g.clear();
        for (let i = 0; i < n; i++) {
            Color.lerp(c, this.bottom, this.top, i / (n - 1));
            g.fillColor = c;
            g.rect(-w / 2, -h / 2 + (h / n) * i, w, h / n + 1);
            g.fill();
        }
    }
}
