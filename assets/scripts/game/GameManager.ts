import { _decorator, Color, Component, Node, Rect, Size, Vec2, Vec3 } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { computeBox, overlaps } from '../core/Box';
import { difficultyStats, DifficultyStats } from '../core/Difficulty';
import { Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { TimeScale } from '../core/TimeScale';
import { AngeloSkills } from '../player/AngeloSkills';
import { FollowerAI } from '../player/FollowerAI';
import { LeoSkills } from '../player/LeoSkills';
import { PlayerController } from '../player/PlayerController';
import { SoulWisp } from '../player/SoulWisp';
import { PlayerInput } from '../player/PlayerInput';
import { PoisonStatus } from '../player/PoisonStatus';
import { RunDust } from '../player/RunDust';
import { CoinCounter } from '../ui/CoinCounter';
import { GameOverScreen } from '../ui/GameOverScreen';
import { HeartsHUD } from '../ui/HeartsHUD';
import { LandingScreen } from '../ui/LandingScreen';
import { PauseMenu } from '../ui/PauseMenu';
import { ResultsScreen } from '../ui/ResultsScreen';
import { ScreenFade } from '../ui/ScreenFade';
import { GameSession, reloadScene } from './GameSession';
import { SaveSlots, SlotData } from './SaveSlots';
import { Unlocks, UpgradeId, upgradeById, upgradeState } from './Upgrades';
import { Achievements, FAST_TIME } from './Achievements';
// Nạp để đăng ký thông báo nhỏ khi đạt thành tích
import '../ui/AchievementToast';
import { SaveIcon } from '../ui/SaveIcon';
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
 * Một con hết tim thì gục; con kia tới gần giữ phím Tương tác để kéo dậy. Cả hai cùng gục thì màn tối lại, sống lại ở checkpoint (đếm số lần gục).
 * Về đích: bảng kết quả (thời gian, số cá, số lần gục, sao, kỷ lục) với Chơi lại / Về menu.
 * Gắn lên Canvas, chỉ có một trong scene.
 */
@ccclass('GameManager')
export class GameManager extends Component {
    static instance: GameManager | null = null;
    /** Gọi khi mèo gục hết rồi hồi sinh ở checkpoint (BossBrain đăng ký để đánh lại trận boss từ đầu). */
    static respawnListeners: (() => void)[] = [];

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

    @property({ group: 'Về đích', tooltip: 'Chạm cờ: mèo nảy mừng lên với vận tốc này rồi mới tự chạy ra khỏi màn (0 = không nảy)' })
    winHop = 650;

    @property({ group: 'Về đích', tooltip: 'Mèo tự chạy quá chừng này giây mà chưa khuất khỏi khung hình (bị kẹt) thì vẫn hiện bảng kết quả' })
    winWalkMax = 4;

    @property({ group: 'Âm thanh', tooltip: 'Tên file nhạc nền trong assets/resources/sounds (để trống = không có nhạc). Nhạc trận boss: ô Boss Music của BossArena. Âm lượng chỉnh trong menu Cài đặt' })
    music = 'bgm_forest';

    coins = 0;
    /** Thời gian chơi màn này (giây, không tính lúc tạm dừng), số cá đã nhặt / có trong màn, số lần gục hết tim. */
    playTime = 0;
    fish = 0;
    fishTotal = 0;
    downs = 0;
    /** Tên màn để lưu kỷ lục. */
    levelId = 'chapter1-1';
    /** Đang cảnh diễn (mèo bị khoá: hội thoại, mở màn boss): đồng hồ đứng, bảng hướng dẫn không hiện */
    cutscene = false;
    /** Chỗ đứng đầu màn của Leo (sau màn hướng dẫn thì về đây) */
    readonly startPoint = new Vec3();
    /** uuid các con cá đã ăn (ghi vào ô lưu, vào lại thì bỏ những con này) */
    readonly collected: string[] = [];
    /** Cá bự đang có: nguyên liệu mở kỹ năng, không hiện trên HUD, chỉ thấy trong cửa hàng */
    bigFish = 0;
    /** Các ô cây kỹ năng đã mua ở cửa hàng (id trong game/Upgrades.ts) */
    readonly unlocks: string[] = [];
    /** Số tim gốc (ô Max Hp lúc vào màn); mua "Thêm 1 tim" thì Max Hp = gốc + số tim đã mua */
    private baseHp = -1;
    /** Checkpoint xa nhất đã lưu vào ô (đếm từ 1) */
    private savedCheckpoint = 0;
    readonly respawnPoint = new Vec3();
    private finished = false;
    /** Về đích: thời gian (giây) từ lúc chạm cờ; âm là chưa về đích */
    private outroTime = -1;
    private respawning = false;
    /** Đang hiện màn GAME OVER */
    private gameOver = false;
    /** Gục hết thì chờ chừng này giây (hiện "Try again!") rồi hồi sinh ở checkpoint */
    private respawnDelay = 1.2;
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
        TimeScale.reset(); // vào màn (chơi lại giữa lúc slow motion) thì về tốc độ bình thường
        PauseMenu.blockOpen = () => this.finished || this.gameOver;
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
        if (this.baseHp < 0) this.baseHp = this.maxHp;
        Unlocks.set(this.unlocks);
        Sound.sfxVolume = Settings.master * Settings.sfx;
        Sound.musicVolume = Settings.master * Settings.music;
        Sound.preload();
        for (const c of this.cats) {
            c.hp = this.maxHp;
            c.controls = PlayerInput.none;
            c.idle = true; // chưa vào chơi thì chưa bị đánh
            this.attachSkills(c);
            // Trúng độc (axit của boss): cứ 1 giây rút nửa tim
            const poison = c.getComponent(PoisonStatus) ?? c.addComponent(PoisonStatus);
            poison.onTick = (amount) => this.damage(c, amount);
            // Khói chạy, bụi nhảy / đáp đất; Angelo nhỏ nên khói bằng 70% của Leo
            if (!c.getComponent(RunDust)) {
                const dust = c.addComponent(RunDust);
                if (c.catName === 'Angelo') {
                    dust.scale *= 0.7;
                    dust.jumpScale *= 0.7;
                }
            }
            this.hudFor(c)?.setHp(c.hp, this.maxHp);
        }
        this.applyUnlocks();
        if (this.player) {
            this.respawnPoint.set(this.player.node.position);
            this.startPoint.set(this.player.node.position);
        }
        this.fishTotal = this.player?.node.parent?.getComponentsInChildren('CoinPickup').length ?? 0;
        this.updateCamera();
        // Màn mở đầu đang hiện thì chờ bấm START (LandingScreen gọi beginPlay)
        if (!GameSession.waitingForStart) this.beginPlay();
    }

    onDestroy() {
        if (GameManager.instance === this) {
            GameManager.instance = null;
            PauseMenu.blockOpen = () => false;
        }
    }

    /** Bắt đầu chơi: gán phím cho từng con mèo theo lựa chọn 1 người / 2 người. */
    /** music = false: chưa bật nhạc rừng (đang ở màn hướng dẫn; xong hội thoại mới gọi startMusic). */
    beginPlay(music = true) {
        if (this.playing) return;
        this.playing = true;
        this.applyDifficulty();
        // Nhạc rừng chỉ bật khi vào chơi (xong hội thoại mở đầu / chơi lại màn)
        if (music) this.startMusic();
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

    /**
     * Áp độ khó của ô lưu đang chơi lên mọi địch và boss trong màn (một lần, lúc vào chơi).
     * Tìm theo tên component để GameManager không phải import EnemyPatrol / BossBrain (tránh vòng import).
     */
    private applyDifficulty() {
        const d = difficultyStats(GameSession.difficulty);
        for (const name of ['EnemyPatrol', 'BossBrain']) {
            for (const c of this.node.getComponentsInChildren(name)) (c as unknown as { applyDifficulty(d: DifficultyStats): void }).applyDifficulty(d);
        }
    }

    /** Bật nhạc rừng của màn. */
    startMusic() {
        if (this.music) Sound.music(this.music);
    }

    /** Số liệu chơi lúc này (màn hướng dẫn chụp lại lúc vào, ra thì trả về: cá / thời gian trong màn hướng dẫn không tính). */
    snapshotStats() {
        return { coins: this.coins, fish: this.fish, time: this.playTime, collected: this.collected.length };
    }

    restoreStats(s: { coins: number; fish: number; time: number; collected: number }) {
        this.coins = s.coins;
        this.fish = s.fish;
        this.playTime = s.time;
        this.collected.length = Math.min(this.collected.length, s.collected);
        this.coinCounter?.setValue(this.coins);
    }

    /** Chơi 1 người: chuyển sang điều khiển con mèo cat, con kia tự đi theo (FollowerAI). fx: cho linh hồn bay qua. */
    private setActive(cat: PlayerController, fx = false) {
        const prev = this.active;
        this.active = cat;
        for (const c of this.cats) {
            c.idle = false;
            if (c === cat) {
                c.controls = PlayerInput.player(0); // chơi 1 người: chỉ bộ phím Người 1 (Kiểu phím chọn trong Cài đặt)
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
        if (this.outroTime >= 0) this.updateOutro(dt);
        if (this.finished) return;
        // Đồng hồ đứng yên trong cảnh diễn (hội thoại, mở màn boss)
        if (this.playing && !this.cutscene) this.playTime += dt;

        // Chơi 1 người: con không được điều khiển tự đi theo; phím Đổi mèo để đổi
        if (this.playing && this.active) {
            for (const c of this.cats) if (c !== this.active) this.ai.get(c)?.think(dt);
            if (PlayerInput.player(0).consumeSwap()) {
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
        // Đang bật special thì chỉ mất nửa tim
        if (!this.finished && cat.hurt(fromX)) this.damage(cat, cat.damageTaken(1));
    }

    /** Mèo chạm axit của boss: trúng độc (không bị đẩy lùi). Đang lướt thì né được. */
    acidHit(cat: PlayerController) {
        if (this.finished || cat.downed || cat.idle || cat.evading) return;
        cat.getComponent(PoisonStatus)?.apply();
    }

    damage(cat: PlayerController, amount: number) {
        if (cat.downed || this.finished) return;
        // Chơi 1 người: con đi theo (máy điều khiển) mất tim nhưng không bao giờ gục
        const follower = !!this.active && cat !== this.active;
        cat.hp = Math.max(follower ? 1 : 0, cat.hp - amount);
        this.hudFor(cat)?.setHp(cat.hp, this.maxHp);
        if (cat.hp <= 0.001) this.knockDown(cat);
    }

    heal(cat: PlayerController, amount: number) {
        Sound.play('heal');
        cat.hp = Math.min(this.maxHp, cat.hp + amount);
        this.hudFor(cat)?.setHp(cat.hp, this.maxHp);
    }

    addCoins(amount: number, id?: string) {
        Sound.play('coin', 0.7);
        this.coins += amount;
        this.fish++;
        if (id) this.collected.push(id);
        this.coinCounter?.setValue(this.coins);
    }

    /** Nhặt cá bự (BigFishPickup): cộng 1, không hiện trên HUD (vào cửa hàng mới thấy). */
    addBigFish(id?: string) {
        Sound.play('checkpoint', 0.8);
        this.bigFish++;
        if (id) this.collected.push(id);
    }

    /**
     * Mua một ô cây kỹ năng: đủ cá bự, cá vàng và đã có ô trước thì trừ cá, mở kỹ năng, ghi ngay vào ô lưu.
     * Mua thêm tim thì hồi đầy tim luôn. Trả về true nếu mua được.
     */
    buy(id: UpgradeId): boolean {
        const u = upgradeById(id);
        if (!u || upgradeState(u, this.bigFish, this.coins) !== 'ready') return false;
        this.bigFish -= u.bigFish;
        this.coins -= u.gold;
        this.coinCounter?.setValue(this.coins);
        this.unlocks.push(id);
        this.applyUnlocks();
        if (id === 'heart1' || id === 'heart2') {
            for (const c of this.cats) {
                if (c.downed) continue;
                c.hp = this.maxHp;
                this.hudFor(c)?.setHp(c.hp, this.maxHp);
            }
        }
        this.saveSlot(this.savedCheckpoint, this.respawnPoint.x, this.respawnPoint.y, false);
        return true;
    }

    /** Áp các ô đã mua lên mèo: số tim tối đa, Đập bụng / Mèo Nổ của Leo. Sóng kiếm, nộ nhanh do PlayerController đọc Unlocks. */
    private applyUnlocks() {
        Unlocks.set(this.unlocks);
        if (this.baseHp < 0) this.baseHp = this.maxHp;
        this.maxHp = this.baseHp + (Unlocks.has('heart1') ? 1 : 0) + (Unlocks.has('heart2') ? 1 : 0);
        for (const c of this.cats) {
            const leo = c.getComponent(LeoSkills);
            if (leo) {
                leo.poundUnlocked = Unlocks.has('pound');
                leo.burstUnlocked = Unlocks.has('burst');
            }
            c.hp = Math.min(c.hp, this.maxHp);
            this.hudFor(c)?.setHp(c.hp, this.maxHp);
        }
    }

    setRespawn(pos: Readonly<Vec3>) {
        this.respawnPoint.set(pos);
    }

    /** Chạm checkpoint: hồi sinh ở đây, và ghi đè ô lưu đang chơi nếu xa hơn chỗ đã lưu. */
    reachCheckpoint(node: Node) {
        this.setRespawn(node.position);
        const parent = node.parent;
        if (!parent) return;
        const xs = parent.getComponentsInChildren('Checkpoint').map((c) => c.node.position.x).sort((a, b) => a - b);
        const index = xs.indexOf(node.position.x) + 1;
        if (index <= this.savedCheckpoint) return;
        this.savedCheckpoint = index;
        this.saveSlot(index, node.position.x, node.position.y, false);
    }

    /** Ghi tiến độ vào ô lưu đang chơi (chưa chọn ô thì thôi). */
    private saveSlot(checkpoint: number, x: number, y: number, cleared: boolean) {
        const slot = GameSession.slot;
        if (slot < 0) return;
        const old = SaveSlots.get(slot);
        SaveSlots.write(slot, {
            chapter: 1, level: this.levelId, checkpoint, x, y,
            time: this.playTime, fish: this.fish, coins: this.coins, downs: this.downs,
            collected: this.collected.slice(), cleared: cleared || !!old?.cleared, savedAt: Date.now(),
            bigFish: this.bigFish, unlocks: this.unlocks.slice(),
            difficulty: GameSession.difficulty,
        });
        SaveIcon.show();
    }

    /**
     * Vào chơi tiếp từ ô lưu: mèo đứng ở checkpoint đã lưu, khôi phục thời gian / cá / số lần gục, bỏ những con cá đã ăn.
     * Ô đã qua màn thì chơi lại từ đầu màn (giữ dấu đã qua màn).
     */
    applySave(data: SlotData) {
        if (data.cleared) return;
        this.playTime = data.time;
        this.fish = data.fish;
        this.coins = data.coins;
        this.downs = data.downs;
        this.savedCheckpoint = data.checkpoint;
        this.coinCounter?.setValue(this.coins);
        // Cá bự, kỹ năng đã mua: vào ô lưu là có lại, tim đầy theo số tim mới
        this.bigFish = data.bigFish ?? 0;
        this.unlocks.length = 0;
        this.unlocks.push(...(data.unlocks ?? []));
        this.applyUnlocks();
        for (const c of this.cats) {
            c.hp = this.maxHp;
            this.hudFor(c)?.setHp(c.hp, this.maxHp);
        }
        const parent = this.player?.node.parent;
        if (parent) {
            const gone = new Set(data.collected ?? []);
            const picks = [...parent.getComponentsInChildren('CoinPickup'), ...parent.getComponentsInChildren('BigFishPickup')];
            for (const c of picks) {
                if (gone.has(c.node.uuid)) {
                    this.collected.push(c.node.uuid);
                    c.node.destroy();
                }
            }
        }
        _pos.set(data.x, data.y + 20, 0);
        this.respawnPoint.set(data.x, data.y, 0);
        this.cats.forEach((c, i) => {
            c.respawn(_pos);
            _pos.x -= 120 * (i + 1);
        });
        this.getComponent(CameraRig)?.snapNext();
        this.updateCamera();
    }

    /** Cảnh mở màn boss: mèo đứng yên, không điều khiển được, không bị đánh. */
    lockCats(on: boolean) {
        if (this.finished) return;
        this.cutscene = on;
        for (const c of this.cats) {
            c.controlEnabled = !on && !c.downed;
            if (on) {
                c.body.velocity.x = 0;
                c.invincible = Math.max(c.invincible, 999);
            } else if (c.invincible > 900) {
                c.invincible = 0.5;
            }
        }
        PlayerInput.clearQueues();
    }

    /** Camera bám lại mèo (sau khi trượt sang boss). */
    followCats() {
        this.updateCamera();
    }

    /**
     * Về đích: người chơi thôi điều khiển, camera đứng yên, mèo nảy mừng một nhịp rồi tự chạy sang phải ra khỏi khung hình;
     * khuất hết thì màn tối mờ dần rồi hiện bảng kết quả.
     */
    win() {
        if (this.finished) return;
        this.finished = true;
        Sound.play('win');
        // Qua màn: ô lưu ghi "đã qua màn"
        if (this.player) this.saveSlot(this.savedCheckpoint, this.respawnPoint.x, this.respawnPoint.y, true);
        this.unlockWinAchievements();
        for (const c of this.cats) {
            c.controlEnabled = false;
            c.invincible = Math.max(c.invincible, 999);
            c.getComponent(PoisonStatus)?.clear();
            if (c.body.grounded && !c.downed && this.winHop > 0) {
                c.body.velocity.x = 0;
                c.hop(this.winHop);
            }
        }
        PlayerInput.clearQueues();
        this.getComponent(CameraRig)?.hold(true);
        this.outroTime = 0;
    }

    /** Chạy ra khỏi màn: đáp đất xong thì chạy; con cuối khuất khỏi khung hình (hoặc kẹt quá lâu) thì hiện kết quả. */
    private updateOutro(dt: number) {
        this.outroTime += dt;
        const rig = this.getComponent(CameraRig);
        let allGone = true;
        for (const c of this.cats) {
            if (c.downed) continue;
            if (c.autoMove === 0 && this.outroTime > 0.15 && c.body.grounded) c.autoMove = 1;
            if (rig && rig.inViewX(c.node.position.x, 120)) allGone = false;
        }
        if (allGone || this.outroTime > this.winWalkMax) {
            this.outroTime = -1;
            this.showResults();
        }
    }

    /** Qua màn: Về nhà, và tuỳ cách qua mà thêm Mèo tham ăn, Không một vết xước, Nhanh như mèo, Liều mạng. */
    private unlockWinAchievements() {
        Achievements.unlock('clear');
        if (this.fish >= this.fishTotal) Achievements.unlock('fish');
        if (this.downs === 0) Achievements.unlock('nodown');
        if (this.playTime < FAST_TIME) Achievements.unlock('fast');
        if (GameSession.difficulty >= 2) Achievements.unlock('maniac');
    }

    /** Màn tối mờ dần rồi hiện bảng kết quả. */
    private showResults() {
        ScreenFade.to(170, 0.5, () => {
            const stats = { level: this.levelId, time: this.playTime, fish: this.fish, fishTotal: this.fishTotal, downs: this.downs };
            ResultsScreen.show(this.node, stats, {
                replay: () => ScreenFade.to(255, 0.3, () => reloadScene()),
                menu: () => ScreenFade.to(255, 0.3, () => {
                    LandingScreen.passed = false;
                    GameSession.reset();
                    reloadScene();
                }),
            });
        });
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
            this.respawnAtCheckpoint();
            return;
        }
        // Chơi 1 người: con đang điều khiển gục thì chuyển sang con kia để đi kéo dậy
        if (this.active === cat) this.setActive(standing[0], true);
    }

    private updateRevive(dt: number) {
        for (const c of this.cats) {
            if (!c.downed) continue;
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
        }
    }

    private standUp(cat: PlayerController) {
        this.revive.delete(cat);
        cat.hp = Math.min(this.maxHp, this.reviveHp);
        cat.setDowned(false);
        this.hudFor(cat)?.setHp(cat.hp, this.maxHp);
        Sound.play('heal');
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

    /**
     * Gục hết: hiện "Thử lại nào!" một chút, màn tối lại rồi mọi con mèo đứng dậy ở checkpoint gần nhất (chưa chạm checkpoint nào thì đầu màn),
     * đủ tim, bất tử 1.5 giây. Boss đánh lại từ đầu (respawnListeners). Quái đã hạ, cá đã ăn giữ nguyên.
     */
    private respawnAtCheckpoint() {
        if (this.finished || this.respawning) return;
        this.respawning = true;
        this.downs++;
        Sound.play('lose');
        for (const c of this.cats) {
            c.controlEnabled = false;
            c.getComponent(PoisonStatus)?.clear();
        }
        // Gục một lúc rồi hiện màn GAME OVER: Chơi lại (về checkpoint) hoặc Về menu
        this.scheduleOnce(() => this.showGameOver(), this.respawnDelay);
    }

    private showGameOver() {
        if (this.finished) return;
        this.gameOver = true;
        const screen = GameOverScreen.show(this.node, {
            retry: () => {
                // Màn tối hẳn, đổi chỗ trong bóng tối rồi sáng lại
                ScreenFade.blink(() => {
                    if (screen.isValid) screen.node.destroy();
                    this.gameOver = false;
                    this.respawnNow();
                });
            },
            menu: () => ScreenFade.to(255, 0.3, () => {
                LandingScreen.passed = false;
                GameSession.reset();
                reloadScene();
            }),
        });
    }

    /** Trong lúc màn tối: mọi con mèo đứng dậy ở checkpoint, đủ tim; boss đánh lại từ đầu. */
    private respawnNow() {
        this.respawning = false;
        if (this.finished) return;
        this.hud?.hideMessage();
        this.cats.forEach((c, i) => {
            this.revive.delete(c);
            _pos.set(this.respawnPoint.x - i * 120, this.respawnPoint.y + 20, 0);
            c.respawn(_pos);
            c.hp = this.maxHp;
            c.setDowned(false);
            c.controlEnabled = true;
            this.hudFor(c)?.setHp(c.hp, this.maxHp);
        });
        for (const f of GameManager.respawnListeners.slice()) f();
        CameraRig.instance?.snapNext();
        Sound.play('heal');
    }
}
