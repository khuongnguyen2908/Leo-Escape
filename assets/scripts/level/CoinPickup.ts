import { _decorator } from 'cc';
import { GameManager } from '../game/GameManager';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, property } = _decorator;

/** Cá vàng để nhặt: nhấp nhô tại chỗ, chạm vào thì cộng vào bộ đếm. */
@ccclass('CoinPickup')
export class CoinPickup extends PlayerTrigger {
    @property
    amount = 100;

    private baseY = NaN;
    private time = 0;

    protected tick(dt: number) {
        if (this.used) return;
        const p = this.node.position;
        if (isNaN(this.baseY)) {
            this.baseY = p.y;
            this.time = p.x * 0.01; // lệch pha để các con cá không nhấp nhô cùng nhịp
        }
        this.time += dt;
        this.node.setPosition(p.x, this.baseY + Math.sin(this.time * 3.5) * 10, p.z);
    }

    protected onPlayerEnter(gm: GameManager) {
        gm.addCoins(this.amount);
        this.popAndDestroy();
    }
}
