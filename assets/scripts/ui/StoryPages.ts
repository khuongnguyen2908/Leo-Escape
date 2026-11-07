import { _decorator, Color, Component, EventKeyboard, EventTouch, Graphics, Input, input, KeyCode, Label, Node, resources, Sprite, SpriteFrame, tween, Tween, UIOpacity, view } from 'cc';
import { Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { T, TextKey } from './Lang';
import { setText, UI, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

const PAGES = 3;
const BG = new Color(36, 26, 22, 255);
const TITLE_OUTLINE = new Color(0x46, 0x2c, 0x22, 255);
const BLACK = new Color(0, 0, 0, 255);
/** Khung tranh (ảnh story_1..3 trong assets/resources/art phóng vừa khung này) */
const PIC_W = 1440;
const PIC_H = 720;
const PIC_Y = 70;
/** Gáy sách: mép trái khung tranh, trang lật quanh đường này */
const SPINE_X = -PIC_W / 2;
/** Một lần lật trang (giây) */
const FLIP = 0.65;
/** Trang đang lật tối dần tới mức này (0..255) khi gập sát gáy */
const SHADE_MAX = 190;
/** Bóng trang đang lật đổ lên trang bên dưới: bề rộng, độ đậm lớn nhất */
const SHADOW_W = 220;
const SHADOW_MAX = 170;
/** Dòng chữ dưới tranh (không lật theo trang: chữ cũ mờ đi, chữ mới hiện dần) */
const CAPTION_Y = -360;
/** Chạm phía trái màn hình (tỉ lệ bề ngang) thì lật lại */
const TAP_BACK = 0.3;

/**
 * Truyện mở đầu: 3 trang, mỗi trang một tranh (ảnh story_1, story_2, story_3 trong thư mục art; chưa có thì khung tạm PAGE 1...)
 * và một dòng chữ (Lang story.1..3). Lật như sách: tranh hiện tại gập quanh gáy bên trái (co lại, tối dần, hơi phồng lên),
 * đổ bóng lên tranh mới bên dưới; dòng chữ không lật theo mà mờ đi, chữ trang mới hiện dần.
 * Lớp tối và bóng vẽ lại mỗi khung (độ trong suốt nằm trong màu vẽ), không dùng UIOpacity cho hình vẽ. → / Enter / Space / Nhảy / Đánh / phím khác hoặc chạm: lật tới (trang cuối thì xong);
 * ← (hoặc chạm phía trái): lật lại trang trước; Esc: bỏ qua truyện. Xong thì gọi onDone.
 * LandingScreen tạo trang này sau khi chọn ô lưu mới.
 */
@ccclass('StoryPages')
export class StoryPages extends Component {
    onDone: (() => void) | null = null;

    private pages: Node[] = [];
    private shades: Graphics[] = [];
    private captions: UIOpacity[] = [];
    private shadow: Graphics | null = null;
    private dots: Graphics | null = null;
    private arrow: Node | null = null;
    private arrowBack: Node | null = null;
    private index = 0;
    private busy = false;
    private finished = false;
    private time = 0;
    private acceptAt = 0;

    onLoad() {
        const d = view.getDesignResolutionSize();
        const bg = uiNode('Bg', this.node, d.width, d.height);
        const g = bg.addComponent(Graphics);
        g.fillColor = BG;
        g.rect(-d.width * 1.5, -d.height * 1.5, d.width * 3, d.height * 3);
        g.fill();
        bg.on(Node.EventType.TOUCH_END, this.onTap, this);
        // Trang sau nằm dưới trang trước (trang 1 trên cùng)
        for (let i = PAGES - 1; i >= 0; i--) this.pages[i] = this.makePage(i);
        this.pages.forEach((p, i) => { p.active = i === 0; });
        this.shadow = this.makeShadow();
        for (let i = 0; i < PAGES; i++) this.captions.push(this.makeCaption(i));
        // Chấm chỉ trang đang xem
        const dots = uiNode('Dots', this.node, 200, 30);
        dots.setPosition(0, -d.height / 2 + 60, 0);
        this.dots = dots.addComponent(Graphics);
        this.paintDots();
        // Mũi tên lật tới (phải) và lật lại (trái, chỉ hiện từ trang 2)
        this.arrow = this.makeArrow(1);
        this.arrowBack = this.makeArrow(-1);
        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
        this.acceptAt = Date.now() + 500;
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
    }

    update(dt: number) {
        this.time += dt;
        const d = view.getDesignResolutionSize();
        const blink = Math.round(150 + 105 * Math.abs(Math.sin(this.time * 4)));
        const nudge = Math.sin(this.time * 6) * 10;
        if (this.arrow) {
            this.arrow.getComponent(UIOpacity)!.opacity = this.busy ? 0 : blink;
            this.arrow.setPosition(d.width / 2 - 120 + nudge, this.arrow.position.y, 0);
        }
        if (this.arrowBack) {
            this.arrowBack.getComponent(UIOpacity)!.opacity = this.busy || this.index === 0 ? 0 : Math.round(blink * 0.7);
            this.arrowBack.setPosition(-d.width / 2 + 120 - nudge, this.arrowBack.position.y, 0);
        }
    }

    private makePage(i: number): Node {
        // Node trang đặt ở gáy; nội dung (Sheet) lệch sang phải nửa khung, nên co bề ngang node trang là gập quanh gáy
        const page = uiNode(`Page${i + 1}`, this.node);
        page.setPosition(SPINE_X, 0, 0);
        const sheet = uiNode('Sheet', page);
        sheet.setPosition(-SPINE_X, 0, 0);
        // Khung tranh tạm: nền nâu nhạt, viền kem, chữ PAGE n (có ảnh story_n thì thay)
        const frame = uiNode('Frame', sheet, PIC_W, PIC_H);
        frame.setPosition(0, PIC_Y, 0);
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
            // Lớp tối phải nằm trên tranh
            frame.getChildByName('Shade')?.setSiblingIndex(frame.children.length - 1);
        });
        // Lớp tối phủ khung tranh, đậm dần khi trang gập về gáy (vẽ lại theo độ đậm: paintShade)
        this.shades[i] = uiNode('Shade', frame, PIC_W, PIC_H).addComponent(Graphics);
        return page;
    }

    private makeCaption(i: number): UIOpacity {
        const caption: Label = uiLabel(this.node, '', 44, Color.WHITE, { outline: TITLE_OUTLINE, outlineWidth: 4, name: `Caption${i + 1}` });
        setText(caption, T(`story.${i + 1}` as TextKey));
        caption.node.setPosition(0, CAPTION_Y, 0);
        const op = caption.node.addComponent(UIOpacity);
        op.opacity = i === 0 ? 255 : 0;
        return op;
    }

    /** Lớp tối trên tranh: a = độ đậm 0..255 (0 thì xoá trắng). */
    private paintShade(g: Graphics, a: number) {
        if (!g.isValid) return;
        g.clear();
        if (a <= 0) return;
        g.fillColor = new Color(BLACK.r, BLACK.g, BLACK.b, Math.min(255, Math.round(a)));
        g.roundRect(-PIC_W / 2, -PIC_H / 2, PIC_W, PIC_H, 28);
        g.fill();
    }

    /** Dải bóng ngay sau mép trang đang lật, đè lên tranh bên dưới. */
    private makeShadow(): Graphics {
        const n = uiNode('FlipShadow', this.node, SHADOW_W, PIC_H);
        n.active = false;
        return n.addComponent(Graphics);
    }

    /** Bóng: đậm ở mép trái, nhạt dần sang phải; a = độ đậm lớn nhất 0..255. */
    private paintShadow(a: number) {
        const g = this.shadow;
        if (!g || !g.isValid) return;
        g.clear();
        if (a <= 0) return;
        const slices = 14;
        for (let k = 0; k < slices; k++) {
            g.fillColor = new Color(0, 0, 0, Math.round(a * Math.pow(1 - k / slices, 1.6)));
            g.rect((SHADOW_W / slices) * k, -PIC_H / 2, SHADOW_W / slices + 1, PIC_H);
            g.fill();
        }
    }

    private makeArrow(side: 1 | -1): Node {
        const d = view.getDesignResolutionSize();
        const arrow = uiNode(side > 0 ? 'Arrow' : 'ArrowBack', this.node, 90, 90);
        arrow.setPosition(side * (d.width / 2 - 120), -d.height / 2 + 80, 0);
        arrow.setScale(side, 1, 1);
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
        arrow.addComponent(UIOpacity).opacity = 0;
        return arrow;
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
        const k = e.keyCode;
        if (k === KeyCode.ESCAPE || k === KeyCode.MOBILE_BACK) {
            this.finish();
            return;
        }
        if (k === KeyCode.ARROW_LEFT || k === Settings.key(0, 'left') || k === Settings.key(1, 'left')) this.prev();
        else this.next();
    }

    private onTap(e: EventTouch) {
        if (e.getUILocation().x < view.getVisibleSize().width * TAP_BACK) this.prev();
        else this.next();
    }

    /** Lật sang trang sau (trang cuối thì xong). */
    private next() {
        if (this.busy || this.finished || Date.now() < this.acceptAt) return;
        if (this.index >= PAGES - 1) {
            this.finish();
            return;
        }
        const cur = this.pages[this.index], nxt = this.pages[this.index + 1];
        this.index++;
        this.paintDots();
        // Trang mới nằm dưới, trang hiện tại gập dần về gáy
        this.flip(cur, nxt, this.shades[this.index - 1], (t) => 1 - t, () => { cur.active = false; });
        this.swapCaption(this.index - 1, this.index);
    }

    /** Lật lại trang trước: trang trước mở ra từ gáy, đè lên trang hiện tại. */
    private prev() {
        if (this.busy || this.finished || this.index === 0 || Date.now() < this.acceptAt) return;
        const cur = this.pages[this.index], prv = this.pages[this.index - 1];
        this.index--;
        this.paintDots();
        this.flip(prv, cur, this.shades[this.index], (t) => t, () => { cur.active = false; });
        this.swapCaption(this.index + 1, this.index);
    }

    /** Dòng chữ: chữ trang cũ mờ đi, chữ trang mới hiện dần. */
    private swapCaption(from: number, to: number) {
        const a = this.captions[from], b = this.captions[to];
        Tween.stopAllByTarget(a);
        Tween.stopAllByTarget(b);
        tween(a).to(FLIP * 0.4, { opacity: 0 }).start();
        tween(b).delay(FLIP * 0.5).to(FLIP * 0.5, { opacity: 255 }).start();
    }

    /**
     * Lật trang top (nằm trên) quanh gáy, under nằm dưới. open(t) cho bề rộng trang top theo tiến độ t (0..1):
     * 1 - t là gập vào, t là mở ra. Xong thì gọi done.
     */
    private flip(top: Node, under: Node, shade: Graphics, open: (t: number) => number, done: () => void) {
        this.busy = true;
        Sound.play('ui_page', 0.9);
        under.active = top.active = true;
        under.setScale(1, 1, 1);
        this.shades.forEach((s) => this.paintShade(s, 0));
        // Thứ tự vẽ: trang dưới → bóng → trang đang lật → chữ, chấm, mũi tên
        const shadow = this.shadow!.node;
        shadow.active = true;
        const last = () => this.node.children.length - 1;
        under.setSiblingIndex(last());
        shadow.setSiblingIndex(last());
        top.setSiblingIndex(last());
        for (const n of [...this.captions.map((c) => c.node), this.dots?.node, this.arrow, this.arrowBack]) n?.setSiblingIndex(last());
        const apply = (t: number) => {
            const w = Math.max(0.001, open(t));
            // Gập về gáy thì hơi phồng lên (như mép giấy nhấc lên gần mắt hơn)
            top.setScale(w, 1 + 0.05 * Math.sin(Math.PI * w), 1);
            this.paintShade(shade, SHADE_MAX * (1 - w));
            shadow.setPosition(SPINE_X + PIC_W * w, PIC_Y, 0);
            this.paintShadow(SHADOW_MAX * Math.sin(Math.PI * Math.min(1, w * 1.15)));
        };
        apply(0);
        const state = { t: 0 };
        Tween.stopAllByTarget(state);
        tween(state)
            .to(FLIP, { t: 1 }, { easing: 'sineInOut', onUpdate: () => apply(state.t) })
            .call(() => {
                apply(1);
                shadow.active = false;
                this.paintShade(shade, 0);
                top.setScale(1, 1, 1);
                done();
                // Trang đang xem luôn đầy đủ, nằm trên cùng
                const shown = this.pages[this.index];
                shown.active = true;
                shown.setScale(1, 1, 1);
                this.busy = false;
                this.acceptAt = Date.now() + 120;
            })
            .start();
    }

    /** Xong truyện (lật hết hoặc Esc bỏ qua). */
    private finish() {
        if (this.finished) return;
        this.finished = true;
        this.busy = true;
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
        const done = this.onDone;
        setTimeout(() => done?.(), 0);
    }
}
