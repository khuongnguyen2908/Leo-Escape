import { _decorator, Color, Component, Node, Rect, resources, Sprite, SpriteFrame, Tween, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { overlaps } from '../core/Box';
import type { DifficultyStats } from '../core/Difficulty';
import type { Hittable } from '../core/Hittable';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { GroundBlock } from '../level/GroundBlock';
import { DustPuff } from '../player/DustPuff';
import { PlayerController } from '../player/PlayerController';
import { T } from '../ui/Lang';
import { uiLabel, uiNode } from '../ui/UiKit';
import { AcidGlob } from './AcidGlob';
import { AcidHazard } from './AcidHazard';
import { AcidWarning } from './AcidWarning';
import { BossArena } from './BossArena';
import { BossHazard } from './BossHazard';
import { EnemyPatrol } from './EnemyPatrol';
const { ccclass, property } = _decorator;

/** Ảnh trong art/fx/Boss: nốt nhạc khi chuyển phase, bom axit đầu lâu, cột lửa xanh */
const DANCE = 'Boss/Dance/frame';
const ACID_BOMB = 'Boss/Axit 2/frame';
const ACID_PILLAR = 'Boss/Axit 3/frame';
/** Bụi tung (cào đất lấy đà, chó con tan) */
const DUST = 'FX_run_';
/** Ảnh đòn trong art/fx/Boss: sét đánh (thư mục Thunder, hoặc Thuner như lúc mới thả vào), va chạm khi lao đâm tường,
 *  bụi đáp đất khi nhảy đè, dấu ! cảnh báo trên chỗ đòn sắp đánh xuống */
let THUNDER = 'Boss/Thuner/frame';
const IMPACT = 'Boss/Impact/frame';
const SLAM = 'Boss/Slam/frame';
const WARN_FX = 'Boss/Warn/frame';
/** Vệt móng khi boss cào vồ */
const CLAW_FX = 'Boss/Claw/warrior_skill5_frame';
/** Tâm vệt móng cách mép khung va chạm (phía trước mặt) bao xa */
const CLAW_AHEAD = 140;

const WARN = new Color(230, 40, 40, 255);
const WAVE = new Color(255, 240, 210, 255);
const STEEL = new Color(190, 200, 210, 255);
const STEEL_EDGE = new Color(60, 42, 34, 255);
const GUM = new Color(122, 90, 72, 255);
const TOOTH = new Color(255, 255, 255, 255);
const BOLT = new Color(255, 251, 208, 255);
const BOLT_GLOW = new Color(255, 240, 150, 255);
const BARK = new Color(255, 245, 225, 255);
const BARK_LINE = new Color(150, 40, 40, 255);
const COLLAR = new Color(255, 255, 200, 255);

type Attack = 'claw' | 'spit' | 'sonic' | 'jump' | 'shove' | 'spikes' | 'jaw' | 'bomb' | 'pups' | 'thunder' | 'pillars' | 'double';

/** Flow đòn của từng phase: ra đúng thứ tự, hết thì quay lại đòn đầu; vào phase mới bắt đầu lại từ đòn đầu */
const FLOWS: Record<number, Attack[]> = {
    1: ['claw', 'sonic', 'spit', 'jump'],
    2: ['claw', 'shove', 'spikes', 'jaw', 'bomb'],
    3: ['claw', 'pups', 'thunder', 'pillars', 'double'],
};

/** Đòn có boss tự chạy (chạy tới cào vồ, lao ngang, nhảy đè): BossBrain lo từng khung */
interface Motion {
    kind: 'claw' | 'shove' | 'jump' | 'pups';
    t: number;
    stage: number;
    dir: number;
    tx: number;
    legs: number;
    hit: boolean;
    /** Đoạn lao này đi xa tối đa bao nhiêu */
    legMax: number;
}

const _r = new Rect();
const _cat = new Rect();

/**
 * Bộ não boss (gắn cùng node với EnemyPatrol của boss; DemoLevelBuilder tự gắn khi chơi nếu chưa có).
 * Khu boss (BossArena, tự gắn cùng node): mèo rơi chạm đáy hang thì chiếu cảnh mở màn, xong mới ra đòn.
 * Kiểu Cuphead: mỗi phase một flow đòn cố định (FLOWS, lặp theo thứ tự, không random), càng về sau càng dồn.
 * Đòn nào cũng báo trước bằng dáng riêng của đòn (không nháy đỏ); đòn nhắm vào chỗ mèo thì thêm vệt đỏ dưới đất (hàm răng, sấm: thêm dấu ! Warn).
 * Chạm thân boss không mất tim; chỉ trúng đòn mới mất (cào vồ, lao ngang, nhảy đè, gai, răng, sấm, chó con...).
 *  - Phase 1: Cào vồ (chạy tới sát mèo) → Sủa sóng âm (đẩy lùi, không mất máu) → Phun độc → Nhảy đè → lặp lại.
 *  - Phase 2: Cào vồ → Lao ngang trái rồi phải (cúi thấp, nhảy qua được) → Bắn gai vòng cổ → Hàm răng bẫy → Bom đầu lâu → lặp.
 *  - Phase 3: Cào vồ → Gọi bầy chó con (chém 1 nhát là chết) → Sấm sét (3 tia cùng lúc) → 6 cột lửa xanh → Đòn đôi → lặp.
 *  - Máu xuống mốc: nhảy múa (bất tử) rồi sang phase mới. Phase nào chưa ra đủ Min Attacks Per Phase đòn thì máu dừng trên mốc.
 *  - Mèo gục hết, hồi sinh ở checkpoint: boss đầy máu về phase 1, về chỗ cũ, mọi đòn đang dở biến mất.
 * Các vật của đòn mới (sóng âm, gai, hàm răng, sấm, khối đá, chó con) vẽ tạm bằng code (BossHazard), sau thay ảnh được.
 */
@ccclass('BossBrain')
export class BossBrain extends Component {
    @property({ tooltip: 'Máu boss (đặt lúc vào trận, trước khi nhân theo độ khó)' })
    bossHp = 150;

    @property({ group: 'Phase', tooltip: 'Máu còn bao nhiêu phần (so với máu đầy) thì sang phase 2. 0.67 = còn 2/3' })
    phase2At = 0.67;

    @property({ group: 'Phase', tooltip: 'Máu còn bao nhiêu phần thì sang phase 3. 0.34 = còn khoảng 1/3' })
    phase3At = 0.34;

    @property({ group: 'Phase', tooltip: 'Mỗi phase boss phải ra ít nhất chừng này đòn thì máu mới tụt qua mốc (phase 3: mới chết được)' })
    minAttacksPerPhase = 2;

    @property({ group: 'Phase', tooltip: 'Nhảy múa chuyển phase bao lâu (giây), boss bất tử lúc này' })
    danceTime = 1.5;

    @property({ group: 'Phase', tooltip: 'Phase 2 đi nhanh gấp mấy lần phase 1' })
    speedPhase2 = 1.3;

    @property({ group: 'Phase', tooltip: 'Phase 3 đi nhanh gấp mấy lần phase 1' })
    speedPhase3 = 1.5;

    @property({ group: 'Nhịp đòn', tooltip: 'Phase 1: nghỉ bao lâu giữa hai đòn (giây, tính từ lúc đòn trước xong)' })
    cooldown1 = 2.0;

    @property({ group: 'Nhịp đòn', tooltip: 'Phase 2: nghỉ bao lâu giữa hai đòn (giây)' })
    cooldown2 = 1.6;

    @property({ group: 'Nhịp đòn', tooltip: 'Phase 3: nghỉ bao lâu giữa hai đòn (giây)' })
    cooldown3 = 1.2;

    @property({ group: 'Cào gần', tooltip: 'Boss chạy tới khi mặt boss cách mèo còn chừng này thì dừng lại vồ' })
    clawRange = 140;

    @property({ group: 'Cào gần', tooltip: 'Tốc độ chạy tới chỗ mèo trước khi cào' })
    clawRun = 750;

    @property({ group: 'Cào gần', tooltip: 'Ngả người nháy đỏ bao lâu rồi mới vồ (giây)' })
    clawWindup = 0.5;

    @property({ group: 'Axit 1', tooltip: 'Phồng người lấy đà bao lâu rồi mới phun (giây)' })
    spitWindup = 0.4;

    @property({ group: 'Axit 1', tooltip: 'Cục độc bay bao lâu tới chỗ mèo (giây)' })
    spitFlight = 0.8;

    @property({ group: 'Sủa sóng âm', tooltip: 'Lấy đà bao lâu rồi mới sủa (giây)' })
    sonicWindup = 0.45;

    @property({ group: 'Sủa sóng âm', tooltip: 'Vòng sóng bay nhanh bao nhiêu' })
    sonicSpeed = 1000;

    @property({ group: 'Sủa sóng âm', tooltip: 'Trúng sóng thì mèo bị đẩy lùi với tốc độ này' })
    sonicPush = 1300;

    @property({ group: 'Nhảy đè', tooltip: 'Bóng đỏ dưới chân mèo hiện bao lâu rồi boss mới nhảy (giây)' })
    jumpWarn = 0.8;

    @property({ group: 'Nhảy đè', tooltip: 'Bay trên không bao lâu (giây)' })
    jumpTime = 0.8;

    @property({ group: 'Lao ngang', tooltip: 'Cúi người cào đất lấy đà bao lâu (giây)' })
    shoveWindup = 0.6;

    @property({ group: 'Lao ngang', tooltip: 'Tốc độ lao' })
    shoveSpeed = 1300;

    @property({ group: 'Lao ngang', tooltip: 'Mỗi lượt lao xa tối đa chừng này rồi dừng, quay về phía mèo lao tiếp' })
    shoveLeg = 700;

    @property({ group: 'Lao ngang', tooltip: 'Lao tối đa mấy lượt (qua trái qua phải theo mèo)' })
    shoveLegs = 4;

    @property({ group: 'Lao ngang', tooltip: 'Hết một lượt thì khựng chừng này giây rồi mới quay đầu lao tiếp' })
    shoveTurn = 0.4;

    @property({ group: 'Lao ngang', tooltip: 'Lao tông tường thì choáng chừng này giây (sao xoay, đứng yên, chém thoải mái)' })
    shoveStun = 2;

    @property({ group: 'Lao ngang', tooltip: 'Lúc lao boss cao còn chừng này (mèo nhảy cao khoảng 300)' })
    shoveHeight = 200;

    @property({ group: 'Bắn gai', tooltip: 'Vòng cổ loé sáng bao lâu rồi mới bắn (giây)' })
    spikeWindup = 0.6;

    @property({ group: 'Bắn gai', tooltip: 'Số cây gai mỗi lần bắn' })
    spikeCount = 8;

    @property({ group: 'Bắn gai', tooltip: 'Mỗi cây gai bắn ra cách cây trước bao lâu (giây)' })
    spikeGap = 0.12;

    @property({ group: 'Bắn gai', tooltip: 'Gai cắm đất bao lâu rồi biến (giây)' })
    spikeStay = 0.9;

    @property({ group: 'Hàm răng', tooltip: 'Dấu đỏ dưới chân mèo hiện bao lâu rồi hàm răng mới sập (giây)' })
    jawWarn = 0.75;

    @property({ group: 'Chó con', tooltip: 'Số chó con mỗi lần gọi' })
    pupCount = 4;

    @property({ group: 'Chó con', tooltip: 'Chó con chạy nhanh bao nhiêu' })
    pupSpeed = 560;

    @property({ group: 'Sấm sét', tooltip: 'Boss đứng run + 3 dấu đỏ hiện bao lâu rồi 3 tia sét mới đánh xuống cùng lúc (giây)' })
    thunderWarn = 1;

    @property({ group: 'Sấm sét', tooltip: 'Số tia sét đánh cùng lúc (1 tia gần mèo, còn lại ngẫu nhiên)' })
    boltCount = 3;

    @property({ group: 'Sấm sét', tooltip: 'Hai chỗ sét đánh cách nhau ít nhất chừng này' })
    boltGap = 350;

    @property({ group: 'Axit 2', tooltip: 'Chồm người nháy đỏ bao lâu rồi bom mới mọc (giây)' })
    bombWindup = 0.5;

    @property({ group: 'Chó con', tooltip: 'Thụp người bao lâu rồi mới nhảy lùi về góc phải (giây)' })
    pupWindup = 0.35;

    @property({ group: 'Chó con', tooltip: 'Đứng ở góc sủa liên tục, mỗi tiếng sủa cách nhau chừng này giây (mỗi tiếng ra 1 chó con)' })
    pupBarkGap = 0.55;

    @property({ group: 'Axit 2', tooltip: 'Phase 3: quả bom thứ hai cách mèo bao xa (về phía mèo đang quay mặt)' })
    bombGap = 300;

    @property({ group: 'Axit 3', tooltip: 'Dấu cảnh báo hiện trước cột đầu tiên bao lâu (giây)' })
    pillarWarning = 1;

    @property({ group: 'Axit 3', tooltip: 'Cột sau mọc sau cột trước bao lâu (giây)' })
    pillarDelay = 0.3;

    @property({ group: 'Axit 3', tooltip: 'Phase 3: cột sau mọc sau cột trước bao lâu (giây)' })
    pillarDelayPhase3 = 0.18;

    private boss: EnemyPatrol | null = null;
    private phase = 1;
    private timer = 1.5;
    private busy = 0;
    private dance = 0;
    private hopTimer = 0;
    private baseSpeed = 0;
    /** Đòn kế tiếp trong flow của phase hiện tại */
    private flowStep = 0;
    private left = 0;
    private right = 0;
    private groundY = 0;
    private attacks = 0;
    private startX = 0;
    private startY = 0;
    private warnings: AcidWarning[] = [];
    private arena: BossArena | null = null;
    private motion: Motion | null = null;
    /** Vệt móng đang hiện: bám theo mặt boss suốt lúc vồ tới */
    private clawMark: Node | null = null;
    private impactFx: DustPuff | null = null;

    /** Độ khó (GameManager gọi một lần lúc vào chơi): nghỉ giữa các đòn ngắn lại, báo trước ngắn lại. */
    applyDifficulty(d: DifficultyStats) {
        this.cooldown1 *= d.rest;
        this.cooldown2 *= d.rest;
        this.cooldown3 *= d.rest;
        this.spitWindup *= d.warn;
        this.pillarWarning *= d.warn;
        this.clawWindup *= d.warn;
        this.sonicWindup *= d.warn;
        this.jumpWarn *= d.warn;
        this.shoveWindup *= d.warn;
        this.shoveTurn *= d.warn;
        this.spikeWindup *= d.warn;
        this.jawWarn *= d.warn;
        this.thunderWarn *= d.warn;
        this.bombWindup *= d.warn;
        this.pupWindup *= d.warn;
    }

    private readonly alive = () => !!this.boss && this.boss.isValid && !this.boss.defeated;

    onLoad() {
        this.boss = this.getComponent(EnemyPatrol);
        this.boss?.setMaxHp(this.bossHp);
        this.arena = this.getComponent(BossArena) ?? this.addComponent(BossArena);
        this.arena.onFight = () => { this.timer = 1; };
        // Thư mục sét: Thunder (nếu đã đổi tên trong Creator), không thì Thuner
        if (resources.getDirWithPath('art/fx/Boss/Thunder', SpriteFrame).length > 0) THUNDER = 'Boss/Thunder/frame';
        for (const p of [DANCE, ACID_BOMB, ACID_PILLAR, DUST, THUNDER, IMPACT, SLAM, WARN_FX, CLAW_FX]) DustPuff.preload(p);
        AcidGlob.preload();
    }

    start() {
        const e = this.boss;
        if (!e) return;
        this.baseSpeed = e.speed;
        this.startX = e.node.position.x;
        this.startY = e.node.position.y;
        this.findArena();
        this.arena?.setup(e, this.left, this.right, this.groundY);
        GameManager.respawnListeners.push(this.retry);
    }

    onDestroy() {
        const l = GameManager.respawnListeners;
        const i = l.indexOf(this.retry);
        if (i >= 0) l.splice(i, 1);
    }

    /** Mốc máu sang phase 2 / 3 (tính theo máu đầy). */
    private get phase2Hp() { return Math.round((this.boss?.maxHp ?? 0) * this.phase2At); }
    private get phase3Hp() { return Math.round((this.boss?.maxHp ?? 0) * this.phase3At); }

    /** Máu không tụt dưới mốc phase kế tiếp (phase 3: không chết) khi chưa ra đủ đòn ở phase này. */
    private updateFloor() {
        const e = this.boss;
        if (!e) return;
        if (this.attacks >= this.minAttacksPerPhase) e.hpFloor = 0;
        else e.hpFloor = this.phase === 1 ? this.phase2Hp + 1 : this.phase === 2 ? this.phase3Hp + 1 : 1;
    }

    /** Mèo gục hết, hồi sinh ở checkpoint: đánh lại trận boss từ đầu. */
    private readonly retry = () => {
        const e = this.boss;
        if (!e || !e.isValid || e.defeated) return;
        this.stopEverything();
        e.resetForRetry(this.startX, this.startY);
        this.arena?.retry(); // boss về gặm xương, mở dấu X; vào lại thì chiếu bản ngắn
        e.speed = this.baseSpeed;
        this.phase = 1;
        this.timer = 1.5;
        this.attacks = 0;
        this.flowStep = 0;
        this.updateFloor();
    };

    /** Bỏ mọi đòn đang dở: lịch hẹn, dấu cảnh báo, axit, vật của đòn mới, dáng, lực chạy. */
    private stopEverything() {
        this.unscheduleAllCallbacks();
        this.clearWarnings();
        this.busy = 0;
        this.dance = 0;
        this.motion = null;
        const e = this.boss;
        if (!e) return;
        e.drive = null;
        Tween.stopAllByTarget(e.pose);
        Object.assign(e.pose, { sx: 1, sy: 1, angle: 0, x: 0, y: 0 });
        const parent = e.node.parent;
        if (parent) {
            for (const h of parent.getComponentsInChildren(AcidHazard)) h.node.destroy();
            for (const g of parent.getComponentsInChildren(AcidGlob)) g.node.destroy();
            for (const h of parent.getComponentsInChildren(BossHazard)) h.node.destroy();
        }
        for (const p of e.node.getComponentsInChildren(DustPuff)) p.node.destroy(); // nốt nhạc đang nhảy múa
    }

    /** Bậc đá boss đứng: khối nền có mặt trên ngang chân boss và trải qua chỗ boss. */
    private findArena() {
        const e = this.boss!;
        const p = e.node.position;
        this.left = p.x - 700;
        this.right = p.x + 700;
        this.groundY = p.y;
        const parent = e.node.parent;
        if (!parent) return;
        for (const g of parent.getComponentsInChildren(GroundBlock)) {
            const gx = g.node.position.x, gy = g.node.position.y;
            if (p.x >= gx && p.x <= gx + g.width && Math.abs(gy - p.y) < 60) {
                this.left = gx + 60;
                this.right = gx + g.width - 60;
                this.groundY = gy;
                return;
            }
        }
    }

    /** Mèo gần nhất đã xuống hang boss (chưa gục). */
    private target(): PlayerController | null {
        const gm = GameManager.instance;
        const e = this.boss;
        if (!gm || !e) return null;
        let best: PlayerController | null = null;
        let bestD = Infinity;
        for (const c of gm.cats) {
            if (c.downed || c.idle) continue;
            const p = c.node.position;
            if (p.x < this.left - 80 || p.x > this.right + 80 || p.y < this.groundY - 60) continue;
            const d = Math.abs(p.x - e.node.position.x);
            if (d < bestD) {
                bestD = d;
                best = c;
            }
        }
        return best;
    }

    update(dt: number) {
        const e = this.boss;
        if (!e) return;
        if (!this.alive()) {
            this.stopEverything();
            this.enabled = false;
            return;
        }

        // Chưa vào trận: mèo rơi chạm đáy hang thì chiếu cảnh mở màn; đang chiếu thì chờ
        const arena = this.arena;
        if (arena && !arena.fighting) {
            const t = this.target();
            if (!arena.busy && t && arena.landed(t.node.position.x, t.node.position.y, t.body.grounded)) arena.enter();
            return;
        }

        // Đang nhảy múa chuyển phase: đứng tại chỗ nhún nhảy, bất tử
        if (this.dance > 0) {
            this.dance -= dt;
            this.hopTimer -= dt;
            if (this.hopTimer <= 0) {
                this.hopTimer = 0.5;
                e.hop(320);
            }
            if (this.dance <= 0) {
                e.invulnerable = false;
                e.paused = false;
                this.timer = this.cooldown() * 0.6;
            }
            return;
        }

        // Máu xuống tới mốc thì nhảy múa rồi sang phase mới
        this.updateFloor();
        const want = e.hp <= this.phase3Hp ? 3 : e.hp <= this.phase2Hp ? 2 : 1;
        if (want > this.phase) {
            this.startDance(want);
            return;
        }

        if (this.motion) {
            this.updateMotion(dt);
            return;
        }

        if (this.busy > 0) {
            this.busy -= dt;
            if (this.busy <= 0) e.paused = false;
            return;
        }

        const t = this.target();
        if (!t) return;
        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = this.cooldown();
            this.attack(t);
        }
    }

    private cooldown(): number {
        return this.phase === 3 ? this.cooldown3 : this.phase === 2 ? this.cooldown2 : this.cooldown1;
    }

    private startDance(phase: number) {
        const e = this.boss!;
        this.stopEverything(); // bỏ các đòn chưa kịp ra
        this.phase = phase;
        this.attacks = 0;
        this.flowStep = 0;
        this.updateFloor();
        this.dance = this.danceTime;
        this.hopTimer = 0;
        e.paused = true;
        e.invulnerable = true;
        e.speed = this.baseSpeed * (phase === 3 ? this.speedPhase3 : this.speedPhase2);
        // Nốt nhạc quanh đầu boss (đặt cao hơn thì ra khỏi màn hình khi camera theo mèo ở dưới)
        DustPuff.spawn(DANCE, e.node, 0, e.targetHeight * 0.6, { scale: 2.6, fps: 12, center: true, loopFor: this.danceTime });
        Sound.play('checkpoint', 0.8);
        CameraRig.instance?.shake(8, 0.3);
    }

    // ---------- Chọn đòn ----------

    private attack(t: PlayerController) {
        const e = this.boss!;
        // Đòn kế trong flow của phase (lặp theo thứ tự)
        const flow = FLOWS[this.phase] ?? FLOWS[1];
        const a = flow[this.flowStep % flow.length];
        this.flowStep = (this.flowStep + 1) % flow.length;
        this.attacks++;
        this.updateFloor();
        e.paused = true;
        e.face(t.node.position.x);
        this.run(a, t);
    }

    private run(a: Attack, t: PlayerController) {
        switch (a) {
            case 'claw': this.claw(t); break;
            case 'spit': this.spit(t); break;
            case 'sonic': this.sonic(); break;
            case 'jump': this.jump(t); break;
            case 'shove': this.shove(t); break;
            case 'spikes': this.spikes(); break;
            case 'jaw': this.jaw(t); break;
            case 'bomb': this.bombs(t); break;
            case 'pups': this.pups(); break;
            case 'thunder': this.thunder(t); break;
            case 'pillars': this.pillars(); break;
            case 'double': this.double(); break;
        }
    }

    /** Khoảng trống giữa mặt boss và thân mèo (theo chiều ngang). */
    private gapTo(t: PlayerController): number {
        const b = this.boss!.getHitRect(_r);
        const c = t.body.getRect(_cat);
        return Math.max(c.xMin - b.xMax, b.xMin - c.xMax, 0);
    }

    // ---------- Gây đòn ----------

    /** Mèo nào chạm hộp r thì mất 1 tim (đang lướt / vừa bị đánh thì thôi). */
    private hurtIn(r: Rect, fromX: number): boolean {
        const gm = GameManager.instance;
        if (!gm || !this.alive()) return false;
        let hit = false;
        for (const c of gm.cats) {
            if (c.downed || c.idle || !overlaps(c.body.getRect(_cat), r)) continue;
            gm.hurtCat(c, fromX);
            hit = true;
        }
        return hit;
    }

    /** Thân boss là vũ khí (đang lao ngang, đang bay khi nhảy đè): chạm thân (thu hẹp một chút, cao tối đa h) thì mất 1 tim. */
    private bodyHit(h: number) {
        const e = this.boss!;
        const b = e.getHitRect(_r);
        const shrink = b.width * 0.12;
        _r.set(b.x + shrink, b.y, b.width - shrink * 2, Math.min(h, b.height * 0.85));
        this.hurtIn(_r, e.node.position.x);
    }

    /** Tạo vật của đòn trong lớp Gameplay, nằm sau mèo (front: nằm trên mèo). */
    private spawn(name: string, x: number, y: number, step: (h: BossHazard, dt: number) => boolean, hittable?: Hittable, front = false): BossHazard | null {
        const parent = this.boss?.node.parent;
        if (!parent) return null;
        const h = BossHazard.spawn(parent, name, x, y, step, hittable);
        if (front) return h;
        const cats = GameManager.instance?.cats ?? [];
        let idx = Infinity;
        for (const c of cats) if (c.node.parent === parent) idx = Math.min(idx, c.node.getSiblingIndex());
        if (isFinite(idx)) h.node.setSiblingIndex(idx);
        return h;
    }

    /** Dấu đỏ nhấp nháy dưới đất (rộng width) trong life giây; bang: thêm dấu ! (ảnh Warn) nhảy phía trên. */
    private warnMark(x: number, width: number, life: number, bang = false) {
        const mark = this.spawn('BossWarn', x, this.groundY, (h) => {
            const k = h.time / Math.max(0.01, life);
            const blink = 0.5 + 0.5 * Math.abs(Math.sin(h.time * Math.PI * (4 + 10 * k)));
            const g = h.g;
            g.clear();
            g.fillColor = new Color(WARN.r, WARN.g, WARN.b, Math.round(70 + 90 * blink));
            g.ellipse(0, 4, width / 2 * (0.7 + 0.3 * k), 20);
            g.fill();
            g.strokeColor = new Color(255, 230, 220, Math.round(200 * blink));
            g.lineWidth = 4;
            g.ellipse(0, 4, width / 2 * (0.7 + 0.3 * k), 20);
            g.stroke();
            return h.time < life && this.alive();
        });
        if (!bang || !mark) return;
        // Dấu ! nhảy ngay trên chỗ sắp đánh, cao hơn đầu mèo và vẽ đè lên mèo (không bị thân mèo che)
        const bangNode = this.spawn('BossBang', x, this.groundY + 220, (h) => h.time < life && this.alive(), undefined, true);
        if (bangNode) DustPuff.spawn(WARN_FX, bangNode.node, 0, 0, { scale: 1.8, fps: 14, loopFor: life });
    }

    /** Chữ bật lên rồi bay lên mờ đi (GÂU!!...). */
    private shout(text: string, x: number, y: number, size = 96) {
        const parent = this.boss?.node.parent;
        if (!parent) return;
        const e = this.boss!;
        const n = uiNode('BossShout', parent);
        n.setPosition(x, y, 0);
        const label = uiLabel(n, text, size, BARK, { outline: BARK_LINE, outlineWidth: 8 });
        label.node.angle = e.facingDir > 0 ? -8 : 8;
        n.setScale(0.3, 0.3, 1);
        const op = n.addComponent(UIOpacity);
        tween(n).to(0.16, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' }).to(0.1, { scale: Vec3.ONE })
            .delay(0.4).by(0.4, { position: new Vec3(0, 50, 0) }).start();
        tween(op).delay(0.7).to(0.4, { opacity: 0 }).call(() => n.destroy()).start();
    }

    /** Tiếng sủa (file bark của khu boss, chưa có thì tiếng đập tạm). */
    private barkSound() {
        const s = this.arena?.barkSound;
        if (s && Sound.has(s)) Sound.play(s, 1);
        else {
            Sound.play('land', 1);
            Sound.play('hit', 0.6);
        }
    }

    /** Miệng boss (để phun, sủa). */
    private mouth(): [number, number] {
        const e = this.boss!;
        const p = e.node.position;
        return [p.x + e.facingDir * e.targetHeight * 0.3, p.y + e.targetHeight * 0.55];
    }

    /** Dáng boss chuyển mượt sang (sx, sy, angle) trong time giây. */
    private poseTo(sx: number, sy: number, angle: number, time: number) {
        const e = this.boss!;
        Tween.stopAllByTarget(e.pose);
        tween(e.pose).to(time, { sx, sy, angle }, { easing: 'sineOut' }).start();
    }

    // ---------- Đòn có boss tự chạy (cào vồ, lao ngang, nhảy đè) ----------

    private updateMotion(dt: number) {
        const e = this.boss!;
        const m = this.motion!;
        const b = e.physics;
        m.t += dt;
        if (m.kind === 'claw') {
            if (m.stage === -1) {
                // Chạy tới sát mèo (hết khu hoặc quá lâu thì vồ luôn tại chỗ)
                const t = this.target();
                if (t) {
                    e.face(t.node.position.x);
                    m.dir = e.facingDir;
                }
                const r = e.getHitRect(_r);
                const atEdge = m.dir < 0 ? r.xMin <= this.left - 40 : r.xMax >= this.right + 40;
                const near = !t || this.gapTo(t) <= this.clawRange;
                e.drive = m.dir * this.clawRun;
                e.pose.angle = -6;
                if (near || atEdge || m.t > 2.5) {
                    m.stage = 0;
                    m.t = 0;
                    e.drive = 0;
                    Sound.play('boss_growl', 0.7);
                }
                return;
            }
            if (m.stage === 0) {
                e.pose.angle = 12 * Math.min(1, m.t / Math.max(0.05, this.clawWindup * 0.6));
                if (m.t >= this.clawWindup) {
                    m.stage = 1;
                    m.t = 0;
                    e.drive = m.dir * 950;
                    Object.assign(e.pose, { sx: 1.14, sy: 0.92, angle: -10 });
                    Sound.play('boss_claw', 1);
                    this.clawFx(m.dir);
                }
            } else if (m.stage === 1) {
                // Vồ tới: móng trước mặt trúng ai thì người đó mất tim
                const r = e.getHitRect(_r);
                const front = m.dir > 0 ? r.xMax : r.xMin;
                if (this.clawMark?.isValid) this.clawMark.setPosition(front + m.dir * CLAW_AHEAD, this.clawMark.position.y);
                _r.set(m.dir > 0 ? front - 60 : front - 240, this.groundY, 300, e.targetHeight * 0.6);
                this.hurtIn(_r, e.node.position.x);
                if (m.t >= 0.16) {
                    m.stage = 2;
                    m.t = 0;
                    e.drive = -m.dir * 280;
                    this.poseTo(1, 1, 0, 0.3);
                }
            } else if (m.t >= 0.35) {
                this.endMotion(0.25);
            }
            return;
        }
        if (m.kind === 'jump') {
            if (m.stage === 0) {
                // Ngồi thụp lấy đà trong lúc bóng đỏ hiện dưới chân mèo
                const k = Math.min(1, m.t / Math.max(0.05, this.jumpWarn));
                Object.assign(e.pose, { sx: 1 + 0.1 * k, sy: 1 - 0.18 * k, angle: 0 });
                if (m.t >= this.jumpWarn) {
                    m.stage = 1;
                    m.t = 0;
                    const T = Math.max(0.3, this.jumpTime);
                    b.velocity.y = (b.gravity * T) / 2;
                    e.drive = (m.tx - e.node.position.x) / T;
                    Object.assign(e.pose, { sx: 0.92, sy: 1.12, angle: -8 });
                    Sound.play('jump', 1);
                }
            } else if (m.stage === 1) {
                this.bodyHit(Infinity);
                if (m.t > 0.15 && b.grounded) {
                    // Đáp đất: rung màn, bụi hai bên, ai ở quanh chỗ đáp thì mất tim
                    m.stage = 2;
                    m.t = 0;
                    e.drive = 0;
                    const r = e.getHitRect(_r);
                    _r.set(r.x - 90, this.groundY, r.width + 180, 170);
                    this.hurtIn(_r, e.node.position.x);
                    CameraRig.instance?.shake(20, 0.4);
                    Sound.play('boss_slam', 1);
                    const parent = e.node.parent;
                    // Bụi lấp lánh toả hai bên chỗ đáp (ảnh Slam rộng 140 → ~770)
                    if (parent) DustPuff.spawn(SLAM, parent, e.node.position.x, this.groundY - 6, { scale: 5.5, fps: 16 });
                    Object.assign(e.pose, { sx: 1.18, sy: 0.82, angle: 0 });
                    this.poseTo(1, 1, 0, 0.3);
                }
            } else if (m.t >= 0.45) {
                this.endMotion(0.2);
            }
            return;
        }
        if (m.kind === 'pups') {
            this.updatePups(m);
            return;
        }
        // Lao ngang: cúi cào đất → lao từng đoạn ngắn về phía mèo (qua trái qua phải) → tông tường thì choáng
        if (m.stage === 0) {
            const k = Math.min(1, m.t / Math.max(0.05, this.shoveWindup * 0.5));
            Object.assign(e.pose, { sx: 1 + 0.12 * k, sy: 1 - (1 - this.shoveHeight / e.targetHeight) * k, angle: -4 * k });
            if (Math.floor((m.t - dt) / 0.12) !== Math.floor(m.t / 0.12)) this.scrape(m.dir);
            if (m.t >= this.shoveWindup) this.startLeg(m);
        } else if (m.stage === 1) {
            this.shoveLines(m.dir);
            this.bodyHit(this.shoveHeight);
            const r = e.getHitRect(_r);
            const atEdge = m.dir < 0 ? r.xMin <= this.left - 40 : r.xMax >= this.right + 40;
            if (atEdge || (m.dir < 0 && b.hitLeft) || (m.dir > 0 && b.hitRight)) {
                // Tông tường: rung màn, choáng (sao xoay), đứng yên cho mèo chém
                this.stopImpact();
                e.drive = 0;
                m.stage = 4;
                m.t = 0;
                CameraRig.instance?.shake(18, 0.35);
                Sound.play('boss_charge_stun', 1);
                e.daze(this.shoveStun / 0.6); // boss to xác: choáng bị nhân 0.6
                this.poseTo(1, 1, 0, 0.25);
            } else if (Math.abs(e.node.position.x - m.tx) >= m.legMax || m.t > 3) {
                // Hết đoạn lao: khựng lại, chuẩn bị lượt sau
                this.stopImpact();
                e.drive = 0;
                m.legs++;
                m.stage = 2;
                m.t = 0;
            }
        } else if (m.stage === 2) {
            if (m.t >= this.shoveTurn) {
                if (m.legs < this.shoveLegs) {
                    const t = this.target();
                    if (t) e.face(t.node.position.x);
                    m.dir = e.facingDir;
                    this.startLeg(m);
                } else {
                    m.stage = 3;
                    m.t = 0;
                    this.poseTo(1, 1, 0, 0.3);
                }
            }
        } else if (m.stage === 3) {
            if (m.t >= 0.35) this.endMotion(0.3);
        } else if (m.t >= this.shoveStun) {
            // Hết choáng
            this.endMotion(0.2);
        }
    }

    /** Bắt đầu một đoạn lao: chạy về phía m.dir, vệt va chạm (Impact) lặp ở mặt boss. */
    private startLeg(m: Motion) {
        const e = this.boss!;
        m.stage = 1;
        m.t = 0;
        m.tx = e.node.position.x;
        // Tường ở gần (trong tầm Shove Leg + 350) thì lao luôn tới tường: mèo đứng sát tường là dụ được boss tông
        const r0 = e.getHitRect(_r);
        const toWall = m.dir < 0 ? r0.xMin - this.left : this.right - r0.xMax;
        m.legMax = toWall < this.shoveLeg + 350 ? Infinity : this.shoveLeg;
        e.drive = m.dir * this.shoveSpeed;
        Sound.play('boss_charge', 1);
        this.stopImpact();
        const r = e.getHitRect(_r);
        const front = (m.dir > 0 ? r.xMax : r.xMin) - e.node.position.x + m.dir * 10;
        this.impactFx = DustPuff.spawn(IMPACT, e.node, front, this.shoveHeight * 0.55, { dir: m.dir, scale: 4.5, fps: 18, center: true, loopFor: 10 });
    }

    private stopImpact() {
        if (this.impactFx?.isValid) this.impactFx.node.destroy();
        this.impactFx = null;
    }

    private endMotion(rest: number) {
        const e = this.boss!;
        this.stopImpact();
        this.motion = null;
        e.drive = null;
        Tween.stopAllByTarget(e.pose);
        Object.assign(e.pose, { sx: 1, sy: 1, angle: 0, x: 0, y: 0 });
        this.busy = rest;
    }

    private startMotion(kind: Motion['kind'], tx = 0) {
        const e = this.boss!;
        this.motion = { kind, t: 0, stage: 0, dir: e.facingDir, tx, legs: 0, hit: false, legMax: 0 };
    }

    /** Cào vồ (đòn thường): chạy tới sát mèo, ngả người nháy đỏ rồi vồ tới cào một nhát trước mặt. */
    private claw(t: PlayerController) {
        const e = this.boss!;
        e.face(t.node.position.x);
        this.startMotion('claw');
        this.motion!.stage = -1;
    }

    /** Vệt móng (ảnh Boss/Claw) trước mặt boss lúc vồ. */
    private clawFx(dir: number) {
        const e = this.boss!;
        const parent = e.node.parent;
        if (!parent) return;
        const r = e.getHitRect(_r);
        // Hình boss dài hơn khung va chạm: đặt vệt ra trước mặt hình boss (lúc vồ thì bám theo, xem stage 1)
        const x = (dir > 0 ? r.xMax : r.xMin) + dir * CLAW_AHEAD;
        // Ảnh vệt móng (art/fx/Boss/Claw), lật theo hướng boss vồ, vẽ trên mèo
        const fx = DustPuff.spawn(CLAW_FX, parent, x, this.groundY + e.targetHeight * 0.4, { dir, scale: 3.5, fps: 20, center: true });
        fx?.node.setSiblingIndex(parent.children.length - 1);
        this.clawMark = fx?.node ?? null;
    }

    /** Nhảy đè: bóng đỏ dưới chân mèo, boss thụp xuống lấy đà rồi nhảy vòng cung đáp đúng chỗ đó. */
    private jump(t: PlayerController) {
        const e = this.boss!;
        const r = e.getHitRect(_r);
        const half = r.width / 2;
        const tx = Math.max(this.left + half, Math.min(this.right - half, t.node.position.x));
        e.face(tx);
        this.warnMark(tx, r.width * 0.9, this.jumpWarn + this.jumpTime);
        this.startMotion('jump', tx);
    }

    /** Lao ngang: cúi thấp (nhảy qua được) lao từng đoạn ngắn về phía mèo, qua trái qua phải; tông tường thì choáng 2 giây. */
    private shove(t: PlayerController) {
        const e = this.boss!;
        e.face(t.node.position.x);
        this.startMotion('shove');
    }

    /** Bụi cào đất sau gót lúc lấy đà lao. */
    private scrape(dir: number) {
        const e = this.boss!;
        const parent = e.node.parent;
        if (!parent) return;
        const r = e.getHitRect(_r);
        DustPuff.spawn(DUST, parent, dir > 0 ? r.xMin + 40 : r.xMax - 40, this.groundY, { dir: -dir, scale: 5, fps: 22 });
    }

    /** Vệt gió sau lưng boss lúc lao (vẽ một khung rồi tắt). */
    private shoveLines(dir: number) {
        const e = this.boss!;
        const r = e.getHitRect(_r);
        const back = dir > 0 ? r.xMin : r.xMax;
        this.spawn('BossWind', back, this.groundY, (h) => {
            const a = 1 - h.time / 0.12;
            const g = h.g;
            g.clear();
            if (a <= 0) return false;
            g.strokeColor = new Color(255, 255, 255, Math.round(200 * a));
            g.lineWidth = 6;
            for (const [y, len] of [[50, 160], [110, 220], [170, 130]]) {
                g.moveTo(-dir * 10, y);
                g.lineTo(-dir * (10 + len), y);
            }
            g.stroke();
            return true;
        });
    }

    // ---------- Sủa sóng âm ----------

    /** GÂU!! ra 3 vòng sóng bay ngang, đẩy mèo lùi (không mất máu; đang lướt thì xuyên qua). Trả về thời gian của đòn. */
    private sonic(): number {
        const e = this.boss!;
        const dir = e.facingDir;
        this.poseTo(0.95, 1.06, 10, this.sonicWindup);
        const total = this.sonicWindup + 0.4 + 0.2 * 2 + 0.4;
        this.busy = total;
        this.scheduleOnce(() => {
            if (!this.alive()) return;
            Object.assign(e.pose, { sx: 1.1, sy: 0.92, angle: -8 });
            this.poseTo(1, 1, 0, 0.4);
            this.barkSound();
            CameraRig.instance?.shake(10, 0.3);
            const [mx, my] = this.mouth();
            this.shout(T('boss.bark'), mx + dir * 80, e.node.position.y + e.targetHeight + 40);
            for (let i = 0; i < 3; i++) this.scheduleOnce(() => this.sonicRing(mx, my, dir), i * 0.2);
        }, this.sonicWindup);
        return total;
    }

    private sonicRing(x0: number, y0: number, dir: number) {
        if (!this.alive()) return;
        const pushed = new Set<PlayerController>();
        this.spawn('BossSonic', x0, this.groundY, (h, dt) => {
            const x = h.node.position.x + dir * this.sonicSpeed * dt;
            h.node.setPosition(x, this.groundY, 0);
            const g = h.g;
            g.clear();
            const a = Math.max(0.25, 1 - h.time * 0.6);
            g.strokeColor = new Color(WAVE.r, WAVE.g, WAVE.b, Math.round(230 * a));
            g.lineWidth = 14;
            // Nửa vòng cong về phía trước, cao bằng người boss
            const hgt = y0 - this.groundY + 60;
            g.ellipse(0, hgt / 2 + 20, 40, hgt / 2 + 20);
            g.stroke();
            const gm = GameManager.instance;
            if (gm) {
                _r.set(x - 50, this.groundY, 100, hgt + 60);
                for (const c of gm.cats) {
                    if (pushed.has(c) || c.downed || c.idle || c.evading || !overlaps(c.body.getRect(_cat), _r)) continue;
                    pushed.add(c);
                    c.body.velocity.x = dir * this.sonicPush;
                    c.body.velocity.y = Math.max(c.body.velocity.y, 260);
                    c.pushLock = 0.3;
                }
            }
            return this.alive() && x > this.left - 200 && x < this.right + 200;
        });
    }

    /** Đòn đôi (phase 3): sủa sóng âm đẩy mèo dồn về tường, vừa xong lao ngang hoặc nhảy đè liền. */
    private double() {
        const e = this.boss!;
        const time = this.sonic();
        this.busy = time + 1;
        this.scheduleOnce(() => {
            if (!this.alive()) return;
            const t = this.target();
            if (!t) {
                this.busy = 0;
                return;
            }
            e.face(t.node.position.x);
            this.busy = 0;
            if (Math.random() < 0.5) this.shove(t);
            else this.jump(t);
        }, Math.max(0.2, time - 0.3));
    }

    // ---------- Bắn gai vòng cổ ----------

    /** Vòng cổ loé sáng, rung, rồi bắn gai bay vòng cung rơi rải khắp khu; gai cắm đất một lúc rồi biến. */
    private spikes() {
        const e = this.boss!;
        const cx = () => e.node.position.x - e.facingDir * e.targetHeight * 0.05;
        const cy = this.groundY + e.targetHeight * 0.45;
        this.spawn('BossCollar', cx(), cy, (h) => {
            h.node.setPosition(cx(), cy, 0);
            e.pose.x = Math.sin(h.time * 60) * 4;
            const k = Math.min(1, h.time / Math.max(0.05, this.spikeWindup));
            const g = h.g;
            g.clear();
            g.fillColor = new Color(COLLAR.r, COLLAR.g, COLLAR.b, Math.round(150 * k * (0.6 + 0.4 * Math.sin(h.time * 30))));
            g.circle(0, 0, 90 + 30 * k);
            g.fill();
            if (h.time >= this.spikeWindup) e.pose.x = 0;
            return h.time < this.spikeWindup && this.alive();
        });
        const n = Math.max(3, Math.round(this.spikeCount));
        const flight = 0.75;
        const gap = Math.max(0, this.spikeGap);
        this.busy = this.spikeWindup + gap * (n - 1) + flight + 0.3;
        // Bắn từng cây một, cách nhau Spike Gap giây, mỗi cây một tiếng boss_spike; chỗ rơi xáo trộn để không đoán trước được
        const span = this.right - this.left - 120;
        const spots: number[] = [];
        for (let i = 0; i < n; i++) spots.push(this.left + 60 + (span * i) / (n - 1) + (Math.random() - 0.5) * 60);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [spots[i], spots[j]] = [spots[j], spots[i]];
        }
        spots.forEach((tx, i) => this.scheduleOnce(() => {
            if (!this.alive()) return;
            Sound.play('boss_spike', 0.9);
            if (i === 0) CameraRig.instance?.shake(6, 0.2);
            this.spike(cx(), cy, tx, flight);
        }, this.spikeWindup + gap * i));
    }

    private spike(x0: number, y0: number, x1: number, flight: number) {
        const arc = 320;
        const stay = this.spikeStay;
        const y1 = this.groundY + 10;
        this.spawn('BossSpike', x0, y0, (h) => {
            const g = h.g;
            g.clear();
            let ang: number;
            let a = 1;
            if (h.time < flight) {
                const s = h.time / flight;
                const x = x0 + (x1 - x0) * s;
                const y = y0 + (y1 - y0) * s + arc * 4 * s * (1 - s);
                h.node.setPosition(x, y, 0);
                const dx = (x1 - x0), dy = (y1 - y0) + arc * 4 * (1 - 2 * s);
                ang = Math.atan2(dy, dx);
                _r.set(x - 25, y - 25, 50, 50);
                this.hurtIn(_r, x0);
            } else {
                h.node.setPosition(x1, y1, 0);
                ang = -Math.PI / 2;
                if (h.data.landed !== 1) {
                    h.data.landed = 1;
                    Sound.play('spike_land', 0.55);
                }
                const t = h.time - flight;
                if (t < stay) {
                    _r.set(x1 - 20, this.groundY, 40, 70);
                    this.hurtIn(_r, x1);
                } else a = 1 - (t - stay) / 0.25;
                if (a <= 0) return false;
            }
            // Gai thép: mũi nhọn về hướng bay, chuôi đỏ (vòng cổ)
            const c = Math.cos(ang), s2 = Math.sin(ang);
            const pt = (fx: number, fy: number): [number, number] => [fx * c - fy * s2, fx * s2 + fy * c];
            g.fillColor = new Color(STEEL.r, STEEL.g, STEEL.b, Math.round(255 * a));
            g.strokeColor = new Color(STEEL_EDGE.r, STEEL_EDGE.g, STEEL_EDGE.b, Math.round(255 * a));
            g.lineWidth = 4;
            const p1 = pt(40, 0), p2 = pt(-26, -16), p3 = pt(-26, 16);
            g.moveTo(p1[0], p1[1]);
            g.lineTo(p2[0], p2[1]);
            g.lineTo(p3[0], p3[1]);
            g.close();
            g.fill();
            g.stroke();
            return this.alive();
        });
    }

    // ---------- Hàm răng bẫy ----------

    /** Dấu đỏ dưới chân mèo, rồi hai hàm răng đất trồi lên sập lại đúng chỗ đó. */
    private jaw(t: PlayerController) {
        const lead = this.jawWarn;
        // Dấu hiệu: gầm cúi đầu (ngả tới, thấp xuống) + dấu đỏ dưới chân mèo
        this.poseTo(1.08, 0.9, -10, Math.min(0.3, lead));
        this.scheduleOnce(() => this.poseTo(1, 1, 0, 0.3), lead);
        Sound.play('boss_growl', 0.9);
        const tx = Math.max(this.left + 110, Math.min(this.right - 110, t.node.position.x));
        this.warnMark(tx, 240, lead, true);
        this.busy = lead + 0.9;
        const rise = 0.12, shut = 0.1, hold = 0.45, fade = 0.3;
        this.scheduleOnce(() => {
            if (!this.alive()) return;
            this.spawn('BossJaw', tx, this.groundY, (h) => {
                const tt = h.time;
                const up = Math.min(1, tt / rise);
                const close = Math.min(1, Math.max(0, (tt - rise) / shut));
                const a = tt < rise + shut + hold ? 1 : 1 - (tt - rise - shut - hold) / fade;
                if (a <= 0) return false;
                if (close >= 1 && tt < rise + shut + 0.1) {
                    if (h.data.shook !== 1) {
                        h.data.shook = 1;
                        CameraRig.instance?.shake(10, 0.2);
                        Sound.play('jaw_snap', 1);
                    }
                    _r.set(tx - 110, this.groundY, 220, 200);
                    this.hurtIn(_r, tx);
                }
                const g = h.g;
                g.clear();
                for (const side of [-1, 1]) {
                    const ox = side * (110 - 95 * close);
                    const top = 210 * up;
                    g.fillColor = new Color(GUM.r, GUM.g, GUM.b, Math.round(255 * a));
                    g.strokeColor = new Color(STEEL_EDGE.r, STEEL_EDGE.g, STEEL_EDGE.b, Math.round(255 * a));
                    g.lineWidth = 5;
                    g.moveTo(ox, 0);
                    g.lineTo(ox, top);
                    g.quadraticCurveTo(ox + side * 80, top + 10, ox + side * 100, 0);
                    g.close();
                    g.fill();
                    g.stroke();
                    // Răng nhọn hướng vào giữa
                    g.fillColor = new Color(TOOTH.r, TOOTH.g, TOOTH.b, Math.round(255 * a));
                    for (let i = 0; i < 4; i++) {
                        const y = 30 + i * (top - 40) / 3.5;
                        g.moveTo(ox, y);
                        g.lineTo(ox - side * 26, y + 16);
                        g.lineTo(ox, y + 32);
                        g.close();
                    }
                    g.fill();
                }
                return this.alive();
            });
        }, lead);
    }

    // ---------- Gọi bầy chó con ----------

    /** Gọi chó con: thụp người, nhảy lùi về sát góc phải khu boss, đứng sủa liên tục, mỗi tiếng sủa ra 1 chó con chạy tới mèo. */
    private pups() {
        const e = this.boss!;
        this.poseTo(1.08, 0.86, 0, this.pupWindup);
        this.startMotion('pups');
        const r = e.getHitRect(_r);
        this.motion!.tx = this.right - r.width / 2 + 40; // chỗ đáp: sát góc phải
    }

    private updatePups(m: Motion) {
        const e = this.boss!;
        const b = e.physics;
        const n = Math.max(1, Math.round(this.pupCount));
        if (m.stage === 0) {
            if (m.t < this.pupWindup) return;
            m.stage = 1;
            m.t = 0;
            if (Math.abs(m.tx - e.node.position.x) < 120) {
                m.stage = 2; // đã ở góc
                return;
            }
            // Nhảy lùi (vẫn quay mặt về phía mèo)
            const T = 0.6;
            b.velocity.y = (b.gravity * T) / 2;
            e.drive = (m.tx - e.node.position.x) / T;
            Object.assign(e.pose, { sx: 0.94, sy: 1.1, angle: 8 });
            Sound.play('jump', 0.9);
        } else if (m.stage === 1) {
            if (m.t > 0.15 && b.grounded) {
                e.drive = 0;
                m.stage = 2;
                m.t = 0;
                CameraRig.instance?.shake(10, 0.2);
                Sound.play('land', 0.8);
                Object.assign(e.pose, { sx: 1.12, sy: 0.88, angle: 0 });
                this.poseTo(1, 1, 0, 0.25);
            }
        } else if (m.stage === 2) {
            // Đứng ở góc sủa liên tục: mỗi tiếng sủa 1 chó con
            const t = this.target();
            if (t) e.face(t.node.position.x);
            if (m.legs < n && m.t >= (m.legs === 0 ? 0.3 : this.pupBarkGap)) {
                m.t = 0;
                m.legs++;
                const dir = e.facingDir;
                Object.assign(e.pose, { sx: 1.1, sy: 0.9, angle: -10 });
                this.poseTo(1, 1, 0, 0.25);
                this.barkSound();
                const [mx] = this.mouth();
                this.shout(T('boss.bark'), mx + dir * 60, e.node.position.y + e.targetHeight + 30, 72);
                this.pup(dir);
            } else if (m.legs >= n && m.t >= 0.6) {
                this.endMotion(0.3);
            }
        }
    }

    private pup(dir: number) {
        const e = this.boss;
        if (!e || !this.alive()) return;
        const frame = e.visual?.getComponent(Sprite)?.spriteFrame;
        const height = 130;
        const w = 120;
        let dead = false;
        let h: BossHazard | null = null;
        const hit: Hittable = {
            get canBeHit() { return !dead; },
            getHitRect: (out: Rect) => {
                const p = h?.node.position ?? Vec3.ZERO;
                return out.set(p.x - w / 2, p.y, w, height * 0.85);
            },
            takeHit: () => {
                if (dead) return;
                dead = true;
                const p = h?.node.position;
                const parent = e.node.parent;
                if (p && parent) DustPuff.spawn(DUST, parent, p.x, p.y, { scale: 5, fps: 20 });
                Sound.play('pup_die', 0.8);
            },
        };
        h = this.spawn('BossPup', e.node.position.x - dir * 40, this.groundY, (hz, dt) => {
            if (dead) return false;
            const x = hz.node.position.x + dir * this.pupSpeed * dt;
            hz.node.setPosition(x, this.groundY, 0);
            const pic = hz.node.getChildByName('Pic');
            if (pic) pic.setPosition(0, Math.abs(Math.sin(hz.time * 18)) * 10, 0);
            _r.set(x - w / 2, this.groundY, w, height * 0.8);
            this.hurtIn(_r, x - dir * 100);
            return this.alive() && x > this.left - 160 && x < this.right + 160;
        }, hit);
        if (!h) return;
        Sound.play('call dog', 0.8);
        if (frame) {
            const pic = new Node('Pic');
            pic.layer = h.node.layer;
            h.node.addChild(pic);
            const ui = pic.addComponent(Sprite);
            ui.spriteFrame = frame;
            pic.getComponent(UITransform)?.setAnchorPoint(0.5, 0);
            const k = height / frame.rect.height;
            pic.setScale(k * dir * (e.artFacesRight ? 1 : -1), k, 1);
        } else {
            h.g.fillColor = new Color(120, 80, 60, 255);
            h.g.ellipse(0, 50, 60, 45);
            h.g.fill();
        }
    }

    // ---------- Sấm sét ----------

    /** Boss đứng yên run bần bật; 3 chỗ hiện vệt đỏ + dấu !, rồi 3 tia sét đánh xuống cùng lúc (1 tia gần mèo, còn lại ngẫu nhiên). */
    private thunder(t: PlayerController) {
        const e = this.boss!;
        const lead = this.thunderWarn;
        Sound.play('boss_growl', 0.8);
        // Run bần bật tại chỗ
        this.spawn('BossShiver', e.node.position.x, this.groundY, (h) => {
            e.pose.x = Math.sin(h.time * 90) * 6;
            e.pose.sy = 1 - 0.04 * Math.abs(Math.sin(h.time * 45));
            if (h.time >= lead) {
                e.pose.x = 0;
                e.pose.sy = 1;
                return false;
            }
            return this.alive();
        });
        const xs = this.boltSpots(t.node.position.x);
        for (const x of xs) this.warnMark(x, 180, lead, true);
        this.busy = lead + 0.7;
        this.scheduleOnce(() => {
            if (!this.alive()) return;
            Sound.play('thunder', 1);
            CameraRig.instance?.shake(18, 0.4);
            for (const x of xs) this.bolt(x);
        }, lead);
    }

    /** Chỗ sét đánh: 1 chỗ gần mèo, còn lại ngẫu nhiên trong khu, cách nhau ít nhất boltGap. */
    private boltSpots(catX: number): number[] {
        const lo = this.left + 60, hi = this.right - 60;
        const xs = [Math.max(lo, Math.min(hi, catX + (Math.random() - 0.5) * 160))];
        const n = Math.max(1, Math.round(this.boltCount));
        for (let tries = 0; xs.length < n && tries < 80; tries++) {
            const x = lo + Math.random() * (hi - lo);
            if (xs.every((o) => Math.abs(o - x) >= this.boltGap)) xs.push(x);
        }
        return xs;
    }

    private bolt(x: number) {
        if (!this.alive()) return;
        // Ảnh sét đánh xuống đất, tia toả lên (128 → ~700), nằm trên mèo
        const parent = this.boss?.node.parent;
        if (parent) DustPuff.spawn(THUNDER, parent, x, this.groundY - 20, { scale: 5.5, fps: 16 });
        const top = 1300;
        const zig: number[] = [];
        for (let i = 0; i <= 8; i++) zig.push(i === 8 ? 0 : (i % 2 ? 1 : -1) * (40 + Math.random() * 70));
        this.spawn('BossBolt', x, this.groundY, (h) => {
            const life = 0.3;
            const a = 1 - h.time / life;
            if (a <= 0) return false;
            if (h.time < 0.15) {
                _r.set(x - 70, this.groundY, 140, top);
                this.hurtIn(_r, x);
            }
            const g = h.g;
            g.clear();
            for (const [w, col] of [[56, BOLT_GLOW], [18, BOLT]] as [number, Color][]) {
                g.strokeColor = new Color(col.r, col.g, col.b, Math.round((w > 20 ? 150 : 255) * a));
                g.lineWidth = w;
                g.moveTo(zig[0], top);
                for (let i = 1; i <= 8; i++) g.lineTo(zig[i], top - (top * i) / 8);
                g.stroke();
            }
            g.fillColor = new Color(BOLT.r, BOLT.g, BOLT.b, Math.round(160 * a));
            g.ellipse(0, 10, 120 * (1 + h.time * 2), 26);
            g.fill();
            return true;
        }, undefined, true);
    }

    // ---------- Đòn axit (có sẵn) ----------

    /** Axit 1: phồng người rồi phun cục độc vòng cung tới chỗ mèo đứng lúc phun. */
    private spit(t: PlayerController) {
        const e = this.boss!;
        this.busy = this.spitWindup + 0.5;
        // Dấu hiệu: phồng người (ngực to ra, hơi ngửa)
        this.poseTo(1.12, 0.92, 6, this.spitWindup);
        this.scheduleOnce(() => {
            this.poseTo(1, 1, 0, 0.2);
            const parent = e.node.parent;
            if (!parent || !this.alive()) return;
            const p = e.node.position;
            const dir = e.facingDir;
            const tx = Math.max(this.left, Math.min(this.right, t.node.position.x));
            AcidGlob.fire(parent, p.x + dir * e.targetHeight * 0.25, p.y + e.targetHeight * 0.6, tx, this.groundY, this.spitFlight, this.alive);
            Sound.play('boss_toxic', 1);
        }, this.spitWindup);
    }

    /** Axit 2: bom đầu lâu mọc lên ngay chỗ mèo (phase 3 trở lên: thêm một quả trước mặt mèo). */
    private bombs(t: PlayerController) {
        const e = this.boss!;
        this.busy = this.bombWindup + 0.7;
        // Dấu hiệu: chồm người lên (cao lên, ngửa ra sau), rồi dậm xuống thì bom mọc
        Sound.play('boss_growl', 0.7);
        this.poseTo(0.94, 1.1, 12, this.bombWindup);
        this.scheduleOnce(() => {
            if (!this.alive()) return;
            Object.assign(e.pose, { sx: 1.12, sy: 0.88, angle: -6 });
            this.poseTo(1, 1, 0, 0.3);
            CameraRig.instance?.shake(6, 0.15);
            this.spawnBombs(t);
        }, this.bombWindup);
    }

    private spawnBombs(t: PlayerController) {
        const x = t.node.position.x;
        const xs = [x];
        if (this.phase >= 3) xs.push(x + (t.facing >= 0 ? 1 : -1) * this.bombGap);
        const parent = this.boss!.node.parent;
        if (!parent) return;
        for (const bx of xs) {
            // Khung 0–5: đầu lâu mọc lên + vòng cảnh báo; khung 6–11: bốc khói, gây đòn; sau đó tan
            AcidHazard.spawn(parent, ACID_BOMB, Math.max(this.left, Math.min(this.right, bx)), this.groundY, {
                scale: 2.2, fps: 12, fromFrame: 6, toFrame: 11, w: 230, h: 200, alive: this.alive,
            });
        }
        Sound.play('drop', 0.8);
    }

    /** Axit 3: 6 cột lửa xanh lần lượt từ trái sang phải khắp bậc đá. */
    private pillars() {
        const delay = this.phase === 3 ? this.pillarDelayPhase3 : this.pillarDelay;
        const n = 6;
        const lead = Math.max(0.2, this.pillarWarning);
        this.busy = lead + delay * (n - 1) + 0.2;
        // Dấu hiệu: ngồi thụp (thấp, bè ra) trong lúc 6 dấu xanh hiện; cột đầu mọc thì đứng dậy
        this.poseTo(1.1, 0.85, 0, Math.min(0.4, lead));
        this.scheduleOnce(() => this.poseTo(1, 1, 0, 0.3), lead);
        const parent = this.boss?.node.parent;
        if (!parent) return;
        this.clearWarnings();
        for (let i = 0; i < n; i++) {
            const x = this.left + ((this.right - this.left) * i) / (n - 1);
            // Cả 6 dấu cảnh báo hiện cùng lúc; dấu nào tới lượt cột mọc thì tắt
            const at = lead + delay * i;
            const w = AcidWarning.spawn(parent, x, this.groundY, 150, at + 0.05);
            this.warnings.push(w);
            this.scheduleOnce(() => {
                if (w.isValid) w.node.destroy();
                if (!parent.isValid || !this.alive()) return;
                // Khung 0–3: nhú lên; khung 4–19: cột cao, gây đòn; khung 20–23: tắt dần.
                // Vùng gây đòn hẹp hơn hình cột một chút: đứng giữa hai dấu là an toàn
                AcidHazard.spawn(parent, ACID_PILLAR, x, this.groundY, {
                    scale: 3, fps: 16, fromFrame: 4, toFrame: 19, w: 100, h: 330, alive: this.alive,
                });
                Sound.play('land', 0.5);
            }, at);
        }
    }

    /** Xoá các dấu cảnh báo còn lại (chuyển phase, đánh lại từ đầu, boss chết). */
    private clearWarnings() {
        for (const w of this.warnings) if (w.isValid) w.node.destroy();
        this.warnings = [];
    }
}
