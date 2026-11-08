import { _decorator, Color, Component, Graphics, Node } from 'cc';
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
 * Vệt chém bằng ảnh (bộ SlashFX Combos, cắt bằng tools/cat_khoi.py) theo nhịp combo 5 nhát:
 * [bộ ảnh, x tâm ảnh phía trước, y tâm ảnh so với chân, phóng to, lật ngang ảnh, vẽ sau lưng mèo].
 * Ảnh gốc quay mặt sang phải; lật ngang thì vệt cong ngược lại nhưng vẫn nằm phía trước (x không đổi dấu).
 * Số đo 05/11/2026 bằng cách ghép từng khung lên hình Leo cao 207: vệt lớn nhất cỡ ngang thân mèo,
 * nhát 3–5 to hơn (rộng 290–380). Ô ảnh cắt lấy tâm ô gốc làm tâm, nên y có thể lớn (phần vẽ nằm lệch dưới ô).
 */
type ImageStyle = [string, number, number, number, boolean, boolean];
const IMAGE_STYLES: ImageStyle[] = [
    ['FX_cut1_', 90, 21, 4.3, true, true],       // nhát 1: quét từ thân mèo ra trước, sau lưng mèo
    ['FX_cut2_', 61, 177, 4.8, false, false],    // nhát 2: quét từ dưới lên
    ['FX_cut3_', 36, 69, 5.1, false, true],      // nhát 3: quét ngang rộng, vòng sau lưng mèo
    ['FX_spin_', -40, 125, 4.6, false, false],   // nhát 4: chém xoay 360°, cao hơn tai mèo
    ['FX_finish_', 225, 64, 6.2, true, true],    // nhát 5: kết liễu, cong ngược lại, sau lưng mèo
];

/**
 * Bộ vệt chém mới (art/fx/Character): thường dùng màu 1 (Normal Atk/…_color1), đang bật special dùng màu đỏ (Special/…_color2).
 * Slash: 9 khung = 2 nhát (A: khung 1–5 quét ngang, B: khung 6–9 hất lên); Slash2: chém hất; Slash3: vòng cung lớn (nhát 5 kết liễu).
 */
export type SlashKind = 'Slash' | 'Slash2' | 'Slash3';
export function slashSet(kind: SlashKind, special: boolean): string {
    return special ? `Character/Special/${kind}_color2_frame` : `Character/Normal Atk/${kind}_color1_frame`;
}

/** Combo 5 nhát: [bộ vệt, khung đầu, khung cuối, x tâm phía trước, y tâm so với chân, phóng to] — A B A B rồi kết liễu */
const COMBO_SLASH: [SlashKind, number, number, number, number, number][] = [
    ['Slash', 0, 4, 125, 150, 3.4],
    ['Slash', 5, 8, 125, 150, 3.4],
    ['Slash', 0, 4, 125, 150, 3.4],
    ['Slash', 5, 8, 125, 150, 3.4],
    ['Slash3', 0, 99, 35, 140, 3.4],   // vòng cung ôm trên đầu mèo, chỗ hở ngay đầu
];

/** Tải trước mọi bộ ảnh vệt chém (gọi lúc vào màn). */
export function preloadSlashImages() {
    for (const [prefix] of IMAGE_STYLES) DustPuff.preload(prefix);
    for (const kind of ['Slash', 'Slash2', 'Slash3'] as SlashKind[]) {
        DustPuff.preload(slashSet(kind, false));
        DustPuff.preload(slashSet(kind, true));
    }
}

/**
 * Vệt chém của Leo, gắn trên node con của mèo.
 * Có ảnh art/fx (FX_cut1_, FX_cut2_, FX_cut3_, FX_spin_, FX_finish_) thì chạy ảnh;
 * vệt nào đánh dấu "sau lưng" (nhát 1, 3, 5) thì vẽ trên node back (PlayerController đặt dưới hình mèo); chưa có thì vẽ bằng code: quét nhanh theo cung tròn,
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
    /** Node con của mèo nằm dưới hình mèo: vệt "sau lưng" vẽ ở đây. Không có thì vẽ trước mèo. */
    back: Node | null = null;

    private g: Graphics | null = null;
    private t = -1;
    private facing = 1;
    private style = 0;

    /**
     * Vệt chém nhát combo (0..4): A B A B (bộ Slash) rồi kết liễu (Slash3); special: màu đỏ, chạy nhanh theo nhịp đánh.
     * Ảnh chưa tải xong thì vẽ tạm bằng code.
     */
    play(facing: number, combo: number, special = false, speed = 1) {
        this.facing = facing >= 0 ? 1 : -1;
        const i = Math.max(0, Math.min(COMBO_SLASH.length - 1, combo));
        const [kind, from, to, x, y, scale] = COMBO_SLASH[i];
        const prefix = slashSet(kind, special);
        if (DustPuff.ready(prefix)) {
            DustPuff.spawn(prefix, this.node, this.facing * x, y,
                { dir: this.facing, scale, fps: this.imageFps * speed, center: true, from, to });
            return;
        }
        this.style = Math.min(STYLES.length - 1, i);
        this.t = 0;
        this.draw();
    }

    /** Vệt chém cũ (bộ FX_cut…) — dùng lúc phóng sóng kiếm. */
    playLegacy(facing: number, combo: number) {
        this.facing = facing >= 0 ? 1 : -1;
        const i = Math.max(0, Math.min(IMAGE_STYLES.length - 1, combo));
        const [prefix, x, y, scale, flipX, behind] = IMAGE_STYLES[i];
        if (DustPuff.ready(prefix)) {
            const parent = behind && this.back && this.back.isValid ? this.back : this.node;
            DustPuff.spawn(prefix, parent, this.facing * x, y,
                { dir: flipX ? -this.facing : this.facing, scale, fps: this.imageFps, center: true });
            return;
        }
        this.style = Math.min(STYLES.length - 1, i);
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
