import { _decorator, assetManager, Component, Sprite, SpriteFrame, UIOpacity, UITransform, view } from 'cc';
import { EDITOR } from 'cc/env';
import { CameraRig } from '../camera/CameraRig';
const { ccclass, property, executeInEditMode } = _decorator;

declare const Editor: any;

// Vị trí camera ứng với 4 ảnh demo (giống DemoLevelBuilder)
const FRAME_CAM = [660, 2580, 4500, 6420];

/**
 * Phủ ảnh demo (assets/ref/demo_1..4.jpg) lên khung hình trong editor để so 1-1 với scene.
 * Tích "Hiện ảnh demo", chọn Khung 1–4: camera xem trước tự nhảy tới đúng chỗ của khung đó.
 * Chỉ dùng trong editor: lúc chơi node tự tắt, ảnh demo không bị đóng gói vào bản build.
 * Gắn lên một node con cuối cùng của Canvas (nằm trên mọi lớp).
 */
@ccclass('DemoReference')
@executeInEditMode
export class DemoReference extends Component {
    @property
    _show = true;

    @property
    _frame = 1;

    @property
    _opacity = 140;

    @property({ displayName: 'Hiện ảnh demo', tooltip: 'Bật/tắt ảnh demo phủ lên khung hình để so' })
    get show() { return this._show; }
    set show(v: boolean) { this._show = v; this.refresh(); }

    @property({ displayName: 'Khung', slide: true, range: [1, 4, 1], tooltip: 'Khung demo 1–4. Camera xem trước nhảy tới đúng vị trí của khung' })
    get frame() { return this._frame; }
    set frame(v: number) {
        this._frame = Math.min(4, Math.max(1, Math.round(v)));
        this.moveCamera();
        this.refresh();
    }

    @property({ displayName: 'Độ đậm', slide: true, range: [0, 255, 1], tooltip: 'Ảnh demo đậm hay mờ (255 = che hẳn scene)' })
    get opacity() { return this._opacity; }
    set opacity(v: number) { this._opacity = v; this.refresh(); }

    // Không lưu vào scene, để ảnh demo không bị kéo theo vào bản build
    private frames: (SpriteFrame | null)[] = [null, null, null, null];
    private loading = false;

    onLoad() {
        if (!EDITOR) {
            this.node.active = false;
            return;
        }
        const d = view.getDesignResolutionSize();
        const ui = this.getComponent(UITransform) ?? this.addComponent(UITransform);
        ui.setContentSize(d.width, d.height);
        const sp = this.getComponent(Sprite) ?? this.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        if (!this.getComponent(UIOpacity)) this.addComponent(UIOpacity);
        this.node.setPosition(0, 0, 0);
        this.refresh();
    }

    /** Đưa camera xem trước tới vị trí của khung đang chọn. */
    private moveCamera() {
        const rig = this.node.parent?.getComponent(CameraRig);
        if (!rig) return;
        rig.editorPreview = true;
        rig.previewX = FRAME_CAM[this._frame - 1];
    }

    private refresh() {
        if (!EDITOR) return;
        const sp = this.getComponent(Sprite);
        if (!sp) return;
        const sf = this.frames[this._frame - 1];
        if (!sf) this.loadFrames();
        sp.spriteFrame = sf;
        sp.enabled = this._show && !!sf;
        const op = this.getComponent(UIOpacity);
        if (op) op.opacity = this._opacity;
    }

    /** Trong editor không dùng được resources.load, nên hỏi asset-db rồi nạp theo uuid. */
    private async loadFrames() {
        if (this.loading) return;
        this.loading = true;
        try {
            const infos: any[] = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/ref/**' }) ?? [];
            const found: [number, string][] = [];
            const collect = (info: any) => {
                const m = /demo_(\d)/.exec(info?.url ?? '');
                if (info?.type === 'cc.SpriteFrame' && m) found.push([Number(m[1]) - 1, info.uuid]);
                if (info?.subAssets) Object.keys(info.subAssets).forEach((k) => collect(info.subAssets[k]));
            };
            infos.forEach(collect);
            if (!found.length) console.warn('[DemoReference] Chưa thấy ảnh demo trong assets/ref (demo_1.jpg ... demo_4.jpg).');
            await Promise.all(found.map(([i, uuid]) => new Promise<void>((resolve) => {
                assetManager.loadAny(uuid, (err: Error | null, sf: SpriteFrame) => {
                    if (!err && sf && i >= 0 && i < 4) this.frames[i] = sf;
                    resolve();
                });
            })));
        } catch (e) {
            console.warn('[DemoReference] Không nạp được ảnh demo:', e);
        }
        this.loading = false;
        if (this.frames[this._frame - 1]) this.refresh();
    }
}
