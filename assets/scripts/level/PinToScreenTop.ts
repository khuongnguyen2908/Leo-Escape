import { _decorator, Component, UITransform, view } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

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

    lateUpdate() {
        this.pin();
    }

    pin() {
        const parent = this.node.parent;
        const ut = this.getComponent(UITransform);
        if (!parent || !ut) return;
        // Mép trên khung hình (gốc Canvas ở giữa) đổi sang toạ độ của lớp cha
        const frameTop = (view.getDesignResolutionSize().height || 1080) / 2;
        const ps = parent.scale.y || 1;
        const top = (frameTop - parent.position.y) / ps;
        // Gốc hình ở anchorY; phần nằm trên gốc cao (1 - anchorY) × chiều cao đã nhân tỉ lệ
        const above = (1 - ut.anchorY) * ut.height * Math.abs(this.node.scale.y);
        const p = this.node.position;
        const y = top + this.overlap - above;
        if (Math.abs(p.y - y) > 0.01) this.node.setPosition(p.x, y, p.z);
    }
}
