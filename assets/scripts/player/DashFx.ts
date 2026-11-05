import { _decorator, Color, Component, Graphics, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { DustPuff } from './DustPuff';
const { ccclass } = _decorator;

// Cùng tông xanh với bộ vệt chém SlashFX
const GLOW = new Color(90, 200, 255, 255);
const BODY = new Color(170, 235, 255, 255);
const CORE = new Color(255, 255, 255, 255);
const LINE = new Color(190, 240, 255, 255);
const FADE = 0.28;
/** Vệt quét ngang xanh (bộ SlashFX Combo3) kéo dài theo đường lướt. */
const STREAK = 'FX_sweep_';
/** Khung 1 của ảnh vệt: phần có hình rộng 63 điểm ảnh, tâm lệch 23.5 về phía trước so với tâm ảnh. */
const STREAK_W = 63;
const STREAK_DX = 23.5;
const STREAK_SY = 4.5;

/**
 * Vệt lướt: vệt quét xanh (ảnh FX_sweep_) kéo dài từ chỗ bắt đầu lướt tới chỗ mèo đang ở, kèm vài đường gió.
 * Hết lướt thì chạy nốt các khung còn lại của vệt (tan dần) rồi tự xoá.
 * Ảnh chưa tải xong thì vẽ dải sáng xanh bằng code.
 */
@ccclass('DashFx')
export class DashFx extends Component {
    private g!: Graphics;
    private dir = 1;
    private length = 0;
    private fading = -1;
    private lines: { y: number; from: number; to: number }[] = [];
    private streak: Sprite | null = null;
    private streakOpacity: UIOpacity | null = null;

    static preload() {
        DustPuff.preload(STREAK);
    }

    /** Tạo vệt tại (x, y) trong node cha (lớp Gameplay); dir là hướng lướt. */
    static spawn(parent: Node, x: number, y: number, dir: number): DashFx {
        const n = new Node('DashFx');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x, y, 0);
        const fx = n.addComponent(DashFx);
        fx.dir = dir >= 0 ? 1 : -1;
        fx.g = n.addComponent(Graphics);
        for (let i = 0; i < 5; i++) {
            fx.lines.push({ y: (Math.random() - 0.5) * 140, from: Math.random() * 0.4, to: 0.5 + Math.random() * 0.45 });
        }
        const frames = DustPuff.frames(STREAK);
        if (frames.length > 0) {
            const s = new Node('Streak');
            s.layer = parent.layer;
            n.addChild(s);
            const sp = s.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.RAW;
            sp.trim = false;
            sp.spriteFrame = frames[0];
            s.getComponent(UITransform)!.setAnchorPoint(0.5, 0.5);
            fx.streak = sp;
            fx.streakOpacity = s.addComponent(UIOpacity);
        }
        return fx;
    }

    /** Kéo dài vệt tới toạ độ x (trong node cha) của mèo. */
    extendTo(x: number) {
        this.length = Math.max(this.length, (x - this.node.position.x) * this.dir);
        this.draw(1);
    }

    /** Hết lướt: vệt tan dần rồi xoá. */
    release() {
        this.fading = 0;
    }

    update(dt: number) {
        if (this.fading < 0) return;
        this.fading += dt;
        if (this.fading >= FADE) {
            this.node.destroy();
            return;
        }
        const t = this.fading / FADE;
        // Vệt ảnh: chạy nốt các khung còn lại (tan dần)
        const frames = DustPuff.frames(STREAK);
        if (this.streak && frames.length > 1) {
            const i = Math.min(frames.length - 1, 1 + Math.floor(t * (frames.length - 1)));
            this.streak.spriteFrame = frames[i];
        }
        this.draw(1 - t);
    }

    private draw(alpha: number) {
        const g = this.g;
        g.clear();
        const len = this.length;
        if (len < 4) return;
        // Đường gió mảnh phía trên và dưới
        const line = LINE.clone();
        line.a = Math.round(150 * alpha);
        g.strokeColor = line;
        g.lineWidth = 4;
        for (const l of this.lines) {
            g.moveTo(this.dir * len * l.from, l.y);
            g.lineTo(this.dir * len * l.to, l.y);
            g.stroke();
        }
        if (this.streak) {
            // Ảnh vệt giãn ngang cho phần có hình phủ đúng đoạn đã lướt
            const sx = len / STREAK_W;
            this.streak.node.setScale(this.dir * sx, STREAK_SY, 1);
            this.streak.node.setPosition(this.dir * (len / 2 - STREAK_DX * sx), 0, 0);
            if (this.streakOpacity) this.streakOpacity.opacity = Math.round(255 * Math.max(0, Math.min(1, alpha * 1.4)));
            return;
        }
        // Chưa có ảnh: dải sáng xanh, nhọn ở đuôi (chỗ bắt đầu), dày nhất gần đầu (chỗ mèo)
        this.band(g, len, 44, GLOW, 0.35 * alpha);
        this.band(g, len, 26, BODY, 0.95 * alpha);
        this.band(g, len, 9, CORE, alpha);
    }

    private band(g: Graphics, len: number, thick: number, color: Color, alpha: number) {
        const c = color.clone();
        c.a = Math.round(255 * Math.max(0, Math.min(1, alpha)));
        g.fillColor = c;
        const d = this.dir;
        const head = len * 0.88;
        g.moveTo(0, 0);
        g.lineTo(d * head, thick / 2);
        g.lineTo(d * len, 0);
        g.lineTo(d * head, -thick / 2);
        g.close();
        g.fill();
    }
}
