import { _decorator, Node, resources, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { GameManager } from '../game/GameManager';
import { CoinGlow } from './CoinGlow';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, property } = _decorator;

/** Ảnh đốm lấp lánh đặt chồng trên cá (cùng khung 110×110 với MG_coin) */
const SPARKLE = 'art/MG_coin_sparkle/spriteFrame';
const IDLE = 2.4;

/**
 * Cá vàng để nhặt. Idle: nhấp nhô, nghiêng qua lại nhẹ; đốm lấp lánh (MG_coin_sparkle) trên cá nhấp nháy, xoay chậm.
 * Quầng sáng phía sau cá là CoinGlow (node HaoQuang).
 * Chạm vào: cộng vào bộ đếm rồi NỔ biến mất (~0.45 giây) — cá phồng lên rồi teo mất, đốm lấp lánh bung ra, quầng sáng nở rồi tan.
 */
@ccclass('CoinPickup')
export class CoinPickup extends PlayerTrigger {
    @property
    amount = 100;

    private baseY = NaN;
    private time = 0;
    private sparkle: Node | null = null;
    private sparkleOp: UIOpacity | null = null;

    start() {
        if (EDITOR) return;
        resources.load(SPARKLE, SpriteFrame, (err, sf) => {
            if (err || !sf || !this.isValid || this.used) return;
            // Đốm lấp lánh: con của cá (vẽ trên cá), tâm đặt đúng tâm ảnh cá
            const n = new Node('Sparkle');
            n.layer = this.node.layer;
            this.node.addChild(n);
            n.addComponent(UITransform);
            const sp = n.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.RAW;
            sp.trim = false;
            sp.spriteFrame = sf;
            this.sparkleOp = n.addComponent(UIOpacity);
            const ut = this.getComponent(UITransform);
            if (ut) n.setPosition((0.5 - ut.anchorX) * ut.width, (0.5 - ut.anchorY) * ut.height, 0);
            this.sparkle = n;
        });
    }

    protected tick(dt: number) {
        if (this.used) return;
        const p = this.node.position;
        if (isNaN(this.baseY)) {
            this.baseY = p.y;
            this.time = p.x * 0.01; // lệch pha để các con cá không nhấp nhô cùng nhịp
        }
        this.time += dt;
        this.node.setPosition(p.x, this.baseY + Math.sin(this.time * 3.5) * 10, p.z);
        // Nghiêng qua lại nhẹ, chậm hơn nhịp nhấp nhô
        this.node.angle = 4 * Math.sin(this.time * 1.75 + 1.5);
        const s = this.sparkle;
        if (s) {
            // Lấp lánh: mờ ↔ rõ, xoay chậm, nhún nhẹ
            s.angle = -((this.time % IDLE) / IDLE) * 15;
            const k = 1 + 0.06 * Math.sin(this.time * 5.2);
            s.setScale(k, k, 1);
            if (this.sparkleOp) this.sparkleOp.opacity = Math.round(255 * (0.65 + 0.35 * Math.sin(this.time * 7.85)));
        }
    }

    protected onPlayerEnter(gm: GameManager) {
        gm.addCoins(this.amount, this.node.uuid);
        this.pop();
    }

    /** Nổ biến mất: cá phồng 1.3 rồi teo về 0, đốm lấp lánh bung to vừa xoay vừa tan, quầng sáng (CoinGlow) nở rồi tan. */
    private pop() {
        this.used = true;
        const glow = this.node.parent?.getComponentsInChildren(CoinGlow).find((g) => g.target === this.node);
        glow?.burst();
        const s = this.node.scale.clone();
        tween(this.node)
            .to(0.12, { scale: new Vec3(s.x * 1.3, s.y * 1.3, 1) }, { easing: 'quadOut' })
            .to(0.23, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
            .start();
        const sp = this.sparkle;
        if (sp) {
            // Đốm là con của cá nên bị teo theo: phóng bù cho bung ra to
            tween(sp).to(0.35, { scale: new Vec3(4, 4, 1), angle: sp.angle - 70 }, { easing: 'quadOut' }).start();
            const op = this.sparkleOp;
            if (op) tween(op).to(0.4, { opacity: 0 }).start();
        }
        this.scheduleOnce(() => this.node.destroy(), 0.45);
    }
}
