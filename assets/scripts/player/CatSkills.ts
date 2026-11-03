/**
 * Bộ kỹ năng riêng của một con mèo (LeoSkills, AngeloSkills). PlayerController gọi các hàm này ở đúng chỗ trong mỗi frame.
 * Để riêng file này cho khỏi vòng import giữa PlayerController và các file kỹ năng.
 */
export interface CatSkills {
    /**
     * Mỗi frame, trước khi mèo chạy/nhảy/chém. Trả về true nếu kỹ năng tự lo di chuyển frame này
     * (đang đập bụng, đang nằm, đang bị bê, đang leo dây...), khi đó PlayerController bỏ qua phần điều khiển thường.
     */
    control(dt: number, canControl: boolean): boolean;
    /** Bấm đánh. Trả về true nếu kỹ năng thay cho nhát chém thường (Angelo quất dây, Leo đang bê thì không chém). */
    attack(): boolean;
    /** Bấm nhảy khi đang bay và hết coyote time. Trả về true nếu đã nhảy (nhảy 2 lần, nhảy bật tường). */
    airJump(): boolean;
    /** Ngay trước khi di chuyển: chỉnh vận tốc (trượt tường chậm lại...). */
    beforeMove(dt: number): void;
    /** Bị đánh: bỏ dở kỹ năng đang làm (thả đồ đang bê, đứng dậy...). */
    interrupt(): void;
    /** Có cho lướt chém khi giữ nút đánh không. */
    readonly canDash: boolean;
    /** Đang ở yên một chỗ có chủ đích (nằm lì, nằm làm đệm, giữ dây): con đi theo không tự đi. */
    readonly staying: boolean;
    /** Đang bị người khác điều khiển vị trí (bị bê, bị ném, đang leo dây): con đi theo không tự đi, không dịch chuyển. */
    readonly busy: boolean;
}
