import { Color, director, Graphics, Label, Node, tween, Tween, UITransform, Vec3, view } from 'cc';
import { Sound } from '../core/Sound';
import { T } from './Lang';
import { setText, UI, uiLabel, uiNode } from './UiKit';

const BLACK = new Color(0, 0, 0, 255);

let root: Node | null = null;
let g: Graphics | null = null;
let spinner: Node | null = null;
let spinnerG: Graphics | null = null;
let spinTimer: ReturnType<typeof setInterval> | null = null;
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
    if (spinner?.isValid && spinner.parent) spinner.setSiblingIndex(spinner.parent.children.length - 1);
}

/**
 * Chuyển cảnh kiểu "zoom vào màn đen": lỗ tròn thu nhỏ dần tới khi đen kín (close), rồi nở ra lộ cảnh mới (open).
 * Nằm trên cùng Canvas. Kèm vòng xoay "đang tải" nhỏ giữa màn hình khi đen kín (showLoading).
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

    /** Vòng xoay nhỏ + chữ ĐANG TẢI... giữa màn hình (trên màn đen). */
    showLoading(on: boolean) {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        if (on) {
            if (!spinner || !spinner.isValid) {
                spinner = uiNode('IrisLoading', canvas);
                const s = uiNode('Spin', spinner, 90, 90);
                spinnerG = s.addComponent(Graphics);
                const label: Label = uiLabel(spinner, '', 32, UI.cream);
                label.node.setPosition(0, -90, 0);
                setText(label, T('boot.wait'));
            }
            spinner.active = true;
            bringToFront();
            let a = 0;
            if (spinTimer) clearInterval(spinTimer);
            // setInterval: vẫn quay khi game tạm dừng / đang tải
            spinTimer = setInterval(() => {
                if (!spinnerG || !spinnerG.isValid) return;
                a += 0.22;
                spinnerG.clear();
                spinnerG.lineWidth = 9;
                spinnerG.strokeColor = UI.creamDim;
                spinnerG.circle(0, 0, 34);
                spinnerG.stroke();
                spinnerG.strokeColor = UI.accent;
                spinnerG.arc(0, 0, 34, a, a + Math.PI * 0.6, true);
                spinnerG.stroke();
            }, 30);
        } else {
            if (spinTimer) clearInterval(spinTimer);
            spinTimer = null;
            if (spinner && spinner.isValid) spinner.active = false;
        }
    },
};
