import { _decorator, Component } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import type { DifficultyStats } from '../core/Difficulty';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { GroundBlock } from '../level/GroundBlock';
import { DustPuff } from '../player/DustPuff';
import { PlayerController } from '../player/PlayerController';
import { AcidGlob } from './AcidGlob';
import { AcidHazard } from './AcidHazard';
import { AcidWarning } from './AcidWarning';
import { BossArena } from './BossArena';
import { EnemyPatrol } from './EnemyPatrol';
const { ccclass, property } = _decorator;

/** Ảnh trong art/fx/Boss: nốt nhạc khi chuyển phase, bom axit đầu lâu, cột lửa xanh */
const DANCE = 'Boss/Dance/frame';
const ACID_BOMB = 'Boss/Axit 2/frame';
const ACID_PILLAR = 'Boss/Axit 3/frame';

type Attack = 1 | 2 | 3;

/**
 * Bộ não boss (gắn cùng node với EnemyPatrol của boss; DemoLevelBuilder tự gắn khi chơi nếu chưa có).
 * Khu boss (BossArena, tự gắn cùng node): mèo bước lên khối nền boss đứng thì chiếu cảnh mở màn, xong mới ra đòn.
 *  - Phase 1 (máu trên Phase 2 At, mặc định 2/3): đi chậm, đòn xong nghỉ Cooldown 1 giây rồi ra Axit 1.
 *  - Máu xuống Phase 2 At: nhảy múa (Dance, bất tử) rồi Phase 2: đi nhanh hơn, Axit 1 hoặc Axit 2 (1 bom), không lặp liền.
 *  - Máu xuống Phase 3 At (mặc định 1/3): nhảy múa rồi Phase 3: Axit 1, Axit 2 (2 bom) hoặc Axit 3 (6 cột dồn dập hơn), không lặp liền.
 *  - Phase nào boss chưa ra đủ Min Attacks Per Phase đòn thì máu dừng ngay trên mốc (phase 3: không chết), để người chơi thấy đủ đòn.
 *  - Mèo gục hết, hồi sinh ở checkpoint: GameManager báo, boss đầy máu về phase 1, về chỗ cũ, axit đang có biến mất.
 * Axit 1: phùng người rồi phun cục độc vòng cung tới chỗ mèo, chạm đất nổ vũng.
 * Axit 2: bom đầu lâu mọc lên ngay chỗ mèo; vòng dưới đất là cảnh báo, tới lúc bốc khói mới gây đòn.
 * Axit 3: 6 dấu cảnh báo (AcidWarning) hiện cùng lúc, Pillar Warning giây sau 6 cột lửa xanh lần lượt mọc từ trái sang phải
 *   đúng chỗ dấu; đứng giữa hai dấu thì không bị trúng.
 * Trúng axit thì mèo trúng độc (PoisonStatus).
 */
@ccclass('BossBrain')
export class BossBrain extends Component {
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
    cooldown1 = 2.6;

    @property({ group: 'Nhịp đòn', tooltip: 'Phase 2: nghỉ bao lâu giữa hai đòn (giây)' })
    cooldown2 = 2.0;

    @property({ group: 'Nhịp đòn', tooltip: 'Phase 3: nghỉ bao lâu giữa hai đòn (giây)' })
    cooldown3 = 1.5;

    @property({ group: 'Axit 1', tooltip: 'Phồng người lấy đà bao lâu rồi mới phun (giây)' })
    spitWindup = 0.4;

    @property({ group: 'Axit 1', tooltip: 'Cục độc bay bao lâu tới chỗ mèo (giây)' })
    spitFlight = 0.8;

    @property({ group: 'Axit 2', tooltip: 'Phase 2: quả bom thứ hai cách mèo bao xa (về phía mèo đang quay mặt)' })
    bombGap = 300;

    @property({ group: 'Axit 3', tooltip: 'Dấu cảnh báo hiện trước cột đầu tiên bao lâu (giây)' })
    pillarWarning = 1;

    @property({ group: 'Axit 3', tooltip: 'Phase 1, 2: cột sau mọc sau cột trước bao lâu (giây)' })
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
    private lastAttack = 0;
    private left = 0;
    private right = 0;
    private groundY = 0;
    private attacks = 0;
    private startX = 0;
    private startY = 0;
    private warnings: AcidWarning[] = [];
    private arena: BossArena | null = null;
    /** Độ khó (GameManager gọi một lần lúc vào chơi): nghỉ giữa các đòn ngắn lại, báo trước ngắn lại. */
    applyDifficulty(d: DifficultyStats) {
        this.cooldown1 *= d.rest;
        this.cooldown2 *= d.rest;
        this.cooldown3 *= d.rest;
        this.spitWindup *= d.warn;
        this.pillarWarning *= d.warn;
    }

    private readonly alive = () => !!this.boss && this.boss.isValid && !this.boss.defeated;

    onLoad() {
        this.boss = this.getComponent(EnemyPatrol);
        this.arena = this.getComponent(BossArena) ?? this.addComponent(BossArena);
        this.arena.onFight = () => { this.timer = 1; };
        for (const p of [DANCE, ACID_BOMB, ACID_PILLAR]) DustPuff.preload(p);
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
        this.unscheduleAllCallbacks();
        this.clearWarnings();
        const parent = e.node.parent;
        if (parent) {
            for (const h of parent.getComponentsInChildren(AcidHazard)) h.node.destroy();
            for (const g of parent.getComponentsInChildren(AcidGlob)) g.node.destroy();
        }
        for (const p of e.node.getComponentsInChildren(DustPuff)) p.node.destroy(); // nốt nhạc đang nhảy múa
        e.resetForRetry(this.startX, this.startY);
        this.arena?.retry(); // boss về gặm xương, mở dấu X; vào lại thì chiếu bản ngắn
        e.speed = this.baseSpeed;
        this.phase = 1;
        this.timer = 1.5;
        this.busy = 0;
        this.dance = 0;
        this.attacks = 0;
        this.lastAttack = 0;
        this.updateFloor();
    };

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

    /** Mèo gần nhất đã lên bậc đá của boss (chưa gục). */
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
            this.unscheduleAllCallbacks();
            this.clearWarnings();
            this.enabled = false;
            return;
        }

        // Chưa vào trận: mèo bước lên khối đá thì chiếu cảnh mở màn; đang chiếu thì chờ
        const arena = this.arena;
        if (arena && !arena.fighting) {
            const t = this.target();
            if (!arena.busy && t && arena.isInside(t.node.position.x)) arena.enter();
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
        this.unscheduleAllCallbacks(); // bỏ các cột / bom chưa kịp ra
        this.clearWarnings();
        this.phase = phase;
        this.attacks = 0;
        this.updateFloor();
        this.dance = this.danceTime;
        this.hopTimer = 0;
        this.busy = 0;
        e.paused = true;
        e.invulnerable = true;
        e.speed = this.baseSpeed * (phase === 3 ? this.speedPhase3 : this.speedPhase2);
        // Nốt nhạc quanh đầu boss (đặt cao hơn thì ra khỏi màn hình khi camera theo mèo ở dưới)
        DustPuff.spawn(DANCE, e.node, 0, e.targetHeight * 0.6, { scale: 2.6, fps: 12, center: true, loopFor: this.danceTime });
        Sound.play('checkpoint', 0.8);
        CameraRig.instance?.shake(8, 0.3);
    }

    private attack(t: PlayerController) {
        // Phase 1: Axit 1. Phase 2: Axit 1, 2. Phase 3: Axit 1, 2, 3
        const pool: Attack[] = this.phase === 3 ? [1, 2, 3] : this.phase === 2 ? [1, 2] : [1];
        let choices = pool.filter((a) => a !== this.lastAttack);
        if (choices.length === 0) choices = pool;
        const a = choices[Math.floor(Math.random() * choices.length)];
        this.lastAttack = a;
        this.attacks++;
        this.updateFloor();
        const e = this.boss!;
        e.paused = true;
        e.face(t.node.position.x);
        e.windup();
        if (a === 1) this.spit(t);
        else if (a === 2) this.bombs(t);
        else this.pillars();
    }

    /** Axit 1: phồng người rồi phun cục độc vòng cung tới chỗ mèo đứng lúc phun. */
    private spit(t: PlayerController) {
        const e = this.boss!;
        this.busy = this.spitWindup + 0.5;
        this.scheduleOnce(() => {
            const parent = e.node.parent;
            if (!parent || !this.alive()) return;
            const p = e.node.position;
            const dir = e.facingDir;
            const tx = Math.max(this.left, Math.min(this.right, t.node.position.x));
            AcidGlob.fire(parent, p.x + dir * e.targetHeight * 0.25, p.y + e.targetHeight * 0.6, tx, this.groundY, this.spitFlight, this.alive);
            Sound.play('dash', 0.6);
        }, this.spitWindup);
    }

    /** Axit 2: bom đầu lâu mọc lên ngay chỗ mèo (phase 2: thêm một quả trước mặt mèo). */
    private bombs(t: PlayerController) {
        this.busy = 0.7;
        const x = t.node.position.x;
        const xs = [x];
        if (this.phase >= 3) xs.push(x + (t.facing >= 0 ? 1 : -1) * this.bombGap); // phase 3: thêm 1 quả trước mặt mèo
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
