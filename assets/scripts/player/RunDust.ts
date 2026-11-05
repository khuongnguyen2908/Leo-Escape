import { _decorator, Component } from 'cc';
import { DustPuff } from './DustPuff';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

// Bộ khói pixel (cắt từ art-nguon/SmokeFX bằng tools/cat_khoi.py)
const RUN = 'FX_run_';         // chạy: bụi nâu tung về phía sau (ảnh gốc bay sang trái)
const SKID = 'FX_skid_';       // dừng lại / quay đầu: đám bụi tròn ở mũi chân
const TAKEOFF = 'FX_takeoff_'; // nhảy lên từ mặt đất, đáp đất thường: vòng bụi nhỏ
const LAND = 'FX_land_';       // đáp đất mạnh (sau nhảy 2 lần, đập bụng, rơi rất cao): vòng bụi lớn
const AIR_JUMP = 'FX_airjump_';// nhảy lần 2 trên không: vòng nổ trắng

/**
 * Bụi khói dưới chân mèo:
 * - Đang chạy nhanh: cứ mỗi nhịp tung một đám bụi nhỏ sau gót.
 * - Đang chạy mà thả phím hay quay đầu: một đám bụi tròn ở mũi chân.
 * - Nhảy lên từ mặt đất: vòng bụi nhỏ dưới chân. Đáp đất thường (nhảy 1 lần, rơi thấp): cũng vòng bụi nhỏ.
 * - Đáp đất sau khi nhảy 2 lần, sau khi đập bụng, hoặc rơi từ cao hơn Big Fall Height: vòng bụi lớn.
 * - Nhảy lần 2 trên không: vòng nổ trắng dưới chân (LeoSkills gọi airJumpPuff).
 * GameManager tự gắn vào Leo và Angelo; số liệu chỉnh ở đây (khi chơi, trên node Leo / Angelo).
 */
@ccclass('RunDust')
export class RunDust extends Component {
    @property({ tooltip: 'Phóng to ảnh bụi chạy và bụi trượt bao nhiêu lần (ảnh gốc nhỏ). Angelo nhỏ hơn Leo' })
    scale = 4.5;

    @property({ tooltip: 'Phóng to ảnh vòng bụi nhảy lên / đáp đất / nhảy lần 2 bao nhiêu lần. Angelo nhỏ hơn Leo' })
    jumpScale = 3.5;

    @property({ tooltip: 'Bụi chạy lùi về phía sau gót bao xa (đơn vị game, tính từ giữa chân)' })
    behindDistance = 38;

    @property({ tooltip: 'Bụi lúc dừng chạy nằm trước mũi chân bao xa (đơn vị game, tính từ giữa chân)' })
    skidDistance = 40;

    @property({ tooltip: 'Phải chạy nhanh ít nhất bao lâu (giây) thì mới có bụi' })
    minRunTime = 0.18;

    @property({ tooltip: 'Đang chạy thì cứ bao nhiêu giây tung một đám bụi' })
    runInterval = 0.22;

    @property({ tooltip: 'Đáp đất mạnh cỡ nào mới tung bụi (so với tốc độ rơi tối đa, 0..1). Bằng ngưỡng kêu tiếng đáp đất' })
    landImpact = 0.3;

    @property({ tooltip: 'Rơi từ cao chừng này trở lên (tính từ đỉnh cú nhảy) thì đáp đất ra vòng bụi lớn. Nhảy thường cao ~300, bậc đá 370' })
    bigFallHeight = 500;

    @property({ tooltip: 'Tốc độ chạy khung ảnh khói (khung/giây)' })
    fps = 20;

    private cat: PlayerController | null = null;
    private runTime = 0;
    private runDir = 0;
    private nextPuff = 0;
    private wasGrounded = true;
    private airVy = 0;
    private groundX = 0;
    private groundY = 0;
    private peakY = 0;
    private bigLanding = false;

    onLoad() {
        this.cat = this.getComponent(PlayerController);
        for (const p of [RUN, SKID, TAKEOFF, LAND, AIR_JUMP]) DustPuff.preload(p);
    }

    update(dt: number) {
        const c = this.cat;
        if (!c) return;
        this.jumpDust();
        const b = c.body;
        const dir = Math.sign(b.velocity.x);
        const running = !c.downed && b.grounded && Math.abs(b.velocity.x) > c.moveSpeed * 0.7;
        const want = (c.controls.right ? 1 : 0) - (c.controls.left ? 1 : 0);
        if (!running || dir !== this.runDir) {
            // Vừa chạy đủ lâu mà dừng lại hay quay đầu (vẫn đứng trên đất): bụi trượt phía trước chân
            if (this.runDir !== 0 && this.runTime >= this.minRunTime && b.grounded && !c.downed && want !== this.runDir) {
                this.skid(this.runDir);
            }
            this.runTime = 0;
            this.nextPuff = 0;
            this.runDir = running ? dir : 0;
            if (!running) return;
        }
        this.runTime += dt;
        if (this.runTime < this.minRunTime) return;
        this.nextPuff -= dt;
        if (this.nextPuff > 0) return;
        this.nextPuff = this.runInterval;
        const parent = this.node.parent;
        if (!parent) return;
        const p = this.node.position;
        const x = p.x - this.runDir * this.behindDistance;
        // Ảnh gốc bay sang trái: chạy sang phải thì giữ nguyên (bụi bay ra sau lưng)
        DustPuff.spawn(RUN, parent, x, p.y, { dir: this.runDir, scale: this.scale, fps: this.fps });
    }

    /** Nhảy lần 2 trên không: vòng nổ trắng dưới chân; lần đáp đất tới ra vòng bụi lớn. */
    airJumpPuff() {
        this.bigLanding = true;
        const parent = this.node.parent;
        if (!parent) return;
        const p = this.node.position;
        DustPuff.spawn(AIR_JUMP, parent, p.x, p.y + 10, { center: true, scale: this.jumpScale * 1.3, fps: this.fps });
    }

    /** Đập bụng (LeoSkills gọi): lần đáp đất tới ra vòng bụi lớn. */
    markBigLanding() {
        this.bigLanding = true;
    }

    /** Đám bụi tròn ngay trước mũi chân (hơi nghiêng về phía đang lao tới). */
    private skid(moving: number) {
        const parent = this.node.parent;
        if (!parent) return;
        const p = this.node.position;
        const x = p.x + moving * this.skidDistance;
        DustPuff.spawn(SKID, parent, x, p.y, { dir: -moving, scale: this.scale, fps: this.fps });
    }

    /** Nhảy lên từ mặt đất / đáp đất đủ mạnh: vòng bụi dưới chân. */
    private jumpDust() {
        const c = this.cat!;
        const b = c.body;
        const p = this.node.position;
        const parent = this.node.parent;
        if (b.grounded) {
            if (!this.wasGrounded && !c.downed && parent) {
                const big = this.bigLanding || this.peakY - p.y >= this.bigFallHeight;
                if (big) {
                    DustPuff.spawn(LAND, parent, p.x, p.y, { center: true, scale: this.jumpScale * 1.1, fps: this.fps + 4 });
                } else if (-this.airVy / b.maxFallSpeed > this.landImpact) {
                    DustPuff.spawn(TAKEOFF, parent, p.x, p.y, { center: true, scale: this.jumpScale, fps: this.fps });
                }
            }
            this.bigLanding = false;
            this.groundX = p.x;
            this.groundY = p.y;
            this.peakY = p.y;
        } else {
            this.peakY = Math.max(this.peakY, p.y);
            // Rời đất mà đang bay lên là nhảy (bước hụt khỏi mép thì không); bụi đặt ở chỗ chân vừa rời đất
            if (this.wasGrounded && b.velocity.y > 0 && !c.downed && parent) {
                DustPuff.spawn(TAKEOFF, parent, this.groundX, this.groundY, { center: true, scale: this.jumpScale, fps: this.fps });
            }
            this.airVy = b.velocity.y;
        }
        this.wasGrounded = b.grounded;
    }
}
