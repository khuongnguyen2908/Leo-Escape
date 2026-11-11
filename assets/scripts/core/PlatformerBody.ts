import { _decorator, Component, Rect, Size, Vec2 } from 'cc';
import { computeBox } from './Box';
import { Solid } from './Solid';
const { ccclass, property } = _decorator;

const EPS = 0.01;
/** Chân lún vào mặt bục trong khoảng này vẫn được tính là đứng trên bục */
const SINK_TOLERANCE = 12;
const _self = new Rect();
const _other = new Rect();

/**
 * Thân vật lý kiểu platformer, không dùng Box2D.
 * Di chuyển tách trục X rồi Y, quét liên tục nên không xuyên tường khi chạy nhanh.
 * Không tự chạy: script điều khiển đặt velocity rồi gọi move(dt) mỗi frame.
 * Quy ước: vị trí node là điểm giữa bàn chân, nên offset.y = size.height / 2.
 */
@ccclass('PlatformerBody')
export class PlatformerBody extends Component {
    @property({ tooltip: 'Kích thước hộp va chạm' })
    size = new Size(90, 150);

    @property({ tooltip: 'Lệch tâm hộp so với vị trí node (gốc ở chân thì y = cao / 2)' })
    offset = new Vec2(0, 75);

    @property({ tooltip: 'Trọng lực (đơn vị/giây²)' })
    gravity = 2600;

    @property({ tooltip: 'Tốc độ rơi tối đa' })
    maxFallSpeed = 1500;

    @property({ tooltip: 'Tự bước lên bậc thấp: đang đứng trên đất mà đi vào mép một khối cao hơn chân không quá chừng này thì bước lên luôn, khỏi nhảy (cầu thang). 0 = tắt' })
    stepHeight = 0;

    readonly velocity = new Vec2();
    gravityScale = 1;

    grounded = false;
    groundSolid: Solid | null = null;
    hitLeft = false;
    hitRight = false;
    hitCeiling = false;

    private dropTimer = 0;

    getRect(out: Rect): Rect {
        return computeBox(this.node, this.size, this.offset, out);
    }

    /** Rơi xuyên qua bục một chiều đang đứng trong một khoảng ngắn. */
    dropThrough(duration = 0.25) {
        this.dropTimer = duration;
    }

    move(dt: number) {
        const v = this.velocity;
        v.y = Math.max(v.y - this.gravity * this.gravityScale * dt, -this.maxFallSpeed);
        if (this.dropTimer > 0) this.dropTimer -= dt;

        const r = this.getRect(_self);

        // Trục X: chỉ bục đặc mới chặn ngang
        let dx = v.x * dt;
        let stepUp = 0;
        this.hitLeft = this.hitRight = false;
        if (dx !== 0) {
            for (const s of Solid.all) {
                if (s.oneWay) continue;
                const o = s.getRect(_other);
                if (r.yMin >= o.yMax - EPS || r.yMax <= o.yMin + EPS) continue;
                // Bậc thấp (Step Height): đang đứng trên đất và mặt khối chỉ cao hơn chân một chút thì bước lên, không chặn
                const rise = o.yMax - r.yMin;
                const ahead = dx > 0 ? (o.xMin >= r.xMax - EPS && o.xMin - r.xMax < dx) : (o.xMax <= r.xMin + EPS && o.xMax - r.xMin > dx);
                if (ahead && this.stepHeight > 0 && this.grounded && v.y <= 0 && rise > 0 && rise <= this.stepHeight) {
                    stepUp = Math.max(stepUp, rise);
                    continue;
                }
                if (dx > 0 && o.xMin >= r.xMax - EPS && o.xMin - r.xMax < dx) {
                    dx = o.xMin - r.xMax;
                    this.hitRight = true;
                } else if (dx < 0 && o.xMax <= r.xMin + EPS && o.xMax - r.xMin > dx) {
                    dx = o.xMax - r.xMin;
                    this.hitLeft = true;
                }
            }
            if (this.hitLeft || this.hitRight) v.x = 0;
        }
        r.x += dx;
        r.y += stepUp;

        // Trục Y
        let dy = v.y * dt;
        this.grounded = this.hitCeiling = false;
        this.groundSolid = null;
        for (const s of Solid.all) {
            const o = s.getRect(_other);
            if (r.xMin >= o.xMax - EPS || r.xMax <= o.xMin + EPS) continue;
            if (dy <= 0) {
                if (s.oneWay && this.dropTimer > 0) continue;
                // Chân phải đang ở trên mặt bục thì mới đáp được (bục một chiều cũng vậy).
                // Chân lún nhẹ vào mặt bục (chỉnh Offset lệch một chút) thì đẩy lên đứng trên mặt, không rơi xuyên qua
                if (o.yMax <= r.yMin + SINK_TOLERANCE && o.yMax - r.yMin >= dy) {
                    dy = o.yMax - r.yMin;
                    this.grounded = true;
                    this.groundSolid = s;
                }
            } else if (!s.oneWay && o.yMin >= r.yMax - EPS && o.yMin - r.yMax < dy) {
                dy = o.yMin - r.yMax;
                this.hitCeiling = true;
            }
        }
        if (this.grounded || this.hitCeiling) v.y = 0;

        const p = this.node.position;
        this.node.setPosition(p.x + dx, p.y + stepUp + dy, p.z);
    }

    /** Có mặt đất (bục bất kỳ) ngay tại điểm (x, y) không — dùng để kẻ địch quay đầu ở mép vực. */
    /**
     * Mặt bục một chiều thấp nhất nằm phía trên chân (cao hơn chân trong khoảng maxRise), có chiều ngang
     * phủ qua tâm hộp r. Dùng cho phím W để đi lên bục. Không có thì trả về null.
     */
    static platformAbove(r: Rect, maxRise: number): number | null {
        const cx = r.x + r.width / 2;
        let best: number | null = null;
        for (const s of Solid.all) {
            if (!s.oneWay) continue;
            const o = s.getRect(_other);
            const rise = o.yMax - r.yMin;
            if (cx > o.xMin && cx < o.xMax && rise > 10 && rise <= maxRise && (best === null || o.yMax < best)) best = o.yMax;
        }
        return best;
    }

    static hasGroundAt(x: number, y: number): boolean {
        for (const s of Solid.all) {
            const o = s.getRect(_other);
            if (x > o.xMin && x < o.xMax && Math.abs(o.yMax - y) < 6) return true;
        }
        return false;
    }
}
