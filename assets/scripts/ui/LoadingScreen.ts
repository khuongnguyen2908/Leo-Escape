import { BlockInputEvents, Color, director, EffectAsset, Graphics, Label, Material, Node, resources, Sprite, SpriteFrame, UITransform, view } from 'cc';
import { T } from './Lang';
import { MENU_OUTLINE, MENU_TEXT } from './MenuStyle';
import { setText, uiLabel, uiNode } from './UiKit';

/** Màn tải đứng ít nhất chừng này mili giây (LandingScreen chờ đủ rồi mới đi tiếp) */
export const LOADING_TIME = 2000;
/** Hiện / tắt dần (giây) */
const FADE = 0.2;
const BG = new Color(126, 82, 54, 255);
/** Ảnh nền màn tải (phủ kín khung hình); chưa có thì tô màu BG */
const BG_IMAGE = 'art/BG_loading';
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
/** Mèo chạy giữa màn: ảnh art/loading_cat_1, _2... chạy thành flip-book; chưa có thì vẽ đầu mèo tạm */
const CAT_PREFIX = 'art/loading_cat_';
const CAT_FPS = 12;
const CAT_SIZE = 200;
const TEXT_Y = -150;

interface Piece {
    node: Node;
}

let root: Node | null = null;
let cover: Graphics | null = null;
let pieces: Piece[] = [];
let cat: Node | null = null;
let catFrames: SpriteFrame[] = [];
let letters: Label[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let last = 0;
let time = 0;
/** 0 = đang hiện dần, 1 = đứng, 2 = đang tắt dần */
let phase = 0;
let fadeT = 0;
let onHidden: (() => void) | null = null;

interface Spot {
    x: number;
    y: number;
    /** Chỉ số ảnh (hoặc kiểu hình tạm) */
    f: number;
    r: number;
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

/** Đầu mèo tạm: trắng, viền nâu đậm, hai tai, hai mắt, má hồng. */
function drawCatHead(g: Graphics) {
    const r = 62;
    g.clear();
    g.fillColor = new Color(255, 250, 240, 255);
    g.strokeColor = MENU_OUTLINE;
    g.lineWidth = 8;
    for (const side of [-1, 1]) {
        g.moveTo(side * r * 0.85, r * 0.35);
        g.lineTo(side * r * 0.7, r * 1.15);
        g.lineTo(side * r * 0.2, r * 0.8);
        g.close();
    }
    g.fill();
    g.stroke();
    g.ellipse(0, 0, r * 1.05, r * 0.9);
    g.fill();
    g.stroke();
    g.fillColor = MENU_OUTLINE;
    g.circle(-r * 0.38, r * 0.05, 8);
    g.circle(r * 0.38, r * 0.05, 8);
    g.fill();
    g.fillColor = new Color(255, 170, 160, 255);
    g.ellipse(-r * 0.6, -r * 0.25, 12, 8);
    g.ellipse(r * 0.6, -r * 0.25, 12, 8);
    g.fill();
}

function build(canvas: Node) {
    const d = view.getDesignResolutionSize();
    const W = d.width * 1.6, H = d.height * 1.6;
    root = uiNode('LoadingScreen', canvas, d.width, d.height);
    root.addComponent(BlockInputEvents);
    const bg = root.addComponent(Graphics);
    bg.fillColor = BG;
    bg.rect(-W / 2, -H / 2, W, H);
    bg.fill();
    // Ảnh nền thật: phủ kín khung hình (giữ tỉ lệ, cắt bớt phần thừa)
    const bgPic = uiNode('BgImage', root);
    resources.load(`${BG_IMAGE}/spriteFrame`, SpriteFrame, (err, sf) => {
        if (err || !sf || !bgPic.isValid) return;
        bgPic.addComponent(Sprite).spriteFrame = sf;
        const k = Math.max(d.width / sf.rect.width, d.height / sf.rect.height);
        bgPic.setScale(k, k, 1);
    });
    // Hoạ tiết: rải theo cỡ từng ảnh (cần ảnh tải xong mới biết cỡ); chưa có ảnh thì hình tạm vẽ bằng code
    const field = uiNode('Pattern', root);
    pieces = [];
    const { W: FW, H: FH } = fieldSize();
    const place = (radii: number[], make: (n: Node, f: number) => void) => {
        for (const sp of packPattern(radii, FW, FH)) {
            const n = uiNode('Piece', field);
            n.setPosition(sp.x, sp.y, 0);
            n.angle = ANGLE;
            make(n, sp.f);
            pieces.push({ node: n });
        }
    };
    const placeholders = () => place([0, 1, 2, 3, 4].map(() => ICON_SIZE * 0.5), (n, f) => drawShape(n.addComponent(Graphics), f, ICON_SIZE));
    resources.loadDir(PATTERN_DIR, SpriteFrame, (err, frames) => {
        if (!field.isValid) return;
        if (err || !frames || frames.length === 0) {
            placeholders();
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
    // Mèo giữa màn
    cat = uiNode('Cat', root, CAT_SIZE, CAT_SIZE);
    cat.setPosition(0, 40, 0);
    drawCatHead(cat.addComponent(Graphics));
    loadCatFrames();
    // Chữ Loading... từng chữ cái một (để nhún lần lượt)
    const text = T('load.text');
    const ascii = /^[\x20-\x7E]*$/.test(text);
    const row = uiNode('Text', root);
    row.setPosition(0, TEXT_Y, 0);
    letters = [];
    let total = 0;
    const widths: number[] = [];
    for (const chr of text) {
        const l = uiLabel(row, '', 56, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 5 });
        setText(l, chr, ascii);
        l.updateRenderData(true);
        const w = chr === ' ' ? 20 : l.node.getComponent(UITransform)!.width - 6;
        widths.push(w);
        total += w;
        letters.push(l);
    }
    let x = -total / 2;
    letters.forEach((l, i) => {
        l.node.setPosition(x + widths[i] / 2, 0, 0);
        x += widths[i];
    });
    // Lớp đen phủ trên cùng để hiện / tắt dần (độ đậm nằm trong màu vẽ)
    cover = uiNode('Cover', root).addComponent(Graphics);
}

/** Tìm ảnh loading_cat_1, _2... có trong resources (dừng ở số đầu tiên không có), tải hết rồi chạy flip-book. */
function loadCatFrames() {
    catFrames = [];
    const paths: string[] = [];
    for (let i = 1; i <= 40; i++) {
        const p = `${CAT_PREFIX}${i}/spriteFrame`;
        if (!resources.getInfoWithPath(p, SpriteFrame)) break;
        paths.push(p);
    }
    if (paths.length === 0) return;
    resources.load(paths, SpriteFrame, (err, frames) => {
        if (err || !frames || !cat || !cat.isValid) return;
        catFrames = frames;
        cat.getComponent(Graphics)?.clear();
        const sp = cat.getComponent(Sprite) ?? cat.addComponent(Sprite);
        sp.spriteFrame = frames[0];
        const f = frames[0];
        const k = CAT_SIZE / Math.max(f.rect.width, f.rect.height);
        cat.setScale(k, k, 1);
    });
}

function paintCover(a: number) {
    if (!cover || !cover.isValid) return;
    const d = view.getDesignResolutionSize();
    cover.clear();
    if (a <= 0) return;
    cover.fillColor = new Color(0, 0, 0, Math.min(255, Math.round(a)));
    cover.rect(-d.width, -d.height, d.width * 2, d.height * 2);
    cover.fill();
}

function tick() {
    if (!root || !root.isValid) {
        stopTimer();
        return;
    }
    const now = Date.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    const { W, H } = fieldSize();
    // Hình nền trôi chéo chậm, ra khỏi mép thì quay lại mép bên kia (giữ nguyên góc nghiêng)
    for (const p of pieces) {
        const n = p.node;
        let x = n.position.x + DRIFT_X * dt, y = n.position.y + DRIFT_Y * dt;
        if (x > W / 2) x -= W;
        if (y < -H / 2) y += H;
        n.setPosition(x, y, 0);
    }
    // Mèo nhún nhẹ (có ảnh thì chạy flip-book)
    if (cat && cat.isValid) {
        const bob = Math.abs(Math.sin(time * 5));
        cat.setPosition(0, 40 + bob * 14, 0);
        if (catFrames.length > 0) {
            const sp = cat.getComponent(Sprite);
            if (sp) sp.spriteFrame = catFrames[Math.floor(time * CAT_FPS) % catFrames.length];
        } else {
            cat.setScale(1 + 0.04 * (1 - bob), 1 - 0.04 * (1 - bob), 1);
        }
    }
    // Chữ nhún lần lượt từng chữ cái như gợn sóng
    letters.forEach((l, i) => {
        if (!l.isValid) return;
        const w = Math.sin(time * 6 - i * 0.55);
        l.node.setPosition(l.node.position.x, Math.max(0, w) * 16, 0);
    });
    // Hiện / tắt dần
    fadeT += dt;
    if (phase === 0) {
        paintCover(255 * Math.max(0, 1 - fadeT / FADE));
        if (fadeT >= FADE) phase = 1;
    } else if (phase === 2) {
        paintCover(255 * Math.min(1, fadeT / FADE));
        if (fadeT >= FADE) {
            const done = onHidden;
            onHidden = null;
            stopTimer();
            root.destroy();
            root = null;
            done?.();
        }
    }
}

function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
}

/**
 * Màn tải giữa hai cảnh (sau khi chọn ô lưu, sau khi đọc xong truyện): nền ảnh BG_loading (chưa có thì nâu ấm), hoạ tiết
 * trong art/Loading_pattern rải ngẫu nhiên, trộn kiểu Screen (sáng nhẹ hơn nền; chưa có ảnh thì hình tạm màu kem)
 * trôi chéo chậm, mèo nhún giữa màn (ảnh loading_cat_1.. chạy flip-book; chưa có thì đầu mèo tạm), chữ "Loading..." nhún
 * từng chữ. Hiện dần trên màn đen, tắt dần về đen. Chạy bằng setInterval (vẫn chạy khi game tạm dừng / đang chuyển cảnh).
 * Hoạ tiết: thả ảnh vào assets/resources/art/Loading_pattern (bao nhiêu cũng được, lấy ngẫu nhiên; Type = sprite-frame).
 */
export const LoadingScreen = {
    show() {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        if (!root || !root.isValid) build(canvas);
        root!.active = true;
        root!.setSiblingIndex(canvas.children.length - 1);
        onHidden = null;
        phase = 0;
        fadeT = 0;
        time = 0;
        paintCover(255);
        last = Date.now();
        if (!timer) timer = setInterval(tick, 16);
    },

    /** Tắt dần về đen rồi gọi done. */
    hide(done?: () => void) {
        if (!root || !root.isValid) {
            done?.();
            return;
        }
        onHidden = done ?? null;
        phase = 2;
        fadeT = 0;
    },
};
