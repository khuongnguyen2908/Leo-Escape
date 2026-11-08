import { _decorator, Color, Component, Label, Node, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { useGameFont } from './GameFont';
const { ccclass, property } = _decorator;

const TEXT = new Color(255, 240, 215, 255);

/** Bộ đếm cá vàng trên HUD: nền MG_coin_backing (con cá bên trái + thanh số bên phải). */
@ccclass('CoinCounter')
export class CoinCounter extends Component {
    @property({ type: SpriteFrame, tooltip: 'Nền bộ đếm (MG_coin_backing)' })
    backingFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Tỉ lệ hiển thị so với cỡ gốc của ảnh nền' })
    scale = 1;

    @property({ tooltip: 'Tâm chữ số lệch sang phải so với tâm ảnh nền (phần thanh nằm bên phải con cá)' })
    textOffsetX = 39;

    @property({ tooltip: 'Tâm chữ số lệch lên trên so với tâm ảnh nền (thanh nâu nằm cao hơn tâm ảnh, chữ số của font hơi thấp)' })
    textOffsetY = 7;

    @property
    fontSize = 34;

    private label: Label | null = null;
    private value = 0;

    start() {
        this.build();
        this.render();
    }

    setValue(v: number) {
        const grew = v > this.value;
        this.value = v;
        this.render();
        if (grew && this.label) {
            const n = this.label.node;
            n.setScale(1.25, 1.25, 1);
            tween(n).to(0.15, { scale: Vec3.ONE }).start();
        }
    }

    private build() {
        if (this.label) return;
        if (this.backingFrame) {
            const bg = this.child('Backing');
            bg.addComponent(Sprite).spriteFrame = this.backingFrame;
            bg.setScale(this.scale, this.scale, 1);
        }
        const t = this.child('Value');
        t.setPosition(this.textOffsetX * this.scale, this.textOffsetY * this.scale, 0);
        this.label = t.addComponent(Label);
        this.label.fontSize = this.fontSize;
        this.label.lineHeight = this.fontSize + 6;
        this.label.isBold = true;
        this.label.color = TEXT;
        useGameFont(this.label);
    }

    private render() {
        if (this.label) this.label.string = this.value.toLocaleString('en-US');
    }

    private child(name: string): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        this.node.addChild(n);
        return n;
    }
}
