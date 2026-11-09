import { _decorator, Color, Component, EventKeyboard, Graphics, HorizontalTextAlignment, Input, input, KeyCode, Label, Node, resources, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3, VerticalTextAlignment, view } from 'cc';
import { Sound } from '../core/Sound';
import { T, TextKey } from './Lang';
import { setText, UI, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

const BOX = new Color(28, 22, 24, 225);
const NAME_BG = new Color(250, 240, 222, 255);
const SPEAK = new Color(240, 150, 40, 255);
const TEXT = new Color(250, 244, 232, 255);
/** Chữ hiện dần: bao nhiêu ký tự mỗi giây */
const CPS = 38;
const BOX_W = 1680;
const BOX_H = 230;
/** Avatar tròn (MG_avatar) cao bao nhiêu */
const AVATAR = 200;
/** Bảng tên dời sang phải chừng này để chừa chỗ cho avatar */
const NAME_SHIFT = 150;

/**
 * Hội thoại kiểu visual novel ở đáy màn hình (giống mẫu Danganronpa): chân dung mèo phía trên hộp,
 * bảng tên bên trái, chữ SPEAKING màu cam bên phải, câu thoại hiện dần từng chữ, mũi tên nhấp nháy khi hết câu.
 * Bấm phím / chạm: đang hiện dở thì hiện hết câu, hết câu thì sang câu sau; hết câu cuối thì mờ đi và gọi onDone.
 * Dùng DialogueBox.show(canvas, chân dung, tên, [các câu], onDone).
 */
@ccclass('DialogueBox')
export class DialogueBox extends Component {
    onDone: (() => void) | null = null;

    private lines: string[] = [];
    private index = -1;
    private shown = 0;
    private text!: Label;
    private next!: Node;
    private time = 0;
    private acceptAt = 0;
    private closing = false;

    static show(parent: Node, portrait: SpriteFrame | null, nameKey: TextKey, lineKeys: TextKey[], onDone: () => void): DialogueBox {
        const n = uiNode('Dialogue', parent);
        n.setSiblingIndex(parent.children.length - 1);
        const box = n.addComponent(DialogueBox);
        box.onDone = onDone;
        box.build(portrait, nameKey, lineKeys);
        return box;
    }

    private build(portrait: SpriteFrame | null, nameKey: TextKey, lineKeys: TextKey[]) {
        const d = view.getDesignResolutionSize();
        const by = -d.height / 2 + BOX_H / 2 + 40;
        // Vùng bấm cả màn hình
        const hit = uiNode('Hit', this.node, d.width, d.height);
        hit.on(Node.EventType.TOUCH_END, this.advance, this);

        // Avatar tròn (ảnh MG_avatar) đè góc trên bên trái hộp thoại, bảng tên ngay bên phải; chưa có ảnh thì dùng chân dung truyền vào
        const pic = uiNode('Avatar', this.node);
        const showAvatar = (sf: SpriteFrame | null) => {
            if (!sf || !pic.isValid) return;
            const sp = pic.getComponent(Sprite) ?? pic.addComponent(Sprite);
            sp.spriteFrame = sf;
            sp.sizeMode = Sprite.SizeMode.RAW;
            const k = AVATAR / Math.max(sf.rect.width, sf.rect.height);
            pic.setScale(k, k, 1);
            // Vẽ trên hộp thoại (đè lên mép hộp), không bị hộp che
            if (pic.parent) pic.setSiblingIndex(pic.parent.children.length - 1);
            const op = pic.getComponent(UIOpacity) ?? pic.addComponent(UIOpacity);
            op.opacity = 0;
            tween(op).to(0.3, { opacity: 255 }).start();
        };
        // Tâm cao hơn mép trên hộp 75: avatar chỉ chồm xuống mép hộp 25, không đè chữ thoại (chữ bắt đầu dưới mép 50)
        pic.setPosition(-BOX_W / 2 + AVATAR / 2 + 10, by + BOX_H / 2 + 75, 0);
        resources.load('art/MG_avatar/spriteFrame', SpriteFrame, (err, sf) => showAvatar(err ? portrait : sf));

        // Hộp thoại
        const box = uiNode('Box', this.node, BOX_W, BOX_H);
        box.setPosition(0, by, 0);
        const g = box.addComponent(Graphics);
        g.fillColor = BOX;
        g.roundRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 30);
        g.fill();
        g.strokeColor = SPEAK;
        g.lineWidth = 6;
        g.moveTo(-BOX_W / 2 + 420 + NAME_SHIFT, BOX_H / 2);
        g.lineTo(BOX_W / 2 - 30, BOX_H / 2);
        g.stroke();
        // Bảng tên bên trái, chồng lên mép trên hộp
        const plate = uiNode('Name', box, 420, 70);
        plate.setPosition(-BOX_W / 2 + 230 + NAME_SHIFT, BOX_H / 2, 0);
        const pg = plate.addComponent(Graphics);
        pg.fillColor = NAME_BG;
        pg.moveTo(-200, -35);
        pg.lineTo(170, -35);
        pg.lineTo(210, 35);
        pg.lineTo(-200, 35);
        pg.close();
        pg.fill();
        const name = uiLabel(plate, '', 42, UI.text);
        setText(name, T(nameKey));
        name.node.setPosition(-20, 0, 0);
        // Câu thoại: canh trái trên, tự xuống dòng
        const tn = uiNode('Text', box, BOX_W - 220, BOX_H - 70);
        tn.getComponent(UITransform)!.setAnchorPoint(0, 1);
        tn.setPosition(-BOX_W / 2 + 70, BOX_H / 2 - 50, 0);
        const label = tn.addComponent(Label);
        label.fontSize = 46;
        label.lineHeight = 58;
        label.color = TEXT;
        label.overflow = Label.Overflow.CLAMP;
        label.enableWrapText = true;
        label.horizontalAlign = HorizontalTextAlignment.LEFT;
        label.verticalAlign = VerticalTextAlignment.TOP;
        this.text = label;
        // Mũi tên "bấm để tiếp"
        const next = uiNode('Next', box, 50, 50);
        next.setPosition(BOX_W / 2 - 60, -BOX_H / 2 + 45, 0);
        const ng = next.addComponent(Graphics);
        ng.fillColor = SPEAK;
        ng.moveTo(-18, 14);
        ng.lineTo(18, 14);
        ng.lineTo(0, -12);
        ng.close();
        ng.fill();
        next.addComponent(UIOpacity);
        this.next = next;

        this.lines = lineKeys.map((k) => T(k));
        const op = this.node.addComponent(UIOpacity);
        op.opacity = 0;
        tween(op).to(0.25, { opacity: 255 }).start();
        box.setPosition(0, by - 60, 0);
        tween(box).to(0.3, { position: new Vec3(0, by, 0) }, { easing: 'backOut' }).start();
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
        this.acceptAt = Date.now() + 400;
        this.showLine(0);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    update(dt: number) {
        this.time += dt;
        const line = this.lines[this.index] ?? '';
        if (this.shown < line.length) {
            const before = Math.floor(this.shown);
            this.shown = Math.min(line.length, this.shown + CPS * dt);
            const now = Math.floor(this.shown);
            if (now !== before) {
                setText(this.text, line.slice(0, now));
                // Tiếng gõ chữ: cứ 2 chữ một tiếng, bỏ qua dấu cách
                if (now % 2 === 0 && line[now - 1] !== ' ') Sound.play('ui_text', 0.5);
            }
        }
        const done = this.shown >= line.length;
        this.next.getComponent(UIOpacity)!.opacity = done ? Math.round(120 + 135 * Math.abs(Math.sin(this.time * 5))) : 0;
        this.next.setPosition(this.next.position.x, -BOX_H / 2 + 45 + (done ? Math.abs(Math.sin(this.time * 5)) * 8 : 0), 0);
    }

    private showLine(i: number) {
        this.index = i;
        this.shown = 0;
        setText(this.text, ' ');
    }

    private onKey(e: EventKeyboard) {
        if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.MOBILE_BACK) return;
        this.advance();
    }

    private advance() {
        if (this.closing || Date.now() < this.acceptAt) return;
        const line = this.lines[this.index] ?? '';
        if (this.shown < line.length) {
            // Đang hiện dở: hiện hết câu
            this.shown = line.length;
            setText(this.text, line);
            this.acceptAt = Date.now() + 120;
            return;
        }
        if (this.index < this.lines.length - 1) {
            Sound.play('ui_move', 0.6);
            this.showLine(this.index + 1);
            this.acceptAt = Date.now() + 120;
            return;
        }
        this.closing = true;
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
        const op = this.node.getComponent(UIOpacity)!;
        tween(op).to(0.25, { opacity: 0 }).call(() => {
            const done = this.onDone;
            this.node.destroy();
            // Sau khi sự kiện phím xử lý xong, để phím vừa bấm không làm mèo nhảy / chém
            setTimeout(() => done?.(), 0);
        }).start();
    }
}
