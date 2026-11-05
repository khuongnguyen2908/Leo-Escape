import { _decorator, Color, Component, Graphics, Node, tween, Tween, UIOpacity, Vec3, view } from 'cc';
import { Sound } from '../core/Sound';
import { formatTime, Records } from '../game/Records';
import { T } from './Lang';
import { MenuNav, NavItem } from './MenuNav';
import { navButton, setText, UI, uiButton, UiButton, uiLabel, uiNode, uiPanel } from './UiKit';
const { ccclass } = _decorator;

const STAR_ON = new Color(255, 200, 60, 255);
const STAR_OFF = new Color(205, 190, 170, 255);
const OUTLINE = new Color(120, 80, 40, 255);
const DONE = new Color(80, 130, 40, 255);
const MISSED = new Color(160, 140, 130, 255);

/** Số liệu một lần chơi xong màn. */
export interface RunStats {
    level: string;
    time: number;
    fish: number;
    fishTotal: number;
    downs: number;
}

export interface ResultsActions {
    replay: () => void;
    menu: () => void;
}

/** Số sao: ★ về đích · ★ nhặt đủ cá · ★ không gục lần nào. */
export function starsOf(s: RunStats): boolean[] {
    return [true, s.fish >= s.fishTotal, s.downs === 0];
}

/**
 * Bảng KẾT QUẢ khi về đích: thời gian, số cá, số lần gục, 3 sao, kỷ lục; nút Chơi lại · Về menu · Màn tiếp theo (chưa có).
 * Hiện từng nhịp: bảng bật ra, từng dòng số, từng ngôi sao, rồi mới tới kỷ lục và nút bấm.
 * Chọn bằng bàn phím (MenuNav, trái/phải hoặc lên/xuống) hoặc bấm chuột. Gọi ResultsScreen.show(...).
 */
@ccclass('ResultsScreen')
export class ResultsScreen extends Component {
    private nav = new MenuNav();
    private buttons: UiButton[] = [];

    static show(parent: Node, stats: RunStats, actions: ResultsActions): ResultsScreen {
        const d = view.getDesignResolutionSize();
        const n = uiNode('Results', parent, d.width, d.height);
        n.setSiblingIndex(parent.children.length - 1);
        const r = n.addComponent(ResultsScreen);
        r.build(stats, actions);
        return r;
    }

    onDestroy() {
        this.nav.close(false);
    }

    private build(stats: RunStats, actions: ResultsActions) {
        const stars = starsOf(stats);
        const starCount = stars.filter((s) => s).length;
        const best = Records.get(stats.level);
        const record = Records.submit(stats.level, stats.time, starCount);
        const after = Records.get(stats.level);

        const panel = uiPanel(this.node, 980, 820, 'Panel');
        this.pop(panel, 0, 0.35);
        const title = uiLabel(panel, T('results.title'), 76, UI.text);
        title.node.setPosition(0, 320, 0);

        // Ba ngôi sao và điều kiện dưới mỗi sao
        const conds = [T('results.star1'), T('results.star2', stats.fishTotal), T('results.star3')];
        stars.forEach((on, i) => {
            const x = (i - 1) * 260;
            const star = uiNode(`Star${i}`, panel, 160, 160);
            star.setPosition(x, 170, 0);
            this.drawStar(star.addComponent(Graphics), on);
            star.setScale(0, 0, 1);
            const delay = 0.9 + i * 0.4;
            this.scheduleOnce(() => {
                tween(star).to(0.25, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'backOut' }).to(0.12, { scale: Vec3.ONE }).start();
                if (on) Sound.play('coin', 0.9);
            }, delay);
            const cond = uiLabel(panel, conds[i], 28, on ? DONE : MISSED);
            cond.node.setPosition(x, 60, 0);
            this.fadeIn(cond.node, delay);
        });

        // Dòng số liệu
        const rows: [string, string][] = [
            [T('results.time'), formatTime(stats.time)],
            [T('results.fish'), `${stats.fish}/${stats.fishTotal}`],
            [T('results.downs'), `${stats.downs}`],
        ];
        rows.forEach(([name, value], i) => {
            const y = -10 - i * 58;
            const l = uiLabel(panel, name, 38, UI.text);
            l.node.setPosition(-150, y, 0);
            const v = uiLabel(panel, value, 40, UI.text);
            v.node.setPosition(170, y, 0);
            this.fadeIn(l.node, 0.35 + i * 0.15);
            this.fadeIn(v.node, 0.35 + i * 0.15);
        });

        // Kỷ lục
        const bestLabel = uiLabel(panel, '', 34, record ? UI.accent : UI.text, record ? { outline: OUTLINE, outlineWidth: 3 } : {});
        bestLabel.node.setPosition(0, -200, 0);
        if (record && best) setText(bestLabel, T('results.newRecord'));
        else if (after) setText(bestLabel, T('results.best', formatTime(after.time), after.stars));
        const bestDelay = 0.9 + 3 * 0.4;
        this.fadeIn(bestLabel.node, bestDelay);
        if (record && best) {
            this.scheduleOnce(() => tween(bestLabel.node).to(0.2, { scale: new Vec3(1.2, 1.2, 1) }).to(0.2, { scale: Vec3.ONE }).start(), bestDelay);
        }

        // Nút
        const y = -310;
        const replay = uiButton(panel, T('results.replay'), 280, 92, actions.replay, { fontSize: 38 });
        const menu = uiButton(panel, T('results.menu'), 280, 92, actions.menu, { fontSize: 38 });
        const next = uiButton(panel, T('results.next'), 280, 92, () => this.soon(next), { fontSize: 34 });
        replay.node.setPosition(-300, y, 0);
        menu.node.setPosition(0, y, 0);
        next.node.setPosition(300, y, 0);
        (next.node.getComponent(UIOpacity) ?? next.node.addComponent(UIOpacity)).opacity = 130;
        this.buttons = [replay, menu, next];
        const items: NavItem[] = this.buttons.map((b) => navButton(b));
        items.forEach((it, i) => {
            it.left = () => this.nav.focusItem(items[(i + items.length - 1) % items.length]);
            it.right = () => this.nav.focusItem(items[(i + 1) % items.length]);
            this.nav.add(it);
        });
        // Chặn bấm trước khi hiện xong (khỏi lỡ tay bấm Nhảy khi vừa chạm cờ)
        for (const b of this.buttons) b.node.active = false;
        this.scheduleOnce(() => {
            for (const b of this.buttons) {
                b.node.active = true;
                this.pop(b.node, 0, 0.2);
            }
            this.nav.open(items[0]);
        }, bestDelay + 0.4);
    }

    /** Màn tiếp theo chưa có: chữ "Sắp có" thay tạm trên nút. */
    private soon(b: UiButton) {
        setText(b.label, T('results.soon'));
        Tween.stopAllByTarget(b.node);
        tween(b.node).to(0.08, { position: new Vec3(b.node.position.x + 10, b.node.position.y, 0) })
            .to(0.08, { position: new Vec3(b.node.position.x - 10, b.node.position.y, 0) })
            .to(0.08, { position: new Vec3(b.node.position.x, b.node.position.y, 0) }).start();
        this.scheduleOnce(() => { if (b.node.isValid) setText(b.label, T('results.next')); }, 1.2);
    }

    private pop(n: Node, delay: number, time: number) {
        n.setScale(0.6, 0.6, 1);
        const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
        const target = op.opacity > 0 ? op.opacity : 255;
        op.opacity = 0;
        tween(n).delay(delay).to(time, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        tween(op).delay(delay).to(time * 0.7, { opacity: target }).start();
    }

    private fadeIn(n: Node, delay: number) {
        const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
        op.opacity = 0;
        tween(op).delay(delay).to(0.25, { opacity: 255 }).start();
    }

    private drawStar(g: Graphics, on: boolean) {
        const R = 70, r = 30;
        g.lineWidth = 7;
        g.strokeColor = OUTLINE;
        g.fillColor = on ? STAR_ON : STAR_OFF;
        for (let i = 0; i < 10; i++) {
            const a = Math.PI / 2 + i * Math.PI / 5;
            const rad = i % 2 === 0 ? R : r;
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.close();
        g.fill();
        g.stroke();
    }
}
