import { _decorator, Component, Vec2, Vec3 } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Một lớp cảnh trôi theo camera với tốc độ riêng.
 *   BG (nền xa) ~0.12 · MG (nhà, cây phía sau) ~0.8 · Gameplay = 1 · FR (tiền cảnh) ~1.35
 * Vị trí gốc (khi camera ở 0, 0) được lưu riêng, nên CameraRig có thể dịch lớp
 * để xem trước ngay trong editor mà không làm hỏng vị trí thật của lớp.
 */
@ccclass('ParallaxLayer')
@executeInEditMode
export class ParallaxLayer extends Component {
    static readonly all: ParallaxLayer[] = [];

    @property({ tooltip: 'Tốc độ trôi so với camera (x, y). Lớp Gameplay để (1, 1)' })
    factor = new Vec2(1, 1);

    @property
    _base = new Vec3();

    @property
    _baseScale = new Vec3(1, 1, 1);

    @property
    _hasBase = false;

    onLoad() {
        if (!this._hasBase) this.captureBase();
    }

    onEnable() {
        ParallaxLayer.all.push(this);
    }

    onDisable() {
        const i = ParallaxLayer.all.indexOf(this);
        if (i >= 0) ParallaxLayer.all.splice(i, 1);
    }

    /** Lấy vị trí hiện tại của node làm vị trí gốc. */
    captureBase() {
        this._base.set(this.node.position);
        this._baseScale.set(this.node.scale);
        this._hasBase = true;
    }

    /** Đưa node về vị trí gốc (tắt xem trước trong editor). */
    resetToBase() {
        this.node.setPosition(this._base.x, this._base.y, this._base.z);
        this.node.setScale(this._baseScale.x, this._baseScale.y, this._baseScale.z);
    }

    /** Đặt lớp theo camera; zoom phóng quanh tâm màn hình (gốc Canvas). */
    apply(cam: Readonly<Vec2>, zoom = 1) {
        const b = this._base;
        const s = this._baseScale;
        this.node.setPosition((b.x - cam.x * this.factor.x) * zoom, (b.y - cam.y * this.factor.y) * zoom, b.z);
        this.node.setScale(s.x * zoom, s.y * zoom, s.z);
    }
}
