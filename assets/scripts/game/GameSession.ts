import { assetManager, director } from 'cc';

/**
 * Lựa chọn của người chơi trong lần mở game này, giữ qua các lần tải lại scene (thua rồi chơi lại):
 * chơi mấy người, ai điều khiển mèo nào. Đặt ở màn mở đầu; "Về màn hình chính" thì chọn lại.
 */
export const GameSession = {
    /** 1 = một người đổi qua lại hai mèo (Tab), 2 = mỗi người một mèo. */
    mode: 1 as 1 | 2,
    /** Chơi 2 người: Leo do người chơi nào điều khiển (0 = Người 1, 1 = Người 2). */
    leoPlayer: 0,
    /** Chơi 2 người: Angelo do người chơi nào điều khiển. */
    angeloPlayer: 1,
    /** Có Angelo trong màn không (theo ô "Bật Angelo" của GameManager). Tắt thì không có chơi 2 người, không có phím Đổi mèo. */
    angelo: false,
    /** Màn mở đầu đang hiện, chưa vào chơi (GameManager chờ tới khi bấm START). */
    waitingForStart: false,
    /** Ô lưu đang chơi (0..2), -1 = chưa chọn (không lưu tiến độ). Giữ qua các lần tải lại màn. */
    slot: -1,
    /** Độ khó của ô lưu đang chơi (0 CASUAL, 1 NORMAL, 2 MANIAC; core/Difficulty.ts). */
    difficulty: 0,
    /**
     * Màn hướng dẫn của scene đang chơi (TutorialRoom tự gắn vào đây khi nạp, gỡ khi bị xoá).
     * Để ở đây cho LandingScreen gọi mà không phải import TutorialRoom (import thẳng tạo vòng: LandingScreen → TutorialRoom →
     * TutorialExit → PlayerTrigger → GameManager → LandingScreen, lớp PlayerTrigger chưa có đã bị kế thừa → "Missing class").
     */
    tutorial: null as { enter(): void; readonly active: boolean } | null,

    reset() {
        this.mode = 1;
        this.slot = -1;
        this.difficulty = 0;
        this.leoPlayer = 0;
        this.angeloPlayer = 1;
    },
};

/**
 * Tải lại màn đang chơi (thua rồi chơi lại, về màn hình chính).
 * Không dùng director.getScene().name: lúc chạy tên đó là chuỗi rỗng, nên tìm tên scene theo uuid trong danh sách scene của bundle.
 */
export function reloadScene() {
    const scene = director.getScene();
    if (!scene) return;
    let name = scene.name;
    if (!name) {
        // bundle.config có khi chạy nhưng không có trong file khai báo kiểu của engine
        assetManager.bundles.forEach((bundle) => {
            const scenes: { forEach(cb: (info: { uuid: string; url: string }) => void): void } | undefined = (bundle as any).config?.scenes;
            scenes?.forEach((info) => {
                if (!name && info.uuid === scene.uuid) {
                    const file = info.url.split('/').pop() ?? '';
                    name = file.replace(/\.scene$/, '');
                }
            });
        });
    }
    if (!name) name = 'Main';
    if (!name || !director.loadScene(name)) console.error(`[GameSession] Không tải lại được scene (tên tìm được: "${name}").`);
}
