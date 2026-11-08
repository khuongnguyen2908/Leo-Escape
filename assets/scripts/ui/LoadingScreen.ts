import { BlockInputEvents, Color, director, Graphics, Label, Node, resources, Sprite, SpriteFrame, UITransform, view } from 'cc';
import { T } from './Lang';
import { MENU_OUTLINE, MENU_TEXT } from './MenuStyle';
import { PatternBackdrop } from './PatternBackdrop';
import { setText, uiLabel, uiNode } from './UiKit';

/** Màn tải đứng ít nhất chừng này mili giây (LandingScreen chờ đủ rồi mới đi tiếp) */
export const LOADING_TIME = 2000;
/** Hiện / tắt dần (giây) */
const FADE = 0.2;
// Nền (ảnh BG_loading, hoạ tiết, lớp lọc) và các thông số của nó: PatternBackdrop.ts
/** Mèo chạy giữa màn: ảnh art/loading_cat_1, _2... chạy thành flip-book; chưa có thì vẽ đầu mèo tạm */
const CAT_PREFIX = 'art/loading_cat_';
const CAT_FPS = 12;
const CAT_SIZE = 200;
const TEXT_Y = -150;

let root: Node | null = null;
let cover: Graphics | null = null;
let backdrop: PatternBackdrop | null = null;
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
    root = uiNode('LoadingScreen', canvas, d.width, d.height);
    root.addComponent(BlockInputEvents);
    // Nền: ảnh BG_loading → hoạ tiết trôi → lớp lọc (mèo, chữ nằm trên)
    backdrop = new PatternBackdrop(root);
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
    backdrop?.update(dt);
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
 * Màn tải giữa hai cảnh (sau khi chọn ô lưu, sau khi đọc xong truyện): nền PatternBackdrop (ảnh BG_loading, hoạ tiết
 * art/Loading_pattern trộn kiểu Screen trôi chéo chậm, lớp hạt nhiễu Loading_filter), mèo nhún giữa màn (ảnh loading_cat_1.. chạy flip-book; chưa có thì đầu mèo tạm), chữ "Loading..." nhún
 * từng chữ. Hiện dần trên màn đen, tắt dần về đen. Chạy bằng setInterval (vẫn chạy khi game tạm dừng / đang chuyển cảnh).
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
