import { _decorator, Color, Component, Graphics, Label, Node, Sprite, SpriteFrame, tween, Tween, UIOpacity, UITransform } from 'cc';
import { EDITOR } from 'cc/env';
import { keyShort, Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { PlayerInput } from '../player/PlayerInput';
import { useGameFont } from '../ui/GameFont';
import { T } from '../ui/Lang';
const { ccclass, property, executeInEditMode } = _decorator;

const KEY_BG = new Color(250, 240, 222, 255);
const KEY_EDGE = new Color(70, 44, 34, 255);
const HINT_TEXT = new Color(250, 240, 222, 255);
const HINT_OUTLINE = new Color(70, 44, 34, 255);

/**
 * Miếu lưu game (điểm lưu): mèo đứng gần thì hiện gợi ý phím Dùng (E); bấm E (hoặc nút Nhảy trên điện thoại, lúc này đổi thành Dùng)
 * thì ghi ô lưu, đặt chỗ hồi sinh ở đây, hồi đầy tim, lớp sáng (ảnh active) bừng lên rồi tắt dần.
 * Gốc node = chân miếu (giữa ảnh, mép dưới). Ảnh miếu và ảnh sáng cùng cỡ, chồng khít nhau. Chỉ là hình, không có va chạm.
 */
@ccclass('SavePoint')
@executeInEditMode
export class SavePoint extends Component {
    static readonly all: SavePoint[] = [];

    @property({ type: SpriteFrame, tooltip: 'Ảnh miếu' })
    frame: SpriteFrame | null = null;
    @property({ type: SpriteFrame, tooltip: 'Ảnh sáng (cùng cỡ ảnh miếu, chồng khít lên)' })
    activeFrame: SpriteFrame | null = null;
    @property({ tooltip: 'Phóng ảnh' })
    artScale = 1;
    @property({ tooltip: 'Thân miếu lệch sang phải so với giữa ảnh (ảnh có bóng đổ bên trái): gợi ý phím và vùng đứng gần tính theo thân' })
    bodyOffsetX = 100;
    @property({ tooltip: 'Mèo cách thân miếu chừng này (ngang) thì dùng được' })
    range = 220;

    private glow: UIOpacity | null = null;
    private hint: UIOpacity | null = null;
    private hintKey: Label | null = null;
    private hintKeyBg: Graphics | null = null;
    private hintShown = false;
    private readonly onKeys = () => this.paintKey();

    setup(frame: SpriteFrame | null, activeFrame: SpriteFrame | null, artScale = 1) {
        this.frame = frame;
        this.activeFrame = activeFrame;
        this.artScale = artScale;
        this.redraw();
    }

    onLoad() {
        this.redraw();
    }

    onEnable() {
        if (EDITOR) return;
        SavePoint.all.push(this);
        Settings.onChange(this.onKeys);
    }

    onDisable() {
        const i = SavePoint.all.indexOf(this);
        if (i >= 0) SavePoint.all.splice(i, 1);
        if (EDITOR) return;
        Settings.offChange(this.onKeys);
        if (SavePoint.all.length === 0) PlayerInput.useNearby = false;
    }

    private child(name: string, parent: Node): Node {
        let n = parent.getChildByName(name);
        if (!n) {
            n = new Node(name);
            n.layer = this.node.layer;
            parent.addChild(n);
        }
        return n;
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        const place = (n: Node, frame: SpriteFrame | null) => {
            const ut = n.getComponent(UITransform) ?? n.addComponent(UITransform);
            ut.setAnchorPoint(0.5, 0);
            const sp = n.getComponent(Sprite) ?? n.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.RAW;
            sp.trim = false;
            sp.spriteFrame = frame;
            n.setScale(this.artScale, this.artScale, 1);
            return sp;
        };
        place(this.child('Mieu', this.node), this.frame);
        const glowNode = this.child('Sang', this.node);
        place(glowNode, this.activeFrame);
        this.glow = glowNode.getComponent(UIOpacity) ?? glowNode.addComponent(UIOpacity);
        this.glow.opacity = 0;

        // Gợi ý: phím Dùng (ô kem viền nâu) + chữ "Lưu game", phía trên thân miếu
        const h = (this.frame ? this.frame.rect.height : 480) * this.artScale;
        const hint = this.child('GoiY', this.node);
        hint.setPosition(this.bodyOffsetX * this.artScale, h + 60, 0);
        this.hint = hint.getComponent(UIOpacity) ?? hint.addComponent(UIOpacity);
        this.hint.opacity = 0;
        const keyNode = this.child('Phim', hint);
        this.hintKeyBg = keyNode.getComponent(Graphics) ?? keyNode.addComponent(Graphics);
        const keyText = this.child('Chu', keyNode);
        this.hintKey = keyText.getComponent(Label) ?? keyText.addComponent(Label);
        this.hintKey.color = KEY_EDGE;
        useGameFont(this.hintKey);
        const textNode = this.child('Ten', hint);
        textNode.setPosition(0, -62, 0);
        const text = textNode.getComponent(Label) ?? textNode.addComponent(Label);
        text.fontSize = 34;
        text.lineHeight = 40;
        text.color = HINT_TEXT;
        text.enableOutline = true;
        text.outlineColor = HINT_OUTLINE;
        text.outlineWidth = 4;
        useGameFont(text);
        text.string = EDITOR ? 'Lưu game' : T('save.hint');
        this.paintKey();
    }

    /** Ô phím: chữ theo phím Dùng đang gán (đổi phím trong menu thì đổi theo) */
    private paintKey() {
        const g = this.hintKeyBg, label = this.hintKey;
        if (!g || !label || !g.isValid) return;
        const text = EDITOR ? 'E' : keyShort(Settings.key(0, 'use')).toUpperCase();
        const hh = 56, w = Math.max(hh, text.length * 22 + 26);
        g.clear();
        g.fillColor = KEY_BG;
        g.roundRect(-w / 2, -hh / 2, w, hh, 12);
        g.fill();
        g.strokeColor = KEY_EDGE;
        g.lineWidth = 4;
        g.roundRect(-w / 2, -hh / 2, w, hh, 12);
        g.stroke();
        label.string = text;
        label.fontSize = text.length > 1 ? 26 : 34;
        label.lineHeight = hh;
    }

    update() {
        if (EDITOR || SavePoint.all[0] !== this) return;
        SavePoint.tick();
    }

    /** Một lần mỗi khung hình (miếu đầu danh sách gọi): tìm miếu mèo đang đứng gần, đổi nút Nhảy trên điện thoại, nhận phím Dùng. */
    private static tick() {
        const gm = GameManager.instance;
        const cat = gm?.player;
        let near: SavePoint | null = null;
        if (gm && cat && !cat.downed) {
            const p = cat.node.position;
            let best = Infinity;
            for (const s of SavePoint.all) {
                const me = s.node.position;
                const dx = Math.abs(p.x - (me.x + s.bodyOffsetX * s.artScale));
                if (dx < s.range && p.y > me.y - 80 && p.y < me.y + 300 && dx < best) {
                    best = dx;
                    near = s;
                }
            }
        }
        PlayerInput.useNearby = !!near;
        for (const s of SavePoint.all) s.showHint(s === near);
        // Luôn lấy lần bấm ra (đứng xa bấm E thì bỏ), để lần sau tới gần miếu không tự lưu
        const pressed = !!cat && cat.controls.consumeUse();
        if (pressed && near && gm) near.activate(gm);
    }

    private showHint(on: boolean) {
        if (on === this.hintShown || !this.hint) return;
        this.hintShown = on;
        Tween.stopAllByTarget(this.hint);
        tween(this.hint).to(0.2, { opacity: on ? 255 : 0 }).start();
    }

    /** Lưu: ghi ô lưu, hồi sinh ở đây, đầy tim; lớp sáng bừng lên (0,15 giây), giữ một chút rồi tắt dần */
    private activate(gm: GameManager) {
        gm.saveAtShrine(this.node);
        Sound.play('checkpoint', 0.9);
        const glow = this.glow;
        if (!glow) return;
        Tween.stopAllByTarget(glow);
        glow.opacity = 0;
        tween(glow).to(0.15, { opacity: 255 }).delay(0.7).to(1.4, { opacity: 0 }).start();
    }
}
