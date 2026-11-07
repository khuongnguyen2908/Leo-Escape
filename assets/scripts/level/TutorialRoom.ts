import { _decorator, AudioClip, Color, Component, director, Graphics, Node, resources } from 'cc';
import { EDITOR } from 'cc/env';
import { CameraRig } from '../camera/CameraRig';
import { Sound } from '../core/Sound';
import { GameManager } from '../game/GameManager';
import { GameSession } from '../game/GameSession';
import { Achievements } from '../game/Achievements';
import { DialogueBox } from '../ui/DialogueBox';
import { IrisWipe } from '../ui/IrisWipe';
import { TutorialExit } from './TutorialExit';
const { ccclass, property, executeInEditMode } = _decorator;

const PAPER = new Color(240, 232, 214, 255);
const GRID = new Color(150, 120, 100, 28);
const INK = new Color(70, 52, 48, 255);
const HATCH = new Color(120, 96, 86, 70);
/** Lớp tiền cảnh của màn chơi: giấu khi ở màn hướng dẫn (đè lên tờ giấy) */
const FRONT_LAYERS = ['FR', 'FR_Top'];

/**
 * Màn hướng dẫn: một khu riêng bên trái đầu màn chơi, vẽ như tờ giấy kem có lưới mờ và nét bút nâu
 * (biển TutorialSign, khối TutorialBlock, hình nộm TrainingDummy, cá, cửa TutorialExit đều là con trực tiếp của Gameplay,
 * nằm trong khoảng x từ node này tới node + Width). Gốc node = góc trái mặt sàn. Con "Start" = chỗ mèo xuất hiện.
 * Ô lưu mới: sau 3 trang truyện thì vào đây (LandingScreen gọi enter); ra cửa EXIT thì màn đen, sang đầu màn chơi,
 * hội thoại mở đầu rồi mới bật nhạc rừng. Cá ăn và thời gian chơi trong màn hướng dẫn không tính.
 */
@ccclass('TutorialRoom')
@executeInEditMode
export class TutorialRoom extends Component {
    static instance: TutorialRoom | null = null;

    @property({ tooltip: 'Bề ngang khu hướng dẫn (tính từ node sang phải)' })
    get width() { return this._width; }
    set width(v: number) { this._width = v; this.draw(); }

    @property({ tooltip: 'Tờ giấy cao bao nhiêu (tính từ mặt sàn lên)' })
    get height() { return this._height; }
    set height(v: number) { this._height = v; this.draw(); }

    @property({ tooltip: 'Nhạc riêng của màn hướng dẫn (tên file trong assets/resources/sounds). Chưa có file thì giữ nhạc menu' })
    music = 'bgm_tutorial';

    @property
    _width = 6400;

    @property
    _height = 1500;

    private saved: { minX: number; maxX: number; stats: ReturnType<GameManager['snapshotStats']> } | null = null;
    private adjusted = false;
    private inside = false;

    /** Đang ở trong màn hướng dẫn. */
    get active() { return this.inside; }

    onLoad() {
        this.draw();
        if (!EDITOR) {
            TutorialRoom.instance = this;
            GameSession.tutorial = this;
        }
    }

    onDestroy() {
        if (TutorialRoom.instance === this) TutorialRoom.instance = null;
        if (GameSession.tutorial === this) GameSession.tutorial = null;
    }

    start() {
        if (EDITOR) return;
        for (const e of this.node.parent?.getComponentsInChildren(TutorialExit) ?? []) {
            if (this.contains(e.node.position.x)) e.onExit = () => this.exit();
        }
    }

    update() {
        if (EDITOR || this.adjusted) return;
        // Khung đầu (sau khi GameManager đã đếm cá): cá trong màn hướng dẫn không tính vào tổng cá của màn
        const gm = GameManager.instance;
        const parent = this.node.parent;
        if (!gm || !parent) return;
        this.adjusted = true;
        gm.fishTotal = parent.getComponentsInChildren('CoinPickup').filter((c) => !this.contains(c.node.position.x)).length;
    }

    contains(x: number): boolean {
        const x0 = this.node.position.x;
        return x >= x0 && x <= x0 + this._width;
    }

    /** Đưa mèo vào màn hướng dẫn (đang màn đen): đứng ở Start, camera chỉ chạy trong khu này, giấu tiền cảnh. */
    enter() {
        const gm = GameManager.instance;
        const rig = CameraRig.instance;
        if (!gm) return;
        this.inside = true;
        // Nhạc riêng (có file mới đổi, không thì nhạc menu chạy tiếp)
        if (this.music && resources.getInfoWithPath(`sounds/${this.music}`, AudioClip)) Sound.music(this.music);
        this.saved = { minX: rig?.minX ?? 0, maxX: rig?.maxX ?? 0, stats: gm.snapshotStats() };
        const p = this.node.position;
        const start = this.node.getChildByName('Start');
        const sx = p.x + (start ? start.position.x : 250);
        const sy = p.y + (start ? start.position.y : 0) + 10;
        gm.cats.forEach((c, i) => {
            c.node.setPosition(sx - i * 120, sy, 0);
            c.body.velocity.set(0, 0);
        });
        gm.setRespawn(this.node.position.clone().add3f(sx - p.x, 0, 0));
        if (rig) {
            rig.minX = p.x;
            rig.maxX = p.x + this._width;
            rig.snapNext();
        }
        this.setFrontLayers(false);
    }

    /** Ra cửa EXIT: màn đen, sang đầu màn chơi, trả số liệu, zoom ra từ chỗ Leo, hội thoại mở đầu, rồi nhạc rừng. */
    exit() {
        const gm = GameManager.instance;
        if (!gm || !this.inside) return;
        this.inside = false;
        Achievements.unlock('tutorial');
        gm.lockCats(true);
        Sound.play('ui_door', 0.9);
        IrisWipe.close(0.6, () => {
            const rig = CameraRig.instance;
            gm.cats.forEach((c, i) => {
                c.node.setPosition(gm.startPoint.x - i * 120, gm.startPoint.y + 10, 0);
                c.body.velocity.set(0, 0);
            });
            gm.setRespawn(gm.startPoint);
            if (this.saved) {
                if (rig) {
                    rig.minX = this.saved.minX;
                    rig.maxX = this.saved.maxX;
                }
                gm.restoreStats(this.saved.stats);
            }
            rig?.snapNext();
            this.setFrontLayers(true);
            // Chờ camera nhảy tới chỗ Leo rồi mới zoom ra
            setTimeout(() => {
                const [cx, cy] = IrisWipe.centerOf(gm.player?.node);
                IrisWipe.open(0.8, () => {
                    Sound.stopMusic();
                    const canvas = director.getScene()?.getChildByName('Canvas');
                    const done = () => {
                        gm.lockCats(false);
                        gm.startMusic();
                    };
                    if (!canvas) {
                        done();
                        return;
                    }
                    DialogueBox.show(canvas, gm.player?.visual?.idleFrame ?? null, 'dialog.name', ['dialog.1', 'dialog.2', 'dialog.3'], done);
                }, cx, cy);
            }, 120);
        });
    }

    private setFrontLayers(on: boolean) {
        const canvas = director.getScene()?.getChildByName('Canvas');
        for (const name of FRONT_LAYERS) {
            const n = canvas?.getChildByName(name);
            if (n) n.active = on;
        }
    }

    /** Tờ giấy kem: lưới mờ, viền bút chì, mặt sàn nét đậm có gạch bóng bên dưới. */
    private draw() {
        if (!this.node || !this.node.isValid) return;
        const g = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        g.clear();
        const w = this._width, h = this._height, below = 700;
        g.fillColor = PAPER;
        g.rect(-200, -below, w + 400, h + below);
        g.fill();
        g.strokeColor = GRID;
        g.lineWidth = 2;
        for (let x = 0; x <= w; x += 80) {
            g.moveTo(x, 0);
            g.lineTo(x, h);
        }
        for (let y = 80; y <= h; y += 80) {
            g.moveTo(0, y);
            g.lineTo(w, y);
        }
        g.stroke();
        // Gạch bóng dưới sàn
        g.strokeColor = HATCH;
        g.lineWidth = 3;
        for (let x = -200; x < w + 200; x += 26) {
            g.moveTo(x, -10);
            g.lineTo(x - 60, -90);
        }
        g.stroke();
        // Mặt sàn
        g.strokeColor = INK;
        g.lineWidth = 7;
        g.moveTo(-200, 0);
        g.lineTo(w + 200, 0);
        g.stroke();
    }
}
