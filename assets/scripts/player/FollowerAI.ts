import { Rect } from 'cc';
import { Hittables } from '../core/Hittable';
import { PlatformerBody } from '../core/PlatformerBody';
import { PlayerController } from './PlayerController';
import { Controls } from './PlayerInput';

const _me = new Rect();
const _hit = new Rect();

/**
 * "Tay chơi máy" cho con mèo đi theo khi chơi 1 người: đóng vai bộ phím (Controls) của con đó.
 * Đi sau lưng con đang điều khiển, tự nhảy lên bục / qua hố / qua tường, tự xuống bục, tự chém địch ở gần.
 * Không lướt chém, không dùng kỹ năng, không tương tác (không kéo dậy, không bê đồ).
 * Bị kẹt hoặc tụt lại quá xa thì gọi onTeleport (GameManager cho hoá linh hồn bay tới cạnh người chơi).
 * GameManager tạo và gọi think() mỗi frame.
 */
export class FollowerAI implements Controls {
    /** Con đang được người chơi điều khiển, để đi theo. */
    leader: PlayerController | null = null;
    /** Đứng sau lưng con đang điều khiển bao xa. */
    followGap = 150;
    /** Cách xa hơn khoảng này (ngang hoặc dọc) thì dịch chuyển tới. */
    teleportDistance = 1500;
    /** Thấy địch trong khoảng này (ngang) thì quay lại chém. */
    attackRange = 210;
    onTeleport: (() => void) | null = null;

    private dir = 0;
    private jumpQueued = false;
    private jumpHold = 0;
    private jumpCooldown = 0;
    private attackQueued = false;
    private attackCooldown = 0;
    private upQueued = false;
    private downQueued = false;
    private climbWait = 0;
    private stuckTime = 0;
    private lastX = NaN;

    constructor(private readonly me: PlayerController) {}

    get left() { return this.dir < 0; }
    get right() { return this.dir > 0; }
    get down() { return false; }
    get upHeld() { return false; }
    get jumpHeld() { return this.jumpHold > 0; }
    get attackHeld() { return false; }
    get interactHeld() { return false; }
    get skillHeld() { return false; }
    consumeJump() { return this.take('jumpQueued'); }
    consumeAttack() { return this.take('attackQueued'); }
    consumeUp() { return this.take('upQueued'); }
    consumeDown() { return this.take('downQueued'); }
    consumeSkill() { return false; }
    consumeInteract() { return false; }
    consumeUse() { return false; }
    consumeSwap() { return false; }

    /** Quên mọi việc đang dở (khi vừa đổi vai, vừa dịch chuyển). */
    reset() {
        this.dir = 0;
        this.jumpQueued = this.attackQueued = this.upQueued = this.downQueued = false;
        this.jumpHold = this.climbWait = this.stuckTime = 0;
        this.lastX = NaN;
    }

    think(dt: number) {
        const me = this.me, leader = this.leader;
        this.jumpHold -= dt;
        this.jumpCooldown -= dt;
        this.attackCooldown -= dt;
        if (!leader || me.downed || !me.controlEnabled) {
            this.dir = 0;
            return;
        }
        // Đang nằm lì / nằm làm đệm / giữ dây thì ở yên; đang bị bê, bị ném, leo dây thì để yên cho xong
        if (me.skills?.staying || me.skills?.busy) {
            this.dir = 0;
            this.lastX = NaN;
            return;
        }
        const b = me.body;
        const mp = me.node.position, lp = leader.node.position;
        const dx = lp.x - mp.x, dy = lp.y - mp.y;

        if (Math.abs(dx) > this.teleportDistance || Math.abs(dy) > 900) {
            this.teleport();
            return;
        }

        // Có địch gần: quay mặt về phía nó rồi chém
        const enemy = this.nearestEnemy();
        if (enemy) {
            const side = enemy.x >= mp.x ? 1 : -1;
            if (me.facing !== side || enemy.gap > me.attackRange * 0.75) this.dir = side; // quay lại / bước tới cho vừa tầm
            else {
                this.dir = 0;
                if (this.attackCooldown <= 0) {
                    this.attackQueued = true;
                    this.attackCooldown = 0.38;
                }
            }
            this.lastX = mp.x;
            return;
        }

        // Đi tới chỗ sau lưng con đang điều khiển (có khoảng chết để không lắc qua lắc lại)
        const diff = lp.x - leader.facing * this.followGap - mp.x;
        if (Math.abs(diff) > 70) this.dir = diff > 0 ? 1 : -1;
        else if (Math.abs(diff) < 25) this.dir = 0;

        if (b.grounded) {
            const r = b.getRect(_me);
            // Phía trước là hố: con kia ở bên kia hố thì nhảy qua, không thì dừng lại
            if (this.dir !== 0) {
                const ax = this.dir > 0 ? r.xMax + 24 : r.xMin - 24;
                if (!PlatformerBody.hasGroundAt(ax, r.yMin)) {
                    if (Math.sign(dx) === this.dir && Math.abs(dx) > 120) this.jump();
                    else this.dir = 0;
                }
            }
            // Đụng tường thì nhảy qua
            if ((this.dir < 0 && b.hitLeft) || (this.dir > 0 && b.hitRight)) this.jump();
            // Con kia đứng cao hơn: thử đi lên bục (như phím W), chưa lên được thì nhảy
            if (dy > 80 && Math.abs(dx) < 450 && leader.body.grounded) {
                if (this.climbWait <= 0) {
                    this.upQueued = true;
                    this.climbWait = 0.35;
                } else {
                    this.climbWait -= dt;
                    if (this.climbWait <= 0) this.jump();
                }
            } else {
                this.climbWait = 0;
            }
            // Con kia thấp hơn mà mình đang đứng trên bục một chiều: bước xuống
            if (dy < -80 && b.groundSolid?.oneWay && Math.abs(dx) < 320) this.downQueued = true;
        }

        // Đang muốn đi mà không nhúc nhích: thử nhảy, kẹt lâu thì dịch chuyển
        if (this.dir !== 0 && !isNaN(this.lastX) && Math.abs(mp.x - this.lastX) < 0.5) this.stuckTime += dt;
        else this.stuckTime = 0;
        if (this.stuckTime > 1.2 && b.grounded) this.jump();
        if (this.stuckTime > 3) this.teleport();
        this.lastX = mp.x;
    }

    private jump() {
        if (this.jumpCooldown > 0 || !this.me.body.grounded) return;
        this.jumpQueued = true;
        this.jumpHold = 0.42; // giữ nút đủ lâu để nhảy hết sức
        this.jumpCooldown = 0.55;
    }

    private teleport() {
        this.reset();
        this.onTeleport?.();
    }

    /** Kẻ địch gần nhất còn đánh được trong tầm: tâm x và khoảng hở ngang tới nó; null nếu không có. */
    private nearestEnemy(): { x: number; gap: number } | null {
        const r = this.me.body.getRect(_me);
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        let best: { x: number; gap: number } | null = null;
        let bestD = Infinity;
        for (const h of Hittables) {
            if (!h.canBeHit) continue;
            const e = h.getHitRect(_hit);
            const ex = e.x + e.width / 2;
            const gapX = Math.max(0, Math.abs(ex - cx) - e.width / 2);
            const gapY = Math.abs(e.y + e.height / 2 - cy) - e.height / 2;
            if (gapX > this.attackRange || gapY > 120) continue;
            if (gapX < bestD) {
                bestD = gapX;
                best = { x: ex, gap: gapX };
            }
        }
        return best;
    }

    private take(key: 'jumpQueued' | 'attackQueued' | 'upQueued' | 'downQueued'): boolean {
        const v = this[key];
        this[key] = false;
        return v;
    }
}
