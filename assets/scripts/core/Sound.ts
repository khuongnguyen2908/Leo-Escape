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

    /** Tải trước mọi file trong thư mục sounds. Gọi một lần lúc vào màn. */
    preload() {
        if (loading || clips.size > 0) return;
        loading = true;
        resources.loadDir(FOLDER, AudioClip, (err, list) => {
            loading = false;
            if (err) console.warn(`[Sound] Không tải được assets/resources/${FOLDER}:`, err);
            for (const c of list ?? []) clips.set(c.name, c);
            if (wantedMusic) Sound.music(wantedMusic);
        });
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
        if (!clip || !sources()) return;
        const b = bgm!;
        b.volume = this.musicVolume;
        if (b.clip === clip && b.playing) return;
        b.clip = clip;
        b.play();
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
