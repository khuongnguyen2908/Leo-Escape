import { _decorator, Color, Graphics, Sprite, tween, Vec3 } from 'cc';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, executeInEditMode } = _decorator;

const POLE = new Color(90, 70, 60, 255);
const FLAG = new Color(250, 200, 70, 255);

/** Điểm lưu: rơi xuống vực, hoặc gục hết tim, sẽ hồi sinh tại đây (gục hết thì đủ tim, boss đánh lại từ đầu). Chưa có Sprite thì tự vẽ lá cờ. */
@ccclass('Checkpoint')
@executeInEditMode
export class Checkpoint extends PlayerTrigger {
    onLoad() {
        if (this.getComponent(Sprite)) return;
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.fillColor = POLE;
        g.rect(-4, 0, 8, 160);
        g.fill();
        g.fillColor = FLAG;
        g.moveTo(4, 160);
        g.lineTo(70, 135);
        g.lineTo(4, 110);
        g.close();
        g.fill();
    }

    protected onPlayerEnter(gm: GameManager) {
        this.used = true;
        Sound.play('checkpoint');
        gm.reachCheckpoint(this.node);
        const s = this.node.scale;
        tween(this.node)
            .to(0.12, { scale: new Vec3(s.x * 1.2, s.y * 1.2, 1) })
            .to(0.2, { scale: new Vec3(s.x, s.y, 1) })
            .start();
    }
}
