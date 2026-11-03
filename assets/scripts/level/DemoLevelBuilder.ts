import { _decorator, assetManager, Color, Component, Node, resources, Size, Sprite, SpriteFrame, sys, UITransform, Vec2, view, Widget } from 'cc';
import { EDITOR } from 'cc/env';
import { CameraRig } from '../camera/CameraRig';
import { ParallaxLayer } from '../camera/ParallaxLayer';
import { ColliderDebug } from '../core/ColliderDebug';
import { PlatformerBody } from '../core/PlatformerBody';
import { Solid } from '../core/Solid';
import { EnemyPatrol } from '../enemy/EnemyPatrol';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerVisual } from '../player/PlayerVisual';
import { BossHealthBar } from '../ui/BossHealthBar';
import { CoinCounter } from '../ui/CoinCounter';
import { EnergyBar } from '../ui/EnergyBar';
import { HeartsHUD } from '../ui/HeartsHUD';
import { Letterbox } from '../ui/Letterbox';
import { TouchControls } from '../ui/TouchControls';
import { Checkpoint } from './Checkpoint';
import { CoinGlow } from './CoinGlow';
import { CoinPickup } from './CoinPickup';
import { DEMO_CAMERA_OFFSET_Y, DEMO_ENEMIES, DEMO_GROUNDS, DEMO_LAYERS, DEMO_NODES, DEMO_PLAYER, DEMO_SPRITES } from './DemoLayout';
import { DemoReference } from './DemoReference';
import { DustMotes } from './DustMotes';
import { Goal } from './Goal';
import { GroundBlock } from './GroundBlock';
import { Hazard } from './Hazard';
import { HealPickup } from './HealPickup';
import { LeafCanopy } from './LeafCanopy';
import { LightRays } from './LightRays';
import { PinToScreenTop } from './PinToScreenTop';
import { PlaceholderBox } from './PlaceholderBox';
import { SkyGradient } from './SkyGradient';
import { SoftGlow } from './SoftGlow';
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
const BUILT_LAYERS = ['Sky', 'BG', 'Light_Far', 'MG', 'Light', 'Gameplay', 'FR', 'FR_Top', 'HUD', 'BossBar', 'TouchControls'];

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
 * Cách dùng trong editor:
 * - "▶ Dựng màn vào scene": tạo các node trong Hierarchy để tự sắp xếp (chỉ khi scene chưa có màn).
 * - "⟳ Xoá màn cũ và dựng lại": xoá các lớp đã dựng rồi dựng lại từ đầu.
 * Nhớ Ctrl+S sau khi dựng. Nếu scene chưa dựng sẵn, bấm Play thì màn được dựng bằng code mỗi lần chạy.
 */
@ccclass('DemoLevelBuilder')
export class DemoLevelBuilder extends Component {
    @property({ displayName: '▶ Dựng màn vào scene', tooltip: 'Tạo toàn bộ màn thành node trong scene để tự sắp xếp' })
    get buildInScene() { return false; }
    set buildInScene(v: boolean) {
        if (v && EDITOR) this.buildInEditor(false);
    }

    @property({ displayName: '⚙ Cập nhật không xoá', tooltip: 'Áp các bản sửa mới nhất lên màn đang có. Giữ nguyên vị trí, kích thước và mọi thứ bạn đã tự sắp xếp' })
    get applyFixes() { return false; }
    set applyFixes(v: boolean) {
        if (v && EDITOR) this.applyFixesInEditor();
    }

    @property({ displayName: '✨ Thêm ánh sáng', tooltip: 'Chỉ thêm tia nắng, sương sáng, bụi sáng và hào quang cá. Không sửa, không xoá gì trong màn đang có' })
    get addLighting() { return false; }
    set addLighting(v: boolean) {
        if (v && EDITOR) this.addLightingInEditor();
    }

    @property({ displayName: '📌 Ghim băng rôn sát mép trên', tooltip: 'Mọi hình trong lớp FR_Top (băng rôn, cờ) được ghim mép trên sát mép khung hình, không còn hở trời. Không đổi vị trí ngang' })
    get pinBanners() { return false; }
    set pinBanners(v: boolean) {
        if (v && EDITOR) this.pinBannersInEditor();
    }

    @property({ displayName: '📐 Xếp theo ảnh demo', tooltip: 'Đặt lại vị trí, kích thước các đồ vật, chim, boss, mèo, nền đá và độ cao camera cho khớp 4 ảnh demo. Không tạo, không xoá node nào' })
    get applyDemoLayout() { return false; }
    set applyDemoLayout(v: boolean) {
        if (v && EDITOR) this.applyDemoLayoutInEditor();
    }

    @property({ displayName: '⟳ Xoá màn cũ và dựng lại', tooltip: 'Xoá Sky, BG, MG, Gameplay, FR, FR_Top, HUD, TouchControls rồi dựng lại. Phần đã tự sắp xếp sẽ mất' })
    get rebuildInScene() { return false; }
    set rebuildInScene(v: boolean) {
        if (v && EDITOR) this.buildInEditor(true);
    }

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

        // Màn đã được dựng sẵn trong scene thì không dựng lại
        const play = this.node.getChildByName('Gameplay');
        if (play) {
            const dbg = play.getComponent(ColliderDebug) ?? (this.debugColliders ? play.addComponent(ColliderDebug) : null);
            if (dbg) dbg.showInGame = this.debugColliders;
            this.ensureTouchControls();
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
        resources.load(`${this.artFolder}/MG_joystick/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!this.isValid) return;
            const n = this.mk('TouchControls', this.node);
            const d = view.getDesignResolutionSize();
            n.addComponent(UITransform).setContentSize(d.width, d.height);
            this.placeTouchNode(n);
            const t = n.addComponent(TouchControls);
            t.showOnDesktop = true;
            if (!err && sf) t.joystickFrame = sf;
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
    }

    /**
     * Sửa trên các node đang có, không xoá hay tạo lại gì, để giữ phần người dùng đã tự sắp xếp.
     * Mỗi khi sửa lỗi cách dựng màn, thêm một bước tương ứng vào đây.
     */
    private applyFixesInEditor() {
        const play = this.node.getChildByName('Gameplay');
        if (!play) {
            console.warn('[DemoLevelBuilder] Scene chưa có màn (node Gameplay). Hãy dùng "▶ Dựng màn vào scene" trước.');
            return;
        }
        const done: string[] = [];

        // 1. Nền đá: nâng ảnh mép đá để chân đồ vật nằm giữa mặt đá như ảnh demo
        let grounds = 0;
        for (const g of play.getComponentsInChildren(GroundBlock)) {
            const want = g.tileHeight * TILE_FOOT;
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
        const movers = play.children.filter((n) => n.getComponent(EnemyPatrol) || n.getComponent(CoinPickup));
        for (const n of movers) n.setSiblingIndex(play.children.length - 1);
        const player = play.children.find((n) => n.getComponent(PlayerController));
        if (player) player.setSiblingIndex(play.children.length - 1);
        done.push(`${movers.length} chim/boss/cá đưa lên trên đồ vật, mèo trên cùng`);

        // 4. Khung va chạm hiện trong editor để canh chỉnh
        if (!play.getComponent(ColliderDebug)) {
            play.addComponent(ColliderDebug).showInGame = this.debugColliders;
            done.push('bật hiển thị khung va chạm trong editor');
        }

        // 5. Tia nắng nhú khỏi mép trên dù camera đang dời lên bao nhiêu (độ cao camera do "📐 Xếp theo ảnh demo" đặt)
        const rays = this.raiseRaysForCamera();
        if (rays) done.push(`${rays} tia nắng: nâng đỉnh cho khớp camera`);

        try { Editor.Message.send('scene', 'snapshot'); } catch (e) { /* bản editor không hỗ trợ cũng không sao */ }
        console.log(`[DemoLevelBuilder] Đã cập nhật, giữ nguyên phần bạn sắp xếp:\n - ${done.join('\n - ')}\nNhấn Ctrl+S để lưu.`);
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
                n.setPosition(e.x ?? p.x, e.y ?? p.y, p.z);
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
                g.tileHeight = e.tileHeight;
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

    /** Thêm ánh sáng vào màn đang có, không động vào node nào khác. */
    private addLightingInEditor() {
        const play = this.node.getChildByName('Gameplay');
        if (!play) {
            console.warn('[DemoLevelBuilder] Scene chưa có màn (node Gameplay). Hãy dùng "▶ Dựng màn vào scene" trước.');
            return;
        }
        try {
            const d = view.getDesignResolutionSize();
            this.W = d.width;
            this.H = d.height;
            const done = this.removeImageLighting(play);
            done.push(...this.buildLighting(play));
            try { Editor.Message.send('scene', 'snapshot'); } catch (e) { /* bản editor không hỗ trợ cũng không sao */ }
            console.log(done.length
                ? `[DemoLevelBuilder] Đã thêm ánh sáng, không đổi gì khác:\n - ${done.join('\n - ')}\nNhấn Ctrl+S để lưu.`
                : '[DemoLevelBuilder] Ánh sáng đã có sẵn, không thêm gì. Muốn làm lại thì xoá Light, Light_Far và các node HaoQuang rồi bấm lại.');
        } catch (e) {
            console.error('[DemoLevelBuilder] Không thêm được ánh sáng:', e);
        }
    }

    /** Gắn PinToScreenTop cho các hình trong FR_Top, chỉ đổi độ cao của chúng. */
    private pinBannersInEditor() {
        const frTop = this.node.getChildByName('FR_Top');
        if (!frTop) {
            console.warn('[DemoLevelBuilder] Scene chưa có lớp FR_Top.');
            return;
        }
        let added = 0;
        for (const n of frTop.children) {
            if (!n.getComponent(Sprite) || n.getComponent(PinToScreenTop)) continue;
            n.addComponent(PinToScreenTop).pin();
            added++;
        }
        try { Editor.Message.send('scene', 'snapshot'); } catch (e) { /* bản editor không hỗ trợ cũng không sao */ }
        console.log(added
            ? `[DemoLevelBuilder] Đã ghim ${added} băng rôn/cờ sát mép trên khung hình. Nhấn Ctrl+S để lưu.`
            : '[DemoLevelBuilder] Băng rôn trong FR_Top đã được ghim sẵn.');
    }

    private async buildInEditor(clearOld: boolean) {
        const existing = BUILT_LAYERS
            .map((name) => this.node.getChildByName(name))
            .filter((n): n is Node => !!n);
        if (existing.length > 0 && !clearOld) {
            console.warn(`[DemoLevelBuilder] Scene đã có màn (${existing.map((n) => n.name).join(', ')}). `
                + 'Muốn dựng lại từ đầu thì tích "⟳ Xoá màn cũ và dựng lại".');
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

        // Thanh năng lượng dưới hàng tim (vẽ tạm, kéo ảnh vào ô Frame của EnergyBar để thay)
        const energyNode = this.mk('Energy', hudNode);
        energyNode.setPosition(394, -111, 0);
        energyNode.addComponent(EnergyBar);

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
        cam.zoom = 1;
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
            ['mg_nhao_1', x(1, 85), -10, 1], ['mg_cafe', x(1, 1210), -10, 1],
            // Khung 2: tiệm Thạch Trung
            ['mg_nhao_2', x(2, 450), -10, 1],
            // Khung 3: nhà bên phải
            ['mg_nhao_1', x(3, 1180), -10, 1, true],
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

    /** Bản ánh sáng trước dùng ảnh FX_*: gỡ đi để thay bằng bản vẽ code. */
    private removeImageLighting(play: Node): string[] {
        const old: Node[] = [];
        for (const name of ['Light', 'Light_Far']) {
            const layer = this.node.getChildByName(name);
            if (layer && layer.getComponentsInChildren(Sprite).length > 0) old.push(layer);
        }
        for (const g of play.getComponentsInChildren(CoinGlow)) {
            if (g.getComponent(Sprite)) old.push(g.node);
        }
        for (const n of old) {
            n.removeFromParent();
            n.destroy();
        }
        return old.length ? ['gỡ bản ánh sáng dùng ảnh trước đó'] : [];
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
            [raised1[0], raised1[1], RAISED, 'mg_tile_3'],
            [raised1[1], raised2[0], 0, 'mg_tile_2'],
            [raised2[0], raised2[1], RAISED, 'mg_tile_3'],
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
        this.prop(play, 'mg_banghieu', x(4, 105), 0, 1);
        this.checkpoint(play, x(4, 230), 0);
        this.pickup(play, 'mg_nuocgiaikhat', x(4, 280), 0);
        this.prop(play, 'mg_hangrao_1', x(4, 600), 0, 1);
        this.prop(play, 'mg_cottenduong', x(4, 365), 0, 1);
        this.platform(play, 'mg_thungdien', x(4, 485), 0, 1, lid);
        this.platform(play, 'mg_up', x(4, 710), lowFront, 1, box);
        this.hazard(play, 'mg_cone', x(4, 857), RAISED);
        this.boss = this.enemy(play, x(4, 1040), RAISED, {
            // Thân va chạm thấp hơn hình để nhảy từ bậc đá (cao 300) vẫn đạp được lên lưng
            name: 'Boss', frames: ['mg_boss'], hp: 10, speed: 150, body: [230, 220],
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
        body.size = new Size(85, 135);
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
        e.hp = o.hp ?? 3; // gà cần chém 3 nhát
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
        block.redraw();
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
        return b;
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

    private mk(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        parent.addChild(n);
        return n;
    }
}
