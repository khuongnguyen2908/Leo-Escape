import { _decorator, Color, Component, Graphics, Label, Node, Size, UITransform } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

const TEXT_DARK = new Color(50, 35, 30, 255);

/** Khối màu kèm tên, đứng tạm chỗ cho ảnh chưa có. Gốc ở đáy-giữa. */
@ccclass('PlaceholderBox')
@executeInEditMode
@requireComponent(Graphics)
export class PlaceholderBox extends Component {
    @property
    size = new Size(100, 100);

    @property
    color = new Color(214, 170, 120, 255);

    @property
    text = '';

    @property
    lightText = false;

    onLoad() {
        this.redraw();
    }

    setup(w: number, h: number, color: Color, text: string, lightText = false) {
        this.size = new Size(w, h);
        this.color = color.clone();
        this.text = text;
        this.lightText = lightText;
        this.redraw();
    }

    redraw() {
        const { width: w, height: h } = this.size;
        const ui = this.getComponent(UITransform)!;
        ui.setContentSize(w, h);
        ui.setAnchorPoint(0.5, 0);

        const g = this.getComponent(Graphics)!;
        g.clear();
        g.fillColor = this.color;
        g.strokeColor = TEXT_DARK;
        g.lineWidth = 3;
        g.roundRect(-w / 2, 0, w, h, Math.min(16, w / 4, h / 4));
        g.fill();
        g.stroke();

        let t = this.node.getChildByName('Label');
        if (!t) {
            t = new Node('Label');
            t.layer = this.node.layer;
            this.node.addChild(t);
        }
        t.setPosition(0, h / 2, 0);
        const label = t.getComponent(Label) ?? t.addComponent(Label);
        label.string = this.text;
        label.fontSize = 20;
        label.lineHeight = 24;
        label.color = this.lightText ? Color.WHITE : TEXT_DARK;
    }
}
