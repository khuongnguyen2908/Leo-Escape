import { _decorator, Component, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property } = _decorator;

/**
 * Nước sông trôi: gắn vào node chứa dải ảnh sông (các ảnh nối liền, lật xen kẽ).
 * Khi chơi, cả dải trôi ngang chậm (lặp lại không lộ mối nối) và nhún lên xuống nhẹ. Trong editor đứng yên.
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

    private base = new Vec3();
    private t = 0;

    start() {
        if (EDITOR) return;
        this.base.set(this.node.position);
    }

    update(dt: number) {
        if (EDITOR) return;
        this.t += dt;
        const shift = this.loop > 0 ? ((this.t * this.speed) % this.loop) : 0;
        const y = Math.sin((this.t * Math.PI * 2) / Math.max(0.1, this.bobPeriod)) * this.bob;
        this.node.setPosition(this.base.x + shift, this.base.y + y, this.base.z);
    }
}
