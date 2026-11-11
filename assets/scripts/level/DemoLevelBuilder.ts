import { _decorator, assetManager, BlockInputEvents, Color, Component, instantiate, Label, Node, resources, Size, Sprite, SpriteFrame, sys, TTFFont, UITransform, Vec2, view, Widget } from 'cc';
import { EDITOR } from 'cc/env';
import { CameraRig } from '../camera/CameraRig';
import { ParallaxLayer } from '../camera/ParallaxLayer';
import { ColliderDebug } from '../core/ColliderDebug';
import { PlatformerBody } from '../core/PlatformerBody';
import { Solid } from '../core/Solid';
import { BossArena } from '../enemy/BossArena';
import { BossBrain } from '../enemy/BossBrain';
import { EnemyPatrol } from '../enemy/EnemyPatrol';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerVisual } from '../player/PlayerVisual';
import { BossHealthBar } from '../ui/BossHealthBar';
import { CoinCounter } from '../ui/CoinCounter';
import { EnergyBar } from '../ui/EnergyBar';
import { HeartsHUD } from '../ui/HeartsHUD';
import { LandingScreen, MENU_ITEMS } from '../ui/LandingScreen';
import { Letterbox } from '../ui/Letterbox';
import { PauseMenu } from '../ui/PauseMenu';
import { TouchControls } from '../ui/TouchControls';
import { BigFishPickup } from './BigFishPickup';
import { Checkpoint } from './Checkpoint';
import { CoinGlow } from './CoinGlow';
import { CoinPickup } from './CoinPickup';
import { DEMO_CAMERA_OFFSET_Y, DEMO_ENEMIES, DEMO_GROUNDS, DEMO_LAYERS, DEMO_NODES, DEMO_PLAYER, DEMO_SPRITES } from './DemoLayout';
import { DemoReference } from './DemoReference';
import { DustDrift } from './DustDrift';
import { RiverFlow } from './RiverFlow';
import { DustMotes } from './DustMotes';
import { Goal } from './Goal';
import { GroundBlock } from './GroundBlock';
import { Hazard } from './Hazard';
import { HealPickup } from './HealPickup';
import { LeafCanopy } from './LeafCanopy';
import { LightRays } from './LightRays';
import { PinToScreenTop } from './PinToScreenTop';
import { PlaceholderBox } from './PlaceholderBox';
import { ShopNPC } from './ShopNPC';
import { SkyGradient } from './SkyGradient';
import { SoftGlow } from './SoftGlow';
import { BlockKind, TutorialBlock } from './TutorialBlock';
import { TutorialExit } from './TutorialExit';
import { TutorialRoom } from './TutorialRoom';
import { ArrowDir, TutorialSign } from './TutorialSign';
import { TrainingDummy } from './TrainingDummy';
const { ccclass, property } = _decorator;

// API của editor Cocos, chỉ tồn tại khi chạy trong Creator
declare const Editor: any;

/**
 * Mọi ảnh được vẽ cùng một tỉ lệ, nên chỉ cần một hệ số chung: 1px ảnh gốc = ART đơn vị game.
 * Đo từ ảnh demo: cái bàn (MG_ban rộng 312px) chiếm 180/1280 màn hình → 312 × ART ≈ 270.
 */
const ART = 0.87;

const LEVEL_START = -300;
const LEVEL_END = 7900;
const RAISED = 370;      // độ cao bậc đá
const TILE_FOOT = 60 / 285; // chỗ đặt chân trên ảnh MG_tile, tính từ đỉnh ảnh (tỉ lệ chiều cao)
const HUD_LEFT = 33;     // HUD cách mép trái / trên khung hình (đo theo ảnh demo)
const HUD_TOP = 30;
const BUILT_LAYERS = ['Sky', 'BG', 'Light_Far', 'MG', 'Light', 'Gameplay', 'FR', 'FR_Top', 'HUD', 'HUD_Angelo', 'BossBar', 'TouchControls'];
// Angelo tạm dùng hình Leo: nhuộm xám xanh, bóp gầy, cao hơn một chút
const ANGELO_TINT = new Color(150, 176, 210, 255);
const ANGELO_WIDTH = 0.78;
const ANGELO_HEIGHT = 1.06;

// Hệ số parallax của từng lớp
const BG_F = 0.12;
const MG_F = 0.8;
const FR_F = 1.35;
const LIGHT_F = 0.9;  // tia nắng: trôi giữa nhà cây (MG) và lớp chơi

/**
 * Vị trí đo trên 4 ảnh demo (1280×720): 1px ảnh = 1.5 đơn vị game (1920×1080).
 * FRAME_CAM là vị trí camera ứng với khung 1, 2, 3, 4 — các khung nối tiếp nhau, mỗi khung rộng 1920.
 */
const PX = 1.5;
const FRAME_CAM = [660, 2580, 4500, 6420];

/** Toạ độ x trong lớp có hệ số parallax `factor`, ứng với điểm `px` (0–1280) trên khung demo `frame` (1–4). */
function demoX(frame: number, px: number, factor = 1): number {
    return FRAME_CAM[frame - 1] * factor + (px - 640) * PX;
}

const MG_TINT = new Color(240, 244, 248, 255);
const BG_TINT = new Color(215, 236, 240, 255);
const FR_TINT = new Color(95, 100, 120, 255);
const FLAG_TINT = new Color(150, 140, 140, 255);
const RED_STOOL = new Color(255, 150, 150, 255);

const PH_PROP = new Color(214, 170, 120, 255);
const PH_TREE = new Color(110, 160, 110, 255);
const PH_HOUSE = new Color(220, 200, 165, 255);
const PH_PLAYER = new Color(245, 180, 90, 255);
const PH_ENEMY = new Color(235, 235, 235, 255);
const PH_FR = new Color(60, 62, 75, 255);
const RAY_TINT = new Color(255, 246, 214, 120);
const HAZE_TINT = new Color(238, 252, 240, 105);
const GLOW_TINT = new Color(255, 226, 120, 170);
/** Chỗ có tia nắng trong từng khung demo: [khung, x trên ảnh demo] */
const RAY_SPOTS: [number, number][] = [[1, 760], [2, 700], [3, 690], [4, 560]];

type PropOpts = { flip?: boolean; tint?: Color; ph?: [number, number]; phColor?: Color };
type PlatformOpts = PropOpts & { oneWay?: boolean; widthFrac?: number; topInset?: number };
/**
 * Đồ vật chặn cả hai bên (không đi xuyên, phải nhảy lên), đo trên ảnh gốc cỡ 1:1, toạ độ so với tâm đáy ảnh.
 * cx, w: tâm và bề ngang thân đồ vật (độ cao mặt đứng giữ như đang có trong scene).
 * extras: các khung phụ, mỗi khung một Solid trên cùng node (Solid phải là con trực tiếp của Gameplay nên không tách node con).
 *   cx, w: tâm và bề ngang; y: đáy khung; h: chiều cao khung.
 */
type SolidBox = { cx: number; w: number; y: number; h: number };
const SOLID_PROPS: Record<string, { cx: number; w: number; extras?: SolidBox[] }> = {
    // Thùng giấy + viên gạch + cây gỗ chung một ảnh. Cây gỗ nghiêng: 5 khung xếp bậc thang ôm theo đường chéo (dưới lên trên)
    mg_up: {
        cx: 60.5, w: 232, extras: [
            { cx: -90, w: 119, y: 0, h: 116 },          // viên gạch
            { cx: 106, w: 59, y: 204, h: 39.2 },        // cây gỗ
            { cx: 118.5, w: 68, y: 243.2, h: 39.2 },
            { cx: 138, w: 61, y: 282.4, h: 39.2 },
            { cx: 154.5, w: 56, y: 321.6, h: 39.2 },
            { cx: 164, w: 39, y: 360.8, h: 39.2 },
        ],
    },
    mg_thungrac: { cx: 2, w: 268 },
};
/**
 * Mặt đá có nắng (MG_tile_3), đo trên 4 ảnh demo 05/11/2026: chỉ ô đá ngay trước khe hở ở khung 1
 * (ảnh demo x 500 → 820) có vệt nắng; mọi ô khác, kể cả hai bậc đá cao, là MG_tile_2.
 * Toạ độ lớp Gameplay [x đầu, x cuối]; ô đá nào có tâm nằm trong đoạn thì dùng tile_3.
 */
const SUNLIT_X: [number, number][] = [[450, 933]];
/** Máu kẻ địch: số cũ → số mới (gấp 4, để chém cho đã tay). Chỉ đổi khi còn đúng số cũ. */
const ENEMY_HP: [number, number][] = [[3, 12], [10, 40]];
/** Thân va chạm của Leo: rộng 85 thì hình mèo (rộng 200) lấn vào tường; nới lên 150. */
const LEO_BODY_WIDTH = 150;
/** Máu boss (mốc phase theo % trong BossBrain: còn 67 sang phase 2, còn 34 sang phase 3; mỗi phase boss ra đủ 2 đòn mới qua mốc). */
const BOSS_HP = 150;
/** Camera thấy rộng hơn: 0.7 = khung hình ~2740 × 1540 đơn vị game (bước ⚙ 34) */
const CAMERA_ZOOM = 0.7;
/** Đất tối bên dưới đáy ảnh ô đá sâu bao nhiêu (đủ che cả khi giữ Xuống để nhìn xuống ở zoom 0.7) */
const FILL_BELOW = 1400;
type EnemyOpts = { name?: string; frames?: string[]; scale?: number; range?: number; hp?: number; speed?: number; body?: [number, number] };
type Built = { node: Node; w: number; h: number };
/** [tên ảnh, x, y, tỉ lệ so với cỡ gốc, lật?] */
type Placement = [string, number, number, number, boolean?];

/** Bỏ dấu tiếng Việt + chữ thường, để "FR_cờ" và "fr_co" là cùng một tên. */
function normalizeName(name: string): string {
    return Array.from(name.normalize('NFD'))
        .filter((ch) => { const c = ch.charCodeAt(0); return c < 0x300 || c > 0x36f; })
        .join('')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase();
}

/** "art/MG_cat/spriteFrame" hoặc "db://assets/resources/art/MG_cat.png/spriteFrame" → "mg_cat" */
function artKey(path: string): string {
    const parts = path.split('/');
    if (parts[parts.length - 1] === 'spriteFrame') parts.pop();
    return normalizeName(parts[parts.length - 1].replace(/\.(png|jpe?g|webp)$/i, ''));
}

/**
 * Dựng màn chơi theo 4 khung ảnh demo, từ ảnh trong assets/resources/art (giữ nguyên tên file như
 * MG_char_idle, MG_tile_2, FR_cotduong...). Ảnh nào chưa có thì hiện khối màu kèm tên để biết còn thiếu.
 * Mọi ảnh giữ đúng tỉ lệ gốc bạn vẽ (nhân chung hệ số ART).
 *
 * Cách dùng trong editor (3 nút):
 * - "⚙ Cập nhật": thêm những gì còn thiếu (ánh sáng, màn mở đầu, ghim băng rôn, ảnh nút) và áp bản sửa mới.
 *   Không dời, không xoá gì bạn đã xếp. Bấm bao nhiêu lần cũng vậy.
 * - "📐 Xếp lại theo ảnh demo": đặt lại vị trí, kích thước mọi đồ vật theo 4 ảnh demo (mất phần đã tự kéo).
 * - "⟳ Dựng màn từ đầu": scene trống thì dựng ngay; đã có màn thì phải tích "Cho phép xoá màn đang có" trước.
 * Nhớ Ctrl+S sau khi bấm. Nếu scene chưa dựng sẵn, bấm Play thì màn được dựng bằng code mỗi lần chạy.
 */
@ccclass('DemoLevelBuilder')
export class DemoLevelBuilder extends Component {
    @property({ displayName: '⚙ Cập nhật (giữ phần bạn xếp)', tooltip: 'Thêm ánh sáng, màn mở đầu, ghim băng rôn, ảnh nút nếu còn thiếu và áp bản sửa mới nhất. Không dời, không xoá gì bạn đã xếp' })
    get applyFixes() { return false; }
    set applyFixes(v: boolean) {
        if (v && EDITOR) this.applyFixesInEditor();
    }

    @property({ displayName: '📐 Xếp lại theo ảnh demo', tooltip: 'CẢNH BÁO: đặt lại vị trí, kích thước mọi đồ vật, chim, boss, mèo, nền đá và độ cao camera theo 4 ảnh demo. Phần bạn đã tự kéo sẽ mất. Không tạo, không xoá node' })
    get applyDemoLayout() { return false; }
    set applyDemoLayout(v: boolean) {
        if (v && EDITOR) this.applyDemoLayoutInEditor();
    }

    @property({ displayName: '⟳ Dựng màn từ đầu', tooltip: 'Scene trống thì dựng màn ngay. Đã có màn thì phải tích "Cho phép xoá màn đang có" trước: các lớp cũ bị xoá, phần đã tự sắp xếp sẽ mất' })
    get rebuildInScene() { return false; }
    set rebuildInScene(v: boolean) {
        if (v && EDITOR) this.rebuildFromScratch();
    }

    @property({ displayName: 'Cho phép xoá màn đang có', tooltip: 'Khoá an toàn cho nút ⟳. Tự tắt lại sau khi dựng' })
    allowRebuild = false;

    @property({ tooltip: 'Thư mục ảnh nằm trong assets/resources' })
    artFolder = 'art';

    @property({ tooltip: 'Mặt đất cách đáy màn hình bao nhiêu' })
    groundFromBottom = 270;

    @property({ tooltip: 'Hiện nút cảm ứng cả trên máy tính' })
    touchOnDesktop = false;

    @property({ tooltip: 'Vẽ khung va chạm để canh chỉnh' })
    debugColliders = false;

    @property({ tooltip: 'Khoá khung hình đúng 16:9 (1920×1080) như ảnh demo. Màn dài hơn sẽ có dải đen hai bên' })
    lockAspect = true;

    private art = new Map<string, SpriteFrame>();
    private missing = new Set<string>();
    private boss: EnemyPatrol | null = null;
    private W = 1920;
    private H = 1080;

    onLoad() {
        if (this.lockAspect && !EDITOR) this.lockFrame();
        if (!EDITOR) this.ensureMenu();

        // Màn đã được dựng sẵn trong scene thì không dựng lại
        const play = this.node.getChildByName('Gameplay');
        if (play) {
            const dbg = play.getComponent(ColliderDebug) ?? (this.debugColliders ? play.addComponent(ColliderDebug) : null);
            if (dbg) dbg.showInGame = this.debugColliders;
            this.ensureTouchControls();
            if (!EDITOR) this.ensureBossBrain(play);
            return;
        }
        const infos = resources.getDirWithPath(this.artFolder, SpriteFrame);
        if (infos.length === 0) {
            console.warn(`[DemoLevelBuilder] Chưa có ảnh trong assets/resources/${this.artFolder} — dùng khối màu thay thế.`);
            this.build();
            return;
        }
        resources.load(infos.map((i) => i.path), SpriteFrame, (err, frames) => {
            if (err) console.warn('[DemoLevelBuilder] Lỗi tải ảnh:', err);
            (frames ?? []).forEach((sf, i) => {
                if (sf) this.art.set(artKey(infos[i].path), sf);
            });
            this.build();
        });
    }

    /**
     * Nút cảm ứng phải nằm ngay dưới Canvas để đứng yên trên màn hình. Lỡ bị kéo vào lớp khác thì đưa về,
     * lỡ bị xoá thì tạo lại (chỉ lúc chơi, không đổi scene). Ô "Touch On Desktop" ở đây cũng bật nút trên máy tính.
     */
    private ensureTouchControls() {
        if (!sys.isMobile && !this.touchOnDesktop) return;
        const touch = this.node.getComponentInChildren(TouchControls);
        if (touch) {
            touch.showOnDesktop = true;
            this.placeTouchNode(touch.node);
            return;
        }
        const load = (name: string) => new Promise<SpriteFrame | null>((resolve) => {
            resources.load(`${this.artFolder}/${name}/spriteFrame`, SpriteFrame, (err, sf) => resolve(err ? null : sf));
        });
        Promise.all(['MG_joystick', 'Button_jump', 'Button_attack'].map(load)).then(([joystick, jump, attack]) => {
            if (!this.isValid) return;
            const n = this.mk('TouchControls', this.node);
            const d = view.getDesignResolutionSize();
            n.addComponent(UITransform).setContentSize(d.width, d.height);
            this.placeTouchNode(n);
            const t = n.addComponent(TouchControls);
            t.showOnDesktop = true;
            t.joystickFrame = joystick;
            t.jumpFrame = jump;
            t.attackFrame = attack;
        });
    }

    /** Đặt node nút cảm ứng dưới Canvas, giữa khung hình, ngay trên HUD và thanh máu boss. */
    private placeTouchNode(n: Node) {
        if (n.parent !== this.node) n.setParent(this.node);
        n.setPosition(0, 0, 0);
        const above = ['BossBar', 'HUD']
            .map((name) => this.node.getChildByName(name))
            .find((c): c is Node => !!c);
        if (above) n.setSiblingIndex(above.getSiblingIndex() + 1);
    }

    /**
     * Giữ khung hình đúng 1920×1080 như ảnh demo, với mọi cửa sổ và mọi chế độ xem trước:
     * camera tính theo bề ngang cố định, phần dư ngoài khung che bằng dải đen, HUD bám góc khung chứ không bám mép cửa sổ.
     * Chạy cả với scene đã dựng sẵn, nên không cần dựng lại màn.
     */
    private lockFrame() {
        const d = view.getDesignResolutionSize();
        const box = this.getComponent(Letterbox) ?? this.addComponent(Letterbox);
        box.frameSize = new Size(d.width, d.height);

        const cam = this.getComponent(CameraRig);
        if (cam) cam.viewWidth = d.width;

        const hud = this.node.getChildByName('HUD');
        if (hud) {
            const w = hud.getComponent(Widget);
            if (w) w.enabled = false;
            hud.setPosition(-d.width / 2 + HUD_LEFT, d.height / 2 - HUD_TOP, 0);
        }
        // HUD của Angelo: lật ngang, bám góc trên phải
        this.node.getChildByName('HUD_Angelo')?.setPosition(d.width / 2 - HUD_LEFT, d.height / 2 - HUD_TOP, 0);
    }

    /** Bộ não boss (phase, đòn axit): bước ⚙ 33 gắn sẵn vào scene; scene cũ chưa có thì gắn khi chơi. */
    private ensureBossBrain(play: Node) {
        for (const e of play.getComponentsInChildren(EnemyPatrol)) {
            if (e.big && !e.getComponent(BossBrain)) e.addComponent(BossBrain);
        }
    }

    /** Menu tạm dừng (Esc / nút bánh răng): tạo khi chơi, không lưu vào scene. */
    private ensureMenu() {
        if (this.node.getComponentInChildren(PauseMenu)) return;
        const d = view.getDesignResolutionSize();
        const n = this.mk('Menu', this.node);
        n.addComponent(UITransform).setContentSize(d.width, d.height);
        n.addComponent(PauseMenu);
    }

    /**
     * Sửa trên các node đang có, không xoá hay tạo lại gì, để giữ phần người dùng đã tự sắp xếp.
     * Mỗi khi sửa lỗi cách dựng màn, thêm một bước tương ứng vào đây.
     */
    private async applyFixesInEditor() {
        const play = this.node.getChildByName('Gameplay');
        if (!play) {
            console.warn('[DemoLevelBuilder] Scene chưa có màn (node Gameplay). Hãy dùng "⟳ Dựng màn từ đầu" trước.');
            return;
        }
        const done: string[] = [];

        // 1. Nền đá: nâng ảnh mép đá để chân đồ vật nằm giữa mặt đá như ảnh demo.
        //    Khối nào đã có số đo từ ảnh demo (DemoLayout) thì dùng đúng số đó, để không ghi đè kết quả "📐 Xếp theo ảnh demo"
        const demoSink = new Map(DEMO_GROUNDS.map((e) => [e.id, e.sink]));
        let grounds = 0;
        for (const g of play.getComponentsInChildren(GroundBlock)) {
            if (g.autoTiled >= 2) continue; // ⚙ đã đặt xong khối này: để yên Sink bạn chỉnh
            // Ảnh mép đá cao (MG_tile_high, có cả thân tường): chỗ đặt chân vẫn tính theo phần mép đá ở đỉnh ảnh (cao 285 px gốc)
            const k = g.tileFrame ? g.tileHeight / g.tileFrame.rect.height : 1;
            const want = demoSink.get(g.node.uuid) ?? Math.min(g.tileHeight, 285 * k) * TILE_FOOT;
            if (g.tileFrame && Math.abs(g.sink - want) > 0.5) {
                g.sink = want;
                grounds++;
            }
        }
        if (grounds) done.push(`${grounds} khối nền đá: chỉnh độ lún`);

        // 2. Chai nước hồi máu: đứng yên, đặt sát mặt đường (chỉ khi đang lơ lửng gần mặt đường)
        let pickups = 0;
        for (const h of play.getComponentsInChildren(HealPickup)) {
            let changed = false;
            if (h.bob) {
                h.bob = false;
                changed = true;
            }
            const p = h.node.position;
            const top = this.groundTopAt(play, p.x, p.y);
            if (top !== null && p.y > top && p.y - top < 60) {
                h.node.setPosition(p.x, top, p.z);
                changed = true;
            }
            if (changed) pickups++;
        }
        if (pickups) done.push(`${pickups} chai nước: đứng yên trên mặt đường`);

        // 3. Thứ tự vẽ: chim, boss, cá nằm trên đồ vật; mèo nằm trên cùng
        const orderBefore = play.children.map((n) => n.uuid).join();
        const movers = play.children.filter((n) => n.getComponent(EnemyPatrol) || n.getComponent(CoinPickup));
        for (const n of movers) n.setSiblingIndex(play.children.length - 1);
        // Hai con mèo trên cùng, Leo vẽ sau cùng (đứng trước Angelo)
        const cats = play.children.filter((n) => n.getComponent(PlayerController));
        cats.sort((a, b) => (a.getComponent(PlayerController)!.catName === 'Leo' ? 1 : 0) - (b.getComponent(PlayerController)!.catName === 'Leo' ? 1 : 0));
        for (const n of cats) n.setSiblingIndex(play.children.length - 1);
        if (play.children.map((n) => n.uuid).join() !== orderBefore) done.push('chim/boss/cá đưa lên trên đồ vật, mèo trên cùng');

        // 4. Khung va chạm hiện trong editor để canh chỉnh
        if (!play.getComponent(ColliderDebug)) {
            play.addComponent(ColliderDebug).showInGame = this.debugColliders;
            done.push('bật hiển thị khung va chạm trong editor');
        }

        // 5. Tia nắng nhú khỏi mép trên dù camera đang dời lên bao nhiêu (độ cao camera do "📐 Xếp theo ảnh demo" đặt)
        const rays = this.raiseRaysForCamera();
        if (rays) done.push(`${rays} tia nắng: nâng đỉnh cho khớp camera`);

        // 6. Ảnh thanh năng lượng, nút đánh, nút nhảy (chỉ gắn vào ô đang trống)
        try {
            await this.loadArtInEditor();
            done.push(...this.applyUiArt());
        } catch (e) {
            console.warn('[DemoLevelBuilder] Không nạp được ảnh nút và thanh năng lượng:', e);
        }

        // 7. Hào quang của con cá đã bị xoá: xoá luôn cho khỏi lơ lửng một mình trong editor
        const orphans = play.getComponentsInChildren(CoinGlow).filter((c) => !c.target || !c.target.isValid);
        for (const c of orphans) {
            c.node.removeFromParent();
            c.node.destroy();
        }
        if (orphans.length) done.push(`${orphans.length} hào quang không còn cá: đã xoá`);

        // 8. Ánh sáng còn thiếu: sương sáng, tia nắng, hào quang cho cá mới (có rồi thì để yên)
        const d = view.getDesignResolutionSize();
        this.W = d.width;
        this.H = d.height;
        done.push(...this.buildLighting(play));

        // 9. Băng rôn, cờ trong FR_Top: ghim mép trên sát mép khung hình (đã ghim thì để yên)
        const pinned = this.pinBanners();
        if (pinned) done.push(`${pinned} băng rôn/cờ: ghim sát mép trên`);

        // 10. Màn mở đầu (node Landing) nếu chưa có
        if (!this.node.getChildByName('Landing')) {
            try {
                this.buildLanding(await this.loadFontInEditor());
                done.push('thêm màn mở đầu (node Landing: logo + nút START)');
            } catch (e) {
                console.warn('[DemoLevelBuilder] Không thêm được màn mở đầu:', e);
            }
        }

        // 11. Không còn Angelo (game chỉ có Leo, 2 nút Đánh / Nhảy): xoá node Angelo và HUD_Angelo nếu còn
        for (const c of play.getComponentsInChildren(PlayerController)) {
            if (c.catName !== 'Angelo') continue;
            c.node.removeFromParent();
            c.node.destroy();
            done.push('xoá Angelo (game không còn Angelo)');
        }
        const hudAngelo = this.node.getChildByName('HUD_Angelo');
        if (hudAngelo) {
            hudAngelo.removeFromParent();
            hudAngelo.destroy();
            done.push('xoá HUD_Angelo');
        }

        // 12. Menu chính trong Landing: nền, logo, 5 dòng chữ, khung chọn, dòng bản quyền (có rồi thì để yên)
        try {
            done.push(...this.ensureMainMenu(await this.loadFontInEditor()));
        } catch (e) {
            console.warn('[DemoLevelBuilder] Không thêm được menu chính:', e);
        }

        // 13. Thùng giấy + viên gạch + cây gỗ, thùng rác: chặn hai bên, khung va chạm ôm đúng hình (đã đúng thì để yên)
        const solidProps = play.children.filter((n) => this.applySolidProp(n)).length;
        if (solidProps) done.push(`${solidProps} đồ vật (thùng giấy + viên gạch + cây gỗ, thùng rác): chặn hai bên, khung va chạm ôm đúng hình`);

        // 14. Mặt đá: nền thấp dùng MG_tile_1, bậc đá cao dùng MG_tile_high_1/2/3 thay phiên (ảnh cao có cả thân tường);
        //     ô có nắng (SUNLIT_X, đo trên ảnh demo) dùng MG_tile_3. Chưa có ảnh mới thì dùng MG_tile_2 như cũ
        let tiles = 0;
        const allGrounds = play.getComponentsInChildren(GroundBlock);
        for (const g of allGrounds) if (this.applySunlit(g, allGrounds)) tiles++;
        if (tiles) done.push(`${tiles} khối nền đá: thấp xếp ngẫu nhiên MG_tile_1/2, đầu phải lộ ra dùng góc MG_tile_3, đầu trái lộ ra dùng góc MG_tile_4; cao xếp ngẫu nhiên MG_tile_high_1/2/3`);
        if (!this.art.get('mg_tile_4')) done.push('chưa có MG_tile_4 dạng sprite-frame: chọn ảnh trong Assets, Type = sprite-frame, Apply, rồi bấm ⚙ lại (khối thấp sẽ thêm góc tile_4)');

        // 28. Vệt nắng MG_nắng hắt lên thân đá dưới mép đường, ngay trước cái hố ở khung 1 (như ảnh demo 1). Có node mg_nang rồi thì để yên
        const sun = this.art.get('mg_nang');
        if (!sun) done.push('chưa có MG_nắng dạng sprite-frame (nên đổi tên file thành MG_nang, không dấu): đổi Type = sprite-frame, Apply, rồi bấm ⚙ lại');
        else if (!this.findNamed('mg_nang')) {
            const n = this.mk('mg_nang', play);
            n.addComponent(Sprite).spriteFrame = sun;
            n.getComponent(UITransform)!.setAnchorPoint(0.5, 1);
            n.setPosition(666, -80, 0);
            const lastGround = Math.max(...allGrounds.map((g) => g.node.getSiblingIndex()));
            n.setSiblingIndex(lastGround + 1);
            done.push('thêm vệt nắng mg_nang dưới mép đường trước cái hố ở khung 1 (nằm trên nền đá, dưới đồ vật; kéo để dời, Ctrl+D để thêm chỗ khác)');
        }

        // 15. Máu kẻ địch gấp 4 (chỉ đổi khi còn đúng số cũ, bạn tự chỉnh số khác thì để yên)
        let hpChanged = 0;
        for (const e of play.getComponentsInChildren(EnemyPatrol)) {
            const to = ENEMY_HP.find(([from]) => e.hp === from)?.[1];
            if (to !== undefined) {
                e.hp = to;
                hpChanged++;
            }
        }
        if (hpChanged) done.push(`${hpChanged} kẻ địch: máu gấp 4 (chim 12, boss 40)`);

        // 16. Thân va chạm của Leo rộng 150 để hình mèo không lấn vào tường (chỉ đổi khi còn số cũ 85)
        for (const c of play.getComponentsInChildren(PlayerController)) {
            if (c.catName === 'Angelo') continue;
            const body = c.getComponent(PlatformerBody);
            if (body && Math.abs(body.size.width - 85) < 0.5) {
                body.size = new Size(LEO_BODY_WIDTH, body.size.height);
                done.push(`thân va chạm của ${c.node.name}: rộng 85 → ${LEO_BODY_WIDTH} (hình mèo không lấn vào tường)`);
            }
        }

        // 17. Kẻ địch (boss) mà hình (node con Visual) bị kéo lệch khỏi node: dời cả node tới chỗ hình, hình về (0, 0),
        //     chân đặt lên mặt đá ngay dưới. Khi chơi hình luôn bám node, nên kéo riêng hình thì con địch vẫn ở chỗ cũ.
        for (const e of play.getComponentsInChildren(EnemyPatrol)) {
            const v = e.visual;
            if (!v || (Math.abs(v.position.x) < 1 && Math.abs(v.position.y) < 1)) continue;
            const p = e.node.position;
            const x = p.x + v.position.x;
            const feet = p.y + v.position.y;
            // Mặt đá cao nhất ngay dưới chân (cho lệch lên 60 vì kéo tay khó khớp đúng mặt đá)
            let y = feet;
            let best = -Infinity;
            for (const g of play.getComponentsInChildren(GroundBlock)) {
                const gx = g.node.position.x, gy = g.node.position.y;
                if (x >= gx && x <= gx + g.width && gy <= feet + 60 && gy > best) best = gy;
            }
            if (best > -Infinity) y = best;
            e.node.setPosition(x, y, p.z);
            v.setPosition(0, 0, v.position.z);
            done.push(`${e.node.name}: dời tới chỗ hình (${Math.round(x)}, ${Math.round(y)}), hình Visual về (0, 0)`);
        }

        // 19. Máu boss → 150, khớp với ô Boss Hp của BossBrain (số thật lúc vào trận). Chỉ đổi khi còn đúng số cũ 40 hoặc 100
        for (const e of play.getComponentsInChildren(EnemyPatrol)) {
            if (e.big && (e.hp === 40 || e.hp === 100)) {
                const from = e.hp;
                e.hp = BOSS_HP;
                done.push(`${e.node.name}: máu ${from} → ${BOSS_HP}`);
            }
        }

        // 20. Màn hướng dẫn (khu riêng bên trái đầu màn), chỉ tạo khi chưa có node Tutorial
        if (!play.getChildByName('Tutorial')) {
            this.buildTutorial(play);
            done.push('màn hướng dẫn (node Tutorial và các Tut_..., bên trái đầu màn, x -9200 → -800)');
        }
        // 21. Biển THE TUTORIAL cao 640 đè lên hàng tim: hạ xuống 470 (chỉ khi còn đúng 640)
        const tutTitle = play.getChildByName('Tut_Sign_title');
        if (tutTitle && Math.abs(tutTitle.position.y - 640) < 0.5) {
            tutTitle.setPosition(tutTitle.position.x, 470, tutTitle.position.z);
            done.push('biển THE TUTORIAL: y 640 → 470 (khỏi đè hàng tim)');
        }

        // 18. Màn dài thêm (có khối nền vượt quá tường cuối): dời tường tàng hình cuối màn và giới hạn camera tới hết khối nền xa nhất
        let endX = -Infinity;
        for (const g of play.getComponentsInChildren(GroundBlock)) endX = Math.max(endX, g.node.position.x + g.width);
        if (endX > -Infinity) {
            const walls = play.children.filter((n) => n.name === 'Wall' && n.getComponent(Solid));
            const last = walls.reduce<Node | null>((a, n) => (!a || n.position.x > a.position.x ? n : a), null);
            if (last && last.position.x < endX) {
                const from = Math.round(last.position.x);
                last.setPosition(Math.round(endX + 30), last.position.y, last.position.z);
                done.push(`tường cuối màn: x ${from} → ${Math.round(endX + 30)} (hết khối nền xa nhất)`);
            }
            const rig = this.getComponent(CameraRig);
            if (rig && rig.maxX < endX) {
                const from = rig.maxX;
                rig.maxX = Math.round(endX);
                done.push(`camera: Max X ${from} → ${rig.maxX}`);
            }
        }

        // 21b. Nhạc nền mới: ô Music của GameManager còn là bài cũ "bgm" thì đổi sang bgm_forest (bạn tự đặt bài khác thì để yên)
        const gmMusic = this.getComponent(GameManager);
        if (gmMusic && gmMusic.music === 'bgm') {
            gmMusic.music = 'bgm_forest';
            done.push('nhạc nền: bgm → bgm_forest (nhạc trận boss: bgm_boss, ô Boss Music của BossArena)');
        }

        // 23. Ảnh mới theo 4 ảnh demo: bàn xanh, ghế đỏ, nhà vẽ lại, quán Lợi Ký, mây, nhà nền, lớp lọc màu, bụi, tán lá tiền cảnh
        done.push(...this.applyNewArt(play));

        // 25. Lớp BG (mây, cây, cổng thành, nhà) trôi chậm theo đường (hệ số 0.3) và xếp rải khắp màn; bụi sang lớp đứng yên, có anim
        done.push(...this.arrangeBackground());

        // 26. Miếng đá thấp sát khối cao: hình lấn 40 đè lên mép khối cao (khung va chạm giữ nguyên), khối cao vẽ trước khối thấp
        done.push(...this.overlapGrounds(play));

        // 27. bg_filter đứng yên theo màn hình: chuyển từ MG sang lớp mới Filter (hệ số 0) nằm ngay trên MG
        const filter = this.findNamed('bg_filter');
        if (filter && filter.parent?.name === 'MG') {
            const layer = this.node.getChildByName('Filter') ?? this.insertLayer('Filter', 0, 0, -270, 'MG');
            filter.removeFromParent();
            layer.addChild(filter);
            filter.setPosition(0, 270, 0);
            done.push('bg_filter sang lớp Filter (đứng yên theo màn hình, ngay trên MG), đặt giữa khung hình');
        }

        // 29. Dòng sông BG_river sát đáy màn hình, sau lớp chơi (lộ ra ở hố, khe giữa các khối đá), trôi 0.9, nước trôi + nhún nhẹ
        done.push(...this.ensureRiver());

        // 30. Nền đá xếp tay: khối nào còn tự xếp thì tạo ô đá thành node con thật (Tile_1, Tile_2...), bật Manual để bạn tự chỉnh từng ô
        let baked = 0, bakedTiles = 0;
        for (const g of play.getComponentsInChildren(GroundBlock)) {
            // Bản bake cũ (06/11 16:19, chưa lưu) làm ô thò ra / hụt khỏi mép khối: làm lại cho ô đầu, ô cuối khớp đúng mép
            const n = g.rebakeOld() || g.bake();
            if (n) {
                baked++;
                bakedTiles += n;
            }
        }
        if (baked) done.push(`${baked} khối nền đá chuyển sang xếp tay: ${bakedTiles} ô đá thành node con Tile_... (ảnh nguyên, cỡ gốc), kéo / đổi ảnh / xoá / Ctrl+D thoải mái`);

        // 31. Khu boss vừa một khung hình (camera giữ nguyên): rút khu boss bên trái 782.5 (khối Ground-001 còn 1640),
        //     bậc đá cao trước khu boss dài thêm chừng đó, boss về giữa khu mới. Chỉ làm khi hai khối còn đúng số cũ
        done.push(...this.fitBossArena(play));

        // 32. Cửa hàng: NPC mèo xám (tạm) đứng sau checkpoint 1, và 1 con cá bự để thử mua kỹ năng.
        //     Chỉ tạo khi cả màn chưa có ShopNPC / BigFishPickup nào (đã có thì để yên chỗ bạn kéo)
        done.push(...this.ensureShop(play));

        // 34. Camera zoom 0.7 (thấy rộng hơn, như bản thử docs/camera-demo.html). Chỉ đổi khi Zoom còn đúng 1.
        //     Kèm đất tối bên dưới mọi khối nền đá (ảnh ô đá chỉ sâu ~230 dưới mặt đường, zoom 0.7 lộ thêm phần dưới):
        //     chỉ đặt khi ô Fill Below còn 0
        const zoomRig = this.node.getComponent(CameraRig);
        if (zoomRig && Math.abs(zoomRig.zoom - 1) < 0.001) {
            zoomRig.zoom = CAMERA_ZOOM;
            done.push(`camera: Zoom 1 → ${CAMERA_ZOOM}`);
        }
        let underFilled = 0;
        for (const gb of play.getComponentsInChildren(GroundBlock)) {
            if (gb.fillBelow > 0) continue;
            gb.fillBelow = FILL_BELOW;
            underFilled++;
        }
        if (underFilled) done.push(`${underFilled} khối nền đá: tô đất tối sâu ${FILL_BELOW} bên dưới đáy ảnh ô đá (ô Fill Below, hình tạm)`);

        // 33. Boss: gắn sẵn BossBrain và BossArena vào node boss trong scene. Trước đây hai component này chỉ được gắn lúc chơi
        //     nên các ô chỉnh (máu, tốc độ lao, thời gian báo trước, số gai...) không hiện trong Inspector.
        //     Số trong các ô lúc mới gắn là số mặc định đang chạy; từ giờ chỉnh trong Inspector rồi Ctrl+S là có tác dụng
        for (const e of play.getComponentsInChildren(EnemyPatrol)) {
            if (!e.big) continue;
            const added: string[] = [];
            if (!e.getComponent(BossBrain)) {
                e.addComponent(BossBrain);
                added.push('BossBrain');
            }
            if (!e.getComponent(BossArena)) {
                e.addComponent(BossArena);
                added.push('BossArena');
            }
            if (added.length) done.push(`${e.node.name}: gắn sẵn ${added.join(' + ')} để chỉnh boss trong Inspector (số giữ nguyên như đang chơi)`);
        }

        // 24. Tán lá tối (fr_bush) bị bước 9 ghim mép trên như dây cờ (Overlap mặc định 4) nên tán lá lớn tụt xuống che màn hình:
        //     đặt Overlap để mép trên nhô ra ngoài khung đúng như đo trên ảnh demo (chỉ khi Overlap còn đúng 4)
        const frTopLayer = this.node.getChildByName('FR_Top');
        const BUSH_OVERLAP: [number, number][] = [[1549.5, 0], [4293, 280], [6865, 121], [7957, 260]];
        let bushFixed = 0;
        for (const n of frTopLayer?.children ?? []) {
            const pin = n.getComponent(PinToScreenTop);
            const want = BUSH_OVERLAP.find(([x]) => Math.abs(n.position.x - x) < 1)?.[1];
            if (!n.name.startsWith('fr_bush') || !pin || want === undefined || Math.abs(pin.overlap - 4) > 0.01) continue;
            pin.overlap = want;
            pin.pin();
            bushFixed++;
        }
        if (bushFixed) done.push(`${bushFixed} tán lá tối: chỉnh Overlap (ô của PinToScreenTop) để không tụt xuống che màn hình`);

        // 22. Biển DESCEND trên bục bị thanh cá che: hạ từ 700 xuống 600 (chỉ khi còn đúng 700)
        const tutDescend = play.getChildByName('Tut_Sign_descend');
        if (tutDescend && Math.abs(tutDescend.position.y - 700) < 0.5) {
            tutDescend.setPosition(tutDescend.position.x, 600, tutDescend.position.z);
            done.push('biển DESCEND: y 700 → 600 (khỏi bị thanh cá che)');
        }

        try { Editor.Message.send('scene', 'snapshot'); } catch (e) { /* bản editor không hỗ trợ cũng không sao */ }
        console.log(done.length
            ? `[DemoLevelBuilder] Đã cập nhật, giữ nguyên phần bạn sắp xếp:\n - ${done.join('\n - ')}\nNhấn Ctrl+S để lưu.`
            : '[DemoLevelBuilder] Màn đã đủ và mới nhất, không đổi gì.');
    }

    /**
     * Thêm Angelo nếu chưa có: nhân bản Leo (giữ mọi thông số chạy nhảy), đặt sau lưng Leo, nhuộm xám xanh, bóp gầy,
     * hộp va chạm hẹp hơn. Thêm HUD_Angelo (tim + thanh năng lượng) lật ngang ở góc trên phải. Gắn cả hai vào GameManager.
     */
    private ensureAngelo(play: Node): string[] {
        const done: string[] = [];
        const gm = this.getComponent(GameManager);
        const cats = play.getComponentsInChildren(PlayerController);
        const leo = gm?.player ?? cats.find((c) => c.catName !== 'Angelo') ?? null;
        if (!gm || !leo) return done;

        let angelo = gm.partner ?? cats.find((c) => c !== leo && c.catName === 'Angelo') ?? null;
        if (!angelo) {
            const n = instantiate(leo.node);
            n.name = 'Angelo';
            play.addChild(n);
            n.setSiblingIndex(leo.node.getSiblingIndex()); // ngay trước Leo, nên vẽ sau lưng Leo
            const p = leo.node.position;
            n.setPosition(p.x - 170, p.y, p.z);
            angelo = n.getComponent(PlayerController)!;
            angelo.catName = 'Angelo';
            const vis = angelo.visual;
            if (vis) {
                vis.tint = ANGELO_TINT.clone();
                vis.widthScale = ANGELO_WIDTH;
                vis.targetHeight = Math.round(vis.targetHeight * ANGELO_HEIGHT);
                vis.refresh();
            }
            const body = n.getComponent(PlatformerBody);
            if (body) body.size = new Size(Math.round(body.size.width * 0.8), body.size.height);
            done.push('thêm Angelo sau lưng Leo (hình tạm: Leo nhuộm xám xanh, gầy hơn)');
        }
        if (gm.partner !== angelo) gm.partner = angelo;

        let hud2 = this.node.getChildByName('HUD_Angelo');
        if (!hud2 && gm.hud) {
            const src = gm.hud;
            hud2 = this.mk('HUD_Angelo', this.node);
            hud2.setSiblingIndex(src.node.getSiblingIndex() + 1);
            hud2.setPosition(this.W / 2 - HUD_LEFT, this.H / 2 - HUD_TOP, 0);
            hud2.setScale(-1, 1, 1); // lật ngang: avatar sát mép phải, tim chạy vào giữa
            hud2.addComponent(UITransform).setAnchorPoint(0, 1);
            const h = hud2.addComponent(HeartsHUD);
            h.heartFrame = src.heartFrame;
            h.heartEmptyFrame = src.heartEmptyFrame;
            h.avatarFrame = src.avatarFrame;
            h.avatarRadius = src.avatarRadius;
            h.drawAvatarCircle = src.drawAvatarCircle;
            h.heartSize = src.heartSize;
            h.spacing = src.spacing;
            h.avatarTint = ANGELO_TINT.clone();
            const srcBar = src.node.getComponentInChildren(EnergyBar);
            const e = this.mk('Energy', hud2);
            const bp = srcBar?.node.position;
            e.setPosition(bp?.x ?? 394, bp?.y ?? -111, 0);
            const bar = e.addComponent(EnergyBar);
            bar.frameFrame = srcBar?.frameFrame ?? null;
            bar.fillFrame = srcBar?.fillFrame ?? null;
            done.push('thêm HUD của Angelo ở góc trên phải (tim + thanh năng lượng)');
        }
        const h2 = hud2?.getComponent(HeartsHUD) ?? null;
        if (h2 && gm.partnerHud !== h2) gm.partnerHud = h2;
        const bar2 = hud2?.getComponentInChildren(EnergyBar);
        if (bar2 && bar2.target !== angelo) bar2.target = angelo;
        return done;
    }

    /** Gắn PinToScreenTop cho các hình trong FR_Top chưa được ghim. Trả về số hình vừa ghim. */
    private pinBanners(): number {
        const frTop = this.node.getChildByName('FR_Top');
        if (!frTop) return 0;
        let added = 0;
        for (const n of frTop.children) {
            if (!n.getComponent(Sprite) || n.getComponent(PinToScreenTop)) continue;
            n.addComponent(PinToScreenTop).pin();
            added++;
        }
        return added;
    }

    /** Gắn ảnh MG_energy_gauge/fill vào thanh năng lượng, Button_jump/attack vào nút cảm ứng, chỉ ở ô còn trống. */
    private applyUiArt(): string[] {
        const done: string[] = [];
        const lost = new Set<string>();
        const pick = (name: string) => {
            const sf = this.frame(name);
            if (!sf) lost.add(name);
            return sf;
        };
        for (const bar of this.node.getComponentsInChildren(EnergyBar)) {
            const before = [bar.frameFrame, bar.fillFrame];
            if (!bar.frameFrame) bar.frameFrame = pick('MG_energy_gauge');
            if (!bar.fillFrame) bar.fillFrame = pick('MG_energy_fill');
            if (bar.frameFrame !== before[0] || bar.fillFrame !== before[1]) done.push('thanh năng lượng: dùng ảnh MG_energy_gauge, MG_energy_fill');
        }
        for (const touch of this.node.getComponentsInChildren(TouchControls)) {
            const before = [touch.jumpFrame, touch.attackFrame];
            if (!touch.jumpFrame) touch.jumpFrame = pick('Button_jump');
            if (!touch.attackFrame) touch.attackFrame = pick('Button_attack');
            if (touch.jumpFrame !== before[0] || touch.attackFrame !== before[1]) done.push('nút cảm ứng: dùng ảnh Button_jump, Button_attack');
        }
        if (lost.size > 0) {
            console.warn(`[DemoLevelBuilder] Chưa thấy ảnh: ${Array.from(lost).join(', ')}. `
                + 'Kiểm tra ảnh nằm trong assets/resources/art và ở Inspector có Type = sprite-frame (đổi xong bấm Apply).');
        }
        return done;
    }



    private async loadFontInEditor(): Promise<TTFFont | null> {
        const info: any = await Editor.Message.request('asset-db', 'query-asset-info', 'db://assets/resources/fonts/SuperBouncer.ttf');
        if (!info?.uuid) return null;
        return new Promise((resolve) => {
            assetManager.loadAny(info.uuid, (err: Error | null, f: TTFFont) => resolve(err ? null : f));
        });
    }

    private buildLanding(font: TTFFont | null) {
        const d = view.getDesignResolutionSize();
        const root = this.mk('Landing', this.node);
        root.addComponent(UITransform).setContentSize(d.width, d.height);
        root.addComponent(BlockInputEvents);
        const landing = root.addComponent(LandingScreen);
        landing.artFolder = this.artFolder;

        // Logo: chỗ đặt đo theo ảnh mẫu (tâm logo cách đỉnh khung ~285)
        const logo = this.mk('Logo', root);
        logo.setPosition(0, d.height / 2 - 285, 0);
        logo.addComponent(UITransform).setContentSize(740, 440);
        const logoFrame = this.frame('MG_logo');
        if (logoFrame) {
            landing.logoFrame = logoFrame;
            this.mk('Pic', logo).addComponent(Sprite).spriteFrame = logoFrame;
        } else {
            const text = this.mk('Text', logo).addComponent(Label);
            text.string = 'LEO\nESCAPE';
            text.fontSize = 170;
            text.lineHeight = 165;
            text.color = new Color(246, 195, 91, 255);
            text.enableOutline = true;
            text.outlineWidth = 10;
            text.outlineColor = new Color(90, 58, 42, 255);
            this.setFont(text, font);
        }

        // Nút START: ảnh Button_start, chữ START 90, viền 7px #3b7113 (tâm nút cách đáy khung ~218)
        const start = this.mk('Start', root);
        start.setPosition(0, -d.height / 2 + 218, 0);
        const btnFrame = this.frame('Button_start');
        if (btnFrame) start.addComponent(Sprite).spriteFrame = btnFrame;
        else {
            start.addComponent(UITransform).setContentSize(386, 194);
            console.warn('[DemoLevelBuilder] Chưa thấy ảnh Button_start (kiểm tra Type = sprite-frame). Nút START tạm chỉ có chữ.');
        }
        const label = this.mk('Text', start);
        label.setPosition(0, -8, 0);
        const t = label.addComponent(Label);
        t.string = 'START';
        t.fontSize = 90;
        t.lineHeight = 100;
        t.color = Color.WHITE;
        t.enableOutline = true;
        t.outlineWidth = 7;
        t.outlineColor = new Color(0x3b, 0x71, 0x13, 255);
        this.setFont(t, font);
    }

    /**
     * Menu chính theo ảnh mẫu (khung 1920×1080): ảnh Background phủ cả khung, logo tâm (-20, 240) tỉ lệ 0.97,
     * 5 dòng chữ trắng 60 viền 4px #462c22 từ y = -65 cách nhau 75, khung selection tâm (0, -68),
     * dòng bản quyền nâu 30 viền 3px #2c1d17 ở y = -480. Nút START cũ chỉ tắt đi. Thứ nào có rồi thì để yên.
     */
    private ensureMainMenu(font: TTFFont | null): string[] {
        const done: string[] = [];
        const root = this.node.getChildByName('Landing');
        if (!root) return done;
        const d = view.getDesignResolutionSize();
        const lost: string[] = [];
        const pick = (name: string) => {
            const sf = this.frame(name);
            if (!sf) lost.push(name);
            return sf;
        };
        // Ảnh giữ nguyên cả phần trong suốt quanh hình, để tâm ảnh đúng chỗ đo trên ảnh mẫu
        const picture = (n: Node, sf: SpriteFrame) => {
            const sp = n.getComponent(Sprite) ?? n.addComponent(Sprite);
            sp.trim = false;
            sp.sizeMode = Sprite.SizeMode.RAW;
            sp.spriteFrame = sf;
        };

        if (!root.getChildByName('MenuBg')) {
            const bg = pick('Background');
            if (bg) {
                const n = this.mk('MenuBg', root);
                n.setSiblingIndex(0);
                picture(n, bg);
                done.push('menu: nền Background');
            }
        }

        const logo = root.getChildByName('Logo');
        const logoFrame = pick('logo');
        if (logo && logoFrame && !logo.getChildByName('Pic')) {
            picture(this.mk('Pic', logo), logoFrame);
            const text = logo.getChildByName('Text');
            if (text) text.active = false;
            const landing = root.getComponent(LandingScreen);
            if (landing && !landing.logoFrame) landing.logoFrame = logoFrame;
            // Chỉ dời khi logo còn ở chỗ mặc định cũ (bạn chưa kéo)
            const p = logo.position;
            if (Math.abs(p.x) < 0.5 && Math.abs(p.y - (d.height / 2 - 285)) < 0.5) {
                logo.setPosition(-20, 240, 0);
                logo.setScale(0.97, 0.97, 1);
            }
            done.push('menu: logo');
        }

        const text = (n: Node, s: string, size: number, color: Color, outline: Color, width: number) => {
            const l = n.addComponent(Label);
            l.string = s;
            l.fontSize = size;
            l.lineHeight = Math.round(size * 1.2);
            l.color = color;
            l.enableOutline = true;
            l.outlineWidth = width;
            l.outlineColor = outline;
            this.setFont(l, font);
        };

        if (!root.getChildByName('Menu')) {
            const menu = this.mk('Menu', root);
            menu.addComponent(UITransform);
            const sel = this.mk('Selection', menu);
            sel.setPosition(0, -68, 0);
            const selFrame = pick('selection');
            if (selFrame) picture(sel, selFrame);
            else sel.addComponent(UITransform).setContentSize(385, 81);
            MENU_ITEMS.forEach(([name, s], i) => {
                const n = this.mk(name, menu);
                n.setPosition(0, -65 - 75 * i, 0);
                text(n, s, 60, Color.WHITE, new Color(0x46, 0x2c, 0x22, 255), 4);
            });
            done.push('menu: 5 dòng chữ và khung chọn (node Menu)');
        }

        if (!root.getChildByName('Copyright')) {
            const n = this.mk('Copyright', root);
            n.setPosition(0, -480, 0);
            text(n, '© 1999 2026 ALL RIGHTS RESERVED.', 30, new Color(0x96, 0x87, 0x87, 255), new Color(0x2c, 0x1d, 0x17, 255), 3);
            done.push('menu: dòng bản quyền');
        }

        const start = root.getChildByName('Start');
        if (start && start.active && root.getChildByName('Menu')) {
            start.active = false;
            done.push('menu: tắt nút START cũ (không xoá)');
        }

        if (lost.length) {
            console.warn(`[DemoLevelBuilder] Chưa thấy ảnh: ${lost.join(', ')}. `
                + 'Kiểm tra ảnh nằm trong assets/resources/art và ở Inspector có Type = sprite-frame (đổi xong bấm Apply).');
        }
        return done;
    }

    private setFont(label: Label, font: TTFFont | null) {
        if (!font) return;
        label.useSystemFont = false;
        label.font = font;
        label.isBold = false;
    }

    /** Camera dời lên thì lớp tia nắng trôi xuống theo: nâng đỉnh tia để vẫn nhú khỏi mép trên. Trả về số tia đã nâng. */
    private raiseRaysForCamera(): number {
        const rig = this.getComponent(CameraRig);
        const light = this.node.getChildByName('Light');
        if (!rig || !light) return 0;
        const fy = light.getComponent(ParallaxLayer)?.factor.y ?? 0;
        const need = this.H - this.groundFromBottom + fy * rig.offset.y + 30;
        let rays = 0;
        for (const r of light.getComponentsInChildren(LightRays)) {
            const p = r.node.position;
            if (p.y < need) {
                r.length += need - p.y;
                r.node.setPosition(p.x, need, p.z);
                rays++;
            }
        }
        return rays;
    }

    /**
     * Xếp lại các node có sẵn cho khớp 4 ảnh demo (số liệu trong DemoLayout.ts): vị trí, tỉ lệ, ảnh,
     * chiều cao chim/boss/mèo, nền đá, độ cao camera. Không tạo, không xoá node nào.
     */
    private async applyDemoLayoutInEditor() {
        try {
            await this.loadArtInEditor();
            const byId = new Map<string, Node>();
            const walk = (n: Node) => {
                byId.set(n.uuid, n);
                n.children.forEach(walk);
            };
            walk(this.node);
            const lost: string[] = [];
            const find = (id: string, name: string) => {
                const n = byId.get(id);
                if (!n) lost.push(name);
                return n;
            };
            const done: string[] = [];

            let moved = 0;
            for (const e of DEMO_NODES) {
                const n = find(e.id, e.name);
                if (!n) continue;
                const p = n.position, s = n.scale;
                // Băng rôn đã ghim sát mép trên thì giữ độ cao do ghim đặt, không giằng co với ghim
                const pinned = !!n.getComponent(PinToScreenTop);
                n.setPosition(e.x ?? p.x, pinned ? p.y : (e.y ?? p.y), p.z);
                n.setScale(e.sx ?? s.x, e.sy ?? s.y, s.z);
                moved++;
            }
            // Thứ tự vẽ: node có "above" nằm ngay trên node kia nếu đang bị che
            for (const e of DEMO_NODES) {
                const n = e.above ? byId.get(e.id) : undefined;
                const under = e.above ? byId.get(e.above) : undefined;
                if (n && under && n.parent === under.parent && n.getSiblingIndex() < under.getSiblingIndex()) {
                    n.setSiblingIndex(under.getSiblingIndex());
                    done.push(`${n.name} vẽ đè lên ${under.name}`);
                }
            }
            done.push(`${moved} node: đặt lại vị trí và kích thước`);

            for (const e of DEMO_SPRITES) {
                const sp = find(e.id, e.art)?.getComponent(Sprite);
                const sf = this.frame(e.art);
                if (sp && sf) {
                    sp.spriteFrame = sf;
                    done.push(`${sp.node.name}: đổi ảnh thành ${e.art}`);
                }
            }

            for (const e of DEMO_ENEMIES) {
                const enemy = find(e.id, 'chim/boss')?.getComponent(EnemyPatrol);
                if (!enemy) continue;
                enemy.targetHeight = e.targetHeight;
                enemy.artFacesRight = e.artFacesRight;
                const sf = e.walkFrame ? this.frame(e.walkFrame) : null;
                if (sf) enemy.walkFrames = [sf];
                enemy.refresh();
                done.push(`${enemy.node.name}: cao ${e.targetHeight}, quay mặt như demo${sf ? `, ảnh ${e.walkFrame}` : ''}`);
            }

            for (const e of DEMO_PLAYER) {
                const visual = find(e.id, 'mèo')?.getComponent(PlayerVisual);
                if (!visual) continue;
                visual.targetHeight = e.targetHeight;
                visual.refresh();
                done.push(`mèo: cao ${e.targetHeight}`);
            }

            let grounds = 0;
            for (const e of DEMO_GROUNDS) {
                const g = find(e.id, 'Ground')?.getComponent(GroundBlock);
                if (!g) continue;
                if (e.width !== undefined) g.width = e.width;
                // Số đo tính trên MG_tile_2 (cao 281 sau khi cắt viền trong suốt): quy đổi theo ảnh ô đá đang dùng (tile_1, tile_high...)
                g.tileHeight = e.tileHeight * (g.tileFrame ? g.tileFrame.rect.height / 281 : 1);
                g.sink = e.sink;
                grounds++;
            }
            done.push(`${grounds} khối nền đá: mép đá cỡ gốc, chân đứng như demo`);

            for (const e of DEMO_LAYERS) {
                const layer = find(e.id, 'lớp')?.getComponent(ParallaxLayer);
                if (!layer) continue;
                layer.factor = new Vec2(e.fx, layer.factor.y);
                done.push(`lớp ${layer.node.name}: trôi ngang ${e.fx}`);
            }

            const rig = this.getComponent(CameraRig);
            if (rig) {
                rig.offset = new Vec2(rig.offset.x, DEMO_CAMERA_OFFSET_Y);
                done.push(`camera: Offset Y = ${DEMO_CAMERA_OFFSET_Y}`);
            }
            const rays = this.raiseRaysForCamera();
            if (rays) done.push(`${rays} tia nắng: nâng đỉnh cho khớp camera`);

            // Ảnh demo phủ lên trên cùng để bật/tắt so sánh
            if (!this.node.getComponentInChildren(DemoReference)) {
                const ref = this.mk('DemoRef', this.node);
                ref.addComponent(DemoReference);
                ref.setSiblingIndex(this.node.children.length - 1);
                done.push('thêm node DemoRef (ảnh demo để so)');
            }

            if (lost.length) done.push(`không thấy ${lost.length} node (đã xoá?): ${lost.join(', ')}`);
            try { Editor.Message.send('scene', 'snapshot'); } catch (e) { /* bản editor không hỗ trợ cũng không sao */ }
            console.log(`[DemoLevelBuilder] Đã xếp theo ảnh demo:\n - ${done.join('\n - ')}\nNhấn Ctrl+S để lưu. `
                + 'So bằng node DemoRef: tích "Hiện ảnh demo" rồi chọn Khung 1–4.');
        } catch (e) {
            console.error('[DemoLevelBuilder] Không xếp được theo ảnh demo:', e);
        }
    }

    /** Mặt nền đá cao nhất nằm dưới điểm (x, y) trong lớp Gameplay, null nếu không có. */
    private groundTopAt(play: Node, x: number, y: number): number | null {
        let best: number | null = null;
        for (const g of play.getComponentsInChildren(GroundBlock)) {
            const gx = g.node.position.x;
            const top = g.node.position.y;
            if (x >= gx && x <= gx + g.width && top <= y + 1 && (best === null || top > best)) best = top;
        }
        return best;
    }





    /** Nút ⟳: scene trống thì dựng; đã có màn thì chỉ dựng lại khi đã tích "Cho phép xoá màn đang có". */
    private rebuildFromScratch() {
        const hasLevel = BUILT_LAYERS.some((name) => !!this.node.getChildByName(name));
        if (hasLevel && !this.allowRebuild) {
            console.warn('[DemoLevelBuilder] Scene đã có màn. Muốn xoá màn cũ và dựng lại từ đầu thì tích '
                + '"Cho phép xoá màn đang có" trước rồi bấm ⟳. Chỉ muốn thêm phần còn thiếu thì dùng ⚙ Cập nhật.');
            return;
        }
        this.allowRebuild = false;
        this.buildInEditor(hasLevel);
    }

    private async buildInEditor(clearOld: boolean) {
        const existing = BUILT_LAYERS
            .map((name) => this.node.getChildByName(name))
            .filter((n): n is Node => !!n);
        if (existing.length > 0 && !clearOld) {
            console.warn(`[DemoLevelBuilder] Scene đã có màn (${existing.map((n) => n.name).join(', ')}).`);
            return;
        }
        try {
            await this.loadArtInEditor();
            for (const n of existing) {
                n.removeFromParent();
                n.destroy();
            }
            this.missing.clear();
            this.build();
            try { Editor.Message.send('scene', 'snapshot'); } catch (e) { /* bản editor không hỗ trợ cũng không sao */ }
            console.log('[DemoLevelBuilder] Đã dựng màn vào scene. Nhấn Ctrl+S để lưu.');
        } catch (e) {
            console.error('[DemoLevelBuilder] Không dựng được màn:', e);
        }
    }

    /** Trong editor không dùng được resources.load, nên hỏi asset-db rồi nạp theo uuid. */
    private async loadArtInEditor() {
        const infos: any[] = await Editor.Message.request('asset-db', 'query-assets', {
            pattern: `db://assets/resources/${this.artFolder}/**`,
        }) ?? [];
        const sprites = new Map<string, string>(); // uuid → url
        const collect = (info: any) => {
            if (info?.type === 'cc.SpriteFrame' && info.uuid && info.url) sprites.set(info.uuid, info.url);
            if (info?.subAssets) Object.keys(info.subAssets).forEach((k) => collect(info.subAssets[k]));
        };
        infos.forEach(collect);

        await Promise.all(Array.from(sprites.entries()).map(([uuid, url]) => new Promise<void>((resolve) => {
            assetManager.loadAny(uuid, (err: Error | null, sf: SpriteFrame) => {
                if (!err && sf) this.art.set(artKey(url), sf);
                resolve();
            });
        })));
    }

    private build() {
        // Dựng theo khung thiết kế (1920×1080), không theo bề ngang cửa sổ lúc chạy
        const d = view.getDesignResolutionSize();
        this.W = d.width;
        this.H = d.height;
        const groundY = -this.H / 2 + this.groundFromBottom;

        this.buildSky();
        const bg = this.layer('BG', BG_F, 0.05, groundY);
        const mg = this.layer('MG', MG_F, 0.3, groundY);
        const play = this.layer('Gameplay', 1, 1, groundY);
        const fr = this.layer('FR', FR_F, 1.1, groundY);
        // Băng rôn treo trên cao: trôi ngang như FR nhưng đứng yên theo chiều dọc, để mép trên không bị hở khi camera lên xuống
        const frTop = this.layer('FR_Top', FR_F, 0, groundY);

        this.buildBackground(bg);
        this.buildMidground(mg);
        const player = this.buildGameplay(play);
        this.buildForeground(fr, frTop);
        this.buildLighting(play);

        // HUD ở góc trên trái khung hình. Khi không khoá khung thì dùng Widget để bám mép màn hình
        const hudNode = this.mk('HUD', this.node);
        hudNode.setPosition(-this.W / 2 + HUD_LEFT, this.H / 2 - HUD_TOP, 0);
        hudNode.addComponent(UITransform).setAnchorPoint(0, 1);
        const widget = hudNode.addComponent(Widget);
        widget.isAlignTop = widget.isAlignLeft = true;
        widget.top = HUD_TOP;
        widget.left = HUD_LEFT;
        widget.enabled = !this.lockAspect;
        // Đo theo ảnh demo: avatar tròn đường kính 140, tim cao 70 cách nhau 101, bộ đếm cá ở đỉnh màn hình
        const hud = hudNode.addComponent(HeartsHUD);
        const avatar = this.frame('mg_avatar');
        hud.avatarFrame = avatar ?? this.frame('mg_char_idle');
        hud.drawAvatarCircle = !avatar;
        hud.avatarRadius = 70;
        hud.heartFrame = this.frame('mg_heart');
        hud.heartEmptyFrame = this.frame('mg_heart_empty');
        hud.heartSize = 70;
        hud.spacing = 23;

        // Thanh năng lượng dưới hàng tim (chưa có ảnh thì vẽ tạm)
        const energyNode = this.mk('Energy', hudNode);
        energyNode.setPosition(394, -111, 0);
        const energy = energyNode.addComponent(EnergyBar);
        energy.frameFrame = this.frame('MG_energy_gauge');
        energy.fillFrame = this.frame('MG_energy_fill');

        const coinsNode = this.mk('Coins', hudNode);
        coinsNode.setPosition(946, -49, 0);
        const coins = coinsNode.addComponent(CoinCounter);
        coins.backingFrame = this.frame('mg_coin_backing');

        // Thanh máu boss ở đáy màn hình, tâm cách đáy 108
        const bossBarNode = this.mk('BossBar', this.node);
        bossBarNode.setPosition(0, -this.H / 2 + 108, 0);
        const bossBar = bossBarNode.addComponent(BossHealthBar);
        bossBar.boss = this.boss;
        bossBar.gaugeFrame = this.frame('mg_boss_hpgauge');
        bossBar.fillFrame = this.frame('mg_boss_hp');
        bossBar.iconFrame = this.frame('mg_icon_boss');

        const touchNode = this.mk('TouchControls', this.node);
        touchNode.addComponent(UITransform).setContentSize(this.W, this.H);
        const touch = touchNode.addComponent(TouchControls);
        touch.showOnDesktop = this.touchOnDesktop;
        touch.joystickFrame = this.frame('mg_joystick');
        touch.jumpFrame = this.frame('Button_jump');
        touch.attackFrame = this.frame('Button_attack');

        const gm = this.getComponent(GameManager) ?? this.addComponent(GameManager);
        gm.player = player;
        gm.hud = hud;
        gm.coinCounter = coins;
        gm.maxHp = 6;
        gm.killY = -this.groundFromBottom - 250;

        const cam = this.getComponent(CameraRig) ?? this.addComponent(CameraRig);
        cam.target = player.node;
        cam.minX = LEVEL_START;
        cam.maxX = LEVEL_END;
        // Khung hình như ảnh demo: mèo đứng ở ~30% từ trái khi chạy, camera không lên xuống
        cam.zoom = CAMERA_ZOOM;
        cam.offset = new Vec2(220, 0);
        cam.lookAhead = 160;
        cam.minY = 0;
        cam.maxY = 0;
        cam.followJump = false;
        cam.viewWidth = this.lockAspect ? this.W : 0;
        if (this.lockAspect && !EDITOR) this.lockFrame();

        // Khung va chạm luôn hiện trong editor để canh chỉnh; khi chơi chỉ hiện nếu bật Debug Colliders
        play.addComponent(ColliderDebug).showInGame = this.debugColliders;
        if (this.missing.size > 0) {
            console.warn(`[DemoLevelBuilder] Thiếu ${this.missing.size} ảnh (đang dùng khối màu): ${Array.from(this.missing).join(', ')}`);
        }
    }

    // ───────────────────────── Các lớp cảnh ─────────────────────────

    private buildSky() {
        const sky = this.mk('Sky', this.node).addComponent(SkyGradient);
        sky.size = new Size(this.W * 2, this.H * 2);
        sky.redraw();
    }

    private buildBackground(bg: Node) {
        for (const x of [-700, 900, 2100]) {
            this.prop(bg, 'mg_cay_2', x, 80, 0.45, { tint: BG_TINT, phColor: PH_TREE });
        }
        // Cổng thành mờ giữa trời
        this.prop(bg, 'bg_thanh', 300, 30, 1, { tint: BG_TINT, phColor: PH_HOUSE });
        this.prop(bg, 'bg_thanh', 1800, 30, 0.95, { tint: BG_TINT, phColor: PH_HOUSE, flip: true });
    }

    private buildMidground(mg: Node) {
        const x = (frame: number, px: number) => demoX(frame, px, MG_F);
        // Bụi cây vẽ trước tiên để nằm sau thân cây
        const bushes: Placement[] = [
            ['mg_buicay_2', x(1, 525), -10, 1], ['mg_buicay_1', x(2, 700), -10, 1],
            ['mg_buicay_2', x(3, 900), -10, 1], ['mg_buicay_1', x(4, 600), -10, 1],
        ];
        // Cây cổ thụ, tán vượt khỏi mép trên màn hình; cột bê tông
        const back: Placement[] = [
            ['mg_cay_2', x(1, 360), -10, 1], ['mg_cay_1', x(2, 0), -10, 1],
            ['mg_cay_3', x(3, 1010), -10, 1], ['mg_cotdien', x(4, 315), -10, 1],
        ];
        const front: Placement[] = [
            // Khung 1: nhà mái tôn bên trái, quán cafe (có sẵn máy lạnh trên mái) bên phải
            ['mg_nhao_3', x(1, 85), -10, 1], ['mg_cafe', x(1, 1210), -10, 1],
            // Khung 2: tiệm Thạch Trung
            ['mg_nhao_2', x(2, 450), -10, 1],
            // Khung 3: nhà bên phải
            ['mg_nhao_4', x(3, 1180), -10, 1, true],
            // Khung 4: quán bên trái trước bậc đá của boss
            ['mg_cafe', x(4, 120), -10, 1, true],
        ];
        for (const [name, px, y, s, flip] of bushes) {
            this.prop(mg, name, px, y, s, { flip, tint: MG_TINT, phColor: PH_TREE });
        }
        for (const [name, px, y, s, flip] of back) {
            this.prop(mg, name, px, y, s, { flip, tint: MG_TINT, phColor: PH_TREE });
        }
        for (const [name, px, y, s, flip] of front) {
            this.prop(mg, name, px, y, s, { flip, tint: MG_TINT, phColor: PH_HOUSE });
        }
    }

    private buildForeground(fr: Node, frTop: Node) {
        const x = (frame: number, px: number) => demoX(frame, px, FR_F);
        // Đồ tiền cảnh cao hơn màn hình nhiều, chỉ thò phần đầu lên: [tên, x, mép trên cách đáy màn hình]
        const posts: [string, number, number][] = [
            ['fr_cotduong', x(1, 198), 533], ['fr_tudien', x(1, 310), 218], ['fr_cotcaasm|fr_cotcam', x(1, 1105), 278],
            ['fr_cotcaasm|fr_cotcam', x(2, 838), 353], ['fr_tudien', x(2, 1018), 180],
            ['fr_cotduong', x(3, 115), 500], ['fr_cotcaasm|fr_cotcam', x(3, 210), 285],
            ['fr_tudien', x(4, 890), 165], ['fr_cotduong', x(4, 1150), 495],
            // Sau khung 4 (đoạn đích)
            ['fr_cotcaasm|fr_cotcam', 9900, 300], ['fr_tudien', 10400, 200],
        ];
        for (const [name, px, topAbove] of posts) {
            const h = this.artHeight(name, 1) || topAbove + 60;
            this.prop(fr, name, px, -this.groundFromBottom + topAbove - h, 1, { tint: FR_TINT, phColor: PH_FR, ph: [90, h] });
        }
        // Tán lá tối che 2 góc trên như ảnh demo (vẽ tạm, kéo ảnh vào ô Frame của LeafCanopy để thay)
        const screenTop = this.H - this.groundFromBottom;
        const canopies: [number, number][] = [
            [x(1, 120), 0], [x(1, 1180), 1], [x(2, 60), 2], [x(2, 1120), 3],
            [x(3, 1000), 4], [x(4, 150), 5], [x(4, 1200), 6], [10300, 7],
        ];
        for (const [cx, seed] of canopies) {
            const n = this.mk('LeafCanopy', frTop);
            n.setPosition(cx, screenTop - 260, 0);
            const leaf = n.addComponent(LeafCanopy);
            leaf.seed = seed + 1;
            leaf.redraw();
        }

        // Băng rôn: ghim mép trên sát mép khung hình, mỗi chỗ treo 2 dây nối nhau
        const flagH = this.artHeight('fr_co', 1) || 120;
        const flagW = (this.frame('fr_co')?.rect.width ?? 500) * ART;
        const flagY = this.H - this.groundFromBottom - 130 - flagH;
        for (const fx of [x(1, 950), x(2, 680), x(3, 600), x(4, 640), 10300]) {
            for (const dx of [-flagW / 2, flagW / 2]) {
                const flag = this.prop(frTop, 'fr_co', fx + dx, flagY, 1, { tint: FLAG_TINT, phColor: PH_FR, ph: [flagW, flagH] });
                if (flag.node.getComponent(Sprite)) flag.node.addComponent(PinToScreenTop).pin();
            }
        }
    }

    // ───────────────────────── Màn chơi ─────────────────────────

    /**
     * Ánh sáng như ảnh demo, vẽ hoàn toàn bằng code (không cần ảnh): sương sáng nền xa,
     * tia nắng xiên kèm bụi sáng, hào quang sau cá vàng.
     * Chỉ thêm node mới; phần nào đã có thì bỏ qua, nên bấm lại cũng không bị trùng.
     */
    private buildLighting(play: Node): string[] {
        const done: string[] = [];
        const groundY = -this.H / 2 + this.groundFromBottom;

        // Sương sáng sau nhà cửa: đứng yên giữa khung hình, làm nền xa nhạt và sáng như có nắng
        if (!this.node.getChildByName('Light_Far')) {
            const far = this.insertLayer('Light_Far', 0, 0, groundY, 'BG');
            const haze = this.mk('SuongSang', far).addComponent(SoftGlow);
            haze.node.setPosition(0, 420, 0);
            haze.size = new Size(2800, 1300);
            haze.color = HAZE_TINT.clone();
            haze.rings = 18;
            haze.redraw();
            done.push('sương sáng ở nền xa (lớp Light_Far)');
        }

        // Tia nắng xiên và bụi sáng: trước nhà cây (MG), sau mèo và đồ vật
        if (!this.node.getChildByName('Light')) {
            const light = this.insertLayer('Light', LIGHT_F, 0.6, groundY, 'MG');
            const top = this.H - this.groundFromBottom + 40; // nhú lên trên mép khung hình một chút
            RAY_SPOTS.forEach(([frame, px], i) => {
                const x = demoX(frame, px, LIGHT_F);
                // Tia nghiêng sang trái khi đi xuống, nên đặt đỉnh lệch phải để thân tia nằm đúng chỗ
                const ray = this.mk('TiaNang', light).addComponent(LightRays);
                ray.node.setPosition(x + 140, top, 0);
                ray.length = top; // chạm tới mặt đường
                ray.color = RAY_TINT.clone();
                ray.seed = i + 1;
                ray.redraw();

                const dust = this.mk('BuiSang', light);
                dust.setPosition(x - 40, 380, 0);
                dust.addComponent(DustMotes).seed = i + 1;
            });
            done.push(`${RAY_SPOTS.length} tia nắng kèm bụi sáng (lớp Light)`);
        }

        // Hào quang ngay sau mỗi con cá vàng
        const has = new Set(play.getComponentsInChildren(CoinGlow).map((g) => g.target));
        let added = 0;
        for (const coin of play.getComponentsInChildren(CoinPickup)) {
            const parent = coin.node.parent;
            if (has.has(coin.node) || !parent) continue;
            const n = this.mk('HaoQuang', parent);
            n.setSiblingIndex(coin.node.getSiblingIndex()); // ngay trước cá, nên vẽ phía sau cá
            const glow = n.addComponent(SoftGlow);
            glow.color = GLOW_TINT.clone();
            glow.redraw();
            const g = n.addComponent(CoinGlow);
            g.target = coin.node;
            g.lateUpdate(0); // đặt đúng chỗ ngay
            added++;
        }
        if (added) done.push(`${added} hào quang sau cá vàng`);
        return done;
    }



    private buildGameplay(play: Node): PlayerController {
        const x = (frame: number, px: number) => demoX(frame, px);
        // Mặt đứng (đo trên ảnh gốc): thùng giấy có que ở 69% chiều cao, thùng xốp có chậu cây ở 74%, ghế đá ở 50%
        const box: PlatformOpts = { topInset: 0.31 };
        const stripedBox: PlatformOpts = { topInset: 0.26 };
        const bench: PlatformOpts = { topInset: 0.5 };
        const lid: PlatformOpts = { topInset: 0.04 };
        const lowFront = -30;   // đồ đứng phía trước, chân thấp hơn mép đá một chút

        // Nền đá: [x bắt đầu, x kết thúc, độ cao mặt, ảnh mép]
        const gap = [x(1, 822), x(1, 865)];         // khung 1: khe hở nhỏ giữa 2 tảng đá
        const raised1 = [x(2, 820), x(3, 485)];     // khung 2 → 3: bậc đá có chim
        const raised2 = [x(4, 820), LEVEL_END];     // khung 4 → đích: bậc đá của boss
        const grounds: [number, number, number, string][] = [
            [LEVEL_START, gap[0], 0, 'mg_tile_2'],
            [gap[1], raised1[0], 0, 'mg_tile_2'],
            [raised1[0], raised1[1], RAISED, 'mg_tile_2'],
            [raised1[1], raised2[0], 0, 'mg_tile_2'],
            [raised2[0], raised2[1], RAISED, 'mg_tile_2'],
        ];
        for (const [x0, x1, top, tile] of grounds) this.ground(play, x0, x1, top, tile);
        this.wall(play, LEVEL_START - 30);
        this.wall(play, LEVEL_END + 30);

        // ── Khung 1: thùng xốp, bàn trà + ấm trà, ghế nhựa, hàng rào, khe hở, cột biển, chậu quất
        this.prop(play, 'mg_hangrao_2', x(1, 750), 0, 1);
        this.platform(play, 'mg_thungxop', x(1, 297), 0, 1, stripedBox);
        const table1 = this.platform(play, 'mg_ban', x(1, 545), 0, 1);
        this.prop(play, 'mg_binhly', x(1, 545), table1.h * 0.9, 1);
        this.prop(play, 'mg_ghe', x(1, 695), 0, 1);
        this.prop(play, 'mg_hangrao_1', x(1, 948), 0, 1);
        this.prop(play, 'mg_cottenduong', x(1, 1005), 0, 1);
        this.prop(play, 'as_cayquat', x(1, 1122), 0, 1, { phColor: PH_TREE });

        // ── Khung 2: ghế, bàn trà, ghế đỏ, chậu cây lá to, thùng giấy, bậc đá có chim
        this.prop(play, 'mg_ghe', x(2, 15), 0, 1);
        const table2 = this.platform(play, 'mg_ban', x(2, 152), 0, 1);
        this.prop(play, 'mg_binhly', x(2, 152), table2.h * 0.9, 0.8);
        this.prop(play, 'mg_ghe', x(2, 310), 0, 1, { tint: RED_STOOL });
        this.prop(play, 'mg_chaucay_2', x(2, 550), 0, 1, { phColor: PH_TREE });
        this.platform(play, 'mg_up', x(2, 710), lowFront, 1, box);
        this.checkpoint(play, x(2, 840), RAISED);
        this.prop(play, 'mg_hangrao_1', x(2, 900), RAISED, 1);
        this.prop(play, 'mg_cottenduong', x(2, 975), RAISED, 1);
        this.pickup(play, 'mg_nuocgiaikhat', x(2, 1050), RAISED);
        this.enemy(play, x(2, 1170), RAISED, { body: [115, 150] });

        // ── Khung 3: hàng rào + chậu cây + thùng xốp trên bậc đá, thùng rác, cột biển, ghế đá, chim, chậu quất
        this.prop(play, 'mg_hangrao_1', x(3, 110), RAISED, 1);
        this.prop(play, 'mg_hangrao_2', x(3, 237), RAISED, 1);
        this.prop(play, 'mg_hangrao_1', x(3, 364), RAISED, 1);
        this.prop(play, 'mg_chaucay_3', x(3, 242), RAISED, 1, { phColor: PH_TREE });
        this.platform(play, 'mg_thungxop', x(3, 365), RAISED, 1, stripedBox);
        this.platform(play, 'mg_thungrac', x(3, 590), lowFront, 1, lid);
        this.prop(play, 'mg_cottenduong', x(3, 765), 0, 1);
        this.platform(play, 'mg_gheda', x(3, 985), 0, 1, bench);
        this.enemy(play, x(3, 1030), 0, { body: [115, 150], range: 160 });
        this.prop(play, 'as_cayquat', x(3, 1185), 0, 1, { phColor: PH_TREE });

        // ── Khung 4: biển quán, cột biển, tủ điện, hàng rào, thùng giấy, boss chó trên bậc đá
        this.checkpoint(play, x(4, 230), 0);
        this.pickup(play, 'mg_nuocgiaikhat', x(4, 280), 0);
        this.prop(play, 'mg_hangrao_1', x(4, 600), 0, 1);
        this.prop(play, 'mg_cottenduong', x(4, 365), 0, 1);
        this.platform(play, 'mg_thungdien', x(4, 485), 0, 1, lid);
        this.platform(play, 'mg_up', x(4, 710), lowFront, 1, box);
        this.hazard(play, 'mg_cone', x(4, 857), RAISED);
        this.boss = this.enemy(play, x(4, 1040), RAISED, {
            // Thân va chạm thấp hơn hình để nhảy từ bậc đá (cao 300) vẫn đạp được lên lưng
            name: 'Boss', frames: ['mg_boss'], hp: BOSS_HP, speed: 150, body: [230, 220],
        });

        // ── Đích ở cuối bậc đá, sau boss
        this.goal(play, LEVEL_END - 150, RAISED);

        // ── Cá vàng: vị trí lấy từ ảnh demo [khung, px ngang, px dọc] (mặt đất ở px dọc 540)
        const fish: [number, number, number][] = [
            [1, 565, 510], [1, 690, 385], [1, 770, 510],
            [2, 725, 385], [2, 875, 255],
            [3, 800, 520], [3, 900, 520],
            [4, 725, 385],
        ];
        for (const [frame, px, py] of fish) this.coin(play, x(frame, px), (540 - py) * PX);
        // Thêm vài con dọc đường giữa các khung
        for (const [frame, px, y] of [[1, 1180, 20], [2, 300, 230], [2, 1050, RAISED + 120], [3, 400, RAISED + 330], [4, 200, 150]]) {
            this.coin(play, x(frame, px), y);
        }

        // Kẻ địch và cá đi qua lại giữa các khung, nên đưa xuống cuối lớp để luôn vẽ đè lên đồ vật.
        // Mèo tạo sau cùng nên nằm trên tất cả.
        const movers = play.children.filter((n) => n.getComponent(EnemyPatrol) || n.getComponent(CoinPickup));
        for (const n of movers) n.setSiblingIndex(play.children.length - 1);

        return this.player(play, x(1, 395), 0);
    }

    private player(parent: Node, x: number, y: number): PlayerController {
        const n = this.mk('Player', parent);
        n.setPosition(x, y, 0);
        const body = n.addComponent(PlatformerBody);
        body.size = new Size(LEO_BODY_WIDTH, 135);
        body.offset = new Vec2(0, 67.5);

        const vis = this.mk('Visual', n);
        const idle = this.frame('mg_char_idle');
        if (idle) vis.addComponent(Sprite);
        else this.placeholder(vis, 115, 160, PH_PLAYER, 'Mèo');
        const pv = vis.addComponent(PlayerVisual);
        // Trong demo mèo nhỏ hơn cỡ gốc một chút (~90%)
        pv.targetHeight = idle ? idle.rect.height * ART * 0.9 : 160;
        pv.idleFrame = idle;
        const run = this.frame('mg_char_run');
        pv.runFrames = run ? [run] : [];
        pv.jumpFrame = this.frame('mg_char_jump');
        pv.refresh();

        const pc = n.addComponent(PlayerController);
        pc.visual = pv;
        return pc;
    }

    private enemy(parent: Node, x: number, y: number, o: EnemyOpts = {}): EnemyPatrol {
        const name = o.name ?? 'Bird';
        const n = this.mk(name, parent);
        n.setPosition(x, y, 0);

        const frames = (o.frames ?? ['mg_enermy_1|mg_enemy_1', 'mg_enermy_2|mg_enemy_2'])
            .map((f) => this.frame(f))
            .filter((f): f is SpriteFrame => !!f);
        const h = frames.length ? frames[0].rect.height * ART * (o.scale ?? 1) : 180;

        const body = n.addComponent(PlatformerBody);
        const [bw, bh] = o.body ?? [h * 0.65, h * 0.8];
        body.size = new Size(bw, bh);
        body.offset = new Vec2(0, bh / 2);

        const vis = this.mk('Visual', n);
        if (frames.length) vis.addComponent(Sprite);
        else this.placeholder(vis, h * 0.8, h, PH_ENEMY, name);

        const e = n.addComponent(EnemyPatrol);
        e.visual = vis;
        e.walkFrames = frames;
        e.targetHeight = h;
        e.patrolRange = o.range ?? 0;
        e.hp = o.hp ?? 12;
        e.speed = o.speed ?? 110;
        e.refresh();
        return e;
    }

    private ground(parent: Node, x0: number, x1: number, top: number, tile: string) {
        const n = this.mk('Ground', parent);
        n.setPosition(x0, top, 0);
        const block = n.addComponent(GroundBlock);
        const sf = this.frame(`${tile}|mg_tile_2|mg_tile_3`);
        block._width = x1 - x0;
        block._depth = top + this.groundFromBottom + 200;
        block._tileFrame = sf;
        block._tileHeight = sf ? sf.rect.height * ART : 240;
        // Mặt đá sáng trên ảnh MG_tile nằm từ px 20 đến 95 (cao 285). Như ảnh demo, chân đồ vật đứng
        // ở khoảng giữa mặt đá (px ~60), nên nâng ảnh lên để mặt va chạm (y = 0) rơi vào đó.
        block._sink = block._tileHeight * TILE_FOOT;
        this.applySunlit(block);
        block.redraw();
    }

    /**
     * Mặt đá: nền thấp dùng MG_tile_1, bậc đá cao (cao hơn nửa RAISED) dùng MG_tile_high_1 rồi thay phiên high_2, high_3.
     * Chưa có ảnh mới thì dùng MG_tile_2. Ô có nắng (SUNLIT_X) dùng MG_tile_3. Cần ảnh đã nạp (this.art).
     * Đổi ảnh thì giữ nguyên tỉ lệ phóng (Tile Height / cao ảnh) của khối. Trả về true nếu có đổi.
     */
    private applySunlit(g: GroundBlock, all: GroundBlock[] = []): boolean {
        // Bản trước bốc ngẫu nhiên tile_3 / tile_4 cho cả hai đầu: tile_3 là góc PHẢI, tile_4 là góc TRÁI (mép trái nét liền).
        // Khối nào còn đúng cách đặt cũ của ⚙ thì sửa lại một lần (đánh dấu 3)
        if (g.autoTiled === 2 && g.endFrames.length === 2 && g.endFrames[0]?.uuid === this.art.get('mg_tile_3')?.uuid && g.endFrames[1]?.uuid === this.art.get('mg_tile_4')?.uuid) {
            g.setCaps([g.endFrames[0]], g.capLeft, g.capRight, g.endFrames[1]);
            g.autoTiled = 3;
            return true;
        }
        // ⚙ đã đặt xong khối này: để yên Tile Frame, Variants, góc... bạn tự chỉnh
        if (g.autoTiled >= 2) return false;
        const high = g.node.position.y > RAISED / 2;
        const has = (n: string) => this.art.get(n) ?? null;
        const main = high ? has('mg_tile_high_1') : has('mg_tile_1');
        const dark = main ?? this.frame('mg_tile_2');
        const sun = this.frame('mg_tile_3');
        if (!dark) return false;
        let changed = false;
        if (g.tileFrame !== dark) {
            const k = g.tileFrame ? g.tileHeight / g.tileFrame.rect.height : 1;
            g.tileFrame = dark;
            g.tileHeight = dark.rect.height * k;
            changed = true;
        }
        // Xếp ngẫu nhiên: bậc cao lấy high_1/2/3, nền thấp lấy tile_1/2 (tile_3, tile_4 là góc ngoài, chỉ đặt ở đầu khối lộ ra)
        const others = !main ? [] : high ? ['mg_tile_high_2', 'mg_tile_high_3'] : ['mg_tile_2'];
        const variants = others.map(has).filter((f): f is SpriteFrame => !!f);
        if (g.setVariants(variants)) {
            changed = true;
            // Nền thấp: kéo dài đáy ô đá 60 để lúc rung màn hình không hở đáy (đã bỏ màu nền bên dưới)
            if (!high && main && g.extend === 0) g.extend = 60;
        }
        if (main) {
            // Có ảnh mới thì bỏ chỗ nắng cố định (SUNLIT_X)
            if (g.setLit(null, 0, 0)) changed = true;
            if (!high) {
                // Đầu khối lộ ra ngoài (không sát khối cao) dùng ảnh góc tile_3 / tile_4
                const ends = [has('mg_tile_3')].filter((f): f is SpriteFrame => !!f);
                const leftEnd = has('mg_tile_4');
                const highs = all.filter((h) => h !== g && h.node.position.y > RAISED / 2);
                const x0 = g.node.position.x, x1 = x0 + g.width;
                const left = !highs.some((h) => Math.abs(h.node.position.x + h.width - x0) < 60);
                const right = !highs.some((h) => Math.abs(h.node.position.x - x1) < 60);
                if (g.setCaps(ends, left && (ends.length > 0 || !!leftEnd), right && ends.length > 0, leftEnd)) changed = true;
            }
            // Đặt xong (đủ ảnh) thì đánh dấu, lần bấm ⚙ sau để yên phần bạn chỉnh. Thiếu tile_4 thì lần sau đặt tiếp
            if (high || has('mg_tile_4')) g.autoTiled = 3;
            return changed;
        }
        // Đoạn có nắng đổi sang toạ độ của khối (tính từ mép trái), chỉ lấy đoạn đầu tiên chạm khối
        const x0 = g.node.position.x;
        const hit = SUNLIT_X.find(([a, b]) => b > x0 && a < x0 + g.width);
        const from = hit ? Math.max(0, hit[0] - x0) : 0;
        const to = hit ? Math.min(g.width, hit[1] - x0) : 0;
        if (g.setLit(hit ? sun : null, from, to)) changed = true;
        return changed;
    }

    /**
     * Ảnh mới, đo trên 4 ảnh demo (06/11/2026), ảnh giữ cỡ gốc (tỉ lệ 1) trừ mây:
     * - đổi ảnh tại chỗ: bàn hồng ở khung 2 → bàn xanh, ghế vàng cạnh đó → ghế đỏ, nhà đầu màn → nhà vẽ lại (MG_nhao_3);
     * - nhà mg_nhao_1 ở khung 3/4 → quán Lợi Ký (MG_nhao_4), dời tới chỗ đo trên ảnh demo 4;
     * - thêm: 2 đám mây + lớp lọc màu + bụi (lớp BG), nhà nền BG_nha (lớp chơi, chỉ hiện ở khung 3), 4 tán lá tối (FR_Top).
     * Chỉ đổi khi node còn đúng ảnh cũ ở đúng chỗ cũ; chỉ thêm khi chưa có node cùng tên. Bạn kéo chỉnh thoải mái.
     */
    private applyNewArt(play: Node): string[] {
        const out: string[] = [];
        const canvas = this.node;
        const has = (n: string) => this.art.get(n) ?? null;
        const swap = (oldName: string, x: number, oldArt: string, newArt: string, newName: string, to?: [number, number]) => {
            const sf = has(newArt);
            const old = has(oldArt);
            const n = play.children.find((c) => c.name === oldName && Math.abs(c.position.x - x) < 1);
            const sp = n?.getComponent(Sprite);
            if (!n || !sp || !old || sp.spriteFrame?.uuid !== old.uuid) return;
            if (!sf) {
                out.push(`chưa đổi ${oldName} → ${newArt}: ảnh ${newArt} chưa phải sprite-frame (chọn ảnh trong Assets, ô Type đổi thành sprite-frame, bấm Apply rồi bấm ⚙ lại)`);
                return;
            }
            sp.spriteFrame = sf;
            sp.sizeMode = Sprite.SizeMode.TRIMMED;
            n.name = newName;
            if (to) n.setPosition(to[0], to[1], n.position.z);
            out.push(`${oldName} (x ${x}) → ${newName}${to ? ` ở (${to[0]}, ${to[1]})` : ''}`);
        };
        swap('mg_ban', 1847, 'mg_ban', 'mg_ban_xanh', 'mg_ban_xanh');
        swap('mg_ghe', 2086, 'mg_ghe', 'mg_ghe_do', 'mg_ghe_do');
        swap('mg_nhao_1', -293.5, 'mg_nhao_1', 'mg_nhao_3', 'mg_nhao_3');
        swap('mg_nhao_1', 5431, 'mg_nhao_1', 'mg_nhao_4', 'mg_nhao_4', [5630, 22]);

        /** Thêm ảnh (gốc đáy-giữa, hoặc giữa nếu ay = 0.5) khi cha chưa có node tên này. index < 0 = cuối danh sách. */
        const named = (name: string) => {
            const found: Node[] = [];
            const walk = (n: Node) => { if (n.name === name) found.push(n); n.children.forEach(walk); };
            walk(canvas);
            return found;
        };
        // Bản trước chỉ tìm trong lớp cũ nên thêm lại bg_filter vào BG (bạn đã chuyển sang MG) và bg_nha vào Gameplay
        // (bạn đã chuyển sang BG): xoá bản trùng đó, giữ bản của bạn
        for (const [name, wrongParent] of [['bg_filter', 'BG'], ['bg_nha', 'Gameplay']]) {
            const all = named(name);
            const dup = all.find((n) => n.parent?.name === wrongParent);
            if (dup && all.length > 1) {
                dup.removeFromParent();
                dup.destroy();
                out.push(`xoá ${name} bị thêm trùng vào ${wrongParent} (giữ bản bạn đã chuyển sang lớp khác)`);
            }
        }
        const add = (parent: Node | null, art: string, name: string, x: number, y: number, sx: number, sy: number, index: number, ay = 0) => {
            const sf = has(art);
            // Tìm theo tên trên cả Canvas: bạn chuyển node sang lớp khác thì vẫn coi là đã có
            if (!parent || !sf || named(name).length) return;
            const n = this.mk(name, parent);
            const sp = n.addComponent(Sprite);
            sp.spriteFrame = sf;
            n.getComponent(UITransform)!.setAnchorPoint(0.5, ay);
            n.setPosition(x, y, 0);
            n.setScale(sx, sy, 1);
            if (index >= 0) n.setSiblingIndex(index);
            out.push(`thêm ${name} vào ${parent.name}`);
        };
        const bg = canvas.getChildByName('BG');
        // Mây nằm sau cùng (sau cây, cổng); lọc màu và bụi đè lên cả lớp BG
        add(bg, 'bg_may_1', 'bg_may_1', 333, 424.3, 0.68, 0.68, 0);
        add(bg, 'bg_may_2', 'bg_may_2', 512.9, 550.3, 0.81, 0.81, 1);
        add(bg, 'bg_filter', 'bg_filter', 342, 272.3, 1.5, 1, -1, 0.5);
        add(bg, 'bg_bui', 'bg_bui', 342, 422.3, 1, 1, -1, 0.5);
        // Nhà nền: để trong lớp chơi (trôi theo đường), nằm sau mọi thứ, nên chỉ hiện ở khung 3 như ảnh demo, không che cổng ở khung khác
        add(play, 'bg_nha', 'bg_nha', 4431.5, 31, 1, 1, 0);
        // Tán lá tối ở mép trên (FR_Top), nằm sau dây cờ
        const frTop = canvas.getChildByName('FR_Top');
        if (frTop && !named('fr_bush_1').length && !named('fr_bush_2').length) {
            const flagAt = frTop.children.findIndex((c) => c.name === 'fr_co');
            const bushes: [string, number, number][] = [
                ['fr_bush_2', 1549.5, 519], ['fr_bush_1', 4293, 600], ['fr_bush_2', 6865, 640], ['fr_bush_1', 7957, 580],
            ];
            let added = 0;
            bushes.forEach(([art, x, y]) => {
                const sf = has(art);
                if (!sf) return;
                const n = this.mk(art, frTop);
                n.addComponent(Sprite).spriteFrame = sf;
                n.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
                n.setPosition(x, y, 0);
                if (flagAt >= 0) n.setSiblingIndex(flagAt + added);
                added++;
            });
            if (added) out.push(`thêm ${added} tán lá tối (fr_bush) vào FR_Top`);
        }
        return out;
    }

    /**
     * Lớp BG trôi chậm theo đường (hệ số 0.3: đường đi 10 thì nền đi 3) thay vì gần như dính theo màn hình (0.0622).
     * Vì trôi nên phải rải đủ một dải dài (camera từ đầu tới cuối màn thấy lớp BG từ x -762 tới 4277): mây, cây, 1 cổng thành
     * ở giữa, nhà. Bố cục chọn sẵn, đã ghép thử với lớp chơi ở 4 khung demo (BG_LAYOUT). Dùng lại node bạn đã đặt làm bản đầu
     * của mỗi loại, thiếu thì nhân bản. Thứ tự vẽ: mây, cây, cổng, nhà (như bạn sắp). Bụi bg_bui sang lớp Light_Far
     * (đứng yên theo màn hình) và gắn DustDrift; tắt bụi sáng BuiSang (trông như đom đóm). Chỉ làm khi hệ số BG còn đúng 0.0622.
     */
    private arrangeBackground(): string[] {
        const bg = this.node.getChildByName('BG');
        const par = bg?.getComponent(ParallaxLayer);
        if (!bg || !par || Math.abs(par.factor.x - 0.0622) > 0.0005) return [];
        const out: string[] = [];
        par.factor = new Vec2(0.3, par.factor.y);
        out.push('lớp BG trôi chậm theo đường: hệ số 0.0622 → 0.3');

        // [loại, x, y, tỉ lệ, lật]
        const BG_LAYOUT: Record<string, [number, number, number, boolean][]> = {
            bg_may_2: [[-560, 560, 0.6, false], [1060, 600, 0.7, true], [1900, 640, 0.5, false], [3560, 580, 0.62, false]],
            bg_may_1: [[420, 500, 0.55, false], [2420, 500, 0.6, true], [4700, 520, 0.55, true]],
            mg_cay: [[-800, -166.2, 0.7, true], [420, -180, 0.66, false], [1000, -185, 0.62, false], [2450, -175, 0.68, true], [3600, -166.2, 0.7, false]],
            bg_thanh: [[1750, -34.7, 1, false]],
            bg_nha: [[-250, 31, 0.9, false], [3000, 31, 0.95, false], [4250, 31, 0.88, true]],
        };
        const ORDER = ['bg_may_2', 'bg_may_1', 'mg_cay', 'bg_thanh', 'bg_nha'];
        // Node đang có của mỗi loại (cây: mg_cay_6, mg_cay_7...)
        const kindOf = (n: Node) => ORDER.find((k) => n.name === k || n.name.startsWith(k + '_') || (k === 'mg_cay' && n.name.startsWith('mg_cay')));
        const pools = new Map<string, Node[]>();
        for (const c of bg.children) {
            const k = kindOf(c);
            if (k) pools.set(k, [...(pools.get(k) ?? []), c]);
        }
        let index = 0;
        for (const k of ORDER) {
            const have = pools.get(k) ?? [];
            if (!have.length) continue;
            const template = have[0];
            BG_LAYOUT[k].forEach(([x, y, s, flip], i) => {
                let n = have[i];
                if (!n) {
                    n = instantiate(template);
                    n.name = k === 'mg_cay' ? `mg_cay_bg_${i + 1}` : `${k}_${i + 1}`;
                    bg.addChild(n);
                }
                n.setPosition(x, y, n.position.z);
                n.setScale(flip ? -s : s, s, 1);
                n.setSiblingIndex(index++);
            });
            out.push(`${k}: ${BG_LAYOUT[k].length} cái`);
        }

        // Bụi: sang lớp đứng yên theo màn hình, giữa trên khung hình, có anim trôi + sáng mờ
        const dust = bg.getChildByName('bg_bui');
        const fixed = this.node.getChildByName('Light_Far');
        if (dust && fixed) {
            dust.removeFromParent();
            fixed.addChild(dust);
            dust.setPosition(0, 420, 0);
            if (!dust.getComponent(DustDrift)) dust.addComponent(DustDrift);
            out.push('bg_bui sang lớp Light_Far (đứng yên theo màn hình), có anim trôi và sáng mờ (DustDrift)');
            let off = 0;
            for (const m of this.node.getComponentsInChildren(DustMotes)) {
                if (m.node.active) {
                    m.node.active = false;
                    off++;
                }
            }
            if (off) out.push(`tắt ${off} node bụi sáng BuiSang (trông như đom đóm); tích lại ô active nếu muốn dùng`);
        }
        return out;
    }

    /**
     * Lớp River (hệ số 0.9, nằm ngay trước lớp Light, tức sau lớp chơi): dải 8 ảnh BG_river nối liền, ảnh chẵn lật ngang
     * để mối nối khớp nhau, phủ từ đầu tới cuối màn (camera thấy lớp này từ x -366 tới 10912). Đáy ảnh sát đáy khung hình.
     * Node RiverStrip có RiverFlow: nước trôi ngang chậm, nhún nhẹ khi chơi. Có lớp River rồi thì để yên.
     */
    private ensureRiver(): string[] {
        const sf = this.art.get('bg_river');
        if (!sf || this.node.getChildByName('River')) return [];
        const after = this.node.getChildByName('Filter') ? 'Filter' : 'MG';
        const layer = this.insertLayer('River', 0.9, 0.6, -270, after);
        const strip = this.mk('RiverStrip', layer);
        // Lớp ở y -270 - 46 × 0.6 = -297.6 lúc chơi: đáy khung hình (-540) ứng với y -242.4 trong lớp; hạ thêm 8 cho khỏi hở khi nhún
        strip.setPosition(0, -250, 0);
        strip.addComponent(RiverFlow);
        const w = sf.rect.width - 2; // chồng 2 cho khỏi lộ khe
        for (let i = 0; i < 8; i++) {
            const n = this.mk(`bg_river_${i + 1}`, strip);
            n.addComponent(Sprite).spriteFrame = sf;
            n.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
            n.setPosition(-500 + w / 2 + i * w, 0, 0);
            n.setScale(i % 2 ? -1 : 1, 1, 1);
        }
        return [`thêm lớp River (trôi 0.9, sau lớp chơi): 8 ảnh BG_river nối liền sát đáy màn hình, nước trôi + nhún nhẹ (RiverFlow trên node RiverStrip)`];
    }

    /**
     * Khu boss vừa một khung hình mà không đụng camera: camera khoá trong khu boss ± 200 (BossArena.lockCamera),
     * khung hình 1920 → khối nền khu boss phải dài 1640. Rút bên trái 782.5:
     * - bậc đá cao trước khu boss (dài 1457.1) dài thêm 782.5, thêm 2 ô đá cao ở cuối (ảnh khác ô kề bên, cùng cỡ ô có sẵn);
     * - khối khu boss (x 8142.7, dài 2422.5) dời phải 782.5, dài còn 1640; các ô đá của bạn giữ đúng chỗ trên màn hình,
     *   ô nào nằm hẳn sau bậc đá (mép phải lùi vào bậc đá quá 40) thì bỏ;
     * - boss về giữa khu mới. Không đụng gì phía sau khu boss.
     */
    /** Bước 32: NPC cửa hàng + 1 cá bự gần checkpoint 1 (thiếu thì tạo, có rồi thì thôi). */
    private ensureShop(play: Node): string[] {
        const out: string[] = [];
        const cps = play.getComponentsInChildren(Checkpoint).map((c) => c.node.position).sort((a, b) => a.x - b.x);
        const leo = play.getComponentsInChildren(PlayerController).find((c) => c.catName !== 'Angelo') ?? null;
        const cx = cps[0]?.x ?? (leo ? leo.node.position.x + 800 : 0);
        const cy = cps[0]?.y ?? (leo ? leo.node.position.y : 0);
        if (this.node.getComponentsInChildren(ShopNPC).length === 0) {
            const n = this.mk('ShopNPC', play);
            n.setPosition(cx + 300, cy, 0);
            // Đứng sau mèo (vẽ trước node mèo)
            if (leo) n.setSiblingIndex(leo.node.getSiblingIndex());
            n.addComponent(UITransform).setContentSize(200, 220);
            n.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
            n.addComponent(ShopNPC);
            // Hình tạm: hình đứng của Leo, nhuộm xám, quay mặt sang trái (sau này thay ảnh trong node Hinh)
            const vis = leo?.getComponentInChildren(PlayerVisual) ?? null;
            const sf = vis?.idleFrame ?? vis?.getComponent(Sprite)?.spriteFrame ?? this.frame('mg_char_idle');
            const img = this.mk('Hinh', n);
            img.addComponent(UITransform).setAnchorPoint(0.5, 0);
            if (sf) {
                const sp = img.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.TRIMMED;
                sp.spriteFrame = sf;
                sp.color = new Color(150, 150, 165, 255);
                const k = (vis?.targetHeight ?? 207) / Math.max(1, sf.rect.height);
                const facesRight = vis?.artFacesRight ?? true;
                img.setScale(facesRight ? -k : k, k, 1);
            } else {
                this.placeholder(img, 200, 207, new Color(150, 150, 165, 255), 'NPC');
            }
            out.push(`thêm NPC cửa hàng (node ShopNPC, mèo xám tạm) ở x ${Math.round(cx + 300)}, sau checkpoint 1: đứng gần bấm Lên để mở cửa hàng`);
        }
        if (this.node.getComponentsInChildren(BigFishPickup).length === 0) {
            // Cá bự (tạm: ảnh cá vàng to gấp ~1.7, nhuộm cam), chân cá cao hơn mặt đất 40
            const s = 1.3 / ART;
            const b = this.prop(play, 'mg_coin', cx + 150, cy + 40, s, { phColor: new Color(255, 160, 80, 255), ph: [140, 140], tint: new Color(255, 160, 80, 255) });
            b.node.name = 'CaBu';
            const f = b.node.addComponent(BigFishPickup);
            f.size = new Size(b.w * 0.8, b.h * 0.8);
            f.offset = new Vec2(0, b.h / 2);
            out.push(`thêm 1 cá bự (node CaBu) ở x ${Math.round(cx + 150)}, cạnh checkpoint 1, để thử mua kỹ năng`);
        }
        return out;
    }

    private fitBossArena(play: Node): string[] {
        const D = 782.5;
        const blocks = play.getComponentsInChildren(GroundBlock);
        const arena = blocks.find((g) => Math.abs(g.node.position.x - 8142.709) < 1 && Math.abs(g.width - 2422.5) < 1 && Math.abs(g.node.position.y) < 1);
        const raised = blocks.find((g) => Math.abs(g.node.position.x - 6690) < 1 && Math.abs(g.width - 1457.1) < 1);
        if (!arena || !raised) return [];
        const out: string[] = [];
        const tiles = (g: GroundBlock) => g.node.children.filter((c) => /^Tile_\d+$/.test(c.name) && c.getComponent(Sprite));
        const edges = (t: Node): [number, number] => {
            const sp = t.getComponent(Sprite)!;
            const w = (sp.spriteFrame?.rect.width ?? 0) * Math.abs(t.scale.x);
            const x = t.position.x;
            return t.scale.x < 0 ? [x - w, x] : [x, x + w];
        };

        // Bậc đá cao: dài thêm D, thêm 2 ô ở cuối
        const oldW = raised.width;
        raised.width = oldW + D;
        const hs = tiles(raised);
        const last = hs.slice().sort((a, b) => edges(b)[1] - edges(a)[1])[0];
        if (last) {
            const sp0 = last.getComponent(Sprite)!;
            const pool = ['mg_tile_high_1', 'mg_tile_high_2', 'mg_tile_high_3'].map((n) => this.art.get(n)).filter((f): f is SpriteFrame => !!f);
            const s = Math.abs(last.scale.y);
            let prev = sp0.spriteFrame;
            let n = hs.reduce((m, t) => Math.max(m, parseInt(t.name.slice(5), 10) || 0), 0);
            const startX = edges(last)[1] - 24 * s;
            const pick = () => pool.find((f) => f !== prev) ?? prev;
            // Ô 1: nối ngay sau ô cuối; ô 2: mép phải khớp mép phải mới của bậc đá
            const f1 = pick();
            const w1 = (f1?.rect.width ?? 490) * s;
            prev = f1;
            const f2 = pick();
            const w2 = (f2?.rect.width ?? 490) * s;
            const xs = [startX, Math.max(startX + w1 * 0.5, raised.width - w2)];
            [f1, f2].forEach((f, i) => {
                if (!f) return;
                n++;
                const t = new Node(`Tile_${n}`);
                t.layer = raised.node.layer;
                raised.node.addChild(t);
                const sp = t.addComponent(Sprite);
                sp.spriteFrame = f;
                sp.sizeMode = Sprite.SizeMode.TRIMMED;
                t.getComponent(UITransform)!.setAnchorPoint(0, 1);
                t.setPosition(xs[i], last.position.y, 0);
                t.setScale(s, s, 1);
            });
        }
        out.push(`bậc đá cao trước khu boss: dài ${oldW} → ${raised.width}, thêm 2 ô đá cao ở cuối`);

        // Khối khu boss: dời phải D, ngắn lại D; ô đá giữ đúng chỗ trên màn hình
        arena.node.setPosition(arena.node.position.x + D, arena.node.position.y, arena.node.position.z);
        arena.width = arena.width - D;
        let removed = 0;
        for (const t of tiles(arena)) {
            t.setPosition(t.position.x - D, t.position.y, t.position.z);
            if (edges(t)[1] <= 40) {
                t.removeFromParent();
                t.destroy();
                removed++;
            }
        }
        out.push(`khu boss (Ground-001): x ${(arena.node.position.x - D).toFixed(1)} → ${arena.node.position.x.toFixed(1)}, dài 2422.5 → ${arena.width}` +
            (removed ? `, bỏ ${removed} ô đá nằm sau bậc đá` : ''));

        // Boss về giữa khu mới
        const boss = play.children.find((c) => c.name === 'Boss');
        if (boss) {
            const mid = arena.node.position.x + arena.width / 2;
            boss.setPosition(mid, boss.position.y, boss.position.z);
            out.push(`Boss về giữa khu mới: x ${mid.toFixed(1)}`);
        }
        return out;
    }

    /** Tìm node theo tên trên cả Canvas (node đầu tiên gặp). */
    private findNamed(name: string): Node | null {
        const walk = (n: Node): Node | null => {
            if (n.name === name) return n;
            for (const c of n.children) {
                const r = walk(c);
                if (r) return r;
            }
            return null;
        };
        return walk(this.node);
    }

    /**
     * Khối đá thấp nằm sát khối cao: hình ô đá lấn 40 sang phía khối cao (Bleed Left / Right) để đè lên mép bo tròn của khối cao,
     * không còn khe hở. Muốn đè được thì khối cao phải vẽ trước: dời các khối cao lên ngay trước khối thấp đầu tiên trong Gameplay
     * (đồ vật vẫn vẽ trên nền). Chỉ đặt độ lấn khi khối thấp còn lấn 0.
     */
    private overlapGrounds(play: Node): string[] {
        const out: string[] = [];
        const gs = play.children.map((n) => n.getComponent(GroundBlock)).filter((g): g is GroundBlock => !!g);
        const high = (g: GroundBlock) => g.node.position.y > RAISED / 2;
        const highs = gs.filter(high), lows = gs.filter((g) => !high(g));
        let bled = 0;
        for (const low of lows) {
            if (low.manual || low.bleedLeft > 0 || low.bleedRight > 0) continue;
            const x0 = low.node.position.x, x1 = x0 + low.width;
            const left = highs.some((h) => Math.abs(h.node.position.x + h.width - x0) < 60);
            const right = highs.some((h) => Math.abs(h.node.position.x - x1) < 60);
            if (left || right) {
                low.setBleed(left ? 40 : 0, right ? 40 : 0);
                bled++;
            }
        }
        if (bled) out.push(`${bled} khối đá thấp: hình lấn 40 đè lên mép khối cao bên cạnh`);
        let moved = 0;
        for (const h of highs.slice().sort((a, b) => a.node.getSiblingIndex() - b.node.getSiblingIndex())) {
            const firstLow = Math.min(...lows.map((g) => g.node.getSiblingIndex()));
            if (h.node.getSiblingIndex() > firstLow) {
                h.node.setSiblingIndex(firstLow);
                moved++;
            }
        }
        if (moved) out.push(`${moved} khối đá cao dời lên vẽ trước các khối thấp (để khối thấp đè lên mép)`);
        return out;
    }

    private wall(parent: Node, x: number) {
        const n = this.mk('Wall', parent);
        n.setPosition(x, 1000, 0);
        n.addComponent(Solid).size = new Size(60, 3000);
    }

    private platform(parent: Node, names: string, x: number, y: number, s = 1, o: PlatformOpts = {}): Built {
        const b = this.prop(parent, names, x, y, s, o);
        const solid = b.node.addComponent(Solid);
        solid.oneWay = o.oneWay ?? true;
        const w = b.w * (o.widthFrac ?? 0.85);
        const top = b.h * (1 - (o.topInset ?? 0.08));
        solid.size = new Size(w, top);
        solid.offset = new Vec2(0, top / 2);
        this.applySolidProp(b.node);
        return b;
    }

    /**
     * Đồ vật có trong SOLID_PROPS: bỏ một chiều (chặn cả hai bên), hộp va chạm ôm đúng thân, giữ độ cao mặt đứng đang có;
     * thêm các khung phụ (viên gạch, cây gỗ) thành Solid thứ 2, 3... trên cùng node. Đã đúng thì để yên. Trả về true nếu có đổi.
     */
    private applySolidProp(node: Node): boolean {
        const spec = SOLID_PROPS[node.name];
        const solids = node.getComponents(Solid);
        if (!spec || !solids.length) return false;
        const sx = node.scale.x, sy = node.scale.y;
        let changed = false;
        const fit = (s: Solid, cx: number, w: number, y: number, h: number) => {
            const same = (a: number, b: number) => Math.abs(a - b) < 0.01;
            const oy = y + h / 2;
            if (!s.oneWay && same(s.size.width, w) && same(s.size.height, h) && same(s.offset.x, cx) && same(s.offset.y, oy)) return;
            s.oneWay = false;
            s.size = new Size(w, h);
            s.offset = new Vec2(cx, oy);
            changed = true;
        };
        fit(solids[0], spec.cx * sx, spec.w * Math.abs(sx), 0, solids[0].size.height);
        (spec.extras ?? []).forEach((e, i) => {
            const s = solids[i + 1] ?? node.addComponent(Solid);
            fit(s, e.cx * sx, e.w * Math.abs(sx), e.y * Math.abs(sy), e.h * Math.abs(sy));
        });
        return changed;
    }

    private hazard(parent: Node, names: string, x: number, y: number) {
        const b = this.prop(parent, names, x, y, 1, { phColor: new Color(240, 120, 70, 255) });
        const hz = b.node.addComponent(Hazard);
        hz.size = new Size(b.w * 0.55, b.h * 0.8);
        hz.offset = new Vec2(0, b.h * 0.4);
    }

    /** Chai lọ hồi máu đặt trên mặt đất: đứng yên (không nhấp nhô như cá), chỉ phập phồng nhẹ. */
    private pickup(parent: Node, names: string, x: number, y: number) {
        const b = this.prop(parent, names, x, y, 1, { phColor: new Color(120, 200, 230, 255) });
        const p = b.node.addComponent(HealPickup);
        p.bob = false;
        p.size = new Size(b.w, b.h);
        p.offset = new Vec2(0, b.h / 2);
    }

    /** Cá vàng, (x, cy) là tâm con cá. Trong demo cá đường kính ~82 = 0.75 cỡ gốc. */
    private coin(parent: Node, x: number, cy: number) {
        const s = 0.75 / ART;
        const h = this.artHeight('mg_coin', s) || 80;
        const b = this.prop(parent, 'mg_coin', x, cy - h / 2, s, { phColor: new Color(250, 200, 70, 255), ph: [80, 80] });
        const c = b.node.addComponent(CoinPickup);
        c.size = new Size(b.w * 0.8, b.h * 0.8);
        c.offset = new Vec2(0, b.h / 2);
    }

    private checkpoint(parent: Node, x: number, y: number) {
        const n = this.mk('Checkpoint', parent);
        n.setPosition(x, y, 0);
        const cp = n.addComponent(Checkpoint);
        cp.onLoad(); // vẽ lá cờ ngay (lúc dựng trong editor onLoad có thể chưa chạy)
        cp.size = new Size(80, 200);
        cp.offset = new Vec2(0, 100);
    }

    private goal(parent: Node, x: number, y: number) {
        const n = this.mk('Goal', parent);
        n.setPosition(x, y, 0);
        const goal = n.addComponent(Goal);
        goal.onLoad(); // vẽ cột cờ đích ngay
        goal.size = new Size(140, 320);
        goal.offset = new Vec2(0, 160);
    }

    // ───────────────────────── Tiện ích ─────────────────────────

    /** Chiều cao hiển thị của ảnh ở tỉ lệ s (0 nếu chưa có ảnh). */
    private artHeight(names: string, s: number): number {
        const sf = this.frame(names);
        return sf ? sf.rect.height * ART * s : 0;
    }

    /**
     * Tạo đồ vật gốc ở đáy-giữa, giữ đúng tỉ lệ ảnh gốc × ART × s.
     * names có thể là "a|b" để thử nhiều tên.
     */
    private prop(parent: Node, names: string, x: number, y: number, s = 1, o: PropOpts = {}): Built {
        const label = names.split('|')[0];
        const n = this.mk(label, parent);
        n.setPosition(x, y, 0);
        const sf = this.frame(names);
        if (sf) {
            const sp = n.addComponent(Sprite);
            sp.spriteFrame = sf;
            if (o.tint) sp.color = o.tint;
            n.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
            const k = ART * s;
            n.setScale(o.flip ? -k : k, k, 1);
            return { node: n, w: sf.rect.width * k, h: sf.rect.height * k };
        }
        const [w, h] = o.ph ?? [150 * s, 150 * s];
        this.placeholder(n, w, h, o.phColor ?? PH_PROP, label);
        return { node: n, w, h };
    }

    private placeholder(n: Node, w: number, h: number, color: Color, text: string) {
        n.addComponent(PlaceholderBox).setup(w, h, color, text, color === PH_FR);
    }

    private frame(names: string): SpriteFrame | null {
        const list = names.split('|');
        for (const name of list) {
            const sf = this.art.get(normalizeName(name));
            if (sf) return sf;
        }
        this.missing.add(list[0]);
        return null;
    }

    private layer(name: string, fx: number, fy: number, y: number): Node {
        const n = this.mk(name, this.node);
        n.setPosition(0, y, 0);
        n.addComponent(ParallaxLayer).factor = new Vec2(fx, fy);
        return n;
    }

    /** Tạo lớp mới nằm ngay trên lớp after (nếu có). */
    private insertLayer(name: string, fx: number, fy: number, y: number, after: string): Node {
        const n = this.layer(name, fx, fy, y);
        const ref = this.node.getChildByName(after);
        if (ref) n.setSiblingIndex(ref.getSiblingIndex() + 1);
        return n;
    }

    /**
     * Màn hướng dẫn: tờ giấy (TutorialRoom) rộng 8400 bên trái đầu màn, sàn y = 0, hai tường; biển chỉ dẫn, thùng, cột,
     * bục một chiều, 2 hình nộm, 3 con cá, cửa EXIT. Mọi thứ có va chạm là con trực tiếp của Gameplay (tên Tut_...).
     */
    private buildTutorial(play: Node) {
        const X0 = -9200, W = 8400;
        const room = this.mk('Tutorial', play);
        room.setPosition(X0, 0, 0);
        room.setSiblingIndex(0); // tờ giấy nằm sau mọi thứ trong Gameplay
        const tr = room.addComponent(TutorialRoom);
        tr.width = W;
        this.mk('Start', room).setPosition(250, 0, 0);

        const solid = (name: string, x: number, y: number, w: number, h: number, ox: number, oy: number) => {
            const n = this.mk(name, play);
            n.setPosition(x, y, 0);
            const s = n.addComponent(Solid);
            s.size = new Size(w, h);
            s.offset = new Vec2(ox, oy);
        };
        solid('Tut_Floor', X0, 0, W, 400, W / 2, -200);
        solid('Tut_Wall', X0 - 30, 1000, 60, 3000, 0, 0);
        solid('Tut_Wall', X0 + W + 30, 1000, 60, 3000, 0, 0);

        const sign = (x: number, y: number, topic: string, arrow = ArrowDir.None, len = 150) => {
            const n = this.mk(`Tut_Sign_${topic}`, play);
            n.setPosition(X0 + x, y, 0);
            const s = n.addComponent(TutorialSign);
            s.topic = topic;
            s.arrowLength = len;
            s.arrow = arrow;
        };
        const block = (x: number, y: number, kind: BlockKind, w: number, h: number, name: string) => {
            const n = this.mk(name, play);
            n.setPosition(X0 + x, y, 0);
            const b = n.addComponent(TutorialBlock);
            b.width = w;
            b.height = h;
            b.kind = kind;
        };
        const dummy = (x: number) => {
            const n = this.mk('Tut_Dummy', play);
            n.setPosition(X0 + x, 0, 0);
            n.addComponent(TrainingDummy);
        };

        sign(600, 470, 'title');
        sign(1100, 380, 'run', ArrowDir.Right, 160);
        sign(1600, 380, 'duck', ArrowDir.Down, 110);
        sign(2100, 440, 'jump', ArrowDir.Down, 130);
        block(2350, 0, BlockKind.Box, 220, 170, 'Tut_Box');
        sign(2850, 560, 'doubleJump', ArrowDir.Down, 120);
        block(3150, 0, BlockKind.Pillar, 240, 430, 'Tut_Pillar');
        sign(3650, 380, 'up', ArrowDir.Down, 110);
        block(4000, 300, BlockKind.Platform, 600, 34, 'Tut_Platform');
        sign(4000, 600, 'descend');
        sign(4650, 400, 'dash', ArrowDir.Right, 220);
        sign(5200, 420, 'attack', ArrowDir.Down, 120);
        dummy(5500);
        sign(5900, 420, 'wave');
        sign(6350, 420, 'sweep', ArrowDir.Down, 120);
        sign(6750, 420, 'launch', ArrowDir.Down, 120);
        dummy(7050);
        sign(7050, 540, 'special', ArrowDir.Down, 170);
        sign(7450, 440, 'fish');
        for (const x of [7350, 7450, 7550]) this.coin(play, X0 + x, 160);
        sign(7900, 520, 'exit', ArrowDir.Right, 100);
        const door = this.mk('Tut_Exit', play);
        door.setPosition(X0 + 8150, 0, 0);
        const ex = door.addComponent(TutorialExit);
        ex.size = new Size(180, 280);
        ex.offset = new Vec2(0, 140);
    }

    private mk(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        parent.addChild(n);
        return n;
    }
}
