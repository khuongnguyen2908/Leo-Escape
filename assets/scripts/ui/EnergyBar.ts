import { _decorator, Color, Component, Graphics, Material, Node, Size, Sprite, SpriteFrame } from 'cc';
import { loadSilhouette } from '../core/Silhouette';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../player/PlayerController';
const { ccclass, property } = _decorator;

const OUTLINE = new Color(60, 42, 40, 255);
const TRACK = new Color(118, 100, 98, 255);
const FILL = new Color(96, 190, 222, 255);
const SHINE = new Color(190, 235, 248, 255);
const WARN = new Color(232, 84, 72, 255);
/** Thanh nộ đầy (bấm phím special được): nhấp nháy vàng; đang bật special: vàng cam */
const READY = new Color(255, 214, 90, 255);
const SPECIAL = new Color(255, 170, 60, 255);

/**
 * Thanh nộ dưới hàng tim, đọc energy của mèo mỗi frame. Đánh trúng thì đầy dần, đầy thì bật được Special;
 * bấm Special khi chưa đầy thì thanh nháy đỏ và rung.
 * Chưa có ảnh thì tự vẽ; kéo ảnh khung + ảnh thanh vào là tự đổi sang dùng ảnh (MG_energy_gauge, MG_energy_fill).
 */
@ccclass('EnergyBar')
export class EnergyBar extends Component {
    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh khung thanh năng lượng' })
    frameFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: 'Không bắt buộc: ảnh phần thanh màu (co lại theo năng lượng)' })
    fillFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Kích thước thanh khi tự vẽ' })
    size = new Size(450, 27);

    @property({ type: PlayerController, tooltip: 'Con mèo của thanh này. Để trống = Leo' })
    target: PlayerController | null = null;

    private fillSprite: Sprite | null = null;
    private fillGfx: Graphics | null = null;
    private warnGfx: Graphics | null = null;
    private shown = 1;
    private warn = false;
    /** Màu thanh lúc này (đầy / đang special), null = màu thường */
    private glow: Color | null = null;
    private time = 0;
    private baseScale = NaN;
    private solidMat: Material | null = null;
    private solidOn = false;
    private baseX = NaN;

    start() {
        loadSilhouette((m) => { this.solidMat = m; });
        if (this.frameFrame) this.child('Frame').addComponent(Sprite).spriteFrame = this.frameFrame;
        if (this.fillFrame) {
            const sp = this.child('Fill').addComponent(Sprite);
            sp.spriteFrame = this.fillFrame;
            sp.type = Sprite.Type.FILLED;
            sp.fillType = Sprite.FillType.HORIZONTAL;
            sp.fillStart = 0;
            sp.fillRange = 1;
            this.fillSprite = sp;
        }
        if (this.frameFrame || this.fillFrame) {
            // Viền đỏ quanh khung ảnh, chỉ hiện lúc không đủ năng lượng
            const r = (this.frameFrame ?? this.fillFrame)!.rect;
            const g = this.child('Warn').addComponent(Graphics);
            g.strokeColor = WARN;
            g.lineWidth = 5;
            g.roundRect(-r.width / 2 - 4, -r.height / 2 - 4, r.width + 8, r.height + 8, r.height / 2 + 4);
            g.stroke();
            g.node.active = false;
            this.warnGfx = g;
        }
        if (!this.frameFrame && !this.fillFrame) {
            const { width: w, height: h } = this.size;
            const g = this.child('Back').addComponent(Graphics);
            g.fillColor = TRACK;
            g.strokeColor = OUTLINE;
            g.lineWidth = 5;
            g.roundRect(-w / 2, -h / 2, w, h, h / 2);
            g.fill();
            g.stroke();
            this.fillGfx = this.child('Fill').addComponent(Graphics);
        }
    }

    update(dt: number) {
        const p = this.target ?? GameManager.instance?.player;
        const ratio = p ? Math.max(0, Math.min(1, p.energy / p.maxEnergy)) : 1;
        this.shown += (ratio - this.shown) * Math.min(1, dt * 10);
        // Không đủ năng lượng: nháy đỏ + rung ngang
        const warnLeft = p ? p.energyWarn : 0;
        this.warn = warnLeft > 0 && Math.floor(warnLeft * 16) % 2 === 0;
        if (isNaN(this.baseX)) this.baseX = this.node.position.x;
        const pos = this.node.position;
        this.node.setPosition(this.baseX + (warnLeft > 0 ? Math.sin(warnLeft * 90) * 6 : 0), pos.y, pos.z);
        // Đầy nộ: nhấp nháy vàng, phồng nhẹ (bấm phím special được); đang bật special: vàng cam
        this.time += dt;
        const ready = !!p && p.specialReady;
        const pulse = ready ? 0.5 + 0.5 * Math.sin(this.time * 8) : 0;
        this.glow = p && p.specialOn ? SPECIAL : ready ? (pulse > 0.5 ? READY : FILL) : null;
        if (isNaN(this.baseScale)) this.baseScale = this.node.scale.x;
        const k = this.baseScale * (1 + 0.04 * pulse);
        this.node.setScale(k, k, 1);

        if (this.fillSprite) {
            this.fillSprite.fillRange = this.shown;
            // Ảnh thanh màu xanh: nhân màu không ra vàng được, nên lúc đầy nộ / đang special tô hẳn một màu (shader tô một màu)
            const solid = !this.warn && !!this.glow && !!this.solidMat;
            if (solid !== this.solidOn) {
                this.solidOn = solid;
                this.fillSprite.customMaterial = solid ? this.solidMat : null;
            }
            this.fillSprite.color = this.warn ? WARN : this.glow ?? Color.WHITE;
        }
        if (this.warnGfx) this.warnGfx.node.active = this.warn;
        if (this.fillGfx) this.drawFill(this.fillGfx, this.shown);
    }

    private drawFill(g: Graphics, ratio: number) {
        const { width: w, height: h } = this.size;
        const pad = 5;
        const innerH = h - pad * 2;
        const fw = Math.max(0, (w - pad * 2) * ratio);
        g.clear();
        if (this.warn) {
            // Nháy viền đỏ quanh thanh để thấy rõ cả khi thanh gần cạn
            g.strokeColor = WARN;
            g.lineWidth = 4;
            g.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, h / 2 + 3);
            g.stroke();
        }
        if (fw < innerH) return;
        g.fillColor = this.warn ? WARN : this.glow ?? FILL;
        g.roundRect(-w / 2 + pad, -innerH / 2, fw, innerH, innerH / 2);
        g.fill();
        g.fillColor = SHINE;
        g.roundRect(-w / 2 + pad + 4, 0, Math.max(0, fw - 8), innerH / 2 - 2, innerH / 4);
        g.fill();
    }

    private child(name: string): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        this.node.addChild(n);
        return n;
    }
}
