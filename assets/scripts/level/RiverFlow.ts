import { _decorator, Color, Component, Graphics, Node, UITransform, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property } = _decorator;

/**
 * Nước sông trôi: gắn vào node chứa dải ảnh sông (các ảnh nối liền, lật xen kẽ).
 * Khi chơi, cả dải trôi ngang chậm (lặp lại không lộ mối nối) và nhún lên xuống nhẹ. Trong editor đứng yên.
 * Khi chơi còn tô thêm nước sâu dần bên dưới dải ảnh (ô Deep), để camera thu nhỏ (zoom 0.7) không thấy trời dưới đáy sông.
 */
@ccclass('RiverFlow')
export class RiverFlow extends Component {
    @property({ tooltip: 'Nước trôi ngang bao nhanh (đơn vị / giây, âm = trôi sang trái)' })
    speed = -14;

    @property({ tooltip: 'Bề ngang một cặp ảnh (ảnh + ảnh lật), trôi hết đoạn này thì quay lại đầu, không thấy giật' })
    loop = 3836;

    @property({ tooltip: 'Nhún lên xuống bao nhiêu' })
    bob = 3;

    @property({ tooltip: 'Bao nhiêu giây nhún một lần' })
    bobPeriod = 3.5;

    @property({ tooltip: 'Tô nước sâu bên dưới dải ảnh sông bao nhiêu (0 = tắt). Chỉ khi chơi' })
    deep = 1500;

    @property({ tooltip: 'Màu nước sát đáy ảnh sông (lấy theo đáy ảnh BG_river)' })
    deepTop = new Color(157, 181, 201, 255);

    @property({ tooltip: 'Màu nước sâu nhất' })
    deepBottom = new Color(64, 92, 116, 255);

    private base = new Vec3();
    private t = 0;

    start() {
        if (EDITOR) return;
        this.base.set(this.node.position);
        this.drawDeep();
    }

    /** Nước sâu dần dưới đáy dải ảnh: vài dải màu từ deepTop tới deepBottom rồi đặc, phủ rộng hơn cả dải (dải còn trôi ngang). */
    private drawDeep() {
        if (this.deep <= 0) return;
        let left = Infinity, right = -Infinity, bottom = Infinity;
        for (const c of this.node.children) {
            const ut = c.getComponent(UITransform);
            if (!ut) continue;
            const w = ut.width * Math.abs(c.scale.x), h = ut.height * Math.abs(c.scale.y);
            left = Math.min(left, c.position.x - w / 2);
            right = Math.max(right, c.position.x + w / 2);
            bottom = Math.min(bottom, c.position.y - h / 2);
        }
        if (!isFinite(bottom)) return;
        const n = new Node('Deep');
        n.layer = this.node.layer;
        this.node.insertChild(n, 0);
        n.addComponent(UITransform);
        const g = n.addComponent(Graphics);
        const x0 = left - this.loop - 2000, w = right - left + this.loop * 2 + 4000;
        const BANDS = 8, BAND = 60, OVERLAP = 4;
        const a = this.deepTop, b = this.deepBottom;
        for (let i = 0; i < BANDS; i++) {
            const k = (i + 0.5) / BANDS;
            g.fillColor = new Color(a.r + (b.r - a.r) * k, a.g + (b.g - a.g) * k, a.b + (b.b - a.b) * k, 255);
            g.rect(x0, bottom - (i + 1) * BAND, w, BAND + OVERLAP);
            g.fill();
        }
        g.fillColor = b;
        g.rect(x0, bottom - this.deep, w, this.deep - BANDS * BAND + OVERLAP);
        g.fill();
    }

    update(dt: number) {
        if (EDITOR) return;
        this.t += dt;
        const shift = this.loop > 0 ? ((this.t * this.speed) % this.loop) : 0;
        const y = Math.sin((this.t * Math.PI * 2) / Math.max(0.1, this.bobPeriod)) * this.bob;
        this.node.setPosition(this.base.x + shift, this.base.y + y, this.base.z);
    }
}
