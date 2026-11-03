import { _decorator, CCObject, Color, Component, Graphics, Node, Rect } from 'cc';
import { EDITOR } from 'cc/env';
import { PlayerTrigger } from '../level/PlayerTrigger';
import { PlatformerBody } from './PlatformerBody';
import { Solid } from './Solid';
const { ccclass, property, executeInEditMode } = _decorator;

const SOLID = new Color(60, 220, 90, 255);
const ONE_WAY = new Color(60, 200, 255, 255);
const BODY = new Color(255, 80, 200, 255);
const TRIGGER = new Color(255, 210, 60, 255);
const _r = new Rect();

/**
 * Vẽ khung va chạm để canh chỉnh. Gắn lên node lớp Gameplay.
 *   Xanh lá: bục đặc · Xanh dương: bục một chiều · Hồng: nhân vật/kẻ địch · Vàng: vùng chạm (cá, vật phẩm, nón, cờ)
 * Vẽ cả trong khung Scene của editor, nên chỉnh Size/Offset là thấy ngay.
 */
@ccclass('ColliderDebug')
@executeInEditMode
export class ColliderDebug extends Component {
    @property({ tooltip: 'Vẽ khung trong khung Scene của editor' })
    showInEditor = true;

    @property({ tooltip: 'Vẽ khung cả khi chơi (bấm Play)' })
    showInGame = false;

    private g: Graphics | null = null;

    lateUpdate() {
        const show = EDITOR ? this.showInEditor : this.showInGame;
        if (!show) {
            this.g?.clear();
            return;
        }
        const g = this.graphics();
        g.node.setSiblingIndex(this.node.children.length - 1);
        g.clear();
        g.lineWidth = 3;
        for (const s of this.node.getComponentsInChildren(Solid)) {
            if (s.enabledInHierarchy) this.box(g, s.getRect(_r), s.oneWay ? ONE_WAY : SOLID);
        }
        for (const b of this.node.getComponentsInChildren(PlatformerBody)) {
            this.box(g, b.getRect(_r), BODY);
        }
        // PlayerTrigger là lớp trừu tượng; ép kiểu để tìm mọi lớp con (cá, vật phẩm, nón, cờ...)
        for (const t of this.node.getComponentsInChildren(PlayerTrigger as unknown as new () => PlayerTrigger)) {
            if (t.enabledInHierarchy) this.box(g, t.getRect(_r), TRIGGER);
        }
    }

    onDisable() {
        this.g?.clear();
    }

    private graphics(): Graphics {
        if (!this.g || !this.g.isValid) {
            const n = new Node('ColliderDebug');
            n.layer = this.node.layer;
            // Không lưu vào scene, không hiện trong Hierarchy
            n.hideFlags |= CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
            this.node.addChild(n);
            this.g = n.addComponent(Graphics);
        }
        return this.g;
    }

    private box(g: Graphics, r: Rect, c: Color) {
        g.strokeColor = c;
        g.rect(r.x, r.y, r.width, r.height);
        g.stroke();
    }
}
