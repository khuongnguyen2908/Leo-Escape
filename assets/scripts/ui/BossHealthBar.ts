import { _decorator, Color, Component, Label, Node, Sprite, SpriteFrame, UIOpacity } from 'cc';
import { useGameFont } from './GameFont';
import { EnemyPatrol } from '../enemy/EnemyPatrol';
import { GameManager } from '../game/GameManager';
const { ccclass, property } = _decorator;

const TEXT = new Color(255, 240, 215, 255);

/**
 * Thanh máu boss ở đáy màn hình: khung MG_boss_hpgauge, thanh đỏ MG_boss_hp co lại theo máu,
 * icon MG_icon_boss ở đầu trái. Chỉ hiện khi mèo tới gần boss, ẩn dần khi boss bị hạ.
 */
@ccclass('BossHealthBar')
export class BossHealthBar extends Component {
    @property({ type: EnemyPatrol })
    boss: EnemyPatrol | null = null;

    @property({ type: SpriteFrame })
    gaugeFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    fillFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    iconFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Mèo cách boss bao xa thì thanh máu hiện ra' })
    showDistance = 1500;

    private fill: Sprite | null = null;
    private label: Label | null = null;
    private opacity: UIOpacity | null = null;

    start() {
        this.opacity = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        this.opacity.opacity = 0;

        const gaugeW = this.gaugeFrame?.rect.width ?? 1000;
        if (this.gaugeFrame) this.child('Gauge').addComponent(Sprite).spriteFrame = this.gaugeFrame;
        if (this.fillFrame) {
            this.fill = this.child('Fill').addComponent(Sprite);
            this.fill.spriteFrame = this.fillFrame;
            this.fill.type = Sprite.Type.FILLED;
            this.fill.fillType = Sprite.FillType.HORIZONTAL;
            this.fill.fillStart = 0;
            this.fill.fillRange = 1;
        }
        if (this.iconFrame) {
            const icon = this.child('Icon');
            icon.addComponent(Sprite).spriteFrame = this.iconFrame;
            icon.setPosition(-gaugeW / 2 + 8, 0, 0);
        }
        this.label = this.child('Value').addComponent(Label);
        this.label.fontSize = 28;
        this.label.lineHeight = 32;
        this.label.isBold = true;
        this.label.color = TEXT;
        useGameFont(this.label);
    }

    update(dt: number) {
        const boss = this.boss;
        const player = GameManager.instance?.player;
        if (!this.opacity) return;

        const alive = !!boss && boss.isValid && !boss.defeated;
        const near = alive && !!player && Math.abs(player.node.position.x - boss!.node.position.x) < this.showDistance;
        const target = near ? 255 : 0;
        this.opacity.opacity += (target - this.opacity.opacity) * Math.min(1, dt * 6);

        if (boss && boss.isValid) {
            const hp = Math.max(0, boss.hp);
            if (this.fill) this.fill.fillRange = hp / boss.maxHp;
            if (this.label) this.label.string = `${hp}/${boss.maxHp}`;
        }
    }

    private child(name: string): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        this.node.addChild(n);
        return n;
    }
}
