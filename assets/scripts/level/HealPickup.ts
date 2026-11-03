import { _decorator, Vec3 } from 'cc';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, property } = _decorator;

/**
 * Vật phẩm hồi máu (bình trà, nước giải khát...).
 * Đồ đặt trên mặt đất thì tắt "Bob" để đứng yên, chỉ phập phồng nhẹ cho người chơi nhận ra.
 */
@ccclass('HealPickup')
export class HealPickup extends PlayerTrigger {
    @property
    heal = 1;

    @property({ tooltip: 'Bật: nhấp nhô lên xuống (đồ bay). Tắt: đứng yên trên mặt đất, chỉ phập phồng nhẹ' })
    bob = true;

    private baseY = NaN;
    private baseScale = new Vec3();
    private time = 0;

    protected tick(dt: number) {
        if (this.used) return;
        const p = this.node.position;
        if (isNaN(this.baseY)) {
            this.baseY = p.y;
            this.baseScale.set(this.node.scale);
        }
        this.time += dt;
        if (this.bob) {
            this.node.setPosition(p.x, this.baseY + Math.sin(this.time * 3) * 8, p.z);
        } else {
            const k = 1 + Math.sin(this.time * 4) * 0.04;
            this.node.setScale(this.baseScale.x * k, this.baseScale.y * k, this.baseScale.z);
        }
    }

    protected onPlayerEnter(gm: GameManager, cat: PlayerController) {
        gm.heal(cat, this.heal);
        this.popAndDestroy();
    }
}
