import { _decorator, Color, Graphics, Sprite, tween, UIOpacity, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { EnemyPatrol } from '../enemy/EnemyPatrol';
import { GameManager } from '../game/GameManager';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, executeInEditMode, property } = _decorator;

const POLE = new Color(90, 70, 60, 255);
const FLAG = new Color(230, 70, 70, 255);
const STAR = new Color(255, 220, 80, 255);
/** Cờ mờ chừng này khi còn khoá (boss chưa bị hạ) */
const LOCKED_OPACITY = 110;

/**
 * Đích cuối màn. Chưa có Sprite thì tự vẽ cột cờ.
 * Màn có boss (kẻ địch to xác) thì đích khoá, cờ mờ đi, chạm vào không thắng, tới khi boss bị hạ thì cờ sáng lại.
 */
@ccclass('Goal')
@executeInEditMode
export class Goal extends PlayerTrigger {
    @property({ tooltip: 'Phải hạ hết boss (kẻ địch to xác) trong màn mới về đích được' })
    needBossDefeated = true;

    private bosses: EnemyPatrol[] = [];
    private locked = false;

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

    start() {
        if (EDITOR || !this.needBossDefeated) return;
        this.bosses = (this.node.parent?.getComponentsInChildren(EnemyPatrol) ?? []).filter((e) => e.big);
        this.setLocked(this.bossAlive());
    }

    private bossAlive(): boolean {
        return this.bosses.some((e) => e.isValid && !e.defeated);
    }

    private setLocked(on: boolean) {
        if (this.locked === on) return;
        this.locked = on;
        const fade = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        fade.opacity = on ? LOCKED_OPACITY : 255;
        if (!on) {
            // Mở khoá: cờ nảy lên một nhịp cho người chơi thấy
            const s = this.node.scale.clone();
            tween(this.node).to(0.15, { scale: new Vec3(s.x * 1.25, s.y * 1.25, 1) }).to(0.2, { scale: s }).start();
        }
    }

    protected tick(_dt: number) {
        if (this.locked && !this.bossAlive()) this.setLocked(false);
    }

    protected onPlayerEnter(gm: GameManager) {
        if (this.locked) return;
        this.used = true;
        gm.win();
    }
}
