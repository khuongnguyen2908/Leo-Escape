import { _decorator, Color, Component, Graphics, tween, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { GameManager } from '../game/GameManager';
import { drawKey, KEY_EDGE, KEY_GOLD } from '../level/KeyPickup';
const { ccclass, property, executeInEditMode } = _decorator;

const EMPTY = new Color(60, 52, 50, 170);
const EMPTY_EDGE = new Color(250, 240, 222, 200);

/**
 * Ô chìa khoá trên HUD (map thử): N ô hình chìa, chìa nào đã nhặt thì sáng vàng. Hình vẽ bằng code.
 * Kéo node trong HUD để dời; ô Count là số ô, Gap là khoảng cách giữa hai ô.
 */
@ccclass('KeySlots')
@executeInEditMode
export class KeySlots extends Component {
    @property({ tooltip: 'Số ô chìa' })
    count = 2;

    @property({ tooltip: 'Khoảng cách giữa hai ô' })
    gap = 64;

    @property({ tooltip: 'Cỡ chìa' })
    keySize = 18;

    private shown = -1;
    private readonly onKeys = () => this.refresh(true);

    onLoad() {
        this.refresh(false);
    }

    start() {
        if (EDITOR) return;
        GameManager.instance?.keyListeners.push(this.onKeys);
        this.refresh(false);
    }

    onDestroy() {
        const list = GameManager.instance?.keyListeners;
        const i = list ? list.indexOf(this.onKeys) : -1;
        if (list && i >= 0) list.splice(i, 1);
    }

    private refresh(pop: boolean) {
        const have = EDITOR ? 0 : Math.min(this.count, GameManager.instance?.keys ?? 0);
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        for (let i = 0; i < this.count; i++) {
            const lit = i < have;
            drawKey(g, i * this.gap, 0, this.keySize, lit ? KEY_GOLD : EMPTY, lit ? KEY_EDGE : EMPTY_EDGE);
        }
        if (pop && have > this.shown && this.shown >= 0) {
            this.node.setScale(1.3, 1.3, 1);
            tween(this.node).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        }
        this.shown = have;
    }
}
