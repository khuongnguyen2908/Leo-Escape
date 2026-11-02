import { _decorator, Color, Component, Node, Rect, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { overlaps } from '../core/Box';
import { Hittable, registerHittable, unregisterHittable } from '../core/Hittable';
import { PlatformerBody } from '../core/PlatformerBody';
import { GameManager } from '../game/GameManager';
const { ccclass, property, requireComponent } = _decorator;

const _player = new Rect();
const _self = new Rect();
const HIT_TINT = new Color(255, 120, 120, 255);

/**
 * Kẻ địch đi tuần qua lại, quay đầu khi đụng tường hoặc tới mép vực.
 * Mèo đạp lên đầu thì mất máu, chạm ngang thì mèo bị đánh.
 * Boss dùng chung script này: tăng hp, targetHeight, speed.
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

    @property
    hp = 1;

    @property({ tooltip: 'Đạp lên đầu được không' })
    stompable = true;

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
    private dead = false;

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
        if (this.dead) return;
        const b = this.body;
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
        this.checkPlayer(dt);
    }

    private groundAhead(): boolean {
        const r = this.body.getRect(_self);
        const x = this.dir > 0 ? r.xMax + 4 : r.xMin - 4;
        return PlatformerBody.hasGroundAt(x, r.yMin);
    }

    private animate(dt: number) {
        this.animTime += dt;
        const v = this.visual;
        if (!v) return;
        const frames = this.walkFrames;
        if (this.sprite && frames.length > 1) {
            this.sprite.spriteFrame = frames[Math.floor(this.animTime * this.walkFps) % frames.length];
        }
        const hop = Math.abs(Math.sin(this.animTime * this.walkFps * Math.PI));
        const flip = this.dir * (this.artFacesRight ? 1 : -1);
        v.setScale(this.baseScale * flip * (1 + 0.04 * hop), this.baseScale * (1 - 0.04 * hop), 1);
        v.setPosition(0, hop * 6, 0);
        if (this.sprite) this.sprite.color = this.hitCooldown > 0 && Math.floor(this.animTime * 16) % 2 === 0 ? HIT_TINT : Color.WHITE;
    }

    private checkPlayer(dt: number) {
        if (this.hitCooldown > 0) {
            this.hitCooldown -= dt;
            return;
        }
        const gm = GameManager.instance;
        const player = gm?.player;
        if (!player) return;
        const pr = player.body.getRect(_player);
        const er = this.body.getRect(_self);
        if (!overlaps(pr, er)) return;

        const stomp = this.stompable && player.body.velocity.y < 0 && pr.yMin > er.yMin + er.height * 0.5;
        if (stomp) {
            player.bounce();
            this.takeHit();
        } else {
            gm.hurtPlayer(this.node.position.x);
        }
    }

    takeHit() {
        this.hp--;
        this.hitCooldown = 0.35;
        if (this.hp <= 0) this.die();
    }

    private die() {
        this.dead = true;
        const v = this.visual ?? this.node;
        const s = v.scale;
        const fade = v.getComponent(UIOpacity) ?? v.addComponent(UIOpacity);
        tween(v)
            .to(0.1, { scale: new Vec3(s.x * 1.35, s.y * 0.3, 1) })
            .start();
        tween(fade)
            .delay(0.25)
            .to(0.25, { opacity: 0 })
            .call(() => this.node.destroy())
            .start();
    }
}
