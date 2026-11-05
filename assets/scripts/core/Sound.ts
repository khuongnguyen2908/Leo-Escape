import { AudioClip, AudioSource, director, Input, input, Node, resources } from 'cc';

/**
 * Phát âm thanh và nhạc nền. Mọi file nằm trong assets/resources/sounds, gọi theo tên file (không đuôi):
 *   Sound.play('jump')   Sound.music('bgm')
 * Muốn thay tiếng: chép file mới (.wav / .mp3 / .ogg) đè lên với cùng tên.
 * Nhạc nền chạy tiếp khi chơi lại màn (node âm thanh không bị xoá khi tải lại scene).
 */
const FOLDER = 'sounds';

const clips = new Map<string, AudioClip>();
let loading = false;
let sfx: AudioSource | null = null;
let bgm: AudioSource | null = null;
let wantedMusic: string | null = null;
const musicLoading = new Set<string>();
let unlockHooked = false;

/** Tạo node phát âm thanh (một lần, giữ qua các lần tải lại scene). */
function sources(): boolean {
    if (sfx && sfx.isValid && bgm && bgm.isValid) return true;
    const scene = director.getScene();
    if (!scene) return false;
    const root = new Node('Sound');
    scene.addChild(root);
    director.addPersistRootNode(root);
    const a = new Node('Sfx');
    root.addChild(a);
    sfx = a.addComponent(AudioSource);
    const b = new Node('Music');
    root.addChild(b);
    bgm = b.addComponent(AudioSource);
    bgm.loop = true;
    return true;
}

/** Trình duyệt chặn tiếng tới khi người chơi bấm phím/chạm lần đầu; lúc đó bật lại nhạc nền nếu chưa chạy. */
function hookUnlock() {
    if (unlockHooked) return;
    unlockHooked = true;
    const retry = () => {
        if (wantedMusic && bgm && bgm.isValid && !bgm.playing) bgm.play();
    };
    input.on(Input.EventType.KEY_DOWN, retry);
    input.on(Input.EventType.TOUCH_START, retry);
}

export const Sound = {
    /** Âm lượng tiếng hiệu ứng 0..1 */
    sfxVolume: 0.8,
    /** Âm lượng nhạc nền 0..1 */
    musicVolume: 0.35,

    /**
     * Tải trước các tiếng hiệu ứng trong thư mục sounds. Gọi một lần lúc vào màn.
     * File nhạc (tên bắt đầu bằng "bgm") nặng nên không tải ở đây: music() tự tải bài cần phát, tiếng hiệu ứng khỏi phải chờ.
     */
    preload() {
        if (loading || clips.size > 0) return;
        const paths = resources.getDirWithPath(FOLDER, AudioClip)
            .map((info) => info.path)
            .filter((p) => !/(^|\/)bgm/.test(p));
        if (paths.length === 0) return;
        loading = true;
        resources.load(paths, AudioClip, (err, list) => {
            loading = false;
            if (err) console.warn(`[Sound] Không tải được tiếng trong assets/resources/${FOLDER}:`, err);
            for (const c of list ?? []) if (c) clips.set(c.name, c);
        });
    },

    /** Đã có (đã tải) tiếng tên name chưa. */
    has(name: string): boolean {
        return clips.has(name);
    },

    /** Phát một tiếng hiệu ứng; volume nhân thêm với sfxVolume. Chưa tải xong thì bỏ qua. */
    play(name: string, volume = 1) {
        const clip = clips.get(name);
        if (!clip || !sources()) return;
        sfx!.playOneShot(clip, Math.max(0, Math.min(1, volume * this.sfxVolume)));
    },

    /** Bật nhạc nền lặp lại (đang phát đúng bài đó thì để yên). */
    music(name: string) {
        wantedMusic = name;
        hookUnlock();
        const clip = clips.get(name);
        if (!clip) {
            // Chưa có thì tải riêng bài này; tải xong mà vẫn còn muốn phát bài đó thì phát
            if (musicLoading.has(name)) return;
            musicLoading.add(name);
            resources.load(`${FOLDER}/${name}`, AudioClip, (err, c) => {
                musicLoading.delete(name);
                if (err || !c) {
                    console.warn(`[Sound] Không tải được nhạc assets/resources/${FOLDER}/${name}:`, err);
                    return;
                }
                clips.set(name, c);
                if (wantedMusic === name) Sound.music(name);
            });
            return;
        }
        if (!sources()) return;
        const b = bgm!;
        b.volume = this.musicVolume;
        if (b.clip === clip && b.playing) return;
        b.clip = clip;
        b.play();
    },

    /** Tải trước một bài nhạc (chưa phát), để lúc cần phát thì có ngay. */
    prefetch(name: string) {
        if (!name || clips.has(name) || musicLoading.has(name)) return;
        musicLoading.add(name);
        resources.load(`${FOLDER}/${name}`, AudioClip, (err, c) => {
            musicLoading.delete(name);
            if (!err && c) clips.set(name, c);
            // Trong lúc tải, game đã gọi music(name) (vào trận boss khi nhạc chưa tải xong): phát luôn
            if (wantedMusic === name) Sound.music(name);
        });
    },

    /** Áp âm lượng mới ngay (khi kéo thanh trượt trong Cài đặt). */
    setVolumes(music: number, sfx: number) {
        this.musicVolume = music;
        this.sfxVolume = sfx;
        if (bgm && bgm.isValid) bgm.volume = music;
    },

    stopMusic() {
        wantedMusic = null;
        bgm?.stop();
    },
};
