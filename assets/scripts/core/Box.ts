import { Node, Rect, Size, UITransform, Vec2 } from 'cc';

/**
 * Tính hộp va chạm của node trong không gian node cha.
 * - size > 0: hộp tự đặt, tâm = vị trí node + offset.
 * - size = 0: lấy khung UITransform (đã tính anchor và scale) rồi dịch theo offset.
 */
export function computeBox(node: Node, size: Size, offset: Vec2, out: Rect): Rect {
    const p = node.position;
    if (size.width > 0 && size.height > 0) {
        out.set(p.x + offset.x - size.width / 2, p.y + offset.y - size.height / 2, size.width, size.height);
        return out;
    }
    const ui = node.getComponent(UITransform);
    if (ui) {
        const b = ui.getBoundingBox();
        out.set(b.x + offset.x, b.y + offset.y, b.width, b.height);
    } else {
        out.set(p.x, p.y, 0, 0);
    }
    return out;
}

/** Hai hộp chồng lên nhau (chạm mép không tính). */
export function overlaps(a: Rect, b: Rect): boolean {
    return a.xMin < b.xMax && a.xMax > b.xMin && a.yMin < b.yMax && a.yMax > b.yMin;
}

export function clamp(v: number, min: number, max: number): number {
    return v < min ? min : v > max ? max : v;
}

export function moveTowards(current: number, target: number, maxDelta: number): number {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
}
