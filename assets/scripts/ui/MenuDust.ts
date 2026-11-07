import { _decorator, Component, Node, resources, Sprite, SpriteFrame, UIOpacity, view } from 'cc';
import { uiNode } from './UiKit';
const { ccclass } = _decorator;

/** Ảnh bụi (hạt trắng li ti trên nền trong suốt) trong assets/resources/art */
const DUST_IMAGE = 'art/BG_bui';

/** Mỗi lớp: phóng ảnh, tốc độ trôi (sang phải, xuống dưới; đơn vị/giây), độ đậm, lật ngang cho khác hình lớp kia */
const LAYERS = [
    { scale: 1.0, vx: 34, vy: 20, opacity: 130, flip: false },
    { scale: 1.7, vx: 78, vy: 46, opacity: 210, flip: true },
];

interface Layer {
    node: Node;
    op: UIOpacity;
    tw: number;
    th: number;
    vx: number;
    vy: number;
    ox: number;
    oy: number;
    base: number;
}

/**
 * Bụi trôi ngoài menu: lát ảnh BG_bui kín khung hình thành 2 lớp (xa: nhỏ, chậm, mờ; gần: to, nhanh, rõ),
 * trôi chéo từ trên trái xuống dưới phải, lặp mãi, độ đậm nhấp nháy rất nhẹ.
 * LandingScreen tạo node Dust ngay trên ảnh nền menu (MenuBg) nên menu, trang ô lưu, trang độ khó đều thấy.
 * Chạy theo giờ thật (setInterval) chứ không theo update: mở Cài đặt là game tạm dừng (director.pause) mà bụi vẫn trôi.
 */
@ccclass('MenuDust')
export class MenuDust extends Component {
    private layers: Layer[] = [];
    private time = 0;
    private timer: ReturnType<typeof setInterval> | null = null;
    private last = 0;

    onLoad() {
        resources.load(`${DUST_IMAGE}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (err || !sf || !this.isValid) return;
            this.build(sf);
        });
    }

    private build(sf: SpriteFrame) {
        const d = view.getDesignResolutionSize();
        for (const L of LAYERS) {
            const tw = sf.rect.width * L.scale, th = sf.rect.height * L.scale;
            // Thừa một ô mỗi chiều để lúc trôi không lộ mép
            const cols = Math.ceil(d.width / tw) + 2, rows = Math.ceil(d.height / th) + 2;
            const node = uiNode('Layer', this.node);
            const x0 = -d.width / 2 - tw, y0 = d.height / 2 + th;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const tile = uiNode('Tile', node);
                    tile.addComponent(Sprite).spriteFrame = sf;
                    tile.setScale(L.flip ? -L.scale : L.scale, L.scale, 1);
                    tile.setPosition(x0 + c * tw + tw / 2, y0 - r * th - th / 2, 0);
                }
            }
            const op = node.addComponent(UIOpacity);
            op.opacity = L.opacity;
            this.layers.push({ node, op, tw, th, vx: L.vx, vy: L.vy, ox: Math.random() * tw, oy: Math.random() * th, base: L.opacity });
        }
    }

    onEnable() {
        this.last = Date.now();
        if (!this.timer) this.timer = setInterval(() => this.tick(), 16);
    }

    onDisable() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    private tick() {
        if (!this.node.isValid) {
            this.onDisable();
            return;
        }
        const now = Date.now();
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        if (!this.node.activeInHierarchy) return;
        this.time += dt;
        this.layers.forEach((L, i) => {
            // Trôi sang phải và xuống dưới; đi hết một ô thì quay về 0 (các ô giống nhau nên không thấy giật)
            L.ox = (L.ox + L.vx * dt) % L.tw;
            L.oy = (L.oy + L.vy * dt) % L.th;
            L.node.setPosition(L.ox, -L.oy, 0);
            L.op.opacity = Math.round(L.base * (0.85 + 0.15 * Math.sin(this.time * 0.9 + i * 1.7)));
        });
    }
}
