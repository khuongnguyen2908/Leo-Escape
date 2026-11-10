import { _decorator, Component, Node, Rect, UITransform, Vec2 } from 'cc';
import { EDITOR } from 'cc/env';
import { clamp, overlaps } from '../core/Box';
import { PlatformerBody } from '../core/PlatformerBody';
import { Settings } from '../core/Settings';
import { Solid } from '../core/Solid';

const _probe = new Rect();
const _solidRect = new Rect();
import { ParallaxLayer } from './ParallaxLayer';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Camera "giả": không di chuyển Camera thật mà dịch và phóng các ParallaxLayer,
 * nhờ vậy HUD đứng yên mà không cần Canvas thứ hai. Gắn lên Canvas.
 * Toạ độ camera tính trong không gian lớp Gameplay.
 * Lưu ý: node Camera dưới Canvas bị Canvas tự đặt lại khi chạy, nên đừng chỉnh node đó; hãy chỉnh zoom/offset ở đây.
 *
 * Xem trước trong editor: bật "Xem trước camera" rồi kéo "Vị trí camera", khung tím của Canvas
 * sẽ hiện đúng cảnh lúc chơi (kể cả parallax và zoom). Tắt đi thì các lớp trở về vị trí gốc.
 */
@ccclass('CameraRig')
@executeInEditMode
export class CameraRig extends Component {
    static instance: CameraRig | null = null;

    /** Khung kế camera nhảy thẳng tới chỗ mèo, không trôi từ từ (dùng khi hồi sinh ở checkpoint). */
    snapNext() {
        this.snapped = false;
    }

    @property
    _editorPreview = false;

    @property
    _previewX = 660;

    @property({ displayName: 'Xem trước camera', tooltip: 'Chỉ có tác dụng trong editor: dịch các lớp như lúc chơi để canh vị trí cho đúng' })
    get editorPreview() { return this._editorPreview; }
    set editorPreview(v: boolean) {
        if (v && !this._editorPreview) {
            // Vị trí các lớp lúc chưa xem trước chính là vị trí gốc
            for (const layer of ParallaxLayer.all) layer.captureBase();
        }
        this._editorPreview = v;
        if (v) this.applyEditorPreview();
        else for (const layer of ParallaxLayer.all) layer.resetToBase();
    }

    @property({
        displayName: 'Vị trí camera', slide: true, range: [-1000, 12000, 10],
        tooltip: 'Tâm khung hình (toạ độ lớp Gameplay) khi xem trước trong editor',
        visible(this: CameraRig) { return this._editorPreview; },
    })
    get previewX() { return this._previewX; }
    set previewX(v: number) {
        this._previewX = v;
        if (this._editorPreview) this.applyEditorPreview();
    }

    @property({ type: Node, tooltip: 'Nhân vật cần bám theo (nằm trong lớp Gameplay). Khi chơi, GameManager đổi sang bám một hoặc cả hai con mèo' })
    target: Node | null = null;

    @property({ tooltip: 'Phóng to: lớn hơn 1 là gần hơn, nhỏ hơn 1 là thấy rộng hơn. HUD không bị ảnh hưởng' })
    zoom = 1;

    @property({ tooltip: 'Bề ngang khung hình dùng để giới hạn camera. 0 = theo bề ngang màn hình; 1920 = luôn như khung 16:9 (dùng với Letterbox)' })
    viewWidth = 0;

    @property({ tooltip: 'Dời khung hình: x dương = nhìn về bên phải nhiều hơn (mèo lệch trái), y dương = nhìn cao hơn (mặt đất thấp xuống)' })
    offset = new Vec2(0, 0);

    @property({ tooltip: 'Nhìn trước theo hướng chạy' })
    lookAhead = 180;

    @property({ tooltip: 'Độ mượt bám ngang (lớn = bám sát hơn)' })
    dampingX = 6;

    @property({ tooltip: 'Độ mượt bám dọc' })
    dampingY = 3;

    @property({ tooltip: 'Tắt: camera không nhảy theo, chỉ đổi độ cao khi mèo đáp xuống bục cao hơn hoặc rơi thấp xuống' })
    followJump = false;

    @property({ tooltip: 'Khi không bám theo nhảy: mèo bay cao quá mức này so với chỗ đứng thì camera mới đi lên' })
    jumpDeadZone = 320;

    @property({ group: 'Giới hạn màn', tooltip: 'Mép trái của màn chơi' })
    minX = 0;

    @property({ group: 'Giới hạn màn', tooltip: 'Mép phải của màn chơi' })
    maxX = 8000;

    @property({ group: 'Giới hạn màn', tooltip: 'Camera không xuống thấp hơn' })
    minY = 0;

    @property({ group: 'Giới hạn màn', tooltip: 'Camera không lên cao hơn' })
    maxY = 220;

    @property({ group: 'Giới hạn màn', tooltip: 'Về đích (camera đứng yên): mép phải khung hình phải cách Max X ít nhất chừng này, sát hơn thì camera trượt nhẹ sang trái, để mèo còn chỗ chạy khuất trước khi đụng tường cuối màn' })
    holdExitRoom = 250;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Bật: camera đi theo chiều dọc (nhảy, đứng chỗ cao), lệch theo hướng quay mặt, chúi xuống ở mép vực, giữ Xuống / Lên để nhìn xuống / lên. Tắt: như cũ' })
    hkStyle = true;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Camera lên cao tối đa (thay cho Max Y khi bật kiểu Hollow Knight)' })
    hkMaxY = 4000;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Nhảy cao hơn chỗ đứng chừng này camera mới trôi lên theo (vùng chết, nhảy thấp thì camera đứng yên)' })
    jumpZone = 120;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Camera lệch về hướng mèo quay mặt chừng này (thay cho Offset X)' })
    faceShift = 220;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Quay đầu thì camera trôi sang hướng mới trong khoảng chừng này giây' })
    faceTime = 0.8;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Đứng gần mép vực (trong Ledge Dist) và quay mặt ra vực thì camera chúi xuống chừng này' })
    ledgeLook = 250;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Mép vực cách chân mèo bao xa thì tính là đứng gần mép' })
    ledgeDist = 150;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Giữ Xuống (ngồi) / giữ Lên khi đứng yên thì camera nhìn xuống / lên chừng này' })
    holdLook = 260;

    @property({ group: 'Kiểu Hollow Knight', tooltip: 'Giữ phím bao lâu (giây) mới bắt đầu nhìn xuống / lên' })
    holdDelay = 0.6;

    readonly position = new Vec2();

    /** Kiểu Hollow Knight: độ lệch ngang theo hướng mặt, độ chúi dọc (nhìn xuống âm), thời gian đang giữ Xuống / Lên */
    private face = 0;
    private lookY = 0;
    private holdDown = 0;
    private holdUp = 0;
    /** Khu boss: khoá độ cao camera theo mặt đất khu boss (không nhảy theo, không nhìn xuống) */
    private lockedY: number | null = null;

    private look = 0;
    private anchorY = 0;
    private snapped = false;
    private targetBody: PlatformerBody | null = null;
    private targets: Node[] = [];
    private readonly bodies = new Map<Node, PlatformerBody | null>();
    private shakeAmount = 0;
    private shakeTime = 0;
    private shakeDuration = 0;
    private readonly shaken = new Vec2();
    /** Camera đứng yên, không bám theo ai (lúc về đích: mèo chạy ra khỏi khung hình) */
    private held = false;

    onLoad() {
        if (!EDITOR) CameraRig.instance = this;
    }

    onDestroy() {
        if (CameraRig.instance === this) CameraRig.instance = null;
    }

    /** Rung màn hình amount đơn vị trong time giây, nhỏ dần về 0 (dùng khi chém trúng, bị đánh...). */
    shake(amount: number, time: number) {
        if (!Settings.shake) return; // người chơi tắt rung màn hình trong Cài đặt
        if (amount < this.shakeAmount * (this.shakeTime / Math.max(0.001, this.shakeDuration))) return;
        this.shakeAmount = amount;
        this.shakeTime = this.shakeDuration = time;
    }

    lateUpdate(dt: number) {
        if (EDITOR) {
            // Trong editor: xem trước thì dịch lớp theo camera; không xem trước thì ghi nhận vị trí bạn kéo làm vị trí gốc
            if (this._editorPreview) this.applyEditorPreview();
            else for (const layer of ParallaxLayer.all) layer.captureBase();
            return;
        }
        if (this.held) {
            this.updateHeld(dt);
            return;
        }
        // Bám một con (chơi 1 người) hoặc điểm giữa hai con (chơi 2 người)
        const list = this.targets.length > 0 ? this.targets : (this.target ? [this.target] : []);
        if (list.length === 0) return;
        if (!this.targetBody || this.targetBody.node !== list[0]) this.targetBody = list[0].getComponent(PlatformerBody);

        let cx = 0, vx = 0;
        for (const n of list) {
            cx += n.position.x;
            vx += this.bodyOf(n)?.velocity.x ?? 0;
        }
        cx /= list.length;
        vx /= list.length;
        if (Math.abs(vx) > 60) {
            this.look += (Math.sign(vx) * this.lookAhead - this.look) * (1 - Math.exp(-2.5 * dt));
        }

        const zoom = Math.max(0.1, this.zoom);
        const halfW = this.frameWidth() / 2 / zoom;
        let desiredX: number, desiredY: number;
        if (this.hkStyle) {
            // Ngang: lệch về hướng quay mặt, quay đầu thì trôi dần sang hướng mới
            const ctl = list[0].getComponent('PlayerController') as unknown as { facing?: number; controls?: { down: boolean; upHeld: boolean } } | null;
            const facing = ctl?.facing ?? 1;
            this.face += (facing * this.faceShift - this.face) * (1 - Math.exp(-dt * 3 / Math.max(0.05, this.faceTime)));
            desiredX = this.maxX - this.minX > halfW * 2
                ? clamp(cx + this.face, this.minX + halfW, this.maxX - halfW)
                : (this.minX + this.maxX) / 2;
            // Dọc: theo chỗ đứng / nhảy cao (vùng chết), cộng độ chúi (mép vực, giữ Xuống / Lên); khu boss thì khoá
            const want = this.lockedY !== null ? 0 : this.hkLook(list[0], ctl, facing, dt);
            this.lookY += (want - this.lookY) * (1 - Math.exp(-4 * dt));
            const base = this.lockedY ?? this.trackJump(list[0].position.y);
            desiredY = clamp(base + this.lookY, this.minY, Math.max(this.maxY, this.hkMaxY)) + this.offset.y;
        } else {
            desiredX = this.maxX - this.minX > halfW * 2
                ? clamp(cx + this.look + this.offset.x, this.minX + halfW, this.maxX - halfW)
                : (this.minX + this.maxX) / 2;
            desiredY = clamp(this.trackY(list[0].position.y), this.minY, this.maxY) + this.offset.y;
        }

        if (this.snapped) {
            this.position.x += (desiredX - this.position.x) * (1 - Math.exp(-this.dampingX * dt));
            // Rơi xuống (camera cần đi xuống) thì bám nhanh gấp đôi để thấy chỗ đáp
            const dampY = this.hkStyle && desiredY < this.position.y ? this.dampingY * 2 : this.dampingY;
            this.position.y += (desiredY - this.position.y) * (1 - Math.exp(-dampY * dt));
        } else {
            this.position.set(desiredX, desiredY);
            this.snapped = true;
        }

        let cam: Vec2 = this.position;
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const k = this.shakeAmount * Math.max(0, this.shakeTime / this.shakeDuration);
            cam = this.shaken.set(this.position.x + (Math.random() * 2 - 1) * k, this.position.y + (Math.random() * 2 - 1) * k);
        }
        for (const layer of ParallaxLayer.all) layer.apply(cam, zoom);
    }

    /** Đứng yên; chỉ trượt sang trái nếu đang sát mép phải màn chơi quá (mèo cần chỗ chạy ra khỏi khung hình). */
    private updateHeld(dt: number) {
        const zoom = Math.max(0.1, this.zoom);
        const limit = this.maxX - this.frameWidth() / 2 / zoom - this.holdExitRoom;
        if (this.position.x <= limit) return;
        this.position.x += (limit - this.position.x) * (1 - Math.exp(-this.dampingX * 0.6 * dt));
        for (const layer of ParallaxLayer.all) layer.apply(this.position, zoom);
    }

    /** Chỗ x (toạ độ lớp Gameplay) có đang thấy trong khung hình không, nới thêm margin hai bên. */
    inViewX(x: number, margin = 0): boolean {
        const halfW = this.frameWidth() / 2 / Math.max(0.1, this.zoom);
        return Math.abs(x - this.position.x) <= halfW + margin;
    }

    /** Giữ camera đứng yên ở chỗ hiện tại (true) hoặc bám theo lại (false). */
    hold(on: boolean) {
        this.held = on;
    }

    /** Đổi nhân vật cần bám theo (một hoặc nhiều node trong lớp Gameplay). */
    setTargets(nodes: Node[]) {
        this.targets = nodes.slice();
        this.targetBody = null;
    }

    private bodyOf(n: Node): PlatformerBody | null {
        let b = this.bodies.get(n);
        if (b === undefined) {
            b = n.getComponent(PlatformerBody);
            this.bodies.set(n, b);
        }
        return b;
    }

    private frameWidth(): number {
        return this.viewWidth > 0 ? this.viewWidth : (this.getComponent(UITransform)?.width ?? 1920);
    }

    private applyEditorPreview() {
        const zoom = Math.max(0.1, this.zoom);
        const halfW = this.frameWidth() / 2 / zoom;
        const x = this.maxX - this.minX > halfW * 2
            ? clamp(this._previewX, this.minX + halfW, this.maxX - halfW)
            : (this.minX + this.maxX) / 2;
        this.position.set(x, this.minY + this.offset.y);
        for (const layer of ParallaxLayer.all) layer.apply(this.position, zoom);
    }

    /** Độ cao camera bám theo: chỗ mèo đứng gần nhất, trừ khi rơi thấp hơn hoặc bay quá cao. */
    /** Khu boss: khoá độ cao camera theo mặt đất y (null = mở lại). */
    lockY(y: number | null) {
        this.lockedY = y;
        if (y !== null) this.lookY = 0;
    }

    /**
     * Kiểu Hollow Knight: đứng trên đất thì camera theo đúng chỗ đứng (đáp lên chỗ cao thì nâng lên);
     * trên không chỉ đi lên khi bay cao hơn chỗ đứng quá Jump Zone; rơi thấp hơn chỗ đứng thì theo xuống ngay.
     */
    private trackJump(y: number): number {
        const body = this.targetBody;
        if (!body || !this.snapped || body.grounded || y < this.anchorY) this.anchorY = y;
        else if (y > this.anchorY + this.jumpZone) this.anchorY = y - this.jumpZone;
        return this.anchorY;
    }

    /** Độ chúi dọc mong muốn: giữ Xuống / Lên đủ lâu, hoặc đứng gần mép vực và quay mặt ra vực (âm = nhìn xuống). */
    private hkLook(node: Node, ctl: { controls?: { down: boolean; upHeld: boolean } } | null, facing: number, dt: number): number {
        const body = this.targetBody;
        if (!body || !body.grounded) {
            this.holdDown = this.holdUp = 0;
            return 0;
        }
        const down = !!ctl?.controls?.down;
        const up = !!ctl?.controls?.upHeld && Math.abs(body.velocity.x) < 20;
        this.holdDown = down ? this.holdDown + dt : 0;
        this.holdUp = up ? this.holdUp + dt : 0;
        if (this.holdDown >= this.holdDelay) return -this.holdLook;
        if (this.holdUp >= this.holdDelay) return this.holdLook;
        // Mép vực: phía trước mặt cách Ledge Dist không có nền đỡ chân
        const p = node.position;
        _probe.set(p.x + facing * this.ledgeDist - 10, p.y - 40, 20, 34);
        const hasGround = Solid.all.some((s) => s.enabled && s.node.activeInHierarchy && overlaps(s.getRect(_solidRect), _probe));
        return hasGround ? 0 : -this.ledgeLook;
    }

    private trackY(y: number): number {
        const body = this.targetBody;
        if (this.followJump || !body || !this.snapped) {
            this.anchorY = y;
        } else if (body.grounded || y < this.anchorY) {
            this.anchorY = y;
        } else if (y > this.anchorY + this.jumpDeadZone) {
            this.anchorY = y - this.jumpDeadZone;
        }
        return this.anchorY;
    }
}
