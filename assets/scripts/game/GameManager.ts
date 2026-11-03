import { _decorator, Component, director, Node, Rect, Size, Vec2, Vec3 } from 'cc';
import { computeBox, overlaps } from '../core/Box';
import { Sound } from '../core/Sound';
import { PlayerController } from '../player/PlayerController';
import { PlayerInput } from '../player/PlayerInput';
import { CoinCounter } from '../ui/CoinCounter';
import { HeartsHUD } from '../ui/HeartsHUD';
const { ccclass, property } = _decorator;

const _player = new Rect();
const _other = new Rect();

/** Quản lý máu, hồi sinh, thắng/thua. Gắn lên Canvas, chỉ có một trong scene. */
@ccclass('GameManager')
export class GameManager extends Component {
    static instance: GameManager | null = null;

    @property({ type: PlayerController })
    player: PlayerController | null = null;

    @property({ type: HeartsHUD })
    hud: HeartsHUD | null = null;

    @property({ type: CoinCounter })
    coinCounter: CoinCounter | null = null;

    @property
    maxHp = 3;

    @property({ tooltip: 'Rơi thấp hơn độ cao này (toạ độ lớp Gameplay) là rơi xuống vực' })
    killY = -600;

    @property({ group: 'Âm thanh', tooltip: 'Tên file nhạc nền trong assets/resources/sounds (để trống = không có nhạc)' })
    music = 'bgm';

    @property({ group: 'Âm thanh', tooltip: 'Âm lượng nhạc nền 0..1', range: [0, 1, 0.05], slide: true })
    musicVolume = 0.35;

    @property({ group: 'Âm thanh', tooltip: 'Âm lượng tiếng hiệu ứng 0..1', range: [0, 1, 0.05], slide: true })
    sfxVolume = 0.8;

    hp = 3;
    coins = 0;
    readonly respawnPoint = new Vec3();
    private finished = false;

    onLoad() {
        GameManager.instance = this;
        PlayerInput.reset();
    }

    start() {
        Sound.sfxVolume = this.sfxVolume;
        Sound.musicVolume = this.musicVolume;
        Sound.preload();
        if (this.music) Sound.music(this.music);
        this.hp = this.maxHp;
        if (this.player) this.respawnPoint.set(this.player.node.position);
        this.hud?.setHp(this.hp, this.maxHp);
    }

    onDestroy() {
        if (GameManager.instance === this) GameManager.instance = null;
    }

    update() {
        const p = this.player;
        if (!p || this.finished) return;
        if (p.node.position.y < this.killY) {
            this.damage(1);
            if (this.hp > 0) p.respawn(this.respawnPoint);
        }
    }

    hurtPlayer(fromX: number) {
        if (!this.finished && this.player?.hurt(fromX)) this.damage(1);
    }

    damage(amount: number) {
        this.hp = Math.max(0, this.hp - amount);
        this.hud?.setHp(this.hp, this.maxHp);
        if (this.hp <= 0) {
            Sound.play('lose');
            this.end('Try again!', 2);
        }
    }

    heal(amount: number) {
        Sound.play('heal');
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.hud?.setHp(this.hp, this.maxHp);
    }

    addCoins(amount: number) {
        Sound.play('coin', 0.7);
        this.coins += amount;
        this.coinCounter?.setValue(this.coins);
    }

    setRespawn(pos: Readonly<Vec3>) {
        this.respawnPoint.set(pos);
    }

    win() {
        Sound.play('win');
        this.end('You made it!', 3);
    }

    /** Hộp (size, offset) của node có chạm mèo không. Node phải nằm trong lớp Gameplay. */
    playerOverlaps(node: Node, size: Size, offset: Vec2): boolean {
        if (!this.player || this.finished) return false;
        return overlaps(this.player.body.getRect(_player), computeBox(node, size, offset, _other));
    }

    private end(message: string, restartDelay: number) {
        if (this.finished) return;
        this.finished = true;
        if (this.player) this.player.controlEnabled = false;
        this.hud?.showMessage(message);
        this.scheduleOnce(() => {
            const scene = director.getScene();
            if (scene) director.loadScene(scene.name);
        }, restartDelay);
    }
}
