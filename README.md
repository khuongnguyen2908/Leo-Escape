# Phố Mèo: khung game platform 2D (Cocos Creator 3.8)

Khung game đi cảnh từ trái sang phải, viết sẵn các phần: điều khiển mèo có coyote time và jump buffer, hoạt ảnh bằng tween,
bục một chiều, camera bám theo, parallax 4 lớp, kẻ địch đi tuần, boss, máu dạng trái tim, vật phẩm, checkpoint, đích và nút cảm ứng.
Va chạm do code tự tính, **không dùng Box2D**, nên không cần bật module vật lý.

## 1. Mở project

1. Cài **Cocos Dashboard**, rồi cài **Cocos Creator 3.8.x** (bản 3.8 nào cũng được, Creator sẽ tự nâng cấp project).
2. Trong Dashboard chọn **Add / Import** rồi trỏ tới thư mục này (`D:\Game\Cocos game`).
3. Mở lần đầu Creator sẽ tự sinh `library/`, `temp/`, `settings/` và các file `.meta`.

## 2. Thả asset vào

Copy toàn bộ ảnh PNG vào **`assets/resources/art/`** và giữ nguyên tên file (`MG_char_idle.png`, `MG_tile_2.png`, `FR_cotduong.png`...).

- Chọn tất cả ảnh trong Creator, ở Inspector kiểm tra **Type = sprite-frame** rồi bấm Apply.
- Tên có dấu như `AS_câyquất` hay `FR_cờ` vẫn nhận được vì code tự bỏ dấu. Tuy vậy **nên đổi sang không dấu**
  (`AS_cayquat`, `FR_co`, `FR_cotcam`) để tránh lỗi khi build ra Android hoặc iOS.
- Ảnh nào chưa có thì game hiện khối màu kèm tên, nên chạy được ngay cả khi chưa có ảnh nào.
  Danh sách ảnh còn thiếu được in ra trong Console.

## 3. Tạo scene và chạy

1. Vào **Project → Project Settings → Project Data**, đặt Design Resolution là **1920 × 1080**, chọn **Fit Height**.
2. Ở cửa sổ Assets, chuột phải vào `assets/scenes` → **Create → Scene**, đặt tên `Main`, rồi mở scene đó.
3. Trong Hierarchy, xoá `Main Light`. Chuột phải → **Create → UI Component → Canvas**.
4. Chọn node **Canvas** → **Add Component** → tìm **DemoLevelBuilder**.
5. Lưu scene (Ctrl+S) rồi bấm **Play** ▶.

Tuỳ chọn trên DemoLevelBuilder:
- `Debug Colliders`: vẽ khung va chạm. Xanh lá là bục đặc, xanh dương là bục một chiều, hồng là nhân vật.
- `Touch On Desktop`: hiện nút cảm ứng trên máy tính để thử.

## 4. Đưa màn vào editor để tự sắp xếp

1. Chọn node **Canvas**, ở ô DemoLevelBuilder **tích vào "⟳ Dựng màn từ đầu"** (scene còn trống thì dựng ngay).
2. Hierarchy sẽ hiện các node `Sky`, `BG`, `MG`, `Gameplay`, `FR`, `HUD`, `TouchControls`. Mở ra là thấy từng món đồ.
3. Kéo thả, đổi kích thước, xoá hoặc nhân bản (Ctrl+D) tuỳ ý. **Nhấn Ctrl+S** để lưu.
4. Lần sau bấm Play, game dùng đúng màn bạn đã xếp và không dựng lại nữa.

Lưu ý khi sắp xếp:
- Khối nền đá (`Ground`) có component **GroundBlock**: đổi `Width` để dài ngắn, kéo node để đổi chỗ và độ cao.
- Đồ đứng lên được có component **Solid**. Kích thước vùng va chạm (`Size`) không tự đổi theo khi bạn scale hình, nhớ chỉnh lại Size.
  Bật `Debug Colliders` rồi Play để thấy khung va chạm.
- Lớp `MG`, `BG`, `FR` trôi theo parallax nên trong editor nhìn lệch so với lúc chơi. Đó là bình thường.
- **Scene là bản chính.** DemoLevelBuilder có 3 nút:
  - **"⚙ Cập nhật (giữ phần bạn xếp)"**: nút dùng hằng ngày. Áp bản sửa mới của code và thêm những gì còn thiếu,
    không dời, không xoá gì bạn đã xếp. Bấm bao nhiêu lần cũng vậy. Danh sách việc đã làm hiện trong Console. Nút này lo:
    - ánh sáng: lớp `Light_Far` (sương sáng nền xa), lớp `Light` (tia nắng `TiaNang`, bụi sáng `BuiSang`), node `HaoQuang` sau mỗi con cá mới;
    - xoá hào quang của cá đã bị xoá;
    - ghim băng rôn, cờ mới thêm vào `FR_Top` sát mép trên;
    - màn mở đầu (node `Landing`) nếu chưa có, và menu chính trong đó nếu chưa có (xem mục "Vào game");
    - ảnh thanh năng lượng, nút nhảy, nút đánh nếu ô ảnh còn trống;
    - độ lún mép đá theo số đo ảnh demo, chai nước đứng trên mặt đường, chim/boss/cá vẽ trên đồ vật;
    - Angelo (nhân bản từ Leo, đặt sau lưng Leo) và HUD của Angelo ở góc trên phải, nếu chưa có;
    - thùng giấy + viên gạch (`mg_up`) và thùng rác chặn cả hai bên (không đi xuyên, phải nhảy lên), khung va chạm ôm đúng hình.
      Viên gạch có Solid thứ hai trên cùng node. Số đo nằm trong `SOLID_PROPS` (DemoLevelBuilder.ts); muốn thêm đồ khác thì thêm vào đó.
  - **"📐 Xếp lại theo ảnh demo"**: đặt lại vị trí, kích thước của đồ vật, cây, chim, boss, mèo, nền đá và độ cao camera
    cho khớp 4 ảnh demo. **Phần bạn đã tự kéo sẽ mất.** Số liệu nằm trong `DemoLayout.ts`, đo bằng cách dò từng ảnh gốc
    trên ảnh demo (ảnh demo vẽ mọi thứ đúng cỡ gốc, tỉ lệ 1). Băng rôn đã ghim thì giữ độ cao của ghim.
    Không tạo, không xoá node, chỉ thêm node `DemoRef` nếu chưa có.
  - **"⟳ Dựng màn từ đầu"**: scene trống thì dựng ngay. Đã có màn thì phải tích **"Cho phép xoá màn đang có"** trước:
    các lớp cũ bị xoá và dựng lại, phần đã tự sắp xếp sẽ mất. **Commit scene lên Git trước** để lỡ tay còn lấy lại được.

  Ánh sáng vẽ hoàn toàn bằng code, không dùng ảnh. Tia nắng chỉnh trong component **LightRays**: Length, Angle, Spread, Shafts, Color (alpha là độ sáng).
  Sương và hào quang chỉnh trong **SoftGlow**: Size, Color. Bụi sáng chỉnh trong **DustMotes**.
- Vị trí đồ vật trong màn mẫu đo theo 4 ảnh demo 1280×720 (1px = 1.5 đơn vị game), xem hàm `demoX` trong `DemoLevelBuilder.ts`.
- **So với ảnh demo:** chọn node `DemoRef`, tích **Hiện ảnh demo**, kéo **Khung** 1–4 (camera xem trước tự nhảy tới đúng chỗ),
  chỉnh **Độ đậm**. Ảnh nằm ở `assets/ref/`, chỉ hiện trong editor và không vào bản build.
- Nếu Ctrl+S không lưu (tên scene không có dấu `*`), kéo nhẹ một node bất kỳ rồi lưu lại.

## Vào game: 1 người hay 2 người

> **Đang tạm tắt Angelo.** Ô **Bật Angelo** trên GameManager (node Canvas) đang bỏ tick. Khi chơi, Angelo và tim của Angelo
> bị ẩn và không có chọn 1/2 người: NEW GAME vào thẳng với Leo. Trang phím chỉ hiện cột Người 1 và không có dòng Đổi mèo.
> Angelo vẫn nằm trong scene; tick lại ô này rồi Ctrl+S là có lại mọi thứ bên dưới.

Màn mở đầu là **menu chính**: logo, NEW GAME, OPTIONS, ACHIEVEMENTS, CREDITS, QUIT, dòng bản quyền ở đáy.
W/S hoặc ↑/↓ (rê chuột cũng được) để dời khung chọn; Enter, Nhảy, Đánh hoặc chạm để chọn.
- **NEW GAME** → chọn **1 NGƯỜI** hoặc **2 NGƯỜI** (điện thoại vào thẳng 1 người). Esc quay lại menu.
- **OPTIONS** mở trang Cài đặt (âm lượng, toàn màn hình, rung, bàn phím). Quay lại / Esc là về menu.
- **ACHIEVEMENTS**, **CREDITS** chưa làm: hiện chữ "COMING SOON".
- **QUIT** hỏi lại YES / NO. Bản build ra máy tính, điện thoại thì thoát thật. Bản web: trình duyệt không cho game tự đóng tab
  mở từ itch.io, nên game thoát toàn màn hình, tắt nhạc, hiện "THANKS FOR PLAYING!" kèm nút BACK TO MENU.
- Node trong `Landing` (nút ⚙ tạo, kéo chỉnh thoải mái): `MenuBg` (ảnh `Background`), `Logo/Pic` (ảnh `logo`),
  `Menu` gồm `Selection` (ảnh `selection`) và 5 dòng `NewGame`, `Options`, `Achievements`, `Credits`, `Quit`, rồi `Copyright`.
  Khung chọn giữ đúng khoảng lệch với dòng đầu như bạn đặt. Tắt một dòng (bỏ tích node) là menu bỏ qua dòng đó.
  Chữ trắng cỡ 60 viền 4px #462c22; chữ nâu nhỏ #968787 cỡ 30 viền 3px #2c1d17. Node `Start` (nút START cũ) chỉ bị tắt, không xoá.
- **1 người:** điều khiển Leo. Bấm **Đổi mèo** (Tab, hoặc nút hai mũi tên trên điện thoại) để chuyển sang Angelo: một linh hồn
  phát sáng (màu của con được chọn) bay vòng từ con cũ sang con mới (`SoulWisp.ts`). Bấm bộ phím của Người 1 hay Người 2 đều được.
  Con không được điều khiển **tự đi theo** sau lưng, tự nhảy lên bục / qua hố, tự chém địch ở gần, nhưng không lướt, không dùng kỹ năng,
  không kéo dậy (`FollowerAI.ts`). Nó bị đánh nhưng luôn còn ít nhất 1 tim; kẹt, rơi vực hoặc tụt lại quá xa thì hoá linh hồn bay tới.
- **2 người:** màn chọn mèo. Mỗi người bấm trái/phải để đưa thẻ (N1, N2) tới dưới con mèo muốn chơi, bấm **Nhảy** để chốt, **Xuống** để bỏ chọn.
  Hai người chốt xong thì đếm 3-2-1 rồi vào game. Hai con không đi xa nhau quá một màn hình (`Max Gap` trên GameManager).
- Mỗi con một dãy tim và một thanh năng lượng (Leo góc trên trái, Angelo góc trên phải). Hết tim thì **gục**;
  con kia tới gần, **giữ phím Tương tác 1 giây** để kéo dậy (còn 2 tim). Cả hai cùng gục thì thua.
- Thua rồi chơi lại thì giữ nguyên số người và mèo đã chọn. Menu → **Về màn hình chính** thì chọn lại từ đầu.
- **Angelo tạm** là Leo nhuộm xám xanh, bóp gầy (ô *Tint*, *Width Scale* trên PlayerVisual của node `Angelo`).

## Kỹ năng hai con mèo

| | Leo (`LeoSkills.ts`) | Angelo (`AngeloSkills.ts`) |
|---|---|---|
| Nhảy | Nhảy thường | **Nhảy thêm 1 lần** trên không. Đang bay đẩy vào tường thì **bám tường** trượt chậm, Nhảy để **bật tường** |
| Đánh (J) | Chém combo, giữ để lướt chém. **Giữ Lên + J** dưới đất: **chém hất**, cơn lốc hất địch bay lên (tốn 20); nhảy theo chém tiếp thì địch lơ lửng (chém trúng trên không thì Leo cũng nảy nhẹ lên, ô *Air Hit Lift*), đang bay thì địch không đánh mèo, rơi xuống choáng 0.4 giây. Boss không bị hất. Đứng ngay dưới bục một chiều thì bấm W sẽ nhảy lên bục trước | **Quất dây len**, tầm xa gấp đôi Leo |
| Kỹ năng (K) | Đang bay: **đập bụng** lao xuống, sóng chấn đánh địch xung quanh và làm chúng **choáng** 1.5 giây; rơi càng cao sóng càng rộng (tối đa ×1.6 khi rơi từ cao 600). Dưới đất: **nằm ngửa làm đệm** (K lần nữa để dậy); Angelo rơi trúng bụng thì bật rất cao | Bấm: **trói chân** địch gần nhất 2 giây (boss ngắn hơn), địch đứng yên và không đánh ai. Giữ: **nằm lì** / đứng dậy |
| Tuyệt chiêu (giữ Xuống + K) | **Mèo Nổ**: cần đầy 100 năng lượng, tốn hết. Gồng 0.6 giây (bất tử) rồi nổ: mọi kẻ địch đang thấy trên màn hình mất 3 máu, văng ra, choáng 1 giây. Chỉ dùng trên nền cứng (trên bàn, thùng... bấm Xuống là rơi xuống) | — |
| Tương tác (L) | Cạnh Angelo: **bê** lên đầu, L lần nữa để **ném** | Ở mép bục cao, quay mặt ra ngoài: **thả dây len** xuống. L / Nhảy / đi để kéo dây lên |
| Leo dây | **Giữ Lên** cạnh dây để leo, thả thì đu, Xuống để tụt, Nhảy để buông | — |
| Bị bê / ném | — | Bị bê: bấm Nhảy để thoát. Bị ném: cuộn tròn bay, Nhảy giữa chừng để nhảy tiếp |

Con đang nằm (Leo nằm làm đệm, Angelo nằm lì) hoặc đang giữ dây thì khi đổi mèo sẽ ở lại tại chỗ, con đi theo không tự đi.
Hiệu ứng dây len, dây thả vẽ tạm bằng code (`SkillFx.ts`, `YarnRope.ts`); hiệu ứng chém và đập bụng của Leo dùng ảnh (xem mục Animation). Số liệu kỹ năng chỉnh ngay trong hai file kỹ năng.
Đập bụng chạm đất sẽ báo cho `LeoSkills.poundListeners` (để dành cho sàn yếu ở bước câu đố).

## Điều khiển

Phím mặc định (đổi được trong menu **Esc → Cài đặt → Bàn phím**, lưu trên máy):

| Hành động | Người 1 | Người 2 |
|---|---|---|
| Chạy | A / D | ← / → |
| Đi lên bục một chiều ngay phía trên | W | ↑ |
| Xuống khỏi bục một chiều | S | ↓ |
| Nhảy (giữ lâu nhảy cao, nhả sớm nhảy thấp). Tốn năng lượng | Space | Num 0 |
| Chém: bấm liên tục ra combo 3 nhát. Giữ để **lướt chém** xuyên qua kẻ địch | J | Num 1 |
| Kỹ năng riêng (xem bảng kỹ năng) | K | Num 2 |
| Tương tác: bê/ném, thả dây, giữ để kéo đồng đội dậy | L | Num 3 |
| Đổi mèo (chơi 1 người) | Tab | — |
| Menu tạm dừng | Esc | Esc |

Cảm ứng: joystick trái/phải để chạy, đẩy lên để đi lên bục, kéo xuống để xuống bục; nút J để chém (giữ để lướt), nút SPACE để nhảy,
nút ngôi sao (K) để dùng kỹ năng, nút bàn tay (L) để tương tác, nút hai mũi tên để đổi mèo. Trên máy tính bật **Touch On Desktop** (Canvas) để thấy nút, nút có ghi phím tương ứng.

## Menu (Esc hoặc nút bánh răng góc trên phải)

Mở menu thì game dừng. **Tiếp tục** · **Cài đặt** · **Về màn hình chính**.
Cài đặt: âm lượng nhạc nền, tiếng hiệu ứng, toàn màn hình, rung màn hình, bàn phím (bấm vào ô rồi bấm phím mới;
phím đang dùng chỗ khác thì hai phím đổi chỗ; có nút Trả về mặc định). Mọi cài đặt lưu trên máy (`Settings.ts`).
Menu và màn chọn vẽ tạm bằng code (`UiKit.ts`). Chữ có dấu tiếng Việt dùng font hệ thống vì font Super Bouncer thiếu nhiều chữ có dấu.

**Năng lượng** (thanh xanh dưới hàng tim): nhảy tốn 10, chém tốn 12, lướt tốn 35 trên 100. Vừa dùng thì chờ 0.6 giây mới hồi lại.
Không đủ năng lượng thì không làm được và thanh nháy đỏ. Chỉnh trong PlayerController, nhóm "Năng lượng".

## Animation (ảnh nhiều khung)

- **Hiệu ứng bật ra rồi tự biến mất** (khói, bụi, tia...): flip-book bằng code. Ví dụ khói chạy:
  ảnh `assets/resources/art/fx/FX_dust_1.png`, `FX_dust_2.png`... (`DustPuff.ts`), đổi khung 20 lần/giây rồi tự xoá.
  3 khung đầu là khói đang tung lên, các khung sau là khói tan.
  Muốn đổi khói thì chép ảnh mới đè đúng tên; thêm hay bớt khung cũng được, code tự đếm theo số trong tên.
  Ảnh pixel art được giữ sắc nét khi phóng to (lọc NEAREST, không gộp atlas).
- **Khói chạy** (`RunDust.ts`, game tự gắn vào Leo và Angelo): chạy nhanh ít nhất 0.18 giây thì một đám khói bám sau đuôi,
  lặp qua lại khung 1–3; dừng lại, nhảy lên hay quay đầu thì đám khói đứng lại tại chỗ và chạy khung 4–9 cho tan hết.
  Leo phóng ảnh khói 4.5 lần, Angelo 3.15 lần (bụi nhảy: ô **Jump Scale**, Leo 6 lần, Angelo 4.2 lần); ô **Behind** chỉnh khói lùi về sau bao xa (tính theo bề rộng thân mèo).
- **Bụi nhảy / đáp đất** (cũng trong `RunDust.ts`, ảnh `FX_jump_1.png`, `FX_jump_2.png`...): nhảy lên từ mặt đất thì tung bụi
  ở chỗ chân vừa rời đất; rơi đủ mạnh rồi đáp đất (cùng ngưỡng kêu tiếng đáp, ô **Land Impact**) thì tung bụi dưới chân.
  Bước hụt khỏi mép, nhảy lần 2 trên không hay bật tường thì không có bụi.
- **Hiệu ứng kỹ năng của Leo** (cắt từ tấm sprite sheet, mỗi ô 64×64): `FX_slash_` vệt chém (nhát 1 và 3 lật dọc thành chém xuống,
  nhát 3 to hơn; `SlashFx.ts`), `FX_hit_` / `FX_hitbig_` trúng đòn thường / nhát mạnh (`HitSpark.ts`),
  `FX_ring_` vòng sóng + `FX_spike_` gai đất hai bên khi đập bụng (`LeoSkills.ts`), `FX_stun_` sao xoay trên đầu địch bị choáng (`EnemyPatrol.ts`),
  `FX_tornado_` cơn lốc chém hất, `FX_swirl_` lá xoáy lúc gồng + `FX_burst_` vụ nổ + `FX_shock_` vòng sóng của Mèo Nổ (`LeoSkills.ts`).
  Số liệu hai đòn mới ở LeoSkills, nhóm *Chém hất* và *Mèo Nổ*.
  Thiếu ảnh bộ nào thì bộ đó tự quay về hình vẽ bằng code như cũ.
- **Nhân vật**: PlayerVisual có ô *Run Frames* (nhiều khung chạy thì tự thành flip-book), *Jump Frame*, *Fall Frame*.
- **Thứ đứng yên lặp mãi** (cờ bay, đèn nháy): làm bằng Animation Clip trong cửa sổ Animation của Creator.

## Âm thanh

Mọi tiếng nằm trong `assets/resources/sounds`. Hiện là tiếng tạm tổng hợp bằng code; muốn thay thì chép file mới
(.wav, .mp3 hoặc .ogg) **đè lên với cùng tên**, không cần sửa code. Âm lượng và tên bài nhạc nền chỉnh ở GameManager (Canvas), nhóm "Âm thanh".

| File | Khi nào phát |
|---|---|
| `bgm` | Nhạc nền, lặp liên tục |
| `jump` / `land` / `drop` | Nhảy / đáp đất mạnh / xuống khỏi bục |
| `slash1`, `slash2`, `slash3` | 3 nhát combo chém |
| `hit` | Chém trúng kẻ địch |
| `dash` | Lướt chém (giữ J) |
| `hurt` | Mèo bị đánh |
| `enemy_die` | Kẻ địch gục |
| `coin` / `heal` / `checkpoint` | Nhặt cá / nhặt chai nước / chạm điểm hồi sinh |
| `win` / `lose` | Về đích / hết máu |

## Cấu trúc code

```
assets/scripts/
├─ core/
│  ├─ Box.ts              hàm tính hộp va chạm và tiện ích toán
│  ├─ Solid.ts            vật cản (nền, thùng, bàn...), bật oneWay để thành bục một chiều
│  ├─ PlatformerBody.ts   thân vật lý: trọng lực, va chạm quét tách trục X/Y
│  ├─ ColliderDebug.ts    vẽ khung va chạm
│  ├─ Hittable.ts         danh sách thứ chém trúng được
│  ├─ Sound.ts            phát tiếng hiệu ứng và nhạc nền (assets/resources/sounds)
│  └─ HitStop.ts          khựng hình ngắn khi chém trúng
├─ player/
│  ├─ PlayerInput.ts      gom bàn phím và cảm ứng
│  ├─ PlayerController.ts chạy, nhảy, combo chém 3 nhát, bị đánh
│  ├─ PlayerVisual.ts     hoạt ảnh tween (nhún, nghiêng, bẹp khi đáp, dãn khi nhảy)
│  ├─ SlashFx.ts          vệt chém lưỡi liềm vẽ bằng code
│  ├─ DashFx.ts           vệt chém dài khi lướt chém (giữ J)
│  └─ HitSpark.ts         tia lửa khi chém trúng
├─ enemy/EnemyPatrol.ts   kẻ địch đi tuần, bị chém thì văng lùi, dùng cho cả boss
├─ camera/
│  ├─ CameraRig.ts        bám nhân vật, nhìn trước, giới hạn mép màn, rung màn hình
│  └─ ParallaxLayer.ts    lớp cảnh trôi theo hệ số
├─ game/GameManager.ts    máu, hồi sinh, thắng/thua, chơi lại
├─ ui/
│  ├─ HeartsHUD.ts        trái tim (MG_heart, MG_heart_empty) và avatar (MG_avatar)
│  ├─ GameFont.ts         font chung cho mọi chữ (assets/resources/fonts/SuperBouncer.ttf)
│  ├─ CoinCounter.ts      bộ đếm cá vàng (MG_coin_backing)
│  ├─ BossHealthBar.ts    thanh máu boss (MG_boss_hpgauge, MG_boss_hp, MG_icon_boss)
│  └─ TouchControls.ts    joystick (MG_joystick) + nút nhảy
└─ level/
   ├─ GroundBlock.ts      khối nền đá (mép ảnh tile + thân tường + va chạm)
   ├─ PlaceholderBox.ts   khối màu thay cho ảnh còn thiếu
   ├─ SkyGradient.ts      nền trời chuyển màu
   ├─ PlayerTrigger.ts    nền chung cho các vùng chạm bên dưới
   ├─ HealPickup.ts       vật phẩm hồi máu
   ├─ CoinPickup.ts       cá vàng để nhặt (MG_coin)
   ├─ Hazard.ts           vật gây sát thương
   ├─ Checkpoint.ts       điểm hồi sinh
   ├─ Goal.ts             đích
   ├─ LightRays.ts        tia nắng xiên vẽ bằng code
   ├─ SoftGlow.ts         quầng sáng mềm (sương sáng, hào quang cá)
   ├─ CoinGlow.ts         hào quang bám theo cá vàng
   ├─ DustMotes.ts        bụi sáng lấp lánh
   └─ DemoLevelBuilder.ts dựng màn mẫu bằng code
```

## Quy ước quan trọng

- **Mỗi file script chỉ chứa một component** (`@ccclass` kế thừa Component). Đây là quy định của Cocos.

- **Cấu trúc lớp** dưới Canvas: `BG` (0.12) → `MG` (0.5) → `Gameplay` (1) → `FR` (1.35) → `FR_Top` → `HUD`.
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
| Zoom | lớn hơn 1 là gần hơn, nhỏ hơn 1 là thấy rộng hơn (HUD không bị phóng theo) |
| Offset | x dương: nhìn về phải nhiều hơn. y dương: nhìn cao hơn, mặt đất thấp xuống |
| Look Ahead | nhìn trước theo hướng chạy |
| Damping X / Y | độ bám (lớn thì bám sát, nhỏ thì trễ và mượt) |
| Follow Jump | tắt (mặc định): camera không nhảy theo, chỉ đổi độ cao khi mèo đứng lên bục cao hơn hoặc rơi xuống |
| Jump Dead Zone | mèo bay cao quá mức này so với chỗ đứng thì camera mới đi lên |
| Min X / Max X | mép trái và phải của màn, camera không đi quá |
| Min Y / Max Y | giới hạn camera lên xuống |

Muốn mặt đất nằm cao hay thấp trên màn hình thì có thể kéo cả 4 node lớp `BG`, `MG`, `Gameplay`, `FR` lên hoặc xuống,
hoặc dùng `Offset.y`.

**Xem đúng khung hình lúc chơi ngay trong editor:** chọn Canvas → CameraRig → tích **"Xem trước camera"**,
rồi kéo thanh **"Vị trí camera"**. Khung tím của Canvas sẽ hiện đúng cảnh lúc chơi tại vị trí đó (đã tính parallax và zoom).
Vị trí camera ứng với 4 khung ảnh demo: **660, 2580, 4500, 6420**.
Muốn kéo cả một lớp (`BG`, `MG`, `Gameplay`, `FR`...) lên xuống thì tắt xem trước trước khi kéo.
Đồ vật bên trong các lớp thì kéo thoải mái lúc đang xem trước.

**HUD (avatar + trái tim) không đi theo camera.** HUD được neo vào góc trên trái bằng component **Widget**
(Top, Left = 30; UITransform Anchor = (0, 1)). Muốn dời HUD thì chỉnh Top/Left của Widget, không chỉnh camera.

## Làm màn thật trong editor

Màn mẫu được dựng bằng code để thử nhanh. Khi làm màn thật:

1. Tạo các node `BG`, `MG`, `Gameplay`, `FR` dưới Canvas, mỗi node gắn **ParallaxLayer** với hệ số như trên.
2. Kéo ảnh vào lớp tương ứng. Đồ vật đứng lên được thì thêm **Solid** và bật `One Way` nếu muốn.
3. Biến mỗi đồ vật thành **prefab** để tái sử dụng.
4. Player gồm `PlatformerBody`, `PlayerController` và node con `Visual` (Sprite + `PlayerVisual`).
5. Gắn **GameManager** và **CameraRig** lên Canvas, rồi kéo Player vào các ô tham chiếu.

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

- Vẽ thêm 4–6 frame chạy, kéo vào `Run Frames` của PlayerVisual (flip-book tự chạy).
- Vẽ hình trái tim cho HUD (`Heart Frame`, `Heart Empty Frame`).
- Thêm âm thanh: nhảy, đáp, chém, chém trúng, nhặt đồ.
- Thêm hành vi riêng cho boss (lao tới, nhảy).
