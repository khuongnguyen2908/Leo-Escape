import { _decorator, Component, director, UITransform, view } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode } = _decorator;

let frameTopAt = -1;
let frameTopValue = 540;

/**
 * Mép trên khung hình (gốc Canvas ở giữa). view.getDesignResolutionSize() tạo một Size mới mỗi lần gọi,
 * mà màn có hơn 20 hình ghim: lúc chơi chỉ hỏi một lần mỗi khung hình rồi dùng chung.
 */
function frameTop(): number {
    if (EDITOR) return (view.getDesignResolutionSize().height || 1080) / 2;
    const f = director.getTotalFrames();
    if (f !== frameTopAt) {
        frameTopAt = f;
        frameTopValue = (view.getDesignResolutionSize().height || 1080) / 2;
    }
    return frameTopValue;
}

/**
 * Ghim mép trên của hình (băng rôn, cờ...) sát mép trên khung hình, để trên đầu không bị hở trời.
 * Dùng trong lớp FR_Top (lớp này không trôi theo chiều dọc). Kéo ngang thoải mái, còn độ cao do component này giữ:
 * muốn cao thấp thì đổi Overlap, muốn kéo tự do thì tắt component.
 */
@ccclass('PinToScreenTop')
@executeInEditMode
export class PinToScreenTop extends Component {
    @property({ tooltip: 'Mép trên của hình nhô ra ngoài mép khung hình bao nhiêu. Âm = thấp xuống, hở trời phía trên' })
    overlap = 4;

    private ut: UITransform | null = null;

    lateUpdate() {
        this.pin();
    }

    pin() {
        const parent = this.node.parent;
        // Lúc chơi giữ lại UITransform (khỏi tìm mỗi khung hình); trong editor component có thể bị gỡ / thêm nên hỏi lại
        if (EDITOR || !this.ut || !this.ut.isValid) this.ut = this.getComponent(UITransform);
        const ut = this.ut;
        if (!parent || !ut) return;
        // Mép trên khung hình (gốc Canvas ở giữa) đổi sang toạ độ của lớp cha
        const ps = parent.scale.y || 1;
        const top = (frameTop() - parent.position.y) / ps;
        // Gốc hình ở anchorY; phần nằm trên gốc cao (1 - anchorY) × chiều cao đã nhân tỉ lệ
        const above = (1 - ut.anchorY) * ut.height * Math.abs(this.node.scale.y);
        const p = this.node.position;
        const y = top + this.overlap - above;
        if (Math.abs(p.y - y) > 0.01) this.node.setPosition(p.x, y, p.z);
    }
}
