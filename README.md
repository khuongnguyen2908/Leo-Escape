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

1. Chọn node **Canvas**, ở ô DemoLevelBuilder **tích vào "▶ Dựng màn vào scene"**.
2. Hierarchy sẽ hiện các node `Sky`, `BG`, `MG`, `Gameplay`, `FR`, `HUD`, `TouchControls`. Mở ra là thấy từng món đồ.
3. Kéo thả, đổi kích thước, xoá hoặc nhân bản (Ctrl+D) tuỳ ý. **Nhấn Ctrl+S** để lưu.
4. Lần sau bấm Play, game dùng đúng màn bạn đã xếp và không dựng lại nữa.

Lưu ý khi sắp xếp:
- Khối nền đá (`Ground`) có component **GroundBlock**: đổi `Width` để dài ngắn, kéo node để đổi chỗ và độ cao.
- Đồ đứng lên được có component **Solid**. Kích thước vùng va chạm (`Size`) không tự đổi theo khi bạn scale hình, nhớ chỉnh lại Size.
  Bật `Debug Colliders` rồi Play để thấy khung va chạm.
- Lớp `MG`, `BG`, `FR` trôi theo parallax nên trong editor nhìn lệch so với lúc chơi. Đó là bình thường.
- Muốn dựng lại từ đầu thì tích ô **"⟳ Xoá màn cũ và dựng lại"**: các lớp cũ bị xoá và màn được dựng lại theo 4 khung ảnh demo.
  Phần bạn đã tự sắp xếp sẽ mất, nên sao lưu scene trước (chọn scene trong Assets → Ctrl+D).
- Vị trí đồ vật trong màn mẫu đo theo 4 ảnh demo 1280×720 (1px = 1.5 đơn vị game), xem hàm `demoX` trong `DemoLevelBuilder.ts`.
- Nếu Ctrl+S không lưu (tên scene không có dấu `*`), kéo nhẹ một node bất kỳ rồi lưu lại.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| A / D, ← / → | Chạy |
| Space / W / ↑ / K | Nhảy (giữ lâu nhảy cao, nhả sớm nhảy thấp) |
| ↓ + Nhảy | Xuống khỏi bục một chiều |
| J / X | Vả móng (tốn năng lượng, năng lượng tự hồi) |
| Đạp lên đầu | Hạ kẻ địch (giữ nút nhảy để nảy cao hơn) |

## Cấu trúc code

```
assets/scripts/
├─ core/
│  ├─ Box.ts              hàm tính hộp va chạm và tiện ích toán
│  ├─ Solid.ts            vật cản (nền, thùng, bàn...), bật oneWay để thành bục một chiều
│  ├─ PlatformerBody.ts   thân vật lý: trọng lực, va chạm quét tách trục X/Y
│  └─ ColliderDebug.ts    vẽ khung va chạm
├─ player/
│  ├─ PlayerInput.ts      gom bàn phím và cảm ứng
│  ├─ PlayerController.ts chạy, nhảy, bị đánh, nảy
│  └─ PlayerVisual.ts     hoạt ảnh tween (nhún, nghiêng, bẹp khi đáp, dãn khi nhảy)
├─ enemy/EnemyPatrol.ts   kẻ địch đi tuần, dùng cho cả boss
├─ camera/
│  ├─ CameraRig.ts        bám nhân vật, nhìn trước, giới hạn mép màn
│  └─ ParallaxLayer.ts    lớp cảnh trôi theo hệ số
├─ game/GameManager.ts    máu, hồi sinh, thắng/thua, chơi lại
├─ ui/
│  ├─ HeartsHUD.ts        trái tim (MG_heart, MG_heart_empty) và avatar (MG_avatar)
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
   └─ DemoLevelBuilder.ts dựng màn mẫu bằng code
```

## Quy ước quan trọng

- **Mỗi file script chỉ chứa một component** (`@ccclass` kế thừa Component). Đây là quy định của Cocos.

- **Cấu trúc lớp** dưới Canvas: `BG` (0.12) → `MG` (0.5) → `Gameplay` (1) → `FR` (1.35) → `FR_Top` → `HUD`.
  `FR_Top` chứa đồ treo trên cao (băng rôn): Factor là (1.35, 0), tức trôi ngang nhưng đứng yên theo chiều dọc,
  để mép trên không bị hở khi camera lên xuống. Đồ nào cần dính mép trên màn hình thì đặt vào lớp này.
  Mọi thứ có va chạm (Solid, PlatformerBody, trigger) phải là **con trực tiếp của lớp Gameplay**.
- **Gốc nhân vật và đồ vật ở chân** (anchor 0.5, 0). Hộp va chạm của nhân vật đặt `offset.y = size.height / 2`.
- Camera không di chuyển Camera thật mà dịch các lớp ngược lại, vì vậy HUD luôn đứng yên.

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

## Việc nên làm tiếp

- Vẽ thêm 4–6 frame chạy, kéo vào `Run Frames` của PlayerVisual (flip-book tự chạy).
- Vẽ hình trái tim cho HUD (`Heart Frame`, `Heart Empty Frame`).
- Thêm âm thanh: nhảy, đáp, đạp chim, nhặt đồ.
- Thêm hành vi riêng cho boss (lao tới, nhảy).
