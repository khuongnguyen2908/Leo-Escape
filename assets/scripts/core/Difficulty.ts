/**
 * Độ khó: 0 = CASUAL (như bản gốc), 1 = NORMAL, 2 = MANIAC. Chọn khi tạo ô lưu mới, lưu kèm ô đó.
 * Số tim và sát thương mèo nhận giữ nguyên ở mọi mức; chỉ địch và boss mạnh lên.
 *   hp     : nhân máu địch và boss
 *   windup : nhân thời gian địch gồng đòn mổ (nhỏ hơn = ra đòn nhanh hơn)
 *   rest   : nhân thời gian nghỉ giữa các đòn của địch và boss
 *   warn   : nhân thời gian boss báo trước (cột lửa, phun axit)
 */
export interface DifficultyStats {
    hp: number;
    windup: number;
    rest: number;
    warn: number;
}

export const DIFFICULTIES: DifficultyStats[] = [
    { hp: 1, windup: 1, rest: 1, warn: 1 },
    { hp: 1.3, windup: 0.85, rest: 0.8, warn: 0.85 },
    { hp: 1.6, windup: 0.7, rest: 0.65, warn: 0.7 },
];

export const DIFFICULTY_COUNT = DIFFICULTIES.length;

/** Chỉ số của mức level (ngoài khoảng thì lấy mức gần nhất). */
export function difficultyStats(level: number): DifficultyStats {
    return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTY_COUNT - 1, Math.round(level) || 0))];
}
