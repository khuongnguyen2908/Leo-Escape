import { _decorator, Color, Component, Graphics, Node, Rect, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { CameraRig } from '../camera/CameraRig';
import { overlaps } from '../core/Box';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
const { ccclass, property, executeInEditMode } = _decorator;

const LINE = new Color(24, 22, 20, 255);
const EARTH = new Color(74, 62, 58, 255);
const EARTH_LINE = new Color(90, 74, 66, 255);
const ASPHALT = new Color(60, 60, 66, 255);
const CONCRETE = new Color(112, 116, 112, 255);
const ARCH = new Color(46, 54, 58, 255);
const REBAR = new Color(150, 90, 60, 255);
const WATER = new Color(62, 104, 92, 255);
const WAVE = new Color(96, 140, 124, 255);
const SURFACE = new Color(150, 196, 176, 255);
const FOAM = new Color(226, 244, 236, 255);
const SHADOW = new Color(30, 44, 40, 255);
const FISH = new Color(66, 70, 58, 255);
const FISH_DARK = new Color(36, 38, 32, 255);
const BELLY = new Color(196, 190, 160, 255);
const MOUTH = new Color(150, 40, 40, 255);
const TOOTH = new Color(250, 250, 240, 255);
const EYE = new Color(230, 60, 40, 255);

/** Cá lóc dài 200, cao ~42; hộp cắn nhỏ hơn hình một chút cho khỏi bị cắn oan */
const FISH_LEN = 200;
const FISH_H = 21;
const BITE_W = 160;
const BITE_H = 40;

enum State { Idle, Warn, Jump, Rest }

const _cat = new Rect();
const _fish = new Rect();
const _pos = new Vec3();

/**
 * Hố đường sụt lộ kênh ngầm (map thử): vách hố, mặt nước, một con cá lóc.
 * - Mèo tới gần mép hố: nước gợn + bọt + bóng cá (warnTime) → cá nhảy vòng qua hố (jumpTime) → nghỉ (restTime), lượt sau nhảy chiều ngược lại.
 *   Cá chạm mèo: mất 1 máu, bị đẩy lùi (như chạm vật nguy hiểm); đang lướt thì né được.
 * - Mèo rơi xuống nước: mất 1 máu (vừa bị cắn, còn bất tử thì thôi) rồi bật lên mép hố gần nhất.
 * Toạ độ (left, right, top, water, bottom, peak) tính theo lớp Gameplay: node phải nằm ở gốc (0, 0) của MapThu.
 * Hình vẽ tạm bằng code; có art thật thì thay hình trong node con CaLoc / MatNuoc / VachHo.
 */
@ccclass('FishPit')
@executeInEditMode
export class FishPit extends Component {
    @property({ tooltip: 'Mép trái hố (x)' })
    left = 0;
    @property({ tooltip: 'Mép phải hố (x)' })
    right = 400;
    @property({ tooltip: 'Mặt cột hai bên (y), mèo bật lên đứng ở đây' })
    top = 370;
    @property({ tooltip: 'Mặt nước (y)' })
    water = 150;
    @property({ tooltip: 'Đáy phần vẽ (y)' })
    bottom = -470;
    @property({ tooltip: 'Cá nhảy cao tới đâu (y của tâm cá ở đỉnh vòng)' })
    peak = 500;
    @property({ tooltip: 'Mèo cách mép hố bao nhiêu thì cá bắt đầu rình' })
    near = 350;
    @property({ tooltip: 'Giây nước gợn báo trước' })
    warnTime = 0.5;
    @property({ tooltip: 'Giây một cú nhảy' })
    jumpTime = 1.0;
    @property({ tooltip: 'Giây nghỉ sau mỗi cú nhảy' })
    restTime = 1.5;
    @property({ tooltip: 'Có cá lóc nhảy lên cắn. Tắt: chỉ là nước (rơi xuống mất 1 máu, bật lên mép)' })
    hasFish = true;
    @property({ tooltip: 'Vẽ kiểu lòng kênh ngầm (vách bê tông) thay cho hố đường sụt (đất, nhựa đường, sắt)' })
    canal = false;

    private wallG: Graphics | null = null;
    private waterG: Graphics | null = null;
    private fish: Node | null = null;
    private state = State.Idle;
    private time = 0;
    private dir = 1;
    private clock = 0;
    /** Chỗ nước bắn: x, còn bao lâu */
    private splashes: { x: number; t: number }[] = [];

    setup(left: number, right: number, top: number, water: number, bottom: number, peak: number) {
        this.left = left;
        this.right = right;
        this.top = top;
        this.water = water;
        this.bottom = bottom;
        this.peak = peak;
        this.redraw();
    }

    onLoad() {
        this.redraw();
    }

    private child(name: string): Graphics {
        let n = this.node.getChildByName(name);
        if (!n) {
            n = new Node(name);
            n.layer = this.node.layer;
            this.node.addChild(n);
        }
        return n.getComponent(Graphics) ?? n.addComponent(Graphics);
    }

    /** Vẽ lại cả 3 lớp: vách hố (sau), cá (giữa), mặt nước (trước, che phần cá dưới nước). */
    redraw() {
        if (!this.node || !this.node.isValid) return;
        this.wallG = this.child('VachHo');
        const fishG = this.child('CaLoc');
        this.waterG = this.child('MatNuoc');
        this.fish = fishG.node;
        this.drawWall(this.wallG);
        this.drawFish(fishG);
        this.fish.active = false;
        this.drawWater();
    }

    private get startX() { return this.dir > 0 ? this.left + 70 : this.right - 70; }
    private get endX() { return this.dir > 0 ? this.right - 70 : this.left + 70; }

    update(dt: number) {
        if (EDITOR) return;
        const gm = GameManager.instance;
        if (!gm || !this.fish) return;
        this.clock += dt;
        this.time += dt;
        const cats = gm.cats;
        const l = this.left, r = this.right;

        // Mèo rơi xuống nước: bật lên mép gần nhất
        for (const c of cats) {
            const p = c.node.position;
            if (c.downed || p.x < l || p.x > r || p.y > this.water - 30) continue;
            if (c.invincible <= 0) {
                gm.damage(c, 1);
                Sound.play('hurt');
                CameraRig.instance?.shake(10, 0.2);
            }
            this.splash(p.x);
            const mid = (l + r) / 2;
            _pos.set(p.x < mid ? l - 170 : r + 170, this.top + 20, 0);
            c.respawn(_pos);
        }

        switch (this.hasFish ? this.state : State.Rest) {
            case State.Idle:
                if (cats.some((c) => !c.downed && !c.idle && c.node.position.x > l - this.near && c.node.position.x < r + this.near
                    && c.node.position.y > this.water && c.node.position.y < this.top + 900)) this.go(State.Warn);
                break;
            case State.Warn:
                if (this.time >= this.warnTime) {
                    this.go(State.Jump);
                    this.fish.active = true;
                    this.splash(this.startX);
                    Sound.play('jaw_snap', 0.6);
                }
                break;
            case State.Jump: {
                const k = Math.min(1, this.time / this.jumpTime);
                this.placeFish(k);
                const p = this.fish.position;
                if (p.y > this.water) {
                    const a = this.fish.angle * Math.PI / 180;
                    const w = BITE_W * Math.abs(Math.cos(a)) + BITE_H * Math.abs(Math.sin(a));
                    const h = BITE_W * Math.abs(Math.sin(a)) + BITE_H * Math.abs(Math.cos(a));
                    _fish.set(p.x - w / 2, p.y - h / 2, w, h);
                    for (const c of cats) {
                        if (!c.downed && overlaps(c.body.getRect(_cat), _fish)) gm.hurtCat(c, p.x);
                    }
                }
                if (k >= 1) {
                    this.fish.active = false;
                    this.splash(this.endX);
                    this.dir = -this.dir;
                    this.go(State.Rest);
                }
                break;
            }
            case State.Rest:
                if (this.hasFish && this.time >= this.restTime) this.go(State.Idle);
                break;
        }

        for (const s of this.splashes) s.t -= dt;
        this.splashes = this.splashes.filter((s) => s.t > 0);
        this.drawWater();
    }

    private go(s: State) {
        this.state = s;
        this.time = 0;
    }

    private splash(x: number) {
        this.splashes.push({ x, t: 0.45 });
    }

    /** Đặt cá trên đường vòng (k: 0 → 1), đầu cá hướng theo chiều bay */
    private placeFish(k: number) {
        const fish = this.fish!;
        const x0 = this.startX, x1 = this.endX;
        const base = this.water - 25, rise = this.peak - base;
        fish.setPosition(x0 + (x1 - x0) * k, base + rise * 4 * k * (1 - k), 0);
        const dy = rise * 4 * (1 - 2 * k), dx = x1 - x0;
        fish.angle = Math.atan2(dy, dx) * 180 / Math.PI;
        // Bay sang trái thì xoay gần 180°: lật dọc để bụng vẫn ở dưới
        fish.setScale(1, dx < 0 ? -1 : 1, 1);
    }

    private drawWall(g: Graphics) {
        g.clear();
        const l = this.left, r = this.right, t = this.top, b = this.bottom, w = r - l, cx = (l + r) / 2;
        if (this.canal) {
            // Lòng kênh ngầm: vách bê tông, vệt rêu ngang mặt nước, mép gờ tối
            g.fillColor = CONCRETE;
            g.rect(l, b, w, t - b);
            g.fill();
            g.fillColor = WAVE;
            g.rect(l, this.water, w, 26);
            g.fill();
            g.strokeColor = LINE;
            g.lineWidth = 5;
            g.moveTo(l, t);
            g.lineTo(l, b);
            g.moveTo(r, t);
            g.lineTo(r, b);
            g.stroke();
            return;
        }
        g.fillColor = EARTH;
        g.rect(l, b, w, t - b);
        g.fill();
        g.strokeColor = EARTH_LINE;
        g.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
            const y = t - 70 - i * 40;
            g.moveTo(l, y);
            g.lineTo(r, y - 8);
        }
        g.stroke();
        // lớp nhựa đường bị sụt
        g.fillColor = ASPHALT;
        g.rect(l, t - 40, w, 40);
        g.fill();
        // vách bê tông và vòm kênh ngầm lộ ra
        const archTop = this.water + 50, ar = Math.min(150, w / 2 - 50);
        g.fillColor = CONCRETE;
        g.rect(l, b, w, archTop + 10 - b);
        g.fill();
        g.fillColor = ARCH;
        g.circle(cx, archTop - ar, ar);
        g.rect(cx - ar, b, ar * 2, archTop - ar - b);
        g.fill();
        // sắt thò ra ở hai bên
        g.strokeColor = REBAR;
        g.lineWidth = 6;
        g.moveTo(l + 30, t - 40);
        g.lineTo(l + 55, t - 120);
        g.moveTo(r - 30, t - 50);
        g.lineTo(r - 60, t - 125);
        g.stroke();
        // mép vỡ lởm chởm hai bên
        g.strokeColor = LINE;
        g.lineWidth = 5;
        const jag = [6, 22, 4, 18, 10, 26, 2, 14];
        for (const [x, side] of [[l, 1], [r, -1]]) {
            g.moveTo(x, t);
            jag.forEach((d, i) => g.lineTo(x + side * d, t - 20 - i * 28));
            g.lineTo(x, this.water);
        }
        g.stroke();
    }

    private drawWater() {
        const g = this.waterG;
        if (!g) return;
        g.clear();
        const l = this.left, r = this.right, wy = this.water, w = r - l;
        g.fillColor = WATER;
        g.rect(l, this.bottom, w, wy - this.bottom);
        g.fill();
        // gợn sóng trôi chầm chậm
        g.strokeColor = WAVE;
        g.lineWidth = 4;
        const drift = (this.clock * 30) % 90;
        for (let k = 0; k < 4; k++) {
            const y = wy - 22 - k * 36;
            for (let x = l + 10 + ((drift + k * 25) % 90); x < r - 45; x += 90) {
                g.moveTo(x, y);
                g.lineTo(x + 40, y);
            }
        }
        g.stroke();
        g.strokeColor = SURFACE;
        g.lineWidth = 6;
        g.moveTo(l, wy);
        g.lineTo(r, wy);
        g.stroke();

        // Báo trước: bóng cá dưới nước, vòng gợn loang ra, bọt nổi lên
        if (this.state === State.Warn && !EDITOR) {
            const x = this.startX, k = this.time / this.warnTime;
            g.fillColor = SHADOW;
            g.ellipse(x, wy - 45, 75, 18);
            g.fill();
            g.strokeColor = FOAM;
            g.lineWidth = 4;
            for (let i = 0; i < 3; i++) {
                const rr = 30 + ((k + i / 3) % 1) * 110;
                g.ellipse(x, wy, rr, rr * 0.12 + 4);
            }
            g.stroke();
            g.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
                const by = wy + 10 + ((k * 1.6 + i * 0.27) % 1) * 90;
                g.circle(x - 30 + i * 22, by, 5 + (i % 2) * 3);
            }
            g.stroke();
        }
        // Nước bắn
        g.fillColor = FOAM;
        for (const s of this.splashes) {
            const k = 1 - s.t / 0.45;
            for (let i = -2; i <= 2; i++) {
                const vx = i * 70, vy = 420 - Math.abs(i) * 90;
                const tt = k * 0.45;
                const y = wy + vy * tt - 900 * tt * tt;
                if (y < wy) continue;
                g.circle(s.x + vx * tt, y, 9 - Math.abs(i));
            }
        }
        g.fill();
    }

    /** Cá lóc nằm ngang, đầu quay sang phải, tâm ở (0, 0) */
    private drawFish(g: Graphics) {
        g.clear();
        g.lineJoin = Graphics.LineJoin.ROUND;
        const L = FISH_LEN, H = FISH_H, hx = L / 2;
        const body: [number, number][] = [];
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const x = -L / 2 + t * L;
            const end = t < 0.9 ? 1 : Math.sqrt(Math.max(0.05, 1 - ((t - 0.9) / 0.1) ** 2));
            body.push([x, H * (0.45 + 0.55 * Math.min(1, t * 2.2)) * end]);
        }
        const poly = (pts: [number, number][], fill: Color, stroke = false) => {
            g.fillColor = fill;
            g.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
            g.close();
            g.fill();
            if (stroke) g.stroke();
        };
        g.strokeColor = LINE;
        g.lineWidth = 3;
        // vây lưng dài, vây bụng, đuôi
        const fin = body.slice(4, 31);
        poly([...fin.map(([x, w]): [number, number] => [x, w * 0.9]),
            ...fin.map(([x, w], i): [number, number] => [x, w + 8 * Math.sin(Math.PI * i / (fin.length - 1)) + 4]).reverse()], FISH_DARK);
        poly([...body.slice(8, 22).map(([x, w]): [number, number] => [x, -w * 0.85]),
            ...body.slice(10, 20).map(([x, w]): [number, number] => [x, -w - 9]).reverse()], FISH_DARK);
        poly([[-L / 2 + 4, 0], [-L / 2 - 30, 18], [-L / 2 - 22, 0], [-L / 2 - 30, -18]], FISH_DARK, true);
        // thân
        poly([...body.map(([x, w]): [number, number] => [x, w]), ...body.map(([x, w]): [number, number] => [x, -w * 0.9]).reverse()], FISH, true);
        // bụng nhạt
        const mid = body.slice(6, 38);
        poly([...mid.map(([x, w]): [number, number] => [x, -w * 0.25]), ...mid.map(([x, w]): [number, number] => [x, -w * 0.85]).reverse()], BELLY);
        // vằn
        for (const bx of [-62, -36, -10, 16, 42]) {
            poly([[bx, H * 0.95], [bx + 10, H * 0.9], [bx + 2, -H * 0.2], [bx - 8, -H * 0.15]], FISH_DARK);
        }
        // miệng há, răng
        poly([[hx - 16, 0], [hx + 6, 14], [hx + 8, -12]], MOUTH, true);
        for (let k = 0; k < 3; k++) {
            const tx = hx - 8 + k * 5;
            poly([[tx, 4 + k * 3], [tx + 2, -1 + k * 2], [tx + 4, 5 + k * 3]], TOOTH);
            poly([[tx, -3 - k * 2.5], [tx + 2, 1 - k * 2], [tx + 4, -4 - k * 2.5]], TOOTH);
        }
        // mắt đỏ, mày cau
        g.fillColor = EYE;
        g.circle(hx - 18, 8, 5.5);
        g.fill();
        g.stroke();
        g.fillColor = LINE;
        g.circle(hx - 18, 8, 2.2);
        g.fill();
        g.lineWidth = 4;
        g.moveTo(hx - 28, 17);
        g.lineTo(hx - 10, 13);
        g.stroke();
    }
}
