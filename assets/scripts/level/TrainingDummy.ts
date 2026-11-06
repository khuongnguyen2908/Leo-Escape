import { _decorator, Color, Component, Graphics, Node, Rect } from 'cc';
import { EDITOR } from 'cc/env';
import { Hittable, registerHittable, unregisterHittable } from '../core/Hittable';
import { Sound } from '../core/Sound';
import { HitSpark } from '../player/HitSpark';
import { uiNode } from '../ui/UiKit';
const { ccclass, property, executeInEditMode } = _decorator;

const INK = new Color(70, 52, 48, 255);
const SACK = new Color(232, 214, 176, 255);
const SACK_HIT = new Color(255, 240, 210, 255);
const POST = new Color(140, 104, 78, 255);
const RING = new Color(210, 70, 60, 255);
const W = 120;
const H = 230;

/**
 * Hình nộm tập đánh trong màn hướng dẫn: bao cát trên cột gỗ, vẽ bằng code. Chém / sóng kiếm / quét chân / chém hất trúng thì
 * lắc lư, chớp sáng, toé tia; không mất máu, không chết, không đánh lại. Gốc node = giữa chân cột (đặt trên mặt đất).
 * Node phải là con trực tiếp của Gameplay.
 */
@ccclass('TrainingDummy')
@executeInEditMode
export class TrainingDummy extends Component implements Hittable {
    @property({ tooltip: 'Lắc mạnh bao nhiêu khi bị chém' })
    wobble = 22;

    private body: Node | null = null;
    private g: Graphics | null = null;
    private angle = 0;
    private angVel = 0;
    private flash = 0;
    private cooldown = 0;

    get canBeHit() { return this.cooldown <= 0; }
    get big() { return false; }

    getHitRect(out: Rect): Rect {
        const p = this.node.position;
        return out.set(p.x - W / 2, p.y, W, H);
    }

    onLoad() {
        this.body = this.node.getChildByName('Body') ?? uiNode('Body', this.node, W, H);
        this.g = this.body.getComponent(Graphics) ?? this.body.addComponent(Graphics);
        this.draw();
    }

    onEnable() {
        if (!EDITOR) registerHittable(this);
    }

    onDisable() {
        if (!EDITOR) unregisterHittable(this);
    }

    update(dt: number) {
        if (EDITOR) return;
        if (this.cooldown > 0) this.cooldown -= dt;
        // Lò xo: lắc qua lại rồi đứng yên
        this.angVel += (-90 * this.angle - 7 * this.angVel) * dt;
        this.angle += this.angVel * dt;
        if (this.body) this.body.angle = this.angle;
        if (this.flash > 0) {
            this.flash -= dt;
            this.draw();
        }
    }

    takeHit(fromX?: number, power = 1) {
        this.cooldown = 0.1;
        const away = fromX === undefined ? 1 : (this.node.position.x >= fromX ? 1 : -1);
        this.angVel += -away * this.wobble * 10 * Math.min(2, power);
        this.flash = 0.12;
        this.draw();
        Sound.play('hit', 0.6);
        const parent = this.node.parent;
        const p = this.node.position;
        if (parent) HitSpark.spawn(parent, p.x, p.y + H * 0.6, away, power > 1.5);
    }

    daze() { this.angVel += this.wobble * 6; }
    trip(_s: number, fromX?: number) { this.takeHit(fromX, 1.6); }
    launch() { this.angVel -= this.wobble * 12; }

    /** Cột gỗ, bao cát có vòng bia đỏ, đầu tròn. Xoay quanh chân cột. */
    private draw() {
        const g = this.g;
        if (!g) return;
        g.clear();
        g.fillColor = new Color(60, 45, 40, 50);
        g.ellipse(0, 0, 62, 12);
        g.fill();
        g.fillColor = POST;
        g.strokeColor = INK;
        g.lineWidth = 4;
        g.rect(-10, 0, 20, 120);
        g.fill();
        g.stroke();
        g.rect(-44, 6, 88, 14);
        g.fill();
        g.stroke();
        // Bao cát
        g.fillColor = this.flash > 0 ? SACK_HIT : SACK;
        g.ellipse(0, 150, 54, 62);
        g.fill();
        g.stroke();
        // Vòng bia
        g.strokeColor = RING;
        g.lineWidth = 6;
        g.circle(0, 150, 32);
        g.stroke();
        g.fillColor = RING;
        g.circle(0, 150, 11);
        g.fill();
        // Đầu
        g.fillColor = this.flash > 0 ? SACK_HIT : SACK;
        g.strokeColor = INK;
        g.lineWidth = 4;
        g.circle(0, 222, 24);
        g.fill();
        g.stroke();
        // Đường may
        g.lineWidth = 2;
        g.moveTo(-30, 112);
        g.lineTo(30, 112);
        g.stroke();
    }
}
