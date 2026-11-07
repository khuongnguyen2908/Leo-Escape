import { Color, director, Graphics, Node, tween, Tween, UITransform, Vec3, view } from 'cc';
import { Sound } from '../core/Sound';
import { LoadingScreen } from './LoadingScreen';
import { uiNode } from './UiKit';

const BLACK = new Color(0, 0, 0, 255);

let root: Node | null = null;
let g: Graphics | null = null;
const state = { r: 0, cx: 0, cy: 0 };

function maxRadius(): number {
    const d = view.getDesignResolutionSize();
    return Math.hypot(d.width, d.height) * 0.6 + 200;
}

function getRoot(): Node | null {
    if (root && root.isValid) return root;
    const canvas = director.getScene()?.getChildByName('Canvas');
    if (!canvas) return null;
    root = uiNode('IrisWipe', canvas);
    g = root.addComponent(Graphics);
    root.active = false;
    return root;
}

/** Vẽ màn đen chừa một lỗ tròn bán kính r ở (cx, cy): vòng tròn nét rất dày, mép trong là mép lỗ. */
function draw() {
    if (!g || !g.isValid) return;
    g.clear();
    const d = view.getDesignResolutionSize();
    const far = Math.hypot(d.width, d.height) * 2;
    g.fillColor = BLACK;
    if (state.r <= 1) {
        g.rect(-far, -far, far * 2, far * 2);
        g.fill();
        return;
    }
    g.strokeColor = BLACK;
    g.lineWidth = far;
    g.circle(state.cx, state.cy, state.r + far / 2);
    g.stroke();
}

function bringToFront() {
    const n = getRoot();
    if (n?.parent) n.setSiblingIndex(n.parent.children.length - 1);
}

/**
 * Chuyển cảnh kiểu "zoom vào màn đen": lỗ tròn thu nhỏ dần tới khi đen kín (close), rồi nở ra lộ cảnh mới (open).
 * Nằm trên cùng Canvas. Đen kín thì hiện màn tải (showLoading → LoadingScreen).
 */
export const IrisWipe = {
    /** Chỗ của node trên màn hình (toạ độ Canvas), dùng làm tâm lỗ tròn (zoom ra từ chỗ mèo đứng). dy: nâng lên. */
    centerOf(node: Node | null | undefined, dy = 80): [number, number] {
        const canvas = director.getScene()?.getChildByName('Canvas');
        const ui = canvas?.getComponent(UITransform);
        if (!node || !node.isValid || !ui) return [0, 0];
        const p = new Vec3();
        ui.convertToNodeSpaceAR(node.worldPosition, p);
        return [p.x, p.y + dy];
    },

    /** Đang đen kín (đã close xong, chưa open). */
    get closed() { return !!root && root.isValid && root.active && state.r <= 1; },

    /** Lỗ tròn thu từ to về 0 (tâm (cx, cy) theo toạ độ Canvas, mặc định giữa màn hình) trong time giây. */
    close(time: number, done?: () => void, cx = 0, cy = 0) {
        const n = getRoot();
        if (!n) {
            done?.();
            return;
        }
        n.active = true;
        bringToFront();
        Tween.stopAllByTarget(state);
        state.cx = cx;
        state.cy = cy;
        state.r = Math.max(state.r, maxRadius());
        draw();
        Sound.play('ui_zoom_in', 0.8);
        tween(state).to(time, { r: 0 }, { easing: 'quadIn', onUpdate: draw }).call(() => {
            draw();
            done?.();
        }).start();
    },

    /** Lỗ tròn nở từ 0 ra hết màn hình (tâm (cx, cy)) rồi tắt. */
    open(time: number, done?: () => void, cx = 0, cy = 0) {
        const n = getRoot();
        if (!n) {
            done?.();
            return;
        }
        n.active = true;
        bringToFront();
        Tween.stopAllByTarget(state);
        state.cx = cx;
        state.cy = cy;
        state.r = 0;
        draw();
        Sound.play('ui_zoom_out', 0.8);
        tween(state).to(time, { r: maxRadius() + Math.hypot(cx, cy) }, { easing: 'quadOut', onUpdate: draw }).call(() => {
            n.active = false;
            done?.();
        }).start();
    },

    /** Màn tải (LoadingScreen) trên màn đen: on = hiện; tắt thì mờ về đen rồi gọi done. */
    showLoading(on: boolean, done?: () => void) {
        if (on) LoadingScreen.show();
        else LoadingScreen.hide(done);
    },
};
