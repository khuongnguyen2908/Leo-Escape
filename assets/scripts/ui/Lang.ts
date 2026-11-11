import { Label } from 'cc';
import { Action, LangCode, Settings } from '../core/Settings';
import { setText } from './UiKit';

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
    // Mở game: logo, banner, chờ bấm
    'boot.loading': ['ĐANG TẢI {0}%', 'LOADING {0}%'],
    'load.text': ['Đang tải...', 'Loading...'],
    'save.saving': ['Đang lưu...', 'Saving...'],
    'save.saved': ['Đã lưu', 'Saved'],
    // Ô lưu
    'slots.title': ['CHỌN Ô LƯU', 'SELECT A SAVE'],
    'slots.slot': ['Ô {0}', 'SLOT {0}'],
    'slots.new': ['MỚI', 'NEW'],
    'slots.chapter': ['CHƯƠNG {0}', 'CHAPTER {0}'],
    'slots.checkpoint': ['Checkpoint {0}', 'Checkpoint {0}'],
    'slots.start': ['Đầu màn', 'Level start'],
    'slots.cleared': ['Đã qua màn', 'Cleared'],
    'slots.time': ['Thời gian: {0}', 'Time: {0}'],
    'slots.fish': ['Cá: {0}', 'Fish: {0}'],
    'slots.delete': ['XOÁ Ô LƯU NÀY?', 'DELETE THIS SAVE?'],
    'slots.hErase': ['Xoá', 'Erase'],
    'slots.hBack': ['Quay lại', 'Back'],
    'slots.hConfirm': ['Xác nhận', 'Confirm'],
    // Chọn độ khó (ô lưu mới)
    'diff.title': ['Chọn độ khó. Độ khó gắn với ô lưu này, không đổi được sau.', 'Choose the level of difficulty. It stays with this save.'],
    'diff.0': ['THƯ GIÃN', 'CASUAL'],
    'diff.1': ['BÌNH THƯỜNG', 'NORMAL'],
    'diff.2': ['ĐỊA NGỤC', 'MANIAC'],
    'diff.0.d': ['Dễ thở, cho ai chủ yếu muốn thong thả theo câu chuyện.', 'An easier difficulty for those who mainly want to enjoy the story.'],
    'diff.1.d': ['Địch trâu hơn, ra đòn nhanh hơn. Đánh phải có tính toán.', 'Tougher, faster enemies for challenging, tactical fighting.'],
    'diff.2.d': ['Địch và boss rất trâu, đánh dồn dập, báo trước rất ngắn.', 'Intense battles: very tough enemies and relentless bosses.'],
    'diff.note': ['Độ khó không ảnh hưởng tới cốt truyện.', 'The difficulty does not affect the story.'],
    // Truyện mở đầu (chữ tạm, sửa ở đây; có ảnh story_1..3 trong thư mục art thì dùng ảnh)
    'story.1': ['Ngày xửa ngày xưa, ở Phố Mèo có chú mèo mập tên Leo...', 'Once upon a time, in Cat Town, there lived a chubby cat named Leo...'],
    'story.2': ['Một đêm nọ, Leo lạc vào khu rừng lạ, nơi bọn quái vật canh giữ.', 'One night, Leo got lost in a strange forest guarded by monsters.'],
    'story.3': ['Phải tìm đường về nhà trước khi trời sáng!', 'He must find the way home before sunrise!'],
    'story.page': ['TRANG {0}', 'PAGE {0}'],
    // Màn hướng dẫn: biển chỉ dẫn (tsign.<chủ đề>.t = tên, .d = giải thích)
    'tsign.title.t': ['HƯỚNG DẪN', 'THE TUTORIAL'],
    'tsign.title.d': ['Đi sang phải để tập từng động tác.', 'Walk right and try each move.'],
    'tsign.run.t': ['CHẠY', 'RUN'],
    'tsign.run.d': ['Giữ để chạy.', 'Hold to run.'],
    'tsign.duck.t': ['NGỒI', 'DUCK'],
    'tsign.duck.d': ['Giữ để ngồi thụp.', 'Hold to crouch.'],
    'tsign.jump.t': ['NHẢY', 'JUMP'],
    'tsign.jump.d': ['Bấm nhanh nhảy thấp, giữ nhảy cao.', 'Tap for short, hold for high jump.'],
    'tsign.doubleJump.t': ['NHẢY 2 LẦN', 'DOUBLE JUMP'],
    'tsign.doubleJump.d': ['Bấm lần nữa khi đang bay.', 'Press again in the air.'],
    'tsign.up.t': ['LÊN BỤC', 'CLIMB UP'],
    'tsign.up.d': ['Lên bục ngay phía trên.', 'Hop onto the platform above.'],
    'tsign.descend.t': ['XUỐNG BỤC', 'DESCEND'],
    'tsign.descend.d': ['Bấm 2 lần để rơi qua bục.', 'Double-tap to drop through.'],
    'tsign.dash.t': ['LƯỚT', 'DASH'],
    'tsign.dash.d': ['Bấm Lướt: né đòn, không bị trúng. Đang lướt mà nhảy thì bay xa.', 'Press Dash to dodge: no damage. Jump mid-dash to leap far.'],
    'tsign.attack.t': ['CHÉM', 'ATTACK'],
    'tsign.attack.d': ['Bấm liên tục ra combo 5 nhát.', 'Keep pressing for a 5-hit combo.'],
    'tsign.wave.t': ['SÓNG KIẾM', 'SWORD WAVE'],
    'tsign.wave.d': ['Giữ rồi thả.', 'Hold, then release.'],
    'tsign.sweep.t': ['QUÉT CHÂN', 'LEG SWEEP'],
    'tsign.sweep.d': ['Làm địch nhỏ té ngã.', 'Knocks small enemies down.'],
    'tsign.launch.t': ['CHÉM HẤT', 'LAUNCHER'],
    'tsign.launch.d': ['Hất địch lên trời.', 'Sends enemies flying.'],
    'tsign.special.t': ['BÙNG NỔ', 'SPECIAL'],
    'tsign.special.d': ['Chém trúng cho đầy nộ rồi bấm.', 'Fill the rage bar, then press.'],
    'tsign.fish.t': ['CÁ', 'FISH'],
    'tsign.fish.d': ['Ăn cá để được điểm.', 'Collect fish for points.'],
    'tsign.exit.t': ['LỐI RA', 'EXIT'],
    'tsign.exit.d': ['Đứng ở cửa rồi bấm.', 'Stand at the door and press.'],
    'tsign.hold': ['(giữ)', '(hold)'],
    // Hội thoại kiểu visual novel (chữ tạm, sửa ở đây)
    'dialog.name': ['Leo', 'Leo'],
    'dialog.1': ['Đây... là đâu vậy?', 'Where... where am I?'],
    'dialog.2': ['Có mùi cá... lẫn mùi rắc rối.', 'Smells like fish... and trouble.'],
    'dialog.3': ['Được rồi, tìm đường ra thôi!', "Alright, let's find a way out!"],
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
    'pause.quitMenu': ['Về menu chính', 'Quit to menu'],
    'confirm.quitMenu': ['Về menu chính?', 'Quit to menu?'],
    'confirm.quitSub': ['Tiến độ tính tới checkpoint gần nhất', 'Progress is kept from your last checkpoint'],
    // Cài đặt kiểu menu: danh sách trang, các dòng
    'opt.game': ['Trò chơi', 'Game'],
    'opt.audio': ['Âm thanh', 'Audio'],
    'opt.video': ['Hình ảnh', 'Video'],
    'opt.controls': ['Điều khiển', 'Controls'],
    'opt.gameTitle': ['TRÒ CHƠI', 'GAME'],
    'opt.audioTitle': ['ÂM THANH', 'AUDIO'],
    'opt.videoTitle': ['HÌNH ẢNH', 'VIDEO'],
    'opt.controlsTitle': ['ĐIỀU KHIỂN', 'CONTROLS'],
    'opt.master': ['Âm lượng chung', 'Master volume'],
    'opt.reset': ['Trả về mặc định', 'Reset defaults'],
    // Màn thông báo tự lưu (sau logo)
    'boot.notice1': ['Trò chơi tự động lưu tiến độ ở một số điểm nhất định.', 'This game saves automatically at certain points.'],
    'boot.notice2': ['Xin đừng tắt game khi biểu tượng này đang hiện.', 'Please do not close the game while this symbol is displayed.'],
    // Thành tích
    'ach.title': ['THÀNH TÍCH', 'ACHIEVEMENTS'],
    'ach.unlocked': ['Đạt thành tích!', 'Achievement unlocked!'],
    'ach.tutorial': ['Bước đầu', 'First Steps'],
    'ach.tutorial.d': ['Hoàn thành màn hướng dẫn.', 'Finish the tutorial.'],
    'ach.boss': ['Hạ Chihuahua Độc', 'Toxic Takedown'],
    'ach.boss.d': ['Hạ boss Chihuahua Độc.', 'Defeat the Toxic Chihuahua.'],
    'ach.clear': ['Về nhà', 'Homeward'],
    'ach.clear.d': ['Qua chương 1.', 'Clear chapter 1.'],
    'ach.fish': ['Mèo tham ăn', 'Greedy Cat'],
    'ach.fish.d': ['Qua chương 1 và ăn đủ cá.', 'Clear chapter 1 with every fish.'],
    'ach.nodown': ['Không một vết xước', 'Untouchable'],
    'ach.nodown.d': ['Qua chương 1 mà không gục lần nào.', 'Clear chapter 1 without getting knocked out.'],
    'ach.fast': ['Nhanh như mèo', 'Quick Paws'],
    'ach.fast.d': ['Qua chương 1 dưới 5 phút.', 'Clear chapter 1 in under 5 minutes.'],
    'ach.maniac': ['Liều mạng', 'Daredevil'],
    'ach.maniac.d': ['Qua chương 1 ở độ khó MANIAC.', 'Clear chapter 1 on MANIAC.'],
    'ach.hunter': ['Thợ săn chim', 'Bird Hunter'],
    'ach.hunter.d': ['Hạ 20 con chim ({0}/20).', 'Defeat 20 birds ({0}/20).'],
    'pause.title': ['TẠM DỪNG', 'PAUSED'],
    'pause.resume': ['Tiếp tục', 'Resume'],
    'pause.settings': ['Cài đặt', 'Options'],

    // Cài đặt
    'settings.title': ['CÀI ĐẶT', 'OPTIONS'],
    'settings.music': ['Nhạc nền', 'Music'],
    'settings.sfx': ['Tiếng hiệu ứng', 'Sound effects'],
    'settings.fullscreen': ['Toàn màn hình', 'Fullscreen'],
    'settings.shake': ['Rung màn hình', 'Screen shake'],
    'settings.lang': ['Ngôn ngữ', 'Language'],
    'settings.langName': ['Tiếng Việt', 'English'],
    'credits.title': ['TÁC GIẢ', 'CREDITS'],

    // Bàn phím
    'keys.player': ['Người {0}', 'Player {0}'],
    'keys.layout': ['Kiểu phím', 'Key layout'],
    'keys.wasd': ['WASD', 'WASD'],
    'keys.arrows': ['Mũi tên', 'Arrows'],
    'keys.custom': ['Tuỳ chỉnh', 'Custom'],
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
    'action.skill': ['Bùng nổ', 'Special'],
    'action.interact': ['Lướt', 'Dash'],
    'action.swap': ['Đổi mèo', 'Swap cat'],
    'action.dash': ['Lướt', 'Dash'],

    // Trong màn
    'gameover.title': ['GAME OVER', 'GAME OVER'],
    'gameover.retry': ['Chơi lại', 'Retry'],
    'gameover.menu': ['Về menu', 'Quit to menu'],
    'goal.locked': ['Hạ boss trước đã!', 'Defeat the boss first!'],
    'bigfish.got': ['+1 CÁ BỰ', '+1 BIG FISH'],
    'key.got': ['+1 CHÌA KHOÁ', '+1 KEY'],
    'gate.need': ['Còn thiếu {0} chìa khoá', '{0} more key(s) needed'],
    'gate.open': ['Cổng đã mở!', 'The gate is open!'],

    // Cửa hàng (ShopNPC, ShopPage) và cây kỹ năng (game/Upgrades.ts)
    'shop.title': ['CỬA HÀNG', 'SHOP'],
    'shop.bigFish': ['Cá bự: {0}', 'Big fish: {0}'],
    'shop.gold': ['Cá vàng: {0}', 'Gold fish: {0}'],
    'shop.row0': ['KIẾM', 'SWORD'],
    'shop.row1': ['THÂN', 'BODY'],
    'shop.row2': ['CHIÊU', 'MOVES'],
    'shop.cost': ['{0} cá bự · {1}', '{0} big fish · {1}'],
    'shop.owned': ['ĐÃ CÓ', 'OWNED'],
    'shop.locked': ['Mua ô bên trái trước đã', 'Buy the one on the left first'],
    'shop.short': ['Chưa đủ cá', 'Not enough fish'],
    'shop.ready': ['Bấm để mua', 'Press to buy'],
    'shop.bought': ['Đã mua!', 'Bought!'],
    'shop.hBuy': ['Mua', 'Buy'],
    'shop.hExit': ['Thoát', 'Exit'],
    'up.wave': ['Sóng kiếm', 'Sword Wave'],
    'up.wave.d': ['Giữ Đánh rồi thả: phóng sóng kiếm bay thẳng, trúng kẻ địch đầu tiên', 'Hold Attack then release: a sword wave that hits the first enemy'],
    'up.wavePierce': ['Sóng kiếm xuyên', 'Piercing Wave'],
    'up.wavePierce.d': ['Sóng kiếm bay xuyên qua mọi kẻ địch trên đường', 'The sword wave passes through every enemy in its path'],
    'up.heart1': ['Thêm 1 tim', 'Extra Heart'],
    'up.heart1.d': ['Thêm 1 tim tối đa', 'One more max heart'],
    'up.heart2': ['Thêm 1 tim', 'Extra Heart'],
    'up.heart2.d': ['Thêm 1 tim tối đa nữa', 'Another max heart'],
    'up.rage': ['Nộ đầy nhanh', 'Quick Rage'],
    'up.rage.d': ['Thanh nộ đầy nhanh hơn 40%', 'The rage bar fills 40% faster'],
    'up.pound': ['Đập bụng', 'Belly Slam'],
    'up.pound.d': ['Đang bay giữ Xuống + Đánh: lao xuống đập đất, choáng kẻ địch xung quanh', 'In the air hold Down + Attack: slam the ground, stunning enemies around'],
    'up.burst': ['Mèo Nổ', 'Cat Burst'],
    'up.burst.d': ['Đầy nộ, giữ Xuống + Lướt: nổ đánh mọi kẻ địch trên màn hình', 'Full rage, hold Down + Dash: blast every enemy on screen'],

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

Settings.onChange(() => {
    if (Settings.lang === lastLang) return;
    lastLang = Settings.lang;
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
        // Bỏ chữ cũ của chính label này và mọi label đã bị xoá (tải lại màn nhiều lần thì danh sách không phình ra)
        for (let i = bound.length - 1; i >= 0; i--) {
            if (bound[i].label === label || !bound[i].label.isValid) bound.splice(i, 1);
        }
        bound.push({ label, make, gameFont });
        setText(label, make(), gameFont);
    },

    onChange(cb: () => void) { this.listeners.push(cb); },
    offChange(cb: () => void) {
        const i = this.listeners.indexOf(cb);
        if (i >= 0) this.listeners.splice(i, 1);
    },
};
