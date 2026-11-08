import { _decorator, Color, Component, Graphics, Node, Size, Tween, tween, UIOpacity, Vec3 } from 'cc';
import { CameraRig } from '../camera/CameraRig';
import { Achievements } from '../game/Achievements';
import { Solid } from '../core/Solid';
import { Sound } from '../core/Sound';
import { TimeScale } from '../core/TimeScale';
import { GameManager } from '../game/GameManager';
import { DustPuff } from '../player/DustPuff';
import { SkillFx } from '../player/SkillFx';
import { BossHealthBar } from '../ui/BossHealthBar';
import { Lang, T } from '../ui/Lang';
import { uiLabel, uiNode } from '../ui/UiKit';
import { EnemyPatrol } from './EnemyPatrol';
const { ccclass, property } = _decorator;

const WALL_RED = new Color(235, 50, 50, 255);
const BONE = new Color(245, 236, 215, 255);
const BONE_LINE = new Color(120, 100, 80, 255);
const BANNER = new Color(25, 18, 16, 210);
const NAME = new Color(255, 236, 200, 255);
const NAME_LINE = new Color(150, 40, 40, 255);
const BARK = new Color(255, 245, 225, 255);
const BARK_RING = new Color(255, 230, 190, 255);
const ALERT_LINE = new Color(70, 20, 20, 255);

type State = 'idle' | 'intro' | 'fight' | 'done';

/**
 * Khu đánh boss (BossBrain tự gắn cùng node boss):
 *  - Chưa vào trận: boss đứng yên quay mặt sang phải gặm khúc xương (xương vẽ tạm bằng code).
 *  - Mèo rơi xuống chạm đáy hang (khối đá của boss): hai dấu X đỏ to mờ chặn hai đầu khu (chặn thật), camera giữ trong khu,
 *    rồi cảnh mở màn từng nhịp: camera trượt sang boss → boss gặm xương → giật mình (!) → ngáp dài → quay đầu → sủa
 *    → tên boss trượt vào rồi ra → xong mới hiện thanh máu, đầy dần → camera về mèo, bắt đầu đánh.
 *    Lần sau (gục rồi quay lại) chỉ chiếu bản ngắn.
 *  - Boss chết: khựng hình, chớp sáng, chữ ĐÃ HẠ BOSS!, mở hai dấu X, camera hết bị giữ.
 *  - Mèo gục hết, về checkpoint: mở dấu X, boss về gặm xương, vào lại thì bản ngắn.
 * Mọi mốc thời gian là ô chỉnh ở đây (giây, tính từ lúc bước vào khu).
 */
@ccclass('BossArena')
export class BossArena extends Component {
    @property({ group: 'Mở màn', tooltip: 'Camera bắt đầu trượt sang boss' })
    panAt = 0.3;

    @property({ group: 'Mở màn', tooltip: 'Boss thôi gặm, khựng lại, dấu ! đỏ bật lên trên đầu (vẫn quay mặt sang phải)' })
    alertAt = 1.6;

    @property({ group: 'Mở màn', tooltip: 'Boss ngáp dài (vươn người, chữ Haaa~)' })
    yawnAt = 2.1;

    @property({ group: 'Mở màn', tooltip: 'Ngáp bao lâu (giây)' })
    yawnTime = 1;

    @property({ group: 'Mở màn', tooltip: 'Boss quay đầu về phía mèo' })
    turnAt = 3.3;

    @property({ group: 'Mở màn', tooltip: 'Boss sủa' })
    barkAt = 3.8;

    @property({ group: 'Mở màn', tooltip: 'Tên boss trượt vào (trượt vào, giữ, trượt ra mất khoảng 2.1 giây)' })
    nameAt = 4.4;

    @property({ group: 'Mở màn', tooltip: 'Thanh máu boss hiện ra, đầy dần (sau khi tên boss trượt ra hết)' })
    barAt = 6.6;

    @property({ group: 'Mở màn', tooltip: 'Camera trượt về mèo, bắt đầu đánh' })
    fightAt = 7.6;

    @property({ group: 'Mở màn', tooltip: 'Bản ngắn (gục rồi vào lại): bắt đầu đánh sau chừng này giây' })
    shortFightAt = 1.5;

    @property({ tooltip: 'Dấu X cách mép trong của khu boss (khu = mặt đá boss đứng, chừa 60 mỗi đầu) bao xa về phía mép khối đá' })
    wallInset = 20;


    @property({ group: 'Hạ boss', tooltip: 'Slow motion lúc boss chết: chậm còn bao nhiêu (0.15 = 15% tốc độ)' })
    slowLow = 0.15;

    @property({ group: 'Hạ boss', tooltip: 'Giữ chậm bao lâu (giây giờ thật) rồi mới nhanh dần lại' })
    slowHold = 1.2;

    @property({ tooltip: 'Tên file nhạc trận boss trong assets/resources/sounds (để trống = giữ nhạc nền)' })
    bossMusic = 'bgm_boss';

    @property({ tooltip: 'Tên file tiếng sủa trong assets/resources/sounds (chưa có file đó thì dùng tiếng đập tạm)' })
    barkSound = 'bark';

    /** BossBrain đọc: đang đánh thì mới ra đòn. */
    get fighting() { return this.state === 'fight'; }

    /** Đang chiếu mở màn (boss đứng yên, không bị chém). */
    get busy() { return this.state === 'intro'; }

    onFight: (() => void) | null = null;

    private boss: EnemyPatrol | null = null;
    private left = 0;
    private right = 0;
    private groundY = 0;
    private state: State = 'idle';
    private seen = false;
    private walls: Node[] = [];
    private bone: Node | null = null;
    private nibble = 0;
    private camMin = 0;
    private camMax = 0;
    private camLocked = false;
    private banner: Node | null = null;
    /** Đang gặm xương (trước khi thấy mèo): đầu gật gật, luôn quay mặt sang phải */
    private chewing = true;
    private alertMark: Node | null = null;

    /** BossBrain gọi khi đã biết khu (khối đá boss đứng). */
    setup(boss: EnemyPatrol, left: number, right: number, groundY: number) {
        this.boss = boss;
        this.left = left;
        this.right = right;
        this.groundY = groundY;
        this.toIdle();
    }

    onDestroy() {
        this.hideWalls();
        this.unlockCamera();
        if (this.banner?.isValid) this.banner.destroy();
    }

    update(dt: number) {
        const e = this.boss;
        if (!e || !e.isValid) return;
        if (this.state === 'fight' && e.defeated) {
            this.defeated();
            return;
        }
        if (this.chewing) {
            // Gặm xương: quay mặt sang phải (quay lưng với mèo đi tới), đầu gật gật đều đều, xương lắc theo
            e.face(e.node.position.x + 1);
            this.nibble -= dt;
            if (this.nibble <= 0) {
                this.nibble = 0.38;
                e.nibble();
                if (this.bone) {
                    Tween.stopAllByTarget(this.bone);
                    tween(this.bone).to(0.1, { angle: -22 }).to(0.18, { angle: -8 }).start();
                }
            }
        }
    }

    /** Mèo đã rơi xuống chạm đáy hang chưa (đứng trên mặt đá của boss, trong hai dấu X). */
    landed(x: number, y: number, grounded: boolean): boolean {
        return grounded && Math.abs(y - this.groundY) < 30 && x >= this.left - this.wallInset && x <= this.right + this.wallInset;
    }

    /** Có mèo vừa bước vào khu (BossBrain gọi). */
    enter() {
        if (this.state !== 'idle') return;
        this.state = 'intro';
        const short = this.seen;
        this.seen = true;
        const gm = GameManager.instance;
        gm?.lockCats(true);
        // Vào hang boss: tắt hẳn nhạc thường; nhạc trận boss tải sẵn trong lúc chiếu mở màn, bắt đầu đánh mới phát
        Sound.stopMusic();
        Sound.prefetch(this.bossMusic);
        this.showWalls();
        this.lockCamera();
        if (short) this.shortIntro();
        else this.fullIntro();
    }

    // ---------- Mở màn ----------

    private fullIntro() {
        const e = this.boss!;
        this.scheduleOnce(() => CameraRig.instance?.setTargets([e.node]), this.panAt);
        this.scheduleOnce(() => this.alert(), this.alertAt);
        this.scheduleOnce(() => this.yawn(), this.yawnAt);
        this.scheduleOnce(() => this.turn(), this.turnAt);
        this.scheduleOnce(() => this.bark(), this.barkAt);
        this.scheduleOnce(() => this.showName(), this.nameAt);
        this.scheduleOnce(() => BossHealthBar.instance?.reveal(), this.barAt);
        this.scheduleOnce(() => GameManager.instance?.followCats(), this.fightAt);
        this.scheduleOnce(() => this.startFight(), this.fightAt + 0.5);
    }

    private shortIntro() {
        const t = this.shortFightAt;
        this.alert();
        this.scheduleOnce(() => this.turn(), t * 0.25);
        this.scheduleOnce(() => this.bark(), t * 0.45);
        this.scheduleOnce(() => BossHealthBar.instance?.reveal(), t * 0.7);
        this.scheduleOnce(() => this.startFight(), t);
    }

    /** Boss nghe thấy: thôi gặm, khựng lại, dấu ! đỏ bật lên trên đầu (vẫn quay mặt sang phải). */
    private alert() {
        const e = this.boss!;
        this.chewing = false;
        if (this.bone) Tween.stopAllByTarget(this.bone);
        e.windup();
        Sound.play('checkpoint', 0.7);
        const n = uiNode('Alert', e.node);
        n.setPosition(0, e.targetHeight + 70, 0);
        DustPuff.spawn('Boss/Warn/frame', n, 0, 0, { scale: 2.4, fps: 14, center: true, loopFor: 30 });
        n.setScale(0.2, 0.2, 1);
        tween(n)
            .to(0.16, { scale: new Vec3(1.35, 1.35, 1) }, { easing: 'backOut' })
            .to(0.1, { scale: Vec3.ONE })
            .by(0.05, { position: new Vec3(8, 0, 0) }).by(0.1, { position: new Vec3(-16, 0, 0) }).by(0.05, { position: new Vec3(8, 0, 0) })
            .start();
        this.alertMark = n;
    }

    private clearAlert() {
        const n = this.alertMark;
        this.alertMark = null;
        if (!n || !n.isValid) return;
        const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
        tween(op).to(0.25, { opacity: 0 }).call(() => n.destroy()).start();
    }

    /** Ngáp dài: vươn người lên, ngả ra sau rồi về dáng thường; chữ Haaa~ và chữ z bay lên trên đầu. */
    private yawn() {
        const e = this.boss!;
        this.clearAlert();
        Sound.play('boss_yawn', 0.9);
        const k = { v: 0 };
        const apply = () => Object.assign(e.pose, { sx: 1 - 0.06 * k.v, sy: 1 + 0.16 * k.v, angle: 9 * k.v });
        tween(k).to(this.yawnTime * 0.45, { v: 1 }, { easing: 'sineOut', onUpdate: apply })
            .delay(this.yawnTime * 0.2)
            .to(this.yawnTime * 0.35, { v: 0 }, { easing: 'sineIn', onUpdate: apply })
            .call(() => Object.assign(e.pose, { sx: 1, sy: 1, angle: 0 }))
            .start();
        const parent = e.node.parent;
        if (!parent) return;
        const p = e.node.position;
        for (const [txt, size, dx, dy, delay] of [['Haaa~', 72, 60, 30, 0], ['z', 54, 200, 90, 0.35]] as [string, number, number, number, number][]) {
            const n = uiNode('Yawn', parent);
            n.setPosition(p.x + dx, p.y + e.targetHeight + dy, 0);
            uiLabel(n, txt, size, BARK, { outline: ALERT_LINE, outlineWidth: 6 });
            const op = n.addComponent(UIOpacity);
            op.opacity = 0;
            tween(op).delay(delay).to(0.2, { opacity: 255 }).delay(this.yawnTime * 0.5).to(0.3, { opacity: 0 }).call(() => n.destroy()).start();
            tween(n).delay(delay).by(this.yawnTime + 0.3, { position: new Vec3(20, 60, 0) }).start();
        }
    }

    /** Quay lại: khúc xương rơi xuống, boss quay về phía mèo, nảy người; dấu ! tắt dần. */
    private turn() {
        const e = this.boss!;
        this.chewing = false;
        this.clearAlert();
        this.dropBone();
        const cat = GameManager.instance?.cats[0];
        if (cat) e.face(cat.node.position.x);
        e.hop(260);
        e.windup();
    }

    private bark() {
        const e = this.boss!;
        const parent = e.node.parent;
        if (this.barkSound && Sound.has(this.barkSound)) Sound.play(this.barkSound, 1);
        else {
            Sound.play('land', 1);
            Sound.play('hit', 0.7);
        }
        CameraRig.instance?.shake(16, 0.45);
        e.windup();
        if (!parent) return;
        const p = e.node.position;
        const mouthX = p.x + e.facingDir * e.targetHeight * 0.3;
        const mouthY = p.y + e.targetHeight * 0.55;
        SkillFx.ring(parent, mouthX, mouthY, 260, BARK_RING, 0.45, 0);
        // Chữ GÂU!! bật ra trên đầu boss
        const n = uiNode('Bark', parent);
        n.setPosition(mouthX + e.facingDir * 60, p.y + e.targetHeight + 40, 0);
        const label = uiLabel(n, T('boss.bark'), 96, BARK, { outline: NAME_LINE, outlineWidth: 8 });
        label.node.angle = e.facingDir > 0 ? -8 : 8;
        n.setScale(0.3, 0.3, 1);
        const op = n.addComponent(UIOpacity);
        tween(n).to(0.18, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'backOut' }).to(0.1, { scale: Vec3.ONE })
            .delay(0.5).by(0.4, { position: new Vec3(0, 50, 0) }).start();
        tween(op).delay(0.8).to(0.4, { opacity: 0 }).call(() => n.destroy()).start();
    }

    /** Dải tên boss trượt vào từ bên trái màn hình, giữ một lúc rồi trượt ra bên phải. */
    private showName() {
        const canvas = GameManager.instance?.node;
        if (!canvas) return;
        this.banner?.destroy();
        const root = uiNode('BossName', canvas, 1920, 220);
        this.banner = root;
        root.setPosition(-1900, 120, 0);
        const g = root.addComponent(Graphics);
        g.fillColor = BANNER;
        g.moveTo(-900, -80);
        g.lineTo(980, -80);
        g.lineTo(900, 80);
        g.lineTo(-980, 80);
        g.close();
        g.fill();
        const name = uiLabel(root, '', 92, NAME, { outline: NAME_LINE, outlineWidth: 8 });
        Lang.bind(name, 'boss.name');
        name.node.setPosition(0, 12, 0);
        const chapter = uiLabel(root, '', 36, NAME);
        Lang.bind(chapter, 'boss.chapter');
        chapter.node.setPosition(0, -52, 0);
        tween(root)
            .to(0.5, { position: new Vec3(0, 120, 0) }, { easing: 'quartOut' })
            .delay(1.2)
            .to(0.4, { position: new Vec3(1900, 120, 0) }, { easing: 'quartIn' })
            .call(() => {
                root.destroy();
                if (this.banner === root) this.banner = null;
            })
            .start();
    }

    private startFight() {
        const e = this.boss!;
        this.state = 'fight';
        e.paused = false;
        e.invulnerable = false;
        GameManager.instance?.followCats();
        GameManager.instance?.lockCats(false);
        Sound.applySettings();
        if (this.bossMusic) Sound.music(this.bossMusic);
        this.onFight?.();
    }

    // ---------- Hạ boss ----------

    private defeated() {
        this.state = 'done';
        Achievements.unlock('boss');
        this.unscheduleAllCallbacks();
        // Slow motion chậm dần (giờ thật): xuống 15% trong 0.3s, giữ 1.2s, nhanh dần về bình thường trong 1s.
        // Kèm camera phóng nhẹ rồi trả lại (cũng chậm theo); không chớp màn hình
        TimeScale.slowMotion(this.slowLow, 0.3, this.slowHold, 1);
        const rig = CameraRig.instance;
        if (rig) {
            const z = rig.zoom;
            tween(rig).to(0.25, { zoom: z * 1.08 }).delay(0.3).to(0.5, { zoom: z }).start();
        }
        // Node boss tự xoá sau hiệu ứng chết, nên mở dấu X ngay và hẹn giờ trên GameManager (không bị xoá)
        this.hideWalls();
        this.unlockCamera();
        const gm = GameManager.instance;
        const music = gm?.music ?? ''; // vào hang đã tắt nhạc thường: hạ boss thì bật lại
        // Chữ ĐÃ HẠ BOSS! hiện sau 0.5 giây giờ thật (đang slow motion: hẹn giờ trong game sẽ bị kéo dài)
        setTimeout(() => {
            if (!gm || !gm.isValid) return;
            BossArena.showDefeated();
            if (music) Sound.music(music);
        }, 500);
    }

    private static showDefeated() {
        const canvas = GameManager.instance?.node;
        if (!canvas) return;
        const n = uiNode('BossDefeated', canvas);
        n.setPosition(0, 160, 0);
        uiLabel(n, T('boss.defeated'), 110, NAME, { outline: NAME_LINE, outlineWidth: 10 });
        n.setScale(0.4, 0.4, 1);
        const op = n.addComponent(UIOpacity);
        tween(n).to(0.3, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' }).to(0.15, { scale: Vec3.ONE }).start();
        tween(op).delay(2.2).to(0.5, { opacity: 0 }).call(() => n.destroy()).start();
        Sound.play('win', 0.8);
    }

    // ---------- Gục, đánh lại ----------

    /** Mèo gục hết, về checkpoint (BossBrain gọi trong lúc màn tối). */
    retry() {
        if (this.state === 'done') return;
        this.unscheduleAllCallbacks();
        this.hideWalls(true);
        this.unlockCamera();
        this.banner?.destroy();
        this.banner = null;
        BossHealthBar.instance?.conceal();
        GameManager.instance?.lockCats(false);
        Sound.applySettings();
        const gm = GameManager.instance;
        if (gm?.music) Sound.music(gm.music); // về checkpoint: bật lại nhạc thường
        this.toIdle();
    }

    private toIdle() {
        const e = this.boss;
        if (!e) return;
        this.state = 'idle';
        e.paused = true;
        e.invulnerable = true;
        e.face(e.node.position.x + 1); // quay mặt sang phải, quay lưng với mèo đi tới
        this.chewing = true;
        if (this.alertMark?.isValid) this.alertMark.destroy();
        this.alertMark = null;
        this.makeBone();
    }

    // ---------- Khúc xương ----------

    private makeBone() {
        const e = this.boss!;
        if (this.bone?.isValid) this.bone.destroy();
        const n = uiNode('Bone', e.node, 120, 40);
        n.setPosition(e.targetHeight * 0.32, e.targetHeight * 0.42, 0);
        n.angle = -8;
        const g = n.addComponent(Graphics);
        g.fillColor = BONE;
        g.strokeColor = BONE_LINE;
        g.lineWidth = 4;
        g.roundRect(-40, -9, 80, 18, 9);
        for (const x of [-44, 44]) for (const y of [-11, 11]) g.circle(x, y, 14);
        g.fill();
        g.stroke();
        this.bone = n;
    }

    private dropBone() {
        const b = this.bone;
        this.bone = null;
        if (!b || !b.isValid) return;
        const op = b.addComponent(UIOpacity);
        tween(b).by(0.5, { position: new Vec3(40, -this.boss!.targetHeight * 0.4, 0), angle: -160 }, { easing: 'quadIn' }).start();
        tween(op).delay(0.6).to(0.3, { opacity: 0 }).call(() => b.destroy()).start();
    }

    // ---------- Dấu X chặn đường ----------

    private showWalls() {
        const parent = this.boss?.node.parent;
        if (!parent) return;
        this.hideWalls(true);
        // Dấu X đứng trên mặt đá của khu boss, ở hai đầu lối đi (không đặt ngoài mép khối đá: bên ngoài có thể là bậc cao / vực)
        for (const x of [this.left - this.wallInset, this.right + this.wallInset]) {
            const n = uiNode('BossWall', parent, 160, 1400);
            n.setPosition(x, this.groundY, 0);
            const solid = n.addComponent(Solid);
            solid.size = new Size(80, 1400);
            solid.offset.set(0, 700);
            // Dấu X đỏ to, mờ, cao ngang người boss
            const g = n.addComponent(Graphics);
            const h = 300, w = 120, y0 = 60, t = 34;
            g.strokeColor = WALL_RED;
            g.lineWidth = t;
            g.lineCap = Graphics.LineCap.ROUND;
            g.moveTo(-w / 2, y0);
            g.lineTo(w / 2, y0 + h);
            g.moveTo(w / 2, y0);
            g.lineTo(-w / 2, y0 + h);
            g.stroke();
            // Vệt sáng mờ dọc theo cột chặn
            g.fillColor = new Color(235, 50, 50, 50);
            g.rect(-18, 0, 36, 1400);
            g.fill();
            const op = n.addComponent(UIOpacity);
            op.opacity = 0;
            tween(op).to(0.4, { opacity: 170 }).call(() => {
                // Nhấp nháy nhẹ mãi tới khi mở
                tween(op).repeatForever(tween(op).to(0.7, { opacity: 110 }).to(0.7, { opacity: 170 })).start();
            }).start();
            this.walls.push(n);
        }
    }

    private hideWalls(instant = false) {
        for (const n of this.walls) {
            if (!n.isValid) continue;
            const solid = n.getComponent(Solid);
            if (solid) solid.enabled = false;
            const op = n.getComponent(UIOpacity);
            if (instant || !op) {
                n.destroy();
                continue;
            }
            Tween.stopAllByTarget(op);
            tween(op).to(0.4, { opacity: 0 }).call(() => n.destroy()).start();
        }
        this.walls = [];
    }

    // ---------- Camera ----------

    private lockCamera() {
        const rig = CameraRig.instance;
        if (!rig || this.camLocked) return;
        this.camLocked = true;
        this.camMin = rig.minX;
        this.camMax = rig.maxX;
        rig.minX = Math.max(this.camMin, this.left - 200);
        rig.maxX = Math.min(this.camMax, this.right + 200);
    }

    private unlockCamera() {
        const rig = CameraRig.instance;
        if (!rig || !this.camLocked) return;
        this.camLocked = false;
        rig.minX = this.camMin;
        rig.maxX = this.camMax;
    }
}
