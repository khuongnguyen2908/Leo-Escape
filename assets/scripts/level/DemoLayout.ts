/**
 * Vị trí, kích thước đo từ 4 ảnh demo (1280×720, 1px = 1.5 đơn vị game) bằng cách dò từng ảnh gốc trên ảnh demo.
 * Dùng bởi nút "📐 Xếp lại theo ảnh demo" của DemoLevelBuilder (nút ⚙ cũng lấy độ lún mép đá ở đây). Node được tìm theo uuid nên đổi tên vẫn không sao.
 * Ảnh gốc giữ đúng cỡ vẽ (tỉ lệ 1), trừ vài món demo vẽ nhỏ hơn (bàn hồng, tủ điện).
 */
/** Độ cao camera (Offset Y của CameraRig): 33 để mép dưới khung hình khớp mép dưới tile đất (đo 07/11: khung -224, tile -237 khi còn 46) */
export const DEMO_CAMERA_OFFSET_Y = 33;

/**
 * x, y: vị trí trong lớp; sx, sy: tỉ lệ (sx âm = lật ngang). Thiếu trường nào thì giữ nguyên trường đó.
 * above: uuid của node mà node này phải vẽ đè lên (cùng cha).
 */
export const DEMO_NODES: { id: string; name: string; x?: number; y?: number; sx?: number; sy?: number; above?: string }[] = [
    { id: "22pFFuxDZHZZ47ALOeUt6Z", x: -293.5, y: 43.5, sx: 1, sy: 1, name: "mg_nhao_1" },
    { id: "b2k1vwinZOr65dK3xjoEYo", x: -71.5, y: 50.5, sx: 1, sy: 1, name: "mg_chaucay_5" },
    { id: "ed+mgIAK5IObwoHLi9SWSG", x: 144.5, y: 39.5, sx: 1, sy: 1, name: "mg_thungxop" },
    { id: "04fmJusZBH9r2DEu9y+OHq", x: 331.5, y: -5.7, sx: 1, sy: 1, name: "mg_cay_2" },
    // Bụi cây kéo dài xuống tới mép đá (giữ nguyên ngọn) để không lộ khe trời dưới bàn
    { id: "e3fTJ3csBONZw46NAKYKAW", x: 543, y: 46, sx: 1, sy: 1.08, name: "mg_buicay_3" },
    { id: "6bqPxISe5MXZ+TuckX3vgX", x: 506.6, y: 43.9, sx: 0.945, sy: 0.945, name: "mg_ban" },
    { id: "49Ei5LT9NAbo528AvWPSCt", x: 516, y: 188.5, sx: 1, sy: 1, name: "mg_binhly" },
    { id: "ca8o7D5vRGs6JvY9QMT4Xc", x: 299.5, name: "Player" },
    { id: "a8uFXAx4NPn7+OdY6Qe2rc", x: 0, y: 0, name: "Visual" },
    { id: "cdyH/eceBFNpxvCklpPOmt", x: 740.5, y: 40.5, sx: 1, sy: 1, name: "mg_ghe" },
    { id: "1dbZv+CvlD2ImhEuqYRW44", x: 553, y: 35, sx: 1, sy: 1, name: "mg_coin" },
    { id: "90y0w0HbZL+4TijCGedJoD", x: 731.5, y: 222.5, sx: 1, sy: 1, name: "mg_coin" },
    { id: "25dnnc4R9ABb0TwHZQ4uV3", x: 863.5, y: 36.5, sx: 1, sy: 1, name: "mg_coin" },
    { id: "61aGkVkwZHMrrhHLf8VN8k", x: 794.5, y: 50.5, sx: 1, sy: 1, name: "mg_hangrao_2", above: "e3fTJ3csBONZw46NAKYKAW" },
    { id: "37Ss29BRFM6Y/dhV7q2Q/K", x: 1142.5, y: 52, sx: 1, sy: 1, name: "mg_hangrao_1" },
    { id: "e32/HqzahFxb346npcXtxD", x: 1177, y: 5, sx: 1, sy: 1, name: "mg_cottenduong" },
    { id: "e6rViPrpBOcKNriVNosx62", x: 1387, y: 37.5, sx: 1, sy: 1, name: "as_cayquat" },
    { id: "9fmur3YjhEkagVJQFBbRPq", x: 1645, y: 30.5, sx: 1, sy: 1, name: "mg_cafe" },
    { id: "ac9dfhEjtPmbba5QVKyWYi", x: 1750, y: -34.7, sx: 1, sy: 1, name: "bg_thanh" },
    { id: "c7l/mNuxhO6r82IhY6GIII", x: 1092.5, name: "fr_co" },
    { id: "3bBBsx55FHV4X5XWZe1AfD", x: 1851.5, name: "fr_co" },
    { id: "ff0afyVwpNDaGVyuPBIG8I", x: 156.6, y: -396.9, sx: 0.975, sy: 0.975, name: "fr_cotduong" },
    { id: "d8UVCwzI9OI7rM5hxKcgz4", x: 398.6, y: -628, sx: 0.9, sy: 0.9, name: "fr_tudien" },
    { id: "7c/8xMC05OCrzduk+LNtBB", x: 1611, y: -478.4, sx: 1, sy: 1, name: "fr_cotcaasm" },
    { id: "efcMlQX/JFa4R0PKiGsPig", x: 1774, y: 15, sx: 1, sy: 1, name: "mg_cay_4" },
    { id: "b0JqfxRapMwKYSjWMdwDgv", x: 1847, y: 35, sx: 1, sy: 1, name: "mg_ban" },
    { id: "f0h3v+UNJBeKAqn3Badwk+", x: 1861.5, y: 188.5, sx: 1, sy: 1, name: "mg_binhly" },
    { id: "a17nXAQudM0ofAqxH1LmYI", x: 1615.5, y: 37.5, sx: 1, sy: 1, name: "mg_ghe" },
    { id: "c5bSS7s+lNFYABqgm7g30A", x: 2086, y: 37.5, sx: 1, sy: 1, name: "mg_ghe" },
    { id: "cczaXrVjtPupHoP//aT119", x: 2310.5, y: 34.5, sx: 1, sy: 1, name: "mg_nhao_2" },
    { id: "a64yAH4Z9PxauM8MGqkm13", x: 2445.5, y: 29.5, sx: 1, sy: 1, name: "mg_chaucay_2" },
    { id: "d0csj/D7lBwrtFI7/oSo0J", x: 2666.5, y: -37, sx: 1, sy: 1, name: "mg_up" },
    { id: "89sJufr2lJXqOhjySanfjK", x: 2716, y: 221, sx: 1, sy: 1, name: "mg_coin" },
    { id: "57EVYWKO9OqpUG2Efknn4D", x: 2942.5, y: 417.5, sx: 1, sy: 1, name: "mg_coin" },
    { id: "ca1u44c8RDc71SVw0LW/Fq", x: 2986, y: 440.5, sx: 1, sy: 1, name: "mg_hangrao_1" },
    { id: "e8Kgpgn31PRYSUWOzkOVJT", x: 3064, y: 399, sx: 1, sy: 1, name: "mg_cottenduong" },
    { id: "84LzJA0f5IJajcbdpF3EnW", x: 3361.5, name: "Bird" },
    { id: "90rP2bhq1IfowUmS8hbJZs", x: 0, y: 0, name: "Visual" },
    { id: "faYzdWjCZEc5nR/YbXLJCR", x: 3780, y: -404.9, sx: 1, sy: 1, name: "fr_cotcaasm" },
    { id: "03XXffjz1IsojpnYWoPWl8", x: 4056.2, y: -665.5, sx: 0.9, sy: 0.9, name: "fr_tudien" },
    { id: "23ip2oVm5PIIkCqKDiF91m", x: 3533, name: "fr_co" },
    { id: "48GsBlgfpLuZwnwp5ONlZV", x: 3581.5, y: 431.5, sx: 1, sy: 1, name: "mg_cotdien" },
    { id: "60ay2nOkREBrQcenyL14Qo", x: 3746.5, y: 440.5, sx: 1, sy: 1, name: "mg_hangrao_1" },
    { id: "e7vSGoxPZFl50FGFmApeaQ", x: 3916.5, y: 421.5, sx: 1, sy: 1, name: "mg_chaucay_3" },
    { id: "a3uRvESoZEaqmdMznujLg3", x: 4089.5, y: 428, sx: 1, sy: 1, name: "mg_thungxop" },
    { id: "b3MUWJJh9LtLiFKtlD2v2d", x: 3956.5, y: 440.5, sx: 1, sy: 1, name: "mg_hangrao_2" },
    { id: "72EeXJpXhM7bJzwSqagQPN", x: 4166.5, y: 439, sx: 1, sy: 1, name: "mg_hangrao_3" },
    { id: "2fgFhpW6xPzK81YaEf6JEj", x: 4421, y: -31, sx: 1, sy: 1, name: "mg_thungrac" },
    { id: "0aRT2c9kNG7Ytzgckpvp4/", x: 4666, y: 5, sx: 1, sy: 1, name: "mg_cottenduong" },
    { id: "bcsWq7cdhMrZOakggaVg+x", x: 4747, y: 23, sx: 1, sy: 1, name: "mg_coin" },
    { id: "a7ehrnfOxAer0dfy001Low", x: 4895.5, y: 23, sx: 1, sy: 1, name: "mg_coin" },
    { id: "29i6wKkvVPq767+fKn0RC3", x: 5015.5, y: 34, sx: 1, sy: 1, name: "mg_gheda" },
    { id: "44iZ1dHjNPF6rHLduD6wXO", x: 5095, name: "Bird" },
    { id: "6ahmB/jzlHHrbgi3EXUBao", x: 0, y: 0, name: "Visual" },
    { id: "06pUgwfnFCdbMdJvAcAk7D", x: 5342.5, y: 28.5, sx: 1, sy: 1, name: "as_cayquat" },
    // Quán Lợi Ký (MG_nhao_4) thay nhà mg_nhao_1 ở đây, đo trên ảnh demo 4
    { id: "45Rd8WkNBEhrDfPbbu8uLQ", x: 5630, y: 22, sx: 1, sy: 1, name: "mg_nhao_4" },
    { id: "02sdjETTpHQID4HfkKUD6t", x: 5127, y: 24.3, sx: 1, sy: 1, name: "mg_cay_5" },
    { id: "42aw/YX7ZJmbiN3cYtIpWN", x: 5306, y: -439.4, sx: 1, sy: 1, name: "fr_cotduong" },
    { id: "3dHpdQgu5BGoMBQLuC6tth", x: 5535, y: -473.9, sx: 1, sy: 1, name: "fr_cotcaasm" },
    { id: "a5223rxglBsJwVFLmXfEQ6", x: 5939.5, y: 34, sx: 1, sy: 1, name: "mg_cotdien-001" },
    { id: "71eaCf9OVE1oinDLQTimXh", x: 5957.5, y: -2.5, sx: 1, sy: 1, name: "mg_cottenduong" },
    { id: "06cPd6imdCOqNC8HeG1Hq1", x: 6188.5, y: 26, sx: 1, sy: 1, name: "mg_thungdien" },
    { id: "56tx1CzylL0r8YOZ8zxls3", x: 6356.5, y: 50.5, sx: 1, sy: 1, name: "mg_hangrao_1" },
    { id: "30eBQ3JnNPH5X2fNjOlPFP", x: 6506.5, y: -37, sx: 1, sy: 1, name: "mg_up" },
    { id: "8aa0k5j45BEbQhezmYz4gG", x: 6557.5, y: 222.5, sx: 1, sy: 1, name: "mg_coin" },
    { id: "e2RIWEx35IGaPoboc6oMh9", x: 6744.5, y: 389.5, sx: 1, sy: 1, name: "mg_cone" },
    // Boss đứng giữa khu boss (đã rút khu boss còn vừa một khung hình, bước ⚙ 31)
    { id: "a6SODgd9lAa4kvalihzd2n", x: 9745.2, name: "Boss" },
    { id: "98uu/kzTpISIUSvHDmagOW", x: 0, y: 0, name: "Visual" },
    { id: "afXPTUGPJPcLabqFuQm6jI", x: 9411.5, y: -434.9, sx: -1, sy: 1, name: "fr_cotduong" },
    { id: "a0KNTkkvlHCK6j6hyiPx0y", x: 9031.6, y: -671.5, sx: 0.9, sy: 0.9, name: "fr_tudien" },
    { id: "9favFx7ZFHb6+LytsN8nhU", x: -800, y: -166.2, name: "mg_cay_6" },
    { id: "c2PMBxhcBGv7y2UHfUB6r+", x: 420, y: -180, name: "mg_cay_7" },
    { id: "07KkfdRtdG65QT331Px8Ce", x: 553, y: 90, name: "HaoQuang" },
    { id: "f4+SAJo39Gb4XbrnCMzW/M", x: 731.5, y: 277.5, name: "HaoQuang" },
    { id: "4cjDEjPlBFC7J77iEpZSeh", x: 863.5, y: 91.5, name: "HaoQuang" },
    { id: "d6r8+CBYlG0KhbIv2WvbiI", x: 2716, y: 276, name: "HaoQuang" },
    { id: "16zgk3KeJM5KKsDs/193NI", x: 2942.5, y: 472.5, name: "HaoQuang" },
    { id: "9e01dMY3NKmLs7dpwAgmtf", x: 4895.5, y: 78, name: "HaoQuang" },
    { id: "be3PPiVOFEHbPeVqGTzih+", x: 6557.5, y: 277.5, name: "HaoQuang" },
    { id: "09qrc9dQZOjYTL7BSxXVIw", x: 4747, y: 78, name: "HaoQuang" },
];

/** Đổi ảnh cho khớp demo. */
export const DEMO_SPRITES: { id: string; art: string }[] = [
    { id: "efcMlQX/JFa4R0PKiGsPig", art: "MG_cay_3" },
];

/** Chim, boss: chiều cao hiển thị, hướng ảnh gốc (ảnh vẽ quay mặt sang trái), ảnh đi (nếu đổi). */
export const DEMO_ENEMIES: { id: string; targetHeight: number; artFacesRight: boolean; walkFrame?: string }[] = [
    { id: "84LzJA0f5IJajcbdpF3EnW", targetHeight: 201, artFacesRight: false },
    { id: "44iZ1dHjNPF6rHLduD6wXO", targetHeight: 213, artFacesRight: false, walkFrame: "MG_enermy_2" },
    { id: "a6SODgd9lAa4kvalihzd2n", targetHeight: 427, artFacesRight: false },
];

/** Mèo (node Visual có PlayerVisual): chiều cao hiển thị. */
export const DEMO_PLAYER: { id: string; targetHeight: number }[] = [
    { id: "a8uFXAx4NPn7+OdY6Qe2rc", targetHeight: 207 },
];

/** Nền đá: ảnh mép đá cỡ gốc, độ lún để chân đứng đúng chỗ như demo. */
export const DEMO_GROUNDS: { id: string; tileHeight: number; sink: number; width?: number }[] = [
    { id: "faUkoHmrdNL538rWKBhcFy", tileHeight: 281, sink: 66.5 },
    { id: "51iLegxbxLMrIwsS2QiSH4", tileHeight: 281, sink: 66.5 },
    { id: "85cwU7BJxOkqL1E7YWiAVs", tileHeight: 279, sink: 83.5, width: 1425 },
    { id: "b61czsfipG5qKNxMtOLBbk", tileHeight: 281, sink: 66.5 },
    { id: "c0wIc6HN9D3qBanGRGP0hH", tileHeight: 279, sink: 83.5 },
];

/** Hệ số trôi ngang của lớp (cổng thành ở BG trôi chậm hơn). */
export const DEMO_LAYERS: { id: string; fx: number }[] = [
    // Lớp BG trôi chậm theo đường (bước ⚙ 25 xếp lại mây, cây, cổng, nhà rải khắp màn)
    { id: "42Q5v8LutBMqo3DtadPHFS", fx: 0.3 },
];
