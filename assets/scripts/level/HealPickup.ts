import { _decorator } from 'cc';
import { GameManager } from '../game/GameManager';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, property } = _decorator;

/** Vật phẩm hồi máu (bình trà, nước giải khát...). */
@ccclass('HealPickup')
export class HealPickup extends PlayerTrigger {
    @property
    heal = 1;

    private baseY = NaN;
    private time = 0;

    protected tick(dt: number) {
        if (this.used) return;
        const p = this.node.position;
        if (isNaN(this.baseY)) this.baseY = p.y;
        this.time += dt;
        this.node.setPosition(p.x, this.baseY + Math.sin(this.time * 3) * 8, p.z);
    }

    protected onPlayerEnter(gm: GameManager) {
        gm.heal(this.heal);
        this.popAndDestroy();
    }
}
