import { Color, EffectAsset, Graphics, Material, Node, resources, Sprite, SpriteFrame } from 'cc';
import { MENU_OUTLINE } from './MenuStyle';
import { uiNode } from './UiKit';

/** Ảnh chân mèo (dùng chung với hoạ tiết màn tải) và shader tô một màu */
const PAW_IMAGE = 'art/Loading_pattern/Icon_paw';
const SILHOUETTE_EFFECT = 'effects/sprite-silhouette';
/** Viền: 8 bản tô nâu lệch quanh hình chừng này đơn vị */
const OUTLINE = 4;
const GLOW = new Color(255, 244, 220, 255);

/** Vẽ chân mèo (đệm thịt + 4 ngón) tâm (0, 0), cỡ r: hình tạm khi chưa có ảnh. */
export function drawPaw(g: Graphics, r: number, color: Color) {
    g.fillColor = color;
    g.ellipse(0, -r * 0.28, r * 0.62, r * 0.5);
    g.fill();
    const toes: [number, number, number][] = [[-0.62, 0.3, 0.22], [-0.24, 0.62, 0.24], [0.24, 0.62, 0.24], [0.62, 0.3, 0.22]];
    for (const [x, y, s] of toes) {
        g.ellipse(x * r, y * r, s * r, s * r * 1.2);
        g.fill();
    }
}

let material: Material | null = null;

/** Chân mèo Icon_paw tô một màu: node gốc + điều khiển quầng sáng. */
export interface PawIcon {
    node: Node;
    /** Quầng sáng phía sau: 0 = tắt, 1 = sáng nhất */
    setGlow(k: number): void;
}

/**
 * Chân mèo Icon_paw tô trắng, viền nâu, có quầng sáng phía sau (mặc định tắt), cạnh dài nhất = size.
 * Ảnh tải xong mới hiện; chưa có ảnh / shader thì vẽ chân mèo tạm bằng code. Dùng cho dấu tự lưu và màn thông báo tự lưu.
 */
export function pawIcon(parent: Node, size: number, fill: Color = Color.WHITE): PawIcon {
    const root = uiNode('Paw', parent, size, size);
    const glow = uiNode('Glow', root);
    const outline = uiNode('Outline', root);
    const body = uiNode('Body', root);
    const glowSprites: Sprite[] = [];
    let glowK = 0;
    const tmp = body.addComponent(Graphics);
    drawPaw(tmp, size * 0.45, fill);
    const build = (sf: SpriteFrame, mat: Material) => {
        if (!root.isValid) return;
        tmp.clear();
        const k = size / Math.max(sf.rect.width, sf.rect.height);
        const sprite = (parentNode: Node, color: Color, x = 0, y = 0, s = 1) => {
            const n = uiNode('Pic', parentNode);
            n.setPosition(x, y, 0);
            n.setScale(k * s, k * s, 1);
            const sp = n.addComponent(Sprite);
            sp.spriteFrame = sf;
            sp.customMaterial = mat;
            sp.color = color;
            return sp;
        };
        // Quầng sáng: vài bản tô sáng to dần, rất mờ (độ đậm đổi theo setGlow)
        for (const s of [1.25, 1.45, 1.7]) glowSprites.push(sprite(glow, new Color(GLOW.r, GLOW.g, GLOW.b, 0), 0, 0, s));
        // Viền nâu: 8 bản lệch quanh hình
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            sprite(outline, MENU_OUTLINE, Math.cos(a) * OUTLINE, Math.sin(a) * OUTLINE);
        }
        // Thân: tô đúng một màu (trên Pic con, không đè Graphics hình tạm trên cùng node)
        const bodyPic = uiNode('Fill', root);
        bodyPic.setScale(k, k, 1);
        const sp = bodyPic.addComponent(Sprite);
        sp.spriteFrame = sf;
        sp.customMaterial = mat;
        sp.color = fill;
        apply();
    };
    const apply = () => {
        glowSprites.forEach((sp, i) => {
            if (sp.isValid) sp.color = new Color(GLOW.r, GLOW.g, GLOW.b, Math.round(glowK * (70 - i * 18)));
        });
    };
    resources.load(`${PAW_IMAGE}/spriteFrame`, SpriteFrame, (err, sf) => {
        if (err || !sf) return;
        if (material) {
            build(sf, material);
            return;
        }
        resources.load(SILHOUETTE_EFFECT, EffectAsset, (e2, effect) => {
            if (e2 || !effect) return;
            if (!material) {
                material = new Material();
                material.initialize({ effectAsset: effect, defines: { USE_TEXTURE: true } });
            }
            build(sf, material);
        });
    });
    return {
        node: root,
        setGlow(k: number) {
            glowK = Math.max(0, Math.min(1, k));
            apply();
        },
    };
}
