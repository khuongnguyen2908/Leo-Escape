import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, resources, Sprite, SpriteFrame, sys, UIOpacity, UITransform, Vec2, Vec3, view } from 'cc';
import { PlayerInput, TouchButton } from '../player/PlayerInput';
import { GameManager } from '../game/GameManager';
import { GameSession } from '../game/GameSession';
import { useGameFont } from './GameFont';
import { Action, keyShort, Settings } from '../core/Settings';
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

// Nút special (L) lúc chưa đầy nộ: xám mờ
const BTN_OFF = new Color(92, 86, 84, 210);
const RING_OFF = new Color(150, 144, 140, 200);
const ICON_OFF = new Color(165, 158, 152, 210);
/** Cung nộ / cung thời gian quanh vành nút L */
const GAUGE = new Color(255, 206, 84, 255);
const GAUGE_TRACK = new Color(40, 30, 28, 150);
/** Lửa quanh nút L: lớp ngoài cam đỏ, lớp trong vàng, quầng sáng */
const FLAME_OUT = new Color(255, 104, 34, 215);
const FLAME_IN = new Color(255, 214, 90, 235);
const FIRE_GLOW = new Color(255, 170, 60, 255);
/** Bộ ảnh lửa (không bắt buộc): có ảnh trong thư mục này thì nút L dùng ảnh thay cho lửa vẽ bằng code */
const FIRE_DIR = 'art/fx/UI/SkillFire';
const FIRE_FPS = 14;
/** Số lưỡi lửa quanh nút */
const FLAMES = 14;

type SkillState = 'off' | 'ready' | 'on';
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

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh nút Special (ngôi sao)' })
    skillFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Tâm nút kỹ năng cách mép phải và đáy màn hình (x, y)' })
    skillPos = new Vec2(580, 130);

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh nút Lướt » (hành động Tương tác)' })
    interactFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Tâm nút tương tác cách mép phải và đáy màn hình (x, y)' })
    interactPos = new Vec2(130, 400);

    @property({ tooltip: 'Tâm nút Lướt cách mép phải và đáy màn hình (x, y). Mặc định ngay trên nút nhảy' })
    dashPos = new Vec2(165, 381);

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
    /** Các ô chữ phím trên nút: vẽ lại khi người chơi đổi phím trong Cài đặt */
    private keyHints: { action: Action; g: Graphics; label: Label }[] = [];
    private readonly onKeys = () => this.refreshHints();

    onDestroy() {
        Settings.offChange(this.onKeys);
    }

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
        // Nút special (ngôi sao cạnh nút đánh): đầy thanh nộ thì phồng nhấp nháy, chạm để bật
        // Cùng cỡ nút đánh. Chưa đầy nộ: xám mờ + cung nộ; đầy: lửa cháy quanh vành; đang bật: lửa nhỏ + cung thời gian
        this.makeButton('skill', right - this.skillPos.x, bottom + this.skillPos.y, this.attackRadius, this.skillFrame);
        this.setupSkill(this.attackRadius);
        // Nút Lướt (hành động Tương tác): cùng cỡ nút đánh, ngay trên nút nhảy. Có Angelo thì vẫn là nút tương tác (bê / ném)
        if (GameSession.angelo) this.makeButton('interact', right - this.interactPos.x, bottom + this.interactPos.y, this.attackRadius * 0.8, this.interactFrame);
        else this.makeButton('interact', right - this.dashPos.x, bottom + this.dashPos.y, this.attackRadius, this.interactFrame);
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
            this.keyHint(n, 'up', 0, k);
            this.keyHint(n, 'left', -k, 0);
            this.keyHint(n, 'down', 0, -k);
            this.keyHint(n, 'right', k, 0);
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
        if (button === 'skill') {
            this.skillPaint = paint;
            this.skillBtn = n;
        }
        if (this.hints) {
            this.keyHint(n, button, 0, -r * 0.82);
        }

        const press = () => {
            // Nút L chưa đầy nộ / đang bật special: chạm không ra gì
            if (button === 'skill' && this.skillState !== 'ready') return;
            PlayerInput.setTouch(button, true);
            paint(true);
        };
        const release = () => { PlayerInput.setTouch(button, false); paint(false); };
        n.on(Node.EventType.TOUCH_START, press);
        n.on(Node.EventType.TOUCH_END, release);
        n.on(Node.EventType.TOUCH_CANCEL, release);
    }

    private time = 0;
    private skillState: SkillState = 'off';
    private skillPaint: ((down: boolean) => void) | null = null;
    /** Node nút special (Btn_skill), giữ lại để update khỏi tìm theo tên mỗi khung hình */
    private skillBtn: Node | null = null;
    private skillR = 0;
    private fire: Graphics | null = null;
    private fireOpacity: UIOpacity | null = null;
    private fireSprite: Sprite | null = null;
    private fireFrames: SpriteFrame[] = [];
    private gauge: Graphics | null = null;
    /** Độ cao lửa hiện tại 0..1 (lớn dần / nhỏ dần cho mượt khi đổi trạng thái) */
    private fireK = 0;

    /** Lửa (sau nút, cùng chỗ) và cung nộ (trên nút, dưới ô chữ phím) cho nút L. */
    private setupSkill(r: number) {
        const btn = this.node.getChildByName('Btn_skill');
        if (!btn) return;
        this.skillR = r;
        const fire = this.child('SkillFire', this.node);
        fire.setPosition(btn.position);
        fire.setSiblingIndex(btn.getSiblingIndex()); // nằm ngay trước nút trong danh sách: lửa vẽ sau lưng thân nút
        this.fire = fire.addComponent(Graphics);
        this.fireOpacity = fire.addComponent(UIOpacity);
        this.fireOpacity.opacity = 0;
        const gauge = this.child('Gauge', btn);
        gauge.setSiblingIndex(0);
        this.gauge = gauge.addComponent(Graphics);
        // Có bộ ảnh lửa thì dùng ảnh (xếp theo tên file), không thì vẽ lửa bằng code
        const paths = resources.getDirWithPath(FIRE_DIR, SpriteFrame).map((i) => i.path).filter((p) => /spriteFrame$/.test(p)).sort();
        if (paths.length > 0) {
            resources.load(paths, SpriteFrame, (err, list) => {
                if (err || !list || list.length === 0 || !fire.isValid) return;
                this.fireFrames = list;
                const pic = this.child('Pic', fire);
                this.fireSprite = pic.addComponent(Sprite);
                const f0 = list[0];
                const k = (r * 3) / Math.max(f0.rect.width, f0.rect.height);
                pic.setScale(k, k, 1);
            });
        }
    }

    update(dt: number) {
        this.time += dt;
        const btn = this.skillBtn;
        const cat = GameManager.instance?.player;
        if (!btn || !btn.isValid || btn.parent !== this.node || !cat) return;
        const state: SkillState = cat.specialOn ? 'on' : cat.specialReady ? 'ready' : 'off';
        if (state !== this.skillState) {
            this.skillState = state;
            this.skillPaint?.(false);
            if (state !== 'ready') PlayerInput.setTouch('skill', false);
        }
        // Đầy nộ: phồng nhấp nháy; đang bật: to hơn một chút
        const k = state === 'on' ? 1.05 : state === 'ready' ? 1 + 0.08 * (0.5 + 0.5 * Math.sin(this.time * 8)) : 1;
        btn.setScale(k, k, 1);

        // Lửa: đầy nộ cháy to, đang bật cháy nhỏ, tắt thì tàn dần
        const want = state === 'ready' ? 1 : state === 'on' ? 0.55 : 0;
        this.fireK += (want - this.fireK) * Math.min(1, dt * 6);
        this.drawFire(k);
        this.drawGauge(state, cat.energy / Math.max(1, cat.maxEnergy));
    }

    private drawFire(scale: number) {
        const g = this.fire;
        if (!g || !g.isValid) return;
        const fk = this.fireK;
        if (this.fireOpacity) this.fireOpacity.opacity = Math.round(255 * Math.min(1, fk * 1.6));
        g.node.setScale(scale, scale, 1);
        g.clear();
        if (fk < 0.02) return;
        // Có ảnh lửa: chạy ảnh, không vẽ
        if (this.fireSprite && this.fireFrames.length > 0) {
            this.fireSprite.spriteFrame = this.fireFrames[Math.floor(this.time * FIRE_FPS) % this.fireFrames.length];
            const sx = this.fireSprite.node.scale.x;
            this.fireSprite.node.setScale(sx, sx * (0.6 + 0.4 * fk), 1);
            return;
        }
        const r = this.skillR;
        const t = this.time;
        // Quầng sáng vàng
        for (let i = 3; i >= 1; i--) {
            g.fillColor = new Color(FIRE_GLOW.r, FIRE_GLOW.g, FIRE_GLOW.b, Math.round((26 + 10 * Math.sin(t * 6 + i)) * fk));
            g.circle(0, 0, r * (1 + 0.13 * i * fk));
            g.fill();
        }
        // Lưỡi lửa: chân trên vành (sau thân nút), bốc lên trên và hơi toả ra ngoài, bập bùng theo thời gian
        this.flames(g, r, fk, t, FLAME_OUT, 1);
        this.flames(g, r, fk, t, FLAME_IN, 0.6);
    }

    private flames(g: Graphics, r: number, fk: number, t: number, color: Color, size: number) {
        g.fillColor = color;
        for (let i = 0; i < FLAMES; i++) {
            const ang = (i / FLAMES) * Math.PI * 2 + 0.2;
            const ox = Math.cos(ang), oy = Math.sin(ang);
            // Hướng bốc: nửa ra ngoài, nửa lên trên
            let dx = ox * 0.55, dy = oy * 0.55 + 0.85;
            const dl = Math.hypot(dx, dy) || 1;
            dx /= dl;
            dy /= dl;
            const flick = 0.75 + 0.25 * Math.sin(t * (9 + (i % 4) * 1.7) + i * 2.1) + 0.12 * Math.sin(t * 23 + i * 5.3);
            const up = 0.6 + 0.4 * Math.max(0, oy); // phía trên cháy cao hơn
            const len = r * 0.62 * size * fk * flick * up;
            const w = r * 0.2 * size;
            const bx = ox * r * 0.8, by = oy * r * 0.8;
            const tx = bx + dx * (r * 0.2 + len) + Math.sin(t * 7 + i) * r * 0.05, ty = by + dy * (r * 0.2 + len);
            const px = -dy * w, py = dx * w;
            g.moveTo(bx + px, by + py);
            g.quadraticCurveTo(bx + px * 0.9 + dx * len * 0.55, by + py * 0.9 + dy * len * 0.55, tx, ty);
            g.quadraticCurveTo(bx - px * 0.9 + dx * len * 0.55, by - py * 0.9 + dy * len * 0.55, bx - px, by - py);
            g.close();
            g.fill();
        }
    }

    /** Cung quanh vành: chưa đầy = nộ đang có, đang bật = thời gian còn lại, đầy = vòng vàng kín. */
    private drawGauge(state: SkillState, k: number) {
        const g = this.gauge;
        if (!g || !g.isValid) return;
        const r = this.skillR * 0.92;
        g.clear();
        g.lineWidth = this.skillR * 0.1;
        g.lineCap = Graphics.LineCap.ROUND;
        g.strokeColor = GAUGE_TRACK;
        g.circle(0, 0, r);
        g.stroke();
        const frac = state === 'ready' ? 1 : Math.max(0, Math.min(1, k));
        if (frac <= 0.001) return;
        g.strokeColor = GAUGE;
        if (frac >= 0.999) {
            g.circle(0, 0, r);
        } else {
            // Từ đỉnh, chạy theo chiều kim đồng hồ
            g.arc(0, 0, r, Math.PI / 2, Math.PI / 2 - frac * Math.PI * 2, false);
        }
        g.stroke();
    }

    /** Nút tạm: tròn nâu, viền kem, biểu tượng kem ở giữa. */
    private paint(g: Graphics, button: TouchButton, r: number, down: boolean) {
        const off = button === 'skill' && this.skillState === 'off';
        g.clear();
        g.fillColor = off ? BTN_OFF : down ? BTN_DOWN : BTN;
        g.circle(0, 0, r);
        g.fill();
        g.strokeColor = off ? RING_OFF : RING;
        g.lineWidth = Math.max(4, r * 0.06);
        g.circle(0, 0, r * 0.84);
        g.stroke();

        const a = r * 0.36;
        g.fillColor = off ? ICON_OFF : ICON;
        g.strokeColor = off ? ICON_OFF : ICON;
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
        } else if (button === 'interact' && !GameSession.angelo) {
            // Lướt: hai mũi tên đôi chỉ sang phải (»)
            g.lineWidth = r * 0.13;
            g.lineCap = Graphics.LineCap.ROUND;
            g.lineJoin = Graphics.LineJoin.ROUND;
            for (const ox of [-a * 0.42, a * 0.18]) {
                g.moveTo(ox - a * 0.25, a * 0.55);
                g.lineTo(ox + a * 0.3, 0);
                g.lineTo(ox - a * 0.25, -a * 0.55);
            }
            g.stroke();
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

    /** Phím nhỏ màu kem ghi phím đang gán cho hành động (theo Cài đặt của Người 1), đặt tại (x, y) trong node cha. */
    private keyHint(parent: Node, action: Action, x: number, y: number) {
        const n = this.child(`Key_${action}`, parent);
        n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics);
        const t = this.child('Text', n);
        const label = t.addComponent(Label);
        label.color = KEY_TEXT;
        useGameFont(label);
        this.keyHints.push({ action, g, label });
        if (this.keyHints.length === 1) Settings.onChange(this.onKeys);
        this.paintHint(this.keyHints[this.keyHints.length - 1]);
    }

    private refreshHints() {
        for (const k of this.keyHints) if (k.g.isValid) this.paintHint(k);
    }

    private paintHint(k: { action: Action; g: Graphics; label: Label }) {
        const text = keyShort(Settings.key(0, k.action)).toUpperCase();
        const h = 46;
        const w = Math.max(h, text.length * 20 + 22);
        const g = k.g;
        g.clear();
        g.fillColor = KEY_BG;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        g.strokeColor = KEY_EDGE;
        g.lineWidth = 3;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.stroke();
        k.label.string = text;
        k.label.fontSize = text.length > 1 ? 24 : 30;
        k.label.lineHeight = h;
    }

    private child(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        parent.addChild(n);
        return n;
    }
}
