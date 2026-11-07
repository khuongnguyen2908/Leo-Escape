import { _decorator, Color, Component, Graphics, Node, Rect, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { moveTowards, overlaps } from '../core/Box';
import type { DifficultyStats } from '../core/Difficulty';
import { Hittable, registerHittable, unregisterHittable } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { Sound } from '../core/Sound';
import { PlatformerBody } from '../core/PlatformerBody';
import { GameManager } from '../game/GameManager';
import { Achievements } from '../game/Achievements';
import { DustPuff } from '../player/DustPuff';
import type { PlayerController } from '../player/PlayerController';
const { ccclass, property, requireComponent } = _decorator;

const _player = new Rect();
const _self = new Rect();
const HIT_TINT = new Color(255, 120, 120, 255);
/** Nháy đỏ đậm lúc rướn người báo trước khi mổ */
const PECK_TINT = new Color(255, 60, 60, 255);
const _beak = new Rect();
const HIT_SHAKE_TIME = 0.28;
/** Quái nhỏ chết: tia nổ (folder art/fx/Enemy death). Boss chết: đầu lâu nổ (art/fx/Boss/Death) */
const ENEMY_DEATH = 'Enemy death/frame';
const BOSS_DEATH = 'Boss/Death/frame';
/** Té: ngã xuống trong chừng này giây, và đứng dậy trong chừng này giây cuối */
const TRIP_FALL = 0.15;
const TRIP_RISE = 0.2;
const YARN = new Color(232, 92, 132, 255);

/**
 * Kẻ địch đi tuần qua lại, quay đầu khi đụng tường hoặc tới mép vực.
 * Mèo chém trúng thì mất máu và bị đẩy lùi. Chạm vào không mất máu: địch nhỏ (chim, gà...) đánh bằng đòn MỔ —
 * thấy mèo trong tầm thì dừng, rướn người nháy đỏ (báo trước để né), rồi lao mổ; trúng thì mèo mất 1 tim, xong nghỉ một lúc.
 * Bị chém trúng lúc đang rướn / lao thì mất đòn. Boss không mổ (BossBrain lo các đòn axit).
 * Boss dùng chung script này: tăng hp, targetHeight, speed. Kẻ địch nhiều máu (boss) bị đẩy lùi ít hơn.
 */
@ccclass('EnemyPatrol')
@requireComponent(PlatformerBody)
export class EnemyPatrol extends Component implements Hittable {
    @property({ type: Node, tooltip: 'Node con chứa Sprite' })
    visual: Node | null = null;

    @property({ type: [SpriteFrame], tooltip: 'Các frame đi bộ, đổi qua lại theo walkFps' })
    walkFrames: SpriteFrame[] = [];

    @property
    walkFps = 6;

    @property({ tooltip: 'Chiều cao hiển thị (đơn vị game)' })
    targetHeight = 120;

    @property({ tooltip: 'Hình gốc vẽ quay mặt sang phải?' })
    artFacesRight = true;

    @property
    speed = 120;

    @property({ tooltip: 'Máu (nhát chém thường trừ 1, nhát kết liễu / sóng kiếm / lướt trừ 2)' })
    hp = 12;

    @property({ tooltip: 'Bị chém thì văng ra xa bao nhiêu (tốc độ)' })
    knockback = 380;

    @property({ tooltip: 'Bị chém thì rung giật mạnh bao nhiêu' })
    hitShake = 10;

    @property({ group: 'Mổ', tooltip: 'Mèo cách thân chim chừng này (khoảng hở giữa hai thân) thì chim bắt đầu mổ' })
    peckRange = 160;

    @property({ group: 'Mổ', tooltip: 'Rướn người nháy đỏ báo trước bao lâu (giây) rồi mới lao mổ' })
    peckWindup = 0.45;

    @property({ group: 'Mổ', tooltip: 'Mổ xong nghỉ bao lâu (giây) mới mổ tiếp' })
    peckRest = 1.2;

    @property({ group: 'Mổ', tooltip: 'Tốc độ lao tới khi mổ' })
    peckSpeed = 700;

    @property({ tooltip: 'Quay đầu ở mép vực' })
    turnAtEdges = true;

    @property({ tooltip: 'Đi tối đa bao xa quanh vị trí ban đầu (0 = không giới hạn)' })
    patrolRange = 0;

    @property({ tooltip: '-1 = đi sang trái trước, 1 = sang phải' })
    startDirection = -1;

    private body!: PlatformerBody;
    private sprite: Sprite | null = null;
    private dir = -1;
    private peck: 'none' | 'windup' | 'lunge' | 'back' = 'none';
    private peckTime = 0;
    private peckWait = 0;
    private peckHit = false;
    private startX = 0;
    private baseScale = 1;
    private animTime = 0;
    private hitCooldown = 0;
    private stun = 0;
    private knockVel = 0;
    private shakeTime = 0;
    private pop = 0;
    private dead = false;
    private bound = 0;
    private yarn: Graphics | null = null;
    private dazed = 0;
    private stars: DustPuff | null = null;
    private airborne = false;
    private airTime = 0;
    private floatTime = 0;
    /** Bị quét chân: còn nằm bao lâu, tổng thời gian nằm, ngã về phía nào (1 phải, -1 trái) */
    private tripped = 0;
    private tripTotal = 0;
    private tripDir = 1;

    /** Boss (BossBrain điều khiển): đứng yên tại chỗ, vẫn đụng mèo là đánh */
    paused = false;
    /** Boss: không bị chém trúng (đang nhảy múa chuyển phase) */
    invulnerable = false;
    /** Boss: máu không tụt dưới số này (BossBrain đặt: chưa ra đủ đòn của phase thì chưa qua mốc phase) */
    hpFloor = 0;

    /** Bị hất tung rơi xuống đất thì choáng thêm chừng này giây. */
    private static readonly LAND_DAZE = 0.4;
    /** Đang bị hất mà bị chém trúng thì lơ lửng (rơi chậm) chừng này giây. */
    private static readonly JUGGLE_FLOAT = 0.5;

    onLoad() {
        this.body = this.getComponent(PlatformerBody)!;
    }

    onEnable() {
        registerHittable(this);
    }

    onDisable() {
        unregisterHittable(this);
    }

    private maxHpValue = 1;

    /** Máu tối đa (lấy theo hp lúc bắt đầu). */
    get maxHp() { return this.maxHpValue; }

    get defeated() { return this.dead; }

    /** To xác (boss): không bị quét chân, không bị hất. */
    get big() { return this.targetHeight > 250; }

    /** Đánh trúng được không (còn sống và không vừa bị đánh). */
    get canBeHit() { return !this.dead && this.hitCooldown <= 0 && !this.invulnerable; }

    /** Đang quay mặt về phía nào (1 phải, -1 trái). */
    get facingDir() { return this.dir; }

    /** Quay mặt về phía toạ độ x (cùng lớp Gameplay). */
    face(x: number) {
        this.dir = x >= this.node.position.x ? 1 : -1;
    }

    /** Lấy đà trước khi ra đòn: phồng người một nhịp. */
    windup() {
        this.pop = 0.9;
    }

    /** Gặm (boss chưa vào trận): nhún nhẹ một nhịp. */
    nibble() {
        this.pop = Math.max(this.pop, 0.22);
    }

    /** Đánh lại từ đầu (mèo gục hết, hồi sinh ở checkpoint): đầy máu, về chỗ (x, y), bỏ mọi trạng thái đang bị. */
    resetForRetry(x: number, y: number) {
        if (this.dead) return;
        this.hp = this.maxHpValue;
        this.hpFloor = 0;
        this.paused = false;
        this.invulnerable = false;
        this.stun = 0;
        this.knockVel = 0;
        this.dazed = 0;
        this.tripped = 0;
        this.bound = 0;
        this.airborne = false;
        this.clearStars();
        this.drawYarn();
        this.node.setPosition(x, y, this.node.position.z);
        this.body.velocity.set(0, 0);
        this.body.gravityScale = 1;
    }

    /** Độ khó (GameManager gọi một lần lúc vào chơi): nhân máu, thời gian gồng đòn mổ và nghỉ giữa các đòn. */
    applyDifficulty(d: DifficultyStats) {
        // Lấy theo hp hiện tại (lúc vào chơi còn đầy) vì start() của địch có thể chạy sau
        const hp = Math.max(1, Math.round(this.hp * d.hp));
        this.hp = hp;
        this.maxHpValue = hp;
        this.peckWindup *= d.windup;
        this.peckRest *= d.rest;
    }

    /** Nhảy lên tại chỗ (đang đứng trên đất). */
    hop(speed: number) {
        if (this.body.grounded) this.body.velocity.y = speed;
    }

    getHitRect(out: Rect): Rect {
        return this.body.getRect(out);
    }

    start() {
        DustPuff.preload(this.big ? BOSS_DEATH : ENEMY_DEATH);
        this.maxHpValue = Math.max(1, this.hp);
        this.dir = this.startDirection >= 0 ? 1 : -1;
        this.startX = this.node.position.x;
        this.refresh();
    }

    /** Gọi lại sau khi đổi hình bằng code để tính lại tỉ lệ. Chạy được cả trong editor. */
    refresh() {
        this.sprite = this.visual?.getComponent(Sprite) ?? null;
        this.visual?.getComponent(UITransform)?.setAnchorPoint(0.5, 0);
        const first = this.walkFrames[0];
        if (first) {
            this.baseScale = this.targetHeight / first.rect.height;
            if (this.sprite) this.sprite.spriteFrame = first;
        }
        const flip = (this.startDirection >= 0 ? 1 : -1) * (this.artFacesRight ? 1 : -1);
        this.visual?.setScale(this.baseScale * flip, this.baseScale, 1);
    }

    update(dt: number) {
        if (this.dead || HitStop.frozen) return;
        const b = this.body;
        if (this.hitCooldown > 0) this.hitCooldown -= dt;

        // Bị Leo hất tung: bay lên rồi rơi, không đi tuần, không đánh mèo; bị chém tiếp trên không thì lơ lửng thêm
        if (this.airborne) {
            this.airTime += dt;
            if (this.floatTime > 0) this.floatTime -= dt;
            if (this.stun > 0) this.stun -= dt;
            b.gravityScale = this.floatTime > 0 ? 0.3 : 1;
            this.knockVel = moveTowards(this.knockVel, 0, 1600 * dt);
            b.velocity.x = this.knockVel;
            b.move(dt);
            this.animate(dt);
            if (b.grounded && this.airTime > 0.1) {
                this.airborne = false;
                b.gravityScale = 1;
                this.daze(EnemyPatrol.LAND_DAZE);
            }
            return;
        }

        // Bị Angelo trói chân: đứng yên, không đánh ai, vẫn bị chém được
        if (this.bound > 0) {
            this.bound -= dt;
            b.velocity.x = this.stun > 0 ? this.knockVel : 0;
            if (this.stun > 0) this.stun -= dt;
            b.move(dt);
            this.animate(dt);
            this.drawYarn();
            if (this.bound <= 0) this.drawYarn();
            return;
        }

        // Bị Leo quét chân: té nằm trên đất, không đánh ai, vẫn bị chém được; hết giờ thì đứng dậy đi tiếp
        if (this.tripped > 0) {
            this.tripped -= dt;
            if (this.stun > 0) this.stun -= dt;
            this.knockVel = moveTowards(this.knockVel, 0, 1600 * dt);
            if (b.grounded && !this.groundAt(Math.sign(this.knockVel))) this.knockVel = 0;
            b.velocity.x = this.knockVel;
            b.move(dt);
            this.animate(dt);
            return;
        }

        // Bị Leo đập choáng: văng lùi xong thì đứng yên, sao xoay trên đầu, không đánh ai, vẫn bị chém được
        if (this.dazed > 0) {
            this.dazed -= dt;
            if (this.stun > 0) {
                this.stun -= dt;
                this.knockVel = moveTowards(this.knockVel, 0, 1600 * dt);
                if (b.grounded && !this.groundAt(Math.sign(this.knockVel))) this.knockVel = 0;
            } else {
                this.knockVel = 0;
            }
            b.velocity.x = this.knockVel;
            b.move(dt);
            this.animate(dt);
            if (this.dazed <= 0) this.clearStars();
            return;
        }

        // Boss đang ra đòn / nhảy múa: đứng yên (vẫn bị đẩy lùi khi bị chém); đụng vào không mất máu
        if (this.paused) {
            if (this.stun > 0) this.stun -= dt;
            this.knockVel = moveTowards(this.knockVel, 0, 1600 * dt);
            if (b.grounded && !this.groundAt(Math.sign(this.knockVel))) this.knockVel = 0;
            b.velocity.x = this.knockVel;
            b.move(dt);
            this.animate(dt);
            return;
        }

        // Vừa bị chém: văng lùi rồi trượt chậm lại, chưa đi tuần tiếp
        if (this.stun > 0) {
            this.stun -= dt;
            this.knockVel = moveTowards(this.knockVel, 0, 1600 * dt);
            // Văng lùi tới mép vực thì dừng, không bị đẩy rơi xuống
            if (b.grounded && !this.groundAt(Math.sign(this.knockVel))) this.knockVel = 0;
            b.velocity.x = this.knockVel;
            b.move(dt);
            this.animate(dt);
            return;
        }

        // Địch nhỏ: mèo trong tầm thì mổ (đang mổ thì không đi tuần)
        if (!this.big && this.updatePeck(dt)) {
            this.animate(dt);
            return;
        }

        b.velocity.x = this.dir * this.speed;
        b.move(dt);

        const fromStart = this.node.position.x - this.startX;
        if ((this.dir < 0 && b.hitLeft) || (this.dir > 0 && b.hitRight)) {
            this.dir = -this.dir;
        } else if (this.turnAtEdges && b.grounded && !this.groundAhead()) {
            this.dir = -this.dir;
        } else if (this.patrolRange > 0 && Math.abs(fromStart) > this.patrolRange && Math.sign(fromStart) === this.dir) {
            this.dir = -this.dir;
        }

        this.animate(dt);
    }

    /** Đòn mổ: rướn (báo trước) → lao tới → lùi về → nghỉ. Trả về true khi đang bận mổ. */
    private updatePeck(dt: number): boolean {
        const b = this.body;
        if (this.peckWait > 0) this.peckWait -= dt;
        switch (this.peck) {
            case 'none': {
                if (this.peckWait > 0 || !b.grounded) return false;
                const cat = this.catInReach();
                if (!cat) return false;
                this.face(cat.node.position.x);
                this.peck = 'windup';
                this.peckTime = 0;
                b.velocity.x = 0;
                b.move(dt);
                return true;
            }
            case 'windup':
                this.peckTime += dt;
                b.velocity.x = 0;
                b.move(dt);
                if (this.peckTime >= this.peckWindup) {
                    this.peck = 'lunge';
                    this.peckTime = 0;
                    this.peckHit = false;
                    Sound.play('slash1', 0.5);
                }
                return true;
            case 'lunge':
                this.peckTime += dt;
                // Không lao xuống vực
                b.velocity.x = this.groundAhead() ? this.dir * this.peckSpeed : 0;
                b.move(dt);
                if (!this.peckHit) this.peckHit = this.beakHit();
                if (this.peckTime >= 0.14) {
                    this.peck = 'back';
                    this.peckTime = 0;
                }
                return true;
            case 'back':
                this.peckTime += dt;
                b.velocity.x = this.groundAt(-this.dir) ? -this.dir * this.peckSpeed * 0.4 : 0;
                b.move(dt);
                if (this.peckTime >= 0.22) {
                    this.peck = 'none';
                    this.peckWait = this.peckRest;
                }
                return true;
        }
        return false;
    }

    /** Con mèo gần nhất trong tầm mổ (gần ngang nhau, không gục, đang chơi). */
    private catInReach(): PlayerController | null {
        const gm = GameManager.instance;
        if (!gm) return null;
        const self = this.body.getRect(_self);
        let best: PlayerController | null = null;
        let bestGap = Infinity;
        for (const cat of gm.cats) {
            if (cat.downed || cat.idle) continue;
            const r = cat.body.getRect(_player);
            const gap = Math.max(r.xMin - self.xMax, self.xMin - r.xMax, 0);
            if (gap > this.peckRange || Math.abs(r.yMin - self.yMin) > 100) continue;
            if (gap < bestGap) {
                bestGap = gap;
                best = cat;
            }
        }
        return best;
    }

    /** Mỏ (phía trước thân, dài 70) chạm mèo nào thì mèo đó bị đánh. Trả về true nếu trúng. */
    private beakHit(): boolean {
        const gm = GameManager.instance;
        if (!gm) return false;
        const self = this.body.getRect(_self);
        const reach = 70;
        _beak.set(this.dir > 0 ? self.xMax - 20 : self.xMin - reach, self.y + self.height * 0.2, reach + 20, self.height * 0.6);
        let hit = false;
        for (const cat of gm.cats) {
            if (cat.downed || !overlaps(cat.body.getRect(_player), _beak)) continue;
            gm.hurtCat(cat, this.node.position.x);
            hit = true;
        }
        return hit;
    }

    private groundAhead(): boolean {
        return this.groundAt(this.dir);
    }

    /** Phía dir (1 phải, -1 trái) còn nền để đứng không. */
    private groundAt(dir: number): boolean {
        if (dir === 0) return true;
        const r = this.body.getRect(_self);
        const x = dir > 0 ? r.xMax + 4 : r.xMin - 4;
        return PlatformerBody.hasGroundAt(x, r.yMin);
    }

    private animate(dt: number) {
        this.animTime += dt;
        const v = this.visual;
        if (!v) return;
        const frames = this.walkFrames;
        if (this.sprite && frames.length > 1 && this.dazed <= 0 && this.tripped <= 0) {
            this.sprite.spriteFrame = frames[Math.floor(this.animTime * this.walkFps) % frames.length];
        }
        const hop = this.stun > 0 || this.dazed > 0 || this.tripped > 0 || this.airborne ? 0 : Math.abs(Math.sin(this.animTime * this.walkFps * Math.PI));
        const flip = this.dir * (this.artFacesRight ? 1 : -1);

        // Bị chém: bẹp ngang một nhịp rồi nảy lại, đồng thời rung giật qua lại và lắc nghiêng, nhỏ dần
        let jx = 0, ang = 0;
        if (this.shakeTime > 0) {
            this.shakeTime = Math.max(0, this.shakeTime - dt);
            const k = this.shakeTime / HIT_SHAKE_TIME;
            jx = Math.sin(this.animTime * 95) * this.hitShake * k;
            ang = Math.sin(this.animTime * 70) * 9 * k;
        }
        this.pop = Math.max(0, this.pop - dt * 5);
        let sx = 1 + 0.04 * hop + 0.22 * this.pop;
        let sy = 1 - 0.04 * hop - 0.18 * this.pop;
        // Mổ: rướn người ra sau (thân co, ngửa lên) rồi lao tới (thân dài ra, chúi xuống)
        if (this.peck === 'windup') {
            const k = Math.min(1, this.peckTime / Math.max(0.01, this.peckWindup * 0.6));
            sx *= 1 - 0.12 * k;
            sy *= 1 + 0.1 * k;
            ang += 10 * k * this.dir;
        } else if (this.peck === 'lunge') {
            sx *= 1.18;
            sy *= 0.9;
            ang -= 8 * this.dir;
        }
        v.setScale(this.baseScale * flip * sx, this.baseScale * sy, 1);
        // Té: xoay quanh chân, ngã nằm nghiêng 90° về phía bị quét tới; nâng lên nửa bề ngang để không lún xuống đất,
        // dời ngang nửa chiều cao để thân nằm giữa chỗ đứng
        let tx = 0, ty = 0;
        if (this.tripped > 0) {
            const t = this.tripTotal - this.tripped;
            const k = Math.min(1, t / TRIP_FALL, this.tripped / TRIP_RISE);
            const a = (k * Math.PI) / 2;
            const ui = v.getComponent(UITransform);
            const w = (ui?.width ?? 0) * this.baseScale, h = (ui?.height ?? 0) * this.baseScale;
            ang += -this.tripDir * 90 * k;
            tx = -this.tripDir * (h / 2) * Math.sin(a);
            ty = (w / 2) * Math.sin(a);
        }
        v.setPosition(jx + tx, hop * 6 + ty, 0);
        v.angle = ang;
        if (this.sprite) {
            const warn = this.peck === 'windup' && Math.floor(this.peckTime * 14) % 2 === 0;
            this.sprite.color = warn ? PECK_TINT : this.stun > 0 && Math.floor(this.animTime * 16) % 2 === 0 ? HIT_TINT : Color.WHITE;
        }
    }

    /** Bị trói chân seconds giây (boss to xác bị trói ngắn hơn). */
    bind(seconds: number) {
        if (this.dead) return;
        this.bound = this.targetHeight > 250 ? seconds * 0.6 : seconds;
        this.pop = 0.6;
    }

    /** Bị choáng seconds giây (boss to xác choáng ngắn hơn): đứng yên, sao xoay trên đầu. */
    daze(seconds: number) {
        if (this.dead) return;
        this.dazed = this.targetHeight > 250 ? seconds * 0.6 : seconds;
        this.clearStars();
        this.stars = DustPuff.spawn(DustPuff.STUN, this.node, 0, this.targetHeight + 40,
            { scale: 4.5, fps: 8, center: true, loopFor: this.dazed });
    }

    /** Bị quét chân: bật nhẹ lên rồi té nằm seconds giây, ngã ra xa khỏi fromX (boss to xác không bị té). */
    trip(seconds: number, fromX?: number) {
        if (this.dead || this.big) return;
        this.tripDir = fromX === undefined ? -this.dir : (this.node.position.x >= fromX ? 1 : -1);
        this.tripTotal = Math.max(seconds, TRIP_FALL + TRIP_RISE);
        this.tripped = this.tripTotal;
        this.dazed = 0;
        this.clearStars();
        this.body.velocity.y = 260;
    }

    /** Bị hất tung lên cao height (boss to xác không bị hất). */
    launch(height: number) {
        if (this.dead || this.big) return;
        const b = this.body;
        this.airborne = true;
        this.airTime = 0;
        this.floatTime = 0;
        this.bound = 0;
        this.dazed = 0;
        this.tripped = 0;
        this.clearStars();
        this.drawYarn();
        this.knockVel *= 0.15; // bay thẳng lên, gần như không văng ngang
        b.velocity.y = Math.sqrt(2 * b.gravity * Math.max(0, height));
    }

    private clearStars() {
        if (this.stars && this.stars.isValid) this.stars.node.destroy();
        this.stars = null;
    }

    /** Vòng len quấn quanh chân khi đang bị trói. */
    private drawYarn() {
        if (!this.yarn) {
            const n = new Node('Yarn');
            n.layer = this.node.layer;
            this.node.addChild(n);
            this.yarn = n.addComponent(Graphics);
        }
        const g = this.yarn;
        g.clear();
        if (this.bound <= 0) return;
        const w = this.body.size.width;
        g.lineWidth = 5;
        g.strokeColor = YARN;
        for (let i = 0; i < 3; i++) {
            g.ellipse(0, 14 + i * 14, w * 0.55, 9);
            g.stroke();
        }
    }

    takeHit(fromX?: number, power = 1, damage = 1) {
        // Bị chém trúng lúc đang rướn / lao thì mất đòn
        if (this.peck === 'windup' || this.peck === 'lunge') {
            this.peck = 'none';
            this.peckWait = this.peckRest * 0.5;
        }
        this.hp = Math.max(this.hpFloor, this.hp - damage);
        this.hitCooldown = 0.12; // chỉ để một nhát chém không tính 2 lần
        const heavy = this.targetHeight > 250; // boss to xác: văng ít, giật ít
        const away = fromX === undefined ? -this.dir : (this.node.position.x >= fromX ? 1 : -1);
        this.knockVel = away * this.knockback * power * (heavy ? 0.25 : 1);
        this.stun = (heavy ? 0.12 : 0.3) * power;
        this.shakeTime = HIT_SHAKE_TIME * (heavy ? 0.6 : 1);
        this.pop = heavy ? 0.5 : 1;
        if (this.airborne) {
            // Đang bị hất mà bị chém tiếp: giữ lơ lửng ngang tầm mèo (không vọt lên cao), rơi chậm, văng ngang ít
            this.knockVel *= 0.25;
            this.body.velocity.y = 200;
            this.floatTime = EnemyPatrol.JUGGLE_FLOAT;
        } else if (!heavy) {
            this.body.velocity.y = 220 * power; // nảy nhẹ lên
        }
        if (this.hp <= 0) this.die(away);
    }

    /** Gục: văng ra sau, lật nghiêng rồi mờ dần. */
    private die(away: number) {
        this.dead = true;
        if (!this.big) Achievements.addBirdKill();
        this.clearStars();
        Sound.play('enemy_die');
        // Nổ ở giữa thân: quái nhỏ tia nổ vàng, boss đầu lâu nổ to (gắn vào lớp Gameplay để không mất theo xác)
        const parent = this.node.parent;
        if (parent) {
            const p0 = this.node.position;
            if (this.big) DustPuff.spawn(BOSS_DEATH, parent, p0.x, p0.y + this.targetHeight * 0.5, { scale: 10.5, fps: 12, center: true });
            else DustPuff.spawn(ENEMY_DEATH, parent, p0.x, p0.y + this.targetHeight * 0.5, { scale: 3.9, fps: 16, center: true });
        }
        const v = this.visual ?? this.node;
        const fade = v.getComponent(UIOpacity) ?? v.addComponent(UIOpacity);
        const p = this.node.position;
        tween(this.node)
            .to(0.35, { position: new Vec3(p.x + away * 140, p.y + 40, p.z) }, { easing: 'quadOut' })
            .start();
        tween(v)
            .to(0.35, { angle: -away * 75 })
            .start();
        tween(fade)
            .delay(0.25)
            .to(0.25, { opacity: 0 })
            .call(() => this.node.destroy())
            .start();
    }
}
