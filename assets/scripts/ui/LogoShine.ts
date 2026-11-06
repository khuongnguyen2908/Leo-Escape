import { _decorator, CCObject, Color, Component, Graphics, Mask, Node, SpriteFrame, tween, Tween, UIOpacity, UITransform } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property } = _decorator;

/** Node do code tạo khi chạy: không lưu vào scene, không hiện trong Hierarchy */
const GENERATED = CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
const STAR = new Color(255, 246, 200, 255);
const STAR_GLOW = new Color(255, 236, 150, 90);

/**
 * Hiệu ứng cho logo game (gắn vào node có Sprite logo, LandingScreen tự gắn vào Logo/Pic):
 * - vệt sáng trắng chéo lướt từ trái sang phải, chỉ trên phần chữ và hình (Mask theo ảnh logo, bỏ quầng sáng mờ), lặp lại;
 * - ngôi sao nhỏ trong logo nhấp nháy sáng (to lên, xoay nhẹ rồi tắt).
 * Mọi thứ tạo lúc chạy, không lưu vào scene.
 */
@ccclass('LogoShine')
export class LogoShine extends Component {
    @property({ tooltip: 'Bao nhiêu giây vệt sáng lướt qua một lần' })
    period = 4;

    @property({ tooltip: 'Vệt sáng lướt hết logo trong bao nhiêu giây' })
    sweep = 0.9;

    @property({ tooltip: 'Bề ngang vệt sáng' })
    bandWidth = 110;

    @property({ tooltip: 'Độ sáng vệt (0 → 1)' })
    strength = 0.5;

    @property({ tooltip: 'Vị trí ngôi sao trên ảnh logo, tính bằng px từ góc trên-trái ảnh' })
    starX = 468;

    @property({ tooltip: 'Vị trí ngôi sao trên ảnh logo, tính bằng px từ góc trên-trái ảnh' })
    starY = 82;

    @property({ tooltip: 'Cỡ tia sáng của ngôi sao lúc sáng nhất' })
    starSize = 52;

    @property({ tooltip: 'Bao nhiêu giây ngôi sao nhấp nháy một lần' })
    twinkle = 2.2;

    private built = false;

    /** Dựng vệt sáng theo ảnh logo (gọi lại khi đổi ảnh logo). */
    setup(frame: SpriteFrame) {
        if (EDITOR || this.built || !this.node.isValid) return;
        this.built = true;
        const ui = this.getComponent(UITransform);
        const w = ui?.width ?? frame.rect.width, h = ui?.height ?? frame.rect.height;
        const ax = ui?.anchorX ?? 0.5, ay = ui?.anchorY ?? 0.5;
        const cx = (0.5 - ax) * w, cy = (0.5 - ay) * h;

        // Mặt nạ theo ảnh logo: vệt sáng chỉ hiện trên phần ảnh đậm (alpha > 0.6), không tràn ra quầng sáng
        const maskNode = this.make('ShineMask', this.node);
        maskNode.addComponent(UITransform).setContentSize(w, h);
        maskNode.setPosition(cx, cy, 0);
        const mask = maskNode.addComponent(Mask);
        mask.type = Mask.Type.SPRITE_STENCIL;
        mask.spriteFrame = frame;
        mask.alphaThreshold = 0.6;

        // Vệt sáng: nhiều dải dọc mờ dần hai bên, nghiêng 20 độ
        const band = this.make('Band', maskNode);
        band.addComponent(UITransform).setContentSize(this.bandWidth, h * 1.6);
        const g = band.addComponent(Graphics);
        const steps = 24;
        for (let i = 0; i < steps; i++) {
            const t = (i + 0.5) / steps;
            const a = Math.sin(t * Math.PI); // giữa sáng nhất, hai mép mờ
            g.fillColor = new Color(255, 255, 255, Math.round(255 * this.strength * a * a));
            g.rect(-this.bandWidth / 2 + (i * this.bandWidth) / steps, -h * 0.8, this.bandWidth / steps + 0.5, h * 1.6);
            g.fill();
        }
        band.angle = -20;
        const from = -w / 2 - this.bandWidth * 1.5, to = w / 2 + this.bandWidth * 1.5;
        band.setPosition(from, 0, 0);
        tween(band)
            .delay(0.6)
            .then(tween(band)
                .to(this.sweep, { position: band.position.clone().set(to, 0, 0) }, { easing: 'sineInOut' })
                .call(() => band.setPosition(from, 0, 0))
                .delay(Math.max(0, this.period - this.sweep)))
            .repeatForever()
            .start();

        // Ngôi sao: tia 4 cánh + quầng, to lên rồi tắt, lặp lại
        const star = this.make('StarTwinkle', this.node);
        star.addComponent(UITransform).setContentSize(this.starSize * 2, this.starSize * 2);
        star.setPosition(-ax * w + this.starX, (1 - ay) * h - this.starY, 0);
        const sg = star.addComponent(Graphics);
        const s = this.starSize;
        sg.fillColor = STAR_GLOW;
        sg.circle(0, 0, s * 0.45);
        sg.fill();
        sg.fillColor = STAR;
        // 4 cánh nhọn (dọc dài, ngang ngắn hơn)
        const ray = (len: number, wid: number, rot: number) => {
            const c = Math.cos(rot), sn = Math.sin(rot);
            const p = (x: number, y: number) => [x * c - y * sn, x * sn + y * c] as const;
            const pts = [p(0, len), p(wid, 0), p(0, -len), p(-wid, 0)];
            sg.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) sg.lineTo(pts[i][0], pts[i][1]);
            sg.close();
            sg.fill();
        };
        ray(s, s * 0.14, 0);
        ray(s * 0.7, s * 0.12, Math.PI / 2);
        const op = star.addComponent(UIOpacity);
        op.opacity = 0;
        star.setScale(0.2, 0.2, 1);
        const pop = Math.min(0.9, this.twinkle * 0.4);
        tween(star)
            .delay(0.3)
            .then(tween(star)
                .call(() => { star.angle = 0; Tween.stopAllByTarget(op); tween(op).to(pop * 0.4, { opacity: 255 }).delay(pop * 0.2).to(pop * 0.4, { opacity: 0 }).start(); })
                .to(pop * 0.5, { scale: star.scale.clone().set(1, 1, 1), angle: 25 }, { easing: 'quadOut' })
                .to(pop * 0.5, { scale: star.scale.clone().set(0.2, 0.2, 1), angle: 45 }, { easing: 'quadIn' })
                .delay(Math.max(0, this.twinkle - pop)))
            .repeatForever()
            .start();
    }

    private make(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        n.hideFlags |= GENERATED;
        parent.addChild(n);
        return n;
    }
}
