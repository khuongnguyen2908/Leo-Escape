import { EffectAsset, Material, resources } from 'cc';

/** Shader tô một màu: hình giữ nguyên dáng (độ trong), màu thay bằng màu của Sprite (Sprite.color) */
const EFFECT = 'effects/sprite-silhouette';

let material: Material | null = null;
let waiting: ((m: Material) => void)[] | null = null;

/**
 * Lấy vật liệu tô một màu (tải một lần, dùng chung): gán sprite.customMaterial = m thì hình thành bóng một màu
 * theo sprite.color (trắng = loé trắng). Dùng cho chân mèo dấu tự lưu, kẻ địch nháy trắng khi trúng đòn.
 * Chưa tải được shader thì không gọi done.
 */
export function loadSilhouette(done: (m: Material) => void) {
    if (material) {
        done(material);
        return;
    }
    if (waiting) {
        waiting.push(done);
        return;
    }
    waiting = [done];
    resources.load(EFFECT, EffectAsset, (err, effect) => {
        const list = waiting ?? [];
        waiting = null;
        if (err || !effect) return;
        const m = new Material();
        m.initialize({ effectAsset: effect, defines: { USE_TEXTURE: true } });
        material = m;
        for (const cb of list) cb(m);
    });
}
