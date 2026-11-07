import { _decorator, Color, Component, Graphics, view } from 'cc';
const { ccclass } = _decorator;

/** Số hạt bụi, màu */
const COUNT = 70;
const MOTE = new Color(255, 248, 230, 255);
/** Theo độ sâu z (0 = xa, 1 = gần): bán kính, tốc độ lượn (đơn vị/giây), độ đậm lớn nhất */
const SIZE = [1.2, 3.6];
const SPEED = [5, 20];
const ALPHA = [70, 220];
/** Cả đám nghiêng nhẹ xuống phải (đơn vị/giây) */
const BIAS_X = 4;
const BIAS_Y = -3;
/** Mỗi hạt sống từ … tới … giây (hiện dần, tắt dần tại chỗ) */
const LIFE = [4, 10];
/** Loé sáng: mỗi giây mỗi hạt có chừng này phần trăm cơ hội loé, mỗi lần loé kéo dài (giây) */
const FLASH_CHANCE = 0.05;
const FLASH_TIME = 0.5;

interface Mote {
    x: number;
    y: number;
    z: number;
    heading: number;
    age: number;
    life: number;
    flash: number;
}

function lerp(r: number[], t: number): number {
    return r[0] + (r[1] - r[0]) * t;
}

/**
 * Bụi ngoài menu (bụi trong nắng): khoảng 70 hạt tròn mềm màu kem, hạt xa nhỏ mờ chậm, hạt gần to rõ hơn.
 * Mỗi hạt lượn lờ chậm theo hướng riêng (hướng đổi dần như gió nhẹ), cả đám hơi nghiêng xuống phải; sống 4–10 giây,
 * hiện dần rồi tắt dần tại chỗ, sinh lại chỗ khác; thỉnh thoảng một hạt loé sáng.
 * Vẽ tất cả lên một Graphics, độ đậm nằm trong màu vẽ. Chạy theo giờ thật (setInterval) chứ không theo update:
 * mở Cài đặt là game tạm dừng (director.pause) mà bụi vẫn bay.
 * LandingScreen tạo node Dust ngay trên ảnh nền menu (MenuBg) nên menu, trang ô lưu, trang độ khó đều thấy.
 */
@ccclass('MenuDust')
export class MenuDust extends Component {
    private g: Graphics | null = null;
    private motes: Mote[] = [];
    private timer: ReturnType<typeof setInterval> | null = null;
    private last = 0;

    onLoad() {
        this.g = this.node.addComponent(Graphics);
        for (let i = 0; i < COUNT; i++) {
            const m = this.spawn();
            m.age = Math.random() * m.life; // khỏi hiện cùng lúc
            this.motes.push(m);
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

    private spawn(): Mote {
        const d = view.getDesignResolutionSize();
        const z = Math.random();
        return {
            x: (Math.random() - 0.5) * d.width * 1.1,
            y: (Math.random() - 0.5) * d.height * 1.1,
            z: z * z, // phần lớn là hạt xa (nhỏ, mờ)
            heading: Math.random() * Math.PI * 2,
            age: 0,
            life: lerp(LIFE, Math.random()),
            flash: 0,
        };
    }

    private tick() {
        const g = this.g;
        if (!g || !g.isValid) {
            this.onDisable();
            return;
        }
        const now = Date.now();
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        if (!this.node.activeInHierarchy) return;
        g.clear();
        for (let i = 0; i < this.motes.length; i++) {
            let m = this.motes[i];
            m.age += dt;
            if (m.age >= m.life) {
                m = this.motes[i] = this.spawn();
            }
            // Hướng đổi dần ngẫu nhiên (lượn lờ), cộng độ nghiêng chung
            m.heading += (Math.random() - 0.5) * 3 * dt;
            const speed = lerp(SPEED, m.z);
            m.x += (Math.cos(m.heading) * speed + BIAS_X) * dt;
            m.y += (Math.sin(m.heading) * speed * 0.7 + BIAS_Y) * dt;
            // Loé sáng thỉnh thoảng
            if (m.flash > 0) m.flash = Math.max(0, m.flash - dt);
            else if (Math.random() < FLASH_CHANCE * dt) m.flash = FLASH_TIME;
            const glow = m.flash > 0 ? Math.sin((m.flash / FLASH_TIME) * Math.PI) : 0;
            // Hiện dần, tắt dần theo tuổi
            const life = Math.sin((m.age / m.life) * Math.PI);
            const a = Math.min(255, lerp(ALPHA, m.z) * life * (1 + glow));
            if (a < 2) continue;
            const r = lerp(SIZE, m.z) * (1 + glow * 0.6);
            // Quầng mờ ngoài, lõi sáng trong (hạt gần nhoè hơn)
            g.fillColor = new Color(MOTE.r, MOTE.g, MOTE.b, Math.round(a * 0.15));
            g.circle(m.x, m.y, r * (2.4 + m.z));
            g.fill();
            g.fillColor = new Color(MOTE.r, MOTE.g, MOTE.b, Math.round(a * 0.35));
            g.circle(m.x, m.y, r * 1.6);
            g.fill();
            g.fillColor = new Color(MOTE.r, MOTE.g, MOTE.b, Math.round(a));
            g.circle(m.x, m.y, r);
            g.fill();
        }
    }
}
