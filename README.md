# Phố Mèo: khung game platform 2D (Cocos Creator 3.8)

Khung game đi cảnh từ trái sang phải, viết sẵn các phần: điều khiển mèo có coyote time và jump buffer, hoạt ảnh bằng tween,
bục một chiều, camera bám theo, parallax 4 lớp, kẻ địch đi tuần, boss, máu dạng trái tim, vật phẩm, checkpoint, đích và nút cảm ứng.
Va chạm do code tự tính, **không dùng Box2D**, nên không cần bật module vật lý.

## 1. Mở project

1. Cài **Cocos Dashboard**, rồi cài **Cocos Creator 3.8.8** (đúng bản này; project ghi 3.8.8 trong `package.json`).
2. Trong Dashboard chọn **Add / Import** rồi trỏ tới thư mục này (`D:\Game\Cocos game`).
3. Mở lần đầu Creator sẽ tự sinh `library/`, `temp/` (hơi lâu, bình thường). `settings/` và các file `.meta` đã nằm sẵn trong repo.

## 2. Thả asset vào

Copy toàn bộ ảnh PNG vào **`assets/resources/art/`** và giữ nguyên tên file (`MG_char_idle.png`, `MG_tile_2.png`, `FR_cotduong.png`...).

- Chọn tất cả ảnh trong Creator, ở Inspector kiểm tra **Type = sprite-frame** rồi bấm Apply.
- Tên có dấu như `AS_câyquất` hay `FR_cờ` vẫn nhận được vì code tự bỏ dấu. Tuy vậy **nên đổi sang không dấu**
  (`AS_cayquat`, `FR_co`, `FR_cotcam`) để tránh lỗi khi build ra Android hoặc iOS.
- Ảnh nào chưa có thì game hiện khối màu kèm tên, nên chạy được ngay cả khi chưa có ảnh nào.
  Danh sách ảnh còn thiếu được in ra trong Console.

## 3. Mở scene và chạy

1. Mở `assets/scenes/Main.scene`. Màn đã có sẵn trong repo và **scene là bản chính**: không cần tạo scene mới.
2. Bấm **Play** ▶. Design Resolution của project là 1920 × 1080, Fit Height (đã đặt sẵn trong `settings/`); khung 16:9 do code giữ (`Letterbox.ts`, ô *Lock Aspect* của DemoLevelBuilder).

Tuỳ chọn trên DemoLevelBuilder (node Canvas):
- `Debug Colliders`: vẽ khung va chạm. Xanh lá là bục đặc, xanh dương là bục một chiều, hồng là nhân vật.
- `Touch On Desktop`: hiện nút cảm ứng trên máy tính để thử.

## 4. Sắp xếp màn trong editor

Trong Hierarchy, dưới Canvas là các lớp `Sky`, `BG`, `MG`, `Gameplay`, `FR`, `FR_Top`, `HUD`... (danh sách đủ ở mục "Quy ước quan trọng"). Mở ra là thấy từng món đồ.
Kéo thả, đổi kích thước, xoá hoặc nhân bản (Ctrl+D) tuỳ ý, rồi **Ctrl+S**. Bấm Play là game dùng đúng màn bạn đã xếp.

Lưu ý khi sắp xếp:
- Khối nền đá (`Ground`) có component **GroundBlock**: đổi `Width` để dài ngắn, kéo node để đổi chỗ và độ cao.
  Nhóm **Đất tối bên dưới** (hình tạm cho zoom 0.7): ô *Fill Below* tô màu đất tối liền dưới đáy ảnh ô đá, sâu chừng đó (⚙ đặt 1400, 0 = tắt),
  phủ cả bề ngang khối và các ô đá; ô *Fill Color* là màu (mặc định lấy theo dải đá sát đáy ảnh). Kéo ô đá trong editor thì đất tối tự chạy theo.
  Có ảnh thân đất / cống thật thì đặt *Fill Below* về 0.
  Các ô đá lấy **ngẫu nhiên** từ *Tile Frame* + *Variants* (hai ô liền nhau không trùng ảnh;
  đổi ô *Seed* để xếp kiểu khác). Chỗ hai ô giáp nhau cắt bỏ viền tối (ô *Edge Cut*, px ảnh gốc, mặc định 16) rồi chồng nhẹ (*Overlap*),
  nên viền tối chỉ còn ở hai đầu khối. Ô *Extend*: kéo dài phần đá tối ở đáy ô xuống (nền thấp 60, để lúc rung màn hình khỏi hở đáy).
  Ô *Bleed Left / Bleed Right*: hình ô đá lấn sang hai bên (khung va chạm giữ nguyên). Khối thấp sát khối cao lấn 40 để **đè lên mép khối cao**
  (khối cao phải nằm trên khối thấp trong Hierarchy, tức vẽ trước; nút ⚙ tự dời).
  **Xếp tay (ô *Manual*, đang bật cho cả 7 khối):** các ô đá là node con thật `Tile_1`, `Tile_2`... của từng `Ground` (⚙ bước 30 tạo sẵn: ảnh nguyên, cỡ gốc,
  không cắt viền, không giãn). Kéo, đổi ảnh (ô Sprite Frame), xoá, Ctrl+D từng ô tuỳ ý; ô nằm dưới trong Hierarchy thì vẽ đè lên ô trên.
  Khung va chạm (viền xanh lá) vẫn theo *Width* / *Depth* của GroundBlock, đổi ô thì tự chỉnh Width nếu cần. Bỏ tích *Manual* thì code tự xếp lại ô đá mỗi lần mở scene / chạy game
  (không lưu vào scene, không hiện trong Hierarchy; các ô Tile_ vẫn còn, xoá tay nếu không dùng). Các mục dưới đây chỉ có tác dụng khi *Manual* tắt.
  **Góc ngoài**: đầu khối lộ ra ngoài (tích *Cap Left* / *Cap Right*) dùng ảnh góc,
  giữ nguyên viền ngoài: đầu phải dùng *End Frames* (`MG_tile_3`), đầu trái dùng *Left End Frame* (`MG_tile_4`, mép trái nét liền; để trống thì lật ngang ảnh góc phải, ô *Flip Left Cap*). Giữa khối thấp chỉ xếp `MG_tile_1/2`.
  Nút ⚙ đặt ảnh, góc, Sink cho mỗi khối **một lần** (ô *Auto Tiled* khác 0), sau đó để yên phần bạn chỉnh; đặt *Auto Tiled* về 0 thì ⚙ đặt lại.
  Vệt nắng `MG_nắng` (node `mg_nang` trong Gameplay, ⚙ đặt ở thân đá trước cái hố khung 1): kéo để dời, Ctrl+D để thêm chỗ khác.
- **Dòng sông** (lớp `River`, trôi 0.9, nằm sau lớp chơi nên chỉ lộ ra ở hố và khe giữa các khối đá): node `RiverStrip` chứa 8 ảnh `BG_river`
  nối liền (ảnh chẵn lật ngang cho mối nối khớp). Component **RiverFlow** trên `RiverStrip`: nước trôi ngang (*Speed*,
  âm = sang trái), nhún nhẹ (*Bob*, *Bob Period*), chỉ khi chơi. Muốn sông cao / thấp hơn thì kéo `RiverStrip` lên xuống.
  Khi chơi RiverFlow tô thêm nước sâu dần bên dưới dải ảnh (ô *Deep* = 1500, màu *Deep Top* → *Deep Bottom*): ở zoom 0.7 đáy dải ảnh
  không còn sát đáy khung hình, nhìn qua khe giữa hai khối đá vẫn thấy nước chứ không thấy trời.
- Đồ đứng lên được có component **Solid**. Kích thước vùng va chạm (`Size`) không tự đổi theo khi bạn scale hình, nhớ chỉnh lại Size.
  Bật `Debug Colliders` rồi Play để thấy khung va chạm.
- Lớp `MG`, `BG`, `FR` trôi theo parallax nên trong editor nhìn lệch so với lúc chơi. Đó là bình thường.
- **Scene là bản chính.** DemoLevelBuilder có 3 nút:
  - **"⚙ Cập nhật (giữ phần bạn xếp)"**: nút dùng hằng ngày. Thêm những gì còn thiếu và áp bản sửa mới của code,
    không dời, không xoá gì bạn đã xếp; bấm bao nhiêu lần cũng ra cùng kết quả. **Những gì nó vừa đổi được in ra Console**
    (các bước nằm trong hàm `applyFixesInEditor` của `DemoLevelBuilder.ts`). Bạn cần bấm ⚙ khi:
    - thêm cá mới (⚙ gắn hào quang `HaoQuang` sau cá) hoặc xoá cá (⚙ xoá hào quang thừa);
    - thêm băng rôn, cờ, tán lá vào `FR_Top` (⚙ ghim sát mép trên; cao thấp chỉnh ô *Overlap* của PinToScreenTop);
    - kéo dài màn (khối nền vượt quá tường cuối): ⚙ dời tường tàng hình `Wall` cuối màn tới hết khối nền xa nhất và tăng *Max X* của camera;
    - lỡ kéo riêng hình của kẻ địch (node con `Visual`): ⚙ dời cả node tới chỗ hình. Khi chơi hình luôn bám node, nên muốn dời con địch thì kéo node cha (`Boss`...), đừng kéo `Visual`;
    - muốn ⚙ đặt lại ảnh, góc, Sink của một khối đá: đặt ô *Auto Tiled* của khối đó về 0 rồi bấm;
    - muốn một món đồ chặn cả hai bên (không đi xuyên, phải nhảy lên): thêm số đo vào bảng `SOLID_PROPS` trong `DemoLevelBuilder.ts` rồi bấm (đã có thùng giấy `mg_up`, thùng rác).

    ⚙ cũng tạo lại những thứ bị thiếu hẳn: các lớp ánh sáng, màn mở đầu `Landing` và menu chính, màn hướng dẫn `Tutorial`, NPC cửa hàng và cá bự (chỉ khi chưa có node đó).
  - **"📐 Xếp lại theo ảnh demo"**: đặt lại vị trí, kích thước của đồ vật, cây, chim, boss, mèo, nền đá và độ cao camera
    cho khớp 4 ảnh demo. **Phần bạn đã tự kéo sẽ mất.** Số liệu nằm trong `DemoLayout.ts`, đo bằng cách dò từng ảnh gốc
    trên ảnh demo (ảnh demo vẽ mọi thứ đúng cỡ gốc, tỉ lệ 1). Băng rôn đã ghim thì giữ độ cao của ghim.
    Không tạo, không xoá node, chỉ thêm node `DemoRef` nếu chưa có.
  - **"⟳ Dựng màn từ đầu"**: scene trống thì dựng ngay. Đã có màn thì phải tích **"Cho phép xoá màn đang có"** trước:
    các lớp cũ bị xoá và dựng lại, phần đã tự sắp xếp sẽ mất. **Commit scene lên Git trước** để lỡ tay còn lấy lại được.

  Ánh sáng vẽ hoàn toàn bằng code, không dùng ảnh. Tia nắng chỉnh trong component **LightRays**: Length, Angle, Spread, Shafts, Color (alpha là độ sáng).
  Sương và hào quang chỉnh trong **SoftGlow**: Size, Color. Bụi sáng chỉnh trong **DustMotes**.
  Bụi `bg_bui` (lớp `Light_Far`) trôi lững lờ nhờ **DustDrift**: *Sway X/Y*, *Period*, *Fade Min/Max*, *Twinkle*, *Breathe*. Bụi sáng `BuiSang` (DustMotes) đang tắt, tích lại ô active nếu muốn.
- Vị trí đồ vật trong màn mẫu đo theo 4 ảnh demo 1280×720 (1px = 1.5 đơn vị game), xem hàm `demoX` trong `DemoLevelBuilder.ts`.
- **So với ảnh demo:** chọn node `DemoRef`, tích **Hiện ảnh demo**, kéo **Khung** 1–4 (camera xem trước tự nhảy tới đúng chỗ),
  chỉnh **Độ đậm**. Ảnh nằm ở `assets/ref/`, chỉ hiện trong editor và không vào bản build.
- Nếu Ctrl+S không lưu (tên scene không có dấu `*`), kéo nhẹ một node bất kỳ rồi lưu lại.
- **Nhân bản tại chỗ** (tiện ích `extensions/duplicate-in-place`): chọn node trong Hierarchy, bấm **Ctrl+Shift+D** (hoặc menu Extension →
  Duplicate tại chỗ) → bản sao nằm **ngay dưới node gốc** thay vì cuối danh sách (Ctrl+D / Ctrl+V của Creator luôn đưa xuống cuối).
  Lần đầu phải bật: menu Extension → Extension Manager → tab Project → bật `duplicate-in-place`.
  Phím có sẵn của Hierarchy: `[` / `]` dời node lên / xuống một bậc, Ctrl+[ / Ctrl+] lên đầu / xuống cuối, Ctrl+Alt+V dán thành node con.

## Vào game

> **Angelo và chế độ 2 người đang TẠM TẮT: node đã xoá khỏi scene, code còn giữ, chưa quyết bỏ hẳn hay làm lại.**
> Hiện game chỉ có Leo: NEW GAME vào thẳng với Leo, trang phím chỉ có cột Người 1.
> Code còn giữ: `AngeloSkills.ts`, `FollowerAI.ts`, `CharacterSelect.ts`, `SoulWisp.ts`, `YarnRope.ts`.

**Mở game** (lần đầu trong một lần mở, `BootScreen.ts`): **Logo 1** → **Logo 2** (mỗi logo hiện 1s · giữ 1s · mờ 1s, không bấm bỏ qua được;
ảnh `boot_logo1`, `boot_logo2` trong `assets/resources/art`, chưa có thì hiện khung chữ LOGO 1 / LOGO 2) → **thông báo tự lưu** (~4 giây, không bấm qua nhanh được) →
**banner** kèm **thanh tải** (tải trước ảnh hiệu ứng `art/fx`) → thanh tải đổi thành **nút START** (nhân bản node `Landing/Start` trong scene: sửa nút trong scene là màn này đổi theo) →
bấm nút, hoặc Enter / Space / Nhảy / Đánh (phím khác không tính) thì các dòng menu hiện dần. Về màn hình chính từ trong game thì bỏ qua logo, menu hiện luôn.
Trang trí menu, tạo lúc chạy, không lưu vào scene: **bụi menu** (`MenuDust.ts`, ~70 hạt ngay trên ảnh nền `MenuBg`; số chỉnh ở đầu file: `COUNT`, `SIZE`, `SPEED`, `ALPHA`, `LIFE`...)
và **logo lướt sáng** (`LogoShine.ts`, tự gắn vào `Logo/Pic`: vệt sáng mỗi 4 giây, ô *Period*, *Sweep*, *Band Width*, *Strength*; ngôi sao nhấp nháy, ô *Star X/Y*, *Star Size*, *Twinkle*).

Màn mở đầu là **menu chính**: logo, NEW GAME, OPTIONS, ACHIEVEMENTS, CREDITS, QUIT, dòng bản quyền ở đáy.
W/S hoặc ↑/↓ (rê chuột cũng được) để dời khung chọn; Enter, Nhảy, Đánh hoặc chạm để chọn.
**Dấu tự lưu** (`SaveIcon.ts`, `PawIcon.ts`): mỗi lần ghi ô lưu (đi ngang checkpoint, qua màn), góc phải trên cùng hiện chân mèo `Icon_paw` + chữ "Đang lưu..." → "Đã lưu", tổng ~2.5 giây.
Nó đè lên nút bánh răng (nút nằm ngay góc phải trên: ô *Gear Right* / *Gear Top* = 70 của PauseMenu). Chân mèo tô một màu bằng shader `resources/effects/sprite-silhouette.effect`.
- **NEW GAME** → **chọn 1 trong 3 ô lưu** (`SaveSlotPage.ts`, dữ liệu `game/SaveSlots.ts`, lưu trên máy). Ô trống ghi **NEW**; ô có tiến độ ghi
  chương, checkpoint (hoặc Đã qua màn), thời gian chơi, số cá, nhãn màu độ khó, kèm nút **X** xoá (hỏi lại, mặc định KHÔNG).
  Trái / phải hoặc rê chuột để chọn, Enter / Nhảy / Đánh / chạm để vào, Delete để xoá, Esc về menu (điện thoại: nút ← tròn góc trên trái).
  Chạm checkpoint xa hơn chỗ đã lưu, hoặc qua màn, là ghi đè ô đang chơi.
- **Ô mới → chọn độ khó** (`DifficultyPage.ts`, số liệu `core/Difficulty.ts`): 3 dải CASUAL / NORMAL / MANIAC (tiếng Việt THƯ GIÃN / BÌNH THƯỜNG / ĐỊA NGỤC),
  mỗi dải có biểu tượng (ảnh `art/MG_icon_boss`: mức 1 một cái, mức 2 hai cái, mức 3 ba cái; chưa có ảnh thì vẽ tạm), tên và mô tả.
  ↑/↓ hoặc rê chuột để chọn, Enter / Nhảy / Đánh / chạm để vào, Esc về trang ô lưu. Ô đã lưu giữ độ khó cũ, không hỏi lại (ô lưu cũ chưa có = CASUAL).
  Số tim và sát thương mèo nhận giữ nguyên ở mọi mức:

  | | CASUAL | NORMAL | MANIAC |
  |---|---|---|---|
  | Máu địch và boss | ×1 | ×1.3 | ×1.6 |
  | Địch gồng đòn mổ | ×1 | ×0.85 | ×0.7 |
  | Nghỉ giữa các đòn (địch, boss) | ×1 | ×0.8 | ×0.65 |
  | Boss báo trước (mọi đòn: dáng lấy đà, dấu đỏ, cột lửa...) | ×1 | ×0.85 | ×0.7 |

  Chọn xong → màn đen **zoom vào** (lỗ tròn thu lại, `IrisWipe.ts`) + **màn tải** (`LoadingScreen.ts`, đứng 2 giây; nền `PatternBackdrop.ts` dùng chung với màn thông báo tự lưu:
  ảnh `BG_loading`, hoạ tiết trong `art/Loading_pattern/` (Type = sprite-frame) trộn kiểu **Screen** bằng shader `resources/effects/sprite-screen.effect` (độ đậm `PATTERN_SCREEN`),
  lớp hạt nhiễu `art/Loading_filter`; mèo giữa màn là flip-book `loading_cat_1`, `_2`... 12 hình/giây, chưa có thì đầu mèo tạm) →
  - **ô mới**: **3 trang truyện** (`StoryPages.ts`; ảnh `story_1..3` trong `art`, chưa có thì khung PAGE 1...; chữ `story.1..3` trong `Lang.ts`), lật như sách:
    → / Enter / phím khác / chạm: lật tới; ← (hoặc chạm phía trái): lật lại; Esc: bỏ qua truyện → màn đen + **màn tải** 2 giây → **màn hướng dẫn** (xem dưới) → ra cửa EXIT → màn đen →
    **zoom ra bản đồ** từ chỗ Leo đứng → **hội thoại kiểu visual novel** (`DialogueBox.ts`: avatar `MG_avatar`, bảng tên, câu hiện dần; bấm để qua; 3 câu `dialog.1..3` trong `Lang.ts`) → vào chơi;
  - **ô đã lưu**: zoom ra bản đồ ngay tại checkpoint đã lưu (thời gian, cá, số lần gục giữ nguyên; cá đã ăn không còn) → vào chơi.
    Ô đã qua màn thì chơi lại từ đầu màn.
- **Màn hướng dẫn** (`TutorialRoom.ts`, nút ⚙ tạo node `Tutorial` và các `Tut_...` bên trái đầu màn, x -9200 → -800, kéo chỉnh được):
  tờ giấy kem lưới mờ nét bút nâu; đi từ trái sang phải qua các **biển chỉ dẫn** (`TutorialSign.ts`: ô phím theo phím đang cài + tên + một dòng,
  mũi tên vẽ tay; ô *Topic* chọn chủ đề, chữ `tsign.*` trong `Lang.ts`): Chạy, Ngồi, Nhảy (thùng), Nhảy 2 lần (cột cao), Lên bục (W),
  Xuống bục (S S), Lướt né (phím Lướt), Chém, Sóng kiếm, Quét chân, Chém hất (2 **hình nộm** `TrainingDummy.ts`: trúng thì lắc, không chết),
  **Bùng nổ** (phím L / C, biển `Tut_Sign_special` trên hình nộm thứ 2; trong màn hướng dẫn mỗi nhát trúng được +25 nộ, ô *Tutorial Rage On Hit*
  của PlayerController, nên 4 nhát là đầy), Cá (3 con), **cửa EXIT** (`TutorialExit.ts`: đứng ở cửa bấm Lên). Khối vẽ phác thảo: `TutorialBlock.ts` (Box / Pillar / Platform, tự gắn Solid).
  Trong màn hướng dẫn camera chỉ chạy trong khu đó, giấu lớp tiền cảnh `FR`; cá ăn và thời gian chơi ở đây không tính. Chỉ dạy kỹ năng đang mở
  (đập bụng, Mèo Nổ phải mua ở cửa hàng nên chưa có biển). Chỉ ô mới đi qua màn hướng dẫn.
- **Nhạc**: nhạc menu `bgm` bật khi thanh tải chạy xong (và khi về menu), chạy tiếp qua ô lưu, truyện;
  **màn hướng dẫn có nhạc riêng `bgm_tutorial`** (ô *Music* của TutorialRoom; chưa có file thì nhạc menu chạy tiếp);
  tắt lúc hội thoại mở đầu; **nhạc rừng `bgm_forest` chỉ bật khi xong hội thoại** (ô đã lưu: bật lúc vào chơi).
- **OPTIONS** mở trang Cài đặt (xem mục Menu). Quay lại / Esc là về menu.
- **ACHIEVEMENTS** mở trang **Thành tích** (`AchievementsPage.ts`, dữ liệu `game/Achievements.ts`, lưu trên máy, chung mọi ô lưu): danh sách cuộn
  (W/S, lăn chuột), mỗi dòng ô biểu tượng (ảnh `ach_<id>` trong `art`, chưa có thì ngôi sao tạm; chưa đạt thì ổ khoá) + tên + mô tả, thanh cuộn bên phải.
  8 thành tích: Bước đầu (xong hướng dẫn) · Hạ Chihuahua Độc · Về nhà (qua chương 1) · Mèo tham ăn (đủ cá) · Không một vết xước (không gục) ·
  Nhanh như mèo (dưới 5 phút) · Liều mạng (qua ở MANIAC) · Thợ săn chim (hạ 20 chim, cộng dồn). Đạt cái mới thì **thông báo nhỏ góc dưới phải** (`AchievementToast.ts`).
- **CREDITS / TÁC GIẢ**: bảng với hai ô logo và tên **Laris**, **Flynt**, nút Đóng (Esc, Enter, Nhảy cũng đóng).
  Thả ảnh `credit_laris.png`, `credit_flynt.png` vào `assets/resources/art` là tự thay khung LOGO tạm.
- **QUIT** hỏi lại YES / NO (hai hàng, mặc định NO). Bản build ra máy tính, điện thoại thì thoát thật. Bản web: trình duyệt không cho game tự đóng tab,
  nên game thoát toàn màn hình, tắt nhạc, hiện "THANKS FOR PLAYING!" kèm nút BACK TO MENU. Lúc mở CREDITS / QUIT thì menu chính tạm ẩn.
- Node trong `Landing` (nút ⚙ tạo, kéo chỉnh thoải mái): `MenuBg` (ảnh `Background`), `Logo/Pic` (ảnh `logo`),
  `Menu` gồm `Selection` (ảnh `selection`) và 5 dòng `NewGame`, `Options`, `Achievements`, `Credits`, `Quit`, rồi `Copyright`.
  Khung chọn giữ đúng khoảng lệch với dòng gần nó nhất như bạn đặt (đặt ở dòng nào cũng được). Tắt một dòng (bỏ tích node) là menu bỏ qua dòng đó.
  Chữ dài hơn khung (ACHIEVEMENTS) thì lúc chạy khung tự giãn **phần đệm vuông ở giữa**, hai hoa văn hai đầu giữ nguyên
  (kiểu cắt 9 mảnh, mỗi đầu 70px; số trong `SELECTION_*` của `LandingScreen.ts`). Trong editor khung vẫn hiện cỡ gốc.
  Ở menu chính không có nút bánh răng, cài đặt mở bằng OPTIONS.
  Chữ trắng cỡ 60 viền 4px #462c22; chữ nâu nhỏ #968787 cỡ 30 viền 3px #2c1d17. Node `Start` đang tắt nhưng là mẫu cho nút START của màn mở game: đừng xoá.
- **Tim và gục**: dãy tim và thanh nộ của Leo ở góc trên trái. Hết tim thì **gục**; 1.2 giây sau hiện màn **GAME OVER** (`GameOverScreen.ts`, kiểu menu tạm dừng):
  2 mục **Chơi lại** / **Về menu**, ↑ ↓ + Enter hoặc chạm; lúc này không mở được menu tạm dừng. **Chơi lại**: màn tối lại rồi **hồi sinh ở checkpoint** gần nhất đã chạm
  (chưa chạm thì đầu màn), đủ tim, bất tử 1.5 giây; trận boss đánh lại từ đầu, quái đã hạ và cá đã ăn giữ nguyên. **Về menu**: về màn hình chính.
  Không có thua hẳn, không giới hạn số lần chơi lại, nhưng **mỗi lần gục được đếm** (bảng kết quả, sao thứ 3).
- **Về đích** (chạm cờ khi đã hạ boss): người chơi thôi điều khiển, đồng hồ dừng, camera đứng yên
  (sát mép phải màn quá thì trượt nhẹ sang trái cho mèo có chỗ chạy khuất: ô *Hold Exit Room* của CameraRig); mèo nảy mừng một nhịp
  rồi tự chạy sang phải ra khỏi khung hình (ô nhóm *Về đích* của GameManager: Win Hop = độ nảy, Win Walk Max = kẹt quá chừng này giây thì vẫn sang tiếp),
  khuất hẳn thì màn tối mờ dần, hiện bảng **KẾT QUẢ** (`ResultsScreen.ts`): thời gian (không tính lúc tạm dừng),
  số cá x/8, số lần gục, **3 sao** (★ về đích · ★ nhặt đủ cá · ★ không gục lần nào), kỷ lục (thời gian nhanh nhất, số sao cao nhất, lưu trên máy:
  `Records.ts`, phá kỷ lục thì hiện KỶ LỤC MỚI!). Nút **Chơi lại** · **Về menu** · **Màn tiếp theo** (chưa có, hiện "Sắp có"). Chọn bằng A/D hoặc ←/→, Enter / Space.

## Kỹ năng của Leo

| | Leo (`LeoSkills.ts`) |
|---|---|
| Nhảy | **Nhảy thêm 1 lần** trên không (miễn phí, cao 85%; LeoSkills nhóm *Nhảy 2 lần*) |
| Đánh (J) | Bấm liên tục: **combo 5 nhát**, vệt `art/fx/Character/Normal Atk`: nhát 1–4 luân phiên vệt **A** (`Slash_color1` khung 1–5, quét ngang) / **B** (khung 6–9, hất lên), nhát 5 **kết liễu** vòng cung lớn `Slash3` ôm trên đầu mèo; đang bật special thì vệt **màu đỏ** (`Character/Special/…_color2`) (bảng số trong `SlashFx.ts`, `COMBO_SLASH`) (dưới đất **đứng yên tại chỗ một nhịp ngắn mỗi nhát**, không lao tới, giữ A/D cũng không đi; ô *Slash Stop* = 0.12 giây; trúng địch thì địch **loé trắng** và khựng hình ngắn) (nhát 5 **kết liễu** trừ 2 máu, văng xa). Đang bay: combo **3 nhát đầu** như dưới đất, mỗi nhát khựng lại một nhịp. Giữ J đủ 0.8 giây (quả cầu năng lượng xanh gom ở giữa thân, đủ lực thì quả cầu chớp chờ phóng) rồi thả: **sóng kiếm** (**phải mua ở cửa hàng trước**, chưa mua thì giữ J không gồng) bay thẳng ~1000, trừ 2 máu, trúng địch đầu tiên là tan (mua *Sóng kiếm xuyên* thì bay xuyên mọi địch), đụng tường thì tan (**không tốn gì**; PlayerController nhóm *Sóng kiếm*). Thả sớm thì quả cầu **xì hơi** tan mất, không tốn gì. **Giữ Xuống + J** trên nền cứng: **quét chân** về phía đang quay mặt, địch nhỏ (gà, chim...) **té nằm** 1.2 giây, không đánh mèo, vẫn chém tiếp được; **boss không bị quét** (không mất máu) (LeoSkills nhóm *Quét chân*, ô *Sweep Trip*). **Giữ Lên + J** dưới đất: **chém hất**, vệt `Slash2` vút từ sát đất trước mặt lên qua đầu (special: màu đỏ), hất địch bay lên; nhảy theo chém tiếp thì địch lơ lửng (chém trúng trên không thì Leo cũng nảy nhẹ lên, ô *Air Hit Lift*), đang bay thì địch không đánh mèo, rơi xuống choáng 0.4 giây. Boss không bị hất. Đứng ngay dưới bục một chiều thì bấm W sẽ nhảy lên bục trước |
| Đập bụng (giữ Xuống + J khi đang bay) | **Mua ở cửa hàng** (ô *Đập bụng*; game tự đặt ô *Pound Unlocked* theo ô lưu, tick tay không có tác dụng; chưa mua thì Xuống + J trên không là chém thường). Có rồi: **Đập bụng** lao xuống, sóng chấn đánh địch xung quanh và làm chúng **choáng** 1.5 giây; rơi càng cao sóng càng rộng (tối đa ×1.6 khi rơi từ cao 600). Phím Kỹ năng giờ là **special** (xem dòng dưới) |
| Special (L; bộ phím mũi tên: C) | **Thanh nộ đầy** (thanh năng lượng nhấp nháy vàng) thì bấm **L**: hào quang nằm dưới đất quanh chân; trên đầu mèo hiện **kiếm +** (`Character/Atk_up`) chạy 1 lượt rồi tới **khiên +** (`Character/Def_up`); **8 giây** hào quang `art/fx/Character/Special` lặp quanh mèo, sát thương **×1.5**, đánh nhanh **×1.5**, trúng đòn chỉ mất **nửa tim**; thanh tụt dần về 0, hết thì tắt. Chưa đầy mà bấm thì thanh nháy đỏ. Điện thoại: nút ngôi sao cạnh nút đánh, **cùng cỡ nút đánh**: chưa đầy nộ thì xám mờ, chạm không ra gì, vành có cung vàng dài dần theo nộ; đầy nộ thì **lửa cháy quanh nút** (vẽ bằng code; thả bộ ảnh vào `art/fx/UI/SkillFire` thì dùng ảnh) và phồng nhấp nháy; đang bật thì lửa nhỏ lại, cung vàng rút dần theo thời gian còn lại (`TouchControls.ts`; số liệu ở PlayerController nhóm *Thanh nộ, special (L)*) |
| Tuyệt chiêu (giữ Xuống + phím Lướt) | **Mua ở cửa hàng** (ô *Mèo Nổ*; chưa mua thì Xuống + Lướt là lướt thường). Có rồi: **Mèo Nổ**: cần đầy thanh nộ, tốn hết. Gồng 0.6 giây (bất tử) rồi nổ: mọi kẻ địch đang thấy trên màn hình mất 3 máu, văng ra, choáng 1 giây. Chỉ dùng trên nền cứng (trên bàn, thùng... bấm Xuống là rơi xuống) |
| Lướt (Space / Shift phải / nút ») | **Lướt né** (không tốn năng lượng, không gây sát thương, **bất tử** suốt lúc lướt + 0.1 giây sau): bấm **phím Lướt** (WASD: **Space**, Mũi tên: **Shift phải**; đổi được trong Cài đặt, dòng *Lướt*); điện thoại: **nút Lướt** (hai mũi tên », cùng cỡ nút đánh, ngay trên nút nhảy; ô *Dash Pos* của TouchControls). **Không còn lướt bằng bấm đúp trái / phải** hay đẩy đúp joystick. Phím Lướt dùng ô hành động Tương tác; máy đã lưu cài đặt cũ thì tự gán Space / Shift phải nếu phím đó chưa bị dùng. Lướt **cúi thấp, ngả người tới, thân kéo dài**, bóng mờ nối đuôi, đường gió trắng sau lưng, bụi tung lúc đạp đi và lúc phanh. Tốc độ phóng nhanh lúc đầu rồi chậm dần về tốc độ chạy, hết lướt **nối đà chạy** luôn (thả phím thì tự chậm lại); đâm tường thì dừng. Đang chém **lướt được ngay** (huỷ nhịp chém); đang lướt **bấm J thì chém liền**. Trên không mỗi lần bay lướt 1 lần; lướt xong chờ 0.3 giây mới lướt tiếp (PlayerController nhóm *Lướt né*: *Dodge Distance* 480, *Dodge Time* 0.26, *Dodge Grace*, *Dodge Cooldown*). Đang lướt trên đất mà bấm Nhảy: **dash jump**, bay ngang nhanh gấp 1.7 lần chạy tới khi chạm đất (ô *Dash Jump Speed*). |

Hiệu ứng chém và đập bụng của Leo dùng ảnh (xem mục Animation). Số liệu kỹ năng chỉnh trong `LeoSkills.ts` và các nhóm ô của PlayerController.
Đập bụng chạm đất sẽ báo cho `LeoSkills.poundListeners` (để dành cho sàn yếu ở bước câu đố).

## Kẻ địch

**Chạm vào kẻ địch (cả boss) không mất máu**; chỉ đòn đánh của chúng mới gây sát thương (với boss: cào vồ, lao ngang, nhảy đè cũng là đòn đánh).
Địch nhỏ (chim, gà... `EnemyPatrol`) đánh bằng đòn **mổ**: mèo vào tầm (khoảng hở giữa hai thân ≤ 160, gần ngang nhau) thì dừng lại quay về phía mèo,
**rướn người + nháy đỏ 0.45 giây** (báo trước để né), rồi lao mổ (không lao xuống vực); mỏ chạm mèo thì mèo mất 1 tim; lùi về, nghỉ 1.2 giây mới mổ tiếp.
Bị chém trúng lúc đang rướn / lao thì mất đòn. Số liệu: nhóm *Mổ* của EnemyPatrol (Peck Range, Peck Windup, Peck Rest, Peck Speed).

**Cá vàng**: quầng sáng kiểu bokeh (`CoinGlow`: `MG_coin_glow_1` quầng to, `MG_coin_glow_2` quầng nhỏ, trôi vòng nhỏ lệch nhịp, vài đốm sáng nhỏ trôi lên rồi tắt),
cá nhấp nhô và nghiêng nhẹ, đốm `MG_coin_sparkle` trên cá nhấp nháy, xoay chậm (`CoinPickup`). Bị ăn: cá phồng lên rồi teo mất, đốm bung ra, quầng nở thành vòng rồi tan (~0.45 giây).
Ảnh chỉ dùng lúc chơi; trong editor vẫn thấy quầng tạm vẽ bằng code.

## Map thử (scene MapThu)

Mở `assets/scenes/MapThu.scene` (bản sao của Main), chọn Canvas, bấm **🧱 Dựng map thử** trên DemoLevelBuilder rồi Ctrl+S.
Nút chỉ chạy ở scene tên MapThu; mọi khối nằm dưới node `MapThu` trong Gameplay (**đừng kéo node MapThu**, phải ở (0, 0)). Bấm lại thì dựng mới.

| Thành phần | Dùng thế nào |
|---|---|
| **MapBlock** | Khối màu vẽ bằng code, gốc ở góc trên trái. *Kind*: Wall (tường / nền), Platform (bục một chiều, S S để rơi), Backdrop (chỉ là nền) |
| **Door** | Cửa: đứng trước cửa bấm Lên → màn tối, sang chỗ node *Target* |
| **CameraZone** | Khung giới hạn camera khi Leo đứng trong vùng (viền cam trong editor). Clamp Sides / Bottom / Top: chặn mép nào |
| **KeyPickup**, **LockedGate**, **KeySlots** | Chìa để nhặt, cổng mở khi đủ *Keys Needed* chìa, 2 ô chìa trên HUD |
| Wall Jump (PlayerController) | Đang rơi mà đẩy vào tường thì trượt chậm, bấm Nhảy bật ra. MapThu bật, Main tắt |
| Step Height (PlatformerBody) | Tự bước lên bậc thấp hơn số này khi đang đi trên đất (cầu thang đi bộ được). MapThu đặt 45 cho Leo, Main 0 (tắt) |
| Cầu thang xuống ô đá thấp | Nút 🧱 tìm ô đá `Tile_...` bạn đặt thẳng trong Gameplay dưới mặt phố (x 2600 → 4000), làm 6 bậc từ phố x 1980 xuống mặt ô đá. Kéo ô đá chỗ khác rồi bấm 🧱 lại là cầu thang chạy theo |

## Cửa hàng và cá bự

- **Cá bự** (node `CaBu`, `BigFishPickup.ts`): nguyên liệu mở kỹ năng. Nhặt thì chữ "+1 CÁ BỰ" bay lên; **không hiện trên HUD**, chỉ thấy số cá bự trong cửa hàng.
  Hình tạm là ảnh cá vàng to, nhuộm cam (ô *Color* của Sprite); muốn đổi thì thay ảnh trong Sprite. Đã nhặt thì ghi vào ô lưu, vào lại không còn.
- **NPC cửa hàng** (node `ShopNPC`): tạm là Leo nhuộm xám quay mặt trái, hình nằm ở node con `Hinh` (đổi ảnh, kéo, phóng to thoải mái; kéo `ShopNPC` để dời cả NPC).
  Leo đứng gần (ô *Range* = 200) thì hiện bong bóng có phím **Lên** (W / ↑), bấm Lên hoặc chạm bong bóng để mở cửa hàng. Trong lúc mở, mèo đứng yên, không bị đánh.
- **Bảng cửa hàng** (`ShopPage.ts`): trên cùng là số cá bự, cá vàng đang có; giữa là cây kỹ năng 3 hàng. Mũi tên / WASD chọn ô (hoặc rê chuột),
  Enter / Nhảy / Đánh / chạm để mua, Esc (điện thoại: nút ←) để thoát. Ô xanh = đã có, kem = mua được, kem nhạt = chưa đủ cá, xám tối = phải mua ô bên trái trước.
  Mua xong ghi ngay vào ô lưu; mua thêm tim thì hồi đầy tim. Ô lưu đã qua màn mà chơi lại thì bắt đầu từ đầu màn nhưng
  **giữ cá vàng, cá bự và kỹ năng đã mua** (cá bự đã nhặt không hiện lại, cá vàng thì hiện lại).

| Hàng | Ô 1 | Ô 2 | Ô 3 |
|---|---|---|---|
| Kiếm | Sóng kiếm: 1 cá bự + 1000 | Sóng kiếm xuyên: 2 + 3000 | |
| Thân | Thêm 1 tim: 1 + 800 | Thêm 1 tim: 1 + 1500 | Nộ đầy nhanh (+40% nộ mỗi đòn): 1 + 1000 |
| Chiêu | Đập bụng: 1 + 1200 | Mèo Nổ: 2 + 3000 | |

Đổi giá, thứ tự: sửa bảng `UPGRADES` trong `game/Upgrades.ts`. Chữ tên / mô tả: `up.<tên>` trong `ui/Lang.ts`.
Ô lưu cũ (trước khi có cửa hàng) vào lại thì chưa mua gì, 0 cá bự. Biển hướng dẫn **Sóng kiếm** tự ẩn tới khi mua.
NPC và cá bự do bước ⚙ 32 tạo (chỉ khi cả màn chưa có); hiện chỉ có 1 cá bự để thử.

## Boss

Boss **Chihuahua Độc** (`EnemyPatrol` + `BossBrain.ts` + `BossArena.ts`, bước ⚙ 33 gắn sẵn cả hai vào node `Boss` trong scene nên chỉnh các ô trong Inspector là có tác dụng). **150 máu** (ô *Boss Hp* của BossBrain, đặt lúc vào trận rồi nhân theo độ khó).
Đánh **kiểu Cuphead**: mỗi phase một **flow đòn cố định** (không random), đòn nào cũng báo trước bằng **dáng riêng của đòn** (boss không nháy đỏ),
đòn nhắm vào chỗ mèo thì thêm **dấu dưới đất**; càng về sau càng dồn dập.
**Chạm thân boss không mất tim**; chỉ trúng đòn mới mất (thân boss chỉ gây đòn lúc đang lao ngang hoặc đang bay khi nhảy đè).

**Khu boss (`BossArena`)**: chưa vào trận thì boss đứng yên quay mặt sang phải gặm khúc xương (xương vẽ tạm bằng code).
Mèo **rơi xuống chạm đáy hang** (mặt đá boss đứng) là bắt đầu ngay: hai **tường chặn vô hình** ở hai đầu khu (ô *Wall Inset*; đã bỏ dấu X đỏ),
camera giữ trong khu, rồi **cảnh mở màn** (mèo đứng yên, không bị đánh):

| Giây | Việc |
|---|---|
| 0 | Tường chặn bật, **tắt hẳn nhạc thường** (cảnh mở màn không có nhạc) |
| 0.3 | Camera trượt sang boss; boss vẫn quay mặt sang phải **gặm xương** |
| 1.6 | Boss thôi gặm, khựng lại, **dấu ! đỏ** bật lên trên đầu |
| 2.1 | Boss **ngáp dài** 1 giây: vươn người, ngả ra sau, chữ "Haaa~" và "z" bay lên |
| 3.3 | Khúc xương rơi, boss quay đầu về phía mèo, nảy người |
| 3.8 | Boss **sủa** (tiếng sủa `bark`): chữ GÂU!!, vòng sóng từ miệng, rung màn hình |
| 4.4 | Tên CHIHUAHUA ĐỘC + "Chương 1" trượt vào, giữ 1.2 giây, trượt ra |
| 6.5 | **Tên trượt ra hết mới hiện thanh máu** (ngay khi băng tên ra khỏi màn hình): trượt lên từ đáy, đầy dần. Thanh máu **không tự hiện khi mèo tới gần** nữa |
| 7.6 | Camera về mèo; 0.5 giây sau mèo điều khiển lại, boss bắt đầu ra đòn, **nhạc trận boss** (`bgm_boss`) |

Gục rồi vào lại thì chỉ **bản ngắn** ~1.5 giây (dấu !, quay đầu, sủa, thanh máu, đánh). Mốc thời gian là ô nhóm *Mở màn* của BossArena.
Nhạc: nền thường `bgm_forest` (ô *Music* của GameManager), trận boss `bgm_boss` (ô *Boss Music*); hạ boss hoặc gục về checkpoint thì về nhạc thường.
Nhạc (file tên bắt đầu bằng "bgm") không tải cùng tiếng hiệu ứng mà tải riêng khi cần; nhạc boss tải sẵn lúc chiếu mở màn.
Tiếng sủa: thả `bark.wav` (hoặc .mp3) vào `assets/resources/sounds` là tự dùng (ô *Bark Sound*); chưa có thì dùng tiếng đập tạm.
**Hạ boss**: **slow motion** chậm dần còn 15% trong 0.3 giây, giữ 1.2 giây, nhanh dần về bình thường trong 1 giây
(`core/TimeScale.ts`; ô nhóm *Hạ boss*: Slow Low, Slow Hold; không chớp màn hình), camera phóng nhẹ, chữ ĐÃ HẠ BOSS!, tường chặn mở, cờ đích sáng lại và **mũi tên nhấp nháy ở mép màn hình chỉ về cờ**
tới khi thấy cờ. Chạm cờ khi boss còn sống thì hiện chữ "Hạ boss trước đã!". Gục hết trong trận: tường chặn mở, boss về gặm xương, đầy máu.

Mốc phase tính theo phần máu: còn 2/3 sang phase 2, còn 1/3 sang phase 3 (ô *Phase 2 At*, *Phase 3 At*).
**Mỗi phase boss phải ra đủ 2 đòn** thì máu mới tụt qua mốc (phase 3: mới chết được) - ô *Min Attacks Per Phase*. Chém trước đó vẫn trúng nhưng máu dừng ngay trên mốc.

| Phase | Máu | Flow đòn (ra đúng thứ tự, hết thì quay lại đòn 1; vào phase mới bắt đầu từ đòn 1) | Nghỉ giữa hai đòn |
|---|---|---|---|
| 1 | 150 → 101 | Cào vồ → Sủa sóng âm → Phun độc → Nhảy đè | 2 giây |
| 2 | 100 → 52 | Cào vồ → Lướt húc tường tới tường → Bắn gai vòng cổ → Hàm răng bẫy → Bom đầu lâu (1 quả); đi nhanh ×1.3 | 1.6 giây |
| 3 | 51 → 0 | Cào vồ → Gọi bầy chó con → Sấm sét (3 tia) → 6 cột lửa xanh (dồn dập hơn) → **Đòn đôi**; đi nhanh ×1.5 | 1.2 giây |

Thứ tự đòn là bảng `FLOWS` đầu file `BossBrain.ts` (muốn đổi thứ tự thì đổi ở đó).

- Chuyển phase: boss nhảy múa 1.5 giây tại chỗ, nốt nhạc `Boss/Dance` quanh đầu, **bất tử** lúc này; đòn đang dở biến mất.
- Thời gian nghỉ tính từ lúc đòn trước xong, nên từ đầu đòn này tới đầu đòn sau dài hơn số nghỉ.
- Mỗi đòn một nhóm ô trong BossBrain (*Cào gần*, *Sủa sóng âm*, *Nhảy đè*, *Lao ngang*, *Bắn gai*, *Hàm răng*, *Chó con*, *Sấm sét*, *Axit 1–3*).
  Độ khó nhân thời gian báo trước (cột "Boss báo trước" ở bảng độ khó) cho mọi đòn.
- Boss chỉ có 1 ảnh: dáng ra đòn (ngáp, cúi lao, ngả người vồ, run) làm bằng co giãn / nghiêng hình (`EnemyPatrol.pose`).
- Vật của đòn mới (sóng âm, gai, hàm răng, khối đá, chó con) là `BossHazard.ts`, **vẽ tạm bằng code**; chó con dùng ảnh `ve_dog` / `ve_dog_fly` (chưa nạp được thì dùng ảnh boss thu nhỏ).
- Ảnh hiệu ứng trong `art/fx/Boss`: **`Thuner`** (hoặc `Thunder` nếu đổi tên) sét đánh xuống đất ×5.5, **`Impact`** vệt va chạm lặp ở mặt boss suốt lúc lao ngang ×4.5,
  **`Slam`** bụi lấp lánh khi nhảy đè đáp đất ×5.5, **`Warn`** dấu ! nhảy cao hơn đầu mèo ngay trên chỗ sắp đánh (hàm răng, sấm; nhảy đè chỉ có vệt đỏ), trên 6 dấu cột lửa và trên đầu boss lúc mở màn.
- Tiếng boss (`assets/resources/sounds`, file .ogg của bạn): `boss_claw` (cào vồ), `boss_charge` (mỗi đoạn lao ngang), `boss_charge_stun` (đâm tường),
  `boss_toxic` (phun độc), `boss_spike` (mỗi cây gai bắn ra), `spike_land` (mỗi cây gai cắm đất), `jaw_snap` (hàm răng sập), `thunder` (sấm),
  `call dog` (mỗi chó con chạy ra). Còn tiếng tạm tổng hợp bằng code (chép đè cùng tên để thay): `boss_slam` (nhảy đè), `boss_growl` (báo đòn),
  `boss_yawn` (mở màn), `pup_die` (chó con chết).
- **Cào vồ** (đòn thường; vệt móng ảnh `art/fx/Boss/Claw`): boss chúi người **chạy tới sát mèo** (750, ô *Claw Run*; dừng khi mặt boss cách mèo 140, ô *Claw Range*), rồi ngả người 0.5 giây (lúc này **vệt đỏ nhấp nháy dưới đất đúng vùng móng sắp quét**, rộng 420 trước mặt boss, **kèm dấu ! đỏ**) và vồ tới. Lướt / nhảy ra xa là né.
- **Phun độc** (Axit 1): phồng người, ngửa nhẹ 0.4 giây rồi phun cục độc bay vòng cung tới chỗ mèo, chạm đất (hoặc trúng mèo) nổ vũng `Boss/Axit`.
- **Sủa sóng âm**: ngả ra sau, GÂU!!, 3 vòng sóng bay ngang **đẩy mèo lùi** về phía tường (không mất máu; đang lướt thì xuyên qua).
- **Nhảy đè**: vệt đỏ dưới chân mèo (không có !) 0.8 giây trong lúc boss thụp xuống lấy đà, rồi nhảy vòng cung đáp đúng chỗ đó: rung màn, bụi hai bên, quanh chỗ đáp mất tim.
- **Lướt húc (tường tới tường, dễ đoán)**: boss **nhảy về sát một tường, ngẫu nhiên trái / phải** (mèo đứng sát tường đó trong 350 thì đổi tường kia) → **dải đỏ dày ~100 phủ lớp đá sáng của mặt đường**, trải từ chân boss tới tường trong 0.35 giây rồi nhấp nháy, mũi tên » trắng trôi theo hướng lao + **cào đất đúng 3 nhịp**
  trong 1 giây (ô *Shove Windup*) → cúi thấp còn cao 200 (ô *Shove Height*; mèo nhảy cao ~300, nhảy qua được) **lao một mạch** tới tường bên kia
  (tốc độ 1300, phase 3 ×1.25: ô *Shove Phase 3*), không dừng, không đổi hướng. Vệt `Impact` lặp ở mặt boss suốt lúc lao.
  **Tông tường** thì rung màn và **boss choáng 2 giây** (sao xoay, đứng yên, ô *Shove Stun*): lúc chém thoải mái. Mọi phase đều 1 lượt.
- **Bắn gai**: boss **nhảy về sát tường phải** → **vòng cổ nhấp nháy 1 giây** (ô *Collar Blink*) → **5 cây gai** (ô *Spike Num*) bay lên xếp hình quạt
  trên đầu boss, **mũi luôn ngắm mèo, rung 1 giây** (ô *Spike Aim*) → **bắn từng cây, cách nhau 0.5 giây** (ô *Spike Interval*), bay thẳng (650, ô *Spike Speed*)
  tới chỗ mèo lúc bắn. **Hụt** thì gai quay lại **đuổi chậm** (220, ô *Spike Chase Speed*; quay đầu 120°/giây, ô *Spike Turn*) trong 3 giây (ô *Spike Chase Time*)
  rồi rơi vỡ. **Chém trúng gai thì gai bể** (vùng chém trúng ôm trọn cả cây gai, nới thêm 16 mỗi bên); trúng mèo thì mất tim và gai bể; đang lướt thì gai bay xuyên qua. Boss chờ hết gai mới sang đòn kế.
- **Hàm răng bẫy**: boss gầm cúi đầu + vệt đỏ dưới chân mèo + dấu ! phía trên 0.75 giây, rồi hai hàm răng đất trồi lên sập lại đúng chỗ đó.
- **Bom đầu lâu** (Axit 2): boss chồm người lên 0.5 giây (ô *Bomb Windup*), dậm xuống thì bom `Boss/Axit 2` mọc ngay chỗ mèo (phase 3 thêm quả trước mặt mèo); vòng dưới đất là cảnh báo, bốc khói (khung 6–11) mới gây đòn.
- **Chó con**: boss thụp người rồi **nhảy lùi về sát góc phải** khu boss, đứng **sủa liên tục** (WOOF, mỗi tiếng cách 0.9 giây, ô *Pup Bark Gap*), mỗi tiếng sủa 1 chó con chạy (560) tới mèo, tổng 4 con.
  Mỗi con ngẫu nhiên 1 trong 2 loại (mỗi lượt có ít nhất 1 con mỗi loại): **thường** (ảnh `ve_dog`) chạy thẳng trên đất; **bay** (ảnh `ve_dog_fly`)
  vừa chạy vừa **nhảy vọt lên theo nhịp ngẫu nhiên** (0.4–1.1 giây, ô *Pup Hop Min/Max*; cao 150–280, ô *Pup Hop Low/High*). Chém 1 nhát là chết, chạm vào thì mất tim; nhảy qua cũng được.
- **Sấm sét**: boss **đứng yên run bần bật** 1 giây (ô *Thunder Warn*); 3 chỗ hiện vệt đỏ + dấu ! (1 chỗ gần mèo, 2 chỗ ngẫu nhiên, cách nhau ít nhất 350, ô *Bolt Count*, *Bolt Gap*),
  rồi **cả 3 tia sét đánh xuống cùng lúc** (ảnh `Thuner` + vệt sét từ trên trời). Đứng vào khe giữa các dấu là an toàn.
- **6 cột lửa xanh** (Axit 3): boss ngồi thụp, 6 **dấu cảnh báo** (`AcidWarning.ts`) hiện cùng lúc; 1 giây sau (ô *Pillar Warning*) 6 cột lửa `Boss/Axit 3` lần lượt mọc
  từ trái sang phải (phase 3 dồn dập hơn), cột cao hẳn (khung 4–19) mới gây đòn, vùng gây đòn rộng 100: **đứng giữa hai dấu thì không bị trúng**.
- **Đòn đôi** (phase 3): sủa sóng âm đẩy mèo dồn về tường, vừa xong là lao ngang hoặc nhảy đè liền, không nghỉ.
- Dính axit: **trúng độc** 2 giây (`PoisonStatus.ts`), bọt độc quanh mèo, cứ 1 giây rút **nửa tim** (tổng 1 tim). Dính lại khi đang độc thì tính lại 2 giây.
  Không bị đẩy lùi. Đang lướt thì né được axit. Thanh tim hiện được nửa tim.
- Boss chết: đầu lâu nổ `Boss/Death` (×10.5). Quái nhỏ chết: tia nổ `Enemy death` (×3.9).
- **Đích (`Goal`) khoá tới khi boss bị hạ**: cờ mờ, chạm vào không thắng; boss chết thì cờ sáng lại và nảy lên. Tắt bằng ô *Need Boss Defeated* của Goal.
- Số liệu (mốc máu, nhịp đòn, khoảng cách bom, độ dồn cột) là ô của `BossBrain`, nhóm *Phase*, *Nhịp đòn*, *Axit 1/2/3*.
  BossBrain và BossArena nằm sẵn trên node `Boss` (bấm ⚙ một lần nếu chưa thấy): chỉnh số ngay trong Inspector rồi Ctrl+S.

## Điều khiển

Phím mặc định (đổi được trong menu **Esc → Cài đặt → Bàn phím**, lưu trên máy):

| Hành động | Người 1 | Người 2 |
|---|---|---|
| Chạy | A / D | ← / → |
| Đi lên bục một chiều ngay phía trên | W | ↑ |
| Ngồi (giữ, thân thấp xuống, không đi được) | S | ↓ |
| Xuống khỏi bục một chiều: **bấm Xuống 2 lần nhanh** (ô *Down Tap Time* 0.3 giây) | S S | ↓ ↓ |
| Nhảy (giữ lâu nhảy cao, nhả sớm nhảy thấp). Leo nhảy miễn phí | **K** | Num 0 |
| Chém: bấm liên tục ra combo 5 nhát. Giữ đủ 0.8 giây rồi thả: **sóng kiếm** | J | Num 1 |
| **Lướt né** (nút » trên điện thoại, ngay trên nút nhảy) | **Space** (kiểu Mũi tên: Shift phải) | Num 3 |
| **Special** (đầy thanh nộ; kiểu Mũi tên: C) | **L** | Num 2 |

**Game có 4 nút: Đánh (J), Nhảy (K), Lướt (Space) và Special (L)** (kiểu Mũi tên: X đánh, Z nhảy, Shift phải lướt, C special); mọi đòn kết hợp đều từ Đánh / Nhảy với hướng.
Angelo đang tạm tắt, nên Đổi mèo không gán phím; phím Tương tác cũ giờ là phím Lướt. Máy nào đã lưu cài đặt mà chưa có phím Special thì tự gán L (hoặc C). Máy nào còn lưu bộ phím cũ (Space nhảy, K kỹ năng, L tương tác)
thì tự đổi sang bộ mới khi mở game.
| Menu tạm dừng | Esc | Esc |

Cảm ứng: joystick trái/phải để chạy, đẩy lên để đi lên bục, kéo xuống để xuống bục (đế `MG_joystick_base` đứng yên, nút chân mèo
`MG_joystick_knob` chạy theo ngón tay, xa nhất *Knob Travel* = 85; hai ảnh tách từ `MG_joystick`); nút đánh để chém (giữ để gồng sóng kiếm), nút nhảy,
nút » ngay trên nút nhảy để lướt, nút ngôi sao để bật Special. Trên máy tính bật **Touch On Desktop** (Canvas) để thấy nút, nút có ghi phím tương ứng **theo phím Người 1 đang cài** (đổi phím trong Cài đặt thì chữ trên nút đổi theo).

## Menu (Esc hoặc nút bánh răng góc trên phải)

Mở menu thì game dừng. Cùng **kiểu chữ menu chính** (`MenuStyle.ts`): nền tối, tiêu đề + đường hoa văn (ảnh `ui_divider` trong `art`, chưa có thì vẽ tạm),
chữ trắng viền nâu, mục đang chọn có khung chọn `selection.png`; dòng cài đặt (và dòng Thành tích) đang chọn có hai hoa văn
`selection_left` / `selection_right` ở hai đầu dòng. Bấm chọn một mục thì **vệt sáng ngang chữ loé rất nhẹ một lần** (~0.5 giây).
Mở từ menu chính thì nền chỉ tối nhẹ (thấy nền menu), trong game thì tối đậm. Tên trang: OPTIONS (tiếng Việt CÀI ĐẶT).
**Tiếp tục** · **Cài đặt** · **Về menu chính** (hỏi lại "Về menu chính?", dòng phụ "Tiến độ tính tới checkpoint gần nhất", **CÓ / KHÔNG hai hàng**, mặc định KHÔNG).
**Cài đặt / OPTIONS**: **Trò chơi** · **Âm thanh** · **Hình ảnh** · **Điều khiển** · Quay lại (OPTIONS ở menu chính mở thẳng trang này). Mỗi trang con: tên dòng bên trái,
giá trị bên phải, cuối trang **Trả về mặc định** và **Quay lại**. **Chỉnh là áp dụng và lưu xuống máy luôn** (không còn nút Lưu).
**Ngôn ngữ mặc định là tiếng Anh** (máy nào đã lưu tiếng Việt thì giữ tiếng Việt).
- Trò chơi: **ngôn ngữ** (Tiếng Việt / English).
- Âm thanh: **Âm lượng chung** (nhân với hai cái dưới), Tiếng hiệu ứng, Nhạc nền; thanh ngang + số 0–10, A/D chỉnh từng nấc, kéo trên thanh cũng được.
- Hình ảnh: Toàn màn hình (máy tính), Rung màn hình.
- Điều khiển: dòng đầu **Kiểu phím** là hai nút tròn (radio) **WASD** / **Mũi tên** (A/D hoặc bấm thẳng vào từng lựa chọn; rê chuột cả dòng đều chọn được), chọn **WASD** (A/D, W, S, J chém, K nhảy) hoặc **Mũi tên** (←/→, ↑, ↓, X chém, Z nhảy);
chơi 2 người thì Người 2 tự lấy kiểu còn lại. Vẫn đổi lẻ từng phím được (bấm vào ô rồi bấm phím mới; phím đang dùng chỗ khác thì hai phím đổi chỗ),
khi đó Kiểu phím ghi "Tuỳ chỉnh"; có nút Trả về mặc định. **Chơi 1 người chỉ nhận phím của Người 1** (theo kiểu đã chọn). Mọi cài đặt lưu trên máy (`Settings.ts`).
**Mọi bảng chọn được bằng bàn phím** (`MenuNav.ts`): W/S hoặc ↑/↓ chọn, A/D hoặc ←/→ chỉnh thanh âm lượng, công tắc, ngôn ngữ; Enter / Space bấm; Esc quay lại.
Rê chuột lên ô cũng chọn ô đó.
**Chữ hai ngôn ngữ**: mọi chữ trong game nằm ở `ui/Lang.ts` (mỗi dòng có tiếng Việt và tiếng Anh). Đổi ngôn ngữ thì chữ đổi ngay.
Menu và màn chọn vẽ tạm bằng code (`UiKit.ts`). Chữ có dấu tiếng Việt dùng font hệ thống vì font Super Bouncer thiếu nhiều chữ có dấu.

**Thanh nộ** (thanh xanh dưới hàng tim, tối đa 100): **bắt đầu màn rỗng, không tự hồi**; mỗi nhát chém / sóng kiếm / chém hất / quét chân **trúng địch +5**
(~20 nhát là đầy; ô *Rage On Hit*). Đầy thì thanh **nhấp nháy vàng, phồng nhẹ** và kêu một tiếng: bấm **L** (mũi tên: C) bật special 8 giây (thanh vàng cam, tụt dần),
lúc đang bật không nạp thêm. Mọi thứ khác (chạy, nhảy, lướt, combo, sóng kiếm, chiêu) đều **miễn phí**.

## Animation (ảnh nhiều khung)

- **Hiệu ứng bật ra rồi tự biến mất** (khói, bụi, tia...): flip-book bằng code (`DustPuff.ts`). Ảnh đánh số trong `assets/resources/art/fx`,
  ví dụ `FX_run_1.png`, `FX_run_2.png`..., đổi khung 20 lần/giây rồi tự xoá.
  Muốn đổi thì chép ảnh mới đè đúng tên; thêm hay bớt khung cũng được, code tự đếm theo số trong tên.
  Ảnh pixel art được giữ sắc nét khi phóng to (lọc NEAREST, không gộp atlas).
- **Khói của mèo** (`RunDust.ts`, game tự gắn vào Leo), bộ khói pixel *SmokeFX Lite*:
  - chạy nhanh ít nhất 0.18 giây thì cứ 0.22 giây (ô **Run Interval**) tung một đám bụi nâu sau gót (`FX_run_`);
  - đang chạy mà thả phím hay quay đầu thì một đám bụi tròn ở mũi chân (`FX_skid_`);
  - nhảy lên từ mặt đất: vòng bụi nhỏ ở chỗ chân vừa rời đất (`FX_takeoff_`); bước hụt khỏi mép thì không có;
  - đáp đất thường (nhảy 1 lần, rơi thấp, đủ mạnh theo ô **Land Impact**): cũng vòng bụi nhỏ (`FX_takeoff_`);
  - đáp đất sau khi nhảy 2 lần, sau khi đập bụng, hoặc rơi từ cao 500 trở lên tính từ đỉnh cú nhảy (ô **Big Fall Height**): vòng bụi lớn (`FX_land_`);
  - Leo nhảy lần 2 trên không: vòng nổ trắng dưới chân (`FX_airjump_`).
  Ô **Scale** (bụi chạy, bụi trượt; Leo 4.5) và **Jump Scale** (các vòng bụi; Leo 3.5).
- **File gốc bộ khói** nằm ở `art-nguon/SmokeFX` (ngoài `assets` để không vào bản build; file nguồn không dùng tới nằm ở `art-nguon/khong-dung`).
  Mỗi file PNG ở đó là một dải nhiều ô. Muốn đổi dải nào dùng cho việc nào: sửa bảng `JOBS` trong `tools/cat_khoi.py`, chạy
  `python tools/cat_khoi.py` để đo thử, rồi `python tools/cat_khoi.py --ghi` để cắt ra `art/fx` (ghi đè ảnh cũ cùng tên).
- **Vệt chém của Leo**: combo J và chém hất dùng bộ *Pixel Art Animations - Slashes* (128×128) trong `art/fx/Character/Normal Atk` (`Slash_color1` A/B, `Slash3_color1` kết liễu, `Slash2_color1` chém hất),
  lúc special dùng bản màu đỏ trong `art/fx/Character/Special` (`…_color2`). Bộ *SlashFX Combos* (file gốc `art-nguon/SlashFX`)
  chỉ dùng vệt `FX_cut3_` lúc phóng sóng kiếm; `FX_sweep_` quét chân;
  Lướt: dáng cúi người (`PlayerVisual.setDash`) + bóng mờ nối đuôi + đường gió trắng vẽ bằng code + bụi `FX_run_` lúc đạp đi và lúc phanh.
  `FX_wave_` sóng kiếm (`SwordWave.ts`, phóng ra cách mèo 220, ngang ngực).
  `FX_charge_` gồng sóng kiếm ở giữa thân mèo, phóng to ×2.5 (`ChargeFx.ts`, cắt từ `art-nguon/ChargeFX`): giữ J quá 0.15 giây thì khung 1 → 4 lớn dần,
  đủ lực thì chớp bằng chính hình gốc (khung 3 ↔ 4) tới khi thả J; thả sớm thì xì hơi (khung 5 → 8, vòng tan). Chưa có ảnh thì dùng vòng sáng vẽ bằng code.
  Cùng lúc đó hào quang `Hold/frame*` lặp dưới chân (sau hình mèo, ×3) tới khi buông J.
- **Ảnh để trong thư mục con của `art/fx`** (tên `frame0, frame1...`, đánh số từ 0): code gọi bằng tên thư mục, ví dụ `Boss/Axit 2/frame`.
  `Boss/Axit` (vũng axit nổ), `Boss/Axit 2` (bom đầu lâu), `Boss/Axit 3` (cột lửa xanh), `Boss/Dance` (nốt nhạc chuyển phase),
  `Boss/Death` (đầu lâu nổ khi boss chết), `Boss/Poison` (bọt độc quanh mèo), `Enemy death` (tia nổ khi quái nhỏ chết), `Hold` (giữ J).
  Vị trí, độ phóng to, lật ngang, vẽ sau lưng mèo của từng nhát: bảng `IMAGE_STYLES` trong `SlashFx.ts`
  (nhát 1 và 5 lật ngang; nhát 1, 3 và 5 vẽ sau mèo, trên node `SlashBack` nằm dưới hình mèo).
- **Hiệu ứng kỹ năng khác của Leo** (cắt từ tấm sprite sheet, mỗi ô 64×64): `FX_hit_` / `FX_hitbig_` trúng đòn thường / nhát mạnh (`HitSpark.ts`),
  `FX_ring_` vòng sóng + `FX_spike_` gai đất hai bên khi đập bụng (`LeoSkills.ts`), `FX_stun_` sao xoay trên đầu địch bị choáng (`EnemyPatrol.ts`),
  `FX_swirl_` lá xoáy lúc gồng + `FX_burst_` vụ nổ + `FX_shock_` vòng sóng của Mèo Nổ (`LeoSkills.ts`).
  Số liệu hai đòn mới ở LeoSkills, nhóm *Chém hất* và *Mèo Nổ*.
  Thiếu ảnh bộ nào thì bộ đó tự quay về hình vẽ bằng code như cũ.
- **Nhân vật**: PlayerVisual có ô *Run Frames* (nhiều khung chạy thì tự thành flip-book), *Jump Frame*, *Fall Frame*.
- **Thứ đứng yên lặp mãi** (cờ bay, đèn nháy): làm bằng Animation Clip trong cửa sổ Animation của Creator.

## Âm thanh

Mọi tiếng nằm trong `assets/resources/sounds`. Một phần là tiếng thật (.ogg) bạn thêm, phần còn lại là tiếng tạm tổng hợp bằng code (`ui_*` tạo bằng `python tools/tao_tieng_ui.py assets/resources/sounds`); muốn thay thì chép file mới
(.wav, .mp3 hoặc .ogg) **đè lên với cùng tên**, không cần sửa code. Âm lượng và tên bài nhạc nền chỉnh ở GameManager (Canvas), nhóm "Âm thanh".

| File | Khi nào phát |
|---|---|
| `bgm` | Nhạc menu (từ lúc tải xong tới hết màn hướng dẫn) |
| `bgm_forest` / `bgm_boss` | Nhạc màn chơi (sau hội thoại mở đầu) / trận boss |
| `ui_move` | Dời lựa chọn (menu chính, ô lưu, mọi bảng chọn bằng phím / rê chuột) |
| `ui_click` / `ui_back` | Bấm nút / quay lại, huỷ (mọi nút vẽ bằng `uiButton`, phím Esc trong bảng) |
| `ui_deny` | Không được (chạm cờ đích khi boss còn sống, hỏi xoá ô lưu) |
| `ui_delete` / `ui_saved` | Xoá ô lưu / đạt thành tích |
| `ui_start` | Bấm nút START |
| `ui_zoom_in` / `ui_zoom_out` | Màn đen thu lại / nở ra |
| `ui_page` / `ui_text` | Lật trang truyện / chữ thoại hiện dần |
| `ui_door` | Ra cửa EXIT màn hướng dẫn |
| `jump` | Mèo bật nhảy (cả leo bục bằng W); chạm đất không kêu |
| `land` / `drop` | Đáp đất mạnh của chiêu, boss / xuống khỏi bục |
| `slash1` / `slash3` | Nhát combo 1–4 (và quét chân S+J) / nhát 5 kết liễu (và sóng kiếm) |
| `slash_up` | Chém hất W+J |
| `special_on` / `special_off` | Bật special (L / C): mỗi vòng sáng của hào quang kêu `special_on` 1 lần, vòng cuối kêu `special_off` |
| `hit` | Chém trúng kẻ địch |
| `dash` | Lướt né (phím Lướt) |
| `Run 1` / `Run 2` | Tiếng bước chân lúc chạy, luân phiên theo nhịp nhún |
| `hurt` | Mèo bị đánh |
| `enemy_die` | Kẻ địch gục |
| `coin` / `heal` / `checkpoint` | Nhặt cá / nhặt chai nước / chạm điểm hồi sinh |
| `win` / `lose` | Về đích / hết máu |

## Cấu trúc code

`assets/scripts/` có 7 thư mục; mỗi file nhiều nhất một component, tên file trùng tên class:

- `camera/`: `CameraRig` (bám nhân vật, kiểu Hollow Knight, giới hạn màn, rung màn hình), `ParallaxLayer` (lớp cảnh trôi theo hệ số).
- `core/`: va chạm tự viết (`Box`, `Solid`, `PlatformerBody`, `ColliderDebug`), `Hittable` (thứ chém trúng được), `HitStop`, `TimeScale` (slow motion), `Sound`, `Settings` (cài đặt và phím), `Difficulty`, `Silhouette` (vật liệu tô một màu).
- `enemy/`: `EnemyPatrol` (địch đi tuần, cũng là thân boss), `BossBrain` (phase, flow đòn), `BossArena` (khu boss, cảnh mở màn, hạ boss), vật của đòn boss (`BossHazard`, `AcidGlob`, `AcidHazard`, `AcidWarning`).
- `game/`: `GameManager` (máu, hồi sinh, thắng / thua, cá bự, mua kỹ năng), `GameSession`, `SaveSlots`, `Upgrades` (cây kỹ năng), `Achievements`, `Records`.
- `level/`: dựng và sửa màn (`DemoLevelBuilder`, `DemoLayout`, `DemoReference`); nền và cảnh (`GroundBlock`, `PlaceholderBox`, `SkyGradient`, `RiverFlow`, `PinToScreenTop`, `LeafCanopy`); ánh sáng (`LightRays`, `SoftGlow`, `CoinGlow`, `DustMotes`, `DustDrift`); vật phẩm và vùng chạm (`PlayerTrigger`, `CoinPickup`, `BigFishPickup`, `HealPickup`, `Hazard`, `Checkpoint`, `Goal`, `ShopNPC`); màn hướng dẫn (`TutorialRoom`, `TutorialSign`, `TutorialBlock`, `TutorialExit`, `TrainingDummy`).
- `player/`: `PlayerInput`, `PlayerController` (chạy, nhảy, combo, lướt, sóng kiếm, thanh nộ), `LeoSkills` (qua giao diện `CatSkills`), `PlayerVisual`, `PoisonStatus`; hiệu ứng (`SlashFx`, `SwordWave`, `ChargeFx`, `HitSpark`, `DustPuff`, `RunDust`, `SkillFx`); phần Angelo đang tạm tắt (`AngeloSkills`, `FollowerAI`, `SoulWisp`, `YarnRope`).
- `ui/`: HUD (`HeartsHUD`, `EnergyBar`, `CoinCounter`, `BossHealthBar`, `TouchControls`, `KeyCap`); mở game và menu chính (`BootScreen`, `LandingScreen`, `SaveSlotPage`, `DifficultyPage`, `CharacterSelect`, `StoryPages`, `DialogueBox`, `LoadingScreen`, `PatternBackdrop`, `IrisWipe`, `ScreenFade`, `Letterbox`, `LogoShine`, `MenuDust`); bảng trong game (`PauseMenu`, `ShopPage`, `GameOverScreen`, `ResultsScreen`, `AchievementsPage`, `AchievementToast`, `SaveIcon`, `PawIcon`); dùng chung (`UiKit`, `MenuNav`, `MenuStyle`, `GameFont`, `Lang`).

## Quy ước quan trọng

- **Mỗi file script chỉ chứa một component** (`@ccclass` kế thừa Component). Đây là quy định của Cocos.

- **Cấu trúc lớp** dưới Canvas (số trong ngoặc là hệ số trôi ngang): `Sky` → `BG` (0.3) → `Light_Far` (0) → `MG` (0.8) → `Filter` (0) → `River` (0.9) → `Light` (0.9) → `Gameplay` (1) → `FR` (1.35) → `FR_Top` (1.35) → `HUD`.
  `FR_Top` chứa đồ treo trên cao (băng rôn): Factor là (1.35, 0), tức trôi ngang nhưng đứng yên theo chiều dọc,
  để mép trên không bị hở khi camera lên xuống. Đồ nào cần dính mép trên màn hình thì đặt vào lớp này.
  Băng rôn, cờ trong lớp này có component **PinToScreenTop**: mép trên luôn sát mép khung hình, kéo ngang được còn độ cao do component giữ.
  Muốn cao hay thấp thì đổi **Overlap**. Băng rôn mới thêm vào thì bấm "⚙ Cập nhật" trên Canvas để ghim.
  Mọi thứ có va chạm (Solid, PlatformerBody, trigger) phải là **con trực tiếp của lớp Gameplay**.
- **Gốc nhân vật và đồ vật ở chân** (anchor 0.5, 0). Hộp va chạm của nhân vật đặt `offset.y = size.height / 2`.
- Camera không di chuyển Camera thật mà dịch các lớp ngược lại, vì vậy HUD luôn đứng yên.

## Chỉnh khung va chạm

Node `Gameplay` có component **ColliderDebug**, vẽ khung va chạm **ngay trong khung Scene của editor**:
xanh lá là bục đặc, xanh dương là bục một chiều, hồng là nhân vật/kẻ địch, vàng là vùng chạm (cá, vật phẩm, nón, cờ).

| Loại | Component | Chỉnh |
|---|---|---|
| Đồ đứng lên được | **Solid** | `Size` (rộng, cao), `Offset.y = Size.y / 2` để đáy hộp nằm ở chân đồ vật |
| Mèo, chim, boss | **PlatformerBody** | `Size`, `Offset.y = Size.y / 2` |
| Cá, chai nước, nón, cờ | **CoinPickup / HealPickup / Hazard / Checkpoint / Goal** | `Size`, `Offset` |

`Size` tính theo đơn vị của lớp Gameplay, **không nhân theo Scale** của node. `Size = 0, 0` thì tự lấy theo khung hình.
Muốn thấy khung cả khi chơi thì bật **Debug Colliders** trên DemoLevelBuilder.

## Chỉnh cảm giác chơi

Chọn node `Player` khi đang Play, các thông số nằm trong PlayerController:

| Thông số | Mặc định | Ý nghĩa |
|---|---|---|
| Move Speed | 520 | tốc độ chạy |
| Jump Speed | 1250 | lực nhảy (nhảy cao khoảng 300) |
| Coyote Time | 0.1 | thời gian vẫn nhảy được sau khi rời mép |
| Jump Buffer | 0.12 | bấm nhảy sớm vẫn được tính |
| Jump Cut Multiplier | 0.45 | nhả nút sớm thì nhảy thấp bao nhiêu |
| Fall Gravity Multiplier | 1.6 | rơi nhanh hơn lúc lên |

## Chỉnh camera

**Đừng chỉnh node `Camera` nằm dưới Canvas.** Khi chạy, Canvas tự đặt lại vị trí và độ phóng của camera đó,
và game cũng không dùng nó để bám nhân vật. Hãy chỉnh component **CameraRig** trên node **Canvas**:

| Thông số | Ý nghĩa |
|---|---|
| Zoom | lớn hơn 1 là gần hơn, nhỏ hơn 1 là thấy rộng hơn (HUD không bị phóng theo). **Đang dùng 0.7** (khung hình ~2740 × 1540 đơn vị game, bước ⚙ 34), cả màn mở đầu, màn hướng dẫn và khu boss |
| Offset | x dương: nhìn về phải nhiều hơn. y dương: nhìn cao hơn, mặt đất thấp xuống. **Offset Y = 33**: mép dưới khung hình khớp đúng mép dưới tile đất (nút 📐 đặt số này, `DEMO_CAMERA_OFFSET_Y` trong `DemoLayout.ts`) |
| Look Ahead | nhìn trước theo hướng chạy |
| Damping X / Y | độ bám (lớn thì bám sát, nhỏ thì trễ và mượt) |
| Follow Jump | tắt (mặc định): camera không nhảy theo, chỉ đổi độ cao khi mèo đứng lên bục cao hơn hoặc rơi xuống |
| Jump Dead Zone | mèo bay cao quá mức này so với chỗ đứng thì camera mới đi lên |
| Min X / Max X | mép trái và phải của màn, camera không đi quá |
| Min Y / Max Y | giới hạn camera lên xuống |

**Kiểu Hollow Knight** (nhóm ô *Kiểu Hollow Knight*, bật sẵn; tắt ô *Hk Style* thì camera chạy như bảng trên):

| Thông số | Ý nghĩa |
|---|---|
| Hk Style | bật: camera đi theo chiều dọc, lệch theo hướng quay mặt, chúi xuống ở mép vực, giữ phím để nhìn xuống / lên |
| Hk Max Y | camera lên cao tối đa (thay cho Max Y). Không xuống thấp hơn Min Y (0 = mặt đường) |
| Jump Zone | 120: nhảy thấp thì camera đứng yên, bay cao hơn chỗ đứng quá mức này mới trôi lên; đáp lên chỗ cao thì camera nâng lên, rơi xuống thì camera bám nhanh gấp đôi |
| Face Shift / Face Time | 220 / 0.8 giây: camera lệch về hướng mèo quay mặt (thay cho Offset X và Look Ahead), quay đầu thì trôi dần sang hướng mới |
| Ledge Look / Ledge Dist | 250 / 150: đứng gần mép vực (trước mặt 150 không có nền) và quay mặt ra vực thì camera chúi xuống 250 |
| Hold Look / Hold Delay | 260 / 0.6 giây: giữ Xuống (ngồi) thì nhìn xuống, đứng yên giữ Lên thì nhìn lên |

Trận boss: khu boss khoá camera cả ngang lẫn dọc (không nhảy theo, không nhìn xuống), mở lại khi hạ boss / gục.

Muốn mặt đất nằm cao hay thấp trên màn hình thì có thể kéo cả 4 node lớp `BG`, `MG`, `Gameplay`, `FR` lên hoặc xuống,
hoặc dùng `Offset.y`.

**Xem đúng khung hình lúc chơi ngay trong editor:** chọn Canvas → CameraRig → tích **"Xem trước camera"**,
rồi kéo thanh **"Vị trí camera"**. Khung tím của Canvas sẽ hiện đúng cảnh lúc chơi tại vị trí đó (đã tính parallax và zoom).
Vị trí camera ứng với 4 khung ảnh demo: **660, 2580, 4500, 6420**.
Muốn kéo cả một lớp (`BG`, `MG`, `Gameplay`, `FR`...) lên xuống thì tắt xem trước trước khi kéo.
Đồ vật bên trong các lớp thì kéo thoải mái lúc đang xem trước.

**HUD (avatar + trái tim) không đi theo camera.** HUD được neo vào góc trên trái bằng component **Widget**
(Top, Left = 30; UITransform Anchor = (0, 1)). Muốn dời HUD thì chỉnh Top/Left của Widget, không chỉnh camera.

## Đăng bản chơi thử lên itch.io (để dành, chưa làm)

1. **Dọn scene:** Canvas → DemoLevelBuilder → bỏ tích **Debug Colliders**. Tắt node **`image 1465`** (ảnh demo tham khảo). Ctrl+S.
2. **Build:** Project → Build → New Build Task → **Web Mobile**, Start Scene `Main`, bỏ tích Debug → Build.
   Kết quả nằm ở `build/web-mobile` (đã nằm trong `.gitignore`).
3. **Nén zip** sao cho `index.html` nằm ngay ngoài cùng file zip, không bọc trong thư mục `web-mobile`.
4. **itch.io:** Upload new project → Kind: **HTML** → tải zip → tích *This file will be played in the browser* →
   Embed **1280 × 720**, bật Fullscreen button + Mobile friendly (Landscape) →
   Visibility: **Draft** để thử, **Restricted** hoặc đặt mật khẩu để chỉ bạn bè chơi.

Không gửi zip để mở `index.html` trực tiếp từ ổ đĩa, vì game web cần chạy qua một trang web.

## Việc nên làm tiếp

Xem [GHI-CHU-LAM-TIEP.md](GHI-CHU-LAM-TIEP.md): trạng thái hiện tại, việc còn lại và quy tắc khi sửa.
