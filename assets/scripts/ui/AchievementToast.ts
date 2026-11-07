import { Color, director, Graphics, Node, resources, Sprite, SpriteFrame, UITransform, view } from 'cc';
import { Sound } from '../core/Sound';
import { Achievements } from '../game/Achievements';
import { T, TextKey } from './Lang';
import { MENU_OUTLINE, MENU_SOFT, MENU_TEXT } from './MenuStyle';
import { setText, UI, uiLabel, uiNode } from './UiKit';

const W = 560;
const H = 120;
const BG = new Color(30, 22, 20, 235);
/** Trượt vào, đứng, trượt ra (giây) */
const IN = 0.3;
const HOLD = 2.6;
const OUT = 0.3;

const queue: string[] = [];
let showing = false;

/** Vẽ biểu tượng tạm cho thành tích (ngôi sao trong ô vuông); locked thì ô tối có ổ khoá. Dùng chung cho trang Thành tích. */
export function drawAchievementIcon(g: Graphics, size: number, locked: boolean) {
    const h = size / 2;
    g.clear();
    g.fillColor = locked ? new Color(40, 34, 34, 255) : new Color(70, 52, 46, 255);
    g.roundRect(-h, -h, size, size, size * 0.14);
    g.fill();
    g.strokeColor = locked ? new Color(120, 110, 105, 255) : UI.cream;
    g.lineWidth = 4;
    g.roundRect(-h, -h, size, size, size * 0.14);
    g.stroke();
    if (locked) {
        // Ổ khoá: thân vuông + quai tròn
        g.fillColor = new Color(120, 110, 105, 255);
        g.roundRect(-size * 0.18, -size * 0.2, size * 0.36, size * 0.28, 4);
        g.fill();
        g.strokeColor = new Color(120, 110, 105, 255);
        g.lineWidth = 5;
        g.arc(0, size * 0.08, size * 0.12, 0, Math.PI, true);
        g.stroke();
        return;
    }
    // Ngôi sao 5 cánh
    g.fillColor = new Color(255, 214, 90, 255);
    const R = size * 0.32, r = size * 0.14;
    for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : r;
        const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.close();
    g.fill();
}

/** Biểu tượng thành tích id: ảnh art/ach_<id> nếu có (đã đạt mới hiện ảnh), không thì hình vẽ tạm. */
export function achievementIcon(parent: Node, id: string, size: number, locked: boolean): Node {
    const n = uiNode('Icon', parent, size, size);
    const g = n.addComponent(Graphics);
    drawAchievementIcon(g, size, locked);
    if (!locked) {
        resources.load(`art/ach_${id}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (err || !sf || !n.isValid) return;
            g.clear();
            const pic = uiNode('Pic', n);
            pic.addComponent(Sprite).spriteFrame = sf;
            const k = Math.min(size / sf.rect.width, size / sf.rect.height);
            pic.setScale(k, k, 1);
        });
    }
    return n;
}

/**
 * Thông báo nhỏ khi đạt thành tích: khung tối góc dưới phải, biểu tượng + "Đạt thành tích!" + tên, trượt lên rồi trượt xuống.
 * Nhiều cái cùng lúc thì hiện lần lượt. Chạy bằng setInterval (vẫn chạy khi game tạm dừng / đang chuyển cảnh).
 */
function show(id: string) {
    queue.push(id);
    if (!showing) next();
}

function next() {
    const id = queue.shift();
    const canvas = director.getScene()?.getChildByName('Canvas');
    if (!id || !canvas) {
        showing = false;
        return;
    }
    showing = true;
    Sound.play('ui_saved', 0.9);
    const d = view.getDesignResolutionSize();
    const root = uiNode('AchievementToast', canvas, W, H);
    root.setSiblingIndex(canvas.children.length - 1);
    const g = root.addComponent(Graphics);
    g.fillColor = BG;
    g.roundRect(-W / 2, -H / 2, W, H, 18);
    g.fill();
    g.strokeColor = UI.cream;
    g.lineWidth = 3;
    g.roundRect(-W / 2, -H / 2, W, H, 18);
    g.stroke();
    const icon = achievementIcon(root, id, 84, false);
    icon.setPosition(-W / 2 + 64, 0, 0);
    const head = uiLabel(root, '', 26, MENU_SOFT, { outline: MENU_OUTLINE, outlineWidth: 3 });
    setText(head, T('ach.unlocked'));
    const name = uiLabel(root, '', 38, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 4 });
    setText(name, T(`ach.${id}` as TextKey));
    for (const [l, y] of [[head, 22], [name, -18]] as const) {
        l.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        l.node.setPosition(-W / 2 + 124, y, 0);
    }
    const x = d.width / 2 - W / 2 - 40;
    const yIn = -d.height / 2 + H / 2 + 40, yOut = -d.height / 2 - H;
    const start = Date.now();
    const timer = setInterval(() => {
        if (!root.isValid) {
            clearInterval(timer);
            showing = false;
            next();
            return;
        }
        // Luôn nằm trên cùng (màn đen chuyển cảnh cũng tự đưa mình lên trên cùng)
        const top = canvas.children.length - 1;
        if (root.getSiblingIndex() !== top) root.setSiblingIndex(top);
        const t = (Date.now() - start) / 1000;
        let k: number;
        if (t < IN) k = 1 - Math.pow(1 - t / IN, 3);
        else if (t < IN + HOLD) k = 1;
        else k = Math.max(0, 1 - (t - IN - HOLD) / OUT);
        root.setPosition(x, yOut + (yIn - yOut) * k, 0);
        if (t >= IN + HOLD + OUT) {
            clearInterval(timer);
            root.destroy();
            showing = false;
            next();
        }
    }, 16);
}

Achievements.onUnlock(show);
