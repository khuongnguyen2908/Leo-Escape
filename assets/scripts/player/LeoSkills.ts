import { _decorator, Color, Component, Rect } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { clamp, overlaps } from '../core/Box';
import { Hittables } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { Sound } from '../core/Sound';
import { CatSkills } from './CatSkills';
import { DustPuff } from './DustPuff';
import { HitSpark } from './HitSpark';
import { PlayerController } from './PlayerController';
import { SkillFx } from './SkillFx';
import { YarnRope } from './YarnRope';
const { ccclass, property } = _decorator;

const DUST = new Color(214, 186, 150, 255);
const _hit = new Rect();
const _me = new Rect();
const _zone = new Rect();

/** Con mèo bê / ném được (Angelo). Để ở đây cho LeoSkills khỏi phải import AngeloSkills. */
export interface Carryable {
    readonly canBeCarried: boolean;
    readonly carried: boolean;
    pickUp(): void;
    /** Thả ra với vận tốc (vx, vy); thrown = đang bị ném (cuộn tròn bay, chưa điều khiển được). */
    drop(vx: number, vy: number, thrown: boolean): void;
    /** Bật lên từ bụng Leo: được nhảy thêm lần nữa. */
    bounced?(): void;
}

type State = 'none' | 'pound' | 'lying' | 'climb' | 'burst';

/**
 * Kỹ năng của Leo (mèo mập, nặng):
 *  - Kỹ năng (K) khi đang bay: ĐẬP BỤNG lao thẳng xuống, sóng chấn đẩy văng và làm choáng địch quanh chỗ đáp.
 *    Rơi càng cao thì sóng càng rộng.
 *  - Giữ Lên (W) + Đánh (J) dưới đất: CHÉM HẤT, cơn lốc hất địch trước mặt bay lên; nhảy theo chém tiếp thì địch lơ lửng.
 *  - Giữ Xuống (S) + Kỹ năng (K) trên nền cứng, đầy năng lượng: tuyệt chiêu MÈO NỔ, gồng rồi nổ đánh mọi địch trên màn hình.
 *  - Kỹ năng (K) khi đứng dưới đất: NẰM NGỬA làm đệm; Angelo rơi trúng bụng thì bật cao. Bấm K lần nữa để đứng dậy.
 *  - Tương tác (L) cạnh Angelo: BÊ Angelo lên đầu; bấm L lần nữa để NÉM theo hướng đang quay mặt.
 *  - Giữ Lên (W) cạnh dây len Angelo thả: LEO DÂY; thả phím thì đu lơ lửng, Xuống để tụt, Nhảy để buông.
 * GameManager tự gắn khi bắt đầu chơi; số liệu chỉnh ở đây.
 */
@ccclass('LeoSkills')
export class LeoSkills extends Component implements CatSkills {
    /** Gọi khi Leo đập bụng chạm đất tại (x, y) trong lớp Gameplay (sàn yếu ở bước câu đố sẽ nghe ở đây). */
    static readonly poundListeners: ((x: number, y: number) => void)[] = [];

    @property({ tooltip: 'Tốc độ lao xuống khi đập bụng' })
    poundSpeed = 2200;

    @property({ tooltip: 'Sóng chấn đánh trúng địch trong bán kính này' })
    poundRadius = 280;

    @property({ tooltip: 'Năng lượng tốn mỗi lần đập bụng' })
    poundEnergy = 20;

    @property({ tooltip: 'Rơi từ cao chừng này trở lên thì sóng chấn to nhất' })
    poundFullHeight = 600;

    @property({ tooltip: 'Sóng chấn to nhất gấp bao nhiêu lần lúc rơi thấp' })
    poundMaxBoost = 1.6;

    @property({ tooltip: 'Địch trúng sóng chấn bị choáng đứng yên bao lâu (giây)' })
    poundDaze = 1.5;

    @property({ group: 'Chém hất', tooltip: 'Năng lượng tốn mỗi lần chém hất (W + J)' })
    launchEnergy = 20;

    @property({ group: 'Chém hất', tooltip: 'Địch bị hất bay lên cao chừng này' })
    launchHeight = 350;

    @property({ group: 'Mèo Nổ', tooltip: 'Thời gian gồng trước khi nổ (giây), Leo bất tử trong lúc gồng' })
    burstCharge = 0.6;

    @property({ group: 'Mèo Nổ', tooltip: 'Số máu mỗi kẻ địch trên màn hình bị trừ' })
    burstDamage = 3;

    @property({ group: 'Mèo Nổ', tooltip: 'Địch trúng bị choáng bao lâu (giây)' })
    burstDaze = 1;

    @property({ tooltip: 'Angelo rơi trúng bụng thì bật lên với tốc độ này (nhảy thường là 1250). 2000 ≈ cao 770, gần chạm mép trên màn hình' })
    bounceSpeed = 2000;

    @property({ tooltip: 'Vận tốc ném Angelo (ngang, lên)' })
    throwSpeed = 950;

    @property
    throwLift = 1150;

    @property({ tooltip: 'Năng lượng tốn mỗi lần ném' })
    throwEnergy = 10;

    @property({ tooltip: 'Tốc độ leo dây' })
    climbSpeed = 420;

    private cat!: PlayerController;
    private partner: () => PlayerController | null = () => null;
    private state: State = 'none';
    private carrying: PlayerController | null = null;
    private rope: YarnRope | null = null;
    private poundTime = 0;
    private poundFromY = 0;
    private burstTime = 0;

    onLoad() {
        // Ảnh hiệu ứng kỹ năng của Leo (art/fx): tải trước để lần dùng đầu tiên đã có hình
        for (const p of [DustPuff.SLASH, DustPuff.RING, DustPuff.SPIKE, DustPuff.STUN,
            DustPuff.TORNADO, DustPuff.SWIRL, DustPuff.BURST, DustPuff.SHOCK]) DustPuff.preload(p);
        HitSpark.preload();
    }

    setup(cat: PlayerController, partner: () => PlayerController | null) {
        this.cat = cat;
        this.partner = partner;
    }

    get canDash() { return this.state === 'none' && !this.carrying; }
    get staying() { return this.state === 'lying'; }
    get busy() { return this.state === 'climb'; }

    control(dt: number, canControl: boolean): boolean {
        const c = this.cat, b = c.body, ctl = c.controls;
        if (this.state === 'climb') return this.updateClimb(dt, canControl);
        if (this.state === 'pound') return this.updatePound(dt);
        if (this.state === 'burst') return this.updateBurst(dt);
        if (this.state === 'lying') {
            if (canControl && ctl.consumeSkill()) {
                this.setLying(false);
                return false;
            }
            b.velocity.x = 0;
            b.gravityScale = 1;
            b.move(dt);
            this.checkBounce();
            c.visual?.sync(b.grounded, 0, b.velocity.y, c.facing, c.invincible > 0);
            return true;
        }
        if (!canControl) return false;

        // Nắm dây len Angelo thả xuống
        if (ctl.upHeld && !this.carrying) {
            const p = c.node.position;
            const rope = YarnRope.all.find((r) => r.reachable(p.x, p.y));
            if (rope) {
                ctl.consumeUp();
                this.startClimb(rope);
                return true;
            }
        }
        if (ctl.consumeSkill() && !this.carrying) {
            if (!b.grounded) {
                if (c.useEnergy(this.poundEnergy)) {
                    this.startPound();
                    return true;
                }
            } else if (ctl.down) {
                // Giữ Xuống + K: tuyệt chiêu (trên bục một chiều thì bấm Xuống đã rơi xuyên xuống rồi)
                if (!b.groundSolid?.oneWay && this.startBurst()) return true;
            } else {
                this.setLying(true);
                return true;
            }
        }
        if (ctl.consumeInteract()) {
            if (this.carrying) this.throwPartner();
            else this.tryPickUp();
        }
        return false;
    }

    attack(): boolean {
        // Đang bê hoặc đang nằm thì không chém
        if (this.carrying || this.state !== 'none') return true;
        if (this.cat.controls.upHeld && this.cat.body.grounded) {
            this.launcher();
            return true;
        }
        return false;
    }

    airJump(): boolean {
        return false;
    }

    beforeMove(_dt: number) {}

    interrupt() {
        if (this.carrying) this.dropPartner(0, 300, false);
        if (this.state === 'lying') this.setLying(false);
        if (this.state === 'climb') this.endClimb();
        if (this.state === 'pound') {
            this.state = 'none';
            this.cat.body.gravityScale = 1;
        }
        if (this.state === 'burst') this.state = 'none';
    }

    lateUpdate() {
        // Angelo đang được bê: đặt trên đầu Leo
        const p = this.carrying;
        if (!p) return;
        const carry = p.skills as unknown as Carryable | null;
        if (!p.isValid || p.downed || !carry?.carried) {
            this.carrying = null;
            return;
        }
        const lp = this.cat.node.position;
        p.node.setPosition(lp.x, lp.y + this.cat.body.size.height + 10, 0);
        p.body.velocity.set(0, 0);
        p.facing = this.cat.facing;
    }

    // ---------- Chém hất ----------

    /** W + J dưới đất: vung vệt chém hất lên, cơn lốc trước mặt hất địch bay lên. */
    private launcher() {
        const c = this.cat, b = c.body, f = c.facing;
        if (!c.useEnergy(this.launchEnergy)) return;
        c.visual?.playAttack();
        Sound.play('slash3', 0.8);
        const parent = c.node.parent;
        const p = c.node.position;
        DustPuff.spawn(DustPuff.SLASH, c.node, f * 80, 95, { dir: f, scale: 4.9, fps: 24, center: true });
        if (parent) DustPuff.spawn(DustPuff.TORNADO, parent, p.x + f * 110, p.y, { dir: f, scale: 3.2, fps: 16, loopFor: 0.5 });

        // Vùng đánh trước mặt, cao hơn nhát chém thường
        const r = b.getRect(_me);
        const cx = r.x + r.width / 2;
        const range = c.attackRange * 1.25;
        const height = c.attackHeight * 1.6;
        _zone.set(f > 0 ? cx - 30 : cx - range, r.y, range + 30, height);
        let hits = 0;
        for (const h of Hittables.slice()) {
            if (!h.canBeHit || !overlaps(_zone, h.getHitRect(_hit))) continue;
            h.takeHit(p.x, 0.3, 1);
            h.launch?.(this.launchHeight);
            hits++;
            if (parent) {
                const sx = clamp(_hit.x + _hit.width / 2, _zone.x, _zone.x + _zone.width);
                HitSpark.spawn(parent, sx, _hit.y + _hit.height / 2, f, false);
            }
        }
        if (hits > 0) {
            Sound.play('hit', 0.9);
            HitStop.trigger(70);
            CameraRig.instance?.shake(10, 0.15);
        }
    }

    // ---------- Tuyệt chiêu Mèo Nổ ----------

    /** S + K trên nền cứng: cần đầy năng lượng (không đủ thì thanh nháy đỏ). */
    private startBurst(): boolean {
        const c = this.cat;
        if (c.energy < c.maxEnergy - 0.5) {
            c.useEnergy(c.maxEnergy); // chỉ để thanh năng lượng nháy đỏ báo chưa đầy
            return false;
        }
        c.useEnergy(c.energy);
        this.state = 'burst';
        this.burstTime = 0;
        c.invincible = Math.max(c.invincible, this.burstCharge + 0.4);
        c.body.velocity.set(0, 0);
        c.visual?.playAttack();
        Sound.play('dash', 1);
        DustPuff.spawn(DustPuff.SWIRL, c.node, 0, 90, { scale: 4.5, fps: 14, center: true, loopFor: this.burstCharge });
        return true;
    }

    private updateBurst(dt: number): boolean {
        const c = this.cat, b = c.body;
        this.burstTime += dt;
        b.velocity.x = 0;
        b.gravityScale = 1;
        b.move(dt);
        // Gồng: rung nhẹ rồi mạnh dần
        CameraRig.instance?.shake(3 + 9 * Math.min(1, this.burstTime / this.burstCharge), 0.08);
        c.visual?.sync(b.grounded, 0, b.velocity.y, c.facing, false);
        if (this.burstTime >= this.burstCharge) {
            this.state = 'none';
            this.burstExplode();
        }
        return true;
    }

    /** Nổ: mọi kẻ địch đang thấy trên màn hình mất máu, văng ra và choáng. */
    private burstExplode() {
        const c = this.cat;
        const p = c.node.position;
        const parent = c.node.parent;
        if (parent) {
            DustPuff.spawn(DustPuff.BURST, parent, p.x, p.y + 100, { scale: 9, fps: 14, center: true });
            DustPuff.spawn(DustPuff.SHOCK, parent, p.x, p.y + 100, { scale: 12, fps: 12, center: true });
        }
        const cam = CameraRig.instance;
        for (const h of Hittables.slice()) {
            if (!h.canBeHit) continue;
            const e = h.getHitRect(_hit);
            const ex = e.x + e.width / 2;
            if (cam ? !cam.inViewX(ex) : Math.abs(ex - p.x) > 960) continue;
            if (Math.abs(e.y - p.y) > 900) continue;
            h.takeHit(p.x, 2, this.burstDamage);
            h.daze?.(this.burstDaze);
            if (parent) HitSpark.spawn(parent, ex, e.y + e.height / 2, ex >= p.x ? 1 : -1, true);
        }
        c.visual?.playLand(1);
        cam?.shake(24, 0.4);
        HitStop.trigger(120);
        Sound.play('land', 1);
        Sound.play('hit', 1);
    }

    // ---------- Đập bụng ----------

    private startPound() {
        this.state = 'pound';
        this.poundTime = 0;
        this.poundFromY = this.cat.node.position.y;
        this.cat.visual?.playAttack();
        Sound.play('dash', 0.8);
    }

    private updatePound(dt: number): boolean {
        const c = this.cat, b = c.body;
        this.poundTime += dt;
        b.velocity.set(0, -this.poundSpeed);
        b.gravityScale = 0;
        b.move(dt);
        c.visual?.sync(false, 0, -this.poundSpeed, c.facing, c.invincible > 0);
        if (b.grounded) this.poundImpact();
        else if (this.poundTime > 2) this.state = 'none'; // rơi mãi không chạm đất (xuống vực)
        return true;
    }

    private poundImpact() {
        const c = this.cat, b = c.body;
        this.state = 'none';
        b.gravityScale = 1;
        b.velocity.set(0, 0);
        const p = c.node.position;
        // Rơi càng cao sóng càng rộng: 1 → poundMaxBoost
        const height = Math.max(0, this.poundFromY - p.y);
        const boost = 1 + (this.poundMaxBoost - 1) * Math.min(1, height / this.poundFullHeight);
        const radius = this.poundRadius * boost;
        for (const h of Hittables.slice()) {
            if (!h.canBeHit) continue;
            const e = h.getHitRect(_hit);
            const ex = e.x + e.width / 2;
            if (Math.abs(ex - p.x) - e.width / 2 < radius && Math.abs(e.y - p.y) < 180) {
                h.takeHit(p.x, 1.6, 1);
                h.daze?.(this.poundDaze);
            }
        }
        const parent = c.node.parent;
        if (parent) {
            if (DustPuff.ready(DustPuff.RING)) {
                // Vòng sóng gai ở giữa (ảnh rộng ~57 điểm ảnh ở khung cuối) và gai đất trồi hai bên
                DustPuff.spawn(DustPuff.RING, parent, p.x, p.y + 50, { scale: radius * 1.1 / 57, fps: 16, center: true });
                for (const side of [-1, 1]) {
                    DustPuff.spawn(DustPuff.SPIKE, parent, p.x + side * radius * 0.5, p.y, { dir: side, scale: 3 * boost, fps: 12 });
                }
            } else {
                SkillFx.ring(parent, p.x, p.y, radius, DUST, 0.4, 12);
            }
        }
        c.visual?.playLand(1);
        CameraRig.instance?.shake(16, 0.25);
        HitStop.trigger(60);
        Sound.play('land', 1);
        Sound.play('hit', 0.8);
        for (const l of LeoSkills.poundListeners) l(p.x, p.y);
    }

    // ---------- Nằm làm đệm ----------

    private setLying(on: boolean) {
        this.state = on ? 'lying' : 'none';
        this.cat.body.velocity.x = 0;
        this.cat.visual?.setLying(on);
        Sound.play(on ? 'land' : 'jump', 0.5);
    }

    /** Angelo đang rơi trúng bụng thì bật lên cao. */
    private checkBounce() {
        const o = this.partner();
        if (!o || o.downed || !this.cat.body.grounded) return;
        const op = o.node.position, lp = this.cat.node.position;
        if (o.body.velocity.y < -50 && Math.abs(op.x - lp.x) < 110 && op.y > lp.y + 20 && op.y < lp.y + 130) {
            o.body.velocity.y = this.bounceSpeed;
            o.visual?.playJump();
            (o.skills as unknown as Carryable | null)?.bounced?.();
            this.cat.visual?.playLand(1);
            const parent = this.cat.node.parent;
            if (parent) SkillFx.ring(parent, lp.x, lp.y + 60, 120, new Color(255, 236, 200, 255), 0.25, 0);
            Sound.play('jump', 1);
        }
    }

    // ---------- Bê và ném ----------

    private tryPickUp() {
        const o = this.partner();
        if (!o || o.downed) return;
        const carry = o.skills as unknown as Carryable | null;
        if (!carry || !carry.canBeCarried) return;
        const op = o.node.position, lp = this.cat.node.position;
        if (Math.abs(op.x - lp.x) > 140 || Math.abs(op.y - lp.y) > 120) return;
        carry.pickUp();
        this.carrying = o;
        this.cat.visual?.playLand(0.5);
        Sound.play('checkpoint', 0.4);
    }

    private throwPartner() {
        if (!this.cat.useEnergy(this.throwEnergy)) return;
        this.dropPartner(this.cat.facing * this.throwSpeed, this.throwLift, true);
        this.cat.visual?.playAttack();
        Sound.play('dash', 0.7);
    }

    private dropPartner(vx: number, vy: number, thrown: boolean) {
        const p = this.carrying;
        this.carrying = null;
        (p?.skills as unknown as Carryable | null)?.drop(vx, vy, thrown);
    }

    // ---------- Leo dây ----------

    private startClimb(rope: YarnRope) {
        this.state = 'climb';
        this.rope = rope;
        this.cat.body.velocity.set(0, 0);
        const p = this.cat.node.position;
        this.cat.node.setPosition(rope.x, p.y, 0);
    }

    private updateClimb(dt: number, canControl: boolean): boolean {
        const c = this.cat, r = this.rope, ctl = c.controls;
        if (!r || !r.isValid) {
            this.endClimb();
            return false;
        }
        if (canControl && ctl.consumeJump()) {
            this.endClimb();
            c.startJump(c.jumpSpeed * 0.6, 0.4);
            return false;
        }
        let vy = 0;
        if (canControl && ctl.upHeld) vy = this.climbSpeed;
        else if (canControl && ctl.down) vy = -this.climbSpeed;
        const p = c.node.position;
        const y = Math.max(r.bottomY, p.y + vy * dt);
        c.node.setPosition(r.x, y, 0);
        c.body.velocity.set(0, 0);
        if (y >= r.topY - c.body.size.height * 0.35) {
            // Tới đỉnh: bước lên mép bục
            c.node.setPosition(r.x + r.ledgeSide * 90, r.topY + 4, 0);
            c.facing = r.ledgeSide;
            this.endClimb();
            c.visual?.playLand(0.5);
            return true;
        }
        c.visual?.sync(true, vy !== 0 ? 0.3 : 0, 0, c.facing, c.invincible > 0);
        return true;
    }

    private endClimb() {
        this.state = 'none';
        this.rope = null;
        this.cat.body.velocity.set(0, 0);
    }
}
