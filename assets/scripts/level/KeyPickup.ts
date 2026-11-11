import { _decorator, Color, Graphics, tween, UIOpacity, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { GameManager } from '../game/GameManager';
import { T } from '../ui/Lang';
import { uiLabel } from '../ui/UiKit';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, executeInEditMode } = _decorator;

export const KEY_GOLD = new Color(239, 159, 39, 255);
export const KEY_EDGE = new Color(99, 56, 6, 255);

/** Vẽ hình chìa khoá (vòng tròn + thân + 2 răng) tâm ở (cx, cy), cao khoảng 2.6 × r. */
export function drawKey(g: Graphics, cx: number, cy: number, r: number, fill: Color, edge: Color) {
    g.fillColor = fill;
    g.strokeColor = edge;
    g.lineWidth = Math.max(2, r * 0.18);
    g.circle(cx, cy + r * 0.8, r * 0.75);
    g.rect(cx - r * 0.22, cy - r * 1.6, r * 0.44, r * 1.8);
    g.rect(cx + r * 0.2, cy - r * 1.55, r * 0.55, r * 0.3);
    g.rect(cx + r * 0.2, cy - r * 1.05, r * 0.4, r * 0.28);
    g.fill();
    g.stroke();
    g.fillColor = edge;
    g.circle(cx, cy + r * 0.8, r * 0.28);
    g.fill();
}

/**
 * Chìa khoá để nhặt (map thử). Hình tạm vẽ bằng code: chìa vàng nhấp nhô, xoay nhẹ.
 * Chạm vào: chữ "+1 CHÌA KHOÁ" bay lên, chìa phồng rồi biến mất, GameManager.keys tăng 1 (ô chìa trên HUD sáng lên).
 * Gốc node là tâm chìa.
 */
@ccclass('KeyPickup')
@executeInEditMode
export class KeyPickup extends PlayerTrigger {
    private time = 0;
    private baseY = NaN;

    onLoad() {
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        drawKey(g, 0, 0, 34, KEY_GOLD, KEY_EDGE);
        if (this.size.width === 0) this.size.set(110, 140);
    }

    protected tick(dt: number) {
        if (EDITOR || this.used) return;
        const p = this.node.position;
        if (isNaN(this.baseY)) this.baseY = p.y;
        this.time += dt;
        this.node.setPosition(p.x, this.baseY + Math.sin(this.time * 2.4) * 12, p.z);
        this.node.angle = 8 * Math.sin(this.time * 1.6);
    }

    protected onPlayerEnter(gm: GameManager) {
        this.used = true;
        gm.addKey(this.node.uuid);
        const parent = this.node.parent;
        if (parent) {
            const p = this.node.position;
            const label = uiLabel(parent, T('key.got'), 46, KEY_GOLD, { outline: KEY_EDGE, outlineWidth: 5, name: 'KeyText' });
            label.node.setPosition(p.x, p.y + 120, 0);
            const op = label.node.addComponent(UIOpacity);
            tween(label.node).by(1.2, { position: new Vec3(0, 140, 0) }, { easing: 'quadOut' }).start();
            tween(op).delay(0.7).to(0.5, { opacity: 0 }).call(() => label.node.destroy()).start();
        }
        const s = this.node.scale.clone();
        tween(this.node)
            .to(0.14, { scale: new Vec3(s.x * 1.4, s.y * 1.4, 1) }, { easing: 'quadOut' })
            .to(0.25, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
            .call(() => this.node.destroy())
            .start();
    }
}
