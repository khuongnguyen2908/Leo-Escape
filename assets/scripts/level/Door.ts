import { _decorator, CCString, Color, Component, Graphics, Label, Node, tween, Tween, UIOpacity, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { CameraRig } from '../camera/CameraRig';
import { keyShort, Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { keyCap } from '../ui/KeyCap';
import { MenuNav } from '../ui/MenuNav';
import { ScreenFade } from '../ui/ScreenFade';
import { uiNode } from '../ui/UiKit';
const { ccclass, property, executeInEditMode } = _decorator;

const DOOR = new Color(83, 74, 183, 255);
const DOOR_EDGE = new Color(38, 33, 92, 255);
const BUBBLE = new Color(250, 240, 222, 255);
const _me = new Vec3();
const _dest = new Vec3();

/** Vị trí node theo toạ độ lớp Gameplay (cộng dồn vị trí các node cha nằm trong Gameplay, không xoay / phóng). */
export function playPos(node: Node, out: Vec3): Vec3 {
    out.set(node.position);
    let p: Node | null = node.parent;
    while (p && p.name !== 'Gameplay') {
        out.add(p.position);
        p = p.parent;
    }
    return out;
}

/**
 * Cửa sang chỗ khác (phòng riêng: hang, hầm; hay cửa sắt về phố). Hình tạm vẽ bằng code.
 * Leo đứng trước cửa thì hiện bong bóng phím Lên; bấm Lên: màn tối, Leo sang chỗ cửa đích (ô Target), camera nhảy theo, sáng lại.
 * Gốc node là chân cửa (đặt trên mặt đất). Cửa đích thường cũng là một Door trỏ ngược lại.
 */
@ccclass('Door')
@executeInEditMode
export class Door extends Component {
    @property({ type: Node, tooltip: 'Cửa đích: bấm Lên ở đây thì Leo sang đứng ở chân node này' })
    target: Node | null = null;

    @property({ type: CCString, tooltip: 'Chữ ghi trên cửa' })
    get text() { return this._text; }
    set text(v: string) { this._text = v; this.redraw(); }

    @property
    _text = '';

    @property({ tooltip: 'Leo đứng cách cửa trong chừng này (ngang) thì dùng được' })
    range = 110;

    private bubble: Node | null = null;
    private shown = false;
    private wasUp = true;
    private busy = false;

    onLoad() {
        this.redraw();
    }

    start() {
        if (EDITOR) return;
        const b = uiNode('Bubble', this.node, 120, 110);
        b.setPosition(0, 300, 0);
        const g = b.addComponent(Graphics);
        g.fillColor = BUBBLE;
        g.strokeColor = DOOR_EDGE;
        g.lineWidth = 6;
        g.roundRect(-55, -40, 110, 90, 26);
        g.fill();
        g.stroke();
        keyCap(b, keyShort(Settings.key(0, 'up')), 0, 5, 56);
        b.addComponent(UIOpacity).opacity = 0;
        b.active = false;
        b.on(Node.EventType.TOUCH_END, () => { if (this.shown) this.use(); });
        this.bubble = b;
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.fillColor = DOOR;
        g.strokeColor = DOOR_EDGE;
        g.lineWidth = 6;
        g.roundRect(-75, 0, 150, 220, 20);
        g.fill();
        g.stroke();
        let t = this.node.getChildByName('Label');
        if (!t) {
            t = new Node('Label');
            t.layer = this.node.layer;
            this.node.addChild(t);
        }
        t.setPosition(0, 250, 0);
        const label = t.getComponent(Label) ?? t.addComponent(Label);
        label.string = this._text;
        label.fontSize = 30;
        label.lineHeight = 36;
        label.isBold = true;
        label.color = DOOR_EDGE;
    }

    update() {
        if (EDITOR) return;
        const gm = GameManager.instance;
        const cat = gm?.player;
        let near = false;
        if (gm && cat && !this.busy && this.target) {
            const p = cat.node.position, me = playPos(this.node, _me);
            near = !cat.downed && cat.controlEnabled && !gm.cutscene && cat.body.grounded
                && Math.abs(p.x - me.x) < this.range && Math.abs(p.y - me.y) < 120;
        }
        this.show(near);
        const up = !!cat?.controls.upHeld;
        if (near && up && !this.wasUp && !MenuNav.busy) this.use();
        this.wasUp = up;
    }

    private show(on: boolean) {
        const b = this.bubble;
        if (!b || on === this.shown) return;
        this.shown = on;
        const op = b.getComponent(UIOpacity)!;
        Tween.stopAllByTarget(op);
        if (on) {
            b.active = true;
            tween(op).to(0.12, { opacity: 255 }).start();
        } else {
            tween(op).to(0.12, { opacity: 0 }).call(() => { b.active = false; }).start();
        }
    }

    /** Sang cửa đích: khoá mèo, tối màn, dời mèo, camera nhảy theo, sáng lại. */
    use() {
        const gm = GameManager.instance;
        const cat = gm?.player;
        const dest = this.target;
        if (!gm || !cat || !dest || !dest.isValid || this.busy) return;
        this.busy = true;
        this.show(false);
        gm.lockCats(true);
        Sound.play('ui_door', 0.8);
        ScreenFade.blink(() => {
            // Toạ độ cửa đích theo lớp Gameplay (lớp chứa mèo)
            const p = playPos(dest, _dest);
            cat.respawn(new Vec3(p.x, p.y + 10, 0));
            gm.setRespawn(cat.node.position);
            CameraRig.instance?.snapNext();
            gm.lockCats(false);
            this.busy = false;
            this.wasUp = true;
            const other = dest.getComponent(Door);
            if (other) other.wasUp = true;
        }, 0.2, 0.25);
    }
}
