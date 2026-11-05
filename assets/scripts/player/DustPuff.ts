import { _decorator, Component, Node, resources, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
const { ccclass } = _decorator;

const FOLDER = 'art/fx';
const MAX_FRAMES = 30;
/** Bao nhiêu khung đầu là khói đang tung lên (lặp khi giữ khói); các khung sau là khói tan. */
const RISE_FRAMES = 3;

/** Một bộ khung ảnh cùng tên đầu (FX_dust_1, FX_dust_2...). */
interface FrameSet {
    frames: SpriteFrame[];
    loading: boolean;
    warned: boolean;
}

const sets: { [prefix: string]: FrameSet } = {};

/** Tuỳ chọn khi sinh hiệu ứng. */
export interface FxOptions {
    /** 1: giữ nguyên ảnh gốc, -1: lật ngang (ảnh gốc coi như hướng sang phải). Mặc định 1 */
    dir?: number;
    /** Lật dọc (trên xuống dưới) */
    flipY?: boolean;
    /** Phóng to bao nhiêu lần. Mặc định 1 */
    scale?: number;
    /** Phóng to theo chiều dọc, nếu muốn khác chiều ngang. Mặc định bằng scale */
    scaleY?: number;
    /** Khung/giây. Mặc định 20 */
    fps?: number;
    /** true: neo ở giữa hình (nổ, vòng tròn); false: neo ở chân hình (bụi trên mặt đất). Mặc định false */
    center?: boolean;
    /** Khói giữ: lặp khói đang tung cho tới khi release() */
    hold?: boolean;
    /** > 0: lặp hết các khung trong chừng ấy giây rồi tự xoá (sao choáng...) */
    loopFor?: number;
}

function getSet(prefix: string): FrameSet {
    return sets[prefix] ?? (sets[prefix] = { frames: [], loading: false, warned: false });
}

/**
 * Hiệu ứng ảnh nhiều khung trong assets/resources/art/fx (flip-book), mỗi bộ một tên đầu:
 * FX_run_ / FX_skid_ / FX_takeoff_ / FX_land_ / FX_airjump_ (khói của mèo, RunDust; FX_dust_ / FX_jump_ là bộ cũ không dùng nữa), FX_hit_ / FX_hitbig_ (trúng đòn),
 * vệt chém FX_cut1_ / FX_cut2_ / FX_cut3_ / FX_spin_ / FX_finish_ (combo 5 nhát, SlashFx), FX_airspin_ (chém hất),
 * FX_sweep_ (quét chân), FX_wave_ (sóng kiếm, SwordWave); FX_slash_ / FX_tornado_ là bộ cũ không dùng nữa,
 * FX_ring_ / FX_spike_ (đập bụng), FX_stun_ (sao choáng), FX_swirl_ / FX_burst_ / FX_shock_ (tuyệt chiêu).
 * Thường: chạy một lượt hết các khung rồi tự xoá. loopFor: lặp trong chừng ấy giây rồi tự xoá.
 * Khói giữ (hold): lặp qua lại 3 khung đầu (khói đang tung) cho tới khi gọi release(), lúc đó chạy nốt các khung còn lại (khói tan) rồi tự xoá.
 * Ảnh pixel art được giữ sắc nét (lọc NEAREST, không gộp vào atlas động) khi phóng to.
 * Muốn đổi ảnh: chép ảnh mới đè lên đúng tên; thêm hay bớt khung cũng được, code tự đếm.
 * Gọi DustPuff.spawn(...) với node cha là lớp Gameplay, hoặc node mèo / kẻ địch để hiệu ứng đi theo.
 */
@ccclass('DustPuff')
export class DustPuff extends Component {
    static readonly RUN = 'FX_dust_';
    static readonly JUMP = 'FX_jump_';
    static readonly SLASH = 'FX_slash_';
    static readonly HIT = 'FX_hit_';
    static readonly HIT_BIG = 'FX_hitbig_';
    static readonly RING = 'FX_ring_';
    static readonly SPIKE = 'FX_spike_';
    static readonly STUN = 'FX_stun_';
    static readonly TORNADO = 'FX_tornado_';
    static readonly SWIRL = 'FX_swirl_';
    static readonly BURST = 'FX_burst_';
    static readonly SHOCK = 'FX_shock_';

    private frames: SpriteFrame[] = [];
    private sprite: Sprite | null = null;
    private time = 0;
    private fps = 20;
    private holding = false;
    private loopFor = 0;
    /** Khung bắt đầu chạy một lượt (0, hoặc khung khói tan sau khi release). */
    private startFrame = 0;

    /** Các khung của bộ ảnh (rỗng nếu chưa tải xong; gọi preload luôn). */
    static frames(prefix: string): SpriteFrame[] {
        const set = getSet(prefix);
        if (set.frames.length === 0) DustPuff.preload(prefix);
        return set.frames;
    }

    /** Bộ khung này đã tải xong chưa (chưa thì gọi preload luôn). */
    static ready(prefix: string): boolean {
        if (getSet(prefix).frames.length > 0) return true;
        DustPuff.preload(prefix);
        return false;
    }

    /** Tải trước một bộ khung (gọi sớm, ví dụ lúc vào màn). */
    static preload(prefix: string) {
        const set = getSet(prefix);
        if (set.loading || set.frames.length > 0) return;
        // Hỏi thư mục xem đang có những khung nào (FX_dust_1, FX_dust_2...), xếp theo số rồi mới tải
        const re = new RegExp(`(?:^|/)${prefix}(\\d+)$`);
        const paths = resources.getDirWithPath(FOLDER, SpriteFrame)
            .map((info) => info.path)
            .map((p) => ({ p, n: parseInt(re.exec(p.replace(/\/spriteFrame$/, ''))?.[1] ?? 'NaN', 10) }))
            .filter((e) => !isNaN(e.n) && e.n <= MAX_FRAMES)
            .sort((a, b) => a.n - b.n);
        if (paths.length === 0) {
            if (!set.warned) {
                set.warned = true;
                console.warn(`[DustPuff] Chưa thấy ảnh assets/resources/${FOLDER}/${prefix}1.png ... `
                    + '(kiểm tra đúng tên và Inspector có Type = sprite-frame). Tạm thời không có hiệu ứng này.');
            }
            return;
        }
        set.loading = true;
        resources.load(paths.map((e) => e.p), SpriteFrame, (err, list) => {
            set.loading = false;
            if (err) console.warn(`[DustPuff] Lỗi tải ảnh ${prefix}:`, err);
            set.frames = (list ?? []).filter((f) => !!f);
            for (const f of set.frames) {
                // Pixel art: phóng to vẫn sắc nét, không bị gộp vào atlas động (atlas làm mềm cạnh)
                f.texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
                f.packable = false;
            }
        });
    }

    /**
     * Sinh hiệu ứng (bộ ảnh prefix) tại (x, y) trong node cha (chân hình, hoặc giữa hình nếu center).
     * Bộ ảnh chưa tải xong thì trả về null (lần sau sẽ có).
     */
    static spawn(prefix: string, parent: Node, x: number, y: number, opt: FxOptions = {}): DustPuff | null {
        const frames = getSet(prefix).frames;
        if (frames.length === 0) {
            DustPuff.preload(prefix);
            return null;
        }
        const scale = opt.scale ?? 1;
        const n = new Node('DustPuff');
        n.layer = parent.layer;
        parent.addChild(n);
        n.setPosition(x, y, 0);
        n.setScale(scale * ((opt.dir ?? 1) < 0 ? -1 : 1), (opt.scaleY ?? scale) * (opt.flipY ? -1 : 1), 1);
        const puff = n.addComponent(DustPuff);
        puff.frames = frames;
        puff.fps = opt.fps ?? 20;
        puff.holding = !!opt.hold;
        puff.loopFor = opt.loopFor ?? 0;
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.RAW;
        sp.trim = false;
        sp.spriteFrame = frames[0];
        n.getComponent(UITransform)!.setAnchorPoint(0.5, opt.center ? 0.5 : 0);
        puff.sprite = sp;
        return puff;
    }

    /** Thôi giữ: khói đứng yên tại chỗ, chạy nốt các khung khói tan rồi tự xoá. */
    release() {
        if (!this.holding) return;
        this.holding = false;
        this.startFrame = Math.min(RISE_FRAMES, this.frames.length);
        this.time = 0;
    }

    update(dt: number) {
        const frames = this.frames;
        this.time += dt;
        const step = Math.floor(this.time * this.fps);
        let i: number;
        if (this.holding) {
            // Lặp qua lại 1 → 2 → 3 → 2 → 1... để khói không bị giật khi quay về khung đầu
            const n = Math.min(RISE_FRAMES, frames.length);
            const cycle = Math.max(1, n * 2 - 2);
            const k = step % cycle;
            i = k < n ? k : cycle - k;
        } else if (this.loopFor > 0) {
            if (this.time >= this.loopFor) {
                this.node.destroy();
                return;
            }
            i = step % frames.length;
        } else {
            i = this.startFrame + step;
            if (i >= frames.length) {
                this.node.destroy();
                return;
            }
        }
        if (this.sprite && this.sprite.spriteFrame !== frames[i]) this.sprite.spriteFrame = frames[i];
    }
}
