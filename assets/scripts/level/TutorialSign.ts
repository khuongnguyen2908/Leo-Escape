import { _decorator, CCString, Color, Component, Enum, Graphics, Label, Node, UITransform } from 'cc';
import { EDITOR } from 'cc/env';
import { Action, keyShort, Settings } from '../core/Settings';
import { Unlocks } from '../game/Upgrades';
import { keyCap, keyCapWidth } from '../ui/KeyCap';
import { Lang, T, TextKey } from '../ui/Lang';
import { setText, UI, uiLabel, uiNode } from '../ui/UiKit';
const { ccclass, property, executeInEditMode } = _decorator;

/** Hướng mũi tên vẽ tay dưới / cạnh biển */
enum ArrowDir { None, Down, Right, Up, Left }

const INK = new Color(70, 52, 48, 255);
const INK_SOFT = new Color(110, 86, 78, 255);

/**
 * Phím của từng chủ đề: chuỗi hành động, "+" = bấm cùng lúc, "," = bấm lần lượt, "/" = một trong hai, "~" sau tên = giữ.
 * Ô phím lấy theo phím Người 1 đang cài (đổi phím trong Cài đặt thì biển đổi theo).
 */
const TOPIC_KEYS: Record<string, string> = {
    title: '',
    run: 'left/right',
    duck: 'down~',
    jump: 'jump',
    doubleJump: 'jump,jump',
    up: 'up',
    descend: 'down,down',
    dash: 'interact',
    attack: 'attack',
    wave: 'attack~',
    sweep: 'down+attack',
    launch: 'up+attack',
    special: 'skill',
    fish: '',
    exit: 'up',
};

/**
 * Biển chỉ dẫn trong màn hướng dẫn (giấy kem, nét bút nâu): hàng ô phím, tên động tác to, một dòng giải thích, mũi tên vẽ tay.
 * Ô Topic: run / duck / jump / doubleJump / up / descend / dash / attack / wave / sweep / launch / special / fish / exit / title.
 * Chữ nằm trong ui/Lang.ts (tsign.<topic>.t và .d). Kéo node để dời biển; ô Arrow chọn hướng mũi tên.
 */
@ccclass('TutorialSign')
@executeInEditMode
export class TutorialSign extends Component {
    @property({ type: CCString, tooltip: 'Chủ đề: run, duck, jump, doubleJump, up, descend, dash, attack, wave, sweep, launch, special, fish, exit, title' })
    get topic() { return this._topic; }
    set topic(v: string) { this._topic = v; this.redraw(); }

    @property({ type: Enum(ArrowDir), tooltip: 'Mũi tên vẽ tay chỉ về chỗ tập' })
    get arrow() { return this._arrow; }
    set arrow(v: ArrowDir) { this._arrow = v; this.redraw(); }

    @property({ tooltip: 'Mũi tên dài bao nhiêu' })
    get arrowLength() { return this._arrowLength; }
    set arrowLength(v: number) { this._arrowLength = v; this.redraw(); }

    @property
    _topic = 'run';

    @property
    _arrow: ArrowDir = ArrowDir.None;

    @property
    _arrowLength = 150;

    private readonly onChange = () => this.redraw();

    onLoad() {
        this.redraw();
        if (!EDITOR) {
            Settings.onChange(this.onChange);
            Lang.onChange(this.onChange);
            Unlocks.onChange(this.onChange);
        }
    }

    onDestroy() {
        Settings.offChange(this.onChange);
        Lang.offChange(this.onChange);
        Unlocks.offChange(this.onChange);
    }

    redraw() {
        if (!this.node || !this.node.isValid) return;
        // Xoá hình cũ: tách khỏi cha ngay (destroy chỉ xoá cuối khung, vẽ lại liền sẽ bị trùng)
        for (const old of this.node.children.filter((c) => c.name === 'Sign')) {
            old.removeFromParent();
            old.destroy();
        }
        const root = uiNode('Sign', this.node);
        // Biển Sóng kiếm: chưa mua ở cửa hàng thì ẩn (trong editor vẫn thấy để kéo)
        if (!EDITOR && this._topic === 'wave' && !Unlocks.has('wave')) root.active = false;
        const big = this._topic === 'title';
        // Hàng ô phím
        const spec = TOPIC_KEYS[this._topic] ?? '';
        const top = big ? 0 : 74;
        if (spec) this.drawKeys(root, spec, top);
        const title: Label = uiLabel(root, '', big ? 84 : 52, INK, { name: 'Title' });
        setText(title, T(`tsign.${this._topic}.t` as TextKey));
        title.node.setPosition(0, big ? 30 : 6, 0);
        const desc: Label = uiLabel(root, '', big ? 32 : 28, INK_SOFT, { name: 'Desc' });
        setText(desc, T(`tsign.${this._topic}.d` as TextKey));
        desc.node.setPosition(0, big ? -40 : -42, 0);
        this.drawArrow(root, big ? -80 : -80);
    }

    private drawKeys(root: Node, spec: string, y: number) {
        const h = 50;
        // Tách thành các ô: tên hành động và dấu nối
        const parts: { text: string; key: boolean }[] = [];
        let hold = false;
        for (const tok of spec.split(/([+,/])/)) {
            if (tok === '+' || tok === '/') parts.push({ text: tok, key: false });
            else if (tok === ',') parts.push({ text: ' ', key: false });
            else if (tok) {
                const name = tok.replace('~', '') as Action;
                if (tok.endsWith('~')) hold = true;
                parts.push({ text: keyShort(Settings.key(0, name)).toUpperCase(), key: true });
            }
        }
        if (hold) parts.push({ text: T('tsign.hold'), key: false });
        const widths = parts.map((p) => (p.key ? keyCapWidth(p.text, h) : p.text === ' ' ? 4 : p.text.length > 2 ? p.text.length * 15 : 30));
        const gap = 10;
        const total = widths.reduce((s, w) => s + w, 0) + gap * (parts.length - 1);
        let x = -total / 2;
        parts.forEach((p, i) => {
            const cx = x + widths[i] / 2;
            if (p.key) keyCap(root, p.text, cx, y, h);
            else if (p.text !== ' ') {
                const l = uiLabel(root, '', 30, INK, { name: 'Join' });
                setText(l, p.text);
                l.node.setPosition(cx, y, 0);
            }
            x += widths[i] + gap;
        });
    }

    /** Mũi tên nét bút chì: đường hơi cong + đầu mũi tên. */
    private drawArrow(root: Node, y: number) {
        if (this._arrow === ArrowDir.None) return;
        const n = uiNode('Arrow', root, 10, 10);
        const g = n.addComponent(Graphics);
        g.strokeColor = INK;
        g.lineWidth = 5;
        g.lineCap = Graphics.LineCap.ROUND;
        const L = this._arrowLength;
        let x0 = 0, y0 = y, x1 = 0, y1 = y;
        switch (this._arrow) {
            case ArrowDir.Down: y1 = y - L; break;
            case ArrowDir.Up: y0 = y + 260; y1 = y0 + L; break;
            case ArrowDir.Right: x0 = 200; y0 = y1 = 0; x1 = 200 + L; break;
            case ArrowDir.Left: x0 = -200; y0 = y1 = 0; x1 = -200 - L; break;
        }
        // Thân hơi cong (như vẽ tay)
        const mx = (x0 + x1) / 2 + (y1 - y0) * 0.08, my = (y0 + y1) / 2 + (x1 - x0) * 0.08;
        g.moveTo(x0, y0);
        g.quadraticCurveTo(mx, my, x1, y1);
        g.stroke();
        const a = Math.atan2(y1 - my, x1 - mx);
        const k = 22;
        g.moveTo(x1 - Math.cos(a - 0.45) * k, y1 - Math.sin(a - 0.45) * k);
        g.lineTo(x1, y1);
        g.lineTo(x1 - Math.cos(a + 0.45) * k, y1 - Math.sin(a + 0.45) * k);
        g.stroke();
        n.getComponent(UITransform)!.setContentSize(10, 10);
    }
}

export { ArrowDir };
