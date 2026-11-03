import { _decorator, Color, Component, Rect } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { Hittables } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { Sound } from '../core/Sound';
import { CatSkills } from './CatSkills';
import { PlayerController } from './PlayerController';
import { SkillFx } from './SkillFx';
import { YarnRope } from './YarnRope';
const { ccclass, property } = _decorator;

const DUST = new Color(214, 186, 150, 255);
const _hit = new Rect();

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

type State = 'none' | 'pound' | 'lying' | 'climb';

/**
 * Kỹ năng của Leo (mèo mập, nặng):
 *  - Kỹ năng (K) khi đang bay: ĐẬP BỤNG lao thẳng xuống, sóng chấn đẩy văng địch quanh chỗ đáp.
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
        return !!this.carrying || this.state !== 'none';
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

    // ---------- Đập bụng ----------

    private startPound() {
        this.state = 'pound';
        this.poundTime = 0;
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
        for (const h of Hittables.slice()) {
            if (!h.canBeHit) continue;
            const e = h.getHitRect(_hit);
            const ex = e.x + e.width / 2;
            if (Math.abs(ex - p.x) - e.width / 2 < this.poundRadius && Math.abs(e.y - p.y) < 180) h.takeHit(p.x, 1.6, 1);
        }
        const parent = c.node.parent;
        if (parent) SkillFx.ring(parent, p.x, p.y, this.poundRadius, DUST, 0.4, 12);
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
