import { _decorator, Color, Component, Graphics } from 'cc';
import { DustPuff } from './DustPuff';
const { ccclass } = _decorator;

const GLOW = new Color(255, 196, 110, 255);
const BODY = new Color(255, 247, 228, 255);
const CORE = new Color(255, 255, 255, 255);

/** Kiểu vệt chém theo nhịp combo: [góc đầu, góc cuối (độ, quay mặt sang phải), bán kính, độ dày, tâm y] */
const STYLES: [number, number, number, number, number][] = [
    [115, -45, 110, 34, 90],  // nhát 1: chém từ trên xuống
    [-55, 105, 110, 34, 80],  // nhát 2: hất từ dưới lên
    [160, -80, 145, 46, 95],  // nhát 3: vung rộng, mạnh nhất
];

/**
 * Kiểu vệt chém bằng ảnh FX_slash_ theo nhịp combo: [x phía trước, y tâm, phóng to, lật dọc].
 * Ảnh gốc quét từ dưới lên; lật dọc thành chém từ trên xuống.
 */
const IMAGE_STYLES: [number, number, number, boolean][] = [
    [70, 85, 3.5, true],   // nhát 1: chém từ trên xuống
    [70, 80, 3.5, false],  // nhát 2: hất từ dưới lên
    [80, 90, 4.9, true],   // nhát 3: to nhất
];

/**
 * Vệt chém hình lưỡi liềm của Leo, gắn trên node con của mèo.
 * Có ảnh art/fx/FX_slash_1, 2... thì chạy ảnh; chưa có thì vẽ bằng code: quét nhanh theo cung tròn,
 * dày ở giữa, nhọn hai đầu, rồi mờ dần.
 */
@ccclass('SlashFx')
export class SlashFx extends Component {
    /** Thời gian quét hết cung */
    sweepTime = 0.08;
    /** Thời gian mờ dần sau khi quét */
    fadeTime = 0.14;
    /** Tốc độ khung ảnh vệt chém (khung/giây) */
    imageFps = 24;

    private g: Graphics | null = null;
    private t = -1;
    private facing = 1;
    private style = 0;

    play(facing: number, combo: number) {
        this.facing = facing >= 0 ? 1 : -1;
        this.style = Math.max(0, Math.min(STYLES.length - 1, combo));
        if (DustPuff.ready(DustPuff.SLASH)) {
            const [x, y, scale, flipY] = IMAGE_STYLES[this.style];
            DustPuff.spawn(DustPuff.SLASH, this.node, this.facing * x, y,
                { dir: this.facing, flipY, scale, fps: this.imageFps, center: true });
            return;
        }
        this.t = 0;
        this.draw();
    }

    update(dt: number) {
        if (this.t < 0) return;
        this.t += dt;
        if (this.t > this.sweepTime + this.fadeTime) {
            this.t = -1;
            this.g?.clear();
            return;
        }
        this.draw();
    }

    private draw() {
        if (!this.g) this.g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        const g = this.g;
        g.clear();
        const [a0, a1, r, thick, cy] = STYLES[this.style];
        const head = Math.min(1, this.t / this.sweepTime);
        const tail = Math.max(0, (this.t - this.sweepTime * 0.6) / (this.fadeTime + this.sweepTime * 0.4));
        if (head - tail < 0.02) return;
        const alpha = 1 - Math.max(0, (this.t - this.sweepTime) / this.fadeTime);

        // Quầng cam ấm bên ngoài, thân màu kem, lõi trắng sát mép ngoài
        this.crescent(g, a0, a1, r + 8, thick + 16, cy, tail, head, GLOW, 0.35 * alpha);
        this.crescent(g, a0, a1, r, thick, cy, tail, head, BODY, 0.95 * alpha);
        this.crescent(g, a0, a1, r, thick * 0.35, cy, tail, head, CORE, alpha);
    }

    /** Dải lưỡi liềm từ u0 đến u1 (0..1 dọc theo cung), dày nhất ở giữa đoạn. */
    private crescent(g: Graphics, a0: number, a1: number, r: number, thick: number, cy: number,
        u0: number, u1: number, color: Color, alpha: number) {
        const STEPS = 18;
        const f = this.facing;
        const cx = 30;
        const outer: number[] = [];
        const inner: number[] = [];
        for (let i = 0; i <= STEPS; i++) {
            const s = i / STEPS;
            const u = u0 + (u1 - u0) * s;
            const ang = (a0 + (a1 - a0) * u) * Math.PI / 180;
            const w = thick * Math.pow(Math.sin(Math.PI * s), 0.8);
            const cos = Math.cos(ang), sin = Math.sin(ang);
            outer.push(f * (cx + cos * r), cy + sin * r);
            inner.push(f * (cx + cos * (r - w)), cy + sin * (r - w));
        }
        const c = color.clone();
        c.a = Math.round(255 * Math.max(0, Math.min(1, alpha)));
        g.fillColor = c;
        g.moveTo(outer[0], outer[1]);
        for (let i = 2; i < outer.length; i += 2) g.lineTo(outer[i], outer[i + 1]);
        for (let i = inner.length - 2; i >= 0; i -= 2) g.lineTo(inner[i], inner[i + 1]);
        g.close();
        g.fill();
    }
}
