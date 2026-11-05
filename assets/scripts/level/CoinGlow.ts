import { _decorator, Component, Graphics, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform } from 'cc';
import { EDITOR } from 'cc/env';
import { SoftGlow } from './SoftGlow';
const { ccclass, property, executeInEditMode } = _decorator;

/** Ảnh quầng sáng trong assets/resources/art (cùng khung 110×110 với MG_coin, đặt chồng đúng tâm cá) */
const GLOW_BIG = 'art/MG_coin_glow_1/spriteFrame';
const GLOW_SMALL = 'art/MG_coin_glow_2/spriteFrame';

/** Đốm bokeh nhỏ quanh cá: [lệch ngang, lệch dọc, cỡ] tính theo bề ngang cá; mỗi đốm sống một vòng idle, lệch pha 1/4 */
const SPOTS: [number, number, number][] = [[-0.28, 0.14, 0.34], [0.26, 0.05, 0.26], [-0.14, -0.18, 0.22], [0.32, -0.25, 0.3]];
const IDLE = 2.4;
const BURST = 0.45;

const wave = (t: number, period: number, phase = 0) => Math.sin((t / period + phase) * Math.PI * 2);
const easeOut = (k: number) => 1 - (1 - k) * (1 - k);

/**
 * Hào quang sau con cá vàng. Node hào quang nằm ngay trước con cá trong cùng lớp, nên được vẽ phía sau cá;
 * tự bám theo cá, kể cả khi bạn kéo cá trong editor.
 * Có ảnh MG_coin_glow_1 / MG_coin_glow_2 (lúc chơi): quầng sáng kiểu bokeh — hai quầng trôi vòng nhỏ lệch nhịp, sáng mờ theo nhịp thở,
 * vài đốm sáng nhỏ trôi lên rồi tắt; cá bị ăn thì quầng nở to thành vòng rồi tan (burst).
 * Chưa có ảnh (hoặc trong editor): quầng tròn vẽ bằng code (SoftGlow) phập phồng.
 */
@ccclass('CoinGlow')
@executeInEditMode
export class CoinGlow extends Component {
    @property({ type: Node, tooltip: 'Con cá cần toả sáng' })
    target: Node | null = null;

    @property({ tooltip: 'Quầng vẽ bằng code (chưa có ảnh): phập phồng nhiều bao nhiêu khi chơi (0.08 = 8%)' })
    pulse = 0.08;

    private time = 0;
    private fading = false;
    /** Lớp ảnh: quầng to, quầng nhỏ, các đốm (đã tải xong ảnh mới có) */
    private big: Node | null = null;
    private small: Node | null = null;
    private dots: Node[] = [];
    private bursting = -1;
    private lastX = 0;
    private lastY = 0;
    private lastW = 110;

    start() {
        if (EDITOR) return;
        this.time = Math.random() * IDLE; // các con cá không thở cùng nhịp
        resources.load([GLOW_BIG, GLOW_SMALL], SpriteFrame, (err, frames) => {
            if (err || !frames || frames.length < 2 || !this.isValid) return;
            this.useImages(frames[0], frames[1]);
        });
    }

    /** Đã có ảnh: tắt quầng vẽ bằng code, dựng các lớp ảnh làm con của node hào quang. */
    private useImages(bigFrame: SpriteFrame, smallFrame: SpriteFrame) {
        const g = this.getComponent(Graphics);
        if (g) g.enabled = false;
        const soft = this.getComponent(SoftGlow);
        if (soft) soft.enabled = false;
        const layer = (name: string, frame: SpriteFrame) => {
            const n = new Node(name);
            n.layer = this.node.layer;
            this.node.addChild(n);
            n.addComponent(UITransform);
            const sp = n.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.RAW;
            sp.trim = false;
            sp.spriteFrame = frame;
            n.addComponent(UIOpacity);
            return n;
        };
        this.big = layer('GlowBig', bigFrame);
        this.small = layer('GlowSmall', smallFrame);
        this.dots = SPOTS.map((_, i) => layer(`Bokeh${i}`, smallFrame));
    }

    /** Cá bị ăn: quầng nở thành vòng rồi tan, đốm tắt; xong tự xoá (CoinPickup gọi). */
    burst() {
        if (this.bursting >= 0) return;
        this.bursting = 0;
        if (!this.big) this.fadeOut();
    }

    lateUpdate(dt: number) {
        const t = this.target;
        // Đang nổ: giữ cỡ và chỗ con cá lúc bị ăn (cá đang teo đi, bám theo thì quầng teo theo thay vì nở ra)
        if (this.bursting < 0 && t && t.isValid) {
            // Tâm con cá: gốc cá ở đáy-giữa, nên cộng nửa chiều cao đã nhân tỉ lệ
            const ut = t.getComponent(UITransform);
            const cy = ut ? (0.5 - ut.anchorY) * ut.height * Math.abs(t.scale.y) : 0;
            const p = t.position;
            this.lastX = p.x;
            this.lastY = p.y + cy;
            this.lastW = (ut ? ut.width : 110) * Math.abs(t.scale.x);
        } else if (this.bursting < 0) {
            if (!EDITOR && !this.fading) this.fadeOut();
            return;
        }
        this.node.setPosition(this.lastX, this.lastY, this.node.position.z);
        this.time += dt;

        if (!this.big || !this.small) {
            const k = EDITOR ? 1 : 1 + this.pulse * Math.sin(this.time * 3);
            this.node.setScale(k, k, 1);
            return;
        }
        this.node.setScale(1, 1, 1);
        // Ảnh quầng cùng khung với ảnh cá: phóng theo bề ngang cá đang hiện
        const base = this.lastW / Math.max(1, this.big.getComponent(UITransform)!.width);
        // u: đổi lệch (tính theo bề ngang cá 220 trong bản phác) ra đơn vị trong màn
        const u = this.lastW / 220;

        if (this.bursting >= 0) {
            this.bursting += dt;
            const k1 = Math.min(1, this.bursting / 0.4), k2 = Math.min(1, this.bursting / 0.3), kd = Math.min(1, this.bursting / 0.2);
            this.set(this.big, 0, 0, base * (1 + 0.9 * easeOut(k1)), 1 - k1);
            this.set(this.small, 0, 0, base * (1 + 1.1 * easeOut(k2)), 1 - k2);
            for (const d of this.dots) {
                const op = d.getComponent(UIOpacity)!;
                op.opacity = Math.round(op.opacity * (1 - kd));
            }
            if (this.bursting >= BURST) this.node.destroy();
            return;
        }

        const tt = this.time;
        // Hai quầng trôi theo vòng nhỏ, lệch nhịp nhau, vừa trôi vừa sáng mờ
        this.set(this.big, 12 * u * wave(tt, 2.4), 10 * u * wave(tt, 2.4, 0.25), base * (1 + 0.05 * wave(tt, 2.4)), 0.8 + 0.2 * wave(tt, 2.4));
        this.set(this.small, -9 * u * wave(tt, 1.6, 0.25), 8 * u * wave(tt, 1.6), base * (0.95 + 0.05 * wave(tt, 1.2)), 0.85 - 0.15 * wave(tt, 1.2));
        // Đốm bokeh: hiện dần, trôi lên, tắt; nối nhau đều đặn
        SPOTS.forEach(([sx, sy, size], i) => {
            const life = ((tt / IDLE) + i * 0.25) % 1;
            const a = Math.sin(life * Math.PI) * 0.9;
            this.set(this.dots[i], sx * this.lastW, (-sy * this.lastW) + 40 * u * life, base * size, a);
        });
    }

    private set(n: Node, x: number, y: number, scale: number, alpha: number) {
        n.setPosition(x, y, 0);
        n.setScale(scale, scale, 1);
        n.getComponent(UIOpacity)!.opacity = Math.round(255 * Math.max(0, Math.min(1, alpha)));
    }

    private fadeOut() {
        this.fading = true;
        const op = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        const step = () => {
            if (!this.node.isValid) return;
            op.opacity = Math.max(0, op.opacity - 40);
            if (op.opacity <= 0) this.node.destroy();
            else this.scheduleOnce(step, 0.03);
        };
        step();
    }
}
