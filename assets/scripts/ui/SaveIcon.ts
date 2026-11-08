import { director, Label, Node, UIOpacity, UITransform, view } from 'cc';
import { T } from './Lang';
import { MENU_OUTLINE, MENU_TEXT } from './MenuStyle';
import { pawIcon } from './PawIcon';
import { setText, uiLabel, uiNode } from './UiKit';

/** Nhịp (giây): hiện dần, "Đang lưu..." tới lúc này thì đổi sang "Đã lưu", đứng, mờ đi */
const IN = 0.25;
const SAVED_AT = 1.2;
const OUT_AT = 2.1;
const OUT = 0.35;
/** Cỡ chân mèo, khoảng cách tới chữ; mép phải chữ cách mép phải khung hình, tâm cách mép trên (cùng hàng tim / ô cá, trên nút bánh răng) */
const PAW = 64;
const SPACE = 14;
const MARGIN_RIGHT = 30;
const MARGIN_TOP = 79;

let current: Node | null = null;

/**
 * Dấu tự lưu (kiểu A): góc phải trên (cùng hàng tim / ô cá, phía trên nút bánh răng), chân mèo Icon_paw tô trắng viền nâu + chữ.
 * Đang lưu: chân mèo nhún nhịp, chữ "Đang lưu..." nhấp nháy → lưu xong: chữ "Đã lưu", chân mèo nảy lên và loé sáng
 * rồi mờ đi (~2.5 giây). GameManager gọi SaveIcon.show() mỗi lần ghi ô lưu (đi ngang checkpoint, qua màn).
 * Chạy bằng setInterval, luôn nằm trên cùng (cả trên màn đen chuyển cảnh).
 */
export const SaveIcon = {
    show() {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        if (current?.isValid) current.destroy();
        const d = view.getDesignResolutionSize();
        const root = uiNode('SaveIcon', canvas);
        root.setPosition(d.width / 2 - MARGIN_RIGHT, d.height / 2 - MARGIN_TOP, 0);
        const op = root.addComponent(UIOpacity);
        op.opacity = 0;
        current = root;
        // Chữ canh mép phải ở gốc; chân mèo đứng bên trái chữ
        const label: Label = uiLabel(root, '', 34, MENU_TEXT, { outline: MENU_OUTLINE, outlineWidth: 4, name: 'Text' });
        label.node.getComponent(UITransform)!.setAnchorPoint(1, 0.5);
        const textOp = label.node.addComponent(UIOpacity);
        const setLabel = (key: 'save.saving' | 'save.saved') => {
            setText(label, T(key));
            label.updateRenderData(true);
        };
        setLabel('save.saving');
        // Chỗ chân mèo theo chữ dài nhất (để đổi chữ không làm chân mèo nhảy chỗ)
        const savingW = label.node.getComponent(UITransform)!.width;
        const pawX = -savingW - SPACE - PAW / 2;
        const paw = pawIcon(root, PAW);
        paw.node.setPosition(pawX, 0, 0);
        let saved = false;
        const start = Date.now();
        const timer = setInterval(() => {
            if (!root.isValid) {
                clearInterval(timer);
                return;
            }
            // Luôn nằm trên cùng (màn đen chuyển cảnh cũng tự đưa mình lên trên cùng)
            const top = canvas.children.length - 1;
            if (root.getSiblingIndex() !== top) root.setSiblingIndex(top);
            const t = (Date.now() - start) / 1000;
            op.opacity = Math.round(255 * Math.min(1, t / IN, Math.max(0, (OUT_AT + OUT - t) / OUT)));
            if (t < SAVED_AT) {
                // Đang lưu: chân mèo nhún, nghiêng qua lại; chữ nhấp nháy
                const b = Math.abs(Math.sin(t * 8));
                paw.node.setPosition(pawX, b * 8, 0);
                paw.node.angle = Math.sin(t * 8) * 8;
                textOp.opacity = Math.round(255 * (0.55 + 0.45 * Math.abs(Math.cos(t * 4))));
            } else {
                if (!saved) {
                    saved = true;
                    setLabel('save.saved');
                    textOp.opacity = 255;
                    paw.node.angle = 0;
                }
                // Lưu xong: chân mèo nảy lên một nhịp và loé sáng rồi tắt dần
                const s = t - SAVED_AT;
                const pop = s < 0.12 ? s / 0.12 : Math.max(0, 1 - (s - 0.12) / 0.25);
                paw.node.setPosition(pawX, 0, 0);
                paw.node.setScale(1 + 0.25 * pop, 1 + 0.25 * pop, 1);
                paw.setGlow(s < 0.15 ? s / 0.15 : Math.max(0, 1 - (s - 0.15) / 0.6));
            }
            if (t >= OUT_AT + OUT) {
                clearInterval(timer);
                root.destroy();
                if (current === root) current = null;
            }
        }, 16);
    },
};
