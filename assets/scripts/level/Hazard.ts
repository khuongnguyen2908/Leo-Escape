import { _decorator } from 'cc';
import { GameManager } from '../game/GameManager';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass } = _decorator;

/** Vật gây sát thương khi chạm (cọc, nón giao thông...). */
@ccclass('Hazard')
export class Hazard extends PlayerTrigger {
    protected onPlayerEnter(gm: GameManager) {
        gm.hurtPlayer(this.node.position.x);
    }
}
