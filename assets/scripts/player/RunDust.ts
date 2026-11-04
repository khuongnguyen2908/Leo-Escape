import { _decorator, Component } from 'cc';
import { DustPuff } from './DustPuff';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

/**
 * Bụi khói dưới chân mèo:
 * - Đang chạy nhanh thì một đám khói bám theo sau đuôi (lặp khói đang tung); dừng lại (hay nhảy lên, bị hạ gục) thì đám khói đứng lại và tan.
 * - Nhảy lên từ mặt đất, hoặc rơi đủ mạnh rồi đáp đất, thì tung một đám bụi dưới chân.
 * GameManager tự gắn vào Leo và Angelo; số liệu chỉnh ở đây (khi chơi, trên node Leo / Angelo).
 */
@ccclass('RunDust')
export class RunDust extends Component {
    @property({ tooltip: 'Phóng to ảnh khói chạy bao nhiêu lần (ảnh gốc nhỏ). Angelo nhỏ hơn Leo' })
    scale = 4.5;

    @property({ tooltip: 'Phóng to ảnh bụi nhảy lên / đáp đất bao nhiêu lần. Angelo nhỏ hơn Leo' })
    jumpScale = 6;

    @property({ tooltip: 'Khói chạy lùi về phía đuôi (sau lưng mèo) bao xa, tính theo bề rộng khung thân. 0 = ngay giữa chân' })
    behind = 1.1;

    @property({ tooltip: 'Phải chạy nhanh ít nhất bao lâu (giây) thì mới có khói' })
    minRunTime = 0.18;

    @property({ tooltip: 'Đáp đất mạnh cỡ nào mới tung bụi (so với tốc độ rơi tối đa, 0..1). Bằng ngưỡng kêu tiếng đáp đất' })
    landImpact = 0.3;

    @property({ tooltip: 'Tốc độ chạy khung ảnh khói (khung/giây)' })
    fps = 20;

    private cat: PlayerController | null = null;
    private runTime = 0;
    private runDir = 0;
    private puff: DustPuff | null = null;
    private wasGrounded = true;
    private airVy = 0;
    private groundX = 0;
    private groundY = 0;

    onLoad() {
        this.cat = this.getComponent(PlayerController);
        DustPuff.preload(DustPuff.RUN);
        DustPuff.preload(DustPuff.JUMP);
    }

    onDisable() {
        this.releasePuff();
    }

    update(dt: number) {
        const c = this.cat;
        if (!c) return;
        this.jumpDust();
        const b = c.body;
        const dir = Math.sign(b.velocity.x);
        const running = !c.downed && b.grounded && Math.abs(b.velocity.x) > c.moveSpeed * 0.7;
        // Dừng, nhảy, bị hạ gục hay quay đầu: khói đứng lại và tan
        if (!running || dir !== this.runDir) {
            this.releasePuff();
            this.runTime = 0;
            this.runDir = running ? dir : 0;
            if (!running) return;
        }
        this.runTime += dt;
        if (this.runTime < this.minRunTime) return;
        const parent = this.node.parent;
        if (!parent) return;
        const p = this.node.position;
        const x = p.x - this.runDir * b.size.width * this.behind;
        if (this.puff && this.puff.isValid) this.puff.node.setPosition(x, p.y, 0);
        else this.puff = DustPuff.spawn(DustPuff.RUN, parent, x, p.y, { dir: this.runDir, scale: this.scale, fps: this.fps, hold: true });
    }

    /** Nhảy lên từ mặt đất / đáp đất đủ mạnh: tung bụi dưới chân. */
    private jumpDust() {
        const c = this.cat!;
        const b = c.body;
        const p = this.node.position;
        const parent = this.node.parent;
        if (b.grounded) {
            const landed = !this.wasGrounded && -this.airVy / b.maxFallSpeed > this.landImpact;
            if (landed && !c.downed && parent) DustPuff.spawn(DustPuff.JUMP, parent, p.x, p.y, { scale: this.jumpScale, fps: this.fps });
            this.groundX = p.x;
            this.groundY = p.y;
        } else {
            // Rời đất mà đang bay lên là nhảy (bước hụt khỏi mép thì không); bụi đặt ở chỗ chân vừa rời đất
            if (this.wasGrounded && b.velocity.y > 0 && !c.downed && parent) {
                DustPuff.spawn(DustPuff.JUMP, parent, this.groundX, this.groundY, { scale: this.jumpScale, fps: this.fps });
            }
            this.airVy = b.velocity.y;
        }
        this.wasGrounded = b.grounded;
    }

    private releasePuff() {
        if (this.puff && this.puff.isValid) this.puff.release();
        this.puff = null;
    }
}
