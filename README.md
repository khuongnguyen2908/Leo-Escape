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
    - mặt đá: mọi khối nền dùng `MG_tile_2`, chỉ ô có nắng dùng `MG_tile_3` (đoạn `SUNLIT_X`, đo trên ảnh demo: ô ngay trước khe hở khung 1;
      GroundBlock có ô *Lit Frame*, *Lit From*, *Lit To*);
    - máu kẻ địch gấp 4 (chim 3 → 12, boss 10 → 40; chỉ đổi khi còn đúng số cũ, số trong `ENEMY_HP`);
    - thân va chạm của Leo rộng 85 → 150 để hình mèo không lấn vào tường;
    - kẻ địch (boss) mà bạn kéo riêng hình (node con `Visual`): dời cả node tới chỗ hình, chân đặt lên mặt đá ngay dưới, `Visual` về (0, 0)
      (khi chơi hình luôn bám node, nên muốn dời con địch thì kéo node cha `Boss`, đừng kéo `Visual`);
    - máu boss 150 → 40 (bản thử 150 đánh lâu quá; chỉ đổi khi còn đúng 150);
    - màn dài thêm (khối nền vượt quá tường cuối): dời tường tàng hình `Wall` cuối màn tới hết khối nền xa nhất (+30) và tăng *Max X* của camera;
    - thùng giấy + viên gạch + cây gỗ (`mg_up`) và thùng rác chặn cả hai bên (không đi xuyên, phải nhảy lên), khung va chạm ôm đúng hình.
      Cây gỗ nghiêng là 5 khung nhỏ xếp bậc thang theo đường chéo (khung va chạm chỉ là hình chữ nhật thẳng, không xoay được).
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
  Khung chọn giữ đúng khoảng lệch với dòng gần nó nhất như bạn đặt (đặt ở dòng nào cũng được). Tắt một dòng (bỏ tích node) là menu bỏ qua dòng đó.
  Chữ dài hơn khung (ACHIEVEMENTS) thì lúc chạy khung tự giãn **phần đệm vuông ở giữa**, hai hoa văn hai đầu giữ nguyên
  (kiểu cắt 9 mảnh, mỗi đầu 70px; số trong `SELECTION_*` của `LandingScreen.ts`). Trong editor khung vẫn hiện cỡ gốc.
  Ở menu chính không có nút bánh răng, cài đặt mở bằng OPTIONS.
  Chữ trắng cỡ 60 viền 4px #462c22; chữ nâu nhỏ #968787 cỡ 30 viền 3px #2c1d17. Node `Start` (nút START cũ) chỉ bị tắt, không xoá.
- **1 người:** điều khiển Leo. Bấm **Đổi mèo** (Tab, hoặc nút hai mũi tên trên điện thoại) để chuyển sang Angelo: một linh hồn
  phát sáng (màu của con được chọn) bay vòng từ con cũ sang con mới (`SoulWisp.ts`). Bấm bộ phím của Người 1 hay Người 2 đều được.
  Con không được điều khiển **tự đi theo** sau lưng, tự nhảy lên bục / qua hố, tự chém địch ở gần, nhưng không lướt, không dùng kỹ năng,
  không kéo dậy (`FollowerAI.ts`). Nó bị đánh nhưng luôn còn ít nhất 1 tim; kẹt, rơi vực hoặc tụt lại quá xa thì hoá linh hồn bay tới.
- **2 người:** màn chọn mèo. Mỗi người bấm trái/phải để đưa thẻ (N1, N2) tới dưới con mèo muốn chơi, bấm **Nhảy** để chốt, **Xuống** để bỏ chọn.
  Hai người chốt xong thì đếm 3-2-1 rồi vào game. Hai con không đi xa nhau quá một màn hình (`Max Gap` trên GameManager).
- Mỗi con một dãy tim và một thanh năng lượng (Leo góc trên trái, Angelo góc trên phải). Hết tim thì **gục**;
  con kia tới gần, **giữ phím Tương tác 1 giây** để kéo dậy (còn 2 tim). Gục hết (chơi 1 người: Leo gục) thì hiện "Try again!" rồi **hồi sinh ở checkpoint** gần nhất đã chạm (chưa chạm thì đầu màn), đủ tim, bất tử 1.5 giây; trận boss đánh lại từ đầu, quái đã hạ và cá đã ăn giữ nguyên.
- Thua hẳn (hiện chưa có cách thua hẳn, gục hết là hồi sinh ở checkpoint) thì chơi lại vẫn giữ nguyên số người và mèo đã chọn. Menu → **Về màn hình chính** thì chọn lại từ đầu.
- **Angelo tạm** là Leo nhuộm xám xanh, bóp gầy (ô *Tint*, *Width Scale* trên PlayerVisual của node `Angelo`).

## Kỹ năng hai con mèo

| | Leo (`LeoSkills.ts`) | Angelo (`AngeloSkills.ts`) |
|---|---|---|
| Nhảy | **Nhảy thêm 1 lần** trên không (miễn phí, cao 85%; LeoSkills nhóm *Nhảy 2 lần*) | **Nhảy thêm 1 lần** trên không. Đang bay đẩy vào tường thì **bám tường** trượt chậm, Nhảy để **bật tường** |
| Đánh (J) | Bấm liên tục: **combo 5 nhát** (nhát 4 **chém xoay** trúng cả sau lưng, nhát 5 **kết liễu** trừ 2 máu, văng xa). Đang bay: combo **3 nhát đầu** như dưới đất, mỗi nhát khựng lại một nhịp. Giữ J đủ 0.8 giây (quả cầu năng lượng xanh gom ở giữa thân, đủ lực thì quả cầu chớp chờ phóng) rồi thả: **sóng kiếm** bay thẳng ~1000, trừ 2 máu mỗi địch, đụng tường thì tan (tốn 30; PlayerController nhóm *Sóng kiếm*). Thả sớm thì quả cầu **xì hơi** tan mất, không tốn gì. **Giữ Xuống + J** trên nền cứng: **quét chân** về phía đang quay mặt, địch nhỏ (gà, chim...) **té nằm** 1.2 giây, không đánh mèo, vẫn chém tiếp được; **boss không bị quét** (không mất máu) (tốn 15; LeoSkills nhóm *Quét chân*, ô *Sweep Trip*). **Giữ Lên + J** dưới đất: **chém hất**, vệt xoáy quét từ sát đất trước mặt cong lên qua đầu (sau lưng mèo), hất địch bay lên (tốn 20); nhảy theo chém tiếp thì địch lơ lửng (chém trúng trên không thì Leo cũng nảy nhẹ lên, ô *Air Hit Lift*), đang bay thì địch không đánh mèo, rơi xuống choáng 0.4 giây. Boss không bị hất. Đứng ngay dưới bục một chiều thì bấm W sẽ nhảy lên bục trước | **Quất dây len**, tầm xa gấp đôi Leo |
| Đập bụng (giữ Xuống + J khi đang bay) | **Đập bụng** lao xuống (tốn 20), sóng chấn đánh địch xung quanh và làm chúng **choáng** 1.5 giây; rơi càng cao sóng càng rộng (tối đa ×1.6 khi rơi từ cao 600). **Phím K chỉ dùng khi có Angelo**: K trên không đập bụng, K dưới đất **nằm ngửa làm đệm** (K lần nữa để dậy; Angelo rơi trúng bụng thì bật rất cao), S + K Mèo Nổ. Chưa có Angelo thì phím K không làm gì, trang phím và nút K trên điện thoại cũng ẩn | Bấm: **trói chân** địch gần nhất 2 giây (boss ngắn hơn), địch đứng yên và không đánh ai. Giữ: **nằm lì** / đứng dậy |
| Tuyệt chiêu (giữ Xuống + L) | **Mèo Nổ**: cần đầy 100 năng lượng, tốn hết. Gồng 0.6 giây (bất tử) rồi nổ: mọi kẻ địch đang thấy trên màn hình mất 3 máu, văng ra, choáng 1 giây. Chỉ dùng trên nền cứng (trên bàn, thùng... bấm Xuống là rơi xuống) | — |
| Tương tác (L) | Chưa có Angelo: **lướt chém** (kiểu Mega Man X, tốn 35). Cũng lướt được bằng **bấm đúp A/D** (ô *Double Tap Time*, 0 = tắt). Đang lướt trên đất mà bấm Nhảy: **dash jump**, bay ngang nhanh gấp 1.7 lần chạy tới khi chạm đất (ô *Dash Jump Speed*). Có Angelo: cạnh Angelo **bê** lên đầu, L lần nữa để **ném** | Ở mép bục cao, quay mặt ra ngoài: **thả dây len** xuống. L / Nhảy / đi để kéo dây lên |
| Leo dây | **Giữ Lên** cạnh dây để leo, thả thì đu, Xuống để tụt, Nhảy để buông | — |
| Bị bê / ném | — | Bị bê: bấm Nhảy để thoát. Bị ném: cuộn tròn bay, Nhảy giữa chừng để nhảy tiếp |

Con đang nằm (Leo nằm làm đệm, Angelo nằm lì) hoặc đang giữ dây thì khi đổi mèo sẽ ở lại tại chỗ, con đi theo không tự đi.
Hiệu ứng dây len, dây thả vẽ tạm bằng code (`SkillFx.ts`, `YarnRope.ts`); hiệu ứng chém và đập bụng của Leo dùng ảnh (xem mục Animation). Số liệu kỹ năng chỉnh ngay trong hai file kỹ năng.
Đập bụng chạm đất sẽ báo cho `LeoSkills.poundListeners` (để dành cho sàn yếu ở bước câu đố).

## Boss

Boss (`EnemyPatrol` 40 máu + `BossBrain.ts`, DemoLevelBuilder tự gắn khi chơi) chỉ ra đòn khi mèo đã vào khu của boss (khối nền boss đứng).
Mốc phase tính theo phần máu: còn 2/3 sang phase 2, còn 1/3 sang phase 3 (ô *Phase 2 At*, *Phase 3 At*).
**Mỗi phase boss phải ra đủ 2 đòn** thì máu mới tụt qua mốc (phase 3: mới chết được) - ô *Min Attacks Per Phase*. Chém trước đó vẫn trúng nhưng máu dừng ngay trên mốc.

| Phase | Máu | Đòn | Nghỉ giữa hai đòn |
|---|---|---|---|
| 1 | 40 → 28 | Axit 1 | 2.6 giây |
| 2 | 27 → 14 | Axit 1 hoặc Axit 2 (1 bom), không lặp liền; đi nhanh ×1.3 | 2 giây |
| 3 | 13 → 0 | Axit 1, Axit 2 (2 bom: chỗ mèo + trước mặt mèo) hoặc Axit 3 (cột ra dồn dập hơn), không lặp liền; đi nhanh ×1.5 | 1.5 giây |

- Chuyển phase: boss nhảy múa 1.5 giây tại chỗ, nốt nhạc `Boss/Dance` quanh đầu, **bất tử** lúc này.
- Thời gian nghỉ tính từ lúc đòn trước xong (6 cột lửa mất khoảng 2 giây), nên từ đầu đòn này tới đầu đòn sau dài hơn số nghỉ.
- **Axit 1**: phồng người 0.4 giây rồi phun cục độc bay vòng cung tới chỗ mèo, chạm đất (hoặc trúng mèo) nổ vũng `Boss/Axit`.
- **Axit 2**: bom đầu lâu `Boss/Axit 2` mọc ngay chỗ mèo; vòng dưới đất là cảnh báo, tới lúc bốc khói (khung 6–11) mới gây đòn.
- **Axit 3**: 6 **dấu cảnh báo** (vệt sáng xanh dưới đất + dấu ! đỏ, `AcidWarning.ts`) hiện cùng lúc khắp khu boss; 1 giây sau (ô *Pillar Warning*)
  6 cột lửa xanh `Boss/Axit 3` lần lượt mọc từ trái sang phải đúng chỗ dấu, dấu nào tới lượt thì tắt. Cột cao hẳn (khung 4–19) mới gây đòn,
  vùng gây đòn rộng 100: **đứng giữa hai dấu thì không bị trúng**.
- Dính axit: **trúng độc** 2 giây (`PoisonStatus.ts`), bọt độc quanh mèo, cứ 1 giây rút **nửa tim** (tổng 1 tim). Dính lại khi đang độc thì tính lại 2 giây.
  Không bị đẩy lùi. Đang lướt thì né được axit. Thanh tim hiện được nửa tim.
- Boss chết: đầu lâu nổ `Boss/Death`. Quái nhỏ chết: tia nổ `Enemy death`.
- **Đích (`Goal`) khoá tới khi boss bị hạ**: cờ mờ, chạm vào không thắng; boss chết thì cờ sáng lại và nảy lên. Tắt bằng ô *Need Boss Defeated* của Goal.
- Số liệu (mốc máu, nhịp đòn, khoảng cách bom, độ dồn cột) là ô của `BossBrain`, nhóm *Phase*, *Nhịp đòn*, *Axit 1/2/3*.
  BossBrain chỉ gắn lúc chơi; muốn chỉnh số trong editor thì kéo component BossBrain vào node `Boss` (đã có thì không gắn thêm).

## Điều khiển

Phím mặc định (đổi được trong menu **Esc → Cài đặt → Bàn phím**, lưu trên máy):

| Hành động | Người 1 | Người 2 |
|---|---|---|
| Chạy | A / D | ← / → |
| Đi lên bục một chiều ngay phía trên | W | ↑ |
| Xuống khỏi bục một chiều | S | ↓ |
| Nhảy (giữ lâu nhảy cao, nhả sớm nhảy thấp). Leo nhảy miễn phí | Space | Num 0 |
| Chém: bấm liên tục ra combo 5 nhát. Giữ đủ 0.8 giây rồi thả: **sóng kiếm** | J | Num 1 |
| Kỹ năng riêng, chỉ khi có Angelo (xem bảng kỹ năng) | K | Num 2 |
| Tương tác: bê/ném, thả dây, giữ để kéo đồng đội dậy. **Chưa có Angelo thì là Lướt** (trang phím ghi "Lướt"; bấm đúp A/D cũng lướt) | L | Num 3 |
| Đổi mèo (chơi 1 người) | Tab | — |
| Menu tạm dừng | Esc | Esc |

Cảm ứng: joystick trái/phải để chạy, đẩy lên để đi lên bục, kéo xuống để xuống bục (đế `MG_joystick_base` đứng yên, nút chân mèo
`MG_joystick_knob` chạy theo ngón tay, xa nhất *Knob Travel* = 85; hai ảnh tách từ `MG_joystick`); nút J để chém (giữ để gồng sóng kiếm), nút SPACE để nhảy,
nút ngôi sao (K) để dùng kỹ năng, nút bàn tay (L) để tương tác, nút hai mũi tên để đổi mèo. Trên máy tính bật **Touch On Desktop** (Canvas) để thấy nút, nút có ghi phím tương ứng.

## Menu (Esc hoặc nút bánh răng góc trên phải)

Mở menu thì game dừng. **Tiếp tục** · **Cài đặt** · **Về màn hình chính**.
Cài đặt: âm lượng nhạc nền, tiếng hiệu ứng, toàn màn hình, rung màn hình, bàn phím (bấm vào ô rồi bấm phím mới;
phím đang dùng chỗ khác thì hai phím đổi chỗ; có nút Trả về mặc định). Mọi cài đặt lưu trên máy (`Settings.ts`).
Menu và màn chọn vẽ tạm bằng code (`UiKit.ts`). Chữ có dấu tiếng Việt dùng font hệ thống vì font Super Bouncer thiếu nhiều chữ có dấu.

**Năng lượng** (thanh xanh dưới hàng tim, tối đa 100): chạy, nhảy, nhảy 2 lần, chém combo đều **miễn phí**; chỉ kỹ năng tốn:
lướt 35, sóng kiếm 30, chém hất 20, đập bụng 20, quét chân 15, Mèo Nổ hết thanh. (Angelo: quất dây và nhảy 2 lần vẫn tốn.) Vừa dùng thì chờ 0.6 giây mới hồi lại.
Không đủ năng lượng thì không làm được và thanh nháy đỏ. Chỉnh trong PlayerController, nhóm "Năng lượng".

## Animation (ảnh nhiều khung)

- **Hiệu ứng bật ra rồi tự biến mất** (khói, bụi, tia...): flip-book bằng code. Ví dụ khói chạy:
  ảnh `assets/resources/art/fx/FX_dust_1.png`, `FX_dust_2.png`... (`DustPuff.ts`), đổi khung 20 lần/giây rồi tự xoá.
  3 khung đầu là khói đang tung lên, các khung sau là khói tan.
  Muốn đổi khói thì chép ảnh mới đè đúng tên; thêm hay bớt khung cũng được, code tự đếm theo số trong tên.
  Ảnh pixel art được giữ sắc nét khi phóng to (lọc NEAREST, không gộp atlas).
- **Khói của mèo** (`RunDust.ts`, game tự gắn vào Leo và Angelo), bộ khói pixel *SmokeFX Lite*:
  - chạy nhanh ít nhất 0.18 giây thì cứ 0.22 giây (ô **Run Interval**) tung một đám bụi nâu sau gót (`FX_run_`);
  - đang chạy mà thả phím hay quay đầu thì một đám bụi tròn ở mũi chân (`FX_skid_`);
  - nhảy lên từ mặt đất: vòng bụi nhỏ ở chỗ chân vừa rời đất (`FX_takeoff_`); bước hụt khỏi mép thì không có;
  - đáp đất thường (nhảy 1 lần, rơi thấp, đủ mạnh theo ô **Land Impact**): cũng vòng bụi nhỏ (`FX_takeoff_`);
  - đáp đất sau khi nhảy 2 lần, sau khi đập bụng, hoặc rơi từ cao 500 trở lên tính từ đỉnh cú nhảy (ô **Big Fall Height**): vòng bụi lớn (`FX_land_`);
  - Leo nhảy lần 2 trên không: vòng nổ trắng dưới chân (`FX_airjump_`).
  Ô **Scale** (bụi chạy, bụi trượt; Leo 4.5, Angelo 70%) và **Jump Scale** (các vòng bụi; Leo 3.5, Angelo 70%).
  Ảnh khói cũ `FX_dust_`, `FX_jump_` vẫn để trong thư mục nhưng không dùng nữa.
- **File gốc bộ khói** nằm ở `art-nguon/SmokeFX` (ngoài `assets` để không vào bản build; file `.ase` mở bằng Aseprite).
  Mỗi file PNG ở đó là một dải nhiều ô. Muốn đổi dải nào dùng cho việc nào: sửa bảng `JOBS` trong `tools/cat_khoi.py`, chạy
  `python tools/cat_khoi.py` để đo thử, rồi `python tools/cat_khoi.py --ghi` để cắt ra `art/fx` (ghi đè ảnh cũ cùng tên).
- **Vệt chém của Leo** (bộ *SlashFX Combos*, file gốc ở `art-nguon/SlashFX`, mỗi ô 128×128, cắt bằng `tools/cat_khoi.py`):
  combo `FX_cut1_` (vòng qua đầu), `FX_cut2_` (quét từ dưới lên), `FX_cut3_` (quét ngang),
  `FX_spin_` (nhát 4 chém xoay), `FX_finish_` (nhát 5 kết liễu); `FX_airspin_` vệt xoáy của chém hất; `FX_sweep_` quét chân;
  Lướt: vệt `FX_sweep_` giãn dài theo đường lướt (`DashFx.ts`) + bụi `FX_run_` sau gót + bóng mờ.
  `FX_wave_` sóng kiếm (`SwordWave.ts`, phóng ra cách mèo 220, ngang ngực).
  `FX_charge_` gồng sóng kiếm ở giữa thân mèo, phóng to ×2.5 (`ChargeFx.ts`, cắt từ `art-nguon/ChargeFX`): giữ J quá 0.15 giây thì khung 1 → 4 lớn dần,
  đủ lực thì chớp bằng chính hình gốc (khung 3 ↔ 4) tới khi thả J; thả sớm thì xì hơi (khung 5 → 8, vòng tan). Chưa có ảnh thì dùng vòng sáng vẽ bằng code.
  Cùng lúc đó hào quang `Hold/frame*` lặp dưới chân (sau hình mèo, ×3) tới khi buông J.
- **Ảnh để trong thư mục con của `art/fx`** (tên `frame0, frame1...`, đánh số từ 0): code gọi bằng tên thư mục, ví dụ `Boss/Axit 2/frame`.
  `Boss/Axit` (vũng axit nổ), `Boss/Axit 2` (bom đầu lâu), `Boss/Axit 3` (cột lửa xanh), `Boss/Dance` (nốt nhạc chuyển phase),
  `Boss/Death` (đầu lâu nổ khi boss chết), `Boss/Poison` (bọt độc quanh mèo), `Enemy death` (tia nổ khi quái nhỏ chết), `Hold` (giữ J).
  `Boss/Gowth` để dành, chưa dùng (ảnh đang nhập dạng texture; khi dùng phải đổi Type sang sprite-frame).
  Vị trí, độ phóng to, lật ngang, vẽ sau lưng mèo của từng nhát: bảng `IMAGE_STYLES` trong `SlashFx.ts`
  (nhát 1 và 5 lật ngang; nhát 1, 3 và 5 vẽ sau mèo, trên node `SlashBack` nằm dưới hình mèo).
  Ảnh vệt cam cũ `FX_slash_` và cơn lốc `FX_tornado_` vẫn để trong thư mục nhưng không dùng nữa.
- **Hiệu ứng kỹ năng khác của Leo** (cắt từ tấm sprite sheet, mỗi ô 64×64): `FX_slash_` vệt chém cũ (nhát 1 và 3 lật dọc thành chém xuống,
  nhát 3 to hơn; `SlashFx.ts`), `FX_hit_` / `FX_hitbig_` trúng đòn thường / nhát mạnh (`HitSpark.ts`),
  `FX_ring_` vòng sóng + `FX_spike_` gai đất hai bên khi đập bụng (`LeoSkills.ts`), `FX_stun_` sao xoay trên đầu địch bị choáng (`EnemyPatrol.ts`),
  `FX_tornado_` cơn lốc chém hất (cũ), `FX_swirl_` lá xoáy lúc gồng + `FX_burst_` vụ nổ + `FX_shock_` vòng sóng của Mèo Nổ (`LeoSkills.ts`).
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
| `slash1`, `slash2`, `slash3` | Nhát combo 1, 2, từ 3 trở đi (và sóng kiếm); `slash2` cũng cho quét chân |
| `hit` | Chém trúng kẻ địch |
| `dash` | Lướt chém (L hoặc bấm đúp A/D) |
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
│  ├─ PlayerController.ts chạy, nhảy, combo chém 5 nhát, chém trên không, lướt chém + dash jump, sóng kiếm (giữ J), bị đánh
│  ├─ SwordWave.ts        sóng kiếm bay thẳng (giữ J rồi thả)
│  ├─ PlayerVisual.ts     hoạt ảnh tween (nhún, nghiêng, bẹp khi đáp, dãn khi nhảy)
│  ├─ SlashFx.ts          vệt chém lưỡi liềm vẽ bằng code
│  ├─ DashFx.ts           vệt chém dài khi lướt chém
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
│  └─ TouchControls.ts    joystick (đế MG_joystick_base + nút MG_joystick_knob) + nút nhảy
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
