import { _decorator, Component, UIOpacity } from 'cc';
import { EDITOR } from 'cc/env';
import { CameraRig } from './CameraRig';
const { ccclass, property } = _decorator;

/**
 * Làm mờ cả lớp (và mọi ảnh con) khi camera đi xuống dưới mặt phố, hiện lại khi camera lên.
 * Dùng cho lớp tiền cảnh FR / FR_Top (tủ điện, cột đèn, lá cây) để chúng không vẽ đè lên cống, kênh ngầm.
 * Độ cao tính theo vị trí camera trong lớp Gameplay (mặt phố y 0). Trong editor không làm gì.
 */
@ccclass('FadeBelow')
export class FadeBelow extends Component {
    @property({ tooltip: 'Camera cao hơn mức này: hiện rõ hoàn toàn' })
    fullY = -250;

    @property({ tooltip: 'Camera thấp hơn mức này: ẩn hẳn. Ở giữa hai mức thì mờ dần' })
    goneY = -650;

    private op: UIOpacity | null = null;

    onLoad() {
        this.op = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
    }

    lateUpdate() {
        const rig = CameraRig.instance;
        if (EDITOR || !rig || !this.op) return;
        const span = this.fullY - this.goneY;
        const k = span > 0 ? Math.min(1, Math.max(0, (rig.position.y - this.goneY) / span)) : 1;
        const a = Math.round(255 * k);
        if (this.op.opacity !== a) this.op.opacity = a;
    }
}
