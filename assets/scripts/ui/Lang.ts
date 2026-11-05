import { Label } from 'cc';
import { Action, LangCode, Settings } from '../core/Settings';
import { setText, toggleText } from './UiKit';

/**
 * Mọi chữ hiện trong game, mỗi chữ có tiếng Việt (vi) và tiếng Anh (en). Chọn ngôn ngữ trong Cài đặt.
 * Thêm chữ mới: thêm một dòng vào TEXT rồi gọi T('tên') (hoặc Lang.bind(label, 'tên') để chữ tự đổi khi đổi ngôn ngữ).
 * {0}, {1}... trong chữ được thay bằng các giá trị truyền thêm.
 * Tiếng Anh dùng font game; tiếng Việt có dấu tự dùng font hệ thống (font game thiếu chữ có dấu).
 */
const TEXT = {
    // Menu chính
    'menu.NewGame': ['CHƠI MỚI', 'NEW GAME'],
    'menu.Options': ['CÀI ĐẶT', 'OPTIONS'],
    'menu.Achievements': ['THÀNH TÍCH', 'ACHIEVEMENTS'],
    'menu.Credits': ['TÁC GIẢ', 'CREDITS'],
    'menu.Quit': ['THOÁT', 'QUIT'],
    'menu.soon': ['SẮP CÓ', 'COMING SOON'],
    'quit.title': ['THOÁT GAME?', 'QUIT GAME?'],
    'thanks.title': ['CẢM ƠN ĐÃ CHƠI!', 'THANKS FOR PLAYING!'],
    'thanks.sub': ['BẠN CÓ THỂ ĐÓNG TAB NÀY.', 'YOU CAN CLOSE THIS TAB NOW.'],
    'thanks.back': ['VỀ MENU', 'BACK TO MENU'],
    'mode.one': ['1 NGƯỜI', '1 PLAYER'],
    'mode.two': ['2 NGƯỜI', '2 PLAYERS'],
    'mode.oneHint': ['Đổi qua lại 2 mèo bằng phím Đổi mèo', 'Switch cats with the Swap key'],
    'mode.twoHint': ['Mỗi người một bộ phím', 'Each player has their own keys'],
    'pick.title': ['CHỌN MÈO', 'CHOOSE YOUR CAT'],
    'pick.hint': ['Trái / phải: chọn mèo   ·   Nhảy: chốt   ·   Xuống: bỏ chọn   ·   Esc: quay lại',
        'Left / right: choose   ·   Jump: confirm   ·   Down: cancel   ·   Esc: back'],
    'yes': ['CÓ', 'YES'],
    'no': ['KHÔNG', 'NO'],
    'on': ['BẬT', 'ON'],
    'off': ['TẮT', 'OFF'],
    'back': ['Quay lại', 'Back'],

    // Tạm dừng, hỏi lại
    'pause.title': ['TẠM DỪNG', 'PAUSED'],
    'pause.resume': ['Tiếp tục', 'Resume'],
    'pause.restart': ['Chơi lại màn', 'Restart level'],
    'pause.settings': ['Cài đặt', 'Settings'],
    'pause.home': ['Về màn hình chính', 'Main menu'],
    'confirm.restart': ['Chơi lại từ đầu màn?', 'Restart this level?'],
    'confirm.home': ['Về màn hình chính?', 'Back to main menu?'],
    'confirm.lost': ['Tiến độ màn này sẽ mất.', 'Progress in this level will be lost.'],

    // Cài đặt
    'settings.title': ['CÀI ĐẶT', 'SETTINGS'],
    'settings.music': ['Nhạc nền', 'Music'],
    'settings.sfx': ['Tiếng hiệu ứng', 'Sound effects'],
    'settings.fullscreen': ['Toàn màn hình', 'Fullscreen'],
    'settings.shake': ['Rung màn hình', 'Screen shake'],
    'settings.lang': ['Ngôn ngữ', 'Language'],
    'settings.langName': ['Tiếng Việt', 'English'],
    'settings.keys': ['Bàn phím', 'Controls'],
    'settings.tabSystem': ['Hệ thống', 'System'],
    'settings.tabControls': ['Điều khiển', 'Controls'],
    'settings.save': ['Lưu', 'Save'],
    'settings.saved': ['Đã lưu ✔', 'Saved ✔'],
    'confirm.discard': ['Bỏ thay đổi?', 'Discard changes?'],
    'confirm.discardSub': ['Các cài đặt chưa lưu sẽ trả về như cũ.', 'Unsaved settings will go back to how they were.'],
    'credits.title': ['TÁC GIẢ', 'CREDITS'],
    'close': ['Đóng', 'Close'],

    // Bàn phím
    'keys.title': ['BÀN PHÍM', 'CONTROLS'],
    'keys.player': ['Người {0}', 'Player {0}'],
    'keys.layout': ['Kiểu phím', 'Key layout'],
    'keys.wasd': ['WASD', 'WASD'],
    'keys.arrows': ['Mũi tên', 'Arrows'],
    'keys.custom': ['Tuỳ chỉnh', 'Custom'],
    'keys.reset': ['Trả về mặc định', 'Reset to default'],
    'keys.press': ['Bấm phím...', 'Press a key...'],
    'keys.prompt': ['Bấm phím mới cho Người {0} · {1} (Esc để huỷ)', 'Press a new key for Player {0} · {1} (Esc to cancel)'],
    'keys.cancelled': ['Đã huỷ.', 'Cancelled.'],
    'keys.swapped': ['{0} đang dùng cho Người {1} · {2}, đã đổi chỗ hai phím.', '{0} was used by Player {1} · {2}, the two keys were swapped.'],
    'keys.set': ['Người {0} · {1}: {2}', 'Player {0} · {1}: {2}'],
    'keys.resetDone': ['Đã trả về phím mặc định.', 'Keys reset to default.'],
    'keys.layoutDone': ['Đã đổi sang kiểu {0}.', 'Switched to {0} layout.'],
    'action.left': ['Sang trái', 'Move left'],
    'action.right': ['Sang phải', 'Move right'],
    'action.up': ['Lên bục', 'Up'],
    'action.down': ['Xuống bục', 'Down'],
    'action.jump': ['Nhảy', 'Jump'],
    'action.attack': ['Đánh', 'Attack'],
    'action.skill': ['Kỹ năng', 'Skill'],
    'action.interact': ['Tương tác', 'Interact'],
    'action.swap': ['Đổi mèo', 'Swap cat'],
    'action.dash': ['Lướt', 'Dash'],

    // Trong màn
    'hud.tryAgain': ['Thử lại nào!', 'Try again!'],
    'revive.hold': ['Giữ {0}', 'Hold {0}'],
    'goal.locked': ['Hạ boss trước đã!', 'Defeat the boss first!'],

    // Kết quả
    'results.title': ['HOÀN THÀNH!', 'LEVEL CLEAR!'],
    'results.time': ['Thời gian', 'Time'],
    'results.fish': ['Cá', 'Fish'],
    'results.downs': ['Số lần gục', 'Knock-outs'],
    'results.star1': ['Về đích', 'Reach the goal'],
    'results.star2': ['Nhặt đủ {0} cá', 'Collect all {0} fish'],
    'results.star3': ['Không gục lần nào', 'Never get knocked out'],
    'results.best': ['Kỷ lục: {0} · ★{1}', 'Best: {0} · ★{1}'],
    'results.newRecord': ['KỶ LỤC MỚI!', 'NEW RECORD!'],
    'results.replay': ['Chơi lại', 'Play again'],
    'results.menu': ['Về menu', 'Main menu'],
    'results.next': ['Màn tiếp theo', 'Next level'],
    'results.soon': ['Sắp có', 'Coming soon'],

    // Boss
    'boss.name': ['CHIHUAHUA ĐỘC', 'TOXIC CHIHUAHUA'],
    'boss.chapter': ['Chương 1', 'Chapter 1'],
    'boss.bark': ['GÂU!!', 'WOOF!!'],
    'boss.defeated': ['ĐÃ HẠ BOSS!', 'BOSS DEFEATED!'],

    // Hướng dẫn
    'tut.run': ['Chạy', 'Run'],
    'tut.jump': ['Nhảy (giữ lâu nhảy cao)', 'Jump (hold to jump higher)'],
    'tut.doubleJump': ['Đang bay bấm lần nữa: nhảy 2 lần', 'Press again in the air: double jump'],
    'tut.attack': ['Chém, bấm liên tục ra combo', 'Attack, keep pressing for a combo'],
    'tut.dash': ['Bấm đúp: lướt', 'Double-tap: dash'],
    'tut.wave': ['Giữ rồi thả: sóng kiếm', 'Hold then release: sword wave'],
    'tut.sweep': ['Quét chân, địch té ngã', 'Leg sweep, knocks enemies down'],
    'tut.launch': ['Chém hất địch lên trời', 'Launch enemies into the air'],
} as const;

export type TextKey = keyof typeof TEXT;

const INDEX: Record<LangCode, number> = { vi: 0, en: 1 };

/** Chữ theo ngôn ngữ đang chọn; {0}, {1}... thay bằng args. */
export function T(key: TextKey, ...args: (string | number)[]): string {
    const row = TEXT[key];
    let s: string = row ? row[INDEX[Settings.lang]] : key;
    args.forEach((a, i) => { s = s.split(`{${i}}`).join(String(a)); });
    return s;
}

/** Tên hành động (ô phím). Chưa có Angelo thì phím Tương tác là Lướt. */
export function actionName(a: Action, dash = false): string {
    return dash && a === 'interact' ? T('action.dash') : T(`action.${a}` as TextKey);
}

interface Bound {
    label: Label;
    make: () => string;
    gameFont: boolean;
}

const bound: Bound[] = [];
let lastLang: LangCode | null = null;

function refreshAll() {
    for (let i = bound.length - 1; i >= 0; i--) {
        const b = bound[i];
        if (!b.label.isValid) {
            bound.splice(i, 1);
            continue;
        }
        setText(b.label, b.make(), b.gameFont);
    }
}

function syncToggleText() {
    toggleText.on = T('on');
    toggleText.off = T('off');
}
syncToggleText();

Settings.onChange(() => {
    if (Settings.lang === lastLang) return;
    lastLang = Settings.lang;
    syncToggleText();
    refreshAll();
    for (const cb of Lang.listeners.slice()) cb();
});

export const Lang = {
    /** Gọi khi đổi ngôn ngữ (chữ vẽ bằng tay, không gắn bằng bind). */
    listeners: [] as (() => void)[],

    get code(): LangCode { return Settings.lang; },
    set code(v: LangCode) {
        lastLang = Settings.lang;
        Settings.lang = v;
    },

    /** Gắn chữ key vào label; đổi ngôn ngữ thì tự viết lại. */
    bind(label: Label, key: TextKey, ...args: (string | number)[]) {
        this.bindFn(label, () => T(key, ...args));
    },

    /** Như bind nhưng chữ do hàm make tạo (ghép nhiều chữ, có tên phím...). */
    bindFn(label: Label, make: () => string, gameFont = true) {
        const old = bound.findIndex((b) => b.label === label);
        if (old >= 0) bound.splice(old, 1);
        bound.push({ label, make, gameFont });
        setText(label, make(), gameFont);
    },

    onChange(cb: () => void) { this.listeners.push(cb); },
    offChange(cb: () => void) {
        const i = this.listeners.indexOf(cb);
        if (i >= 0) this.listeners.splice(i, 1);
    },
};
