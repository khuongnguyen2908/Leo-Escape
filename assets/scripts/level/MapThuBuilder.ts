import { Color, Node, Size, UITransform, Vec2 } from 'cc';
import { CameraZone } from '../camera/CameraZone';
import { PlatformerBody } from '../core/PlatformerBody';
import { Solid } from '../core/Solid';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
import { KeySlots } from '../ui/KeySlots';
import { BigFishPickup } from './BigFishPickup';
import { Door } from './Door';
import { GroundBlock } from './GroundBlock';
import { KeyPickup } from './KeyPickup';
import { LockedGate } from './LockedGate';
import { MapBlock, MapBlockKind } from './MapBlock';

/**
 * Dựng map thử Map 1 (nóc nhà, cống, hang, hầm, bờ sông, 2 chìa, cổng 2 ổ khoá) vào scene MapThu bằng khối màu vẽ code,
 * theo toạ độ của bản thử docs/camera-demo.html (đã chỉnh cho cỡ Leo: thân 150 × 135, nhảy cao ~300, nhảy 2 lần ~520).
 * Không phải component; DemoLevelBuilder gọi qua nút 🧱. Mọi thứ nằm dưới node `MapThu` trong Gameplay (xoá node đó là bỏ hết),
 * trừ: 2 khối nền đá được rút ngắn để khoét nắp cống, 2 khối va chạm thay phần bị rút, ô chìa trên HUD, Wall Jump của Leo, Kill Y.
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
 * Cầu thang xuống ô đá thấp (ô đá người dùng tự đặt thẳng trong Gameplay, tên bắt đầu bằng Tile_, nằm dưới mặt phố gần chân khối đá cao).
 * Phố thấp hụt ở x 1980, 6 bậc 40 × 60 đi xuống bên phải. Phải bắt đầu sớm: thùng của cầu thang đi lên mg_up chìm xuống tới y -37 ở x 2517,
 * Leo rộng 150 cao 135 nên khi mép phải chạm thùng thì chân phải thấp hơn -172 (đã đứng trên bậc 5 trở đi),
 * nền phẳng chui dưới mg_up và dưới khối đá cao (khung va chạm khối cao chỉ còn dày 370) tới mặt ô đá. Đường cụt, không thông xuống cống.
 * Leo tự bước lên bậc thấp (PlatformerBody Step Height) nên đi bộ lên / xuống được. Bấm 🧱 lại thì đọc lại chỗ ô đá.
 */
function stairsToLedge(play: Node, root: Node, leo: PlayerController | null, done: string[]) {
    const tile = play.children.find((n) => n.name.startsWith('Tile_') && n.position.y < 0 && n.position.x > 2600 && n.position.x < 4000);
    const ut = tile?.getComponent(UITransform);
    if (!tile || !ut) {
        done.push('KHÔNG thấy ô đá thấp (node Tile_... thẳng trong Gameplay, dưới mặt phố, x 2600 → 4000): chưa làm cầu thang');
        return;
    }
    const sx = Math.abs(tile.scale.x), sy = Math.abs(tile.scale.y);
    const left = tile.position.x - ut.anchorX * ut.width * sx;
    const right = left + ut.width * sx;
    const artTop = tile.position.y + (1 - ut.anchorY) * ut.height * sy;
    // Mặt đứng thấp hơn mép trên ảnh ô đá: ô đá phố cao 281 thì mặt đứng thấp hơn mép ảnh 66 (≈ 23.5% chiều cao ảnh)
    const surface = Math.round(artTop - ut.height * sy * 0.235);
    const STREET_END = 1980, STEP_W = 60, STEP_H = 40, BOTTOM = -470;
    const steps = Math.max(1, Math.round(-surface / STEP_H));
    const stepH = -surface / steps;

    // Phố thấp hụt ở x 1980
    const street = root.getChildByName('VaCham_SauNap_1380')?.getComponent(Solid);
    if (street) {
        const w = STREET_END - (1380 + HOLE);
        street.size = new Size(w, 470);
        street.offset = new Vec2(w / 2, -235);
    }
    // Khối đá cao: khung va chạm chỉ dày 370 (đáy ngang mặt phố) để có chỗ chui dưới; phần còn lại bên phải ô đá lấp lại
    const high = play.getComponentsInChildren(GroundBlock).find((g) => Math.abs(g.node.position.x - 2850) < 2);
    if (high && Math.abs(high.depth - 840) < 1) high.depth = 370;
    const solid = (name: string, x: number, top: number, w: number, h: number) => {
        const n = mk(name, root);
        n.setPosition(x, top, 0);
        const s = n.addComponent(Solid);
        s.size = new Size(w, h);
        s.offset = new Vec2(w / 2, -h / 2);
    };
    if (high) solid('VaCham_KhoiCao_SauODa', right, 0, 2850 + high.width - right, 470);

    // Bậc: cột đá đặc tới đáy (không hở xuống cống), nền phẳng tới ô đá, khung va chạm cho mặt ô đá
    for (let k = 1; k <= steps; k++) {
        const top = Math.round(-k * stepH);
        block(root, `CauThang_Bac${k}`, STREET_END + (k - 1) * STEP_W, top, STEP_W, top - BOTTOM, W, C.stone);
    }
    const floorX = STREET_END + steps * STEP_W;
    if (left > floorX) block(root, 'CauThang_NenPhang', floorX, surface, left - floorX, surface - BOTTOM, W, C.stone);
    solid('VaCham_ODaThap', left, surface, right - left, surface - BOTTOM);

    // Nền tối của hốc (sau ô đá, trên ô đá phố): đặt thẳng trong Gameplay ngay sau các khối nền đá, ô đá dời lên ngay sau nó
    play.getChildByName('MapThu_HocCauThang')?.destroy();
    const pocket = mk('MapThu_HocCauThang', play);
    pocket.setPosition(STREET_END, 0, 0);
    pocket.addComponent(MapBlock).setup(right - STREET_END, -BOTTOM, B, C.shaft);
    const grounds = play.getComponentsInChildren(GroundBlock).map((g) => g.node.getSiblingIndex());
    pocket.setSiblingIndex(Math.max(...grounds) + 1);
    tile.setSiblingIndex(pocket.getSiblingIndex() + 1);

    const body = leo?.getComponent(PlatformerBody);
    if (body && body.stepHeight < 45) body.stepHeight = 45;
    done.push(`cầu thang ${steps} bậc từ phố x ${STREET_END} xuống ô đá ${tile.name} (mặt đứng y ${surface}, x ${Math.round(left)} → ${Math.round(right)}), chui dưới khối đá cao; Leo tự bước lên bậc thấp (Step Height 45)`);
}

/** Dựng map thử vào Canvas (scene MapThu). Trả về danh sách việc đã làm để in ra Console. */
export function buildMapThu(canvas: Node): string[] {
    const done: string[] = [];
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
    fish(root, 'CaBu_Cong', 5090, -640);
    // Đáy vùng thấp hơn sàn cống ~750 để camera giữ Leo gần giữa khung (cống chỉ cao 680, khung hình zoom 0.7 cao ~1540);
    // không chặn hai bên để Leo đứng sát vách cống vẫn ở gần giữa khung
    zone(root, 'VungCamera_Cong', 940, -1900, 5220, 1880, false, false);
    const congXuongHang = door(root, 'Cua_XuongHang', 3600, -1150, 'XUỐNG HANG');

    // ---------- Bờ sông: dưới Nhà Leo, vào bằng ống cống ----------
    block(root, 'Song_Nen', -300, -470, 1300, 830, B, C.riverBg, 'BỜ SÔNG');
    block(root, 'Song_VachTrai', -420, -470, 120, 1100, W, C.earth);
    block(root, 'Song_KeTrai', -300, -1050, 400, 700, W, C.stone, 'KÈ ĐÁ');
    block(root, 'Song_LongSong', 100, -1250, 600, 300, W, C.earth);
    block(root, 'Song_Nuoc', 100, -1110, 600, 140, B, C.water, 'NƯỚC');
    block(root, 'Song_Thuyen', 330, -1130, 200, 30, P, C.wood, 'THUYỀN');
    block(root, 'Song_KePhai', 700, -1150, 300, 600, W, C.stone);
    block(root, 'Song_OngCong', 960, -990, 200, 160, B, C.pipe, 'ỐNG CỐNG');
    fish(root, 'CaBu_BoSong', -180, -1000);
    zone(root, 'VungCamera_BoSong', -420, -1900, 1420, 1880, false, false);

    // ---------- Mái nhà: giếng 1 (x ~1900) lên mái y 1160 ----------
    for (let i = 1; i <= 5; i++) block(root, `Gieng1_Buc${i}`, i % 2 ? 1880 : 2120, i * 210, 260, 30, P, C.wood);
    block(root, 'Mai1_Ngoi', 1650, 1130, 2650, 140, B, C.roof, 'MÁI NHÀ', true);
    block(root, 'Mai1', 1650, 1160, 2650, 40, P, C.roofDark);
    block(root, 'Mai2_Ngoi', 4500, 1130, 2100, 140, B, C.roof, '', true);
    block(root, 'Mai2', 4500, 1160, 2100, 40, P, C.roofDark);
    block(root, 'GacTrai', 1750, 1560, 800, 30, P, C.wood, 'GÁC TRÁI');
    fish(root, 'CaBu_GacTrai', 2150, 1640);
    block(root, 'Mai_Buc1', 3500, 1450, 300, 30, P, C.wood);
    block(root, 'Mai_Buc2', 5100, 1440, 380, 30, P, C.wood);

    // ---------- Giếng 2 (trên bậc cao x ~7150) lên tổ chim, chìa 1 ----------
    for (let i = 1; i <= 5; i++) block(root, `Gieng2_Buc${i}`, i % 2 ? 7150 : 7400, 370 + i * 230, 260, 30, P, C.wood);
    block(root, 'ToChim_1', 6800, 1660, 1900, 30, P, C.roofDark);
    block(root, 'ToChim_2', 7300, 2100, 1000, 30, P, C.roofDark);
    block(root, 'ToChim_3', 7800, 2530, 600, 30, P, C.wood, 'TỔ CHIM ĐẦU ĐÀN');
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
    done.push('dựng node MapThu: cống, bờ sông, mái nhà, tổ chim (chìa 1), cổng 2 ổ khoá, hầm bí mật, hang (chìa 2), 4 cá bự, 4 vùng camera, 6 cửa');

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
    return done;
}
