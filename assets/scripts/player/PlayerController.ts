import { _decorator, Color, Component, Node, Rect, Size, Sprite, tween, UIOpacity, Vec2, Vec3 } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { clamp, moveTowards, overlaps } from '../core/Box';
import { Hittable, Hittables } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { PlatformerBody } from '../core/PlatformerBody';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { DashFx } from './DashFx';
import { DustPuff } from './DustPuff';
import { HitSpark } from './HitSpark';
import { CatSkills } from './CatSkills';
import { Controls, PlayerInput } from './PlayerInput';
import { PlayerVisual } from './PlayerVisual';
import { preloadSlashImages, SlashFx } from './SlashFx';
import { SkillFx } from './SkillFx';
import { ChargeFx } from './ChargeFx';
import { SwordWave } from './SwordWave';
const { ccclass, property, requireComponent } = _decorator;

const GHOST_TINT = new Color(255, 236, 200, 255);
const CHARGE_TINT = new Color(120, 220, 255, 255);
/** Giữ J quá chừng này giây mới hiện hiệu ứng gồng (bấm chém nhanh thì không hiện) */
const CHARGE_SHOW = 0.15;
/** Hào quang dưới chân khi đang giữ J (folder art/fx/Hold), lặp tới khi buông */
const HOLD_FX = 'Hold/frame';
/**
 * Theo nhịp combo 5 nhát: [tầm chém so với Attack Range, độ cao so với Attack Height, sức đẩy lùi, máu trừ, dừng hình (ms), rung].
 * Tầm chém khớp với vệt chém đã phóng to trong SlashFx (Attack Range 170: vệt nhát 1–2 tới ~210, nhát 3 ~260, nhát 5 ~350).
 */
const COMBO: [number, number, number, number, number, number][] = [
    [1.2, 1, 1, 1, 55, 7],
    [1.2, 1, 1, 1, 55, 7],
    [1.5, 1.1, 1.3, 1, 70, 9],
    [0.95, 1.2, 1.3, 1, 70, 10],    // nhát 4: chém xoay, tầm này tính cho cả hai bên
    [2, 1.3, 2.2, 2, 110, 18],      // nhát 5: kết liễu
];
const SPIN_STEP = 3;
/** Bụi nâu tung sau gót khi lướt trên mặt đất */
const DASH_DUST = 'FX_run_';
const _self = new Rect();
const _hit = new Rect();
const _other = new Rect();

/**
 * Điều khiển một con mèo (Leo hoặc Angelo): chạy có tăng/giảm tốc, nhảy (coyote time, jump buffer, nhả sớm thì nhảy thấp),
 * đi lên bục một chiều ngay phía trên, xuống khỏi bục.
 * Đánh: bấm liên tục ra combo 5 nhát (nhát 4 chém xoay trúng cả sau lưng, nhát 5 kết liễu). Đang bay thì combo 3 nhát đầu.
 * Giữ nút đánh đủ Charge Time rồi thả: phóng sóng kiếm.
 * Lướt chém (kiểu Mega Man X): bấm đúp trái/phải (điện thoại: đẩy đúp joystick). Không còn phím Lướt riêng.
 * Đang lướt trên mặt đất mà bấm Nhảy: nhảy giữ đà lướt (bay nhanh hơn chạy) tới khi chạm đất.
 * Chạy, nhảy, chém thường miễn phí; chỉ kỹ năng (lướt, sóng kiếm, chém hất, quét chân, đập bụng, Mèo Nổ) tốn năng lượng.
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

    @property({ group: 'Tấn công', tooltip: 'Nghỉ thêm sau nhát cuối của combo (giây)' })
    finisherPause = 0.2;

    @property({ group: 'Tấn công', tooltip: 'Combo dài mấy nhát (1–5). Nhát 4 chém xoay, nhát 5 kết liễu' })
    comboLength = 5;

    @property({ group: 'Tấn công', tooltip: 'Bấm tiếp trong khoảng này sau một nhát thì ra nhát kế của combo' })
    comboWindow = 0.35;

    @property({ group: 'Tấn công', tooltip: 'Chém trúng khi đang bay thì nảy nhẹ lên với tốc độ này, để chém liên tục trên không (combo với địch bị hất)' })
    airHitLift = 300;

    @property({ group: 'Tấn công', tooltip: 'Chém trên mặt đất thì đứng yên chừng này giây mỗi nhát (giữ A/D cũng không đi). 0 = vừa chém vừa đi được' })
    slashStill = 0.22;

    @property({ group: 'Lướt chém', tooltip: 'Bấm đúp trái/phải trong khoảng này (giây) thì lướt. 0 = tắt bấm đúp' })
    doubleTapTime = 0.25;

    @property({ group: 'Lướt chém', tooltip: 'Nhảy khi đang lướt: bay ngang nhanh gấp bao nhiêu lần tốc độ chạy (tới khi chạm đất)' })
    dashJumpSpeed = 1.7;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Giữ J bao lâu (giây) thì gồng xong, thả ra phóng sóng kiếm' })
    chargeTime = 0.8;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Năng lượng tốn mỗi lần phóng' })
    waveEnergy = 30;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Bay xa bao nhiêu' })
    waveDistance = 1000;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Tốc độ bay' })
    waveSpeed = 1300;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Mỗi kẻ địch trúng mất bao nhiêu máu' })
    waveDamage = 2;

    @property({ group: 'Lướt chém', tooltip: 'Lướt xa bao nhiêu' })
    dashDistance = 560;

    @property({ group: 'Lướt chém', tooltip: 'Thời gian lướt (giây), càng nhỏ càng nhanh' })
    dashTime = 0.2;

    @property({ group: 'Lướt chém', tooltip: 'Mỗi kẻ địch bị lướt qua mất bao nhiêu máu' })
    dashDamage = 2;

    @property({ group: 'Đi lên (W)', tooltip: 'Bục một chiều cao hơn chân trong khoảng này thì bấm W là lên được' })
    climbHeight = 420;

    @property({ group: 'Ngồi, xuống bục', tooltip: 'Ngồi (giữ Xuống trên mặt đất): thân va chạm còn bao nhiêu phần chiều cao' })
    duckHeight = 0.6;

    @property({ group: 'Ngồi, xuống bục', tooltip: 'Bấm Xuống 2 lần trong khoảng này (giây) khi đứng trên bục một chiều thì rơi xuyên xuống' })
    downTapTime = 0.3;

    @property({ group: 'Năng lượng' })
    maxEnergy = 100;

    @property({ group: 'Năng lượng', tooltip: 'Hồi bao nhiêu năng lượng mỗi giây' })
    energyRegen = 18;

    @property({ group: 'Năng lượng', tooltip: 'Vừa dùng năng lượng thì chờ bao lâu (giây) mới bắt đầu hồi' })
    regenDelay = 0.6;

    @property({ group: 'Năng lượng', tooltip: 'Tốn mỗi lần nhảy 2 lần của Angelo (Leo nhảy miễn phí)' })
    jumpEnergy = 10;

    @property({ group: 'Năng lượng', tooltip: 'Tốn mỗi lần Angelo quất dây (Leo chém thường miễn phí)' })
    slashEnergy = 12;

    @property({ group: 'Năng lượng', tooltip: 'Tốn mỗi lần lướt chém' })
    dashEnergy = 35;

    body!: PlatformerBody;
    facing = 1;
    controlEnabled = true;
    /** Khi bị khoá điều khiển: tự chạy theo hướng này (1 phải, -1 trái, 0 đứng). Dùng lúc về đích. */
    autoMove = 0;
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
    /** Đang ngồi thụp (giữ Xuống trên mặt đất) */
    ducking = false;
    private standHeight = 0;
    private downTapAge = 99;
    private dashGrace = 0;
    private holdTime = 0;
    /** Hiệu ứng gồng sóng kiếm ở giữa thân mèo (ảnh FX_charge_) */
    private chargeFx: ChargeFx | null = null;
    private holdFx: DustPuff | null = null;
    private chargeFxTried = false;
    private charged = false;
    private prevDir = 0;
    private lastTapDir = 0;
    private lastTapAge = 99;
    private dashFromGround = false;
    private dashDustTimer = 0;
    private dashJump = false;
    private regenWait = 0;
    private ghostTimer = 0;
    private dashFx: DashFx | null = null;
    private readonly dashHits = new Set<Hittable>();

    onLoad() {
        this.body = this.getComponent(PlatformerBody)!;
        this.energy = this.maxEnergy;
        PlayerInput.init();
        preloadSlashImages();
        SwordWave.preload();
        DashFx.preload();
        ChargeFx.preload();
        DustPuff.preload(HOLD_FX);
        DustPuff.preload(DASH_DUST);
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
        const dir = canControl
            ? (this.controls.right ? 1 : 0) - (this.controls.left ? 1 : 0)
            : (this.downed || this.hurtLock > 0 ? 0 : this.autoMove);
        if (this.lunge > 0) this.lunge -= dt;
        if (this.pushLock > 0) this.pushLock -= dt;
        if (b.grounded) this.dashJump = false;
        // Ngồi thụp: giữ Xuống trên mặt đất (không đang lướt). Trên đầu vướng thì chưa đứng dậy được
        const wantDuck = canControl && b.grounded && this.controls.down && this.dashTimer <= 0;
        this.setDucking(wantDuck || (this.ducking && !this.roomToStand()));
        const moveDir = this.ducking ? 0 : dir;
        if (this.hurtLock <= 0 && this.lunge <= 0 && this.pushLock <= 0) {
            const accel = b.grounded ? (moveDir !== 0 ? this.groundAccel : this.groundDecel) : this.airAccel;
            // Nhảy từ lúc đang lướt: bay ngang nhanh hơn chạy (giữ hướng thì giữ đà)
            const speed = this.dashJump ? this.moveSpeed * this.dashJumpSpeed : this.moveSpeed;
            v.x = moveTowards(v.x, moveDir * speed, accel * dt);
        }
        if (dir !== 0) this.facing = dir;

        // Bấm đúp trái/phải: lướt chém
        this.lastTapAge += dt;
        if (dir !== 0 && dir !== this.prevDir) {
            if (this.doubleTapTime > 0 && dir === this.lastTapDir && this.lastTapAge <= this.doubleTapTime) {
                this.lastTapDir = 0;
                this.tryDash();
            } else {
                this.lastTapDir = dir;
                this.lastTapAge = 0;
            }
        }
        this.prevDir = dir;

        // Bấm Xuống 2 lần nhanh khi đang đứng trên bục một chiều (bàn, thùng, ghế...) thì rơi xuyên xuống
        // (giữ Xuống một lần là ngồi)
        this.downTapAge += dt;
        if (this.controls.consumeDown() && canControl) {
            if (this.downTapAge <= this.downTapTime && b.grounded && b.groundSolid?.oneWay) {
                b.dropThrough();
                this.coyote = 0;
                this.downTapAge = 99;
                Sound.play('drop', 0.6);
            } else {
                this.downTapAge = 0;
            }
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
            if (this.coyote > 0) {
                this.buffer = 0;
                this.coyote = 0;
                this.startJump(this.jumpSpeed);
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
            else this.slash();
        }

        // Giữ J đủ Charge Time rồi thả: phóng sóng kiếm (thả sớm hơn thì thôi)
        const canHold = canControl && (this.skills?.canDash ?? true);
        if (this.controls.attackHeld && canHold) {
            this.holdTime += dt;
            // Hiệu ứng gồng ở giữa thân: khung 1 → 4 lớn dần theo thời gian giữ
            if (this.holdTime >= CHARGE_SHOW && !this.chargeFxTried) {
                this.chargeFxTried = true;
                this.chargeFx = ChargeFx.attach(this.node, b.size.height * 0.5);
                // Hào quang Hold dưới chân, nằm sau hình mèo, lặp tới khi buông J
                this.holdFx = DustPuff.spawn(HOLD_FX, this.node, 0, 0, { scale: 3, fps: 14, loopFor: 999 });
                this.holdFx?.node.setSiblingIndex(0);
            }
            this.chargeFx?.setProgress((this.holdTime - CHARGE_SHOW) / Math.max(0.01, this.chargeTime - CHARGE_SHOW));
            if (!this.charged && this.holdTime >= this.chargeTime) {
                this.charged = true;
                // Gồng xong: vòng toả ra (ảnh FX_charge_ khung 5 → 8), quả cầu gồng chớp tới khi thả (mèo không nhấp nháy).
                // Chưa có ảnh thì vòng sáng xanh vẽ bằng code và mèo nhấp nháy như cũ.
                if (this.chargeFx) this.chargeFx.full();
                else {
                    const parent = this.node.parent;
                    const p = this.node.position;
                    if (parent) SkillFx.ring(parent, p.x, p.y + b.size.height * 0.5, 110, CHARGE_TINT, 0.3, 0);
                }
                Sound.play('checkpoint', 0.4);
            }
        } else {
            let fired = false;
            if (canHold && !this.controls.attackHeld) {
                if (this.holdTime >= this.chargeTime && this.spend(this.waveEnergy)) {
                    this.fireWave();
                    fired = true;
                }
            }
            this.holdTime = 0;
            this.charged = false;
            if (this.chargeFx) {
                // Phóng được thì quả cầu biến mất; thả sớm (hoặc thiếu năng lượng) thì xì hơi, không tốn gì
                if (fired || !canHold) this.chargeFx.stop();
                else {
                    this.chargeFx.fizzle();
                    Sound.play('dash', 0.35);
                }
            }
            this.chargeFx = null;
            this.chargeFxTried = false;
            if (this.holdFx && this.holdFx.isValid) this.holdFx.node.destroy();
            this.holdFx = null;
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
        this.visual?.sync(b.grounded, v.x / this.moveSpeed, v.y, this.facing, this.invincible > 0 || (this.charged && !this.chargeFx));
    }

    /** Bị đánh từ vị trí fromX. Trả về false nếu đang bất tử. */
    /** Ngồi / đứng dậy: đổi chiều cao thân va chạm (chân giữ nguyên) và dáng hình. */
    private setDucking(on: boolean) {
        if (on === this.ducking) return;
        const b = this.body;
        if (on) this.standHeight = b.size.height;
        const h = on ? this.standHeight * this.duckHeight : this.standHeight;
        if (h <= 0) return;
        this.ducking = on;
        b.size = new Size(b.size.width, h);
        b.offset = new Vec2(b.offset.x, h / 2);
        this.visual?.setDucking(on);
    }

    /** Đứng dậy được không: chỗ thân lúc đứng không đụng khối đặc nào (bục một chiều không tính). */
    private roomToStand(): boolean {
        const b = this.body;
        const p = this.node.position;
        // Bắt đầu cao hơn bàn chân một chút: mặt sàn đang đỡ chân chạm đúng mép dưới, không tính là vướng
        _self.set(p.x + b.offset.x - b.size.width / 2 + 2, p.y + 4, b.size.width - 4, this.standHeight - 4);
        for (const s of Solid.all) {
            if (s.oneWay) continue;
            if (overlaps(_self, s.getRect(_hit))) return false;
        }
        return true;
    }

    /** Đang lướt (hoặc vừa lướt xong): né được đòn, kể cả axit của boss. */
    get evading() { return this.dashTimer > 0 || this.dashGrace > 0; }

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

    /**
     * Chém: ra nhát kế của combo (nhát 4 chém xoay trúng cả hai bên, nhát 5 kết liễu).
     * Đang bay thì combo chỉ có 3 nhát đầu, mỗi nhát khựng lại một nhịp trên không.
     * Trúng kẻ địch nào trong tầm thì nó mất máu và bị đẩy lùi.
     */
    private slash() {
        const v = this.body.velocity;
        const air = !this.body.grounded;
        const full = Math.max(1, Math.min(COMBO.length, Math.round(this.comboLength)));
        const length = air ? Math.min(3, full) : full;
        this.comboStep = this.comboTimer > 0 ? (this.comboStep + 1) % length : 0;
        const step = this.comboStep;
        const last = step === length - 1 && length > 1;
        this.attackTimer = this.slashInterval + (last ? this.finisherPause * (step >= 4 ? 1.5 : 1) : 0);
        this.comboTimer = this.slashInterval + this.comboWindow;
        if (air) {
            if (v.y < 0) v.y *= 0.3; // chém trên không thì khựng lơ lửng một nhịp
        } else if (this.slashStill > 0) {
            // Chém trên mặt đất: đứng yên tại chỗ mỗi nhát, không lao tới, giữ A/D cũng không đi
            v.x = 0;
            this.lunge = this.slashStill;
        }
        this.fx().play(this.facing, step);
        this.visual?.playAttack();
        Sound.play(`slash${Math.min(step, 2) + 1}`, step >= 3 ? 0.9 : 0.7);

        const [rangeK, heightK, power, damage, stop, shake] = COMBO[step];
        const big = step >= 2;
        const spin = step === SPIN_STEP;
        const r = this.body.getRect(_self);
        const cx = r.x + r.width / 2;
        const height = this.attackHeight * heightK;
        const y = r.y - (height - this.attackHeight) / 2;
        if (spin) {
            // Chém xoay: trúng cả trước mặt lẫn sau lưng
            const range = this.attackRange * rangeK;
            _hit.set(cx - range, y, range * 2, height);
        } else {
            const range = this.attackRange * rangeK;
            const back = 30; // trúng cả thứ sát sau lưng một chút
            _hit.set(this.facing > 0 ? cx - back : cx - range, y, range + back, height);
        }

        let hits = 0;
        for (const h of Hittables.slice()) {
            if (!h.canBeHit || !overlaps(_hit, h.getHitRect(_other))) continue;
            const ox = _other.x + _other.width / 2;
            // Chém xoay: đẩy địch ra xa khỏi mèo (đứng phía nào văng phía đó)
            const from = spin ? (ox >= cx ? cx - 1 : cx + 1) : this.node.position.x;
            h.takeHit(from, power, damage);
            hits++;
            // Tia lửa ở chỗ lưỡi chém chạm vào kẻ địch
            const sx = clamp(ox, _hit.x, _hit.x + _hit.width);
            const sy = clamp(_other.y + _other.height / 2, _hit.y, _hit.y + _hit.height);
            if (this.node.parent) HitSpark.spawn(this.node.parent, sx, sy, ox >= cx ? 1 : -1, big);
        }
        if (hits > 0) {
            if (air) v.y = Math.max(v.y, this.airHitLift);
            Sound.play('hit', big ? 1 : 0.8);
            HitStop.trigger(stop);
            CameraRig.instance?.shake(shake, step >= 4 ? 0.3 : big ? 0.18 : 0.12);
        }
    }

    /** Phóng sóng kiếm từ ngực bay về phía trước. */
    private fireWave() {
        const parent = this.node.parent;
        if (!parent) return;
        const p = this.node.position;
        this.visual?.playAttack();
        this.fx().play(this.facing, 2);
        Sound.play('slash3', 1);
        // Sóng phóng ra trước mặt (ảnh rộng ~300, mép sau vừa chạm thân mèo), ngang ngực
        SwordWave.fire(parent, p.x + this.facing * 220, p.y + 95, this.facing,
            { speed: this.waveSpeed, distance: this.waveDistance, damage: this.waveDamage });
        CameraRig.instance?.shake(6, 0.1);
    }

    /** Nảy lên một nhịp nhỏ (mừng về đích), không tiếng nhảy. */
    hop(speed: number) {
        this.body.velocity.y = speed;
        this.jumping = false;
        this.visual?.playJump();
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

    /** Lướt chém nếu đang điều khiển được và đủ năng lượng (phím Lướt / bấm đúp). Trả về true nếu lướt. */
    tryDash(): boolean {
        if (this.dashTimer > 0 || !this.controlEnabled || this.hurtLock > 0 || this.downed) return false;
        if (!(this.skills?.canDash ?? true)) return false;
        if (!this.spend(this.dashEnergy)) return false;
        this.startDash();
        return true;
    }

    /** Bắt đầu lướt chém về hướng đang quay mặt. */
    private startDash() {
        this.dashTimer = this.dashTime;
        this.dashFromGround = this.body.grounded;
        this.dashDustTimer = 0;
        this.dashJump = false;
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

        // Bụi nâu tung sau gót khi lướt trên mặt đất
        this.dashDustTimer -= dt;
        if (this.dashFromGround && b.grounded && this.dashDustTimer <= 0 && this.node.parent) {
            this.dashDustTimer = 0.05;
            DustPuff.spawn(DASH_DUST, this.node.parent, p.x - this.facing * 40, p.y, { dir: this.facing, scale: 4.5, fps: 24 });
        }

        // Lướt trên mặt đất mà bấm Nhảy: nhảy giữ đà lướt (kiểu Mega Man X)
        if (this.dashFromGround && this.controlEnabled && this.controls.consumeJump()) {
            this.endDash(false);
            this.dashJump = true;
            b.velocity.x = this.facing * this.moveSpeed * this.dashJumpSpeed;
            this.coyote = 0;
            this.startJump(this.jumpSpeed);
            return;
        }

        // Hết thời gian hoặc đâm vào tường thì dừng, kết thúc bằng một nhát vung rộng
        if (this.dashTimer <= 0 || b.hitLeft || b.hitRight) {
            this.endDash(true);
            b.velocity.set(this.facing * this.moveSpeed * 0.5, 0);
        }
        this.visual?.sync(b.grounded, this.facing, 0, this.facing, false);
    }

    /** Kết thúc lướt; finisher: vung thêm một nhát rộng ở cuối đường lướt. */
    private endDash(finisher: boolean) {
        this.dashTimer = 0;
        this.dashGrace = 0.3;
        this.body.gravityScale = 1;
        this.dashFx?.release();
        this.dashFx = null;
        if (finisher) {
            this.fx().play(this.facing, 2);
            Sound.play('slash3', 0.7);
        }
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
            // Vệt "sau lưng" (nhát 3, nhát 5) vẽ trên node nằm dưới hình mèo
            const back = new Node('SlashBack');
            back.layer = this.node.layer;
            this.node.insertChild(back, 0);
            this.slashFx.back = back;
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
