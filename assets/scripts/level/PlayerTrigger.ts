import { _decorator, Component, Size, tween, UIOpacity, Vec2, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { GameManager } from '../game/GameManager';
const { ccclass, property } = _decorator;

/**
 * Nền chung cho HealPickup, Hazard, Checkpoint, Goal: kiểm tra mèo chạm hộp (size, offset) mỗi frame.
 * Size = 0 thì lấy theo UITransform. Không gắn trực tiếp component này.
 */
@ccclass('PlayerTrigger')
export abstract class PlayerTrigger extends Component {
    @property({ tooltip: 'Kích thước vùng chạm. Để 0 thì lấy theo UITransform' })
    size = new Size(0, 0);

    @property
    offset = new Vec2(0, 0);

    protected used = false;

    update(dt: number) {
        if (EDITOR) return;
        const gm = GameManager.instance;
        if (gm && !this.used && gm.playerOverlaps(this.node, this.size, this.offset)) this.onPlayerEnter(gm);
        this.tick(dt);
    }

    protected tick(_dt: number) {}

    protected abstract onPlayerEnter(gm: GameManager): void;

    protected popAndDestroy() {
        this.used = true;
        const s = this.node.scale;
        const fade = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        tween(this.node).to(0.2, { scale: new Vec3(s.x * 1.4, s.y * 1.4, 1) }).start();
        tween(fade).to(0.2, { opacity: 0 }).call(() => this.node.destroy()).start();
    }
}
