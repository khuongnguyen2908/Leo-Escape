import { _decorator, Color, Component, Graphics, Node, Rect, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { moveTowards, overlaps } from '../core/Box';
import { Hittable, registerHittable, unregisterHittable } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { Sound } from '../core/Sound';
import { PlatformerBody } from '../core/PlatformerBody';
import { GameManager } from '../game/GameManager';
import { DustPuff } from '../player/DustPuff';
const { ccclass, property, requireComponent } = _decorator;

const _player = new Rect();
const _self = new Rect();
const HIT_TINT = new Color(255, 120, 120, 255);
const HIT_SHAKE_TIME = 0.28;
const YARN = new Color(232, 92, 132, 255);

/**
 * Kẻ địch đi tuần qua lại, quay đầu khi đụng tường hoặc tới mép vực.
 * Mèo chém trúng thì mất máu và bị đẩy lùi; mèo chạm vào thì mèo bị đánh (không đạp đầu được).
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

    @property({ tooltip: 'Số nhát chém để hạ' })
    hp = 3;

    @property({ tooltip: 'Bị chém thì văng ra xa bao nhiêu (tốc độ)' })
    knockback = 380;

    @property({ tooltip: 'Bị chém thì rung giật mạnh bao nhiêu' })
    hitShake = 10;

    @property({ tooltip: 'Quay đầu ở mép vực' })
    turnAtEdges = true;

    @property({ tooltip: 'Đi tối đa bao xa quanh vị trí ban đầu (0 = không giới hạn)' })
    patrolRange = 0;

    @property({ tooltip: '-1 = đi sang trái trước, 1 = sang phải' })
    startDirection = -1;

    private body!: PlatformerBody;
    private sprite: Sprite | null = null;
    private dir = -1;
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

    /** Đánh trúng được không (còn sống và không vừa bị đánh). */
    get canBeHit() { return !this.dead && this.hitCooldown <= 0; }

    getHitRect(out: Rect): Rect {
        return this.body.getRect(out);
    }

    start() {
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
        this.checkPlayer();
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
        if (this.sprite && frames.length > 1 && this.dazed <= 0) {
            this.sprite.spriteFrame = frames[Math.floor(this.animTime * this.walkFps) % frames.length];
        }
        const hop = this.stun > 0 || this.dazed > 0 || this.airborne ? 0 : Math.abs(Math.sin(this.animTime * this.walkFps * Math.PI));
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
        const sx = 1 + 0.04 * hop + 0.22 * this.pop;
        const sy = 1 - 0.04 * hop - 0.18 * this.pop;
        v.setScale(this.baseScale * flip * sx, this.baseScale * sy, 1);
        v.setPosition(jx, hop * 6, 0);
        v.angle = ang;
        if (this.sprite) this.sprite.color = this.stun > 0 && Math.floor(this.animTime * 16) % 2 === 0 ? HIT_TINT : Color.WHITE;
    }

    /** Chạm vào con mèo nào thì con đó bị đánh, từ phía nào cũng vậy. */
    private checkPlayer() {
        const gm = GameManager.instance;
        if (!gm) return;
        const self = this.body.getRect(_self);
        for (const cat of gm.cats) {
            if (overlaps(cat.body.getRect(_player), self)) gm.hurtCat(cat, this.node.position.x);
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

    /** Bị hất tung lên cao height (boss to xác không bị hất). */
    launch(height: number) {
        if (this.dead || this.targetHeight > 250) return;
        const b = this.body;
        this.airborne = true;
        this.airTime = 0;
        this.floatTime = 0;
        this.bound = 0;
        this.dazed = 0;
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
        this.hp -= damage;
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
        this.clearStars();
        Sound.play('enemy_die');
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
