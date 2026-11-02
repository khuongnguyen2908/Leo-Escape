import { _decorator, Component, Rect, Size, Vec2 } from 'cc';
import { computeBox } from './Box';
const { ccclass, property } = _decorator;

/**
 * Vật cản tĩnh: nền đá, thùng rác, bàn, ghế...
 * Mọi Solid và PlatformerBody phải nằm chung một node cha (lớp Gameplay)
 * vì va chạm được tính trong không gian của node cha đó.
 */
@ccclass('Solid')
export class Solid extends Component {
    static readonly all: Solid[] = [];

    @property({ tooltip: 'Bục một chiều: nhảy xuyên từ dưới lên, chỉ chặn khi rơi xuống từ phía trên' })
    oneWay = false;

    @property({ tooltip: 'Kích thước hộp va chạm (đơn vị của node cha). Để 0 thì lấy theo UITransform' })
    size = new Size(0, 0);

    @property({ tooltip: 'Lệch tâm hộp so với vị trí node' })
    offset = new Vec2(0, 0);

    onEnable() {
        Solid.all.push(this);
    }

    onDisable() {
        const i = Solid.all.indexOf(this);
        if (i >= 0) Solid.all.splice(i, 1);
    }

    getRect(out: Rect): Rect {
        return computeBox(this.node, this.size, this.offset, out);
    }
}
