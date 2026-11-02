import { _decorator, Color, Component, Graphics, Node, Rect, Tween, tween, UIOpacity, Vec3 } from 'cc';
import { moveTowards, overlaps } from '../core/Box';
import { Hittables } from '../core/Hittable';
import { PlatformerBody } from '../core/PlatformerBody';
import { PlayerInput } from './PlayerInput';
import { PlayerVisual } from './PlayerVisual';
const { ccclass, property, requireComponent } = _decorator;

const CLAW = new Color(255, 245, 225, 255);
const _self = new Rect();
const _hit = new Rect();
const _other = new Rect();

/**
 * Điều khiển mèo: chạy có tăng/giảm tốc, nhảy với coyote time, jump buffer,
 * nhả nút sớm thì nhảy thấp, rơi nhanh hơn lúc lên. Giữ ↓ + nhảy để xuống bục một chiều.
 * J / X (hoặc nút tấn công) để vả móng, tốn năng lượng, năng lượng tự hồi.
 */
@ccclass('PlayerController')
@requireComponent(PlatformerBody)
export class PlayerController extends Component {
    @property({ type: PlayerVisual })
    visual: PlayerVisual | null = null;

    @property({ group: 'Chạy' })
    moveSpeed = 520;

    @property({ group: 'Chạy', tooltip: 'Gia tốc khi bấm hướng trên mặt đất' })
    groundAccel = 4200;

    @property({ group: 'Chạy', tooltip: 'Giảm tốc khi thả phím trên mặt đất' })
    groundDecel = 5200;

    @property({ group: 'Chạy', tooltip: 'Gia tốc khi đang bay' })
    airAccel = 2800;

    @property({ group: 'Nhảy' })
    jumpSpeed = 1250;

    @property({ group: 'Nhảy', tooltip: 'Vẫn nhảy được trong khoảng này (giây) sau khi rời mép' })
    coyoteTime = 0.1;

    @property({ group: 'Nhảy', tooltip: 'Bấm nhảy sớm trong khoảng này (giây) trước khi chạm đất vẫn được tính' })
    jumpBuffer = 0.12;

    @property({ group: 'Nhảy', tooltip: 'Nhả nút khi đang bay lên thì vận tốc nhân với số này' })
    jumpCutMultiplier = 0.45;

    @property({ group: 'Nhảy', tooltip: 'Trọng lực nhân thêm khi đang rơi' })
    fallGravityMultiplier = 1.6;

    @property({ group: 'Nhảy', tooltip: 'Độ nảy sau khi đạp đầu kẻ địch' })
    stompBounce = 900;

    @property({ group: 'Bị đánh' })
    invincibleTime = 1.2;

    @property({ group: 'Bị đánh' })
    knockbackSpeed = 420;

    @property({ group: 'Tấn công', tooltip: 'Tầm vả móng phía trước mặt' })
    attackRange = 170;

    @property({ group: 'Tấn công', tooltip: 'Chiều cao vùng vả' })
    attackHeight = 150;

    @property({ group: 'Tấn công', tooltip: 'Thời gian chờ giữa 2 lần vả (giây)' })
    attackCooldown = 0.35;

    @property({ group: 'Tấn công', tooltip: 'Năng lượng tốn cho mỗi lần vả' })
    attackCost = 20;

    @property({ group: 'Năng lượng' })
    maxEnergy = 100;

    @property({ group: 'Năng lượng', tooltip: 'Hồi bao nhiêu năng lượng mỗi giây' })
    energyRegen = 18;

    body!: PlatformerBody;
    facing = 1;
    controlEnabled = true;
    invincible = 0;
    energy = 100;

    private coyote = 0;
    private buffer = 0;
    private jumping = false;
    private wasGrounded = true;
    private hurtLock = 0;
    private attackTimer = 0;
    private swipe: Graphics | null = null;
    private swipeFade: UIOpacity | null = null;

    onLoad() {
        this.body = this.getComponent(PlatformerBody)!;
        this.energy = this.maxEnergy;
        PlayerInput.init();
    }

    update(dt: number) {
        const b = this.body;
        const v = b.velocity;
        if (this.hurtLock > 0) this.hurtLock -= dt;
        if (this.invincible > 0) this.invincible -= dt;
        const canControl = this.controlEnabled && this.hurtLock <= 0;

        // Chạy
        const dir = canControl ? (PlayerInput.right ? 1 : 0) - (PlayerInput.left ? 1 : 0) : 0;
        if (this.hurtLock <= 0) {
            const accel = b.grounded ? (dir !== 0 ? this.groundAccel : this.groundDecel) : this.airAccel;
            v.x = moveTowards(v.x, dir * this.moveSpeed, accel * dt);
        }
        if (dir !== 0) this.facing = dir;

        // Nhảy
        this.coyote = b.grounded ? this.coyoteTime : this.coyote - dt;
        const pressed = PlayerInput.consumeJump() && canControl;
        this.buffer = pressed ? this.jumpBuffer : this.buffer - dt;
        if (this.buffer > 0) {
            if (PlayerInput.down && b.grounded && b.groundSolid?.oneWay) {
                b.dropThrough();
                this.buffer = this.coyote = 0;
            } else if (this.coyote > 0) {
                v.y = this.jumpSpeed;
                this.buffer = this.coyote = 0;
                this.jumping = true;
                this.visual?.playJump();
            }
        }
        if (this.jumping && v.y > 0 && !PlayerInput.jumpHeld) {
            v.y *= this.jumpCutMultiplier;
            this.jumping = false;
        }
        if (v.y <= 0) this.jumping = false;

        // Vả móng + năng lượng
        this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen * dt);
        if (this.attackTimer > 0) this.attackTimer -= dt;
        if (PlayerInput.consumeAttack() && canControl) this.attack();

        b.gravityScale = v.y < 0 ? this.fallGravityMultiplier : 1;
        const fallSpeed = -v.y;
        b.move(dt);

        if (b.grounded && !this.wasGrounded) this.visual?.playLand(fallSpeed / b.maxFallSpeed);
        this.wasGrounded = b.grounded;
        this.visual?.sync(b.grounded, v.x / this.moveSpeed, v.y, this.facing, this.invincible > 0);
    }

    /** Bị đánh từ vị trí fromX. Trả về false nếu đang bất tử. */
    hurt(fromX: number): boolean {
        if (this.invincible > 0) return false;
        this.invincible = this.invincibleTime;
        this.hurtLock = 0.3;
        const away = this.node.position.x >= fromX ? 1 : -1;
        this.body.velocity.set(away * this.knockbackSpeed, 520);
        this.jumping = false;
        this.visual?.playHurt();
        return true;
    }

    /** Nảy lên sau khi đạp đầu kẻ địch; giữ nút nhảy thì nảy cao hơn. */
    bounce() {
        const held = PlayerInput.jumpHeld;
        this.body.velocity.y = held ? this.jumpSpeed : this.stompBounce;
        this.jumping = held;
        this.visual?.playJump();
    }

    /** Vả móng về phía trước: trúng kẻ địch nào trong tầm thì nó mất 1 máu. */
    private attack() {
        if (this.attackTimer > 0 || this.energy < this.attackCost) return;
        this.energy -= this.attackCost;
        this.attackTimer = this.attackCooldown;
        this.visual?.playAttack();
        this.showSwipe();

        const r = this.body.getRect(_self);
        const cx = r.x + r.width / 2;
        _hit.set(this.facing > 0 ? cx : cx - this.attackRange, r.y, this.attackRange, this.attackHeight);
        for (const h of Hittables.slice()) {
            if (h.canBeHit && overlaps(_hit, h.getHitRect(_other))) h.takeHit(this.node.position.x);
        }
    }

    /** Hiệu ứng tạm: 3 vệt cào màu kem phía trước mặt, mờ dần. */
    private showSwipe() {
        if (!this.swipe) {
            const n = new Node('Swipe');
            n.layer = this.node.layer;
            this.node.addChild(n);
            this.swipe = n.addComponent(Graphics);
            this.swipeFade = n.addComponent(UIOpacity);
        }
        const g = this.swipe;
        const f = this.facing;
        g.clear();
        g.lineWidth = 9;
        g.strokeColor = CLAW;
        for (let i = -1; i <= 1; i++) {
            const cx = f * 40, cy = 80 + i * 26, rad = 85;
            const a0 = f > 0 ? -0.75 : Math.PI - 0.75;
            const a1 = a0 + 1.5;
            g.moveTo(cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad);
            g.arc(cx, cy, rad, a0, a1, true);
            g.stroke();
        }
        const fade = this.swipeFade!;
        Tween.stopAllByTarget(fade);
        fade.opacity = 255;
        tween(fade).to(0.2, { opacity: 0 }).start();
    }

    respawn(pos: Readonly<Vec3>) {
        this.node.setPosition(pos.x, pos.y, pos.z);
        this.body.velocity.set(0, 0);
        this.invincible = 1;
        this.hurtLock = 0;
    }
}
