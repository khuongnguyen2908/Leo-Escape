import { _decorator, Color, Component, Graphics, Node, Rect, Sprite, Texture2D } from 'cc';
import { overlaps } from '../core/Box';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { DustPuff } from '../player/DustPuff';
import { AcidHazard } from './AcidHazard';
const { ccclass } = _decorator;

/** Vũng axit nổ khi cục độc chạm đất / chạm mèo (folder art/fx/Boss/Axit) */
export const ACID_SPLASH = 'Boss/Axit/frame';
const GLOB = new Color(150, 220, 60, 255);
const GLOB_LIGHT = new Color(220, 255, 140, 255);
const _me = new Rect();
const _cat = new Rect();

/**
 * Axit 1: cục độc boss phun ra, bay vòng cung tới chỗ mèo đứng. Trúng mèo giữa đường hoặc chạm đất thì nổ thành
 * vũng axit (ảnh Boss/Axit), mèo trong vũng lúc vừa nổ thì trúng độc.
 * Hình cục độc: khung đầu của ảnh vũng nổ (vệt xanh nhỏ) xoay tròn; chưa có ảnh thì vẽ tròn xanh.
 */
@ccclass('AcidGlob')
export class AcidGlob extends Component {
    private x0 = 0;
    private y0 = 0;
    private x1 = 0;
    private y1 = 0;
    private arc = 260;
    private flight = 0.8;
    private time = 0;
    private alive: () => boolean = () => true;
    private pic: Node | null = null;

    static preload() {
        DustPuff.preload(ACID_SPLASH);
    }

    /** Phun từ (x0, y0) tới mặt đất (x1, y1) trong flight giây, vồng cao arc. */
    static fire(parent: Node, x0: number, y0: number, x1: number, y1: number, flight: number, alive: () => boolean): AcidGlob {
        const n = new Node('AcidGlob');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x0, y0, 0);
        const g = n.addComponent(AcidGlob);
        g.x0 = x0; g.y0 = y0; g.x1 = x1; g.y1 = y1;
        g.flight = Math.max(0.2, flight);
        g.alive = alive;
        const first = DustPuff.frames(ACID_SPLASH)[0];
        const pic = new Node('Pic');
        pic.layer = parent.layer;
        n.addChild(pic);
        if (first) {
            const sp = pic.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.RAW;
            sp.trim = false;
            sp.spriteFrame = first;
            first.texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
            pic.setScale(3.2, 3.2, 1);
        } else {
            const gr = pic.addComponent(Graphics);
            gr.fillColor = GLOB;
            gr.circle(0, 0, 30);
            gr.fill();
            gr.fillColor = GLOB_LIGHT;
            gr.circle(-7, 8, 8);
            gr.fill();
        }
        g.pic = pic;
        return g;
    }

    update(dt: number) {
        this.time += dt;
        const s = Math.min(1, this.time / this.flight);
        const x = this.x0 + (this.x1 - this.x0) * s;
        const y = this.y0 + (this.y1 - this.y0) * s + this.arc * 4 * s * (1 - s);
        this.node.setPosition(x, y, 0);
        if (this.pic) this.pic.angle += 720 * dt;
        // Trúng mèo giữa đường thì nổ luôn
        const gm = GameManager.instance;
        if (gm && this.alive()) {
            _me.set(x - 28, y - 28, 56, 56);
            for (const c of gm.cats) {
                if (overlaps(c.body.getRect(_cat), _me)) {
                    this.splash(x, y - 40);
                    return;
                }
            }
        }
        if (s >= 1) this.splash(this.x1, this.y1);
    }

    private splash(x: number, groundY: number) {
        const parent = this.node.parent;
        if (parent && this.alive()) {
            // Vũng nổ: giữa hình cao hơn mặt đất một chút; gây đòn 0.35 giây đầu
            AcidHazard.spawn(parent, ACID_SPLASH, x, groundY + 115, {
                scale: 3, fps: 16, center: true, fromFrame: 0, toFrame: 5,
                w: 240, h: 200, dy: -115, alive: this.alive,
            });
            Sound.play('land', 0.7);
        }
        this.node.destroy();
    }
}
