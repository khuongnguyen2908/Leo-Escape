import { _decorator, Component } from 'cc';
import { Sound } from '../core/Sound';
import { DustPuff } from './DustPuff';
import { PlayerController } from './PlayerController';
const { ccclass } = _decorator;

/** Bọt độc quanh mèo (folder art/fx/Boss/Poison) */
export const POISON_FX = 'Boss/Poison/frame';

/**
 * Trúng độc (axit của boss): bọt độc bay quanh mèo, cứ 1 giây rút nửa tim, kéo dài Duration giây.
 * Dính axit lại khi đang độc thì tính lại từ đầu (không chồng thêm). GameManager gắn vào mỗi con mèo khi chơi
 * và đặt onTick để trừ máu (tránh import vòng).
 */
@ccclass('PoisonStatus')
export class PoisonStatus extends Component {
    /** Độc kéo dài bao lâu (giây) */
    duration = 2;
    /** Bao lâu rút một lần */
    tickEvery = 1;
    /** Mỗi lần rút bao nhiêu tim */
    tickDamage = 0.5;
    /** GameManager đặt: trừ máu mèo */
    onTick: ((amount: number) => void) | null = null;

    private time = 0;
    private tick = 0;
    private puff: DustPuff | null = null;
    private cat: PlayerController | null = null;

    get poisoned() { return this.time > 0; }

    onLoad() {
        this.cat = this.getComponent(PlayerController);
        DustPuff.preload(POISON_FX);
    }

    /** Dính axit: bắt đầu (hoặc tính lại) độc. */
    apply() {
        if (this.time <= 0) {
            this.tick = this.tickEvery;
            this.cat?.visual?.playHurt();
            Sound.play('hurt', 0.7);
        }
        // Chừa chút để lần rút cuối (đúng lúc hết giờ) không bị lỡ vì sai số khung hình
        this.time = this.duration + 0.05;
        if (!this.puff || !this.puff.isValid) {
            const h = this.cat?.body.size.height ?? 130;
            this.puff = DustPuff.spawn(POISON_FX, this.node, 0, h * 0.55, { scale: 2.2, fps: 14, center: true, loopFor: 999 });
        }
    }

    /** Thôi độc ngay (mèo gục, thua, thắng). */
    clear() {
        this.time = 0;
        if (this.puff && this.puff.isValid) this.puff.node.destroy();
        this.puff = null;
    }

    update(dt: number) {
        if (this.time <= 0) return;
        if (this.cat?.downed) {
            this.clear();
            return;
        }
        this.time -= dt;
        this.tick -= dt;
        if (this.tick <= 0) {
            this.tick += this.tickEvery;
            this.cat?.visual?.playHurt();
            Sound.play('hurt', 0.45);
            this.onTick?.(this.tickDamage);
        }
        if (this.time <= 0) this.clear();
    }
}
