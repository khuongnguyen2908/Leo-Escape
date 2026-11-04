import { _decorator, Color, Component, Node, Rect, Size, Vec2, Vec3 } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { computeBox, overlaps } from '../core/Box';
import { keyName, Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { AngeloSkills } from '../player/AngeloSkills';
import { FollowerAI } from '../player/FollowerAI';
import { LeoSkills } from '../player/LeoSkills';
import { PlayerController } from '../player/PlayerController';
import { SoulWisp } from '../player/SoulWisp';
import { PlayerInput } from '../player/PlayerInput';
import { ReviveRing } from '../player/ReviveRing';
import { CoinCounter } from '../ui/CoinCounter';
import { HeartsHUD } from '../ui/HeartsHUD';
import { GameSession, reloadScene } from './GameSession';
const { ccclass, property } = _decorator;

const _player = new Rect();
const _other = new Rect();
const _pos = new Vec3();
// Màu linh hồn khi đổi mèo: theo con mèo được nhập vào
const LEO_SOUL = new Color(255, 178, 84, 255);
const ANGELO_SOUL = new Color(150, 196, 240, 255);

/**
 * Quản lý hai con mèo (Leo và Angelo): ai điều khiển con nào, máu từng con, gục và kéo dậy, hồi sinh, thắng/thua.
 * Chơi 1 người: điều khiển một con, phím Đổi mèo (Tab) để đổi (linh hồn bay qua). Con kia tự đi theo, tự chém địch
 * (FollowerAI); nó bị đánh nhưng không gục, kẹt hoặc tụt lại xa thì hoá linh hồn bay tới.
 * Chơi 2 người: mỗi người một con, hai con không được đi xa nhau quá Max Gap.
 * Một con hết tim thì gục; con kia tới gần giữ phím Tương tác để kéo dậy. Cả hai cùng gục thì thua.
 * Gắn lên Canvas, chỉ có một trong scene.
 */
@ccclass('GameManager')
export class GameManager extends Component {
    static instance: GameManager | null = null;

    @property({ type: PlayerController, tooltip: 'Leo' })
    player: PlayerController | null = null;

    @property({ type: PlayerController, tooltip: 'Angelo (nút ⚙ Cập nhật tự thêm)' })
    partner: PlayerController | null = null;

    @property({ displayName: 'Bật Angelo', tooltip: 'Tắt: khi chơi ẩn Angelo và tim của Angelo, chỉ chơi 1 người với Leo. Angelo vẫn nằm trong scene, tick lại là có lại' })
    angeloEnabled = false;

    @property({ type: HeartsHUD, tooltip: 'Tim của Leo' })
    hud: HeartsHUD | null = null;

    @property({ type: HeartsHUD, tooltip: 'Tim của Angelo' })
    partnerHud: HeartsHUD | null = null;

    @property({ type: CoinCounter })
    coinCounter: CoinCounter | null = null;

    @property({ tooltip: 'Số tim của mỗi con mèo' })
    maxHp = 3;

    @property({ tooltip: 'Được kéo dậy thì còn bao nhiêu tim' })
    reviveHp = 2;

    @property({ tooltip: 'Giữ phím Tương tác bao lâu (giây) để kéo đồng đội dậy' })
    reviveTime = 1;

    @property({ tooltip: 'Đứng cách con đang gục bao xa thì kéo dậy được' })
    reviveRange = 180;

    @property({ tooltip: 'Chơi 2 người: hai con mèo cách nhau tối đa bao xa (khung hình rộng 1920)' })
    maxGap = 1500;

    @property({ tooltip: 'Rơi thấp hơn độ cao này (toạ độ lớp Gameplay) là rơi xuống vực' })
    killY = -600;

    @property({ group: 'Âm thanh', tooltip: 'Tên file nhạc nền trong assets/resources/sounds (để trống = không có nhạc). Âm lượng chỉnh trong menu Cài đặt' })
    music = 'bgm';

    coins = 0;
    readonly respawnPoint = new Vec3();
    private finished = false;
    private playing = false;
    private active: PlayerController | null = null;
    private readonly revive = new Map<PlayerController, number>();
    private readonly ai = new Map<PlayerController, FollowerAI>();
    private readonly teleporting = new Set<PlayerController>();
    private readonly lastX = new Map<PlayerController, number>();

    /** Các con mèo đang có trong màn (Leo trước, Angelo sau). */
    get cats(): PlayerController[] {
        return [this.player, this.partner].filter((c): c is PlayerController => !!c && c.isValid);
    }

    /** Chơi 1 người: con đang điều khiển. Chơi 2 người: null. */
    get activeCat(): PlayerController | null {
        return this.active;
    }

    onLoad() {
        GameManager.instance = this;
        PlayerInput.reset();
        if (!this.angeloEnabled) this.removeAngelo();
        GameSession.angelo = !!this.partner;
        if (!GameSession.angelo) GameSession.mode = 1;
    }

    /** Tạm bỏ Angelo khi chơi: ẩn Angelo và HUD của Angelo, coi như màn chỉ có Leo. Scene không đổi. */
    private removeAngelo() {
        if (this.partner) this.partner.node.active = false;
        if (this.partnerHud) this.partnerHud.node.active = false;
        const hud = this.node.getChildByName('HUD_Angelo');
        if (hud) hud.active = false;
        this.partner = null;
        this.partnerHud = null;
    }

    start() {
        Sound.sfxVolume = Settings.sfx;
        Sound.musicVolume = Settings.music;
        Sound.preload();
        if (this.music) Sound.music(this.music);
        for (const c of this.cats) {
            c.hp = this.maxHp;
            c.controls = PlayerInput.none;
            c.idle = true; // chưa vào chơi thì chưa bị đánh
            this.attachSkills(c);
            if (!c.getComponent(ReviveRing)) c.addComponent(ReviveRing);
            this.hudFor(c)?.setHp(c.hp, this.maxHp);
        }
        if (this.player) this.respawnPoint.set(this.player.node.position);
        this.updateCamera();
        // Màn mở đầu đang hiện thì chờ bấm START (LandingScreen gọi beginPlay)
        if (!GameSession.waitingForStart) this.beginPlay();
    }

    onDestroy() {
        if (GameManager.instance === this) GameManager.instance = null;
    }

    /** Bắt đầu chơi: gán phím cho từng con mèo theo lựa chọn 1 người / 2 người. */
    beginPlay() {
        if (this.playing) return;
        this.playing = true;
        PlayerInput.clearQueues();
        const leo = this.player, angelo = this.partner;
        if (GameSession.mode === 2 && leo && angelo) {
            this.active = null;
            leo.controls = PlayerInput.player(GameSession.leoPlayer);
            angelo.controls = PlayerInput.player(GameSession.angeloPlayer);
            leo.idle = angelo.idle = false;
            this.updateCamera();
        } else if (leo) {
            this.setActive(leo);
        }
    }

    /** Chơi 1 người: chuyển sang điều khiển con mèo cat, con kia tự đi theo (FollowerAI). fx: cho linh hồn bay qua. */
    private setActive(cat: PlayerController, fx = false) {
        const prev = this.active;
        this.active = cat;
        for (const c of this.cats) {
            c.idle = false;
            if (c === cat) {
                c.controls = PlayerInput.merged;
            } else {
                const ai = this.aiFor(c);
                ai.leader = cat;
                ai.reset();
                c.controls = ai;
            }
        }
        PlayerInput.clearQueues();
        this.updateCamera();
        if (fx && prev && prev !== cat) this.spawnSoul(prev, cat);
    }

    /** Gắn bộ kỹ năng riêng theo tên con mèo (Leo / Angelo). Không cần đặt trong scene. */
    private attachSkills(cat: PlayerController) {
        const other = () => this.cats.find((o) => o !== cat) ?? null;
        if (cat.catName === 'Angelo') {
            const s = cat.getComponent(AngeloSkills) ?? cat.addComponent(AngeloSkills);
            s.setup(cat, other);
            cat.skills = s;
        } else {
            const s = cat.getComponent(LeoSkills) ?? cat.addComponent(LeoSkills);
            s.setup(cat, other);
            cat.skills = s;
        }
    }

    private aiFor(cat: PlayerController): FollowerAI {
        let ai = this.ai.get(cat);
        if (!ai) {
            ai = new FollowerAI(cat);
            ai.onTeleport = () => this.teleportFollower(cat);
            this.ai.set(cat, ai);
        }
        return ai;
    }

    /** Linh hồn bay từ ngực con from sang ngực con to (màu theo con to). */
    private spawnSoul(from: PlayerController, to: PlayerController) {
        const parent = to.node.parent;
        if (!parent) return;
        const p = from.node.position;
        SoulWisp.fly(parent, p.x, p.y + this.chest(from), to.node, this.chest(to), this.soulColor(to), () => to.visual?.playLand(0.8));
        Sound.play('checkpoint', 0.5);
    }

    /** Con đi theo bị kẹt / tụt lại / rơi vực: hoá linh hồn bay tới đứng sau lưng con đang điều khiển. */
    private teleportFollower(cat: PlayerController) {
        const leader = this.active;
        const parent = cat.node.parent;
        if (!leader || leader === cat || cat.downed || this.teleporting.has(cat) || !parent) return;
        if (cat.skills?.staying || cat.skills?.busy) return;
        const from = cat.node.position;
        const fromX = from.x, fromY = from.y + this.chest(cat);
        _pos.set(leader.node.position.x - leader.facing * 120, leader.node.position.y + 20, 0);
        cat.respawn(_pos);
        cat.visual?.setHidden(true);
        this.teleporting.add(cat);
        SoulWisp.fly(parent, fromX, fromY, cat.node, this.chest(cat), this.soulColor(cat), () => {
            cat.visual?.setHidden(false);
            cat.visual?.playLand(0.8);
            this.teleporting.delete(cat);
        });
    }

    private chest(cat: PlayerController): number {
        return cat.body.size.height * 0.6;
    }

    private soulColor(cat: PlayerController): Color {
        return cat === this.partner ? ANGELO_SOUL : LEO_SOUL;
    }

    private updateCamera() {
        const rig = this.getComponent(CameraRig);
        if (!rig) return;
        const nodes: Node[] = this.active ? [this.active.node] : this.cats.map((c) => c.node);
        rig.setTargets(nodes);
    }

    update(dt: number) {
        if (this.finished) return;

        // Chơi 1 người: con không được điều khiển tự đi theo; phím Đổi mèo để đổi
        if (this.playing && this.active) {
            for (const c of this.cats) if (c !== this.active) this.ai.get(c)?.think(dt);
            if (PlayerInput.merged.consumeSwap()) {
                const other = this.cats.find((c) => c !== this.active && !c.downed);
                if (other) this.setActive(other, true);
            }
        }

        for (const c of this.cats) {
            if (c.node.position.y < this.killY) this.fall(c);
        }
        this.updateRevive(dt);
    }

    lateUpdate() {
        // Chơi 2 người: con nào chạy xa quá thì bị giữ lại như có tường vô hình
        const cats = this.cats;
        if (!this.active && cats.length === 2 && !this.finished) {
            const [a, b] = cats;
            const ax = a.node.position.x, bx = b.node.position.x;
            if (Math.abs(ax - bx) > this.maxGap) {
                const movedA = Math.abs(ax - (this.lastX.get(a) ?? ax));
                const movedB = Math.abs(bx - (this.lastX.get(b) ?? bx));
                const mover = movedA >= movedB ? a : b;
                const anchor = mover === a ? b : a;
                const side = mover.node.position.x > anchor.node.position.x ? 1 : -1;
                const p = mover.node.position;
                mover.node.setPosition(anchor.node.position.x + side * this.maxGap, p.y, p.z);
                if (Math.sign(mover.body.velocity.x) === side) mover.body.velocity.x = 0;
            }
        }
        for (const c of cats) this.lastX.set(c, c.node.position.x);
    }

    /** Kẻ địch, vật nguy hiểm đánh trúng mèo cat từ vị trí fromX. */
    hurtCat(cat: PlayerController, fromX: number) {
        if (!this.finished && cat.hurt(fromX)) this.damage(cat, 1);
    }

    damage(cat: PlayerController, amount: number) {
        if (cat.downed) return;
        // Chơi 1 người: con đi theo (máy điều khiển) mất tim nhưng không bao giờ gục
        const follower = !!this.active && cat !== this.active;
        cat.hp = Math.max(follower ? 1 : 0, cat.hp - amount);
        this.hudFor(cat)?.setHp(cat.hp, this.maxHp);
        if (cat.hp <= 0) this.knockDown(cat);
    }

    heal(cat: PlayerController, amount: number) {
        Sound.play('heal');
        cat.hp = Math.min(this.maxHp, cat.hp + amount);
        this.hudFor(cat)?.setHp(cat.hp, this.maxHp);
    }

    addCoins(amount: number) {
        Sound.play('coin', 0.7);
        this.coins += amount;
        this.coinCounter?.setValue(this.coins);
    }

    setRespawn(pos: Readonly<Vec3>) {
        this.respawnPoint.set(pos);
    }

    win() {
        Sound.play('win');
        this.end('You made it!', 3);
    }

    /** Các con mèo (còn đứng) đang chạm hộp (size, offset) của node. Node phải nằm trong lớp Gameplay. */
    catsOverlapping(node: Node, size: Size, offset: Vec2): PlayerController[] {
        if (this.finished) return [];
        const box = computeBox(node, size, offset, _other);
        return this.cats.filter((c) => !c.downed && overlaps(c.body.getRect(_player), box));
    }

    private hudFor(cat: PlayerController): HeartsHUD | null {
        return cat === this.partner ? this.partnerHud : this.hud;
    }

    private knockDown(cat: PlayerController) {
        cat.setDowned(true);
        this.revive.set(cat, 0);
        Sound.play('hurt');
        const standing = this.cats.filter((c) => !c.downed);
        if (standing.length === 0) {
            Sound.play('lose');
            this.end('Try again!', 2);
            return;
        }
        // Chơi 1 người: con đang điều khiển gục thì chuyển sang con kia để đi kéo dậy
        if (this.active === cat) this.setActive(standing[0], true);
    }

    private updateRevive(dt: number) {
        for (const c of this.cats) {
            const ring = c.getComponent(ReviveRing);
            if (!c.downed) {
                ring?.hide();
                continue;
            }
            const helper = this.cats.find((o) => o !== c && !o.downed);
            let progress = this.revive.get(c) ?? 0;
            const near = !!helper && Math.abs(helper.node.position.x - c.node.position.x) < this.reviveRange
                && Math.abs(helper.node.position.y - c.node.position.y) < this.reviveRange;
            if (helper && near && helper.controls.interactHeld) progress += dt / this.reviveTime;
            else progress = Math.max(0, progress - dt);
            this.revive.set(c, progress);
            if (progress >= 1) {
                this.standUp(c);
                continue;
            }
            ring?.show(progress, helper ? `Giữ ${this.interactKeyName(helper)}` : '');
        }
    }

    private standUp(cat: PlayerController) {
        this.revive.delete(cat);
        cat.hp = Math.min(this.maxHp, this.reviveHp);
        cat.setDowned(false);
        this.hudFor(cat)?.setHp(cat.hp, this.maxHp);
        cat.getComponent(ReviveRing)?.hide();
        Sound.play('heal');
    }

    /** Tên phím Tương tác của người đang điều khiển con mèo helper (để hiện trên vòng kéo dậy). */
    private interactKeyName(helper: PlayerController): string {
        if (GameSession.mode === 2) {
            const p = helper === this.player ? GameSession.leoPlayer : GameSession.angeloPlayer;
            return keyName(Settings.key(p, 'interact'));
        }
        return keyName(Settings.key(0, 'interact'));
    }

    /** Rơi xuống vực: mất 1 tim, đứng lại cạnh đồng đội (hoặc điểm lưu nếu đồng đội cũng đang gục). */
    private fall(cat: PlayerController) {
        this.damage(cat, 1);
        if (this.active && cat !== this.active) {
            this.teleportFollower(cat); // con đi theo rơi vực: hoá linh hồn bay về cạnh người chơi
            return;
        }
        const buddy = this.cats.find((c) => c !== cat && !c.downed && c.body.grounded);
        if (buddy) _pos.set(buddy.node.position.x - buddy.facing * 120, buddy.node.position.y + 40, 0);
        else _pos.set(this.respawnPoint);
        cat.respawn(_pos);
    }

    private end(message: string, restartDelay: number) {
        if (this.finished) return;
        this.finished = true;
        for (const c of this.cats) c.controlEnabled = false;
        this.hud?.showMessage(message);
        this.scheduleOnce(() => reloadScene(), restartDelay);
    }
}
