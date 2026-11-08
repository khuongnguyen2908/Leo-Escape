import { Label, resources, TTFFont } from 'cc';
import { EDITOR } from 'cc/env';

/**
 * Font chung của game: assets/resources/fonts/SuperBouncer.ttf.
 * Gọi useGameFont(label) ngay sau khi tạo Label; font tải xong thì tự gắn vào.
 * Muốn đổi font: chép file .ttf mới đè lên với cùng tên.
 */
const PATH = 'fonts/SuperBouncer';

let font: TTFFont | null = null;
let failed = false;
let loading = false;
const waiting: Label[] = [];

/** Label đã chuyển sang font hệ thống (chữ có dấu tiếng Việt): font game tải xong muộn cũng không gắn đè. */
const systemOnly = new WeakSet<Label>();

export function keepSystemFont(label: Label, on: boolean) {
    if (on) systemOnly.add(label);
    else systemOnly.delete(label);
}

function apply(label: Label, f: TTFFont) {
    if (!label.isValid || systemOnly.has(label)) return;
    label.useSystemFont = false;
    label.font = f;
    label.isBold = false; // font đã đậm sẵn, in đậm thêm sẽ bị nhoè
}

export function useGameFont(label: Label) {
    // Trong editor không tải được font qua resources (chỉ tải được lúc chạy game): giữ font hệ thống, khỏi báo lỗi
    if (EDITOR) return;
    if (font) {
        apply(label, font);
        return;
    }
    if (failed) return;
    waiting.push(label);
    if (loading) return;
    loading = true;
    resources.load(PATH, TTFFont, (err, f) => {
        loading = false;
        if (err || !f) {
            failed = true;
            console.warn(`[GameFont] Không tải được font assets/resources/${PATH}.ttf, dùng font hệ thống.`, err);
        } else {
            font = f;
            for (const l of waiting) apply(l, f);
        }
        waiting.length = 0;
    });
}
