import { _decorator, Color, Component, Node, Rect, Sprite, tween, UIOpacity, Vec3 } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { clamp, moveTowards, overlaps } from '../core/Box';
import { Hittable, Hittables } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { PlatformerBody } from '../core/PlatformerBody';
import { Sound } from '../core/Sound';
import { DashFx } from './DashFx';
import { HitSpark } from './HitSpark';
import { CatSkills } from './CatSkills';
import { Controls, PlayerInput } from './PlayerInput';
import { PlayerVisual } from './PlayerVisual';
import { SlashFx } from './SlashFx';
const { ccclass, property, requireComponent } = _decorator;

const GHOST_TINT = new Color(255, 236, 200, 255);
const _self = new Rect();
const _hit = new Rect();
const _other = new Rect();

/**
 * Điều khiển một con mèo (Leo hoặc Angelo): chạy có tăng/giảm tốc, nhảy (coyote time, jump buffer, nhả sớm thì nhảy thấp),
 * đi lên bục một chiều ngay phía trên, xuống khỏi bục.
 * Đánh: bấm liên tục ra combo 3 nhát, nhát thứ 3 mạnh nhất. Giữ nút đánh để lướt chém xuyên qua kẻ địch.
 * Nhảy, chém, lướt đều tốn năng lượng (thanh xanh dưới hàng tim); hết năng lượng thì phải chờ hồi.
 * Phím nào điều khiển con mèo này do GameManager gán (controls), theo lựa chọn 1 người / 2 người.
 */
@ccclass('PlayerController')
@requireComponent(PlatformerBody)
export class PlayerController extends Component {
    @property({ type: PlayerVisual })
    visual: PlayerVisual | null = null;

    @property({ tooltip: 'Tên con mèo: Leo hoặc Angelo' })
    catName = 'Leo';

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

    @property({ group: 'Bị đánh' })
    invincibleTime = 1.2;

    @property({ group: 'Bị đánh' })
    knockbackSpeed = 420;

    @property({ group: 'Tấn công', tooltip: 'Tầm chém phía trước mặt (nhát 3 xa hơn 25%)' })
    attackRange = 170;

    @property({ group: 'Tấn công', tooltip: 'Chiều cao vùng chém' })
    attackHeight = 150;

    @property({ group: 'Tấn công', tooltip: 'Khoảng cách giữa 2 nhát chém (giây)' })
    slashInterval = 0.22;

    @property({ group: 'Tấn công', tooltip: 'Nghỉ thêm sau nhát thứ 3 của combo (giây)' })
    finisherPause = 0.2;

    @property({ group: 'Tấn công', tooltip: 'Bấm tiếp trong khoảng này sau một nhát thì ra nhát kế của combo' })
    comboWindow = 0.35;

    @property({ group: 'Tấn công', tooltip: 'Tốc độ lướt tới khi chém trên mặt đất (lướt trong 0.08 giây)' })
    slashLunge = 420;

    @property({ group: 'Lướt chém (giữ J)', tooltip: 'Giữ J bao lâu (giây) thì lướt' })
    dashHoldTime = 0.25;

    @property({ group: 'Lướt chém (giữ J)', tooltip: 'Lướt xa bao nhiêu' })
    dashDistance = 560;

    @property({ group: 'Lướt chém (giữ J)', tooltip: 'Thời gian lướt (giây), càng nhỏ càng nhanh' })
    dashTime = 0.2;

    @property({ group: 'Lướt chém (giữ J)', tooltip: 'Mỗi kẻ địch bị lướt qua mất bao nhiêu máu' })
    dashDamage = 2;

    @property({ group: 'Đi lên (W)', tooltip: 'Bục một chiều cao hơn chân trong khoảng này thì bấm W là lên được' })
    climbHeight = 420;

    @property({ group: 'Năng lượng' })
    maxEnergy = 100;

    @property({ group: 'Năng lượng', tooltip: 'Hồi bao nhiêu năng lượng mỗi giây' })
    energyRegen = 18;

    @property({ group: 'Năng lượng', tooltip: 'Vừa dùng năng lượng thì chờ bao lâu (giây) mới bắt đầu hồi' })
    regenDelay = 0.6;

    @property({ group: 'Năng lượng', tooltip: 'Tốn mỗi lần nhảy' })
    jumpEnergy = 10;

    @property({ group: 'Năng lượng', tooltip: 'Tốn mỗi nhát chém' })
    slashEnergy = 12;

    @property({ group: 'Năng lượng', tooltip: 'Tốn mỗi lần lướt chém' })
    dashEnergy = 35;

    body!: PlatformerBody;
    facing = 1;
    controlEnabled = true;
    /** Phím đang điều khiển con mèo này (GameManager gán). Mặc định không điều khiển gì. */
    controls: Controls = PlayerInput.none;
    /** Chơi 1 người: con mèo đang đứng chờ (không điều khiển) thì không bị đánh. */
    idle = false;
    /** Hết tim: nằm gục chờ đồng đội kéo dậy. */
    downed = false;
    hp = 3;
    /** Kỹ năng riêng (LeoSkills / AngeloSkills), GameManager gắn khi bắt đầu. */
    skills: CatSkills | null = null;
    /** Còn > 0 thì không tự đổi vận tốc ngang (vừa nhảy bật tường, vừa bị ném). */
    pushLock = 0;
    invincible = 0;
    energy = 100;
    /** Còn > 0 khi vừa bấm mà không đủ năng lượng (thanh năng lượng nháy đỏ). */
    energyWarn = 0;

    private coyote = 0;
    private buffer = 0;
    private jumping = false;
    private wasGrounded = true;
    private hurtLock = 0;
    private attackTimer = 0;
    private attackQueued = 0;
    private comboTimer = 0;
    private comboStep = 0;
    private lunge = 0;
    private slashFx: SlashFx | null = null;
    private dashTimer = 0;
    private dashGrace = 0;
    private holdTime = 0;
    private dashedThisHold = false;
    private regenWait = 0;
    private ghostTimer = 0;
    private dashFx: DashFx | null = null;
    private readonly dashHits = new Set<Hittable>();

    onLoad() {
        this.body = this.getComponent(PlatformerBody)!;
        this.energy = this.maxEnergy;
        PlayerInput.init();
    }

    update(dt: number) {
        if (HitStop.frozen) return;
        const b = this.body;
        const v = b.velocity;
        if (this.hurtLock > 0) this.hurtLock -= dt;
        if (this.invincible > 0) this.invincible -= dt;
        const canControl = this.controlEnabled && this.hurtLock <= 0 && !this.downed;

        // Năng lượng: vừa dùng thì chờ một chút rồi mới hồi
        if (this.energyWarn > 0) this.energyWarn -= dt;
        if (this.regenWait > 0) this.regenWait -= dt;
        else this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen * dt);

        // Đang lướt chém thì bỏ qua chạy/nhảy/chém thường
        if (this.dashGrace > 0) this.dashGrace -= dt;
        if (this.dashTimer > 0) {
            this.updateDash(dt);
            return;
        }

        // Kỹ năng đang tự lo di chuyển (đập bụng, nằm, bị bê, leo dây...)
        if (this.skills && this.skills.control(dt, canControl)) {
            this.wasGrounded = b.grounded;
            return;
        }

        // Chạy
        const dir = canControl ? (this.controls.right ? 1 : 0) - (this.controls.left ? 1 : 0) : 0;
        if (this.lunge > 0) this.lunge -= dt;
        if (this.pushLock > 0) this.pushLock -= dt;
        if (this.hurtLock <= 0 && this.lunge <= 0 && this.pushLock <= 0) {
            const accel = b.grounded ? (dir !== 0 ? this.groundAccel : this.groundDecel) : this.airAccel;
            v.x = moveTowards(v.x, dir * this.moveSpeed, accel * dt);
        }
        if (dir !== 0) this.facing = dir;

        // Bấm xuống khi đang đứng trên bục một chiều (bàn, thùng, ghế...) thì rơi xuyên xuống
        if (this.controls.consumeDown() && canControl && b.grounded && b.groundSolid?.oneWay) {
            b.dropThrough();
            this.coyote = 0;
            Sound.play('drop', 0.6);
        }

        // W / ↑: nhảy vừa đủ cao để lên bục một chiều ngay phía trên (không tốn năng lượng)
        if (this.controls.consumeUp() && canControl && b.grounded) {
            const r = b.getRect(_self);
            const top = PlatformerBody.platformAbove(r, this.climbHeight);
            if (top !== null) {
                v.y = Math.sqrt(2 * b.gravity * (top - r.yMin + 30));
                this.jumping = false;
                this.coyote = this.buffer = 0;
                this.visual?.playJump();
                Sound.play('jump', 0.5);
            }
        }

        // Nhảy
        this.coyote = b.grounded ? this.coyoteTime : this.coyote - dt;
        const pressed = this.controls.consumeJump() && canControl;
        this.buffer = pressed ? this.jumpBuffer : this.buffer - dt;
        if (this.buffer > 0) {
            if (this.controls.down && b.grounded && b.groundSolid?.oneWay) {
                b.dropThrough();
                this.buffer = this.coyote = 0;
            } else if (this.coyote > 0) {
                this.buffer = 0;
                if (this.spend(this.jumpEnergy)) {
                    this.coyote = 0;
                    this.startJump(this.jumpSpeed);
                }
            } else if (this.skills?.airJump()) {
                this.buffer = 0; // nhảy 2 lần / nhảy bật tường
            }
        }
        if (this.jumping && v.y > 0 && !this.controls.jumpHeld) {
            v.y *= this.jumpCutMultiplier;
            this.jumping = false;
        }
        if (v.y <= 0) this.jumping = false;

        // Chém. Bấm sớm một chút trước khi hết nhịp vẫn được tính (cho combo dễ ra)
        if (this.attackTimer > 0) this.attackTimer -= dt;
        if (this.comboTimer > 0) this.comboTimer -= dt;
        this.attackQueued = this.controls.consumeAttack() ? 0.15 : this.attackQueued - dt;
        if (this.attackQueued > 0 && this.attackTimer <= 0 && canControl) {
            this.attackQueued = 0;
            if (this.skills?.attack()) this.attackTimer = this.slashInterval * 1.6;
            else if (this.spend(this.slashEnergy)) this.slash();
        }

        // Giữ J đủ lâu thì lướt chém (mỗi lần giữ chỉ lướt một lần, thả ra rồi giữ lại để lướt tiếp)
        if (this.controls.attackHeld && canControl && (this.skills?.canDash ?? true)) {
            this.holdTime += dt;
            if (!this.dashedThisHold && this.holdTime >= this.dashHoldTime) {
                this.dashedThisHold = true;
                if (this.spend(this.dashEnergy)) this.startDash();
            }
        } else {
            this.holdTime = 0;
            this.dashedThisHold = false;
        }

        b.gravityScale = v.y < 0 ? this.fallGravityMultiplier : 1;
        this.skills?.beforeMove(dt);
        const fallSpeed = -v.y;
        b.move(dt);

        if (b.grounded && !this.wasGrounded) {
            const impact = fallSpeed / b.maxFallSpeed;
            this.visual?.playLand(impact);
            if (impact > 0.3) Sound.play('land', Math.min(1, impact));
        }
        this.wasGrounded = b.grounded;
        this.visual?.sync(b.grounded, v.x / this.moveSpeed, v.y, this.facing, this.invincible > 0);
    }

    /** Bị đánh từ vị trí fromX. Trả về false nếu đang bất tử. */
    hurt(fromX: number): boolean {
        // Đang lướt và một chút sau khi lướt (lỡ dừng ngay chỗ kẻ địch) thì không bị đánh
        if (this.invincible > 0 || this.dashTimer > 0 || this.dashGrace > 0) return false;
        if (this.idle || this.downed) return false;
        this.invincible = this.invincibleTime;
        this.hurtLock = 0.3;
        this.skills?.interrupt();
        const away = this.node.position.x >= fromX ? 1 : -1;
        this.body.velocity.set(away * this.knockbackSpeed, 520);
        this.jumping = false;
        this.visual?.playHurt();
        Sound.play('hurt');
        CameraRig.instance?.shake(10, 0.2);
        return true;
    }

    /** Chém về phía trước: trúng kẻ địch nào trong tầm thì nó mất 1 máu và bị đẩy lùi. */
    private slash() {
        this.comboStep = this.comboTimer > 0 ? (this.comboStep + 1) % 3 : 0;
        const finisher = this.comboStep === 2;
        this.attackTimer = this.slashInterval + (finisher ? this.finisherPause : 0);
        this.comboTimer = this.slashInterval + this.comboWindow;

        const v = this.body.velocity;
        if (this.body.grounded) {
            // Lướt tới một chút (không chậm hơn tốc độ đang chạy)
            v.x = this.facing * Math.max(this.slashLunge * (finisher ? 1.5 : 1), this.facing * v.x);
            this.lunge = 0.08;
        } else if (v.y < 0) {
            v.y *= 0.3; // chém trên không thì khựng lơ lửng một nhịp
        }
        this.visual?.playAttack();
        this.fx().play(this.facing, this.comboStep);
        Sound.play(`slash${this.comboStep + 1}`, 0.7);

        const r = this.body.getRect(_self);
        const cx = r.x + r.width / 2;
        const range = this.attackRange * (finisher ? 1.25 : 1);
        const height = this.attackHeight * (finisher ? 1.2 : 1);
        const back = 30; // trúng cả thứ sát sau lưng một chút
        _hit.set(this.facing > 0 ? cx - back : cx - range, r.y - (height - this.attackHeight) / 2, range + back, height);

        let hits = 0;
        for (const h of Hittables.slice()) {
            if (!h.canBeHit || !overlaps(_hit, h.getHitRect(_other))) continue;
            h.takeHit(this.node.position.x, finisher ? 1.6 : 1);
            hits++;
            // Tia lửa ở chỗ lưỡi chém chạm vào kẻ địch
            const sx = clamp(_other.x + _other.width / 2, _hit.x, _hit.x + _hit.width);
            const sy = clamp(_other.y + _other.height / 2, _hit.y, _hit.y + _hit.height);
            if (this.node.parent) HitSpark.spawn(this.node.parent, sx, sy, this.facing, finisher);
        }
        if (hits > 0) {
            Sound.play('hit', finisher ? 1 : 0.8);
            HitStop.trigger(finisher ? 90 : 55);
            CameraRig.instance?.shake(finisher ? 14 : 7, finisher ? 0.22 : 0.12);
        }
    }

    /** Trừ năng lượng nếu đủ; không đủ thì báo (thanh nháy đỏ) và trả về false. */
    private spend(cost: number): boolean {
        if (this.energy < cost) {
            this.energyWarn = 0.45;
            return false;
        }
        this.energy -= cost;
        this.regenWait = this.regenDelay;
        return true;
    }

    /** Bắt đầu lướt chém về hướng đang quay mặt. */
    private startDash() {
        this.dashTimer = this.dashTime;
        this.dashHits.clear();
        this.ghostTimer = 0;
        this.attackQueued = 0;
        this.jumping = false;
        this.visual?.playAttack();
        Sound.play('dash');
        CameraRig.instance?.shake(5, 0.1);
        const parent = this.node.parent;
        if (parent) {
            const p = this.node.position;
            this.dashFx = DashFx.spawn(parent, p.x, p.y + this.body.size.height * 0.5, this.facing);
        }
    }

    private updateDash(dt: number) {
        const b = this.body;
        b.velocity.set(this.facing * this.dashDistance / this.dashTime, 0);
        b.gravityScale = 0;
        b.move(dt);
        this.dashTimer -= dt;

        // Chém mọi kẻ địch chạm vào trên đường lướt, mỗi con một lần
        const r = b.getRect(_self);
        _hit.set(r.x - 20, r.y - 20, r.width + 40, r.height + 40);
        for (const h of Hittables.slice()) {
            if (this.dashHits.has(h) || !h.canBeHit || !overlaps(_hit, h.getHitRect(_other))) continue;
            this.dashHits.add(h);
            h.takeHit(this.node.position.x - this.facing * 200, 1.4, this.dashDamage);
            const sx = _other.x + _other.width / 2;
            const sy = clamp(_other.y + _other.height / 2, _hit.y, _hit.y + _hit.height);
            if (this.node.parent) HitSpark.spawn(this.node.parent, sx, sy, this.facing, true);
            Sound.play('hit');
            HitStop.trigger(45);
            CameraRig.instance?.shake(10, 0.15);
        }

        // Bóng mờ đuổi theo sau
        this.ghostTimer -= dt;
        if (this.ghostTimer <= 0) {
            this.ghostTimer = 0.035;
            this.spawnGhost();
        }
        const p = this.node.position;
        this.dashFx?.extendTo(p.x);

        // Hết thời gian hoặc đâm vào tường thì dừng, kết thúc bằng một nhát vung rộng
        if (this.dashTimer <= 0 || b.hitLeft || b.hitRight) {
            this.dashTimer = 0;
            this.dashGrace = 0.3;
            b.velocity.set(this.facing * this.moveSpeed * 0.5, 0);
            b.gravityScale = 1;
            this.dashFx?.release();
            this.dashFx = null;
            this.fx().play(this.facing, 2);
            Sound.play('slash3', 0.7);
        }
        this.visual?.sync(b.grounded, this.facing, 0, this.facing, false);
    }

    /** Bóng mờ của mèo tại chỗ đang đứng, mờ dần rồi tự xoá. */
    private spawnGhost() {
        const vis = this.visual?.node;
        const sp = vis?.getComponent(Sprite);
        const parent = this.node.parent;
        if (!vis || !sp || !sp.spriteFrame || !parent) return;
        const g = new Node('Ghost');
        g.layer = this.node.layer;
        parent.addChild(g);
        g.setSiblingIndex(this.node.getSiblingIndex()); // ngay sau lưng mèo
        const p = this.node.position;
        const vp = vis.position;
        g.setPosition(p.x + vp.x, p.y + vp.y, 0);
        g.setScale(vis.scale.x, vis.scale.y, 1);
        g.angle = vis.angle;
        const gs = g.addComponent(Sprite);
        gs.spriteFrame = sp.spriteFrame;
        gs.color = GHOST_TINT;
        const op = g.addComponent(UIOpacity);
        op.opacity = 150;
        tween(op).to(0.22, { opacity: 0 }).call(() => g.destroy()).start();
    }

    private fx(): SlashFx {
        if (!this.slashFx || !this.slashFx.isValid) {
            const n = new Node('Slash');
            n.layer = this.node.layer;
            this.node.addChild(n);
            this.slashFx = n.addComponent(SlashFx);
        }
        return this.slashFx;
    }

    /** Bật nhảy lên với vận tốc speed (nhả nút sớm thì nhảy thấp như nhảy thường). */
    startJump(speed: number, volume = 0.6) {
        this.body.velocity.y = speed;
        this.jumping = true;
        this.visual?.playJump();
        Sound.play('jump', volume);
    }

    /** Trừ năng lượng nếu đủ; không đủ thì báo (thanh nháy đỏ) và trả về false. Kỹ năng dùng chung. */
    useEnergy(cost: number): boolean {
        return this.spend(cost);
    }

    /** Gục xuống (hết tim) hoặc đứng dậy (được kéo dậy). */
    setDowned(on: boolean) {
        this.downed = on;
        if (this.dashTimer > 0) {
            this.dashTimer = 0;
            this.body.gravityScale = 1;
            this.dashFx?.release();
            this.dashFx = null;
        }
        this.body.velocity.x = 0;
        if (on) this.skills?.interrupt();
        this.visual?.setDowned(on);
        if (!on) this.invincible = 1.5;
    }

    respawn(pos: Readonly<Vec3>) {
        this.node.setPosition(pos.x, pos.y, pos.z);
        this.body.velocity.set(0, 0);
        this.invincible = 1;
        this.hurtLock = 0;
    }
}
