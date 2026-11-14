import { _decorator, Color, Component, Graphics, Rect, Size, tween, UIOpacity, Vec2 } from 'cc';
import { EDITOR } from 'cc/env';
import { Hittable, registerHittable, unregisterHittable } from '../core/Hittable';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { HitSpark } from '../player/HitSpark';
const { ccclass, property, executeInEditMode } = _decorator;

const CONCRETE = new Color(128, 132, 128, 255);
const CONCRETE_HIT = new Color(170, 174, 168, 255);
const SEAM = new Color(104, 108, 104, 255);
const CRACK = new Color(40, 40, 44, 255);
/** Cùng màu vách đất của kênh (MapThuBuilder C.earth) */
const EARTH = new Color(83, 77, 83, 255);

/**
 * Tường giả (map thử): trông như vách bê tông thường, chặn đường như khối cứng. Chém trúng (chém, sóng kiếm, quét chân...)
 * thì nứt dần; đủ Hits nhát thì vỡ: hết chặn, mờ dần rồi ẩn, lộ chỗ giấu phía sau (cửa bí mật).
 * Gốc node = mép trái, mặt trên (như MapBlock). Node nằm trong MapThu (gốc 0, 0) hoặc thẳng trong Gameplay.
 */
@ccclass('FakeWall')
@executeInEditMode
export class FakeWall extends Component implements Hittable {
    @property({ tooltip: 'Bề ngang tường' })
    width = 120;
    @property({ tooltip: 'Chiều cao tường (từ mặt trên xuống)' })
    height = 680;
    @property({ tooltip: 'Chém bao nhiêu nhát thì vỡ' })
    hits = 3;
    @property({ tooltip: 'Che luôn chỗ giấu bên trái tường (bề ngang) bằng màu đất, vỡ tường thì lộ ra. 0 = không che' })
    coverLeft = 0;

    private g: Graphics | null = null;
    private solid: Solid | null = null;
    private taken = 0;
    private cooldown = 0;
    private flash = 0;
    private broken = false;

    get canBeHit() { return !this.broken && this.cooldown <= 0; }
    get big() { return true; }

    setup(width: number, height: number, hits: number, coverLeft = 0) {
        this.width = width;
        this.height = height;
        this.hits = hits;
        this.coverLeft = coverLeft;
        this.redraw();
    }

    onLoad() {
        this.redraw();
    }

    onEnable() {
        if (!EDITOR) registerHittable(this);
    }

    onDisable() {
        if (!EDITOR) unregisterHittable(this);
    }

    getHitRect(out: Rect): Rect {
        const p = this.node.position;
        return out.set(p.x, p.y - this.height, this.width, this.height);
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        const solids = this.getComponents(Solid);
        for (let i = 1; i < solids.length; i++) solids[i].destroy();
        this.solid = solids[0] ?? this.addComponent(Solid);
        this.solid.size = new Size(this.width, this.height);
        this.solid.offset = new Vec2(this.width / 2, -this.height / 2);
        this.solid.enabled = !this.broken;
        this.g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        this.draw();
    }

    update(dt: number) {
        if (EDITOR) return;
        if (this.cooldown > 0) this.cooldown -= dt;
        if (this.flash > 0) {
            this.flash -= dt;
            // Rung nhẹ khi bị chém: chỉ dời hình, không dời khung va chạm
            this.drawAt(this.flash > 0 ? Math.sin(this.flash * 90) * 6 : 0);
        }
    }

    takeHit(fromX?: number, power = 1) {
        if (this.broken) return;
        this.cooldown = 0.15;
        this.taken++;
        this.flash = 0.15;
        this.draw();
        const p = this.node.position;
        const dir = fromX === undefined ? 1 : (fromX < p.x + this.width / 2 ? 1 : -1);
        const parent = this.node.parent;
        if (parent) HitSpark.spawn(parent, dir > 0 ? p.x : p.x + this.width, p.y - this.height * 0.75, dir, power > 1.5);
        if (this.taken >= this.hits) this.crumble();
        else Sound.play('hit', 0.7);
    }

    trip(_s: number, fromX?: number) { this.takeHit(fromX, 1.6); }

    /** Vỡ: hết chặn, mờ dần rồi ẩn */
    private crumble() {
        this.broken = true;
        if (this.solid) this.solid.enabled = false;
        Sound.play('boss_charge_stun', 0.8);
        const op = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        tween(op).to(0.5, { opacity: 0 }).call(() => { if (this.g) this.g.enabled = false; }).start();
    }

    private draw() {
        this.drawAt(0);
    }

    /** Vách bê tông có mạch ngang; mỗi nhát chém thêm vết nứt từ giữa toả ra */
    private drawAt(dx: number) {
        const g = this.g;
        if (!g) return;
        g.clear();
        const w = this.width, h = this.height;
        // Lớp đất che chỗ giấu (hốc, cửa bí mật) phía sau tường: không rung, mờ cùng tường khi vỡ
        if (this.coverLeft > 0) {
            g.fillColor = EARTH;
            // Dư 12 xuống dưới chân để che cả viền đáy của cửa (cửa vẽ lấn xuống mặt gờ một chút)
            g.rect(-this.coverLeft, -h - 12, this.coverLeft, h + 12);
            g.fill();
        }
        g.fillColor = this.flash > 0 ? CONCRETE_HIT : CONCRETE;
        g.rect(dx, -h, w, h);
        g.fill();
        g.strokeColor = SEAM;
        g.lineWidth = 4;
        for (let y = -100; y > -h; y -= 110) {
            g.moveTo(dx, y);
            g.lineTo(dx + w, y);
        }
        g.stroke();
        if (this.taken <= 0) return;
        const cx = dx + w / 2, cy = -h * 0.75;
        g.strokeColor = CRACK;
        g.lineWidth = 5;
        const arms = [[-0.9, 0.5], [0.8, 0.7], [-0.5, -1], [0.6, -0.9], [-1, -0.2], [1, 0.1]];
        const n = Math.min(arms.length, this.taken * 2);
        for (let i = 0; i < n; i++) {
            const [ax, ay] = arms[i];
            g.moveTo(cx, cy);
            g.lineTo(cx + ax * w * 0.3, cy + ay * 60);
            g.lineTo(cx + ax * w * 0.5, cy + ay * 120);
        }
        g.stroke();
    }
}
