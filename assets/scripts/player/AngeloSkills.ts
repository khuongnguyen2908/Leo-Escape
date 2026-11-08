import { _decorator, Color, Component, Label, Node, Rect } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { Hittable, Hittables } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { CatSkills } from './CatSkills';
import { Carryable } from './LeoSkills';
import { PlayerController } from './PlayerController';
import { SkillFx, YARN } from './SkillFx';
import { YarnRope } from './YarnRope';
const { ccclass, property } = _decorator;

const _me = new Rect();
const _hit = new Rect();
const _o = new Rect();
const ZZ = new Color(230, 236, 255, 255);

type State = 'none' | 'anchored' | 'carried' | 'thrown' | 'rope';

/**
 * Kỹ năng của Angelo (mèo ốm, nhẹ, đồ nghề duy nhất là dây len):
 *  - Nhảy thêm 1 lần trên không. Bám tường: đang bay mà đẩy vào tường thì trượt chậm xuống, Nhảy để bật ra.
 *  - Đánh (J): QUẤT DÂY LEN, đánh xa hơn Leo.
 *  - Bấm Kỹ năng (K): TRÓI CHÂN kẻ địch gần nhất, nó đứng yên vài giây. Giữ K: NẰM LÌ / đứng dậy
 *    (nặng như cục đá, không bị bê; đổi mèo thì nằm lại tại chỗ).
 *  - Tương tác (L) ở mép bục cao: THẢ DÂY xuống cho Leo leo lên. Bấm L / Nhảy / đi để kéo dây lên.
 *  - Bị Leo bê: bấm Nhảy để thoát. Bị ném: cuộn tròn bay, Nhảy giữa chừng để nhảy tiếp.
 * GameManager tự gắn khi bắt đầu chơi; số liệu chỉnh ở đây.
 */
@ccclass('AngeloSkills')
export class AngeloSkills extends Component implements CatSkills, Carryable {
    @property({ tooltip: 'Số lần nhảy thêm khi đang bay' })
    airJumps = 1;

    @property({ tooltip: 'Bám tường: tốc độ trượt xuống tối đa' })
    wallSlideSpeed = 170;

    @property({ tooltip: 'Nhảy bật tường: văng ngang bao nhanh' })
    wallJumpSpeed = 620;

    @property({ tooltip: 'Tầm quất dây len' })
    whipRange = 360;

    @property({ tooltip: 'Tầm trói chân' })
    bindRange = 480;

    @property({ tooltip: 'Trói chân bao lâu (giây). Boss bị trói ngắn hơn' })
    bindTime = 2;

    @property({ tooltip: 'Giữ Kỹ năng bao lâu (giây) thì nằm lì / đứng dậy' })
    anchorHold = 0.45;

    private cat!: PlayerController;
    private state: State = 'none';
    private airLeft = 1;
    private wallSide = 0;
    private wallTimer = 0;
    private skillDown = 0;
    private anchorToggled = false;
    private rope: YarnRope | null = null;
    private thrownTime = 0;
    private zz: Label | null = null;
    private time = 0;

    setup(cat: PlayerController, _partner: () => PlayerController | null) {
        this.cat = cat;
        this.airLeft = this.airJumps;
    }

    get canDash() { return false; }
    get staying() { return this.state === 'anchored' || this.state === 'rope'; }
    get busy() { return this.state === 'carried' || this.state === 'thrown'; }
    get carried() { return this.state === 'carried'; }
    get canBeCarried() { return this.state === 'none' && !this.cat.downed; }

    pickUp() {
        this.removeRope();
        this.state = 'carried';
        this.cat.visual?.setSpin(false);
    }

    drop(vx: number, vy: number, thrown: boolean) {
        this.state = thrown ? 'thrown' : 'none';
        this.cat.body.velocity.set(vx, vy);
        this.cat.pushLock = thrown ? 0.6 : 0;
        this.thrownTime = 0;
        this.cat.visual?.setSpin(thrown);
    }

    bounced() {
        this.airLeft = this.airJumps;
    }

    update(dt: number) {
        // Chữ "z z" bay lên khi nằm lì
        this.time += dt;
        if (this.zz) {
            const on = this.state === 'anchored';
            this.zz.node.active = on;
            if (on) this.zz.node.setPosition(30 + Math.sin(this.time * 2) * 8, 150 + (this.time * 30) % 40, 0);
        }
    }

    control(dt: number, canControl: boolean): boolean {
        const c = this.cat, b = c.body, ctl = c.controls;
        if (b.grounded && this.state !== 'thrown') this.airLeft = this.airJumps;

        // Kỹ năng: bấm nhanh = trói chân, giữ = nằm lì / đứng dậy
        if (canControl && (this.state === 'none' || this.state === 'anchored') && ctl.consumeSkill()) {
            this.skillDown = 0.0001;
            this.anchorToggled = false;
        }
        if (this.skillDown > 0) {
            if (ctl.skillHeld) {
                this.skillDown += dt;
                if (!this.anchorToggled && this.skillDown >= this.anchorHold) {
                    this.anchorToggled = true;
                    this.toggleAnchor();
                }
            } else {
                if (!this.anchorToggled && this.state === 'none') this.bind();
                this.skillDown = 0;
            }
        }

        switch (this.state) {
            case 'carried':
                if (canControl && ctl.consumeJump()) {
                    this.state = 'none';
                    c.startJump(c.jumpSpeed * 0.85);
                    return false;
                }
                b.velocity.set(0, 0);
                c.visual?.sync(true, 0, 0, c.facing, c.invincible > 0);
                return true;
            case 'thrown':
                this.thrownTime += dt;
                if (canControl && this.airLeft > 0 && ctl.consumeJump()) {
                    this.endThrow();
                    this.airLeft--;
                    c.startJump(c.jumpSpeed * 0.85);
                    return false;
                }
                b.gravityScale = 1;
                b.move(dt);
                c.visual?.sync(false, 0, b.velocity.y, c.facing, c.invincible > 0);
                if ((b.grounded && this.thrownTime > 0.1) || b.hitLeft || b.hitRight || this.thrownTime > 1.6) {
                    this.endThrow();
                    c.visual?.playLand(0.6);
                }
                return true;
            case 'anchored':
                this.holdStill(dt);
                return true;
            case 'rope':
                if (canControl && (ctl.consumeInteract() || ctl.consumeJump() || ctl.left || ctl.right)) {
                    this.removeRope();
                    this.state = 'none';
                    return false;
                }
                this.holdStill(dt);
                return true;
        }

        if (canControl && b.grounded && ctl.consumeInteract()) this.tryRope();
        return false;
    }

    attack(): boolean {
        if (this.state !== 'none') return true;
        const c = this.cat;
        const r = c.body.getRect(_me);
        const cx = r.x + r.width / 2, cy = r.y + r.height * 0.6;
        const tipX = cx + c.facing * this.whipRange;
        _hit.set(Math.min(cx, tipX), cy - 70, this.whipRange, 140);
        let hits = 0;
        for (const h of Hittables.slice()) {
            if (!h.canBeHit) continue;
            const e = h.getHitRect(_o);
            if (e.xMax < _hit.xMin || e.xMin > _hit.xMax || e.yMax < _hit.yMin || e.yMin > _hit.yMax) continue;
            h.takeHit(c.node.position.x, 0.8, 1);
            hits++;
        }
        const parent = c.node.parent;
        if (parent) SkillFx.line(parent, cx, cy, tipX, cy + 10);
        c.visual?.playAttack();
        Sound.play('slash1', 0.6);
        if (hits > 0) {
            Sound.play('hit', 0.8);
            HitStop.trigger(40);
            CameraRig.instance?.shake(6, 0.1);
        }
        return true;
    }

    airJump(): boolean {
        if (this.state !== 'none') return false;
        const c = this.cat, b = c.body;
        const parent = c.node.parent;
        const p = c.node.position;
        if (this.wallTimer > 0) {
            // Nhảy bật tường: văng ra ngược phía tường
            b.velocity.x = -this.wallSide * this.wallJumpSpeed;
            c.pushLock = 0.18;
            c.facing = -this.wallSide;
            c.startJump(c.jumpSpeed * 0.95);
            this.wallTimer = 0;
            if (parent) SkillFx.ring(parent, p.x + this.wallSide * 30, p.y + 60, 50, YARN, 0.2, 0);
            return true;
        }
        if (this.airLeft > 0) {
            this.airLeft--;
            c.startJump(c.jumpSpeed * 0.85);
            if (parent) SkillFx.ring(parent, p.x, p.y, 70, YARN, 0.25, 4);
            return true;
        }
        return false;
    }

    beforeMove(dt: number) {
        if (this.state !== 'none') return;
        const c = this.cat, b = c.body, ctl = c.controls;
        const pressingIn = (b.hitLeft && ctl.left) || (b.hitRight && ctl.right);
        if (!b.grounded && pressingIn && b.velocity.y < 0) {
            // Bám tường: trượt chậm xuống, được nhảy lại
            this.wallSide = b.hitLeft ? -1 : 1;
            this.wallTimer = 0.15;
            // Tắt trọng lực khi đang bám, nếu không thì sau khi giới hạn vẫn bị trọng lực kéo nhanh thêm
            b.velocity.y = Math.max(b.velocity.y - 600 * dt, -this.wallSlideSpeed);
            b.gravityScale = 0;
            this.airLeft = this.airJumps;
        } else {
            this.wallTimer -= dt;
        }
    }

    interrupt() {
        this.removeRope();
        if (this.state === 'anchored' || this.state === 'rope') {
            this.cat.visual?.setLying(false);
            this.state = 'none';
        }
        if (this.state === 'carried') this.state = 'none';
    }

    // ---------- Trói chân ----------

    private bind() {
        const c = this.cat;
        const r = c.body.getRect(_me);
        const cx = r.x + r.width / 2, cy = r.y + r.height * 0.6;
        // Kẻ địch gần nhất, ưu tiên phía trước mặt
        let best: Hittable | null = null;
        let bestScore = Infinity;
        for (const h of Hittables) {
            if (!h.canBeHit || !h.bind) continue;
            const e = h.getHitRect(_o);
            const ex = e.x + e.width / 2;
            const dist = Math.abs(ex - cx);
            if (dist > this.bindRange || Math.abs(e.y + e.height / 2 - cy) > 220) continue;
            const score = dist + (Math.sign(ex - cx) === c.facing ? 0 : 200);
            if (score < bestScore) {
                bestScore = score;
                best = h;
            }
        }
        const parent = c.node.parent;
        if (!best) {
            // Không có ai trong tầm: dây vụt ra rồi thu về, không tốn năng lượng
            if (parent) SkillFx.line(parent, cx, cy, cx + c.facing * 160, cy - 10, YARN, 0.2, 5);
            return;
        }
        const e = best.getHitRect(_o);
        if (parent) SkillFx.line(parent, cx, cy, e.x + e.width / 2, e.y + 20, YARN, 0.3, 6);
        best.bind!(this.bindTime);
        c.facing = e.x + e.width / 2 >= cx ? 1 : -1;
        c.visual?.playAttack();
        Sound.play('slash1', 0.6);
    }

    // ---------- Nằm lì ----------

    private toggleAnchor() {
        const c = this.cat;
        if (this.state === 'anchored') {
            this.state = 'none';
            c.visual?.setLying(false);
            Sound.play('jump', 0.4);
        } else if (this.state === 'none' && c.body.grounded) {
            this.state = 'anchored';
            c.visual?.setLying(true);
            if (!this.zz) this.zz = this.makeZz();
            Sound.play('land', 0.5);
        }
    }

    private holdStill(dt: number) {
        const c = this.cat, b = c.body;
        b.velocity.x = 0;
        b.gravityScale = 1;
        b.move(dt);
        c.visual?.sync(b.grounded, 0, b.velocity.y, c.facing, c.invincible > 0);
    }

    private makeZz(): Label {
        const n = new Node('Zz');
        n.layer = this.node.layer;
        this.node.addChild(n);
        const l = n.addComponent(Label);
        l.string = 'z z Z';
        l.fontSize = 34;
        l.lineHeight = 40;
        l.isBold = true;
        l.color = ZZ;
        l.enableOutline = true;
        l.outlineWidth = 4;
        l.outlineColor = new Color(60, 70, 110, 255);
        return l;
    }

    // ---------- Thả dây ----------

    /** Đứng ở mép bục cao, quay mặt ra ngoài: thả dây len xuống tới đất phía dưới. */
    private tryRope() {
        const c = this.cat;
        const r = c.body.getRect(_me);
        const dir = c.facing;
        const edgeX = dir > 0 ? r.xMax + 34 : r.xMin - 34;
        if (this.groundTop(edgeX, r.yMin + 4) !== null && Math.abs(this.groundTop(edgeX, r.yMin + 4)! - r.yMin) < 8) return; // chưa tới mép
        const bottom = this.groundTop(edgeX, r.yMin - 10);
        if (bottom === null || r.yMin - bottom < 160) return; // bên dưới không đủ sâu
        const parent = c.node.parent;
        if (!parent) return;
        this.rope = YarnRope.spawn(parent, edgeX, r.yMin, bottom, -dir);
        this.state = 'rope';
        c.visual?.playAttack();
        Sound.play('drop', 0.7);
    }

    /**
     * Mặt trên cao nhất của nền đặc có bề ngang phủ qua x, thấp hơn hoặc bằng y. null nếu không có.
     * Bỏ qua bục một chiều (bàn, thùng, ghế) để dây thả xuống tới mặt đất thật.
     */
    private groundTop(x: number, y: number): number | null {
        let best: number | null = null;
        for (const s of Solid.all) {
            if (s.oneWay) continue;
            const o = s.getRect(_o);
            if (x > o.xMin && x < o.xMax && o.yMax <= y && (best === null || o.yMax > best)) best = o.yMax;
        }
        return best;
    }

    private removeRope() {
        if (this.rope && this.rope.isValid) this.rope.remove();
        this.rope = null;
    }

    private endThrow() {
        this.state = 'none';
        this.cat.pushLock = 0;
        this.cat.visual?.setSpin(false);
    }
}
