import { _decorator, Component, Rect, Size, tween, UIOpacity, Vec2, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { computeBox } from '../core/Box';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
const { ccclass, property } = _decorator;

/**
 * Nền chung cho HealPickup, Hazard, Checkpoint, Goal, CoinPickup: kiểm tra con mèo nào chạm hộp (size, offset) mỗi frame.
 * Size = 0 thì lấy theo UITransform. Không gắn trực tiếp component này.
 */
@ccclass('PlayerTrigger')
export abstract class PlayerTrigger extends Component {
    @property({ tooltip: 'Kích thước vùng chạm. Để 0 thì lấy theo UITransform' })
    size = new Size(0, 0);

    @property
    offset = new Vec2(0, 0);

    protected used = false;

    /** Vùng chạm trong không gian node cha (dùng cho ColliderDebug). */
    getRect(out: Rect): Rect {
        return computeBox(this.node, this.size, this.offset, out);
    }

    update(dt: number) {
        if (EDITOR) return;
        const gm = GameManager.instance;
        if (gm && !this.used) {
            for (const cat of gm.catsOverlapping(this.node, this.size, this.offset)) {
                this.onPlayerEnter(gm, cat);
                if (this.used) break;
            }
        }
        this.tick(dt);
    }

    protected tick(_dt: number) {}

    /** Mèo cat vừa chạm vào (gọi mỗi frame khi còn chạm, cho từng con mèo). */
    protected abstract onPlayerEnter(gm: GameManager, cat: PlayerController): void;

    protected popAndDestroy() {
        this.used = true;
        const s = this.node.scale;
        const fade = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        tween(this.node).to(0.2, { scale: new Vec3(s.x * 1.4, s.y * 1.4, 1) }).start();
        tween(fade).to(0.2, { opacity: 0 }).call(() => this.node.destroy()).start();
    }
}
