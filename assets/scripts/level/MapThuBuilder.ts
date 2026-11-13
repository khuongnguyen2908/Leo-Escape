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
import { FishPit } from './FishPit';
import { GroundBlock } from './GroundBlock';
import { Hazard } from './Hazard';
import { KeyPickup } from './KeyPickup';
import { LilyPad } from './LilyPad';
import { LockedGate } from './LockedGate';
import { MapBlock, MapBlockKind } from './MapBlock';
import { PropArt, PropKind } from './PropArt';
import { SongSat } from './SongSat';

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
function cutHole(play: Node, root: Node, fromX: number, oldWidth: number, holeX: number, done: string[]) {
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
    // Ống thẳng đứng: nền tối che ô đá chỗ lỗ, nắp (bục một chiều), 2 vách ống phía dưới khối đá
    block(root, `Ong_${Math.round(holeX)}`, holeX, top, HOLE, depth + 520, B, C.shaft);
    block(root, `NapCong_${Math.round(holeX)}`, holeX, top, HOLE, 24, P, C.lid, 'NẮP CỐNG (S S)');
    block(root, `VachOngTrai_${Math.round(holeX)}`, holeX - 60, top - depth, 60, 520, W, C.sewerWall);
    block(root, `VachOngPhai_${Math.round(holeX)}`, holeX + HOLE, top - depth, 60, 520, W, C.sewerWall);
    done.push(`nắp cống ở x ${Math.round(holeX)}: rút khối nền đá còn ${Math.round(holeX - fromX)}, thêm khối va chạm ${Math.round(holeX + HOLE)} → ${Math.round(right)}`);
}

/**
 * Hầm cầu thang dưới khối đá cao x 2850 → 4275 (kiểu hình mẫu của người dùng: mặt phố liền dưới quán và thùng mg_up).
 * - Vào bằng nắp hầm trên mặt khối đá cao (x 3280, giữa ShopNPC và cột điện), S S để chui xuống như nắp cống.
 * - Trong hầm: chiếu nghỉ sát vách trái (lối cũ ra phố, bị chồng thùng chặn) → 4 bậc 60 × 35 đi xuống → sàn y -300
 *   có song sắt (SongSat) thông xuống Cống → ô đá thấp Tile_ của người dùng (dời sát vách phải) có 1 cá bự.
 * - Song sắt chỉ mở được từ phía Cống (nhảy lên cụng đầu): đường tắt từ Cống về điểm lưu 1.
 * Khung va chạm khối đá cao chỉ dày 370 (đáy ngang mặt phố) để có chỗ cho hầm. Bấm 🧱 lại thì đọc lại chỗ ô đá.
 */
function stairsToLedge(play: Node, root: Node, leo: PlayerController | null, done: string[]) {
    const HIGH_X = 2850, HIGH_W = 1425, END = HIGH_X + HIGH_W, BOTTOM = -470;
    const HATCH_X = 3280, HATCH_W = 220;
    const LANDING_W = 120, LANDING_Y = -160, STEP_W = 60, STEPS = 4, FLOOR = -300;
    const GRATE_X = 3520, GRATE_W = 240;
    const tile = play.children.find((n) => n.name.startsWith('Tile_') && n.position.y < 0 && n.position.x > 2600 && n.position.x < 4300);
    const ut = tile?.getComponent(UITransform);
    const high = play.getComponentsInChildren(GroundBlock).find((g) => Math.abs(g.node.position.x - HIGH_X) < 2);
    if (!tile || !ut || !high) {
        done.push('KHÔNG thấy ô đá thấp (node Tile_... thẳng trong Gameplay, dưới mặt phố, x 2600 → 4300) hoặc khối đá cao x 2850: chưa làm hầm cầu thang');
        return;
    }
    const top = high.node.position.y;
    const solid = (name: string, x: number, y: number, w: number, h: number) => {
        const n = mk(name, root);
        n.setPosition(x, y, 0);
        const s = n.addComponent(Solid);
        s.size = new Size(w, h);
        s.offset = new Vec2(w / 2, -h / 2);
    };

    // Khối đá cao: khung va chạm dày 370 (đáy ngang mặt phố); khoét lỗ nắp hầm
    if (Math.abs(high.depth - 840) < 1) high.depth = 370;
    if (Math.abs(high.width - HIGH_W) < 1) high.width = HATCH_X - HIGH_X;
    solid('VaCham_SauNapHam', HATCH_X + HATCH_W, top, END - HATCH_X - HATCH_W, top);
    block(root, 'OngHam', HATCH_X, top, HATCH_W, top, B, C.shaft);
    block(root, 'NapHam', HATCH_X, top, HATCH_W, 24, P, C.lid, 'NẮP HẦM (S S)');

    // Ô đá thấp: dời sát vách phải của hầm (chỉ khi còn ở chỗ cũ, bạn kéo đi chỗ khác thì giữ nguyên)
    const sx = Math.abs(tile.scale.x), sy = Math.abs(tile.scale.y);
    const tw = ut.width * sx;
    let left = tile.position.x - ut.anchorX * tw;
    if (left < 3300) {
        const nl = END - tw;
        tile.setPosition(tile.position.x + (nl - left), tile.position.y, tile.position.z);
        done.push(`${tile.name}: dời sang phải, mép trái x ${Math.round(left)} → ${Math.round(nl)}`);
        left = nl;
    }
    const right = left + tw;
    const artTop = tile.position.y + (1 - ut.anchorY) * ut.height * sy;
    // Mặt đứng thấp hơn mép trên ảnh ô đá: ô đá phố cao 281 thì mặt đứng thấp hơn mép ảnh 66 (≈ 23.5% chiều cao ảnh)
    const surface = Math.round(artTop - ut.height * sy * 0.235);

    // Chiếu nghỉ, bậc, sàn (cột đá đặc tới đáy, không hở xuống cống), song sắt, khung va chạm mặt ô đá
    block(root, 'CauThang_ChieuNghi', HIGH_X, LANDING_Y, LANDING_W, LANDING_Y - BOTTOM, W, C.stone);
    block(root, 'CauThang_LoiCu', HIGH_X, -10, 60, 150, B, C.wood, '', true);
    const stepH = (LANDING_Y - FLOOR) / STEPS;
    for (let k = 1; k <= STEPS; k++) {
        const y = Math.round(LANDING_Y - k * stepH);
        block(root, `CauThang_Bac${k}`, HIGH_X + LANDING_W + (k - 1) * STEP_W, y, STEP_W, y - BOTTOM, W, C.stone);
    }
    const floorX = HIGH_X + LANDING_W + STEPS * STEP_W;
    block(root, 'CauThang_San1', floorX, FLOOR, GRATE_X - floorX, FLOOR - BOTTOM, W, C.stone);
    if (left > GRATE_X + GRATE_W) block(root, 'CauThang_San2', GRATE_X + GRATE_W, FLOOR, left - GRATE_X - GRATE_W, FLOOR - BOTTOM, W, C.stone);
    const grate = mk('SongSat_XuongCong', root);
    grate.setPosition(GRATE_X, FLOOR, 0);
    grate.addComponent(SongSat).setup(GRATE_W, 24);
    solid('VaCham_ODaThap', left, surface, right - left, surface - BOTTOM);
    fish(root, 'CaBu_HamCauThang', Math.round((left + right) / 2), surface + 60);

    // Nền tối của hầm (sau ô đá, dưới khối đá cao): đặt thẳng trong Gameplay ngay sau các khối nền đá, ô đá dời lên ngay sau nó
    play.getChildByName('MapThu_HocCauThang')?.destroy();
    const pocket = mk('MapThu_HocCauThang', play);
    pocket.setPosition(HIGH_X, 0, 0);
    pocket.addComponent(MapBlock).setup(END - HIGH_X, -BOTTOM, B, C.shaft);
    const grounds = play.getComponentsInChildren(GroundBlock).map((g) => g.node.getSiblingIndex());
    pocket.setSiblingIndex(Math.max(...grounds) + 1);
    tile.setSiblingIndex(pocket.getSiblingIndex() + 1);

    const body = leo?.getComponent(PlatformerBody);
    if (body && body.stepHeight < 45) body.stepHeight = 45;
    done.push(`hầm cầu thang dưới khối đá cao: nắp hầm x ${HATCH_X} (S S), ${STEPS} bậc xuống sàn y ${FLOOR}, song sắt x ${GRATE_X} thông xuống Cống (mở từ dưới), `
        + `ô đá ${tile.name} x ${Math.round(left)} → ${Math.round(right)} (mặt đứng y ${surface}) có 1 cá bự; mặt phố liền lại tới chân khối đá cao`);
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
    if (count) done.push(`${count} lá sen (LaSen_1..${count}) trên mặt nước y ${POND_WATER + 15}: đứng 1 giây thì rung, chìm 2,5 giây rồi nổi lại`);
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
 * - Cây bự ở đầu phải sân thượng: thân x 8350 → 8800 là tường cứng tới y 3080, chặn đường xuống cổng.
 *   Cành bên trái thân y 2260 / 2680, tổ chim trên ngọn thân (y 3080) có chìa 1.
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
    // Cành và tổ chim ở bên trái thân; ngọn thân (mặt khối cứng) là chỗ đặt tổ chim có chìa 1. Thân vẽ thẳng (Pole) cho khớp khối va chạm.
    const TL = SLAB_R - 450, TR = SLAB_R, TREE_TOP = 3080;
    solid('CayTo_ThanVaCham', TL, TREE_TOP, TR - TL, TREE_TOP - SLAB_TOP);
    prop(canh, 'CayTo_Tan', PropKind.Canopy, 7300, 2700, 2600, 1300, P_C.leaf, P_C.leafLight);
    prop(canh, 'CayTo_Than', PropKind.Pole, TL, SLAB_TOP, TR - TL, TREE_TOP - SLAB_TOP, P_C.trunk);
    prop(canh, 'CayTo_ReTrai', PropKind.Rope, TL + 30, SLAB_TOP + 60, -160, -60, P_C.trunk);
    prop(canh, 'CayTo_CanhDuoi', PropKind.Rope, TL, 2140, -650, 140, P_C.trunk);
    prop(canh, 'CayTo_CanhTren', PropKind.Rope, TL, 2560, -500, 140, P_C.trunk);
    block(root, 'CayTo_BucCanhDuoi', 7700, 2260, TL - 7700, 26, P, P_C.trunk);
    block(root, 'CayTo_BucCanhTren', 7850, 2680, TL - 7850, 26, P, P_C.trunk);
    prop(root, 'ToChim', PropKind.Nest, TL + 75, TREE_TOP, 300, 110, P_C.rope, P_C.window);
    key(root, 'Chia1_ToChim', TL + 225, TREE_TOP + 130);

    done.push(`đường lên cao theo bản vẽ: cột trái x ${lx} (xà ${ARM}, đỉnh ${TOP}), dây võng ${segs} đoạn (thấp nhất y ${LOW_Y} ở x ${LOW_X}), `
        + `cột phải x ${rx} (nối tạm ${rTop} → ${TOP}), thang ${rungs} bậc + lỗ chui, sân thượng x ${SLAB_L} → ${SLAB_R} (mặt ${SLAB_TOP}), `
        + `cây bự chặn bên phải (thân ${TL} → ${TR}, ngọn ${TREE_TOP}), cành 2260 / 2680, tổ chim trên ngọn thân (chìa 1)`);
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

/** Dựng map thử vào Canvas (scene MapThu). Trả về danh sách việc đã làm để in ra Console. */
export function buildMapThu(canvas: Node, skyFrame: SpriteFrame | null = null): string[] {
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

    // ---------- Nắp cống: khoét 2 lỗ trên phố ----------
    cutHole(play, root, 998, 1852.5, 1380, done);
    cutHole(play, root, 4268, 2422.5, 5530, done);
    stairsToLedge(play, root, leo, done);
    hideMiddlePillars(play, done);
    const pp = pillarPits(play, root, done);
    fishPits(play, root, pp.pits, pp.top, done);
    lilyPond(play, root, pp.pits, done);
    lampsAndFences(play, root, done);

    // ---------- Cống: ngay dưới phố, x 1000 → 6160, sàn -1150 ----------
    block(root, 'Cong_Nen', 1000, -470, 5160, 680, B, C.sewerBg, 'CỐNG');
    block(root, 'Cong_San', 1000, -1150, 5160, 700, W, C.sewerWall);
    // Vách trái chừa lỗ ống cống (-980 → -1150) thông ra bờ sông; vách phải kín
    block(root, 'Cong_VachTrai', 1000, -470, 60, 510, W, C.sewerWall);
    block(root, 'Cong_VachPhai', 6100, -470, 60, 680, W, C.sewerWall);
    block(root, 'Cong_Ong1', 2700, -470, 120, 680, B, C.pipe);
    block(root, 'Cong_Ong2', 3900, -470, 120, 680, B, C.pipe);
    block(root, 'Cong_Buc1', 2100, -880, 500, 30, P, C.wood);
    block(root, 'Cong_Buc2', 3000, -950, 600, 30, P, C.wood);
    block(root, 'Cong_Buc3', 4300, -820, 500, 30, P, C.wood);
    block(root, 'Cong_Ngach', 4900, -700, 380, 30, P, C.wood, 'NGÁCH');
    // Bục ngay dưới song sắt của hầm cầu thang (x 3520 → 3760): nhảy lên cụng đầu là song sắt bật mở, đường tắt về điểm lưu 1
    block(root, 'Cong_BucSongSat', 3540, -720, 200, 30, P, C.wood, 'SONG SẮT ↑');
    fish(root, 'CaBu_Cong', 5090, -640);
    // Ống xuống từ 2 nắp cống dựng ở cutHole (phải trước stairsToLedge) nên nằm sau nền cống: đưa lên trên để nền không che
    for (const n of root.children.filter((c) => /^(Ong|VachOngTrai|VachOngPhai|NapCong)_\d+$/.test(c.name))) n.setSiblingIndex(root.children.length - 1);
    // Đáy vùng thấp hơn sàn cống ~750 để camera giữ Leo gần giữa khung (cống chỉ cao 680, khung hình zoom 0.7 cao ~1540);
    // không chặn hai bên để Leo đứng sát vách cống vẫn ở gần giữa khung
    zone(root, 'VungCamera_Cong', 940, -1900, 5220, 1880, false, false);
    const congXuongHang = door(root, 'Cua_XuongHang', 3600, -1150, 'XUỐNG HANG');

    // ---------- Kênh ngầm (trước gọi là Bờ sông): con kênh bị lấp dưới phố Nhà Leo, cống đổ ra đây qua ống bên trái cống ----------
    // Tên node giữ chữ Song_ như cũ. Mặt nước y -1170 (thấp hơn 2 gờ bê tông), bè thùng xốp nổi trên nước.
    block(root, 'Song_Nen', -300, -470, 1300, 830, B, P_C.culvertBg);
    prop(root, 'Song_VomKenh', PropKind.Culvert, -300, -1300, 1300, 830, P_C.concrete, P_C.stain, 'KÊNH NGẦM', 160);
    block(root, 'Song_VachTrai', -420, -470, 120, 1100, W, C.earth);
    block(root, 'Song_KeTrai', -300, -1050, 400, 700, W, P_C.concrete);
    block(root, 'Song_LongSong', 100, -1250, 600, 300, W, C.earth);
    block(root, 'Song_Nuoc', 100, -1170, 600, 80, B, P_C.canalWater);
    prop(root, 'Song_BeThungXop', PropKind.FoamRaft, 330, -1205, 200, 55, P_C.foam, P_C.rope);
    block(root, 'Song_Be', 330, -1150, 200, 18, P, P_C.foam);
    block(root, 'Song_KePhai', 700, -1150, 300, 600, W, P_C.concrete);
    // Nước từ ống cống chảy qua gờ phải rồi rớt xuống kênh
    block(root, 'Song_NuocChay', 700, -1150, 300, 24, B, P_C.flowWater);
    block(root, 'Song_ThacNho', 672, -1150, 34, 34, B, P_C.flowWater);
    block(root, 'Song_OngCong', 960, -990, 200, 160, B, C.pipe, 'ỐNG CỐNG');
    fish(root, 'CaBu_BoSong', -180, -1000);
    zone(root, 'VungCamera_BoSong', -420, -1900, 1420, 1880, false, false);

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

    // ---------- Cổng 2 ổ khoá trước khu boss ----------
    const gate = mk('Cong2OKhoa', root);
    gate.setPosition(8850, 370, 0);
    // Cao 4400 (đỉnh y 4770): đứng trên ngọn cây bự (3080) bám mặt cổng bật nhảy lên được tới ~4060, cổng 3600 cũ (đỉnh 3970) thì lách qua được (14/11)
    const lock = gate.addComponent(LockedGate);
    lock.height = 4400;
    lock.redraw();

    // ---------- Hầm bí mật (phòng riêng), cửa trên phố ở x 650 ----------
    const ham = room(root, 'PhongHam', -30000, 1600, 1200, C.cellarBg, C.cellarWall, 'HẦM BÍ MẬT');
    block(ham, 'Ham_Buc', -29300, 300, 400, 30, P, C.wood);
    fish(ham, 'CaBu_Ham', -29100, 400);
    link(door(root, 'Cua_Ham_Pho', 650, 0, 'HẦM BÍ MẬT'), door(ham, 'Cua_Ham_Trong', -29800, 0, 'LÊN PHỐ'));

    // ---------- Hang chó-gián (phòng riêng): chìa 2, cửa sắt lên phố gần cổng ----------
    const hang = room(root, 'PhongHang', -40000, 4200, 1300, C.caveBg, C.caveWall, 'HANG CHÓ-GIÁN');
    block(hang, 'Hang_Buc1', -38700, 350, 500, 30, P, C.wood);
    block(hang, 'Hang_Buc2', -37500, 350, 500, 30, P, C.wood);
    block(hang, 'Hang_BossPhu', -38100, 520, 500, 520, B, C.caveWall, 'CHÓ-GIÁN CHÚA\n(làm sau)');
    key(hang, 'Chia2_Hang', -36700, 120);
    link(congXuongHang, door(hang, 'Cua_Hang_LenCong', -39700, 0, 'LÊN CỐNG'));
    link(door(hang, 'Cua_Hang_CuaSat', -36100, 0, 'CỬA SẮT LÊN PHỐ'), door(root, 'Cua_Pho_CuaSat', 8450, 370, 'CỬA SẮT'));
    done.push('dựng node MapThu: cống, kênh ngầm, cột điện + dây + sân thượng, tổ chim (chìa 1), cổng 2 ổ khoá, hầm bí mật, hang (chìa 2), cá bự, 4 vùng camera, 6 cửa');

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
