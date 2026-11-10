import { _decorator, Color, Component, Graphics, Label, Node, resources, Sprite, SpriteFrame, sys, tween, UITransform, Vec3, view } from 'cc';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { Upgrade, UPGRADES, upgradeState, UpgradeState } from '../game/Upgrades';
import { keyHintRow } from './KeyCap';
import { T, TextKey } from './Lang';
import { MENU_OUTLINE, menuShade, menuTitle } from './MenuStyle';
import { MenuNav, NavItem } from './MenuNav';
import { setText, UI, uiBackCircle, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

/** Cỡ một ô kỹ năng, khoảng cách giữa các ô */
const CELL_W = 270;
const CELL_H = 124;
const COL_GAP = 340;
const ROW_GAP = 160;
/** Hàng 0 (Kiếm) nằm ở độ cao này, các hàng sau thấp dần */
const TOP_ROW_Y = 170;
const FIRST_COL_X = -300;

const OWNED_BG = UI.green;
const LOCKED_BG = new Color(70, 58, 55, 255);
const LOCKED_TEXT = new Color(160, 148, 140, 255);
const LINE = new Color(214, 200, 182, 160);
const RED = new Color(235, 95, 80, 255);
/** Màu nhuộm ảnh cá vàng làm hình tạm cho cá bự (cùng màu với node cá bự bước ⚙ tạo) */
export const BIG_FISH_TINT = new Color(255, 160, 80, 255);

interface Cell {
    up: Upgrade;
    node: Node;
    g: Graphics;
    name: Label;
    cost: Label;
    item: NavItem;
}

/**
 * Bảng cửa hàng (nói chuyện với ShopNPC): cây kỹ năng 3 hàng Kiếm / Thân / Chiêu, mỗi ô tốn cá bự + cá vàng.
 * Trên cùng ghi số cá bự, cá vàng đang có (cá bự chỉ hiện ở đây). Chọn ô bằng phím mũi tên / WASD hoặc rê chuột,
 * Enter / Nhảy / Đánh / chạm để mua, Esc hoặc nút ← để thoát. Ô sau chỉ mua được khi có ô bên trái.
 * ShopPage.show(...) tạo bảng; đóng thì tự xoá và gọi onClose.
 */
@ccclass('ShopPage')
export class ShopPage extends Component {
    private nav: MenuNav | null = null;
    private cells: Cell[] = [];
    private focused: Cell | null = null;
    private onClose: (() => void) | null = null;
    private closed = false;
    private bigFishLabel!: Label;
    private goldLabel!: Label;
    private descName!: Label;
    private descText!: Label;
    private descState!: Label;
    private coinFrame: SpriteFrame | null = null;
    private icons: Sprite[] = [];

    static show(parent: Node, onClose: () => void): ShopPage {
        const d = view.getDesignResolutionSize();
        const n = uiNode('Shop', parent, d.width, d.height);
        n.setSiblingIndex(parent.children.length - 1);
        const s = n.addComponent(ShopPage);
        s.onClose = onClose;
        s.build();
        return s;
    }

    onDestroy() {
        this.nav?.close(false);
    }

    private build() {
        const d = view.getDesignResolutionSize();
        const root = this.node;
        menuShade(root, d.width, d.height, 215);
        menuTitle(root, 'shop.title', 420, 84);

        // Số cá đang có: ảnh cá (cá bự nhuộm cam) + chữ
        this.bigFishLabel = this.wallet(-200, 300, BIG_FISH_TINT, 1.0);
        this.goldLabel = this.wallet(200, 300, Color.WHITE, 0.8);
        resources.load('art/MG_coin/spriteFrame', SpriteFrame, (err, sf) => {
            if (err || !sf || !this.isValid) return;
            this.coinFrame = sf;
            for (const sp of this.icons) if (sp.isValid) sp.spriteFrame = sf;
        });

        // Đường nối các ô cùng hàng (vẽ trước, nằm sau các ô)
        const lines = uiNode('Lines', root).addComponent(Graphics);
        lines.strokeColor = LINE;
        lines.lineWidth = 6;
        for (const u of UPGRADES) {
            if (!u.needs) continue;
            const y = this.rowY(u.row);
            lines.moveTo(this.colX(u.col - 1) + CELL_W / 2, y);
            lines.lineTo(this.colX(u.col) - CELL_W / 2, y);
        }
        lines.stroke();

        // Chữ đầu hàng
        for (let r = 0; r < 3; r++) {
            const l = uiLabel(root, T(`shop.row${r}` as TextKey), 36, UI.cream, { outline: MENU_OUTLINE, outlineWidth: 4, name: `Row${r}` });
            l.node.setPosition(FIRST_COL_X - CELL_W / 2 - 120, this.rowY(r), 0);
        }

        const nav = new MenuNav(() => this.close());
        this.nav = nav;
        for (const u of UPGRADES) this.cells.push(this.makeCell(root, u, nav));
        // Lên / xuống: sang hàng trên / dưới, cột gần nhất
        for (const c of this.cells) {
            c.item.up = () => this.moveRow(c, -1);
            c.item.down = () => this.moveRow(c, 1);
            c.item.left = () => this.moveCol(c, -1);
            c.item.right = () => this.moveCol(c, 1);
        }

        // Ô mô tả phía dưới
        this.descName = uiLabel(root, '', 40, UI.accent, { outline: MENU_OUTLINE, outlineWidth: 4, name: 'DescName' });
        this.descName.node.setPosition(0, -320, 0);
        this.descText = uiLabel(root, '', 30, UI.cream, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'DescText' });
        this.descText.node.setPosition(0, -375, 0);
        this.descState = uiLabel(root, '', 30, UI.cream, { outline: MENU_OUTLINE, outlineWidth: 3, name: 'DescState' });
        this.descState.node.setPosition(0, -425, 0);

        if (sys.isMobile) uiBackCircle(root, -d.width / 2 + 90, d.height / 2 - 90, () => this.close());
        else keyHintRow(root, [
            [['ENTER'], T('shop.hBuy')],
            [['ESC'], T('shop.hExit')],
        ], -d.height / 2 + 60, 44, 28, UI.cream, d.width / 2 - 60);

        this.refresh();
        // Chọn sẵn ô đầu tiên mua được (không có thì ô đầu)
        const gm = GameManager.instance;
        const first = this.cells.find((c) => gm && upgradeState(c.up, gm.bigFish, gm.coins) === 'ready') ?? this.cells[0];
        nav.open(first.item);
        Sound.play('ui_page', 0.7);
    }

    private wallet(x: number, y: number, tint: Color, scale: number): Label {
        const icon = uiNode('Icon', this.node, 90, 90);
        icon.setPosition(x - 110, y, 0);
        icon.setScale(scale, scale, 1);
        const sp = icon.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.color = tint;
        if (this.coinFrame) sp.spriteFrame = this.coinFrame;
        this.icons.push(sp);
        const label = uiLabel(this.node, '', 38, UI.cream, { outline: MENU_OUTLINE, outlineWidth: 4 });
        label.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        label.node.setPosition(x - 55, y, 0);
        return label;
    }

    private colX(col: number) { return FIRST_COL_X + col * COL_GAP; }
    private rowY(row: number) { return TOP_ROW_Y - row * ROW_GAP; }

    private makeCell(root: Node, u: Upgrade, nav: MenuNav): Cell {
        const node = uiNode(`Cell_${u.id}`, root, CELL_W, CELL_H);
        node.setPosition(this.colX(u.col), this.rowY(u.row), 0);
        const g = node.addComponent(Graphics);
        const name = uiLabel(node, '', 30, UI.text, { name: 'Name' });
        name.node.setPosition(0, 20, 0);
        const cost = uiLabel(node, '', 24, UI.text, { name: 'Cost' });
        cost.node.setPosition(0, -26, 0);
        const cell = { up: u, node, g, name, cost } as Cell;
        cell.item = nav.add({
            node,
            press: () => this.buy(cell),
            focus: (on) => {
                if (on) this.focus(cell);
            },
        });
        node.on(Node.EventType.TOUCH_END, () => {
            nav.focusItem(cell.item);
            this.buy(cell);
        });
        return cell;
    }

    private moveRow(c: Cell, step: number) {
        const row = (c.up.row + step + 3) % 3;
        const inRow = this.cells.filter((x) => x.up.row === row);
        const target = inRow.reduce((best, x) => Math.abs(x.up.col - c.up.col) < Math.abs(best.up.col - c.up.col) ? x : best, inRow[0]);
        this.nav?.focusItem(target.item);
    }

    private moveCol(c: Cell, step: number) {
        const target = this.cells.find((x) => x.up.row === c.up.row && x.up.col === c.up.col + step);
        if (target) this.nav?.focusItem(target.item);
    }

    private state(u: Upgrade): UpgradeState {
        const gm = GameManager.instance;
        return gm ? upgradeState(u, gm.bigFish, gm.coins) : 'locked';
    }

    private focus(cell: Cell) {
        const old = this.focused;
        this.focused = cell;
        if (old && old !== cell) {
            this.paint(old);
            tween(old.node).to(0.1, { scale: Vec3.ONE }).start();
        }
        this.paint(cell);
        tween(cell.node).to(0.1, { scale: new Vec3(1.07, 1.07, 1) }).start();
        this.describe(cell);
    }

    private buy(cell: Cell) {
        if (this.closed) return;
        const gm = GameManager.instance;
        if (!gm || this.state(cell.up) !== 'ready' || !gm.buy(cell.up.id)) {
            Sound.play('ui_deny', 0.7);
            const p = cell.node.position;
            tween(cell.node).to(0.04, { position: new Vec3(p.x + 10, p.y, 0) }).to(0.08, { position: new Vec3(p.x - 10, p.y, 0) })
                .to(0.04, { position: new Vec3(p.x, p.y, 0) }).start();
            return;
        }
        Sound.play('checkpoint', 0.9);
        Sound.play('coin', 0.7);
        this.refresh();
        setText(this.descState, T('shop.bought'));
        tween(cell.node).to(0.1, { scale: new Vec3(1.2, 1.2, 1) }).to(0.15, { scale: new Vec3(1.07, 1.07, 1) }).start();
    }

    private refresh() {
        const gm = GameManager.instance;
        setText(this.bigFishLabel, T('shop.bigFish', gm?.bigFish ?? 0));
        setText(this.goldLabel, T('shop.gold', gm?.coins ?? 0));
        for (const c of this.cells) this.paint(c);
        if (this.focused) this.describe(this.focused);
    }

    /** Vẽ một ô theo trạng thái: đã có (xanh), mua được (kem), thiếu cá (kem nhạt), chưa mở (xám tối); ô đang chọn viền cam. */
    private paint(c: Cell) {
        const st = this.state(c.up);
        const on = this.focused === c;
        const g = c.g;
        g.clear();
        g.fillColor = st === 'owned' ? OWNED_BG : st === 'locked' ? LOCKED_BG : st === 'short' ? UI.creamDim : UI.cream;
        g.strokeColor = on ? UI.accent : UI.brown;
        g.lineWidth = on ? 9 : 6;
        g.roundRect(-CELL_W / 2, -CELL_H / 2, CELL_W, CELL_H, 22);
        g.fill();
        g.stroke();
        const text = st === 'owned' ? UI.cream : st === 'locked' ? LOCKED_TEXT : UI.text;
        c.name.color = text;
        c.cost.color = text;
        setText(c.name, T(`up.${c.up.id}` as TextKey));
        setText(c.cost, st === 'owned' ? T('shop.owned') : T('shop.cost', c.up.bigFish, c.up.gold));
    }

    private describe(c: Cell) {
        const st = this.state(c.up);
        setText(this.descName, T(`up.${c.up.id}` as TextKey));
        setText(this.descText, T(`up.${c.up.id}.d` as TextKey));
        const key: TextKey = st === 'owned' ? 'shop.owned' : st === 'locked' ? 'shop.locked' : st === 'short' ? 'shop.short' : 'shop.ready';
        setText(this.descState, T(key));
        this.descState.color = st === 'short' || st === 'locked' ? RED : st === 'ready' ? UI.accent : UI.cream;
    }

    private close() {
        if (this.closed) return;
        this.closed = true;
        // Đóng sau khi phím Esc này xử lý xong, để menu tạm dừng không mở theo
        setTimeout(() => {
            this.nav?.close(false);
            const done = this.onClose;
            this.onClose = null;
            if (this.node.isValid) this.node.destroy();
            done?.();
        }, 0);
    }
}
