import { _decorator, Color, Graphics, Node, Sprite, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { GameManager } from '../game/GameManager';
import { T } from '../ui/Lang';
import { uiLabel, uiNode } from '../ui/UiKit';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, property, executeInEditMode } = _decorator;

const FISH = new Color(255, 160, 80, 255);
const FISH_EDGE = new Color(120, 60, 20, 255);

const HALO = new Color(255, 196, 90, 255);
const TEXT = new Color(255, 226, 150, 255);
const TEXT_EDGE = new Color(0x46, 0x2c, 0x22, 255);

/**
 * Cá bự: nguyên liệu mở kỹ năng ở cửa hàng (ShopNPC). Nhặt xong không hiện trên HUD, chỉ thấy số cá bự trong cửa hàng.
 * Hình tạm: ảnh cá vàng phóng to, nhuộm cam (ô Color của Sprite); muốn đổi hình thì thay ảnh trong Sprite của node.
 * Idle: nhấp nhô, nghiêng nhẹ, quầng sáng vàng phía sau phập phồng. Chạm vào: chữ "+1 CÁ BỰ" bay lên, cá phồng rồi tan.
 * Đã nhặt thì ghi vào ô lưu (uuid node), vào lại không còn con này.
 */
@ccclass('BigFishPickup')
@executeInEditMode
export class BigFishPickup extends PlayerTrigger {
    @property({ tooltip: 'Nhấp nhô lên xuống bao nhiêu' })
    bobHeight = 14;

    @property({ tooltip: 'Bán kính quầng sáng phía sau cá' })
    haloRadius = 110;

    private baseY = NaN;
    private time = 0;
    private halo: Node | null = null;

    /** Không có ảnh (map thử dựng bằng code): vẽ tạm một con cá cam, tâm ở gốc node. */
    onLoad() {
        if (this.getComponent(Sprite)) return;
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.fillColor = FISH;
        g.strokeColor = FISH_EDGE;
        g.lineWidth = 5;
        g.ellipse(0, 0, 70, 40);
        g.moveTo(60, 0);
        g.lineTo(110, 34);
        g.lineTo(110, -34);
        g.close();
        g.fill();
        g.stroke();
        g.fillColor = FISH_EDGE;
        g.circle(-38, 8, 7);
        g.fill();
        if (this.size.width === 0) this.size.set(150, 100);
    }

    start() {
        if (EDITOR) return;
        // Quầng sáng: node anh em nằm ngay trước cá (vẽ phía sau cá), đi theo cá trong tick
        const parent = this.node.parent;
        if (!parent) return;
        const n = uiNode('BigFishHalo', parent, this.haloRadius * 2, this.haloRadius * 2);
        n.setSiblingIndex(this.node.getSiblingIndex());
        const g = n.addComponent(Graphics);
        for (let k = 6; k >= 1; k--) {
            g.fillColor = new Color(HALO.r, HALO.g, HALO.b, 22);
            g.circle(0, 0, this.haloRadius * k / 6);
            g.fill();
        }
        n.addComponent(UIOpacity);
        this.halo = n;
    }

    onDestroy() {
        if (this.halo?.isValid) this.halo.destroy();
    }

    /** Tâm hình cá trong toạ độ node cha (ảnh neo chân hay neo giữa đều đúng). */
    private center(out: Vec3): Vec3 {
        const ut = this.getComponent(UITransform);
        const p = this.node.position, s = this.node.scale;
        if (!ut) return out.set(p.x, p.y, 0);
        return out.set(p.x + (0.5 - ut.anchorX) * ut.width * s.x, p.y + (0.5 - ut.anchorY) * ut.height * s.y, 0);
    }

    protected tick(dt: number) {
        if (this.used) return;
        const p = this.node.position;
        if (isNaN(this.baseY)) this.baseY = p.y;
        this.time += dt;
        this.node.setPosition(p.x, this.baseY + Math.sin(this.time * 2.6) * this.bobHeight, p.z);
        this.node.angle = 5 * Math.sin(this.time * 1.3 + 1);
        const h = this.halo;
        if (h?.isValid) {
            h.setPosition(this.center(_c));
            const k = 1 + 0.12 * Math.sin(this.time * 3.2);
            h.setScale(k, k, 1);
            h.getComponent(UIOpacity)!.opacity = Math.round(255 * (0.7 + 0.3 * Math.sin(this.time * 3.2)));
        }
    }

    protected onPlayerEnter(gm: GameManager) {
        this.used = true;
        gm.addBigFish(this.node.uuid);
        const parent = this.node.parent;
        if (parent) {
            // Chữ "+1 CÁ BỰ" bay lên rồi mờ dần (không phải HUD, chỉ báo một lần lúc nhặt)
            const c = this.center(_c);
            const label = uiLabel(parent, T('bigfish.got'), 46, TEXT, { outline: TEXT_EDGE, outlineWidth: 5, name: 'BigFishText' });
            label.node.setPosition(c.x, c.y + 90, 0);
            const op = label.node.addComponent(UIOpacity);
            tween(label.node).by(1.1, { position: new Vec3(0, 130, 0) }, { easing: 'quadOut' }).start();
            tween(op).delay(0.6).to(0.5, { opacity: 0 }).call(() => label.node.destroy()).start();
        }
        const h = this.halo;
        if (h?.isValid) {
            const hs = h.scale.x;
            tween(h).to(0.35, { scale: new Vec3(hs * 2, hs * 2, 1) }).start();
            tween(h.getComponent(UIOpacity)!).to(0.35, { opacity: 0 }).start();
        }
        const s = this.node.scale.clone();
        tween(this.node)
            .to(0.14, { scale: new Vec3(s.x * 1.35, s.y * 1.35, 1) }, { easing: 'quadOut' })
            .to(0.25, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
            .call(() => this.node.destroy())
            .start();
    }
}

const _c = new Vec3();
