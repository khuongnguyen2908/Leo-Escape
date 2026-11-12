import { _decorator, Color, Component, Graphics, Rect, Size, Vec2 } from 'cc';
import { EDITOR } from 'cc/env';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
const { ccclass, property, executeInEditMode } = _decorator;

const LINE = new Color(40, 34, 30, 255);
const IRON = new Color(96, 100, 104, 255);
const IRON_LIGHT = new Color(150, 156, 160, 255);
const RUST = new Color(150, 90, 60, 255);

const _cat = new Rect();

/**
 * Song sắt nằm ngang trên sàn (đường tắt kiểu "mở từ phía bên kia"): đóng thì là sàn cứng, đứng lên được.
 * Mèo ở phía DƯỚI nhảy lên cụng đầu vào song sắt thì nó bật mở (gập sang một bên), từ đó đi lên / rơi xuống tự do.
 * Đứng phía trên thì không mở được. Gốc node = mép trái, mặt trên. Chưa ghi vào ô lưu: tải lại màn thì đóng lại.
 */
@ccclass('SongSat')
@executeInEditMode
export class SongSat extends Component {
    @property({ tooltip: 'Bề ngang song sắt' })
    width = 240;
    @property({ tooltip: 'Bề dày' })
    thickness = 24;

    private opened = false;
    private swing = 0;

    setup(width: number, thickness: number) {
        this.width = width;
        this.thickness = thickness;
        this.onLoad();
    }

    onLoad() {
        const s = this.getComponent(Solid) ?? this.addComponent(Solid);
        s.size = new Size(this.width, this.thickness);
        s.offset = new Vec2(this.width / 2, -this.thickness / 2);
        this.draw();
    }

    update(dt: number) {
        if (EDITOR) return;
        if (this.opened) {
            if (this.swing < 1) {
                this.swing = Math.min(1, this.swing + dt * 4);
                this.draw();
            }
            return;
        }
        const gm = GameManager.instance;
        if (!gm) return;
        const p = this.node.position;
        const bottom = p.y - this.thickness;
        for (const c of gm.cats) {
            const r = c.body.getRect(_cat);
            const cx = r.x + r.width / 2;
            if (cx > p.x && cx < p.x + this.width && r.yMax >= bottom - 10 && r.yMax <= bottom + 4) {
                this.open();
                break;
            }
        }
    }

    open() {
        if (this.opened) return;
        this.opened = true;
        const s = this.getComponent(Solid);
        if (s) s.enabled = false;
        Sound.play('ui_door');
    }

    private draw() {
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.lineJoin = Graphics.LineJoin.ROUND;
        const w = this.width, t = this.thickness;
        if (this.opened) {
            // Bản lề bên phải: song sắt gập dựng lên dần (swing 0 → 1)
            const a = this.swing * Math.PI / 2;
            const L = w - 10;
            const hx = w, hy = -t / 2;
            const ex = hx - Math.cos(a) * L, ey = hy + Math.sin(a) * L;
            g.strokeColor = LINE;
            g.lineWidth = t * 0.9 + 6;
            g.moveTo(hx, hy);
            g.lineTo(ex, ey);
            g.stroke();
            g.strokeColor = IRON;
            g.lineWidth = t * 0.9;
            g.moveTo(hx, hy);
            g.lineTo(ex, ey);
            g.stroke();
            g.fillColor = RUST;
            g.circle(hx, hy, 9);
            g.fill();
            return;
        }
        // Khung
        g.fillColor = LINE;
        g.rect(0, -t, w, t);
        g.fill();
        // Thanh sắt
        const n = Math.max(4, Math.round(w / 26));
        for (let i = 0; i < n; i++) {
            const x = 8 + i * (w - 22) / (n - 1);
            g.fillColor = IRON;
            g.rect(x, -t + 4, 7, t - 8);
            g.fill();
            g.fillColor = IRON_LIGHT;
            g.rect(x, -t + 4, 2, t - 8);
            g.fill();
        }
        g.strokeColor = LINE;
        g.lineWidth = 4;
        g.rect(0, -t, w, t);
        g.stroke();
        g.fillColor = RUST;
        g.circle(w - 6, -t / 2, 6);
        g.circle(6, -t / 2, 6);
        g.fill();
    }
}
