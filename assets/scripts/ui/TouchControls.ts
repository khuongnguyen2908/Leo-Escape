import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, resources, Sprite, SpriteFrame, sys, UITransform, Vec2, Vec3, view } from 'cc';
import { PlayerInput, TouchButton } from '../player/PlayerInput';
import { GameManager } from '../game/GameManager';
import { GameSession } from '../game/GameSession';
import { useGameFont } from './GameFont';
const { ccclass, property } = _decorator;

// Màu nút tự vẽ, theo tông nâu của joystick
const BTN = new Color(78, 60, 56, 225);
const BTN_DOWN = new Color(105, 82, 76, 240);
const RING = new Color(232, 218, 198, 255);
const ICON = new Color(240, 228, 210, 255);
const KEY_BG = new Color(250, 240, 222, 240);
const KEY_EDGE = new Color(78, 60, 56, 255);
const KEY_TEXT = new Color(70, 52, 48, 255);
const _p = new Vec3();
/** Ảnh joystick tách sẵn: đế (giữa là lỗ tối) và nút chân mèo, trong assets/resources/art */
const JOY_BASE = 'art/MG_joystick_base/spriteFrame';
const JOY_KNOB = 'art/MG_joystick_knob/spriteFrame';

/**
 * Điều khiển cảm ứng: joystick góc dưới trái (kéo trái/phải để chạy, đẩy lên để đi lên bục, kéo xuống để xuống bục;
 * đế đứng yên, nút chân mèo chạy theo ngón tay tới mép đế, thả tay thì bật về giữa),
 * nút chém (giữ để lướt chém) + nút nhảy góc dưới phải, nút kỹ năng (K), nút tương tác (L), nút đổi mèo (chơi 1 người). Chưa có ảnh thì tự vẽ; kéo ảnh vào các ô Frame là tự đổi.
 * Gắn lên một node con của Canvas. Nút luôn bám góc khung hình 16:9, kể cả khi node bị kéo lệch.
 * Chơi trên máy tính thì nút có thêm chữ phím (W A S D, J, SPACE) để người chơi biết bấm phím nào.
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

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh nút đổi mèo (chơi 1 người)' })
    swapFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Tâm nút đổi mèo cách mép phải và đáy màn hình (x, y)' })
    swapPos = new Vec2(300, 330);

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh nút kỹ năng (K)' })
    skillFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Tâm nút kỹ năng cách mép phải và đáy màn hình (x, y)' })
    skillPos = new Vec2(580, 130);

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh nút tương tác (L)' })
    interactFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Tâm nút tương tác cách mép phải và đáy màn hình (x, y)' })
    interactPos = new Vec2(130, 400);

    @property({ tooltip: 'Tâm joystick cách mép trái và đáy màn hình (x, y)' })
    joystickPos = new Vec2(217, 195);

    @property({ tooltip: 'Nút chân mèo đi xa nhất bao nhiêu so với tâm đế' })
    knobTravel = 85;

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

    @property({ tooltip: 'Hiện chữ phím (W A S D, J, SPACE) trên nút khi chơi bằng máy tính' })
    showKeyHints = true;

    private hints = false;

    start() {
        if (!sys.isMobile && !this.showOnDesktop) return;
        this.hints = this.showKeyHints && !sys.isMobile;
        // Tính theo khung thiết kế (gốc Canvas ở giữa), trừ đi chỗ node đang lệch
        const d = view.getDesignResolutionSize();
        const p = this.node.position;
        const left = -d.width / 2 - p.x;
        const right = d.width / 2 - p.x;
        const bottom = -d.height / 2 - p.y;

        if (this.joystickFrame) {
            this.makeJoystick(left + this.joystickPos.x, bottom + this.joystickPos.y);
        } else {
            const y = bottom + this.margin + this.radius;
            this.makeButton('left', left + this.margin + this.radius, y, this.radius, null);
            this.makeButton('right', left + this.margin + this.radius * 3.4, y, this.radius, null);
        }
        this.makeButton('attack', right - this.attackPos.x, bottom + this.attackPos.y, this.attackRadius, this.attackFrame);
        this.makeButton('jump', right - this.jumpPos.x, bottom + this.jumpPos.y, this.radius, this.jumpFrame);
        // Nút Kỹ năng (K) chỉ dùng khi có Angelo; chưa có thì đập bụng = Xuống + Đánh, Mèo Nổ = Xuống + Lướt
        if (GameSession.angelo) this.makeButton('skill', right - this.skillPos.x, bottom + this.skillPos.y, this.attackRadius * 0.85, this.skillFrame);
        this.makeButton('interact', right - this.interactPos.x, bottom + this.interactPos.y, this.attackRadius * 0.8, this.interactFrame);
        // Nút đổi mèo: chỉ khi có Angelo và chơi 1 người (điện thoại luôn chơi 1 người)
        if (GameManager.instance?.partner && GameSession.mode === 1) {
            this.makeButton('swap', right - this.swapPos.x, bottom + this.swapPos.y, this.attackRadius * 0.8, this.swapFrame);
        }
    }

    private makeJoystick(x: number, y: number) {
        const frame = this.joystickFrame!;
        const n = this.child('Joystick', this.node);
        n.setPosition(x, y, 0);
        const size = Math.max(frame.rect.width, frame.rect.height);
        const ui = n.addComponent(UITransform);
        ui.setContentSize(size * 1.4, size * 1.4); // vùng chạm rộng hơn hình một chút

        // Đế đứng yên; nút chân mèo nằm trên, chạy theo ngón tay.
        // Chưa tải xong ảnh tách (MG_joystick_base / _knob) thì tạm dùng ảnh liền, nghiêng nhẹ như cũ.
        const pad = this.child('Pad', n);
        const padSprite = pad.addComponent(Sprite);
        padSprite.spriteFrame = frame;
        let knob: Node | null = null;
        resources.load([JOY_BASE, JOY_KNOB], SpriteFrame, (err, frames) => {
            if (err || !frames || frames.length < 2 || !pad.isValid) return;
            padSprite.spriteFrame = frames[0];
            const k = this.child('Knob', n);
            k.addComponent(Sprite).spriteFrame = frames[1];
            // Chữ phím (W A S D) nằm trên nút
            k.setSiblingIndex(pad.getSiblingIndex() + 1);
            knob = k;
        });
        if (this.hints) {
            const k = size * 0.36;
            this.keyHint(n, 'W', 0, k);
            this.keyHint(n, 'A', -k, 0);
            this.keyHint(n, 'S', 0, -k);
            this.keyHint(n, 'D', k, 0);
        }

        const dead = size * 0.12;
        const steer = (e: EventTouch) => {
            const loc = e.getUILocation();
            _p.set(loc.x, loc.y, 0);
            ui.convertToNodeSpaceAR(_p, _p);
            PlayerInput.setTouch('left', _p.x < -dead);
            PlayerInput.setTouch('right', _p.x > dead);
            PlayerInput.setTouch('down', _p.y < -size * 0.3);
            // Đẩy lên = đi lên bục phía trên (như phím W)
            PlayerInput.setTouch('up', _p.y > size * 0.3);
            if (knob) {
                // Nút chạy theo ngón tay, không ra quá mép đế
                const len = Math.hypot(_p.x, _p.y);
                const k = len > this.knobTravel ? this.knobTravel / len : 1;
                knob.setPosition(_p.x * k, _p.y * k, 0);
            } else {
                // Chưa có ảnh tách: hình nghiêng nhẹ theo hướng kéo
                const max = size * 0.08;
                pad.setPosition(Math.max(-max, Math.min(max, _p.x * 0.2)), Math.max(-max, Math.min(max, _p.y * 0.2)), 0);
            }
        };
        const release = () => {
            PlayerInput.setTouch('left', false);
            PlayerInput.setTouch('right', false);
            PlayerInput.setTouch('down', false);
            PlayerInput.setTouch('up', false);
            pad.setPosition(0, 0, 0);
            knob?.setPosition(0, 0, 0);
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
        if (this.hints) {
            const text = { left: 'A', right: 'D', up: 'W', down: 'S', jump: 'SPACE', attack: 'J', swap: 'TAB', skill: 'K', interact: 'L' }[button];
            this.keyHint(n, text, 0, -r * 0.82);
        }

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
        } else if (button === 'skill') {
            // Ngôi sao 5 cánh
            for (let i = 0; i < 10; i++) {
                const ang = Math.PI / 2 + (i * Math.PI) / 5;
                const rr = i % 2 === 0 ? a : a * 0.45;
                if (i === 0) g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
                else g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
            }
            g.close();
            g.fill();
        } else if (button === 'interact') {
            // Bàn tay: lòng bàn tay tròn + 3 ngón
            g.circle(0, -a * 0.2, a * 0.5);
            g.fill();
            for (let i = -1; i <= 1; i++) {
                g.roundRect(i * a * 0.32 - a * 0.12, a * 0.1, a * 0.24, a * 0.7, a * 0.12);
                g.fill();
            }
        } else if (button === 'swap') {
            // Hai mũi tên vòng ngược chiều nhau
            g.lineWidth = r * 0.12;
            g.arc(0, 0, a * 0.85, Math.PI * 0.15, Math.PI * 0.85, true);
            g.stroke();
            g.arc(0, 0, a * 0.85, Math.PI * 1.15, Math.PI * 1.85, true);
            g.stroke();
            const tip = (ang: number, dir: number) => {
                const x = Math.cos(ang) * a * 0.85, y = Math.sin(ang) * a * 0.85;
                g.moveTo(x + dir * a * 0.3, y);
                g.lineTo(x - dir * a * 0.05, y + a * 0.3 * dir);
                g.lineTo(x - dir * a * 0.05, y - a * 0.3 * dir);
                g.close();
                g.fill();
            };
            tip(Math.PI * 0.15, 1);
            tip(Math.PI * 1.15, -1);
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

    /** Phím nhỏ màu kem có chữ, đặt tại (x, y) trong node cha. */
    private keyHint(parent: Node, text: string, x: number, y: number) {
        const n = this.child(`Key_${text}`, parent);
        n.setPosition(x, y, 0);
        const h = 46;
        const w = Math.max(h, text.length * 20 + 22);
        const g = n.addComponent(Graphics);
        g.fillColor = KEY_BG;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        g.strokeColor = KEY_EDGE;
        g.lineWidth = 3;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.stroke();

        const t = this.child('Text', n);
        const label = t.addComponent(Label);
        label.string = text;
        label.fontSize = text.length > 1 ? 24 : 30;
        label.lineHeight = h;
        label.color = KEY_TEXT;
        useGameFont(label);
    }

    private child(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        parent.addChild(n);
        return n;
    }
}
