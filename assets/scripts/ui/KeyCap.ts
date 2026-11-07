import { Color, Graphics, Label, Node, UITransform } from 'cc';
import { setText, UI, uiLabel, uiNode } from './UiKit';

const KEY_BG = new Color(250, 240, 222, 255);
const KEY_EDGE = new Color(78, 60, 56, 255);
const KEY_SHADOW = new Color(40, 30, 28, 160);
const KEY_TEXT = new Color(70, 52, 48, 255);

/** Bề ngang một ô phím có chữ text, cao h. */
export function keyCapWidth(text: string, h: number): number {
    return Math.max(h, text.length * h * 0.42 + h * 0.5);
}

/**
 * Vẽ một ô phím kem viền nâu (có bóng đổ nhẹ phía dưới) ghi chữ text, tâm ở (x, y) trong parent. Trả về node ô phím.
 * Dùng cho dòng gợi ý phím (trang ô lưu) và biển hướng dẫn.
 */
export function keyCap(parent: Node, text: string, x: number, y: number, h = 46): Node {
    const w = keyCapWidth(text, h);
    const n = uiNode(`Key_${text}`, parent, w, h);
    n.setPosition(x, y, 0);
    const g = n.addComponent(Graphics);
    const r = h * 0.22;
    g.fillColor = KEY_SHADOW;
    g.roundRect(-w / 2, -h / 2 - h * 0.12, w, h, r);
    g.fill();
    g.fillColor = KEY_BG;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.fill();
    g.strokeColor = KEY_EDGE;
    g.lineWidth = Math.max(2, h * 0.07);
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.stroke();
    const label: Label = uiLabel(n, '', Math.round(text.length > 1 ? h * 0.48 : h * 0.62), KEY_TEXT, { name: 'Text' });
    setText(label, text);
    return n;
}

/**
 * Một hàng gợi ý: [các ô phím] chữ   [ô phím] chữ ... căn giữa tại (0, y) trong parent (có rightX thì mép phải cả hàng nằm ở rightX).
 * items: [danh sách chữ trên ô phím, chữ mô tả]. Trả về node chứa cả hàng.
 */
export function keyHintRow(parent: Node, items: [string[], string][], y: number, h = 44, fontSize = 28, color: Color = UI.cream, rightX?: number): Node {
    const row = uiNode('KeyHints', parent);
    row.setPosition(0, y, 0);
    const gapKey = 8, gapText = 12, gapItem = 44;
    const parts: { node: Node; w: number }[] = [];
    items.forEach(([keys, text], i) => {
        for (const k of keys) parts.push({ node: keyCap(row, k, 0, 0, h), w: keyCapWidth(k, h) + gapKey });
        const label = uiLabel(row, '', fontSize, color, { outline: UI.brown, outlineWidth: 4 });
        setText(label, text);
        label.updateRenderData(true);
        const w = label.node.getComponent(UITransform)!.width;
        parts.push({ node: label.node, w: w + (i < items.length - 1 ? gapItem : 0) });
        parts[parts.length - 2].w += gapText - gapKey;
    });
    const total = parts.reduce((s, p) => s + p.w, 0);
    if (rightX !== undefined) row.setPosition(rightX - total / 2, y, 0);
    let x = -total / 2;
    for (const p of parts) {
        const ui = p.node.getComponent(UITransform)!;
        p.node.setPosition(x + ui.width / 2, 0, 0);
        x += p.w;
    }
    return row;
}
