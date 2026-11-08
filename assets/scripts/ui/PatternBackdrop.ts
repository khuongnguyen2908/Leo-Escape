import { Color, EffectAsset, Graphics, Material, Node, resources, Sprite, SpriteFrame, view } from 'cc';
import { uiNode } from './UiKit';

/** Nền: ảnh BG_loading phủ kín khung hình; chưa có ảnh thì tô màu BG */
const BG = new Color(126, 82, 54, 255);
const BG_IMAGE = 'art/BG_loading';
/** Lớp hạt nhiễu phủ kín khung hình, nằm trên hoạ tiết (ảnh trong suốt sẵn, vẽ thường) */
const FILTER_IMAGE = 'art/Loading_filter';
/**
 * Hoạ tiết: rải ngẫu nhiên khắp một vùng rộng hơn khung hình (AREA lần), khoảng cách theo CỠ TỪNG HÌNH:
 * mép hai hình luôn cách nhau ít nhất GAP (hình nhỏ xếp sát hơn, hình to không dính), không thành hàng,
 * hình giống nhau không đứng cạnh nhau, rồi lấp các chỗ trống còn nhét vừa hình (không để mảng trống to);
 * ảnh = cỡ gốc × PATTERN_SCALE, tất cả nghiêng cùng một góc ANGLE, rất mờ, cả vùng trôi chéo chậm
 * (mép trái nối mép phải, trên nối dưới nên quay vòng liền). GAP lớn hơn thì thưa hơn.
 */
const PATTERN = new Color(250, 240, 222, 30);
const AREA = 1.4;
const GAP = 40;
const PATTERN_SCALE = 0.8;
/** Rải lan dần: hình mới cách hình bên cạnh (r1 + r2 + GAP) × 1..(1 + SPREAD); mỗi hình thử PLACE_TRIES chỗ quanh nó */
const SPREAD = 0.12;
const PLACE_TRIES = 40;
/** Lấp chỗ trống: bốc ngần này điểm ngẫu nhiên, chỗ nào còn nhét vừa hình thì đặt thêm */
const FILL_TRIES = 6000;
/** Hai hình cùng kiểu phải xa nhau gấp chừng này lần khoảng cách thường */
const SAME_KIND = 1.5;
/** Cỡ hình tạm (khi chưa có ảnh); ảnh thật = cỡ gốc × PATTERN_SCALE */
const ICON_SIZE = 96;
/** Mọi hoạ tiết nghiêng cùng một góc (độ, dương = xoay ngược chiều kim đồng hồ) */
const ANGLE = 30;
const DRIFT_X = 18;
const DRIFT_Y = -10;
/** Ảnh hoạ tiết thay hình tạm: mọi ảnh trong thư mục này (lấy ngẫu nhiên; đúng chữ hoa, web phân biệt hoa thường) */
const PATTERN_DIR = 'art/Loading_pattern';
/** Hoạ tiết trộn kiểu Screen (shader resources/effects/sprite-screen): độ đậm 0..255 */
const PATTERN_SCREEN = 45;
const PATTERN_EFFECT = 'effects/sprite-screen';
/** Không tải được shader Screen thì vẽ thường với độ đậm này */
const PATTERN_PLAIN = 70;

interface Spot {
    x: number;
    y: number;
    /** Chỉ số ảnh (hoặc kiểu hình tạm) */
    f: number;
    r: number;
}

function fieldSize(): { W: number; H: number } {
    const d = view.getDesignResolutionSize();
    return { W: d.width * AREA, H: d.height * AREA };
}

/** Khoảng cách hai điểm trong vùng quay vòng W × H (mép trái nối mép phải, trên nối dưới). */
function wrapDist(ax: number, ay: number, bx: number, by: number, W: number, H: number): number {
    let dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
    if (dx > W / 2) dx = W - dx;
    if (dy > H / 2) dy = H - dy;
    return Math.hypot(dx, dy);
}

/**
 * Rải hoạ tiết trong vùng quay vòng W × H (tâm ở 0). radii[i] = bán kính hình kiểu i (đã nhân cỡ).
 * Mép hai hình cách nhau ít nhất GAP; hình giống nhau không đứng gần nhau. Lan dần từ một hình (đều, ngẫu nhiên),
 * rồi lấp những chỗ trống còn nhét vừa hình nào đó.
 */
function packPattern(radii: number[], W: number, H: number): Spot[] {
    const kinds = radii.length;
    const spots: Spot[] = [];
    const wrapX = (x: number) => ((x + W / 2) % W + W) % W - W / 2;
    const wrapY = (y: number) => ((y + H / 2) % H + H) % H - H / 2;
    /** Đặt được hình kiểu f ở (x, y) không: không chạm mép hình nào, không sát hình cùng kiểu */
    const fits = (x: number, y: number, f: number) => spots.every((q) => {
        const d = wrapDist(x, y, q.x, q.y, W, H);
        return d >= q.r + radii[f] + GAP && (q.f !== f || d >= (q.r + radii[f] + GAP) * SAME_KIND);
    });
    spots.push({ x: 0, y: 0, f: Math.floor(Math.random() * kinds), r: 0 });
    spots[0].r = radii[spots[0].f];
    const active = [0];
    while (active.length) {
        const ai = Math.floor(Math.random() * active.length);
        const c = spots[active[ai]];
        let placed = false;
        for (let t = 0; t < PLACE_TRIES; t++) {
            const f = Math.floor(Math.random() * kinds);
            const ang = Math.random() * Math.PI * 2;
            const d = (c.r + radii[f] + GAP) * (1 + Math.random() * SPREAD);
            const x = wrapX(c.x + Math.cos(ang) * d), y = wrapY(c.y + Math.sin(ang) * d);
            if (fits(x, y, f)) {
                spots.push({ x, y, f, r: radii[f] });
                active.push(spots.length - 1);
                placed = true;
                break;
            }
        }
        if (!placed) active.splice(ai, 1);
    }
    // Lấp chỗ trống: chỗ nào còn nhét vừa một kiểu hình thì đặt (bốc ngẫu nhiên trong các kiểu vừa)
    for (let t = 0; t < FILL_TRIES; t++) {
        const x = (Math.random() - 0.5) * W, y = (Math.random() - 0.5) * H;
        const ok: number[] = [];
        for (let f = 0; f < kinds; f++) if (fits(x, y, f)) ok.push(f);
        if (ok.length) {
            const f = ok[Math.floor(Math.random() * ok.length)];
            spots.push({ x, y, f, r: radii[f] });
        }
    }
    return spots;
}

/** Vẽ một hình nền tạm (kind 0..4: chân mèo, cá, xương, ngôi sao, chấm tròn), tâm (0, 0), cỡ s. */
function drawShape(g: Graphics, kind: number, s: number) {
    g.fillColor = PATTERN;
    switch (kind) {
        case 0: // chân mèo
            g.ellipse(0, -s * 0.18, s * 0.34, s * 0.28);
            g.fill();
            for (const [x, y] of [[-0.36, 0.2], [-0.13, 0.4], [0.13, 0.4], [0.36, 0.2]]) {
                g.ellipse(x * s, y * s, s * 0.13, s * 0.16);
                g.fill();
            }
            break;
        case 1: // cá
            g.ellipse(-s * 0.08, 0, s * 0.38, s * 0.2);
            g.fill();
            g.moveTo(s * 0.24, 0); g.lineTo(s * 0.5, s * 0.2); g.lineTo(s * 0.5, -s * 0.2); g.close();
            g.fill();
            break;
        case 2: // xương
            g.roundRect(-s * 0.32, -s * 0.08, s * 0.64, s * 0.16, s * 0.08);
            g.fill();
            for (const x of [-0.36, 0.36]) {
                g.circle(x * s, s * 0.1, s * 0.12);
                g.circle(x * s, -s * 0.1, s * 0.12);
                g.fill();
            }
            break;
        case 3: { // ngôi sao
            const R = s * 0.42, r = s * 0.18;
            for (let i = 0; i < 10; i++) {
                const a = Math.PI / 2 + (i * Math.PI) / 5;
                const rad = i % 2 === 0 ? R : r;
                if (i === 0) g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
                else g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
            }
            g.close();
            g.fill();
            break;
        }
        default: // chấm tròn
            g.circle(0, 0, s * 0.22);
            g.fill();
    }
}

/**
 * Nền kiểu màn tải, dùng chung cho màn tải (LoadingScreen) và màn thông báo tự lưu (BootScreen):
 * ảnh BG_loading phủ kín (chưa có thì tô nâu ấm) → hoạ tiết trong art/Loading_pattern rải theo cỡ, trộn kiểu Screen,
 * trôi chéo chậm → lớp hạt nhiễu Loading_filter. Tạo các node trong parent theo đúng thứ tự đó (thêm mèo, chữ... sau).
 * Người dùng gọi update(dt) mỗi khung (LoadingScreen gọi từ setInterval của nó).
 */
export class PatternBackdrop {
    private pieces: Node[] = [];

    constructor(parent: Node) {
        const d = view.getDesignResolutionSize();
        // Màu nền dự phòng: chỉ tô khi không có ảnh nền (Graphics không mờ theo UIOpacity nên không tô sẵn)
        const fill = uiNode('BgFill', parent, d.width, d.height);
        const bgPic = uiNode('BgImage', parent);
        resources.load(`${BG_IMAGE}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!bgPic.isValid) return;
            if (err || !sf) {
                const g = fill.addComponent(Graphics);
                g.fillColor = BG;
                g.rect(-d.width, -d.height, d.width * 2, d.height * 2);
                g.fill();
                return;
            }
            bgPic.addComponent(Sprite).spriteFrame = sf;
            const k = Math.max(d.width / sf.rect.width, d.height / sf.rect.height);
            bgPic.setScale(k, k, 1);
        });
        // Hoạ tiết: rải theo cỡ từng ảnh (cần ảnh tải xong mới biết cỡ); chưa có ảnh thì hình tạm vẽ bằng code
        const field = uiNode('Pattern', parent);
        const { W: FW, H: FH } = fieldSize();
        const place = (radii: number[], make: (n: Node, f: number) => void) => {
            for (const sp of packPattern(radii, FW, FH)) {
                const n = uiNode('Piece', field);
                n.setPosition(sp.x, sp.y, 0);
                n.angle = ANGLE;
                make(n, sp.f);
                this.pieces.push(n);
            }
        };
        resources.loadDir(PATTERN_DIR, SpriteFrame, (err, frames) => {
            if (!field.isValid) return;
            if (err || !frames || frames.length === 0) {
                place([0, 1, 2, 3, 4].map(() => ICON_SIZE * 0.5), (n, f) => drawShape(n.addComponent(Graphics), f, ICON_SIZE));
                return;
            }
            resources.load(PATTERN_EFFECT, EffectAsset, (e2, effect) => {
                if (!field.isValid) return;
                let mat: Material | null = null;
                if (!e2 && effect) {
                    mat = new Material();
                    mat.initialize({ effectAsset: effect, defines: { USE_TEXTURE: true } });
                }
                // Bán kính mỗi ảnh: nửa đường chéo × cỡ, bớt 10% (hình không vuông kín khung nên vẫn không chạm nhau)
                const radii = frames.map((fr) => 0.5 * Math.hypot(fr.rect.width, fr.rect.height) * PATTERN_SCALE * 0.9);
                place(radii, (n, f) => {
                    const sp = n.addComponent(Sprite);
                    sp.spriteFrame = frames[f];
                    if (mat) sp.customMaterial = mat;
                    sp.color = new Color(255, 255, 255, mat ? PATTERN_SCREEN : PATTERN_PLAIN);
                    n.setScale(PATTERN_SCALE, PATTERN_SCALE, 1);
                });
            });
        });
        // Lớp lọc (hạt nhiễu) trên hoạ tiết: tạo node ngay đây để giữ đúng thứ tự vẽ dù ảnh tải xong lúc nào
        const filter = uiNode('Filter', parent);
        resources.load(`${FILTER_IMAGE}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (err || !sf || !filter.isValid) return;
            filter.addComponent(Sprite).spriteFrame = sf;
            const k = Math.max(d.width / sf.rect.width, d.height / sf.rect.height);
            filter.setScale(k, k, 1);
        });
    }

    /** Hoạ tiết trôi chéo chậm, ra khỏi mép thì quay lại mép bên kia (giữ nguyên góc nghiêng). */
    update(dt: number) {
        const { W, H } = fieldSize();
        for (const n of this.pieces) {
            if (!n.isValid) continue;
            let x = n.position.x + DRIFT_X * dt, y = n.position.y + DRIFT_Y * dt;
            if (x > W / 2) x -= W;
            if (y < -H / 2) y += H;
            n.setPosition(x, y, 0);
        }
    }
}
