import { _decorator, Color, Component, Graphics, Node, Rect, Size } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode } = _decorator;

const EDGE = new Color(255, 140, 60, 200);
const _r = new Rect();

/**
 * Vùng camera: mèo đứng trong vùng này thì camera bị giới hạn theo khung của vùng (thay cho Min X / Max X / Min Y của CameraRig).
 * Dùng cho phòng riêng (hang, hầm: camera không lọt ra ngoài phòng) và khu nằm dưới phố (cống, bờ sông: camera được xuống thấp).
 * Gốc node là góc DƯỚI TRÁI của vùng; kéo node để dời, đổi Size để rộng / cao. Trong editor hiện viền cam, lúc chơi không vẽ gì.
 * Nhiều vùng chồng nhau thì vùng nhỏ nhất thắng. Toạ độ tính theo lớp Gameplay (node cha phải nằm trong Gameplay, không xoay, không phóng).
 */
@ccclass('CameraZone')
@executeInEditMode
export class CameraZone extends Component {
    static readonly all: CameraZone[] = [];

    @property({ tooltip: 'Bề ngang, chiều cao của vùng (gốc node ở góc dưới trái)' })
    get size() { return this._size; }
    set size(v: Size) { this._size = v.clone(); this.redraw(); }

    @property
    _size = new Size(1000, 1000);

    @property({ tooltip: 'Camera không cho thấy quá mép trái / phải của vùng' })
    clampSides = true;

    @property({ tooltip: 'Camera không cho thấy thấp hơn đáy vùng' })
    clampBottom = true;

    @property({ tooltip: 'Camera không cho thấy cao hơn đỉnh vùng (phòng kín). Tắt cho khu liền với phố (nhìn lên vẫn thấy phố)' })
    clampTop = false;

    onLoad() {
        this.redraw();
    }

    onEnable() {
        if (CameraZone.all.indexOf(this) < 0) CameraZone.all.push(this);
    }

    onDisable() {
        const i = CameraZone.all.indexOf(this);
        if (i >= 0) CameraZone.all.splice(i, 1);
    }

    /** Khung vùng theo toạ độ lớp Gameplay. */
    rect(out: Rect): Rect {
        let x = this.node.position.x, y = this.node.position.y;
        let p: Node | null = this.node.parent;
        while (p && p.name !== 'Gameplay') {
            x += p.position.x;
            y += p.position.y;
            p = p.parent;
        }
        return out.set(x, y, this._size.width, this._size.height);
    }

    /** Vùng nhỏ nhất chứa điểm (x, y) của lớp Gameplay, không có thì null. */
    static find(x: number, y: number): CameraZone | null {
        let best: CameraZone | null = null, area = Infinity;
        for (const z of CameraZone.all) {
            if (!z.node.activeInHierarchy) continue;
            const r = z.rect(_r);
            if (x < r.x || x > r.x + r.width || y < r.y || y > r.y + r.height) continue;
            const a = r.width * r.height;
            if (a < area) {
                area = a;
                best = z;
            }
        }
        return best;
    }

    private redraw() {
        if (!EDITOR) return;
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        g.strokeColor = EDGE;
        g.lineWidth = 8;
        g.rect(0, 0, this._size.width, this._size.height);
        g.stroke();
    }
}
