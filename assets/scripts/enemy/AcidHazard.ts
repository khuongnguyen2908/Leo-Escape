import { _decorator, Component, Node, Rect } from 'cc';
import { overlaps } from '../core/Box';
import { GameManager } from '../game/GameManager';
import { DustPuff } from '../player/DustPuff';
const { ccclass } = _decorator;

const _zone = new Rect();
const _cat = new Rect();

/** Tuỳ chọn một vùng axit. */
export interface AcidOptions {
    /** Phóng to ảnh */
    scale: number;
    /** Khung/giây */
    fps: number;
    /** true: (x, y) là giữa hình; false: (x, y) là đáy hình (mặt đất) */
    center?: boolean;
    /** Gây đòn từ khung thứ mấy tới khung thứ mấy (đếm từ 0) */
    fromFrame: number;
    toFrame: number;
    /** Vùng gây đòn: rộng, cao, đáy vùng cách (x, y) bao nhiêu theo chiều dọc */
    w: number;
    h: number;
    dy?: number;
    /** Hết boss (bị hạ) thì axit thôi gây đòn */
    alive?: () => boolean;
}

/**
 * Một vùng axit của boss (bom axit, cột lửa xanh, vũng nổ): chạy ảnh một lượt, trong khoảng khung fromFrame → toFrame
 * mèo nào chạm vùng gây đòn thì trúng độc (GameManager.acidHit). Các khung trước đó là cảnh báo, không gây đòn.
 */
@ccclass('AcidHazard')
export class AcidHazard extends Component {
    private opt!: AcidOptions;
    private time = 0;
    private life = 1;

    static spawn(parent: Node, prefix: string, x: number, y: number, opt: AcidOptions): AcidHazard | null {
        const frames = DustPuff.frames(prefix);
        if (frames.length === 0) return null;
        const n = new Node('Acid');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x, y, 0);
        DustPuff.spawn(prefix, n, 0, 0, { scale: opt.scale, fps: opt.fps, center: !!opt.center });
        const h = n.addComponent(AcidHazard);
        h.opt = opt;
        h.life = frames.length / opt.fps + 0.05;
        return h;
    }

    update(dt: number) {
        this.time += dt;
        const o = this.opt;
        const frame = this.time * o.fps;
        const alive = o.alive ? o.alive() : true;
        const gm = GameManager.instance;
        if (alive && gm && frame >= o.fromFrame && frame < o.toFrame + 1) {
            const p = this.node.position;
            _zone.set(p.x - o.w / 2, p.y + (o.dy ?? 0), o.w, o.h);
            for (const c of gm.cats) {
                if (overlaps(c.body.getRect(_cat), _zone)) gm.acidHit(c);
            }
        }
        if (this.time >= this.life) this.node.destroy();
    }
}
