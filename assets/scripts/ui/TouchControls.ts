import { _decorator, Color, Component, EventTouch, Graphics, Node, Sprite, SpriteFrame, sys, UITransform, Vec2, Vec3 } from 'cc';
import { PlayerInput, TouchButton } from '../player/PlayerInput';
const { ccclass, property } = _decorator;

// Màu nút tự vẽ, theo tông nâu của joystick
const BTN = new Color(78, 60, 56, 225);
const BTN_DOWN = new Color(105, 82, 76, 240);
const RING = new Color(232, 218, 198, 255);
const ICON = new Color(240, 228, 210, 255);
const _p = new Vec3();

/**
 * Điều khiển cảm ứng: joystick góc dưới trái (kéo trái/phải để chạy, kéo xuống để xuống bục),
 * nút tấn công + nút nhảy góc dưới phải. Chưa có ảnh thì tự vẽ; kéo ảnh vào các ô Frame là tự đổi.
 * Gắn lên một node con của Canvas có UITransform bằng kích thước màn hình.
 */
@ccclass('TouchControls')
export class TouchControls extends Component {
    @property({ tooltip: 'Hiện cả trên máy tính (để thử)' })
    showOnDesktop = false;

    @property({ type: SpriteFrame, tooltip: 'Ảnh joystick (MG_joystick)' })
    joystickFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh nút nhảy' })
    jumpFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh nút tấn công' })
    attackFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Tâm joystick cách mép trái và đáy màn hình (x, y)' })
    joystickPos = new Vec2(217, 195);

    @property({ tooltip: 'Tâm nút nhảy cách mép phải và đáy màn hình (x, y)' })
    jumpPos = new Vec2(165, 172);

    @property({ tooltip: 'Tâm nút tấn công cách mép phải và đáy màn hình (x, y)' })
    attackPos = new Vec2(390, 158);

    @property({ tooltip: 'Bán kính nút nhảy' })
    radius = 97;

    @property({ tooltip: 'Bán kính nút tấn công' })
    attackRadius = 72;

    @property
    margin = 60;

    start() {
        if (!sys.isMobile && !this.showOnDesktop) return;
        const ui = this.getComponent(UITransform)!;
        const left = -ui.width / 2;
        const right = ui.width / 2;
        const bottom = -ui.height / 2;

        if (this.joystickFrame) {
            this.makeJoystick(left + this.joystickPos.x, bottom + this.joystickPos.y);
        } else {
            const y = bottom + this.margin + this.radius;
            this.makeButton('left', left + this.margin + this.radius, y, this.radius, null);
            this.makeButton('right', left + this.margin + this.radius * 3.4, y, this.radius, null);
        }
        this.makeButton('attack', right - this.attackPos.x, bottom + this.attackPos.y, this.attackRadius, this.attackFrame);
        this.makeButton('jump', right - this.jumpPos.x, bottom + this.jumpPos.y, this.radius, this.jumpFrame);
    }

    private makeJoystick(x: number, y: number) {
        const frame = this.joystickFrame!;
        const n = this.child('Joystick', this.node);
        n.setPosition(x, y, 0);
        const size = Math.max(frame.rect.width, frame.rect.height);
        const ui = n.addComponent(UITransform);
        ui.setContentSize(size * 1.4, size * 1.4); // vùng chạm rộng hơn hình một chút

        const pad = this.child('Pad', n);
        pad.addComponent(Sprite).spriteFrame = frame;

        const dead = size * 0.12;
        const steer = (e: EventTouch) => {
            const loc = e.getUILocation();
            _p.set(loc.x, loc.y, 0);
            ui.convertToNodeSpaceAR(_p, _p);
            PlayerInput.setTouch('left', _p.x < -dead);
            PlayerInput.setTouch('right', _p.x > dead);
            PlayerInput.setTouch('down', _p.y < -size * 0.3);
            // Hình nghiêng nhẹ theo hướng kéo
            const max = size * 0.08;
            pad.setPosition(Math.max(-max, Math.min(max, _p.x * 0.2)), Math.max(-max, Math.min(max, _p.y * 0.2)), 0);
        };
        const release = () => {
            PlayerInput.setTouch('left', false);
            PlayerInput.setTouch('right', false);
            PlayerInput.setTouch('down', false);
            pad.setPosition(0, 0, 0);
        };
        n.on(Node.EventType.TOUCH_START, steer);
        n.on(Node.EventType.TOUCH_MOVE, steer);
        n.on(Node.EventType.TOUCH_END, release);
        n.on(Node.EventType.TOUCH_CANCEL, release);
    }

    private makeButton(button: TouchButton, x: number, y: number, r: number, frame: SpriteFrame | null) {
        const n = this.child(`Btn_${button}`, this.node);
        n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(r * 2, r * 2);

        let paint: (down: boolean) => void;
        if (frame) {
            // Có ảnh: dùng ảnh, bấm thì thu nhỏ một chút
            const pic = this.child('Pic', n);
            pic.addComponent(Sprite).spriteFrame = frame;
            const s = (r * 2) / Math.max(frame.rect.width, frame.rect.height);
            paint = (down) => pic.setScale(s * (down ? 0.9 : 1), s * (down ? 0.9 : 1), 1);
        } else {
            const g = n.addComponent(Graphics);
            paint = (down) => this.paint(g, button, r, down);
        }
        paint(false);

        const press = () => { PlayerInput.setTouch(button, true); paint(true); };
        const release = () => { PlayerInput.setTouch(button, false); paint(false); };
        n.on(Node.EventType.TOUCH_START, press);
        n.on(Node.EventType.TOUCH_END, release);
        n.on(Node.EventType.TOUCH_CANCEL, release);
    }

    /** Nút tạm: tròn nâu, viền kem, biểu tượng kem ở giữa. */
    private paint(g: Graphics, button: TouchButton, r: number, down: boolean) {
        g.clear();
        g.fillColor = down ? BTN_DOWN : BTN;
        g.circle(0, 0, r);
        g.fill();
        g.strokeColor = RING;
        g.lineWidth = Math.max(4, r * 0.06);
        g.circle(0, 0, r * 0.84);
        g.stroke();

        const a = r * 0.36;
        g.fillColor = ICON;
        g.strokeColor = ICON;
        if (button === 'left' || button === 'right') {
            const d = button === 'left' ? -1 : 1;
            g.moveTo(d * a, 0); g.lineTo(-d * a * 0.6, a); g.lineTo(-d * a * 0.6, -a);
            g.close();
            g.fill();
        } else if (button === 'jump') {
            // Mũi tên chéo lên phải
            g.lineWidth = r * 0.14;
            g.moveTo(-a * 0.8, -a * 0.8);
            g.lineTo(a * 0.55, a * 0.55);
            g.stroke();
            g.moveTo(a * 0.95, a * 0.95); g.lineTo(a * 0.95, -a * 0.1); g.lineTo(-a * 0.1, a * 0.95);
            g.close();
            g.fill();
        } else if (button === 'attack') {
            // 3 vệt cào
            g.lineWidth = r * 0.11;
            for (let i = -1; i <= 1; i++) {
                const o = i * a * 0.55;
                g.moveTo(-a * 0.7 + o, -a * 0.8 - o * 0.2);
                g.quadraticCurveTo(o * 0.6, o * 0.2, a * 0.7 + o, a * 0.8 - o * 0.2);
                g.stroke();
            }
        }
    }

    private child(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        parent.addChild(n);
        return n;
    }
}
