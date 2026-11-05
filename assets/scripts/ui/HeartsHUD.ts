import { _decorator, Color, Component, Graphics, Label, Node, Sprite, SpriteFrame, tween, UITransform, Vec3 } from 'cc';
import { useGameFont } from './GameFont';
const { ccclass, property } = _decorator;

const HEART_RED = new Color(232, 72, 85, 255);
const HEART_EMPTY = new Color(120, 110, 110, 160);
const HEART_HALF = new Color(200, 120, 125, 220);
const OUTLINE = new Color(60, 40, 40, 255);

/**
 * Thanh máu dạng trái tim ở góc trên trái, kèm avatar.
 * Chưa có hình trái tim thì tự vẽ bằng Graphics.
 */
@ccclass('HeartsHUD')
export class HeartsHUD extends Component {
    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: hình trái tim đầy' })
    heartFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: hình trái tim rỗng' })
    heartEmptyFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: hình avatar' })
    avatarFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Bán kính vòng tròn avatar. 0 = tự tính theo cỡ trái tim' })
    avatarRadius = 0;

    @property({ tooltip: 'Vẽ vòng tròn nền sau avatar. Tắt khi ảnh avatar đã có sẵn khung tròn (MG_avatar)' })
    drawAvatarCircle = true;

    @property({ tooltip: 'Màu nhuộm ảnh avatar. Trắng = giữ nguyên (Angelo tạm dùng avatar Leo nhuộm xám xanh)' })
    avatarTint = new Color(255, 255, 255, 255);

    @property
    heartSize = 56;

    @property
    spacing = 14;

    private hearts: Node[] = [];
    private shown = -1;
    private built = false;

    setHp(hp: number, max: number) {
        if (!this.built) this.build();
        while (this.hearts.length < max) this.hearts.push(this.makeHeart(this.hearts.length));
        this.hearts.forEach((h, i) => {
            h.active = i < max;
            // Mỗi tim: đầy (1), nửa (0.5) hoặc rỗng (0) — trúng độc rút nửa tim một lần
            const fill = Math.max(0, Math.min(1, Math.round((hp - i) * 2) / 2));
            const before = this.shown < 0 ? fill : Math.max(0, Math.min(1, Math.round((this.shown - i) * 2) / 2));
            this.paintHeart(h, fill);
            if (fill < before) {
                h.setScale(1.5, 1.5, 1);
                tween(h).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
            }
        });
        this.shown = hp;
    }

    /** Hiện chữ lớn giữa màn hình (thắng/thua). */
    showMessage(text: string) {
        this.hideMessage();
        const parent = this.node.parent ?? this.node;
        const box = this.child('Message', parent);
        this.message = box;
        box.setPosition(0, 0, 0);
        const g = box.addComponent(Graphics);
        g.fillColor = new Color(30, 25, 25, 190);
        g.roundRect(-420, -90, 840, 180, 40);
        g.fill();
        const label = this.child('Text', box).addComponent(Label);
        label.string = text;
        label.fontSize = 84;
        label.lineHeight = 100;
        label.color = new Color(255, 240, 210, 255);
        useGameFont(label);
        box.setScale(0.6, 0.6, 1);
        tween(box).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    /** Ẩn chữ giữa màn (Try again! khi hồi sinh ở checkpoint). */
    hideMessage() {
        if (this.message && this.message.isValid) this.message.destroy();
        this.message = null;
    }

    private message: Node | null = null;

    private build() {
        this.built = true;
        const avatar = this.child('Avatar', this.node);
        const r = this.radius();
        avatar.setPosition(r, -r, 0);
        if (this.drawAvatarCircle || !this.avatarFrame) {
            const g = avatar.addComponent(Graphics);
            g.lineWidth = 5;
            g.fillColor = new Color(255, 244, 222, 255);
            g.strokeColor = OUTLINE;
            g.circle(0, 0, r);
            g.fill();
            g.stroke();
        }
        if (this.avatarFrame) {
            const pic = this.child('Pic', avatar);
            const sp = pic.addComponent(Sprite);
            sp.spriteFrame = this.avatarFrame;
            sp.color = this.avatarTint;
            const fit = this.drawAvatarCircle ? 1.9 : 2;
            const s = (r * fit) / Math.max(this.avatarFrame.rect.width, this.avatarFrame.rect.height);
            pic.setScale(s, s, 1);
        }
    }

    private makeHeart(i: number): Node {
        const h = this.child(`Heart${i}`, this.node);
        // Hàng tim nằm bên phải avatar, hơi cao hơn tâm avatar như ảnh demo
        const startX = this.radius() * 2 + this.spacing;
        const w = this.heartWidth();
        h.setPosition(startX + i * (w + this.spacing) + w / 2, -this.radius() * 0.65, 0);
        if (this.heartFrame) {
            const sp = h.addComponent(Sprite);
            sp.spriteFrame = this.heartFrame;
            const s = this.heartSize / this.heartFrame.rect.height;
            sp.node.getComponent(UITransform)!.setContentSize(this.heartFrame.rect.width * s, this.heartSize);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
        } else {
            h.addComponent(Graphics);
        }
        return h;
    }

    /** fill: 1 tim đầy, 0.5 nửa tim (nửa trái đầy đè lên tim rỗng), 0 tim rỗng. */
    private paintHeart(h: Node, fill: number) {
        const full = fill >= 1;
        const sp = h.getComponent(Sprite);
        if (sp) {
            sp.spriteFrame = full || !this.heartEmptyFrame ? this.heartFrame : this.heartEmptyFrame;
            sp.color = full || this.heartEmptyFrame ? Color.WHITE : HEART_EMPTY;
            // Nửa tim: một tim đầy cắt nửa trái, đặt đè lên
            let half = h.getChildByName('Half');
            if (fill > 0 && fill < 1 && this.heartFrame) {
                if (!half) {
                    half = this.child('Half', h);
                    const hs = half.addComponent(Sprite);
                    hs.spriteFrame = this.heartFrame;
                    hs.sizeMode = Sprite.SizeMode.CUSTOM;
                    hs.type = Sprite.Type.FILLED;
                    hs.fillType = Sprite.FillType.HORIZONTAL;
                    hs.fillStart = 0;
                    hs.fillRange = 0.5;
                    half.getComponent(UITransform)!.setContentSize(h.getComponent(UITransform)!.contentSize);
                }
                half.active = true;
            } else if (half) {
                half.active = false;
            }
            return;
        }
        const g = h.getComponent(Graphics)!;
        const s = this.heartSize / 2;
        g.clear();
        g.lineWidth = 4;
        g.strokeColor = OUTLINE;
        g.fillColor = full ? HEART_RED : fill > 0 ? HEART_HALF : HEART_EMPTY;
        g.moveTo(0, -s * 0.85);
        g.bezierCurveTo(-s * 1.5, -s * 0.05, -s * 0.75, s * 1.15, 0, s * 0.45);
        g.bezierCurveTo(s * 0.75, s * 1.15, s * 1.5, -s * 0.05, 0, -s * 0.85);
        g.close();
        g.fill();
        g.stroke();
    }

    /** Bề ngang một trái tim: theo tỉ lệ ảnh nếu có, không thì bằng chiều cao. */
    private heartWidth(): number {
        const f = this.heartFrame;
        return f ? this.heartSize * f.rect.width / f.rect.height : this.heartSize;
    }

    private radius(): number {
        return this.avatarRadius > 0 ? this.avatarRadius : this.heartSize * 0.75;
    }

    private child(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        parent.addChild(n);
        return n;
    }
}
