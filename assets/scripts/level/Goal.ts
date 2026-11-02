import { _decorator, Color, Graphics, Sprite } from 'cc';
import { GameManager } from '../game/GameManager';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, executeInEditMode } = _decorator;

const POLE = new Color(90, 70, 60, 255);
const FLAG = new Color(230, 70, 70, 255);
const STAR = new Color(255, 220, 80, 255);

/** Đích cuối màn. Chưa có Sprite thì tự vẽ cột cờ. */
@ccclass('Goal')
@executeInEditMode
export class Goal extends PlayerTrigger {
    onLoad() {
        if (this.getComponent(Sprite)) return;
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.fillColor = POLE;
        g.rect(-6, 0, 12, 300);
        g.fill();
        g.fillColor = FLAG;
        g.moveTo(6, 300);
        g.lineTo(130, 260);
        g.lineTo(6, 220);
        g.close();
        g.fill();
        g.fillColor = STAR;
        g.circle(45, 260, 14);
        g.fill();
    }

    protected onPlayerEnter(gm: GameManager) {
        this.used = true;
        gm.win();
    }
}
