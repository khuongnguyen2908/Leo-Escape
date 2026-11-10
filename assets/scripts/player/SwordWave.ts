import { _decorator, Component, Node, Rect } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { overlaps } from '../core/Box';
import { Hittable, Hittables } from '../core/Hittable';
import { HitStop } from '../core/HitStop';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { DustPuff } from './DustPuff';
import { HitSpark } from './HitSpark';
const { ccclass } = _decorator;

const WAVE = 'FX_wave_';
const _hit = new Rect();
const _other = new Rect();
const _wall = new Rect();

/** Tuỳ chọn khi phóng sóng kiếm. */
export interface WaveOptions {
    /** Tốc độ bay. Mặc định 1300 */
    speed?: number;
    /** Bay xa bao nhiêu rồi tan. Mặc định 1000 */
    distance?: number;
    /** Mỗi kẻ địch trúng mất bao nhiêu máu. Mặc định 2 */
    damage?: number;
    /** Phóng to ảnh. Mặc định 5.1 (cao cỡ thân Leo) */
    scale?: number;
    /** Trúng kẻ địch thì gọi (mèo cộng nộ), mỗi con một lần */
    onHit?: () => void;
    /** Bay xuyên qua kẻ địch (trúng mỗi con một lần). false = trúng con đầu tiên là tan. Mặc định false */
    pierce?: boolean;
}

/**
 * Sóng kiếm (giữ J rồi thả): lưỡi liềm bay thẳng về phía trước, trúng kẻ địch đầu tiên là tan
 * (bản xuyên mua ở cửa hàng: bay qua, trúng mỗi kẻ địch trên đường một lần),
 * đụng tường hay khối nền cứng (Solid không phải bục một chiều) thì tan.
 * Phóng bằng SwordWave.fire(...) với node cha là lớp Gameplay (chung hệ toạ độ với kẻ địch và Solid).
 */
@ccclass('SwordWave')
export class SwordWave extends Component {
    private dir = 1;
    private speed = 1300;
    private left = 1000;
    private damage = 2;
    private onHit: (() => void) | null = null;
    private pierce = false;
    private readonly hits = new Set<Hittable>();

    static preload() {
        DustPuff.preload(WAVE);
    }

    /** Phóng sóng kiếm từ (x, y) (giữa lưỡi liềm) theo hướng dir (1 phải, -1 trái). */
    static fire(parent: Node, x: number, y: number, dir: number, opt: WaveOptions = {}): SwordWave {
        const n = new Node('SwordWave');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x, y, 0);
        const w = n.addComponent(SwordWave);
        w.dir = dir >= 0 ? 1 : -1;
        w.speed = opt.speed ?? 1300;
        w.left = opt.distance ?? 1000;
        w.damage = opt.damage ?? 2;
        w.onHit = opt.onHit ?? null;
        w.pierce = !!opt.pierce;
        // Ảnh lặp suốt đường bay (chưa tải xong thì sóng vẫn đánh, chỉ không thấy hình)
        // Ô ảnh cắt lấy tâm ô gốc làm tâm, phần vẽ lệch sau và lên trên: dời lại cho lưỡi liềm nằm giữa node
        const k = (opt.scale ?? 5.1) / 5.1;
        DustPuff.spawn(WAVE, n, -64 * k * w.dir, 19 * k, { dir: w.dir, scale: opt.scale ?? 5.1, fps: 18, center: true, loopFor: w.left / w.speed + 0.1 });
        return w;
    }

    update(dt: number) {
        const step = this.speed * dt;
        const p = this.node.position;
        const x = p.x + this.dir * step;
        this.node.setPosition(x, p.y, 0);
        this.left -= step;

        // Trúng kẻ địch (mỗi con một lần)
        _hit.set(x - 110, p.y - 95, 220, 190);
        for (const h of Hittables.slice()) {
            if (this.hits.has(h) || !h.canBeHit || !overlaps(_hit, h.getHitRect(_other))) continue;
            this.hits.add(h);
            h.takeHit(x - this.dir * 200, 1.6, this.damage);
            this.onHit?.();
            const parent = this.node.parent;
            if (parent) HitSpark.spawn(parent, _other.x + _other.width / 2, p.y, this.dir, true);
            Sound.play('hit', 0.9);
            HitStop.trigger(40);
            CameraRig.instance?.shake(8, 0.12);
            if (!this.pierce) {
                this.node.destroy();
                return;
            }
        }

        // Đụng tường / khối nền cứng thì tan (hộp kiểm tra thấp hơn để không chạm mặt đất dưới chân)
        _hit.set(x - 30, p.y - 25, 60, 50);
        const wall = Solid.all.some((s) => !s.oneWay && overlaps(_hit, s.getRect(_wall)));
        if (this.left <= 0 || wall) this.node.destroy();
    }
}
