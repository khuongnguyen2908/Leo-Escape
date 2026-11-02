import { _decorator, Color, Component, Sprite, SpriteFrame, UIOpacity, UITransform } from 'cc';
import { clamp } from '../core/Box';
const { ccclass, property } = _decorator;

const SPRING_K = 320;
const SPRING_D = 16;
const HURT_TINT = new Color(255, 140, 140, 255);

/**
 * Hoạt ảnh nhân vật bằng biến hình (tween bằng code), chạy được ngay với 1 hình cho mỗi trạng thái.
 * Gắn vào node con "Visual" của Player để biến hình không ảnh hưởng hộp va chạm.
 * Khi vẽ thêm frame chạy, chỉ cần kéo vào mảng runFrames là tự chạy flip-book.
 */
@ccclass('PlayerVisual')
export class PlayerVisual extends Component {
    @property({ type: SpriteFrame, group: 'Hình' })
    idleFrame: SpriteFrame | null = null;

    @property({ type: [SpriteFrame], group: 'Hình', tooltip: '1 hình = nhún bằng code; nhiều hình = flip-book' })
    runFrames: SpriteFrame[] = [];

    @property({ group: 'Hình' })
    runFps = 12;

    @property({ type: SpriteFrame, group: 'Hình' })
    jumpFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, group: 'Hình', tooltip: 'Không bắt buộc: hình lúc rơi' })
    fallFrame: SpriteFrame | null = null;

    @property({ group: 'Hình', tooltip: 'Chiều cao hiển thị của nhân vật (đơn vị game)' })
    targetHeight = 170;

    @property({ group: 'Hình', tooltip: 'Hình gốc vẽ quay mặt sang phải?' })
    artFacesRight = true;

    @property({ group: 'Chuyển động' })
    runBobHeight = 12;

    @property({ group: 'Chuyển động' })
    runBobSpeed = 17;

    @property({ group: 'Chuyển động', tooltip: 'Góc nghiêng người khi chạy (độ)' })
    runTilt = 6;

    @property({ group: 'Chuyển động', tooltip: 'Vận tốc nhảy dùng để quy đổi độ kéo dãn khi bay' })
    referenceJumpSpeed = 1250;

    private sprite: Sprite | null = null;
    private opacity: UIOpacity | null = null;
    private baseScale = 1;
    private time = 0;
    private runPhase = 0;
    private squash = 0;
    private squashVel = 0;
    private hurtFlash = 0;
    private attackLean = 0;

    // Trạng thái do PlayerController đẩy sang mỗi frame
    private grounded = true;
    private runRatio = 0;
    private vy = 0;
    private facing = 1;
    private blinking = false;

    onLoad() {
        this.sprite = this.getComponent(Sprite);
        this.opacity = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        this.getComponent(UITransform)?.setAnchorPoint(0.5, 0);
    }

    start() {
        this.refresh();
    }

    /** Gọi lại sau khi đổi hình bằng code để tính lại tỉ lệ. Chạy được cả trong editor. */
    refresh() {
        this.sprite = this.getComponent(Sprite);
        this.getComponent(UITransform)?.setAnchorPoint(0.5, 0);
        const ref = this.idleFrame ?? this.sprite?.spriteFrame;
        this.baseScale = ref ? this.targetHeight / ref.rect.height : 1;
        this.setFrame(this.idleFrame);
        this.node.setScale(this.baseScale * (this.artFacesRight ? 1 : -1), this.baseScale, 1);
    }

    sync(grounded: boolean, runRatio: number, vy: number, facing: number, blinking: boolean) {
        this.grounded = grounded;
        this.runRatio = runRatio;
        this.vy = vy;
        this.facing = facing;
        this.blinking = blinking;
    }

    playJump() {
        this.squash = -0.2;
        this.squashVel = 0;
    }

    playLand(intensity: number) {
        this.squash = 0.12 + 0.2 * clamp(intensity, 0, 1);
        this.squashVel = 0;
    }

    /** Vả móng: người dãn ngang và chúi về phía trước một nhịp. */
    playAttack() {
        this.squash = 0.14;
        this.squashVel = 0;
        this.attackLean = 0.2;
    }

    playHurt() {
        this.squash = 0.25;
        this.hurtFlash = 0.2;
    }

    update(dt: number) {
        this.time += dt;
        this.squashVel += (-SPRING_K * this.squash - SPRING_D * this.squashVel) * dt;
        this.squash += this.squashVel * dt;

        let sx = 1, sy = 1, y = 0, angle = 0;
        const speed = Math.abs(this.runRatio);

        if (this.grounded && speed > 0.05) {
            this.runPhase += dt * this.runBobSpeed * (0.5 + 0.5 * speed);
            const s = Math.sin(this.runPhase);
            y = Math.abs(s) * this.runBobHeight * speed;
            angle = -this.facing * this.runTilt * speed + s * 2;
            sy += 0.04 * Math.cos(this.runPhase * 2) * speed;
            this.showRun();
        } else if (this.grounded) {
            const breathe = Math.sin(this.time * 2.6);
            sy += 0.025 * breathe;
            sx -= 0.012 * breathe;
            this.setFrame(this.idleFrame);
        } else {
            const k = clamp(this.vy / this.referenceJumpSpeed, -1, 1);
            sy += 0.08 * k;
            sx -= 0.05 * k;
            angle = -this.facing * 5 * k;
            this.setFrame(this.vy < 0 && this.fallFrame ? this.fallFrame : this.jumpFrame ?? this.idleFrame);
        }

        if (this.attackLean > 0) {
            this.attackLean -= dt;
            angle -= this.facing * 14 * (this.attackLean / 0.2);
        }

        sx += this.squash;
        sy -= this.squash;
        const flip = this.facing * (this.artFacesRight ? 1 : -1);
        this.node.setScale(this.baseScale * sx * flip, this.baseScale * sy, 1);
        this.node.setPosition(0, y, 0);
        this.node.angle = angle;

        if (this.opacity) {
            this.opacity.opacity = this.blinking && Math.floor(this.time * 18) % 2 === 0 ? 90 : 255;
        }
        if (this.sprite) {
            this.hurtFlash -= dt;
            this.sprite.color = this.hurtFlash > 0 ? HURT_TINT : Color.WHITE;
        }
    }

    private showRun() {
        const frames = this.runFrames;
        if (frames.length > 1) {
            // runPhase đã nhân sẵn tốc độ chạy, nên quy đổi sang frame là theo kịp bước chân
            const i = Math.floor(this.runPhase * this.runFps / this.runBobSpeed) % frames.length;
            this.setFrame(frames[i]);
        } else {
            this.setFrame(frames[0] ?? this.idleFrame);
        }
    }

    private setFrame(frame: SpriteFrame | null) {
        if (this.sprite && frame && this.sprite.spriteFrame !== frame) this.sprite.spriteFrame = frame;
    }
}
