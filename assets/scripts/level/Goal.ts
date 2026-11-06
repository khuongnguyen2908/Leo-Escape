import { _decorator, Color, Graphics, Node, Sprite, tween, UIOpacity, Vec3, view } from 'cc';
import { EDITOR } from 'cc/env';
import { CameraRig } from '../camera/CameraRig';
import { EnemyPatrol } from '../enemy/EnemyPatrol';
import { GameManager } from '../game/GameManager';
import { Sound } from '../core/Sound';
import { T } from '../ui/Lang';
import { UI, uiLabel, uiNode } from '../ui/UiKit';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, executeInEditMode, property } = _decorator;

const POLE = new Color(90, 70, 60, 255);
const FLAG = new Color(230, 70, 70, 255);
const STAR = new Color(255, 220, 80, 255);
const ARROW = new Color(255, 220, 80, 255);
/** Cờ mờ chừng này khi còn khoá (boss chưa bị hạ) */
const LOCKED_OPACITY = 110;

/**
 * Đích cuối màn. Chưa có Sprite thì tự vẽ cột cờ.
 * Màn có boss (kẻ địch to xác) thì đích khoá, cờ mờ đi, chạm vào không thắng (hiện chữ "Hạ boss trước đã!"),
 * tới khi boss bị hạ thì cờ sáng lại và mũi tên nhấp nháy ở mép màn hình chỉ về cờ cho tới khi thấy cờ.
 */
@ccclass('Goal')
@executeInEditMode
export class Goal extends PlayerTrigger {
    @property({ tooltip: 'Phải hạ hết boss (kẻ địch to xác) trong màn mới về đích được' })
    needBossDefeated = true;

    private bosses: EnemyPatrol[] = [];
    private locked = false;
    private arrow: Node | null = null;
    private arrowTime = 0;
    private lockedHintWait = 0;

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

    onDestroy() {
        if (this.arrow?.isValid) this.arrow.destroy();
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
            // Mở khoá: cờ nảy lên một nhịp cho người chơi thấy, và hiện mũi tên chỉ đường
            const s = this.node.scale.clone();
            tween(this.node).to(0.15, { scale: new Vec3(s.x * 1.25, s.y * 1.25, 1) }).to(0.2, { scale: s }).start();
            if (this.bosses.length > 0) this.makeArrow();
        }
    }

    protected tick(dt: number) {
        if (this.locked && !this.bossAlive()) this.setLocked(false);
        if (this.lockedHintWait > 0) this.lockedHintWait -= dt;
        this.updateArrow(dt);
    }

    protected onPlayerEnter(gm: GameManager) {
        if (this.locked) {
            this.lockedHint();
            return;
        }
        this.used = true;
        gm.win();
    }

    /** Chạm cờ khi boss còn sống: chữ nhỏ bay lên trên cờ (2 giây mới hiện lại). */
    private lockedHint() {
        if (this.lockedHintWait > 0 || !this.node.parent) return;
        this.lockedHintWait = 2;
        Sound.play('ui_deny', 0.8);
        const p = this.node.position;
        const n = uiNode('LockedHint', this.node.parent);
        n.setPosition(p.x, p.y + 360, 0);
        uiLabel(n, T('goal.locked'), 40, UI.cream, { outline: UI.brown, outlineWidth: 5 });
        const op = n.addComponent(UIOpacity);
        tween(n).by(1.4, { position: new Vec3(0, 60, 0) }).start();
        tween(op).delay(0.9).to(0.5, { opacity: 0 }).call(() => n.destroy()).start();
    }

    /** Mũi tên ở mép màn hình (trên HUD), chỉ về phía cờ. */
    private makeArrow() {
        const canvas = GameManager.instance?.node;
        if (!canvas || this.arrow) return;
        const n = uiNode('GoalArrow', canvas, 120, 120);
        const g = n.addComponent(Graphics);
        g.fillColor = ARROW;
        g.strokeColor = UI.brown;
        g.lineWidth = 6;
        g.moveTo(-40, 26);
        g.lineTo(10, 26);
        g.lineTo(10, 50);
        g.lineTo(52, 0);
        g.lineTo(10, -50);
        g.lineTo(10, -26);
        g.lineTo(-40, -26);
        g.close();
        g.fill();
        g.stroke();
        n.addComponent(UIOpacity).opacity = 0;
        this.arrow = n;
    }

    private updateArrow(dt: number) {
        const n = this.arrow;
        if (!n || !n.isValid) return;
        const rig = CameraRig.instance;
        const gx = this.node.position.x;
        const show = !this.used && !!rig && !rig.inViewX(gx, -80);
        const op = n.getComponent(UIOpacity)!;
        this.arrowTime += dt;
        // Nhấp nháy và nhích qua lại về phía cờ
        const blink = 0.65 + 0.35 * Math.sin(this.arrowTime * 6);
        const target = show ? 255 * blink : 0;
        op.opacity += (target - op.opacity) * Math.min(1, dt * 8);
        const side = rig && gx < rig.position.x ? -1 : 1;
        // Letterbox luôn giữ phần chơi đúng khung thiết kế (1920), ngoài đó là dải che
        const w = view.getDesignResolutionSize().width;
        n.setPosition(side * (w / 2 - 110 + Math.sin(this.arrowTime * 6) * 14), 0, 0);
        n.setScale(side, 1, 1);
        if (this.used) {
            n.destroy();
            this.arrow = null;
        }
    }
}
