import { _decorator } from 'cc';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass } = _decorator;

/** Vật gây sát thương khi chạm (cọc, nón giao thông...). */
@ccclass('Hazard')
export class Hazard extends PlayerTrigger {
    protected onPlayerEnter(gm: GameManager, cat: PlayerController) {
        gm.hurtCat(cat, this.node.position.x);
    }
}
