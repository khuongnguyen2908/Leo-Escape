import { _decorator, Component } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { GroundBlock } from '../level/GroundBlock';
import { DustPuff } from '../player/DustPuff';
import { PlayerController } from '../player/PlayerController';
import { AcidGlob } from './AcidGlob';
import { AcidHazard } from './AcidHazard';
import { EnemyPatrol } from './EnemyPatrol';
const { ccclass, property } = _decorator;

/** Ảnh trong art/fx/Boss: nốt nhạc khi chuyển phase, bom axit đầu lâu, cột lửa xanh */
const DANCE = 'Boss/Dance/frame';
const ACID_BOMB = 'Boss/Axit 2/frame';
const ACID_PILLAR = 'Boss/Axit 3/frame';

type Attack = 1 | 2 | 3;

/**
 * Bộ não boss (gắn cùng node với EnemyPatrol của boss; DemoLevelBuilder tự gắn khi chơi nếu chưa có).
 * Chỉ ra đòn khi mèo đã lên bậc đá của boss.
 *  - Phase 1 (máu > Phase 2 Hp): đi chậm, đòn xong nghỉ Cooldown 1 giây rồi ra đòn ngẫu nhiên Axit 1 / 2 / 3 (không lặp liền).
 *  - Còn Phase 2 Hp máu: nhảy múa (Dance, bất tử) rồi Phase 2: đi nhanh hơn, Axit 2 (2 bom) hoặc Axit 3.
 *  - Còn Phase 3 Hp máu: nhảy múa rồi Phase 3: chỉ Axit 3, 6 cột ra dồn dập hơn.
 * Axit 1: phùng người rồi phun cục độc vòng cung tới chỗ mèo, chạm đất nổ vũng.
 * Axit 2: bom đầu lâu mọc lên ngay chỗ mèo; vòng dưới đất là cảnh báo, tới lúc bốc khói mới gây đòn.
 * Axit 3: 6 cột lửa xanh lần lượt từ trái sang phải khắp bậc đá; cột mới nhú là cảnh báo, cao hẳn mới gây đòn.
 * Trúng axit thì mèo trúng độc (PoisonStatus).
 */
@ccclass('BossBrain')
export class BossBrain extends Component {
    @property({ group: 'Phase', tooltip: 'Máu còn bao nhiêu thì sang phase 2' })
    phase2Hp = 26;

    @property({ group: 'Phase', tooltip: 'Máu còn bao nhiêu thì sang phase 3' })
    phase3Hp = 13;

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
    private readonly alive = () => !!this.boss && this.boss.isValid && !this.boss.defeated;

    onLoad() {
        this.boss = this.getComponent(EnemyPatrol);
        for (const p of [DANCE, ACID_BOMB, ACID_PILLAR]) DustPuff.preload(p);
        AcidGlob.preload();
    }

    start() {
        const e = this.boss;
        if (!e) return;
        this.baseSpeed = e.speed;
        this.findArena();
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
            this.enabled = false;
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
        this.phase = phase;
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
        const pool: Attack[] = this.phase === 3 ? [3] : this.phase === 2 ? [2, 3] : [1, 2, 3];
        let choices = pool.filter((a) => a !== this.lastAttack);
        if (choices.length === 0) choices = pool;
        const a = choices[Math.floor(Math.random() * choices.length)];
        this.lastAttack = a;
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
        if (this.phase >= 2) xs.push(x + (t.facing >= 0 ? 1 : -1) * this.bombGap);
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
        this.busy = 0.35 + delay * (n - 1) + 0.2;
        for (let i = 0; i < n; i++) {
            this.scheduleOnce(() => {
                const parent = this.boss?.node.parent;
                if (!parent || !this.alive()) return;
                const x = this.left + ((this.right - this.left) * i) / (n - 1);
                // Khung 0–3: nhú lên (cảnh báo); khung 4–19: cột cao, gây đòn; khung 20–23: tắt dần
                AcidHazard.spawn(parent, ACID_PILLAR, x, this.groundY, {
                    scale: 3, fps: 16, fromFrame: 4, toFrame: 19, w: 110, h: 330, alive: this.alive,
                });
                Sound.play('land', 0.5);
            }, 0.35 + delay * i);
        }
    }
}
