import { _decorator, Color, Component, Graphics, Node, tween, Tween, UIOpacity, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { keyShort, Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { keyCap } from '../ui/KeyCap';
import { MenuNav } from '../ui/MenuNav';
import { ShopPage } from '../ui/ShopPage';
import { uiNode } from '../ui/UiKit';
const { ccclass, property } = _decorator;

const BUBBLE = new Color(250, 240, 222, 255);
const BUBBLE_EDGE = new Color(78, 60, 56, 255);

/**
 * Người bán hàng (tạm là mèo xám, sau này thay hình): Leo đứng gần thì hiện bong bóng có phím Lên (W / ↑),
 * bấm Lên (hoặc chạm bong bóng) để mở cửa hàng (ShopPage). Trong lúc mở cửa hàng mèo đứng yên, không bị đánh.
 * Hình NPC là node con "Hinh" (Sprite): đổi ảnh, kéo, phóng to thoải mái. Kéo node ShopNPC để dời cả NPC.
 * Gốc node là chân NPC (đặt trên mặt đất).
 */
@ccclass('ShopNPC')
export class ShopNPC extends Component {
    @property({ tooltip: 'Leo đứng cách NPC trong chừng này (theo chiều ngang) thì hiện bong bóng, bấm Lên mở cửa hàng' })
    range = 200;

    @property({ tooltip: 'Bong bóng nằm cao chừng này trên chân NPC' })
    bubbleY = 330;

    private bubble: Node | null = null;
    private bubbleOp: UIOpacity | null = null;
    private shown = false;
    private wasUp = true;
    private open = false;
    private time = 0;

    start() {
        if (EDITOR) return;
        this.makeBubble();
    }

    private makeBubble() {
        const b = uiNode('Bubble', this.node, 120, 110);
        b.setPosition(0, this.bubbleY, 0);
        // Bong bóng nói chuyện: tròn bo góc + đuôi nhọn chỉ xuống NPC
        const g = b.addComponent(Graphics);
        g.fillColor = BUBBLE;
        g.strokeColor = BUBBLE_EDGE;
        g.lineWidth = 6;
        g.roundRect(-55, -40, 110, 90, 26);
        g.moveTo(-14, -38);
        g.lineTo(0, -64);
        g.lineTo(14, -38);
        g.fill();
        g.stroke();
        g.fillColor = BUBBLE;
        g.rect(-11, -44, 22, 8);
        g.fill();
        this.paintKey(b);
        this.bubbleOp = b.addComponent(UIOpacity);
        this.bubbleOp.opacity = 0;
        b.active = false;
        // Chạm bong bóng (điện thoại) cũng mở cửa hàng
        b.on(Node.EventType.TOUCH_END, () => {
            if (this.shown) this.openShop();
        });
        // Bong bóng không lật theo NPC (node NPC có thể bị lật trái / phải)
        const s = this.node.scale;
        b.setScale(s.x < 0 ? -1 : 1, 1, 1);
        this.bubble = b;
        Settings.onChange(this.repaintKey);
    }

    onDestroy() {
        Settings.offChange(this.repaintKey);
    }

    /** Đổi phím trong Cài đặt thì vẽ lại chữ phím trên bong bóng. */
    private readonly repaintKey = () => {
        if (this.bubble?.isValid) this.paintKey(this.bubble);
    };

    private paintKey(b: Node) {
        b.getChildByName('KeyCapRoot')?.destroy();
        const root = uiNode('KeyCapRoot', b);
        root.setPosition(0, 5, 0);
        keyCap(root, keyShort(Settings.key(0, 'up')), 0, 0, 56);
    }

    update(dt: number) {
        if (EDITOR) return;
        this.time += dt;
        const gm = GameManager.instance;
        const cat = gm?.player;
        let near = false;
        if (gm && cat && !this.open) {
            const p = cat.node.position, me = this.node.position;
            near = !cat.downed && cat.controlEnabled && !gm.cutscene
                && Math.abs(p.x - me.x) < this.range && Math.abs(p.y - me.y) < 220;
        }
        this.showBubble(near);
        if (this.bubble?.active) {
            // Nhún nhẹ cho dễ thấy
            this.bubble.setPosition(0, this.bubbleY + Math.sin(this.time * 4) * 6, 0);
        }
        const up = !!cat?.controls.upHeld;
        if (near && up && !this.wasUp && !MenuNav.busy) this.openShop();
        this.wasUp = up;
    }

    private showBubble(on: boolean) {
        const b = this.bubble, op = this.bubbleOp;
        if (!b || !op || on === this.shown) return;
        this.shown = on;
        Tween.stopAllByTarget(op);
        Tween.stopAllByTarget(b);
        const sx = b.scale.x < 0 ? -1 : 1;
        if (on) {
            b.active = true;
            b.setScale(sx * 0.6, 0.6, 1);
            tween(b).to(0.18, { scale: new Vec3(sx, 1, 1) }, { easing: 'backOut' }).start();
            tween(op).to(0.15, { opacity: 255 }).start();
        } else {
            tween(op).to(0.15, { opacity: 0 }).call(() => { b.active = false; }).start();
        }
    }

    private openShop() {
        const gm = GameManager.instance;
        if (!gm || this.open || MenuNav.busy) return;
        this.open = true;
        this.showBubble(false);
        gm.lockCats(true);
        ShopPage.show(gm.node, () => {
            this.open = false;
            this.wasUp = true; // đang giữ Lên lúc đóng thì không mở lại liền
            gm.lockCats(false);
        });
    }
}
