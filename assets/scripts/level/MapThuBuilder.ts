import { Color, instantiate, Node, Size, Sprite, SpriteFrame, UITransform, Vec2, Vec3, view } from 'cc';
import { CameraZone } from '../camera/CameraZone';
import { FadeBelow } from '../camera/FadeBelow';
import { PlatformerBody } from '../core/PlatformerBody';
import { Solid } from '../core/Solid';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
import { KeySlots } from '../ui/KeySlots';
import { BigFishPickup } from './BigFishPickup';
import { Door } from './Door';
import { FakeWall } from './FakeWall';
import { FishPit } from './FishPit';
import { GroundBlock } from './GroundBlock';
import { Hazard } from './Hazard';
import { KeyPickup } from './KeyPickup';
import { LilyPad } from './LilyPad';
import { LockedGate } from './LockedGate';
import { MapBlock, MapBlockKind } from './MapBlock';
import { PropArt, PropKind } from './PropArt';
import { SavePoint } from './SavePoint';

/**
 * Dựng map thử Map 1 (cột điện + dây + sân thượng, cống, hang, hầm, kênh ngầm, 2 chìa, cổng 2 ổ khoá) vào scene MapThu bằng khối màu vẽ code,
 * theo toạ độ của bản thử docs/camera-demo.html (đã chỉnh cho cỡ Leo: thân 150 × 135, nhảy cao ~300, nhảy 2 lần ~520).
 * Không phải component; DemoLevelBuilder gọi qua nút 🧱. Mọi thứ nằm dưới node `MapThu` trong Gameplay (xoá node đó là bỏ hết),
 * trừ: các khối nền đá được rút ngắn (2 nắp cống, khúc cột có hố), nón giao thông dời lên mép hố, ô chìa trên HUD, Wall Jump của Leo, Kill Y.
 */

const C = {
    roof: new Color(196, 104, 76, 255),
    roofDark: new Color(150, 70, 52, 255),
    wood: new Color(217, 164, 90, 255),
    sewerBg: new Color(59, 53, 80, 255),
    sewerWall: new Color(98, 88, 120, 255),
    pipe: new Color(107, 99, 134, 255),
    lid: new Color(88, 88, 88, 255),
    shaft: new Color(38, 34, 52, 255),
    riverBg: new Color(95, 143, 163, 255),
    water: new Color(70, 140, 190, 255),
    stone: new Color(126, 132, 120, 255),
    earth: new Color(83, 77, 83, 255),
    caveBg: new Color(64, 36, 44, 255),
    caveWall: new Color(110, 50, 60, 255),
    cellarBg: new Color(47, 58, 68, 255),
    cellarWall: new Color(76, 90, 104, 255),
    void: new Color(20, 16, 18, 255),
    note: new Color(240, 200, 120, 255),
};

/** Màu cho cảnh vẽ tạm (PropArt) */
const P_C = {
    wall: new Color(196, 170, 140, 255),
    shopWall: new Color(232, 204, 150, 255),
    window: new Color(250, 240, 222, 255),
    awningRed: new Color(206, 84, 70, 255),
    awningWhite: new Color(242, 246, 250, 255),
    trunk: new Color(116, 84, 60, 255),
    leaf: new Color(112, 162, 92, 255),
    leafLight: new Color(166, 204, 122, 255),
    rope: new Color(156, 116, 72, 255),
    signRed: new Color(196, 62, 52, 255),
    aircon: new Color(222, 226, 230, 255),
    pot: new Color(190, 104, 72, 255),
    beam: new Color(168, 116, 70, 255),
    inox: new Color(206, 214, 222, 255),
    inoxLight: new Color(242, 246, 250, 255),
    inoxTop: new Color(150, 160, 170, 255),
    rail: new Color(62, 92, 84, 255),
    flower: new Color(232, 130, 160, 255),
    culvertBg: new Color(52, 62, 66, 255),
    concrete: new Color(128, 132, 128, 255),
    stain: new Color(84, 96, 74, 255),
    canalWater: new Color(70, 110, 96, 255),
    flowWater: new Color(120, 176, 160, 255),
    foam: new Color(240, 240, 232, 255),
};

function prop(parent: Node, name: string, kind: PropKind, x: number, y: number, w: number, h: number, color: Color, color2?: Color, text = '', h2 = 0): Node {
    const n = mk(name, parent);
    n.setPosition(x, y, 0);
    n.addComponent(PropArt).setup(kind, w, h, color, color2, text, h2);
    return n;
}

const W = MapBlockKind.Wall, P = MapBlockKind.Platform, B = MapBlockKind.Backdrop;

/** Nắp cống: lỗ rộng 240 (Leo rộng 150), vách ống từ đáy khối đá (-470) xuống tới -980 */
const HOLE = 240;

function mk(name: string, parent: Node): Node {
    const n = new Node(name);
    n.layer = parent.layer;
    parent.addChild(n);
    return n;
}

function block(parent: Node, name: string, x: number, top: number, w: number, h: number, kind: MapBlockKind, color: Color, text = '', stripes = false): Node {
    const n = mk(name, parent);
    n.setPosition(x, top, 0);
    n.addComponent(MapBlock).setup(w, h, kind, color, text, stripes);
    return n;
}

function zone(parent: Node, name: string, x: number, y: number, w: number, h: number, top: boolean, sides = true): Node {
    const n = mk(name, parent);
    n.setPosition(x, y, 0);
    const z = n.addComponent(CameraZone);
    z.size = new Size(w, h);
    z.clampTop = top;
    z.clampSides = sides;
    return n;
}

function door(parent: Node, name: string, x: number, y: number, text: string): Door {
    const n = mk(name, parent);
    n.setPosition(x, y, 0);
    const d = n.addComponent(Door);
    d.text = text;
    return d;
}

function link(a: Door, b: Door) {
    a.target = b.node;
    b.target = a.node;
}

function fish(parent: Node, name: string, x: number, y: number) {
    const n = mk(name, parent);
    n.setPosition(x, y, 0);
    n.addComponent(BigFishPickup);
}

function key(parent: Node, name: string, x: number, y: number) {
    const n = mk(name, parent);
    n.setPosition(x, y, 0);
    n.addComponent(KeyPickup);
}

/** Phòng riêng: nền tối phủ rộng (che cảnh phố phía sau), nền phòng, sàn, 2 vách, trần, vùng camera kín. */
function room(parent: Node, name: string, x0: number, w: number, h: number, bg: Color, wall: Color, label: string): Node {
    const r = mk(name, parent);
    block(r, 'NenToi', x0 - 3000, h + 2000, w + 6000, h + 4500, B, C.void);
    block(r, 'NenPhong', x0, h, w, h, B, bg, label);
    block(r, 'San', x0 - 300, 0, w + 600, 300, W, wall);
    block(r, 'VachTrai', x0 - 300, h + 300, 300, h + 300, W, wall);
    block(r, 'VachPhai', x0 + w, h + 300, 300, h + 300, W, wall);
    block(r, 'Tran', x0, h + 300, w, 300, W, wall);
    zone(r, 'VungCamera', x0 - 300, -300, w + 600, h + 600, true);
    return r;
}

/** Rút ngắn khối nền đá có mép trái ở fromX (chỉ khi Width còn đúng số cũ) và thêm khối va chạm cho phần bên phải lỗ. */
function cutHole(play: Node, root: Node, fromX: number, oldWidth: number, holeX: number, done: string[], dropOnly = false) {
    const gb = play.getComponentsInChildren(GroundBlock).find((g) => Math.abs(g.node.position.x - fromX) < 2);
    if (!gb) {
        done.push(`KHÔNG thấy khối nền đá ở x ${fromX}: chưa khoét nắp cống ở x ${holeX}`);
        return;
    }
    const top = gb.node.position.y, depth = 470;
    if (Math.abs(gb.width - oldWidth) < 1) gb.width = holeX - fromX;
    const right = fromX + oldWidth;
    const n = mk(`VaCham_SauNap_${Math.round(holeX)}`, root);
    n.setPosition(holeX + HOLE, top, 0);
    const s = n.addComponent(Solid);
    s.size = new Size(right - holeX - HOLE, depth);
    s.offset = new Vec2((right - holeX - HOLE) / 2, -depth / 2);
    // Ống thẳng đứng: nền tối che ô đá chỗ lỗ, nắp (bục một chiều), 2 vách ống phía dưới khối đá.
    // Drop Only (ống chỉ rớt xuống): không có vách bên dưới, miệng ống (đáy khối đá -470) cao hơn gờ kênh 680 > nhảy 2 lần ~484: không leo lại được
    block(root, `Ong_${Math.round(holeX)}`, holeX, top, HOLE, dropOnly ? depth : depth + 520, B, C.shaft);
    block(root, `NapCong_${Math.round(holeX)}`, holeX, top, HOLE, 24, P, C.lid, 'NẮP CỐNG (S S)');
    if (!dropOnly) {
        block(root, `VachOngTrai_${Math.round(holeX)}`, holeX - 60, top - depth, 60, 520, W, C.sewerWall);
        block(root, `VachOngPhai_${Math.round(holeX)}`, holeX + HOLE, top - depth, 60, 520, W, C.sewerWall);
    }
    done.push(`nắp cống ở x ${Math.round(holeX)}${dropOnly ? ' (chỉ rớt xuống)' : ''}: rút khối nền đá còn ${Math.round(holeX - fromX)}, thêm khối va chạm ${Math.round(holeX + HOLE)} → ${Math.round(right)}`);
}

/**
 * Bỏ hầm cầu thang dưới khối đá cao (theo ý người dùng 14/11): trả khối đá cao x 2850 về liền, dày 840 (bản cũ rút còn 430 × 370 để khoét nắp hầm),
 * xoá nền tối của hầm (node MapThu_HocCauThang nằm thẳng trong Gameplay), ẩn ô đá thấp Tile_ người dùng đặt cho hầm (không xoá).
 * Nắp hầm, bậc, sàn, song sắt, cá bự của hầm nằm trong node MapThu nên tự mất khi bấm 🧱.
 */
function removeStairs(play: Node, done: string[]) {
    const HIGH_X = 2850, HIGH_W = 1425, DEPTH = 840;
    const high = play.getComponentsInChildren(GroundBlock).find((g) => Math.abs(g.node.position.x - HIGH_X) < 2);
    if (high && Math.abs(high.width - 430) < 1) high.width = HIGH_W;
    if (high && Math.abs(high.depth - 370) < 1) high.depth = DEPTH;
    const pocket = play.getChildByName('MapThu_HocCauThang');
    if (pocket) {
        pocket.removeFromParent();
        pocket.destroy();
    }
    const tile = play.children.find((n) => n.name.startsWith('Tile_') && n.position.y < 0 && n.position.x > 2600 && n.position.x < 4300);
    if (tile) tile.active = false;
    done.push(`bỏ hầm cầu thang: khối đá cao x ${HIGH_X} liền lại (rộng ${high?.width ?? '?'}, dày ${high?.depth ?? '?'})${tile ? ', ẩn ô đá ' + tile.name : ''}`);
}

/**
 * Khúc cột (khối nền đá cao ở x 6690): khung va chạm của khối phẳng ở mặt cột, phủ luôn 2 hố có nón nên mèo đi trên không.
 * Đọc mép các cột theo ảnh Tile_ con của khối, rút khối còn cột đầu, thêm khung va chạm cho các cột sau và cho đáy hố (ngang mặt phố, chân nón).
 * Bấm 🧱 lại: Width đã rút thì không rút nữa, khung va chạm nằm trong node MapThu nên được dựng lại.
 * Trả về mép trái / phải các hố và mặt cột (cho fishPits).
 */
function pillarPits(play: Node, root: Node, done: string[]): { pits: [number, number][]; top: number } {
    const FROM_X = 6690, OLD_WIDTH = 2239.6, FLOOR = 0, BOTTOM = -470;
    const gb = play.getComponentsInChildren(GroundBlock).find((g) => Math.abs(g.node.position.x - FROM_X) < 2);
    if (!gb) {
        done.push(`KHÔNG thấy khối nền đá ở x ${FROM_X}: chưa làm hố giữa các cột`);
        return { pits: [], top: 0 };
    }
    const top = gb.node.position.y, end = FROM_X + OLD_WIDTH;
    // Mép trái / phải của từng ảnh cột, đổi sang toạ độ Gameplay; ảnh chồng nhau thì gộp làm một cột
    const pillars: [number, number][] = [];
    const p = new Vec3();
    for (const t of gb.node.children) {
        const ut = t.getComponent(UITransform);
        if (!t.name.startsWith('Tile_') || !ut || !t.active) continue;
        const b = ut.getBoundingBoxToWorld();
        play.inverseTransformPoint(p, new Vec3(b.x, b.y, 0));
        const l = p.x;
        play.inverseTransformPoint(p, new Vec3(b.x + b.width, b.y, 0));
        pillars.push([Math.max(FROM_X, Math.round(l)), Math.min(end, Math.round(p.x))]);
    }
    pillars.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const c of pillars) {
        const last = merged[merged.length - 1];
        if (last && c[0] <= last[1] + 10) last[1] = Math.max(last[1], c[1]);
        else merged.push([c[0], c[1]]);
    }
    if (merged.length < 2) {
        done.push(`khối nền đá x ${FROM_X} chỉ có ${merged.length} cột (ảnh Tile_): không có hố, giữ nguyên`);
        return { pits: [], top };
    }
    merged[merged.length - 1][1] = end;
    const solid = (name: string, x: number, y: number, w: number, h: number) => {
        const n = mk(name, root);
        n.setPosition(x, y, 0);
        const s = n.addComponent(Solid);
        s.size = new Size(w, h);
        s.offset = new Vec2(w / 2, -h / 2);
    };
    if (Math.abs(gb.width - OLD_WIDTH) < 1) gb.width = merged[0][1] - FROM_X;
    const pits: [number, number][] = [];
    for (let i = 1; i < merged.length; i++) {
        const [l, r] = merged[i];
        solid(`VaCham_Cot${i + 1}`, l, top, r - l, top - BOTTOM);
        const pl = merged[i - 1][1];
        solid(`VaCham_DayHo${i}`, pl, FLOOR, l - pl, FLOOR - BOTTOM);
        pits.push([pl, l]);
    }
    done.push(`hố giữa các cột: rút khối nền đá x ${FROM_X} còn cột đầu (→ ${merged[0][1]}), ${merged.length - 1} cột sau `
        + merged.slice(1).map(([l, r]) => `${l} → ${r}`).join(', ') + `, đáy hố ở y ${FLOOR}`);
    return { pits, top };
}

/**
 * Hố giữa các cột thành chỗ đường sụt lộ kênh ngầm: mỗi hố một FishPit (vách hố, nước kênh, một con cá lóc nhảy lên cắn).
 * Đáy hố (VaCham_DayHo) vẫn giữ làm chỗ đỡ, mèo chạm nước là bật lên mép trước khi tới đó.
 * Nón giao thông của người dùng (mg_cone... nằm trong hố) dời lên mép hố làm biển báo, tắt sát thương (Hazard).
 */
function fishPits(play: Node, root: Node, pits: [number, number][], top: number, done: string[]) {
    // Mặt nước thấp hơn mặt cột 220; cá nhảy tới y 500
    const BOTTOM = -470, PEAK = 500;
    pits.forEach(([l, r], i) => {
        const n = mk(`HoCa_${i + 1}`, root);
        n.addComponent(FishPit).setup(l, r, top, POND_WATER, BOTTOM, PEAK);
    });
    if (pits.length) done.push(`${pits.length} hố nước có cá lóc (HoCa_1..${pits.length}): mặt nước y ${POND_WATER}, cá nhảy tới y ${PEAK}`);
    if (!pits.length) return;
    // 4 nón: nửa đầu đứng ở mép trái hồ, nửa sau ở mép phải, cách nhau 120 (đặt lại từ đầu mỗi lần bấm, chân nón lún 11 như ảnh gốc)
    const l0 = pits[0][0], r1 = pits[pits.length - 1][1];
    const cones = play.children.filter((c) => c.name.startsWith('mg_cone') && c.position.x > l0 - 500 && c.position.x < r1 + 500)
        .sort((a, b) => a.position.x - b.position.x);
    const half = Math.ceil(cones.length / 2);
    cones.forEach((c, k) => {
        const x = k < half ? l0 - 60 - (half - 1 - k) * 120 : r1 + 60 + (k - half) * 120;
        c.setPosition(x, top - 11, 0);
        const hz = c.getComponent(Hazard);
        if (hz) hz.enabled = false;
    });
    if (cones.length) done.push(`${cones.length} nón dời lên 2 mép hồ (x ${cones.map((c) => Math.round(c.position.x)).join(', ')}), tắt sát thương`);
}

/** Mặt nước hồ / hố cá (y) */
const POND_WATER = 150;

/**
 * Khúc 7 theo bản vẽ của bạn: hồ lá sen thay cột đá giữa. Ẩn (không xoá) các ảnh Tile_ nằm giữa của khối nền đá x 6690,
 * chỉ giữ cột đầu và cột cuối; pillarPits đọc lại thì còn một hố rộng = hồ. Gọi trước pillarPits.
 */
function hideMiddlePillars(play: Node, done: string[]) {
    const gb = play.getComponentsInChildren(GroundBlock).find((g) => Math.abs(g.node.position.x - 6690) < 2);
    if (!gb) return;
    const tiles = gb.node.children.filter((t) => t.name.startsWith('Tile_') && t.getComponent(UITransform))
        .sort((a, b) => a.worldPosition.x - b.worldPosition.x);
    const middle = tiles.slice(1, -1);
    for (const t of middle) t.active = false;
    if (middle.length) done.push(`hồ lá sen: ẩn cột giữa (${middle.map((t) => t.name).join(', ')}), không xoá`);
}

/**
 * Lá sen trên hồ: rải đều trên mỗi hố, rộng 260 (hồ 1276 → 3 lá), mặt lá cao hơn mặt nước 15; từ lá thứ 2 trở đi có bông lục bình tím (như đốm tím trong bản vẽ).
 * Điểm lưu nằm trên hồ (cột giữa đã ẩn) thì dời sang cột trái, ngay trước hồ.
 */
function lilyPond(play: Node, root: Node, pits: [number, number][], done: string[]) {
    // Lá to, thưa như bản vẽ: hồ 1276 → 3 lá rộng 260, khe ~124
    const W = 260, GAP_TARGET = 420;
    let count = 0;
    for (const [l, r] of pits) {
        const n = Math.max(1, Math.round((r - l) / GAP_TARGET));
        const gap = (r - l - n * W) / (n + 1);
        for (let i = 0; i < n; i++) {
            const x = Math.round(l + gap + i * (W + gap));
            const pad = mk(`LaSen_${++count}`, root);
            pad.setPosition(x, POND_WATER + 15, 0);
            pad.addComponent(LilyPad).setup(W, i > 0);
        }
    }
    if (count) done.push(`${count} lá sen (LaSen_1..${count}) trên mặt nước y ${POND_WATER + 15}: chạm là 0,5 giây sau chìm, 2,5 giây sau nổi lại`);
    for (const cp of play.children.filter((c) => c.name.startsWith('Checkpoint'))) {
        const pit = pits.find(([l, r]) => cp.position.x > l && cp.position.x < r);
        if (!pit) continue;
        cp.setPosition(pit[0] - 230, cp.position.y, 0);
        done.push(`${cp.name} dời từ trên hồ sang cột trái (x ${Math.round(pit[0] - 230)})`);
    }
}

/**
 * Ảnh trời (art/Bg_simple) thay dải màu trời: node con TroiAnh của node Sky, đứng yên theo màn hình như dải màu cũ.
 * Phủ kín khung thiết kế (giữ tỉ lệ, dư 4% cho rung màn hình), bám mép trên để mây và cầu vồng luôn thấy.
 * Dải màu (SkyGradient) vẫn còn bên dưới. Có ảnh to hơn thì kéo đè cùng tên là nét hơn, không cần bấm lại.
 */
function skyImage(canvas: Node, frame: SpriteFrame | null, done: string[]) {
    const sky = canvas.getChildByName('Sky');
    if (!sky) {
        done.push('KHÔNG thấy node Sky: chưa gắn ảnh trời');
        return;
    }
    if (!frame) {
        done.push('KHÔNG thấy ảnh art/Bg_simple (phải nhập dạng sprite-frame): chưa gắn ảnh trời');
        return;
    }
    sky.getChildByName('TroiAnh')?.destroy();
    const n = mk('TroiAnh', sky);
    const ut = n.addComponent(UITransform);
    const sp = n.addComponent(Sprite);
    sp.trim = true;
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.spriteFrame = frame;
    const d = view.getDesignResolutionSize();
    const k = Math.max(d.width / frame.rect.width, d.height / frame.rect.height) * 1.04;
    const w = frame.rect.width * k, h = frame.rect.height * k;
    ut.setContentSize(w, h);
    ut.setAnchorPoint(0.5, 1);
    n.setPosition(0, d.height / 2 + d.height * 0.02, 0);
    done.push(`ảnh trời Bg_simple (${frame.rect.width} × ${frame.rect.height}) phủ kín khung hình, node Sky/TroiAnh, phóng ${k.toFixed(1)} lần`);
}

/** Màu cho đường lên cao theo bản vẽ của bạn */
const H_C = {
    concrete: new Color(132, 124, 132, 255),
    concreteDark: new Color(92, 86, 94, 255),
    hole: new Color(54, 50, 58, 255),
    cable: new Color(40, 36, 42, 255),
    ladder: new Color(190, 180, 92, 255),
    leafDark: new Color(58, 92, 62, 255),
    leafLight: new Color(110, 168, 96, 255),
};

/**
 * Đường lên cao theo bản vẽ của bạn (ảnh toàn cảnh MapThu tô thêm, 13/11; 1px ảnh ≈ 10 đơn vị game):
 * - Cột điện trái = ảnh mg_cotdien của bạn (đứng trên khối đá cao, đỉnh y 1276): bục xà ngang y 820, bục đỉnh cột y 1250.
 * - Dây điện võng từ đỉnh cột trái xuống thấp nhất y 950 ở x 4770 rồi lên đỉnh cột phải: đi được, là chuỗi khối cứng mỏng
 *   (Leo tự bước lên dốc nhờ Step Height; bục một chiều thì không bước lên được nên không dùng).
 * - Cột điện phải = ảnh mg_cotdien-001 (đỉnh y 895, thấp hơn bản vẽ): nối tạm một đoạn cột lên tới đỉnh y 1250.
 * - Thang x 6120 → 6440 từ y 1090 lên sân thượng, bậc cách nhau ~185, bấm W leo từng bậc; trên cùng là lỗ chui (rộng hơn thang) qua sân thượng.
 * - Sân thượng bê tông x 5750 → 8800, mặt trên y 1835, dày 365 (khối cứng), sát cổng (x 8820).
 * - Cây bự ở đầu phải sân thượng: thân x 8350 → 8800 là tường cứng tới y 4000 (đỉnh tán), chặn đường xuống cổng, không đứng trên đỉnh được.
 *   Cành bên trái thân y 2260 / 2680, tổ chim trên cành trên (7921, 2705) có chìa 1.
 */
function highRoute(play: Node, root: Node, canh: Node, done: string[]) {
    const solid = (name: string, x: number, top: number, w: number, h: number) => {
        const n = mk(name, root);
        n.setPosition(x, top, 0);
        const s = n.addComponent(Solid);
        s.size = new Size(w, h);
        s.offset = new Vec2(w / 2, -h / 2);
    };
    const poleL = play.getChildByName('mg_cotdien');
    const poleR = play.getChildByName('mg_cotdien-001');
    const lx = poleL ? Math.round(poleL.position.x) : 3582;
    const rx = poleR ? Math.round(poleR.position.x) : 5940;
    const rTop = poleR ? Math.round(poleR.position.y + (poleR.getComponent(UITransform)?.height ?? 861) * poleR.scale.y) : 895;
    // Nhảy 2 lần của Leo cao ~484 (đo 13/11): khối đá cao 370 → xà 820 → đỉnh 1250, mỗi nấc còn dư ~30-50
    const ARM = 820, TOP = 1250;

    // Cột trái: xà ngang + đỉnh cột (bục một chiều màu bê tông, nhảy xuyên từ dưới lên)
    block(root, 'CotTrai_XaNgang', lx - 160, ARM, 420, 26, P, H_C.concrete);
    block(root, 'CotTrai_Dinh', lx - 140, TOP, 300, 26, P, H_C.concrete);
    // Cột phải: đoạn nối tạm từ đỉnh ảnh của bạn lên tới đỉnh, rồi bục đỉnh cột.
    // Bục này là khối cứng mỏng: đi từ dây sang phải bước lên được (Step Height), bục một chiều thì không
    if (rTop < TOP - 30) prop(canh, 'CotPhai_NoiTam', PropKind.Pole, rx - 60, rTop, 120, TOP - 20 - rTop, H_C.concrete);
    block(root, 'CotPhai_Dinh', rx - 160, TOP, 280, 26, W, H_C.concrete);

    // Tán cây xanh đậm che khúc giữa dây (vẽ trước dây)
    prop(root, 'Day_TanCay', PropKind.Canopy, 4450, 860, 1400, 360, H_C.leafDark, H_C.leafLight);
    // Dây võng: y = 950 + a (x - 4770)², hai đầu ở đỉnh 2 cột
    const x0 = lx + 160, x1 = rx - 160, LOW_X = 4770, LOW_Y = 950;
    const a = (TOP - LOW_Y) / Math.pow(Math.max(LOW_X - x0, x1 - LOW_X), 2);
    const cy = (x: number) => LOW_Y + a * (x - LOW_X) * (x - LOW_X);
    const SEG = 40;
    let segs = 0;
    for (let x = x0; x < x1; x += SEG) {
        const w = Math.min(SEG, x1 - x);
        solid(`Day_VaCham${++segs}`, x, Math.round(cy(x + w / 2)), w, 20);
    }
    const VIS = 120;
    const day = mk('Day_Hinh', root);
    for (let x = x0, i = 1; x < x1; x += VIS, i++) {
        const nx = Math.min(x + VIS, x1);
        prop(day, `Doan${i}`, PropKind.Rope, x, cy(x) - 4, nx - x, cy(nx) - cy(x), H_C.cable);
    }

    // Sân thượng: 2 khối cứng hai bên lỗ chui, lòng lỗ tối. Lỗ rộng hơn thang 80 mỗi bên (nửa thân Leo 75):
    // đứng sát mép bậc thang bấm W thì đầu không cụng đáy sân thượng. Mép phải sát cổng (x 8820), cây bự chặn ở đó.
    const SLAB_L = 5750, SLAB_R = 8800, SLAB_TOP = 1835, SLAB_H = 365, LAD_L = 6120, LAD_R = 6440, HOLE_L = LAD_L - 80, HOLE_R = LAD_R + 80;
    block(root, 'SanThuong_LoChui', HOLE_L, SLAB_TOP, HOLE_R - HOLE_L, SLAB_H, B, H_C.hole);
    block(root, 'SanThuong_Trai', SLAB_L, SLAB_TOP, HOLE_L - SLAB_L, SLAB_H, W, H_C.concrete);
    block(root, 'SanThuong', HOLE_R, SLAB_TOP, SLAB_R - HOLE_R, SLAB_H, W, H_C.concrete, 'SÂN THƯỢNG');
    fish(root, 'CaBu_GacTrai', SLAB_L + 150, SLAB_TOP + 100);

    // Thang: 2 tay vịn + các bậc (bục một chiều), bậc trên cùng là nắp lỗ chui ngang mặt sân thượng
    const LADDER_BOTTOM = 1090;
    prop(root, 'Thang_TayTrai', PropKind.Rope, LAD_L + 20, LADDER_BOTTOM - 20, 0, SLAB_TOP - LADDER_BOTTOM + 20, H_C.ladder);
    prop(root, 'Thang_TayPhai', PropKind.Rope, LAD_R - 20, LADDER_BOTTOM - 20, 0, SLAB_TOP - LADDER_BOTTOM + 20, H_C.ladder);
    const rungs = 4, step = (SLAB_TOP - LADDER_BOTTOM) / rungs;
    for (let i = 0; i < rungs; i++) block(root, `Thang_Bac${i + 1}`, LAD_L, Math.round(LADDER_BOTTOM + i * step), LAD_R - LAD_L, 22, P, H_C.ladder);
    block(root, 'Thang_NapLo', HOLE_L, SLAB_TOP, HOLE_R - HOLE_L, 22, P, H_C.concreteDark);

    // Cây bự ở đầu phải sân thượng (14/11): thân rộng 450 sát cổng là tường cứng, chặn đường xuống cổng (khe thân ↔ cổng 20 < thân Leo 150).
    // Thân cứng cao tới đỉnh tán (4000): không đứng được trên đỉnh cây (từ cành trên nhảy 2 lần / bám thân bật nhảy chỉ lên ~3700).
    // Thân vẽ thẳng (Pole) cho khớp khối va chạm, vẽ TRƯỚC tán lá để tán che phần thân phía trên.
    const TL = SLAB_R - 450, TR = SLAB_R, TREE_TOP = 4000;
    solid('CayTo_ThanVaCham', TL, TREE_TOP, TR - TL, TREE_TOP - SLAB_TOP);
    prop(canh, 'CayTo_Than', PropKind.Pole, TL, SLAB_TOP, TR - TL, TREE_TOP - SLAB_TOP, P_C.trunk);
    prop(canh, 'CayTo_Tan', PropKind.Canopy, 7300, 2700, 2600, 1300, P_C.leaf, P_C.leafLight);
    prop(canh, 'CayTo_ReTrai', PropKind.Rope, TL + 30, SLAB_TOP + 60, -160, -60, P_C.trunk);
    prop(canh, 'CayTo_CanhDuoi', PropKind.Rope, TL, 2140, -650, 140, P_C.trunk);
    prop(canh, 'CayTo_CanhTren', PropKind.Rope, TL, 2560, -500, 140, P_C.trunk);
    block(root, 'CayTo_BucCanhDuoi', 7700, 2260, TL - 7700, 26, P, P_C.trunk);
    block(root, 'CayTo_BucCanhTren', 7850, 2680, TL - 7850, 26, P, P_C.trunk);
    // Tổ chim trên cành trên, chìa 1 phía trên tổ: đúng chỗ người dùng tự kéo trong Main (14/11)
    prop(root, 'ToChim', PropKind.Nest, 7921, 2705, 300, 110, P_C.rope, P_C.window);
    key(root, 'Chia1_ToChim', 8081, 2899);

    done.push(`đường lên cao theo bản vẽ: cột trái x ${lx} (xà ${ARM}, đỉnh ${TOP}), dây võng ${segs} đoạn (thấp nhất y ${LOW_Y} ở x ${LOW_X}), `
        + `cột phải x ${rx} (nối tạm ${rTop} → ${TOP}), thang ${rungs} bậc + lỗ chui, sân thượng x ${SLAB_L} → ${SLAB_R} (mặt ${SLAB_TOP}), `
        + `cây bự chặn bên phải (thân ${TL} → ${TR}, ngọn ${TREE_TOP}), cành 2260 / 2680, tổ chim trên cành trên (chìa 1)`);
}

/**
 * Khúc 5 + 6 theo bản vẽ của bạn: trên cột đầu và cột cuối cạnh hồ lá sen có hàng rào và cột đèn cổ cong chìa ra mép hồ.
 * Hàng rào = bản sao ảnh MG_hangrao_1 / MG_hangrao_2 của bạn (lấy từ node mg_hangrao... có sẵn, đặt ở y 441 như hàng rào trên khối đá cao).
 * Cột đèn = hình tạm (PropArt StreetLamp), có art thì thay. Chỉ là hình, không va chạm; nằm trong node MapThu nên bấm 🧱 là dựng lại.
 */
function lampsAndFences(play: Node, root: Node, done: string[]) {
    const LAMP = new Color(34, 32, 38, 255), BULB = new Color(255, 236, 170, 255);
    // Cột đèn trước (vẽ sau hàng rào): chân ở mặt cột, cao 700, cổ cong chìa ra phía hồ
    prop(root, 'CotDen_CotDau', PropKind.StreetLamp, 7050, 380, 140, 700, LAMP, BULB);
    prop(root, 'CotDen_CotCuoi', PropKind.StreetLamp, 8580, 380, -120, 700, LAMP, BULB);
    const frameOf = (n: Node) => n.getComponent(Sprite)?.spriteFrame?.name ?? '';
    const src1 = play.children.find((n) => n.name.startsWith('mg_hangrao') && frameOf(n) === 'MG_hangrao_1');
    const src2 = play.children.find((n) => n.name.startsWith('mg_hangrao') && frameOf(n) === 'MG_hangrao_2') ?? src1;
    if (!src1 || !src2) {
        done.push('KHÔNG thấy hàng rào mg_hangrao (ảnh MG_hangrao_1) trong Gameplay: chưa đặt hàng rào khúc 5 + 6');
        return;
    }
    const fences: [string, Node, number][] = [['HangRao_CotDau1', src1, 6810], ['HangRao_CotDau2', src2, 7020], ['HangRao_CotCuoi', src2, 8660]];
    for (const [name, src, x] of fences) {
        const n = instantiate(src);
        n.name = name;
        root.addChild(n);
        n.setPosition(x, 441, 0);
    }
    for (const n of root.children.filter((c) => c.name.startsWith('CotDen_'))) n.setSiblingIndex(root.children.length - 1);
    done.push('khúc 5 + 6: hàng rào (ảnh của bạn) x 6810, 7020 trên cột đầu, x 8660 trên cột cuối; 2 cột đèn tạm x 7050 (cổ sang phải), 8580 (cổ sang trái)');
}

/**
 * Kênh ngầm liền một dải dưới phố (theo ý người dùng 14/11), x -820 → 6160, trần = đáy khối đá phố (-470):
 * - Gờ bê tông đi bộ mặt -1150; 3 đoạn lòng kênh lộ nước (FishPit không cá, kiểu kênh): rơi xuống mất 1 máu, bật lên gờ gần nhất.
 *   Đoạn 1 và 2 có bè thùng xốp nổi giữa để nhảy.
 * - Ống cống trái (x 1380) chỉ rớt xuống (cutHole dropOnly): miệng ống cao hơn gờ 680, không bục nào trong tầm 484 dưới miệng ống.
 *   Ống cống phải (x 5530) có vách, bật tường leo lên phố.
 * - Cửa phòng boss chuột ở x 3600 trên gờ. Hốc đầu trái x -700 → -420 có cửa Hầm bí mật, che bằng tường giả (FakeWall, chém 3 nhát thì vỡ).
 * - Giữ: ngách có cá bự gần ống phải, cá bự đầu kênh.
 * Trả về 2 cửa để nối với phòng.
 */
function canal(root: Node, done: string[]): { bossDoor: Door; secretDoor: Door } {
    const L = -820, NICHE = -700, WALL = -420, R = 6160, TOP = -470, LEDGE = -1150, BOTTOM = -1450, WATER = -1240;
    const waters: [number, number][] = [[100, 700], [2000, 2450], [4200, 4600]];
    // Nền tối + vòm bê tông suốt chiều dài; đất lấp dưới đáy kênh (camera xuống tới -1900) và khe giữa 2 khối đá phố (x 933 → 998)
    block(root, 'Kenh_Nen', L, TOP, R - L, TOP - BOTTOM, B, P_C.culvertBg);
    block(root, 'Kenh_DatDuoi', L, BOTTOM, R - L, 700, B, C.earth);
    block(root, 'Kenh_LapKhePho', 925, -30, 80, -30 - TOP, B, C.earth);
    prop(root, 'Kenh_Vom', PropKind.Culvert, WALL, -1300, R - WALL, TOP + 1300, P_C.concrete, P_C.stain, 'KÊNH NGẦM', 160);
    // Vách hai đầu (hốc trái sau tường giả)
    block(root, 'Kenh_VachTrai', L, TOP, NICHE - L, TOP - BOTTOM, W, C.earth);
    // Trần đất trên hốc (phố chỉ bắt đầu từ x -300): kín, không nhảy ra ngoài màn được
    block(root, 'Kenh_TranHoc', L, 0, -300 - L, -TOP, W, C.earth);
    block(root, 'Kenh_VachPhai', 6100, TOP, R - 6100, TOP - BOTTOM, W, P_C.concrete);
    // Gờ đi bộ: liền từ hốc trái tới vách phải, đứt ở các đoạn nước
    let x = NICHE, k = 0;
    for (const [l, r] of [...waters, [6100, 6100] as [number, number]]) {
        if (l > x) block(root, `Kenh_Go${++k}`, x, LEDGE, l - x, LEDGE - BOTTOM, W, P_C.concrete);
        x = r;
    }
    // Lòng kênh lộ nước: không cá, vẽ kiểu kênh
    waters.forEach(([l, r], i) => {
        const n = mk(`Kenh_Nuoc${i + 1}`, root);
        const fp = n.addComponent(FishPit);
        fp.hasFish = false;
        fp.canal = true;
        fp.setup(l, r, LEDGE, WATER, BOTTOM, LEDGE);
    });
    // Bè thùng xốp nổi giữa đoạn nước 1 và 2 (vẽ sau nước)
    waters.slice(0, 2).forEach(([l, r], i) => {
        const bx = Math.round((l + r) / 2 - 90);
        prop(root, `Kenh_BeThungXop${i + 1}`, PropKind.FoamRaft, bx, WATER - 40, 180, 55, P_C.foam, P_C.rope);
        block(root, `Kenh_Be${i + 1}`, bx, WATER + 15, 180, 18, P, P_C.foam);
    });
    // Bục: xa miệng ống trái (x 1380 → 1620) và thấp hơn -954 gần đó, để không nhảy với tới miệng ống
    block(root, 'Kenh_Buc', 3000, -950, 500, 30, P, C.wood);
    block(root, 'Kenh_Ngach', 4900, -700, 380, 30, P, C.wood, 'NGÁCH');
    fish(root, 'CaBu_Cong', 5090, -640);
    fish(root, 'CaBu_BoSong', -180, -1000);
    // Hốc bí mật: cửa Hầm bí mật, che bằng tường giả cao từ gờ tới trần
    const secretDoor = door(root, 'Cua_Ham_Kenh', Math.round((NICHE + WALL) / 2), LEDGE, 'HẦM BÍ MẬT');
    const fake = mk('Kenh_TuongGia', root);
    fake.setPosition(WALL, TOP, 0);
    fake.addComponent(FakeWall).setup(120, TOP - LEDGE, 3, WALL - NICHE);
    const bossDoor = door(root, 'Cua_BossChuot', 3600, LEDGE, 'PHÒNG BOSS CHUỘT');
    // Đáy vùng thấp hơn gờ ~750 để camera giữ Leo gần giữa khung. Chặn hai bên theo vùng (không theo mép màn x -360),
    // để camera theo Leo vào tận hốc bí mật ở đầu trái
    zone(root, 'VungCamera_Kenh', L, -1900, R - L, 1880, false, true);
    done.push(`kênh ngầm x ${L} → ${R}: gờ ${LEDGE}, ${waters.length} đoạn nước (${waters.map(([l, r]) => `${l}→${r}`).join(', ')}), `
        + `cửa boss chuột x 3600, tường giả x ${WALL} che cửa Hầm bí mật, ống trái chỉ rớt xuống, ống phải leo lên được`);
    return { bossDoor, secretDoor };
}

/**
 * Miếu lưu game (14/11): ảnh MG_checkpoint / MG_checkpoint_active của người dùng, trên sân thượng ngay bên trái cây bự (thân miếu x ~7450,
 * trước cành dưới 7700 để nóc miếu cao ~480 không đâm qua cành). Bỏ cờ điểm lưu cũ (node Checkpoint trong Gameplay): ẩn, không xoá.
 */
function shrine(play: Node, root: Node, art: (name: string) => SpriteFrame | null, done: string[]) {
    const frame = art('MG_checkpoint'), active = art('MG_checkpoint_active');
    const n = mk('MieuLuu_CayBu', root);
    n.setPosition(7350, 1835, 0);
    n.addComponent(SavePoint).setup(frame, active, 1);
    const old = play.children.filter((c) => c.name.startsWith('Checkpoint') && c.active);
    for (const c of old) c.active = false;
    done.push(`miếu lưu game ở x 7350 trên sân thượng (cạnh cây bự)${frame ? '' : ' — KHÔNG thấy ảnh MG_checkpoint (phải nhập dạng sprite-frame)'}${active ? '' : ', thiếu ảnh MG_checkpoint_active'}`
        + (old.length ? `; ẩn ${old.length} cờ điểm lưu cũ` : ''));
}

/** Dựng map thử vào Canvas (scene MapThu). Trả về danh sách việc đã làm để in ra Console. art: tìm ảnh trong art theo tên. */
export function buildMapThu(canvas: Node, skyFrame: SpriteFrame | null = null, art: (name: string) => SpriteFrame | null = () => null): string[] {
    const done: string[] = [];
    skyImage(canvas, skyFrame, done);
    const play = canvas.getChildByName('Gameplay');
    if (!play) return ['không thấy node Gameplay'];
    // Bấm lại: xoá node MapThu cũ rồi dựng mới (chỉnh tay bên trong MapThu sẽ mất)
    const old = play.getChildByName('MapThu');
    if (old) {
        old.removeFromParent();
        old.destroy();
        done.push('xoá node MapThu cũ để dựng lại');
    }

    const root = mk('MapThu', play);
    // Vẽ sau nền đá nhưng trước mèo, chim, boss
    const leo = play.getComponentsInChildren(PlayerController).find((c) => c.catName !== 'Angelo') ?? null;
    if (leo) root.setSiblingIndex(leo.node.getSiblingIndex());

    // ---------- Nắp cống: khoét 2 lỗ trên phố (trái: chỉ rớt xuống kênh, không leo lại; phải: có vách ống, leo lên được) ----------
    cutHole(play, root, 998, 1852.5, 1380, done, true);
    cutHole(play, root, 4268, 2422.5, 5530, done);
    removeStairs(play, done);
    // Leo tự bước lên dốc thấp (đi trên dây điện cần)
    const leoBody = leo?.getComponent(PlatformerBody);
    if (leoBody && leoBody.stepHeight < 45) leoBody.stepHeight = 45;
    hideMiddlePillars(play, done);
    const pp = pillarPits(play, root, done);
    fishPits(play, root, pp.pits, pp.top, done);
    lilyPond(play, root, pp.pits, done);
    lampsAndFences(play, root, done);

    // ---------- Kênh ngầm liền một dải dưới phố (14/11, thay Cống tím + đoạn kênh dưới Nhà Leo) ----------
    const kenh = canal(root, done);
    // Ống xuống từ 2 nắp cống dựng ở cutHole (trước kênh) nên nằm sau nền kênh: đưa lên trên để nền không che
    for (const n of root.children.filter((c) => /^(Ong|VachOngTrai|VachOngPhai|NapCong)_\d+$/.test(c.name))) n.setSiblingIndex(root.children.length - 1);

    // ---------- Cảnh vẽ tạm (nhà, bạt, cây, cột, bảng): node riêng đầu Gameplay, nằm SAU mọi hình của bạn ----------
    // để bục không lơ lửng: mỗi bục bám vào một thứ (bạt che, cây, mái nhà, bảng quảng cáo, cột gỗ)
    play.getChildByName('MapThu_Canh')?.destroy();
    const canh = mk('MapThu_Canh', play);
    canh.setSiblingIndex(0);

    // ---------- Đầu phố lên mái: sàn nhà cây → giàn gỗ bên quán cà phê → mái quán → nóc tiệm SHOP → máy lạnh → mái ----------
    // Đo từ ảnh của bạn: node mg_cay_2 (ảnh MG_cay_2) mép phải thân ~x 350; quán mg_cafe (ảnh MG_cafe) vách trái x 1420 (y 100..300),
    // mái phẳng y ~533 từ x 1428 → 1860, máy lạnh trên mái x 1447 → 1579. Quán che thân cây mg_cay_4 nên bục giữa chống vào vách quán.
    // Thanh chống nằm TRƯỚC ảnh của bạn (node riêng trong MapThu, trước các bục) để thấy rõ bục bám vào đâu.
    const nhaCay = mk('NhaCay_ThanhChong', root);
    prop(nhaCay, 'Bat_Chong', PropKind.Beam, 338, 225, 82, 78, P_C.beam);
    block(root, 'Buc_Bat', 330, 330, 340, 24, P, C.wood);
    prop(nhaCay, 'Treo1_Chong1', PropKind.Beam, 1430, 280, -185, 74, P_C.beam);
    prop(nhaCay, 'Treo1_Chong2', PropKind.Beam, 1430, 170, -320, 184, P_C.beam);
    block(root, 'Buc_Treo1', 950, 380, 300, 24, P, C.wood);
    block(root, 'Buc_Treo2', 1590, 535, 270, 24, P, C.wood);
    prop(canh, 'Tiem_Shop', PropKind.House, 2100, 0, 520, 690, P_C.shopWall, P_C.window);
    prop(canh, 'Bang_Shop', PropKind.Sign, 2030, 250, 90, 400, P_C.signRed, P_C.window, 'SHOP');
    block(root, 'Buc_NocTiem', 2100, 700, 520, 24, P, C.roofDark);
    prop(canh, 'MayLanh', PropKind.AirCon, 2460, 830, 140, 100, P_C.aircon);
    block(root, 'Buc_MayLanh', 2460, 930, 140, 24, P, P_C.aircon);

    // ---------- Đường lên cao theo bản vẽ của bạn (13/11): cột điện → dây điện võng → thang → sân thượng → cây có tổ chim ----------
    // Bỏ mái nhà, gác trái, bồn nước, giếng trời và cây lớn cũ. Cá bự gác trái tạm đặt ở đầu trái sân thượng.
    highRoute(play, root, canh, done);
    shrine(play, root, art, done);

    // ---------- Cổng 2 ổ khoá trước khu boss ----------
    const gate = mk('Cong2OKhoa', root);
    gate.setPosition(8850, 370, 0);
    // Cao 4400 (đỉnh y 4770): đứng trên ngọn cây bự (3080) bám mặt cổng bật nhảy lên được tới ~4060, cổng 3600 cũ (đỉnh 3970) thì lách qua được (14/11)
    const lock = gate.addComponent(LockedGate);
    lock.height = 4400;
    lock.redraw();

    // ---------- Hầm bí mật (phòng riêng): cửa trong hốc đầu trái kênh ngầm, sau tường giả ----------
    const ham = room(root, 'PhongHam', -30000, 1600, 1200, C.cellarBg, C.cellarWall, 'HẦM BÍ MẬT');
    block(ham, 'Ham_Buc', -29300, 300, 400, 30, P, C.wood);
    fish(ham, 'CaBu_Ham', -29100, 400);
    link(kenh.secretDoor, door(ham, 'Cua_Ham_Trong', -29800, 0, 'RA KÊNH NGẦM'));

    // ---------- Phòng boss chuột (phòng riêng, trước là Hang chó-gián): chìa 2, cửa sắt lên phố gần cổng ----------
    const hang = room(root, 'PhongBossChuot', -40000, 4200, 1300, C.caveBg, C.caveWall, 'PHÒNG BOSS CHUỘT');
    block(hang, 'BossChuot_Buc1', -38700, 350, 500, 30, P, C.wood);
    block(hang, 'BossChuot_Buc2', -37500, 350, 500, 30, P, C.wood);
    block(hang, 'BossChuot', -38100, 520, 500, 520, B, C.caveWall, 'BOSS CHUỘT\n(làm sau)');
    key(hang, 'Chia2_BossChuot', -36700, 120);
    link(kenh.bossDoor, door(hang, 'Cua_BossChuot_RaKenh', -39700, 0, 'RA KÊNH NGẦM'));
    link(door(hang, 'Cua_BossChuot_CuaSat', -36100, 0, 'CỬA SẮT LÊN PHỐ'), door(root, 'Cua_Pho_CuaSat', 8450, 370, 'CỬA SẮT'));
    done.push('dựng node MapThu: kênh ngầm, cột điện + dây + sân thượng, tổ chim (chìa 1), cổng kẽm gai 2 ổ khoá, hầm bí mật (sau tường giả), phòng boss chuột (chìa 2), cá bự, 3 vùng camera, 6 cửa');

    // ---------- HUD: 2 ô chìa dưới thanh nộ ----------
    const hud = canvas.getChildByName('HUD');
    if (hud && !hud.getComponentInChildren(KeySlots)) {
        const k = mk('KeySlots', hud);
        k.setPosition(190, -175, 0);
        k.addComponent(KeySlots);
        done.push('HUD: 2 ô chìa (node KeySlots, dưới thanh nộ)');
    }

    // ---------- Leo bám tường bật nhảy (leo ống cống), rơi vực thấp hơn ----------
    if (leo && !leo.wallJump) {
        leo.wallJump = true;
        done.push('Leo: bật Wall Jump (chỉ trong scene này)');
    }
    const gm = canvas.getComponent(GameManager);
    if (gm && gm.killY > -3000) {
        gm.killY = -3000;
        done.push('GameManager: Kill Y → -3000 (chui cống không bị tính là rơi vực)');
    }
    // Lớp tiền cảnh trên phố (tủ điện, cột đèn, lá cây) mờ dần khi camera xuống cống / kênh ngầm
    for (const name of ['FR', 'FR_Top']) {
        const layer = canvas.getChildByName(name);
        if (layer && !layer.getComponent(FadeBelow)) {
            layer.addComponent(FadeBelow);
            done.push(`${name}: gắn FadeBelow (mờ dần khi camera xuống dưới phố)`);
        }
    }
    return done;
}
