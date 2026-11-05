import { _decorator, Component, Node, Sprite, UITransform } from 'cc';
import { DustPuff } from './DustPuff';
const { ccclass } = _decorator;

/** Bộ ảnh gồng sóng kiếm trong assets/resources/art/fx: FX_charge_1 ... FX_charge_8 */
const PREFIX = 'FX_charge_';
/** Số khung đầu là lúc gom lực (chấm → vòng → ngôi sao → ngôi sao trong vòng); các khung sau là vòng tan (xì hơi). */
const BUILD_FRAMES = 4;
/** Phóng to ảnh pixel bao nhiêu lần (×2.5: vòng rộng 90, nằm gọn ở bụng, không che mặt mèo) */
const SCALE = 2.5;
/** Khung/giây của vòng tan khi xì hơi */
const FIZZLE_FPS = 18;
/** Đủ lực: đổi qua lại khung 3 ↔ 4 (ngôi sao trắng / ngôi sao trong vòng xanh) bao nhiêu lần mỗi giây */
const BLINK_RATE = 12;

/**
 * Quả cầu gồng sóng kiếm ở giữa thân mèo (node con của mèo, đi theo mèo).
 *  - Đang giữ J: khung 1 → 4 lớn dần theo thời gian gồng (setProgress).
 *  - Đủ lực (full): chớp bằng chính hình gốc, đổi qua lại khung 3 ↔ 4, chờ thả J để phóng.
 *  - Thả J khi chưa đủ lực (fizzle): xì hơi, khung 5 → 8 (vòng tan dần) rồi tự xoá.
 *  - Phóng sóng kiếm hoặc bị ngắt: stop() xoá luôn.
 * Chưa có ảnh FX_charge_ thì attach trả về null (PlayerController dùng vòng sáng vẽ bằng code như cũ).
 */
@ccclass('ChargeFx')
export class ChargeFx extends Component {
    private core: Sprite | null = null;
    private ready = false;
    private fizzling = false;
    private time = 0;

    static preload() {
        DustPuff.preload(PREFIX);
    }

    /** Gắn hiệu ứng vào mèo, tâm ở (0, y) trong node mèo. Chưa có ảnh thì trả về null. */
    static attach(cat: Node, y: number): ChargeFx | null {
        const frames = DustPuff.frames(PREFIX);
        if (frames.length === 0) return null;
        const n = new Node('ChargeFx');
        n.layer = cat.layer;
        cat.addChild(n);
        n.setPosition(0, y, 0);
        const fx = n.addComponent(ChargeFx);
        fx.core = fx.makeSprite(n, 'Core');
        fx.core.spriteFrame = frames[0];
        return fx;
    }

    /** Tiến độ gồng 0 → 1: chọn khung gom lực tương ứng. */
    setProgress(t: number) {
        if (this.ready || this.fizzling || !this.core) return;
        const frames = DustPuff.frames(PREFIX);
        const build = Math.min(BUILD_FRAMES, frames.length);
        if (build === 0) return;
        const i = Math.max(0, Math.min(build - 1, Math.floor(t * build)));
        this.core.spriteFrame = frames[i];
    }

    /** Đủ lực: bắt đầu chớp khung 3 ↔ 4, chờ thả J. */
    full() {
        if (this.ready || this.fizzling) return;
        this.ready = true;
        this.time = 0;
    }

    /** Thả J khi chưa đủ lực: xì hơi (khung 5 → 8) rồi tự xoá. Không có khung xì hơi thì xoá luôn. */
    fizzle() {
        if (this.fizzling) return;
        if (DustPuff.frames(PREFIX).length <= BUILD_FRAMES) {
            this.stop();
            return;
        }
        this.fizzling = true;
        this.ready = false;
        this.time = 0;
    }

    stop() {
        if (this.node.isValid) this.node.destroy();
    }

    update(dt: number) {
        if (!this.core) return;
        const frames = DustPuff.frames(PREFIX);
        const build = Math.min(BUILD_FRAMES, frames.length);
        if (this.fizzling) {
            this.time += dt;
            const i = build + Math.floor(this.time * FIZZLE_FPS);
            if (i >= frames.length) this.stop();
            else this.core.spriteFrame = frames[i];
        } else if (this.ready && build >= 2) {
            // Chớp bằng hình gốc: ngôi sao trắng (khung 3) ↔ ngôi sao trong vòng xanh (khung 4)
            this.time += dt;
            const i = Math.floor(this.time * BLINK_RATE) % 2 === 0 ? build - 1 : build - 2;
            this.core.spriteFrame = frames[i];
        }
    }

    private makeSprite(parent: Node, name: string): Sprite {
        const n = new Node(name);
        n.layer = parent.layer;
        parent.addChild(n);
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.RAW;
        sp.trim = false;
        n.getComponent(UITransform)!.setAnchorPoint(0.5, 0.5);
        n.setScale(SCALE, SCALE, 1);
        return sp;
    }
}
