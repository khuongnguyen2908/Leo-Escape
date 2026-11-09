import { _decorator, Color, Component, Graphics, Node, Rect, Size, Sprite, tween, UIOpacity, UITransform, Vec2, Vec3 } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { clamp, moveTowards, overlaps } from '../core/Box';
import { Hittables } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { PlatformerBody } from '../core/PlatformerBody';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { GameSession } from '../game/GameSession';
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

/** Bóng mờ nối đuôi khi lướt: sáng, nhạt màu */
const GHOST_TINT = new Color(255, 246, 228, 255);
/** Đường gió trắng mảnh sau lưng khi lướt: [cao so với chân, dài] */
const WIND_LINES: [number, number][] = [[105, 120], [70, 190], [35, 100]];
/** Đường gió tắt dần trong chừng này giây sau khi hết lướt */
const WIND_FADE = 0.15;
const CHARGE_TINT = new Color(120, 220, 255, 255);
/** Giữ J quá chừng này giây mới hiện hiệu ứng gồng (bấm chém nhanh thì không hiện) */
const CHARGE_SHOW = 0.15;
/** Hào quang quanh mèo lúc bật special (folder art/fx/Character/Special), lặp suốt lúc bật */
const SPECIAL_FX = 'Character/Special/frame';
/** Bật special: kiếm + (tăng công) hiện trên đầu mèo chạy 1 lượt, xong tới khiên + (tăng thủ) */
const ATK_UP = 'Character/Atk_up/frame';
const DEF_UP = 'Character/Def_up/frame';
const BUFF_FPS = 20;
/** Tốc độ khung hào quang special */
const SPECIAL_FPS = 14;
/** Hào quang dưới chân khi đang giữ J (folder art/fx/Hold), lặp tới khi buông */
const HOLD_FX = 'Hold/frame';
/**
 * Theo nhịp combo 5 nhát: [tầm chém so với Attack Range, độ cao so với Attack Height, sức đẩy lùi, máu trừ, dừng hình (ms), rung].
 * Tầm chém khớp với vệt chém đã phóng to trong SlashFx (Attack Range 170: vệt nhát 1–2 tới ~210, nhát 3 ~260, nhát 5 ~350).
 */
const COMBO: [number, number, number, number, number, number][] = [
    [1.2, 1, 1, 1, 70, 7],          // nhát 1: vệt A (quét ngang)
    [1.2, 1, 1, 1, 70, 7],          // nhát 2: vệt B (hất lên)
    [1.2, 1, 1.1, 1, 75, 8],        // nhát 3: A
    [1.2, 1, 1.1, 1, 75, 8],        // nhát 4: B (không còn chém xoay)
    [2, 1.3, 2.2, 2, 130, 18],      // nhát 5: kết liễu, vòng cung lớn (Slash3)
];
/** Không còn nhát chém xoay (trúng cả sau lưng); để -1 */
const SPIN_STEP = -1;
/** Bụi nâu tung lúc đạp đi và lúc phanh khi lướt trên mặt đất */
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
    slashStop = 0.12;

    @property({ group: 'Lướt né', tooltip: 'Bấm đúp trái/phải trong khoảng này (giây) thì lướt. 0 = tắt bấm đúp' })
    doubleTapTime = 0.25;

    @property({ group: 'Lướt né', tooltip: 'Nhảy khi đang lướt: bay ngang nhanh gấp bao nhiêu lần tốc độ chạy (tới khi chạm đất)' })
    dashJumpSpeed = 1.7;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Giữ J bao lâu (giây) thì gồng xong, thả ra phóng sóng kiếm' })
    chargeTime = 0.8;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Bay xa bao nhiêu' })
    waveDistance = 1000;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Tốc độ bay' })
    waveSpeed = 1300;

    @property({ group: 'Sóng kiếm (giữ J lâu)', tooltip: 'Mỗi kẻ địch trúng mất bao nhiêu máu' })
    waveDamage = 2;

    @property({ group: 'Lướt né', tooltip: 'Lướt xa bao nhiêu' })
    dodgeDistance = 480;

    @property({ group: 'Lướt né', tooltip: 'Thời gian lướt (giây): phóng nhanh lúc đầu, chậm dần về tốc độ chạy' })
    dodgeTime = 0.26;

    @property({ group: 'Lướt né', tooltip: 'Hết lướt còn bất tử thêm chừng này giây (lỡ dừng ngay chỗ kẻ địch)' })
    dodgeGrace = 0.1;

    @property({ group: 'Lướt né', tooltip: 'Hết lướt chờ chừng này giây mới lướt tiếp được' })
    dodgeCooldown = 0.3;

    @property({ group: 'Đi lên (W)', tooltip: 'Bục một chiều cao hơn chân trong khoảng này thì bấm W là lên được' })
    climbHeight = 420;

    @property({ group: 'Ngồi, xuống bục', tooltip: 'Ngồi (giữ Xuống trên mặt đất): thân va chạm còn bao nhiêu phần chiều cao' })
    duckHeight = 0.6;

    @property({ group: 'Ngồi, xuống bục', tooltip: 'Bấm Xuống 2 lần trong khoảng này (giây) khi đứng trên bục một chiều thì rơi xuyên xuống' })
    downTapTime = 0.3;

    @property({ group: 'Thanh nộ, special (L)', tooltip: 'Thanh nộ đầy là bao nhiêu (thanh năng lượng trên HUD)' })
    maxEnergy = 100;

    @property({ group: 'Thanh nộ, special (L)', tooltip: 'Mỗi nhát chém / sóng kiếm / chiêu trúng địch được thêm chừng này nộ (đang bật special thì không thêm)' })
    rageOnHit = 5;

    @property({ group: 'Thanh nộ, special (L)', tooltip: 'Trong màn hướng dẫn mỗi nhát trúng được chừng này nộ (tích nhanh để tập special)' })
    tutorialRageOnHit = 25;

    @property({ group: 'Thanh nộ, special (L)', tooltip: 'Special (phím L, cần đầy nộ) kéo dài bao lâu (giây); thanh nộ tụt dần về 0 trong lúc này' })
    specialTime = 8;

    @property({ group: 'Thanh nộ, special (L)', tooltip: 'Lúc bật special: sát thương nhân chừng này' })
    specialDamage = 1.5;

    @property({ group: 'Thanh nộ, special (L)', tooltip: 'Lúc bật special: đánh nhanh gấp chừng này' })
    specialSpeed = 1.5;

    @property({ group: 'Thanh nộ, special (L)', tooltip: 'Lúc bật special: trúng đòn chỉ mất chừng này tim (0.5 = nửa tim)' })
    specialDefense = 0.5;


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
    /** Thanh nộ (hiện trên thanh năng lượng): bắt đầu rỗng, đầy lên khi đánh trúng địch, không tự hồi */
    energy = 0;
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
    private dashJump = false;
    /** Còn > 0: đang bật special (giây còn lại) */
    private specialLeft = 0;
    private specialFx: DustPuff | null = null;
    /** Đã chạy hào quang bao lâu; mỗi vòng sáng mới hiện ra thì kêu special_on, vòng cuối kêu special_off */
    private auraTime = 0;
    private auraOffPlayed = false;
    private ghostTimer = 0;
    /** Còn > 0 thì chưa lướt tiếp được */
    private dashCooldown = 0;
    /** Đã lướt trên không (mỗi lần bay chỉ lướt 1 lần, chạm đất thì được lại) */
    private airDashed = false;
    private wind: Graphics | null = null;
    private windFade = 0;

    onLoad() {
        this.body = this.getComponent(PlatformerBody)!;
        this.energy = 0;
        PlayerInput.init();
        preloadSlashImages();
        SwordWave.preload();
        ChargeFx.preload();
        DustPuff.preload(HOLD_FX);
        DustPuff.preload(SPECIAL_FX);
        DustPuff.preload(ATK_UP);
        DustPuff.preload(DEF_UP);
        DustPuff.preload(DASH_DUST);
    }

    update(dt: number) {
        if (HitStop.frozen) return;
        const b = this.body;
        const v = b.velocity;
        if (this.hurtLock > 0) this.hurtLock -= dt;
        if (this.invincible > 0) this.invincible -= dt;
        const canControl = this.controlEnabled && this.hurtLock <= 0 && !this.downed;

        // Thanh nộ không tự hồi; đang bật special thì tụt dần, hết thì tắt
        if (this.energyWarn > 0) this.energyWarn -= dt;
        if (this.specialLeft > 0) {
            this.specialLeft -= dt;
            this.energy = this.maxEnergy * Math.max(0, this.specialLeft) / Math.max(0.01, this.specialTime);
            this.auraSound(dt);
            if (this.specialLeft <= 0) this.endSpecial();
        }

        // Đang lướt thì bỏ qua chạy/nhảy/chém thường
        if (this.dashGrace > 0) this.dashGrace -= dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (b.grounded) this.airDashed = false;
        this.fadeWind(dt);
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

        // Lướt giờ có phím / nút riêng (phím Tương tác = Lướt, xem LeoSkills); không còn lướt bằng bấm đúp trái / phải
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
                Sound.play('jump', 0.6);
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
            if (this.skills?.attack()) this.attackTimer = this.slashInterval * 1.6 / this.attackSpeedMult;
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
                if (this.holdTime >= this.chargeTime) {
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
        // Special: đánh nhanh hơn (nhịp chém, nghỉ sau nhát cuối, đứng khựng đều ngắn lại)
        const speed = this.attackSpeedMult;
        this.attackTimer = (this.slashInterval + (last ? this.finisherPause * (step >= 4 ? 1.5 : 1) : 0)) / speed;
        this.comboTimer = this.slashInterval / speed + this.comboWindow;
        if (air) {
            if (v.y < 0) v.y *= 0.3; // chém trên không thì khựng lơ lửng một nhịp
        } else if (this.slashStop > 0) {
            // Chém trên mặt đất: đứng yên tại chỗ một nhịp ngắn mỗi nhát, không lao tới, giữ A/D cũng không đi
            v.x = 0;
            this.lunge = this.slashStop / speed;
        }
        this.fx().play(this.facing, step, this.specialOn, this.attackSpeedMult);
        this.visual?.playAttack();
        // Nhát 1–4: slash1; nhát 5 (kết liễu): slash3
        Sound.play(step >= 4 ? 'slash3' : 'slash1', step >= 4 ? 0.9 : 0.7);

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
            h.takeHit(from, power, damage * this.damageMult);
            hits++;
            // Tia lửa ở chỗ lưỡi chém chạm vào kẻ địch
            const sx = clamp(ox, _hit.x, _hit.x + _hit.width);
            const sy = clamp(_other.y + _other.height / 2, _hit.y, _hit.y + _hit.height);
            if (this.node.parent) HitSpark.spawn(this.node.parent, sx, sy, ox >= cx ? 1 : -1, big);
        }
        if (hits > 0) {
            this.addRage(this.rageOnHit);
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
        this.fx().playLegacy(this.facing, 2);
        Sound.play('slash3', 1);
        // Sóng phóng ra trước mặt (ảnh rộng ~300, mép sau vừa chạm thân mèo), ngang ngực
        SwordWave.fire(parent, p.x + this.facing * 220, p.y + 95, this.facing,
            { speed: this.waveSpeed, distance: this.waveDistance, damage: this.waveDamage * this.damageMult, onHit: () => this.addRage(this.rageOnHit) });
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
        if (this.energy < cost || this.specialLeft > 0) {
            this.energyWarn = 0.45;
            return false;
        }
        this.energy -= cost;
        return true;
    }

    // ---------- Thanh nộ, special ----------

    /** Đang bật special. */
    get specialOn() { return this.specialLeft > 0; }

    /** Thanh nộ đầy, bật special được. */
    get specialReady() { return this.specialLeft <= 0 && this.energy >= this.maxEnergy - 0.01; }

    /** Sát thương nhân thêm (special: ×1.5). */
    get damageMult() { return this.specialLeft > 0 ? this.specialDamage : 1; }

    /** Tốc độ đánh nhân thêm (special: ×1.5). */
    get attackSpeedMult() { return this.specialLeft > 0 ? Math.max(0.1, this.specialSpeed) : 1; }

    /** Số tim mất khi trúng đòn (special: nửa tim). */
    damageTaken(amount: number): number {
        return this.specialLeft > 0 ? amount * this.specialDefense : amount;
    }

    /** Đánh trúng địch: thêm nộ (đang bật special thì không thêm). Vừa đầy thì kêu một tiếng báo. */
    addRage(amount: number) {
        if (this.specialLeft > 0 || amount <= 0) return;
        // Màn hướng dẫn: tích nhanh (mặc định 4 nhát là đầy) để tập phím special
        if (GameSession.tutorial?.active && this.rageOnHit > 0) amount *= this.tutorialRageOnHit / this.rageOnHit;
        const was = this.energy;
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
        if (was < this.maxEnergy - 0.01 && this.energy >= this.maxEnergy - 0.01) Sound.play('checkpoint', 0.6);
    }

    /** Phím special (L / C): đầy nộ thì bật special (hào quang quanh mèo, 8 giây); chưa đầy thì thanh nháy đỏ. Trả về true nếu bật. */
    trySpecial(): boolean {
        if (this.specialLeft > 0 || !this.controlEnabled || this.downed) return false;
        if (this.energy < this.maxEnergy - 0.01) {
            this.energyWarn = 0.45;
            Sound.play('ui_deny', 0.6);
            return false;
        }
        this.specialLeft = this.specialTime;
        this.auraTime = 0;
        this.auraOffPlayed = false;
        Sound.play('special_on', 1);
        CameraRig.instance?.shake(8, 0.25);
        this.visual?.playJump();
        // Hào quang lặp quanh thân mèo, nằm sau hình mèo
        if (this.specialFx?.isValid) this.specialFx.node.destroy();
        // Hào quang nằm dưới đất quanh chân mèo
        this.specialFx = DustPuff.spawn(SPECIAL_FX, this.node, 0, 8, { scale: 1.9, fps: SPECIAL_FPS, center: true, loopFor: this.specialTime });
        this.specialFx?.node.setSiblingIndex(0);
        // Kiếm + hiện trên đầu chạy 1 lượt, xong tới khiên +
        const headY = this.body.size.height + 110;
        DustPuff.spawn(ATK_UP, this.node, 0, headY, { scale: 2.1, fps: BUFF_FPS, center: true });
        const atkTime = Math.max(0.3, DustPuff.frames(ATK_UP).length / BUFF_FPS);
        this.scheduleOnce(() => {
            if (this.specialLeft > 0) DustPuff.spawn(DEF_UP, this.node, 0, headY, { scale: 2.1, fps: BUFF_FPS, center: true });
        }, atkTime);
        return true;
    }

    /** Mỗi vòng sáng mới của hào quang: kêu special_on; vòng cuối cùng (không đủ thời gian cho vòng sau) kêu special_off. */
    private auraSound(dt: number) {
        if (this.auraOffPlayed) return;
        const cycle = Math.max(0.2, (DustPuff.frames(SPECIAL_FX).length || 9) / SPECIAL_FPS);
        const before = Math.floor(this.auraTime / cycle);
        this.auraTime += dt;
        if (Math.floor(this.auraTime / cycle) === before) return;
        if (this.specialLeft > cycle) {
            Sound.play('special_on', 1);
        } else {
            Sound.play('special_off', 0.9);
            this.auraOffPlayed = true;
        }
    }

    /** Hết giờ special: tắt hào quang, thanh nộ về 0 (đánh trúng để tích lại). */
    private endSpecial() {
        this.specialLeft = 0;
        this.energy = 0;
        if (this.specialFx?.isValid) this.specialFx.node.destroy();
        this.specialFx = null;
        if (!this.auraOffPlayed) Sound.play('special_off', 0.9);
        this.auraOffPlayed = true;
    }

    /**
     * Lướt né (phím Lướt / bấm đúp): không tốn năng lượng, không gây sát thương, bất tử suốt lúc lướt.
     * Đang chém cũng lướt được ngay (huỷ nhịp chém). Trên không mỗi lần bay chỉ lướt 1 lần. Trả về true nếu lướt.
     */
    tryDash(): boolean {
        if (this.dashTimer > 0 || this.dashCooldown > 0 || !this.controlEnabled || this.hurtLock > 0 || this.downed) return false;
        if (!(this.skills?.canDash ?? true)) return false;
        if (!this.body.grounded) {
            if (this.airDashed) return false;
            this.airDashed = true;
        }
        this.startDash();
        return true;
    }

    /** Bắt đầu lướt về hướng đang quay mặt: huỷ nhịp chém, cúi người, bụi tung lúc đạp đi. */
    private startDash() {
        this.dashTimer = this.dodgeTime;
        this.dashFromGround = this.body.grounded;
        this.dashJump = false;
        this.ghostTimer = 0;
        // Huỷ nhịp chém đang dở: lướt đi liền
        this.attackQueued = 0;
        this.attackTimer = 0;
        this.comboTimer = 0;
        this.lunge = 0;
        this.jumping = false;
        this.visual?.setDash(1);
        Sound.play('dash');
        const parent = this.node.parent;
        if (!parent) return;
        const p = this.node.position;
        if (this.dashFromGround) DustPuff.spawn(DASH_DUST, parent, p.x - this.facing * 30, p.y, { dir: this.facing, scale: 5, fps: 24 });
        // Đường gió: node riêng nằm ngay sau lưng mèo, vẽ lại mỗi khung
        if (!this.wind || !this.wind.isValid) {
            const n = new Node('DashWind');
            n.layer = this.node.layer;
            parent.addChild(n);
            this.wind = n.addComponent(Graphics);
        }
        this.wind.node.setSiblingIndex(Math.max(0, this.node.getSiblingIndex()));
        this.windFade = 0;
    }

    private updateDash(dt: number) {
        const b = this.body;
        // Tốc độ giảm đều từ đỉnh xuống tốc độ chạy: đi đúng Dodge Distance trong Dodge Time, hết lướt nối đà chạy luôn
        const k = clamp(1 - this.dashTimer / this.dodgeTime, 0, 1);
        const end = this.moveSpeed;
        const peak = Math.max(end, (2 * this.dodgeDistance) / this.dodgeTime - end);
        b.velocity.set(this.facing * (peak + (end - peak) * k), 0);
        b.gravityScale = 0;
        b.move(dt);
        this.dashTimer -= dt;
        this.visual?.setDash(1 - k * 0.35);

        // Bóng mờ nối đuôi
        this.ghostTimer -= dt;
        if (this.ghostTimer <= 0) {
            this.ghostTimer = 0.03;
            this.spawnGhost();
        }
        this.drawWind(1 - k * 0.6);

        // Lướt trên mặt đất mà bấm Nhảy: nhảy giữ đà lướt (kiểu Mega Man X)
        if (this.dashFromGround && this.controlEnabled && this.controls.consumeJump()) {
            this.endDash();
            this.dashJump = true;
            b.velocity.x = this.facing * this.moveSpeed * this.dashJumpSpeed;
            this.coyote = 0;
            this.startJump(this.jumpSpeed);
            return;
        }

        // Đang lướt bấm Đánh: dừng lướt, ra nhát chém liền (khung sau update thường xử lý, kể cả chiêu W + J / S + J)
        if (this.controlEnabled && this.controls.consumeAttack()) {
            this.endDash();
            b.velocity.x = this.facing * this.moveSpeed * 0.5;
            this.attackQueued = 0.15;
            return;
        }

        // Hết thời gian: nối đà chạy (thả phím thì tự chậm lại như dừng chạy). Đâm tường thì dừng hẳn
        if (this.dashTimer <= 0 || b.hitLeft || b.hitRight) {
            const wall = b.hitLeft || b.hitRight;
            this.endDash();
            b.velocity.set(wall ? 0 : this.facing * end, 0);
            const parent = this.node.parent;
            if (parent && b.grounded) {
                const p = this.node.position;
                DustPuff.spawn(DASH_DUST, parent, p.x + this.facing * 20, p.y, { dir: -this.facing, scale: 3.5, fps: 24 });
            }
        }
        this.visual?.sync(b.grounded, this.facing, 0, this.facing, false);
    }

    /** Kết thúc lướt: còn bất tử thêm một chút, chờ hồi rồi mới lướt tiếp; dáng người bật lại từ từ. */
    private endDash() {
        this.dashTimer = 0;
        this.dashGrace = this.dodgeGrace;
        this.dashCooldown = this.dodgeCooldown;
        this.body.gravityScale = 1;
        this.visual?.setDash(0);
        this.windFade = WIND_FADE;
    }

    /** Vẽ đường gió trắng mảnh sau lưng mèo, đậm a (0..1). */
    private drawWind(a: number) {
        const g = this.wind;
        if (!g || !g.isValid) return;
        const p = this.node.position;
        g.node.setPosition(p.x, p.y, 0);
        g.clear();
        if (a <= 0.01) return;
        g.lineWidth = 4;
        g.lineCap = Graphics.LineCap.ROUND;
        g.strokeColor = new Color(255, 255, 255, Math.round(220 * a));
        const back = -this.facing;
        for (const [y, len] of WIND_LINES) {
            g.moveTo(back * 60, y);
            g.lineTo(back * (60 + len * (0.5 + 0.5 * a)), y);
        }
        g.stroke();
    }

    /** Đường gió tắt dần sau khi hết lướt. */
    private fadeWind(dt: number) {
        if (this.windFade <= 0 || this.dashTimer > 0) return;
        this.windFade -= dt;
        this.drawWind(Math.max(0, this.windFade / WIND_FADE) * 0.4);
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
        // Cùng gốc với hình mèo (giữa bàn chân), không thì bóng tụt xuống nửa thân, lún dưới đất
        const va = vis.getComponent(UITransform)?.anchorPoint;
        if (va) g.getComponent(UITransform)?.setAnchorPoint(va);
        gs.color = GHOST_TINT;
        const op = g.addComponent(UIOpacity);
        op.opacity = 115;
        tween(op).to(0.2, { opacity: 0 }).call(() => g.destroy()).start();
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
        Sound.play('jump', Math.min(1, volume + 0.2));
    }

    /** Trừ năng lượng nếu đủ; không đủ thì báo (thanh nháy đỏ) và trả về false. Kỹ năng dùng chung. */
    useEnergy(cost: number): boolean {
        return this.spend(cost);
    }

    /** Gục xuống (hết tim) hoặc đứng dậy (được kéo dậy). */
    setDowned(on: boolean) {
        this.downed = on;
        if (this.dashTimer > 0) this.endDash();
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
