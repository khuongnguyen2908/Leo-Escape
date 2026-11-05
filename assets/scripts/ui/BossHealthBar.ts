import { _decorator, Color, Component, Label, Node, Sprite, SpriteFrame, UIOpacity } from 'cc';
import { useGameFont } from './GameFont';
import { EnemyPatrol } from '../enemy/EnemyPatrol';
import { GameManager } from '../game/GameManager';
const { ccclass, property } = _decorator;

const TEXT = new Color(255, 240, 215, 255);

/**
 * Thanh máu boss ở đáy màn hình: khung MG_boss_hpgauge, thanh đỏ MG_boss_hp co lại theo máu,
 * icon MG_icon_boss ở đầu trái. Có khu boss (BossArena) thì hiện theo cảnh mở màn: trượt lên từ đáy rồi đầy dần;
 * không có thì hiện khi mèo tới gần boss. Bị đánh thì thanh tụt từ từ. Ẩn dần khi boss bị hạ.
 */
@ccclass('BossHealthBar')
export class BossHealthBar extends Component {
    static instance: BossHealthBar | null = null;

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
    /** BossArena điều khiển lúc hiện / ẩn (không theo khoảng cách nữa). */
    private driven = false;
    private shown = false;
    /** Phần máu đang vẽ (chạy dần tới máu thật). */
    private shownFill = 1;
    private baseY = 0;
    private slide = 0;

    onLoad() {
        BossHealthBar.instance = this;
    }

    onDestroy() {
        if (BossHealthBar.instance === this) BossHealthBar.instance = null;
    }

    /** Hiện ra: trượt lên từ đáy, thanh đầy dần từ 0. */
    reveal() {
        this.driven = true;
        this.shown = true;
        this.shownFill = 0;
        this.slide = 1;
    }

    /** Ẩn (đánh lại từ đầu). */
    conceal() {
        this.driven = true;
        this.shown = false;
    }

    start() {
        this.opacity = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        this.opacity.opacity = 0;
        this.baseY = this.node.position.y;

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
        const cats = GameManager.instance?.cats ?? [];
        if (!this.opacity) return;

        const alive = !!boss && boss.isValid && !boss.defeated;
        const near = this.driven ? this.shown : cats.some((c) => Math.abs(c.node.position.x - boss!.node.position.x) < this.showDistance);
        const target = alive && near ? 255 : 0;
        this.opacity.opacity += (target - this.opacity.opacity) * Math.min(1, dt * 6);
        // Trượt lên từ dưới đáy lúc mới hiện
        this.slide = Math.max(0, this.slide - dt * 2.2);
        const p = this.node.position;
        this.node.setPosition(p.x, this.baseY - 160 * this.slide * this.slide, p.z);

        if (boss && boss.isValid) {
            const hp = Math.max(0, boss.hp);
            // Thanh chạy dần tới máu thật: lúc mới hiện thì đầy dần, bị đánh thì tụt từ từ
            const ratio = hp / boss.maxHp;
            this.shownFill += (ratio - this.shownFill) * Math.min(1, dt * (this.shownFill < ratio ? 2.5 : 8));
            if (Math.abs(ratio - this.shownFill) < 0.002) this.shownFill = ratio;
            if (this.fill) this.fill.fillRange = this.shownFill;
            if (this.label) this.label.string = `${Math.round(this.shownFill * boss.maxHp)}/${boss.maxHp}`;
        }
    }

    private child(name: string): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        this.node.addChild(n);
        return n;
    }
}
