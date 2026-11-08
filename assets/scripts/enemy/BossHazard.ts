import { _decorator, Component, Graphics, Node } from 'cc';
import { Hittable, registerHittable, unregisterHittable } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
const { ccclass } = _decorator;

/**
 * Một vật của đòn boss (vòng sóng âm, gai, hàm răng, sấm, khối đá gợn sóng, chó con...): node có sẵn Graphics để tự vẽ,
 * mỗi khung gọi step(h, dt). step trả về false thì vật tự xoá. Hình vẽ tạm bằng code, sau thay ảnh được.
 * hittable: vật chém được (chó con) thì truyền vào, tự đăng ký / gỡ khỏi danh sách thứ mèo chém trúng.
 * BossBrain xoá hết các vật này khi đánh lại từ đầu, chuyển phase hoặc boss chết.
 */
@ccclass('BossHazard')
export class BossHazard extends Component {
    /** Bút vẽ của vật (vẽ lại mỗi khung trong step) */
    g!: Graphics;
    /** Giây từ lúc tạo */
    time = 0;
    /** Chỗ chứa số liệu riêng của từng loại vật */
    readonly data: Record<string, number> = {};
    private step: (h: BossHazard, dt: number) => boolean = () => false;
    private hittable: Hittable | null = null;

    static spawn(parent: Node, name: string, x: number, y: number, step: (h: BossHazard, dt: number) => boolean, hittable?: Hittable): BossHazard {
        const n = new Node(name);
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x, y, 0);
        const h = n.addComponent(BossHazard);
        h.g = n.addComponent(Graphics);
        h.step = step;
        if (hittable) {
            h.hittable = hittable;
            registerHittable(hittable);
        }
        return h;
    }

    update(dt: number) {
        if (HitStop.frozen) return;
        this.time += dt;
        if (!this.step(this, dt)) this.node.destroy();
    }

    onDestroy() {
        if (this.hittable) unregisterHittable(this.hittable);
        this.hittable = null;
    }
}
