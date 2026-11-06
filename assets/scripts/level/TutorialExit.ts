import { _decorator, Color, Graphics, Node } from 'cc';
import { EDITOR } from 'cc/env';
import { keyShort, Settings } from '../core/Settings';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
import { keyCap } from '../ui/KeyCap';
import { setText, uiLabel, uiNode } from '../ui/UiKit';
import { PlayerTrigger } from './PlayerTrigger';
const { ccclass, executeInEditMode } = _decorator;

const INK = new Color(70, 52, 48, 255);
const WOOD = new Color(196, 160, 120, 255);
const WOOD_DARK = new Color(150, 116, 86, 255);
const PLATE = new Color(250, 240, 222, 255);

/**
 * Cửa EXIT cuối màn hướng dẫn (vẽ tay bằng code). Mèo đứng ở cửa, ô phím Lên nhấp nhô trên đầu cửa; bấm Lên thì gọi onExit
 * (TutorialRoom gắn: màn đen, sang đầu màn chơi, hội thoại). Gốc node = giữa chân cửa.
 */
@ccclass('TutorialExit')
@executeInEditMode
export class TutorialExit extends PlayerTrigger {
    onExit: (() => void) | null = null;

    private key: Node | null = null;
    private time = 0;
    private near = false;
    private readonly onKeys = () => this.drawKey();

    onLoad() {
        this.drawDoor();
        this.drawKey();
        if (!EDITOR) Settings.onChange(this.onKeys);
    }

    onDestroy() {
        Settings.offChange(this.onKeys);
    }

    protected onPlayerEnter(_gm: GameManager, cat: PlayerController) {
        this.near = true;
        if (cat.controls.upHeld && this.onExit) {
            this.used = true;
            this.onExit();
        }
    }

    protected tick(dt: number) {
        if (EDITOR) return;
        this.time += dt;
        // Ô phím nhấp nhô (to hơn khi mèo đứng ở cửa)
        if (this.key) {
            const s = this.near ? 1.15 : 0.9;
            this.key.setScale(s, s, 1);
            this.key.setPosition(0, 330 + Math.abs(Math.sin(this.time * 4)) * 14, 0);
        }
        this.near = false;
    }

    private drawDoor() {
        let n = this.node.getChildByName('Door');
        if (!n) n = uiNode('Door', this.node, 220, 300);
        const g = n.getComponent(Graphics) ?? n.addComponent(Graphics);
        g.clear();
        g.fillColor = new Color(60, 45, 40, 50);
        g.ellipse(0, 0, 130, 14);
        g.fill();
        // Khung cửa
        g.fillColor = WOOD_DARK;
        g.strokeColor = INK;
        g.lineWidth = 5;
        g.rect(-105, 0, 210, 290);
        g.fill();
        g.stroke();
        // Cánh cửa hé mở
        g.fillColor = WOOD;
        g.moveTo(-88, 0);
        g.lineTo(70, 14);
        g.lineTo(70, 262);
        g.lineTo(-88, 274);
        g.close();
        g.fill();
        g.stroke();
        // Biển EXIT
        g.fillColor = PLATE;
        g.rect(-58, 180, 104, 52);
        g.fill();
        g.stroke();
        // Tay nắm
        g.fillColor = INK;
        g.circle(46, 130, 9);
        g.fill();
        if (!n.getChildByName('Plate')) {
            const l = uiLabel(n, '', 34, INK, { name: 'Plate' });
            l.node.setPosition(-6, 206, 0);
            setText(l, 'EXIT');
        }
    }

    private drawKey() {
        if (!this.node.isValid) return;
        for (const old of this.node.children.filter((c) => c.name.startsWith('Key_'))) {
            old.removeFromParent();
            old.destroy();
        }
        this.key = keyCap(this.node, keyShort(Settings.key(0, 'up')).toUpperCase(), 0, 330, 56);
    }
}
