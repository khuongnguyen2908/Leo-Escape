import { _decorator, Component, Node, UIOpacity, view } from 'cc';
import { Sound } from '../core/Sound';
import { menuItem, MenuFocus, menuShade, menuTitle } from './MenuStyle';
import { MenuNav } from './MenuNav';
import { uiNode } from './UiKit';
const { ccclass } = _decorator;

/** Hiện dần trong chừng này giây */
const FADE_IN = 0.35;

export interface GameOverActions {
    /** Chơi lại: đứng dậy ở checkpoint gần nhất */
    retry: () => void;
    /** Về menu chính */
    menu: () => void;
}

/**
 * Màn GAME OVER (mèo gục hết tim): kiểu menu tạm dừng — màn tối mờ, tiêu đề GAME OVER + hoa văn,
 * hai mục CHƠI LẠI / VỀ MENU có khung chọn; ↑ ↓ + Enter / Nhảy / Đánh hoặc chạm. GameManager gọi GameOverScreen.show.
 * Hiện dần bằng setInterval (không phụ thuộc game có đang tạm dừng hay không).
 */
@ccclass('GameOverScreen')
export class GameOverScreen extends Component {
    private nav: MenuNav | null = null;

    static show(parent: Node, actions: GameOverActions): GameOverScreen {
        const d = view.getDesignResolutionSize();
        const n = uiNode('GameOver', parent, d.width, d.height);
        n.setSiblingIndex(parent.children.length - 1);
        const s = n.addComponent(GameOverScreen);
        s.build(actions);
        return s;
    }

    onDestroy() {
        this.nav?.close(false);
    }

    private build(actions: GameOverActions) {
        const d = view.getDesignResolutionSize();
        const root = this.node;
        const op = root.addComponent(UIOpacity);
        op.opacity = 0;
        menuShade(root, d.width, d.height, 200);
        menuTitle(root, 'gameover.title', 150, 110);
        const nav = new MenuNav(null);
        this.nav = nav;
        const focus = new MenuFocus(root);
        let done = false;
        const pick = (f: () => void) => () => {
            if (done) return;
            done = true;
            nav.close(false);
            f();
        };
        const retry = menuItem(root, 'gameover.retry', -40, nav, focus, pick(actions.retry));
        menuItem(root, 'gameover.menu', -140, nav, focus, pick(actions.menu));
        nav.open(retry);
        Sound.play('ui_page', 0.6);
        const start = Date.now();
        const timer = setInterval(() => {
            if (!root.isValid) {
                clearInterval(timer);
                return;
            }
            const k = Math.min(1, (Date.now() - start) / 1000 / FADE_IN);
            op.opacity = Math.round(255 * k);
            if (k >= 1) clearInterval(timer);
        }, 16);
    }
}
