import { _decorator, Color, Component, EventKeyboard, Graphics, Input, input, KeyCode, Label, Node, resources, Sprite, SpriteFrame, tween, Tween, UIOpacity, Vec3, view } from 'cc';
import { Sound } from '../core/Sound';
import { T, TextKey } from './Lang';
import { setText, UI, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

const PAGES = 3;
const BG = new Color(36, 26, 22, 255);
const TITLE_OUTLINE = new Color(0x46, 0x2c, 0x22, 255);
/** Khung tranh (ảnh story_1..3 trong assets/resources/art phóng vừa khung này) */
const PIC_W = 1440;
const PIC_H = 720;
const FLIP = 0.4;

/**
 * Truyện mở đầu: 3 trang, mỗi trang một tranh (ảnh story_1, story_2, story_3 trong thư mục art; chưa có thì khung tạm PAGE 1...)
 * và một dòng chữ (Lang story.1..3). Mũi tên nhấp nháy ở góc phải dưới; bấm phím / chạm để lật trang.
 * Lật hết thì gọi onDone. LandingScreen tạo trang này sau khi chọn ô lưu mới.
 */
@ccclass('StoryPages')
export class StoryPages extends Component {
    onDone: (() => void) | null = null;

    private pages: Node[] = [];
    private dots: Graphics | null = null;
    private arrow: Node | null = null;
    private index = 0;
    private busy = false;
    private time = 0;
    private acceptAt = 0;

    onLoad() {
        const d = view.getDesignResolutionSize();
        const bg = uiNode('Bg', this.node, d.width, d.height);
        const g = bg.addComponent(Graphics);
        g.fillColor = BG;
        g.rect(-d.width * 1.5, -d.height * 1.5, d.width * 3, d.height * 3);
        g.fill();
        bg.on(Node.EventType.TOUCH_END, this.next, this);
        for (let i = 0; i < PAGES; i++) this.pages.push(this.makePage(i));
        this.pages.forEach((p, i) => { p.active = i === 0; });
        // Chấm chỉ trang đang xem
        const dots = uiNode('Dots', this.node, 200, 30);
        dots.setPosition(0, -d.height / 2 + 60, 0);
        this.dots = dots.addComponent(Graphics);
        this.paintDots();
        // Mũi tên lật trang
        const arrow = uiNode('Arrow', this.node, 90, 90);
        arrow.setPosition(d.width / 2 - 120, -d.height / 2 + 80, 0);
        const ag = arrow.addComponent(Graphics);
        ag.fillColor = UI.accent;
        ag.strokeColor = UI.brown;
        ag.lineWidth = 6;
        ag.moveTo(-26, 34);
        ag.lineTo(30, 0);
        ag.lineTo(-26, -34);
        ag.close();
        ag.fill();
        ag.stroke();
        arrow.addComponent(UIOpacity);
        this.arrow = arrow;
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
        this.acceptAt = Date.now() + 500;
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    update(dt: number) {
        this.time += dt;
        const a = this.arrow;
        if (a) {
            // Nhấp nháy và nhích qua lại
            a.getComponent(UIOpacity)!.opacity = this.busy ? 0 : Math.round(150 + 105 * Math.abs(Math.sin(this.time * 4)));
            const d = view.getDesignResolutionSize();
            a.setPosition(d.width / 2 - 120 + Math.sin(this.time * 6) * 10, a.position.y, 0);
        }
    }

    private makePage(i: number): Node {
        const page = uiNode(`Page${i + 1}`, this.node);
        // Khung tranh tạm: nền nâu nhạt, viền kem, chữ PAGE n (có ảnh story_n thì thay)
        const frame = uiNode('Frame', page, PIC_W, PIC_H);
        frame.setPosition(0, 70, 0);
        const g = frame.addComponent(Graphics);
        g.fillColor = UI.brownDown;
        g.strokeColor = UI.cream;
        g.lineWidth = 10;
        g.roundRect(-PIC_W / 2, -PIC_H / 2, PIC_W, PIC_H, 28);
        g.fill();
        g.stroke();
        const ph = uiLabel(frame, '', 90, UI.cream, { name: 'Placeholder' });
        setText(ph, T('story.page', i + 1));
        resources.load(`art/story_${i + 1}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (err || !sf || !frame.isValid) return;
            ph.node.active = false;
            const pic = uiNode('Pic', frame);
            pic.addComponent(Sprite).spriteFrame = sf;
            const k = Math.min(PIC_W / sf.rect.width, PIC_H / sf.rect.height);
            pic.setScale(k, k, 1);
        });
        const caption: Label = uiLabel(page, '', 44, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4, name: 'Caption' });
        setText(caption, T(`story.${i + 1}` as TextKey));
        caption.node.setPosition(0, -360, 0);
        return page;
    }

    private paintDots() {
        const g = this.dots;
        if (!g) return;
        g.clear();
        for (let i = 0; i < PAGES; i++) {
            g.fillColor = i === this.index ? UI.accent : UI.creamDim;
            g.circle((i - (PAGES - 1) / 2) * 44, 0, i === this.index ? 12 : 9);
            g.fill();
        }
    }

    private onKey(e: EventKeyboard) {
        if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.MOBILE_BACK) return;
        this.next();
    }

    /** Lật sang trang sau (trang cuối thì xong). */
    private next() {
        if (this.busy || Date.now() < this.acceptAt) return;
        if (this.index >= PAGES - 1) {
            this.busy = true;
            input.off(Input.EventType.KEY_DOWN, this.onKey, this);
            const done = this.onDone;
            setTimeout(() => done?.(), 0);
            return;
        }
        this.busy = true;
        Sound.play('ui_page', 0.9);
        const d = view.getDesignResolutionSize();
        const cur = this.pages[this.index];
        const nxt = this.pages[this.index + 1];
        this.index++;
        this.paintDots();
        // Trang cũ trượt sang trái, trang mới trượt từ phải vào
        Tween.stopAllByTarget(cur);
        tween(cur).to(FLIP, { position: new Vec3(-d.width, 0, 0) }, { easing: 'quadIn' }).call(() => { cur.active = false; }).start();
        nxt.active = true;
        nxt.setPosition(d.width, 0, 0);
        tween(nxt).to(FLIP, { position: Vec3.ZERO }, { easing: 'quadOut' }).call(() => {
            this.busy = false;
            this.acceptAt = Date.now() + 150;
        }).start();
    }
}
