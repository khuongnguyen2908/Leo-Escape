import { Color, Node, Size, Sprite, SpriteFrame, UITransform, Vec2, Vec3, view } from 'cc';
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
import { LockedGate } from './LockedGate';
import { MapBlock, MapBlockKind } from './MapBlock';
import { PropArt, PropKind } from './PropArt';
import { SongSat } from './SongSat';

/**
 * Dựng map thử Map 1 (nóc nhà, cống, hang, hầm, bờ sông, 2 chìa, cổng 2 ổ khoá) vào scene MapThu bằng khối màu vẽ code,
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
    // Mặt nước thấp hơn mặt cột 220; cá nhảy tới y 500 (dưới ban công thấp nhất của Giếng 2, đáy 570, nằm trên hố đầu)
    const WATER = 150, BOTTOM = -470, PEAK = 500;
    pits.forEach(([l, r], i) => {
        const n = mk(`HoCa_${i + 1}`, root);
        n.addComponent(FishPit).setup(l, r, top, WATER, BOTTOM, PEAK);
    });
    if (pits.length) done.push(`${pits.length} hố nước có cá lóc (HoCa_1..${pits.length}): mặt nước y ${WATER}, cá nhảy tới y ${PEAK}`);
    const cones = play.children.filter((c) => c.name.startsWith('mg_cone')).sort((a, b) => a.position.x - b.position.x);
    for (const [l, r] of pits) {
        const inPit = cones.filter((c) => c.position.x > l && c.position.x < r);
        inPit.forEach((c, k) => {
            const x = k % 2 === 0 ? l - 60 : r + 60;
            c.setPosition(x, top + c.position.y, 0);
            const hz = c.getComponent(Hazard);
            if (hz) hz.enabled = false;
            done.push(`${c.name}: dời lên mép hố (x ${x}), tắt sát thương`);
        });
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
    const pp = pillarPits(play, root, done);
    fishPits(play, root, pp.pits, pp.top, done);

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

    // ---------- Mái nhà y 1160 ----------
    block(root, 'Mai1_Ngoi', 1650, 1130, 2650, 140, B, C.roof, 'MÁI NHÀ', true);
    block(root, 'Mai1', 1650, 1160, 2650, 40, P, C.roofDark);
    block(root, 'Mai2_Ngoi', 4500, 1130, 2100, 140, B, C.roof, '', true);
    block(root, 'Mai2', 4500, 1160, 2100, 40, P, C.roofDark);
    // Gác trái: bạt che dựng trên mái (kiểu bạt)
    prop(canh, 'GacTrai_Bat', PropKind.Awning, 1750, 1160, 800, 400, P_C.awningRed, P_C.awningWhite);
    block(root, 'GacTrai', 1750, 1560, 800, 30, P, P_C.awningRed, 'GÁC TRÁI');
    fish(root, 'CaBu_GacTrai', 2150, 1640);
    // 2 bục trên mái: nắp bồn nước inox trên giàn sắt
    prop(canh, 'BonNuoc1', PropKind.WaterTank, 3500, 1250, 300, 200, P_C.inox, P_C.inoxLight, '', 90);
    block(root, 'Mai_Buc1', 3500, 1450, 300, 24, P, P_C.inoxTop);
    prop(canh, 'BonNuoc2', PropKind.WaterTank, 5100, 1240, 380, 200, P_C.inox, P_C.inoxLight, '', 80);
    block(root, 'Mai_Buc2', 5100, 1440, 380, 24, P, P_C.inoxTop);

    // ---------- Giếng 2 = giếng trời giữa 2 dãy nhà (trên bậc cao x ~7150), leo lên tổ chim ----------
    // Tường trái tới x 7150, tường phải từ x 7660; bục lẻ là ban công nhà trái, bục chẵn là ban công nhà phải
    prop(canh, 'Gieng2_NhaTrai', PropKind.House, 6880, 370, 270, 1260, P_C.wall, P_C.window);
    prop(canh, 'Gieng2_NhaPhai', PropKind.House, 7660, 370, 180, 1260, P_C.shopWall, P_C.window);
    for (let i = 1; i <= 5; i++) {
        const left = i % 2 === 1, x = left ? 7150 : 7400, y = 370 + i * 230;
        prop(canh, `Gieng2_BanCong${i}`, PropKind.Balcony, left ? 7150 : 7660, y, left ? 260 : -260, 70, P_C.rail);
        prop(canh, `Gieng2_Chau${i}`, PropKind.Pot, left ? 7165 : 7585, y, 60, 90, P_C.pot, i % 2 ? P_C.leaf : P_C.flower);
        block(root, `Gieng2_Buc${i}`, x, y, 260, 30, P, C.wood);
    }
    // ---------- Tổ chim: cây lớn, các bục là cành (kiểu tán cây) ----------
    prop(canh, 'CayLon_Than', PropKind.Trunk, 7850, 370, 220, 2050, P_C.trunk);
    prop(canh, 'CayLon_Tan', PropKind.Canopy, 6900, 1800, 2000, 1000, P_C.leaf, P_C.leafLight);
    prop(canh, 'CayLon_Canh1', PropKind.Rope, 7900, 1400, -900, 260, P_C.trunk);
    prop(canh, 'CayLon_Canh2', PropKind.Rope, 8020, 1450, 650, 210, P_C.trunk);
    prop(canh, 'CayLon_Canh3', PropKind.Rope, 7900, 1950, -560, 150, P_C.trunk);
    prop(canh, 'CayLon_Canh4', PropKind.Rope, 8020, 2000, 250, 100, P_C.trunk);
    block(root, 'ToChim_1', 6800, 1660, 1900, 30, P, P_C.trunk);
    block(root, 'ToChim_2', 7300, 2100, 1000, 30, P, P_C.trunk);
    block(root, 'ToChim_3', 7800, 2530, 600, 30, P, P_C.trunk, 'TỔ CHIM ĐẦU ĐÀN');
    prop(canh, 'ToChim', PropKind.Nest, 7930, 2530, 300, 110, P_C.rope, P_C.window);
    key(root, 'Chia1_ToChim', 8200, 2640);

    // ---------- Cổng 2 ổ khoá trước khu boss ----------
    const gate = mk('Cong2OKhoa', root);
    gate.setPosition(8850, 370, 0);
    gate.addComponent(LockedGate);

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
    done.push('dựng node MapThu: cống, bờ sông, mái nhà, tổ chim (chìa 1), cổng 2 ổ khoá, hầm bí mật, hang (chìa 2), cá bự, 4 vùng camera, 6 cửa');

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
