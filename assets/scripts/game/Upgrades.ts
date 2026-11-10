/**
 * Cây kỹ năng mua ở cửa hàng (ShopNPC → ShopPage): mỗi ô tốn cá bự (nguyên liệu) + cá vàng (tiền).
 * Không phải component; GameManager giữ danh sách đã mua (lưu trong ô lưu) và ghi vào Unlocks để các file khác đọc
 * (PlayerController, LeoSkills, biển hướng dẫn) mà khỏi import GameManager.
 *  - Hàng Kiếm:  Sóng kiếm → Sóng kiếm xuyên
 *  - Hàng Thân:  +1 tim → +1 tim → Nộ đầy nhanh
 *  - Hàng Chiêu: Đập bụng → Mèo Nổ
 * Ô sau chỉ mua được khi đã có ô trước cùng hàng. Đổi giá: sửa bigFish / gold ở đây.
 */
export type UpgradeId = 'wave' | 'wavePierce' | 'heart1' | 'heart2' | 'rage' | 'pound' | 'burst';

export interface Upgrade {
    id: UpgradeId;
    /** Hàng: 0 Kiếm, 1 Thân, 2 Chiêu */
    row: number;
    /** Cột trong hàng (0 = ô đầu) */
    col: number;
    /** Số cá bự cần */
    bigFish: number;
    /** Số cá vàng cần */
    gold: number;
    /** Phải mua ô này trước (null = mua ngay được) */
    needs: UpgradeId | null;
}

export const UPGRADES: readonly Upgrade[] = [
    { id: 'wave', row: 0, col: 0, bigFish: 1, gold: 1000, needs: null },
    { id: 'wavePierce', row: 0, col: 1, bigFish: 2, gold: 3000, needs: 'wave' },
    { id: 'heart1', row: 1, col: 0, bigFish: 1, gold: 800, needs: null },
    { id: 'heart2', row: 1, col: 1, bigFish: 1, gold: 1500, needs: 'heart1' },
    { id: 'rage', row: 1, col: 2, bigFish: 1, gold: 1000, needs: 'heart2' },
    { id: 'pound', row: 2, col: 0, bigFish: 1, gold: 1200, needs: null },
    { id: 'burst', row: 2, col: 1, bigFish: 2, gold: 3000, needs: 'pound' },
];

/** Ô "Nộ đầy nhanh": nộ cộng thêm 40% mỗi lần đánh trúng */
export const RAGE_BOOST = 1.4;

/** Trạng thái một ô trong cửa hàng */
export type UpgradeState = 'owned' | 'locked' | 'short' | 'ready';

/** Những ô đã mua của lượt chơi hiện tại. GameManager ghi, nơi khác chỉ đọc. */
export const Unlocks = {
    owned: new Set<string>(),
    /** Gọi khi danh sách đã mua đổi (mua thêm, vào ô lưu khác) */
    listeners: [] as (() => void)[],

    has(id: UpgradeId): boolean {
        return this.owned.has(id);
    },

    set(list: readonly string[]) {
        this.owned = new Set(list);
        for (const f of this.listeners.slice()) f();
    },

    onChange(f: () => void) { this.listeners.push(f); },
    offChange(f: () => void) {
        const i = this.listeners.indexOf(f);
        if (i >= 0) this.listeners.splice(i, 1);
    },
};

export function upgradeById(id: string): Upgrade | undefined {
    return UPGRADES.find((u) => u.id === id);
}

/** Ô này đang thế nào với số cá bự / cá vàng đang có. */
export function upgradeState(u: Upgrade, bigFish: number, gold: number): UpgradeState {
    if (Unlocks.has(u.id)) return 'owned';
    if (u.needs && !Unlocks.has(u.needs)) return 'locked';
    if (bigFish < u.bigFish || gold < u.gold) return 'short';
    return 'ready';
}
