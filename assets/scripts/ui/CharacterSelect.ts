import { _decorator, Color, Component, Graphics, Label, Node, Sprite, SpriteFrame, tween, Tween, UITransform, Vec3 } from 'cc';
import { keyName, Settings } from '../core/Settings';
import { Sound } from '../core/Sound';
import { PlayerInput } from '../player/PlayerInput';
import { Lang } from './Lang';
import { setText, UI, uiLabel, uiNode } from './UiKit';
const { ccclass } = _decorator;

const LANE_X = [-330, 0, 330];      // dưới Leo · giữa (chưa chọn) · dưới Angelo
const CARD_Y = 90;
const SLOT_Y = -205;
const TOKEN_Y = -360;
const _v = new Vec3();

interface Seat {
    lane: number;       // 0 = dưới Leo, 1 = giữa, 2 = dưới Angelo
    locked: boolean;
    token: Node;
    wasLeft: boolean;
    wasRight: boolean;
}

/**
 * Màn chọn mèo khi chơi 2 người (học theo các game co-op: ai bấm phím của mình thì thẻ của người đó di chuyển).
 * Hai ô lớn: Leo bên trái, Angelo bên phải. Thẻ N1, N2 nằm giữa phía dưới.
 * Trái/phải để đưa thẻ tới dưới con mèo muốn chọn, Nhảy để chốt (thẻ bật lên ô), Xuống để bỏ chọn.
 * Mèo đã có người chọn thì người kia không vào được. Cả hai chốt xong thì đếm 3-2-1 rồi gọi onDone.
 * LandingScreen tự tạo component này khi bấm "2 NGƯỜI"; không cần đặt trong scene.
 */
@ccclass('CharacterSelect')
export class CharacterSelect extends Component {
    onDone: ((leoPlayer: number, angeloPlayer: number) => void) | null = null;

    private seats: Seat[] = [];
    private cards: Graphics[] = [];
    private countdown: Label | null = null;
    private count = -1;
    private countTimer = 0;
    private finished = false;

    /** Dựng màn chọn. leoFrame: hình Leo; angeloTint/angeloWidth: hình tạm của Angelo (hình Leo nhuộm, bóp gầy). */
    setup(leoFrame: SpriteFrame | null, angeloFrame: SpriteFrame | null, angeloTint: Color, angeloWidth: number) {
        const title = uiLabel(this.node, '', 72, UI.cream, { outline: UI.brown, outlineWidth: 8 });
        Lang.bind(title, 'pick.title');
        title.node.setPosition(0, 430, 0);

        this.cards.push(this.makeCard(LANE_X[0], 'LEO', leoFrame, Color.WHITE, 1));
        this.cards.push(this.makeCard(LANE_X[2], 'ANGELO', angeloFrame ?? leoFrame, angeloTint, angeloWidth));
        for (const x of [LANE_X[0], LANE_X[2]]) {
            const slot = uiNode('Slot', this.node);
            slot.setPosition(x, SLOT_Y, 0);
            const g = slot.addComponent(Graphics);
            g.strokeColor = UI.cream;
            g.lineWidth = 5;
            g.circle(0, 0, 62);
            g.stroke();
        }

        this.seats = [0, 1].map((p) => ({ lane: 1, locked: false, token: this.makeToken(p), wasLeft: false, wasRight: false }));
        this.place(0, false);
        this.place(1, false);

        const hint = uiLabel(this.node, '', 30, UI.cream,
            { outline: UI.brown, outlineWidth: 4 });
        Lang.bind(hint, 'pick.hint');
        hint.node.setPosition(0, -490, 0);

        this.countdown = uiLabel(this.node, '', 160, UI.cream, { outline: UI.green, outlineWidth: 10 });
        this.countdown.node.setPosition(0, CARD_Y, 0);
        PlayerInput.clearQueues();
    }

    update(dt: number) {
        if (this.finished) return;
        for (let p = 0; p < 2; p++) this.readSeat(p);

        const both = this.seats.every((s) => s.locked);
        if (both && this.count < 0) {
            this.count = 3;
            this.countTimer = 0.7;
            this.showCount();
        } else if (!both && this.count >= 0) {
            this.count = -1;
            if (this.countdown) this.countdown.string = '';
        }
        if (this.count >= 0) {
            this.countTimer -= dt;
            if (this.countTimer <= 0) {
                this.count--;
                this.countTimer = 0.7;
                if (this.count <= 0) this.finish();
                else this.showCount();
            }
        }
    }

    private readSeat(p: number) {
        const s = this.seats[p];
        const c = PlayerInput.player(p);
        const left = c.left, right = c.right;
        const pressLeft = left && !s.wasLeft, pressRight = right && !s.wasRight;
        s.wasLeft = left;
        s.wasRight = right;
        const confirm = c.consumeJump() || c.consumeAttack();
        const cancel = c.consumeDown();

        if (s.locked) {
            if (cancel) {
                s.locked = false;
                this.place(p, true);
                Sound.play('drop', 0.6);
            }
            return;
        }
        if (pressLeft || pressRight) {
            const lane = Math.max(0, Math.min(2, s.lane + (pressLeft ? -1 : 1)));
            if (lane !== s.lane) {
                s.lane = lane;
                this.place(p, true);
                Sound.play('land', 0.4);
            }
        }
        if (confirm && s.lane !== 1) {
            const other = this.seats[1 - p];
            if (other.locked && other.lane === s.lane) {
                this.shake(s.token);
                Sound.play('hurt', 0.4);
            } else {
                s.locked = true;
                this.place(p, true);
                Sound.play('jump', 0.6);
            }
        }
    }

    /** Đưa thẻ người chơi p về đúng chỗ: dưới con mèo (hoặc giữa), hoặc trên ô đã chốt. */
    private place(p: number, animate: boolean) {
        const s = this.seats[p];
        const sameLane = this.seats[1 - p]?.lane === s.lane && !s.locked && !this.seats[1 - p].locked;
        const x = LANE_X[s.lane] + (sameLane ? (p === 0 ? -70 : 70) : 0);
        const y = s.locked ? SLOT_Y : TOKEN_Y;
        Tween.stopAllByTarget(s.token);
        if (!animate) {
            s.token.setPosition(x, y, 0);
        } else if (s.locked) {
            // Bật lên ô như nhảy
            tween(s.token).to(0.12, { position: _v.set(x, y + 60, 0).clone() }, { easing: 'quadOut' })
                .to(0.1, { position: _v.set(x, y, 0).clone() }, { easing: 'quadIn' }).start();
        } else {
            tween(s.token).to(0.12, { position: _v.set(x, y, 0).clone() }, { easing: 'quadOut' }).start();
        }
        // Người kia đang đứng chung làn thì dời ra cho khỏi đè nhau
        const o = this.seats[1 - p];
        if (o && !o.locked && o !== s) {
            const ox = LANE_X[o.lane] + (o.lane === s.lane && !s.locked ? (p === 0 ? 70 : -70) : 0);
            Tween.stopAllByTarget(o.token);
            tween(o.token).to(0.12, { position: _v.set(ox, TOKEN_Y, 0).clone() }).start();
        }
        this.paintCards();
    }

    private paintCards() {
        this.cards.forEach((g, i) => {
            const lane = i === 0 ? 0 : 2;
            const owner = this.seats.findIndex((s) => s.locked && s.lane === lane);
            const w = 400, h = 470;
            g.clear();
            g.fillColor = owner >= 0 ? UI.cream : UI.creamDim;
            g.strokeColor = owner === 0 ? UI.p1 : owner === 1 ? UI.p2 : UI.brown;
            g.lineWidth = owner >= 0 ? 14 : 8;
            g.roundRect(-w / 2, -h / 2, w, h, 40);
            g.fill();
            g.stroke();
        });
    }

    private makeCard(x: number, name: string, frame: SpriteFrame | null, tint: Color, widthScale: number): Graphics {
        const card = uiNode(`Card_${name}`, this.node, 400, 470);
        card.setPosition(x, CARD_Y, 0);
        const g = card.addComponent(Graphics);
        if (frame) {
            const pic = uiNode('Pic', card);
            const sp = pic.addComponent(Sprite);
            sp.spriteFrame = frame;
            sp.color = tint;
            const s = 320 / frame.rect.height;
            pic.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
            pic.setPosition(0, -150, 0);
            pic.setScale(s * widthScale, s, 1);
        }
        const label = uiLabel(card, name, 56, UI.cream, { outline: UI.brown, outlineWidth: 7 });
        label.node.setPosition(0, -195, 0);
        return g;
    }

    private makeToken(p: number): Node {
        const n = uiNode(`Token_P${p + 1}`, this.node, 120, 120);
        const g = n.addComponent(Graphics);
        g.fillColor = p === 0 ? UI.p1 : UI.p2;
        g.strokeColor = UI.cream;
        g.lineWidth = 6;
        g.circle(0, 0, 52);
        g.fill();
        g.stroke();
        uiLabel(n, `N${p + 1}`, 44, Color.WHITE, { outline: UI.brown, outlineWidth: 5 });
        const keys = `${keyName(Settings.key(p, 'left'))} ${keyName(Settings.key(p, 'right'))} · ${keyName(Settings.key(p, 'jump'))}`;
        const hint = uiLabel(n, keys, 24, UI.cream, { outline: UI.brown, outlineWidth: 4, name: 'Keys' });
        setText(hint, keys, false);
        hint.node.setPosition(0, -82, 0);
        return n;
    }

    private shake(n: Node) {
        const p = n.position.clone();
        Tween.stopAllByTarget(n);
        tween(n)
            .to(0.05, { position: new Vec3(p.x - 14, p.y, 0) })
            .to(0.05, { position: new Vec3(p.x + 14, p.y, 0) })
            .to(0.05, { position: new Vec3(p.x - 8, p.y, 0) })
            .to(0.05, { position: p })
            .start();
    }

    private showCount() {
        if (!this.countdown) return;
        this.countdown.string = String(this.count);
        const n = this.countdown.node;
        n.setScale(1.6, 1.6, 1);
        tween(n).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        Sound.play('checkpoint', 0.6);
    }

    private finish() {
        this.finished = true;
        if (this.countdown) this.countdown.string = '';
        const leo = this.seats.findIndex((s) => s.lane === 0);
        const angelo = this.seats.findIndex((s) => s.lane === 2);
        this.onDone?.(leo < 0 ? 0 : leo, angelo < 0 ? 1 : angelo);
    }
}
