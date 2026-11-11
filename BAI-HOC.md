# Sổ bài học

Những lỗi đã gặp và đã sửa. Trước mỗi việc có sửa file: đọc phần **Luôn nhớ** và **Mục lục** ngay dưới đây,
rồi chỉ đọc nhóm khớp với việc sắp làm và làm theo phần *Cách tránh*.
Quy trình làm việc và lúc nào cần ghi: `.claude/skills/quy-trinh-lam-viec/SKILL.md`.

## Luôn nhớ

1. **Scene là bản chính.** Không sửa `assets/scenes/Main.scene` trên đĩa khi Creator đang mở. Sửa hàng loạt thì thêm một bước vào nút ⚙ Cập nhật, không thêm nút mới.
2. Trước khi nhờ người dùng bấm một nút trong editor: đọc hết mọi bước của nút đó và nói rõ nó sẽ đổi gì.
3. Người dùng báo "đã lưu": xem giờ sửa của `Main.scene` (`ls -la --time-style=full-iso`) và tìm trong file một giá trị vừa đổi, trước khi thử hay so ảnh. Thay đổi do nút ⚙ làm không phải lúc nào cũng bật dấu `*`, nên Ctrl+S có thể không ghi gì (06/11 bị 2 lần liền): dặn thấy dấu `*` rồi mới Ctrl+S, chưa có thì kéo nhẹ một node.
4. Giá trị đã lưu trong scene thắng giá trị mặc định trong code. Muốn đổi node có sẵn: đặt tên property mới (như `artFacesRight`), thêm bước ⚙, hoặc nhờ chỉnh trong Inspector.
5. Mỗi file `.ts` chỉ một `@ccclass`, tên file trùng tên class.
6. Hình vẽ bằng `Graphics` không được lưu vào scene: vẽ lại trong `onLoad`, kèm `executeInEditMode`.
7. Code chạy trong editor không dùng `resources.load`: hỏi `asset-db` lấy uuid rồi `assetManager.loadAny(uuid)` (xem `loadArtInEditor`).
8. Số lấy từ ảnh demo thì đo và so 1-1 (node `DemoRef`), không đoán. Ảnh demo vẽ đúng cỡ gốc (tỉ lệ 1, không phải 0.87); 1px ảnh = 1.5 đơn vị game; `FRAME_CAM = [660, 2580, 4500, 6420]`; số liệu ở `DemoLayout.ts`.
9. Người dùng thêm ảnh / tiếng: `grep '"type"' <file>.png.meta` phải ra `sprite-frame`; mỗi file đủ cặp `X.ext` + `X.ext.meta`; thư mục `sounds` không có hai tiếng cùng tên khác đuôi (`Sound` gọi theo tên không đuôi, bản tải xong sau đè bản kia: thay tiếng thì xoá file cũ cả `.meta`).
10. Thêm import giữa các file giao diện / màn chơi / GameManager: chạy `python tools/kiem_tra_import_vong.py` trước khi nhờ bấm Creator.
11. Sửa code xong: kiểm tra bằng tsc đi kèm Creator (lệnh ở nhóm 4).
12. Mỗi `X.onChange(...)` / `input.on(...)` phải có cặp gỡ trong `onDestroy`. Trong `onDestroy` chỉ dọn dẹp, không vẽ, không đổi hình.
13. Đề xuất phím / nút mới: mở `LAYOUT_KEYS` / `DEFAULT_KEYS` trong `core/Settings.ts` xem phím nào đang dùng (hiện tại WASD: J đánh, K nhảy, L special, Space lướt; Mũi tên: X, Z, C, Shift phải). Máy người chơi còn cài đặt cũ đã lưu: cần đoạn tự gán trong `load()`.
14. Chốt vị trí, cỡ, độ mờ của thứ gì: chụp màn hình ở đúng chỗ camera sẽ đứng khi chơi thật và đo bằng số, rồi mới ghi vào code / scene.
15. Đổi cỡ hình thì khung va chạm (`Size` của Solid, PlatformerBody) không tự đổi theo: nhắc chỉnh và bật *Debug Colliders*.
16. Làm ở 2 máy: `git pull` trước khi mở Creator, không sửa scene song song (file scene rất khó gộp), hỏi máy kia còn gì chưa push không; làm xong nhắc người dùng commit và push.
17. Một số mô-đun engine đã tắt (danh sách trong GHI-CHU-LAM-TIEP.md, mục *Mô-đun engine đã tắt*): định dùng video, webview, vật lý 3D, Terrain... thì nhắc người dùng bật lại trước.

## Mục lục

| Nhóm | Đọc khi | Các bài |
|---|---|---|
| 1. Scene và nút ⚙ | sửa `Main.scene`, `DemoLevelBuilder.ts`, nhờ bấm nút trong editor | Quy tắc cho bước ⚙ · Component gắn lúc chạy · Component bị chồng (Ctrl+S không lưu: xem Luôn nhớ 3) |
| 2. Va chạm và hình | đổi cỡ hình, thêm đồ đứng lên được, xếp ô đá | Khung va chạm không tự theo hình |
| 3. Ảnh, âm thanh, asset | thêm / đổi ảnh, tiếng; tự tạo ảnh; đổi tên, chuyển file | Ảnh nhập dạng texture · Đổi tên, chuyển file · Tâm lệch vì Trim · Ảnh ghép trái / phải · Tên có dấu |
| 4. Bẫy engine | code vẽ Graphics, nhạc, hẹn giờ, lò xo, import, tải lại màn, tsc | Đổi dữ liệu cũ chạy lại mỗi lần · Số to làm dấu · Mỗi node một thứ vẽ · Nhuộm màu ảnh · Âm thanh · Slow motion · Lò xo theo dt · Import vòng · Tải lại màn · tsc |
| 5. Menu và bảng | viết, sửa menu, bảng hỏi, chữ trên màn hình | Checklist bảng / menu · Font thiếu dấu |
| 6. Đòn đánh, hiệu ứng, camera | thêm đòn boss, hiệu ứng bám nhân vật, biển / chữ trong màn, camera | Đòn boss phải né được · Đổi zoom lộ phần chưa có hình · Hiệu ứng gắn vật đang chuyển động · Camera sát giới hạn màn · Chụp thật trước khi chốt số |
| 7. Build, git, máy | build, nén, phát hành, chạy script, làm tài liệu | Zip bản build · QUIT bản web · Python và Edge chạy ngầm · Tài liệu thiết kế |

Mẹo thao tác (thử game trong trình duyệt của app, so lớp với ảnh demo, cắt sprite sheet, bẫy PowerShell / sed) nằm ở
[docs/meo-thu-game.md](docs/meo-thu-game.md): chỉ đọc khi làm mấy việc đó.

Mẫu một bài (ghi vào đúng nhóm, mới nhất lên đầu nhóm; đã có bài cùng chủ đề thì bổ sung vào bài đó; mỗi bài tối đa khoảng 8 dòng):

```
### Tên ngắn của lỗi
- Ngày: dd/mm/yyyy
- Triệu chứng: người dùng thấy gì
- Nguyên nhân: vì sao bị
- Cách sửa: đã sửa thế nào (file, node)
- Cách tránh lần sau: làm gì cụ thể để không bị lại
```

---

## 1. Scene và nút ⚙

### Quy tắc cho bước ⚙ Cập nhật
- Ngày: 03–06/11/2026 · có lần là **lỗi do Claude** (nhờ bấm ⚙ mà không đọc các bước cũ)
- Đã xảy ra: bước 1 của ⚙ tự tính lại `Sink`, ghi đè số 📐 đã đặt (mép đá tụt, hở khe dưới chân đồ vật); bước 23 tạo lại `bg_filter`, `bg_nha`
  mà người dùng đã kéo sang lớp khác; hồi còn 7 nút, nút ghim băng rôn giằng co với 📐. Giờ chỉ còn 3 nút:
  **⚙ Cập nhật (giữ phần bạn xếp)**, **📐 Xếp lại theo ảnh demo**, **⟳ Dựng màn từ đầu** (khoá "Cho phép xoá màn đang có").
- Cách tránh lần sau:
  1. Không thêm nút mới. Việc mới là một bước của ⚙: bấm nhiều lần vẫn ra cùng kết quả, chỉ sửa node có sẵn, không xoá.
  2. Hai chỗ cùng đặt một giá trị (vị trí, độ cao, sink) thì chọn một nguồn (`DemoLayout.ts`), chỗ kia đọc từ đó; ⚙ không ghi đè số của 📐.
  3. Bước "thêm nếu chưa có" tìm theo tên **trên cả scene** (`named()` trong `applyNewArt`); node người dùng đã kéo sang lớp khác thì không tạo lại.
  4. Thêm hình vào `FR_Top` thì bước 9 sẽ ghim nó sát mép trên (PinToScreenTop): đặt sẵn *Overlap* đúng thay vì đặt y.
  5. Sau khi người dùng bấm và Ctrl+S: so `_id` giữa `git show HEAD:assets/scenes/Main.scene` và file hiện tại để bắt thứ bị đổi ngoài ý muốn.
  6. Buộc phải sửa file scene: người dùng phải đóng Creator trước (Creator giữ scene trong bộ nhớ, Ctrl+S ghi đè lên file).

### Component gắn lúc chạy thì Inspector không chỉnh được, số trong scene không phải số chạy thật
- Ngày: 11/11/2026
- Triệu chứng: Inspector ghi boss 100 máu nhưng chơi là 150; khoảng 60 ô chỉnh của boss không có trong editor.
- Nguyên nhân: `BossBrain` / `BossArena` chỉ được `addComponent` lúc chơi, dùng số mặc định trong code và đè lên `EnemyPatrol.hp` của scene.
- Cách sửa: bước ⚙ 33 gắn sẵn hai component vào node Boss; `BOSS_HP` và bước 19 đổi thành 150.
- Cách tránh lần sau: component có ô để người dùng chỉnh thì phải nằm trong scene (thêm bằng bước ⚙). Một con số chỉ có một chỗ đặt.

### Component tự thêm component khác bị chồng, sửa scene xong "tự nhảy về"
- Ngày: 08/11/2026
- Triệu chứng: console editor báo "Can't add component 'cc.UITransform' because Tut_Pillar already contains…"; sửa scene xong bị trả về.
- Nguyên nhân: `Tut_Pillar` (TutorialBlock) có 3 Solid chồng nhau, `Ground-002` (GroundBlock) có 5, chắc do nhân bản / Undo; cái thừa vẫn chặn mèo
  theo cỡ cũ. Đã sửa trong `redraw` của hai file: tự gỡ Solid thừa, chỉ thêm Graphics khi node chưa có thứ vẽ nào.
- Cách tránh lần sau: component tự thêm component khác (`executeInEditMode`) phải dùng `getComponents` và dọn bản thừa, không chỉ
  `getComponent(X) ?? addComponent(X)`; sửa thì tìm mọi chỗ như vậy trong `assets/scripts` và sửa hết một lần.
  Thấy "Can't add component" thì mở scene đếm component của node đó.

## 2. Va chạm và hình

### Hố chỉ có trong hình, mèo đi trên không
- Ngày: 12/11/2026
- Triệu chứng: khúc cột x 6690 → 8930 có 2 hố đặt nón, nhưng mèo đi ngang qua như có sàn vô hình; nón (Hazard) không bao giờ chạm tới.
- Nguyên nhân: một khối nền đá `Ground` (Width 2240) phẳng ở 370, các cột chỉ là ảnh `Tile_` con xếp cách nhau. Khoảng giữa ảnh không làm khung va chạm hụt.
- Cách sửa (MapThu): bước `pillarPits` của 🧱 đọc mép các ảnh `Tile_`, rút khối còn cột đầu, thêm Solid cho cột sau và đáy hố. Main chưa sửa.
- Cách tránh lần sau: xếp ô đá có khe thì mỗi cột một khối nền (hay một Solid), không để một khối phủ cả khe; thử bằng cách thả mèo vào giữa khe.

### Khung va chạm không tự theo hình (đi xuyên thùng, hình lọt trong tường, chém hụt)
- Ngày: trước 03/11, 04/11, 08/11/2026
- Nguyên nhân: `Size` của Solid và PlatformerBody không đổi khi scale node hay đổi ảnh. Đồ dựng bằng `platform()` là bục một chiều (`oneWay`):
  đi ngang thì xuyên qua, khung chỉ rộng khoảng 74% hình. Khối đá xếp tay: Solid luôn đi từ gốc node (x 0 → Width), ô `Tile_n` thì kéo đi đâu cũng được.
- Cách tránh lần sau:
  1. Đổi cỡ hình thì nhắc chỉnh `Size`, bật *Debug Colliders* và Play để kiểm tra.
  2. Đo thân đồ vật trên ảnh gốc (quét alpha từng hàng), vẽ thử khung lên ảnh trước khi ghi số.
  3. Muốn đồ nào chặn hai bên thì thêm vào bảng `SOLID_PROPS` (DemoLevelBuilder.ts, bước 13 của ⚙; đã có `mg_up`, `mg_thungrac`). Một ảnh nhiều khối
     (thùng + viên gạch) thì mỗi khối một Solid trên cùng node, vì Solid phải là con trực tiếp của Gameplay.
  4. Xếp tay ô đá: mép ngoài của hình phải nằm trong [0, Width] của khối, nhất là khối cao làm tường (so khung các `Tile_*` với `_width` bằng JS).

## 3. Ảnh, âm thanh, asset

### Ảnh mới thả vào bị nhập dạng texture, code không lấy được
- Ngày: 03/11/2026, gặp lại 07/11/2026
- Triệu chứng: ảnh đã nằm trong `assets/resources/art` nhưng game vẫn dùng hình vẽ tạm; `resources.load(..., SpriteFrame)` không tìm thấy.
- Nguyên nhân: Creator nhập ảnh mới với `"type": "texture"` trong `.meta`. Sửa: Inspector → **Type = sprite-frame** → Apply.
- Cách tránh lần sau: mỗi khi người dùng thêm ảnh, `grep '"type"' assets/resources/art/<tên>.png.meta`; ra `texture` thì nhắc đổi trước khi làm.
  Tên thư mục phân biệt chữ hoa thường (`Loading_pattern` ≠ `loading_pattern`).
- Ảnh mình tự tạo: ghi sẵn `.meta` tối giản trước khi Creator nhập (`"importer": "image"`, `"imported": false`, uuid mới, `"subMetas": {}`,
  `"userData": {"type": "sprite-frame", ...}`), Creator tự điền phần còn lại. Sau đó vẫn grep lại.

### Đổi tên, chuyển file trong `assets` ngoài Creator
- Ngày: 05–06/11/2026
- Triệu chứng: đổi tên nhạc thành `bgm_boss.mp3` mà file kèm thành `bgm_boss.meta` (Creator sẽ tạo meta mới, uuid mới);
  `mv` thư mục vừa nhập ra khỏi `assets` báo `Device or resource busy` vì Creator đang giữ.
- Cách sửa: meta phải tên `<tên đầy đủ kèm đuôi>.meta`. Thư mục bị giữ: `cp` sang chỗ mới, xoá các `.meta` bị chép theo, rồi `rm -rf` thư mục cũ và `.meta` của nó.
- Cách tránh lần sau: đổi tên asset trong Creator (chuột phải → Rename); kiểm tra từng file đủ cặp `X.ext` + `X.ext.meta`.
  File nguồn (gif, `.ase`, dải sheet) thả vào `assets` thì chép ra `art-nguon/` rồi xoá bản trong `assets`; nhắc lần sau thả thẳng vào `art-nguon/`.

### Đặt ảnh theo ảnh mẫu mà tâm bị lệch (Sprite tự cắt viền trong suốt)
- Ngày: 04/11/2026
- Nguyên nhân: Sprite mặc định bật *Trim*, cắt phần trong suốt quanh hình rồi đặt phần còn lại vào giữa node, nên lệch vài chục px.
- Cách tránh lần sau: ảnh đặt theo số đo trên ảnh mẫu thì để `trim = false` và *Size Mode* = RAW (xem `ensureMainMenu` trong DemoLevelBuilder).
  Đo vị trí bằng cách dò ảnh gốc trên ảnh mẫu (OpenCV `matchTemplate` có mask), đừng ước bằng mắt.

### Đoán sai ảnh góc trái / phải của ô đá
- Ngày: 06/11/2026
- Nguyên nhân: coi `MG_tile_3` và `MG_tile_4` đều là góc phải mà không mở ảnh ra xem. Thật ra tile_3 viền liền ở mép **phải**, tile_4 ở mép **trái**
  (GroundBlock: đầu phải dùng tile_3, ô *Left End Frame* dùng tile_4, không lật).
- Cách tránh lần sau: ảnh mới để ghép (ô đá, góc, mép) thì cắt riêng mép trái và mép phải ra xem trước khi quyết định dùng ở đâu.
  Hai ảnh "cùng loại" thường là một cặp trái / phải.

### Tên file asset có dấu tiếng Việt
- Ngày: trước 03/11/2026
- Cách tránh lần sau: đặt tên không dấu (`AS_cayquat`, `FR_co`); tên như `AS_câyquất`, `FR_cờ` có thể lỗi khi build ra Android hoặc iOS.

## 4. Bẫy engine

### Bước "đổi dữ liệu cũ sang mới" chạy lại mỗi lần mở game
- Ngày: 11/11/2026
- Triệu chứng: đổi phím Special / Lướt ở kiểu Mũi tên, lần mở game sau bị trả về mặc định.
- Nguyên nhân: `load()` trong `core/Settings.ts` nhận ra "bộ phím mặc định cũ" bằng 6 phím chính; bộ Mũi tên mới trùng 6 phím đó nên lần nào cũng bị coi là cũ.
- Cách sửa: lưu thêm `keysVersion`, bước đổi chỉ chạy khi cài đặt đã lưu chưa có số này.
- Cách tránh lần sau: mọi bước tự đổi dữ liệu đã lưu (cài đặt, ô lưu) phải kèm một số bản ghi cùng dữ liệu và chỉ chạy khi số đó cũ; không nhận diện "dữ liệu cũ" bằng cách so giá trị.

### Dùng một con số to làm dấu rồi để nó tự đếm ngược
- Ngày: 11/11/2026
- Triệu chứng: mở cửa hàng / hội thoại lâu hơn 99 giây thì đóng lại mèo vẫn bất tử khoảng 15 phút.
- Nguyên nhân: `lockCats(true)` đặt `invincible = 999`, lúc mở chỉ trả về khi còn `> 900`; số này bị trừ dần mỗi khung nên chờ lâu là tụt dưới 900.
- Cách sửa: dùng hằng `LOCK_INVINCIBLE = 1e9`, so với một nửa của nó.
- Cách tránh lần sau: trạng thái "đang bị khoá" là một cờ riêng hoặc một số không thể trôi tới ngưỡng trong thời gian thật; tính năng mới dùng lại `lockCats` (cửa hàng) thì nghĩ tới trường hợp người chơi để đó rất lâu.

### Mỗi node một thứ vẽ; Graphics không theo UIOpacity; chiều cung tròn
- Ngày: 07–08/11/2026
- Đã xảy ra: xoá Graphics rồi gắn Sprite trên cùng node thì Sprite không bao giờ hiện, không báo lỗi (`destroy()` chạy cuối khung hình, gỡ luôn
  "chỗ vẽ" của node); lớp tối vẽ bằng Graphics hiện đen đặc dù UIOpacity 106/255 (nguyên nhân mới là đoán); cung nộ quanh nút L chạy ngược chiều.
- Cách tránh lần sau: mỗi node chỉ một thứ vẽ (Sprite / Label / Graphics); muốn đổi loại thì dùng **node con**, giữ Graphics và chỉ `clear()`.
  Mờ dần trên hình vẽ bằng code: đổi alpha trong `fillColor` rồi vẽ lại mỗi khung; UIOpacity chỉ dùng cho Sprite và Label.
  Trục y hướng lên nên góc giảm dần là theo chiều kim đồng hồ: `g.arc(0, 0, r, PI/2, PI/2 - k*2PI, false)`; vẽ thử ở 40% rồi chụp xem.

### Nhuộm màu ảnh có màu sẵn không ra màu muốn
- Ngày: 08/11/2026
- Nguyên nhân: `Sprite.color` nhân với màu ảnh (thanh `MG_energy_fill` xanh lá nhân vàng ra ô liu tối): chỉ làm tối / ngả màu.
- Cách tránh lần sau: muốn đổi hẳn màu (loé trắng, tô vàng) thì gán `customMaterial` = shader tô một màu (`core/Silhouette.ts`), xong trả `customMaterial = null`.

### Âm thanh: nhạc chồng nhau, nhạc không chuyển, nhạc nặng làm chậm tiếng
- Ngày: 06/11/2026
- Nguyên nhân: AudioSource (Cocos 3.8) gán `clip` mới **lúc đang phát** thì tạo trình phát mới mà không tắt cái cũ (về menu nghe 2 bài);
  `prefetch('bgm_boss')` đang tải dở thì `music('bgm_boss')` thấy "đang tải" nên thoát, tải xong không ai bật; `resources.loadDir('sounds')` tải cả
  thư mục một lượt nên nhạc 13 MB làm tiếng nhảy, chém kêu trễ. Đã sửa trong `core/Sound.ts`.
- Cách tránh lần sau: đổi `clip` thì luôn `stop()` trước. Hai đường cùng tải một thứ thì đường nào xong trước cũng phải làm nốt việc của đường kia;
  thử cả lúc file **chưa tải xong**. File lớn (nhạc "bgm*") không tải chung với thứ nhỏ cần dùng ngay.
  Thử nhạc thì đếm số nguồn đang phát (móc `AudioBufferSourceNode.prototype.start/stop`), đừng chỉ nghe hay xem `playing`.

### Slow motion: engine không có nút chỉnh tốc độ thời gian cho mọi thứ
- Ngày: 06/11/2026
- Đã thử: `Scheduler.setTimeScale` chỉ ảnh hưởng hẹn giờ, không ảnh hưởng `update(dt)` của component.
- Cách làm: `core/TimeScale.ts` thay `director.tick` bằng hàm nhân `dt` với tốc độ; nhịp chậm dần / nhanh dần chạy bằng `setInterval` + `Date.now()`
  (giờ thật). Vào màn mới gọi `TimeScale.reset()`.
- Lưu ý: trong lúc chậm, `scheduleOnce(…, 0.6)` thành vài giây giờ thật; thứ cần hiện đúng lúc (chữ ĐÃ HẠ BOSS!) dùng `setTimeout`.

### Lò xo / hiệu ứng tính theo dt văng khi một khung quá dài
- Ngày: 08/11/2026
- Triệu chứng: hình Leo cao gấp ~4 lần trong vài khung sau khi game giật (`PlayerVisual` tính lò xo nhún bằng một bước Euler với cả dt).
- Cách sửa: chia dt thành bước nhỏ (≤ 1/120 giây, tối đa 0.1 giây mỗi khung), kẹp squash trong ±0.45.
- Cách tránh lần sau: mọi lò xo / tween tự viết / rung / nảy tính theo dt phải chia bước nhỏ hoặc kẹp dt; thử bằng cách gọi `update(1)` xem có văng không.
  Muốn giữ tốc độ rơi cố định (bám tường) thì đặt `gravityScale = 0` trong frame đó và tự cộng gia tốc nhỏ, vì `move` còn cộng trọng lực sau khi kẹp vận tốc.
  Sửa vật lý xong thì đo vận tốc qua vài frame trong trình duyệt, đừng đoán.

### Import vòng làm "Missing class", mất luôn nút ⚙
- Ngày: 06/11/2026
- Triệu chứng: Console Creator đầy "Missing class ...", "Found possible circular reference ... PlayerTrigger"; Checkpoint, Goal, cá mất script,
  không thấy nút ⚙. tsc vẫn báo không lỗi.
- Nguyên nhân: `LandingScreen` import `TutorialRoom` → `TutorialExit` (kế thừa `PlayerTrigger`) → `GameManager` → `LandingScreen`.
- Cách tránh lần sau: thêm import giữa các file giao diện / màn chơi / GameManager thì chạy `python tools/kiem_tra_import_vong.py` trước khi nhờ bấm Creator.
  Muốn gọi ngược lên thì đi qua một chỗ trung gian không import gì (`GameSession`, biến tĩnh), như `GameSession.tutorial`.

### Tải lại màn: dùng `reloadScene()`
- Ngày: 04/11/2026 · **lỗi do Claude**
- Triệu chứng: bấm "Về màn hình chính" không có gì xảy ra, console báo `loadScene: Can not load the scene ''`: lúc chạy `director.getScene().name` là chuỗi rỗng.
- Cách tránh lần sau: tải lại màn thì gọi `reloadScene()` (`GameSession.ts`). Chép một đoạn code cũ sang chỗ mới thì kiểm tra đoạn cũ đã từng chạy đúng chưa.

### Kiểm tra lỗi TypeScript khi không mở được Creator
- Ngày: 03/11/2026
- Cách làm: dùng tsc đi kèm Creator:
  `node "C:/ProgramData/cocos/editors/Creator/3.8.8/resources/resources/3d/engine/node_modules/typescript/bin/tsc" -p tsconfig.json --noEmit --skipLibCheck`,
  rồi bỏ các dòng bắt đầu bằng `C:/ProgramData` (lỗi của file khai báo engine, không phải của game).
- Bẫy: project biên dịch với thư viện cũ, nên `Array.includes` báo lỗi. Dùng `indexOf(...) >= 0`.

## 5. Menu và bảng

### Checklist khi viết hay sửa một bảng / menu
- Ngày: 05–06/11/2026 (gộp 5 lỗi)
- Cách tránh lần sau:
  1. Thử mỗi bảng **hai lần liên tiếp** (mở, đóng, mở lại) bằng đúng phím người chơi bấm: bảng vừa mở từng nhận luôn chính phím vừa mở nó,
     lần đầu không bị (`MenuNav.open` đánh dấu `justOpened`, `setTimeout(0)` mới gỡ).
  2. Thử bảng hỏi lại bằng bàn phím cả hai đường KHÔNG và CÓ, mỗi đường bấm tiếp một lần sau đó: quay về từ trang con mà khung chọn nhảy lên ô đầu
     thì Enter tiếp là đóng menu (`MenuNav.open(first, keep)` với `keep = true`).
  3. Hàm nghe (`Lang.onChange`, `Settings.onChange`) là thuộc tính cố định (`private readonly onLang = () => ...`) và gỡ trong `onDestroy`,
     đừng truyền hàm mũi tên viết tại chỗ: không gỡ thì đổi ngôn ngữ sau khi chơi lại màn báo `keyCells is not iterable`.
  4. Trong `onDestroy` không vẽ, không đổi hình (`MenuNav.close(false)`): vẽ lại nút lúc đang bị xoá từng làm hỏng việc chuyển scene
     (scene trống, lỗi `reading 'r'` trong `Graphics.fill`). Viết xong bảng nào cũng thử đổi scene (Chơi lại / Về menu) và xem console.
  5. Đồ người dùng kéo trong editor để "xem thử" có thể nằm bất kỳ đâu (khung `Selection` bị kéo xuống dòng khác làm khung chọn lệch 2 dòng):
     lấy mốc gần nhất (`setupMenu` trong `LandingScreen.ts`), đừng giả định nó ở chỗ ban đầu.
  6. Định dạng thời gian: làm tròn trước (đổi ra số phần mười) rồi mới tách phút / giây, không thì 9.96 giây ra "01:010.0".

### Font Super Bouncer thiếu chữ có dấu tiếng Việt
- Ngày: 03/11/2026
- Nguyên nhân: font chỉ có 442 ký tự, có À Á Â Ê nhưng thiếu các chữ có dấu kép (Ế Ụ Ặ Ề Ư Ợ...); kiểm tra bằng script node đọc bảng `cmap` của file .ttf.
- Cách sửa: `UiKit.setText` tự chọn font: chữ không dấu dùng font game, chữ có dấu dùng font hệ thống (Arial đậm). `GameFont.keepSystemFont` chặn
  font game tải xong muộn gắn đè lên. `useGameFont` bỏ qua khi `EDITOR` (trong editor không tải font qua resources được).
- Cách tránh lần sau: chữ trên màn hình có dấu tiếng Việt thì luôn đi qua `setText`, đừng gọi thẳng `useGameFont`.
  Muốn đồng bộ font thì tìm font có hỗ trợ tiếng Việt (ví dụ Baloo 2, Be Vietnam Pro).

## 6. Đòn đánh, hiệu ứng, camera

### Đòn boss mới viết ra mà không né được
- Ngày: 08/11/2026
- Triệu chứng: thử bằng mèo giả trên preview, đòn lao ngang (lượt về) và đòn nền gợn sóng (đòn này nay đã bỏ) luôn trúng.
- Nguyên nhân: đặt số theo cảm giác. Mèo nhảy cao ~300 (1250² / 2·2600); ở trên độ cao h trong khoảng thời gian giải 1250t − 1300t² > h
  (trên 200: từ 0.2 tới 0.76 giây). Boss lao qua chỗ mèo mất (bề ngang chạm + bề ngang mèo) / tốc độ.
- Cách tránh lần sau: đòn nào bắt nhảy qua / chạy khỏi thì tính trước "mèo có kịp không" bằng các số trên, rồi thử bằng mèo giả
  (vòng lặp tự tick, né như người chơi với phản xạ 0.1–0.2 giây) trước khi báo xong. Đòn nào cũng phải có báo trước rõ và có cách né.

### Hiệu ứng gắn với một vật đang chuyển động hoặc đang teo đi
- Ngày: 06–08/11/2026
- Đã xảy ra: vệt móng đặt cố định lúc boss bắt đầu vồ, boss lao tới đè lên chính nó; quầng sáng tính cỡ theo con cá đang teo nên co về 0;
  bóng mờ khi lướt lún nửa thân xuống đất vì node mới có gốc giữa hình (0.5 / 0.5) còn hình mèo gốc ở bàn chân (0.5 / 0).
- Cách tránh lần sau: hiệu ứng đi cùng một thân đang di chuyển thì bám theo thân mỗi khung (`BossBrain.clawMark` + `CLAW_AHEAD`) hoặc tính chỗ thân sẽ dừng.
  Hiệu ứng nổ thì "chốt" vị trí / cỡ của vật gốc lúc bắt đầu. Chép hình sang node mới thì chép cả anchor (`UITransform.setAnchorPoint`).

### Về đích: mèo tự chạy mà không ra khỏi màn hình được (camera sát giới hạn màn)
- Ngày: 06/11/2026
- Nguyên nhân: cờ nằm gần cuối màn; chạy vào cờ thì camera nhìn trước nên đã chạm Max X, mép phải khung hình trùng tường, mèo kẹt
  (đã sửa bằng ô `holdExitRoom` của CameraRig). Lần thử đầu dịch mèo tới cạnh cờ nên camera chưa kịp nhìn trước, thấy đúng và suýt bỏ sót.
- Cách tránh lần sau: thử hiệu ứng camera thì đặt camera đúng chỗ nó sẽ đứng khi chơi thật (đang chạy, sát giới hạn màn), đừng chỉ dịch nhân vật tới rồi đo.

### Chụp màn hình thật trước khi chốt số (vị trí, độ mờ, chữ trên ảnh)
- Ngày: 05–08/11/2026 (gộp 5 lỗi)
- Đã xảy ra: biển hướng dẫn đặt y 760 ra ngoài màn hình (camera màn hướng dẫn chỉ thấy tới khoảng y 660 dưới HUD); vệt sáng menu nét 3px alpha 16
  chạy đúng mà không thấy; hiệu ứng trên đầu boss nằm ngoài mép trên; số cá lệch khỏi thanh nâu; bảng gợi ý che hàng tim.
- Cách tránh lần sau:
  1. Trước khi chốt chỗ đặt vật mới, dời thử bằng code trên bản xem trước và chụp màn hình, rồi mới ghi vào scene.
  2. Hiệu ứng mờ / sáng: chụp trên nền sáng nhất và tối nhất nó sẽ nằm lên, chỉnh trực tiếp trên trang tới khi thấy rõ rồi mới ghi số vào code.
     Vẽ thử một hình đặc màu đỏ để tách "không vẽ" với "vẽ mà quá nhạt". Chụp giữa chừng hiệu ứng (dừng game, tick tay), đừng chỉ đọc số opacity.
  3. Hiệu ứng trên đầu vật to (boss cao 427): đặt quanh đầu, khoảng 0.6 lần chiều cao, và chụp cả màn hình khi camera theo mèo ở dưới.
  4. Chữ đặt lên ảnh nền không cân (có hình thò ra): đo phần nền thật bằng điểm ảnh, đừng lấy tâm ảnh.
  5. Thứ vẽ trong thế giới mà bám theo nhân vật (chữ, bảng, mũi tên): thử cả lúc nhân vật ở bậc cao nhất và ở mép màn.
     Chỗ trên màn hình = toạ độ trong lớp Gameplay + `Gameplay.position`.

### Đổi zoom camera thì lộ ra phần chưa có hình
- Ngày: 11/11/2026
- Triệu chứng: zoom 1 → 0.7, dưới mặt đường thấy trời xanh (ảnh ô đá chỉ sâu ~230), qua khe giữa hai khối đá thấy trời dưới đáy sông,
  góc khu boss hở vì khối cao có đoạn đầu không có ô đá.
- Cách sửa: GroundBlock ô *Fill Below* (đất tối dưới đáy ảnh, phủ cả bề ngang khối lẫn ô đá), RiverFlow ô *Deep* (nước sâu dưới dải sông).
- Cách tránh lần sau: đổi zoom, offset hay giới hạn camera thì chụp ít nhất: đầu màn, khe / hố, bậc cao, khu boss, màn hướng dẫn,
  màn mở đầu, và giữ Xuống để nhìn xuống; xem mép dưới, mép trái / phải và các lớp ghim mép trên.

## 7. Build, git, máy

### Zip bản build: không dùng Compress-Archive
- Ngày: trước 03/11/2026
- Nguyên nhân: Compress-Archive của PowerShell ghi dấu `\` trong đường dẫn file zip, itch.io không chạy được.
- Cách tránh lần sau: nén bằng `python tools/zip_build.py build/web-mobile Leo-Escape-web.zip`.

### Nút QUIT trên bản web không đóng được tab
- Ngày: 04/11/2026
- Nguyên nhân: trình duyệt chỉ cho `window.close()` đóng tab do chính trang đó mở bằng script. Mở game từ itch.io thì bị chặn, không báo lỗi.
- Cách làm: bản native gọi `game.end()`. Bản web thử `window.close()`, không được thì thoát toàn màn hình, tắt nhạc,
  hiện "THANKS FOR PLAYING!" kèm nút về menu (`LandingScreen.answerQuit`).

### Công cụ trên máy: Python, xem trang HTML và xử lý ảnh bằng Edge chạy ngầm
- Ngày: 03–05/11/2026, cập nhật 11/11/2026
- Triệu chứng: `python ...` báo "Python was not found" (Windows mở Microsoft Store); trình duyệt trong app không mở được file `.html` trên đĩa.
- Cách tránh lần sau: trước khi chạy script Python thì kiểm tra `python --version` (máy đang dùng đã có Python 3.14, gọi bằng lệnh `python`).
  Máy nào chưa có thì viết script phụ bằng Node, hoặc nhờ người dùng cài Python.
- Xem trang HTML: `msedge --headless=new --screenshot=... --window-size=1280,11000 file:///...`, rồi cắt ảnh dài thành nhiều khúc bằng System.Drawing.
  Đừng chụp theo `#mục` (ảnh ra trống). Trang thử trên máy phải tự có `[hidden]{display:none!important}`, thiếu thì bảng `display:grid/flex` hiện chồng nhau.
- Xử lý ảnh khi không có Python: nhúng ảnh dạng data URI vào trang HTML, xử lý bằng canvas, chạy Edge ngầm (`--dump-dom` để lấy `toDataURL`).
  Ảnh nạp từ `file://` thì canvas bị khoá, không đọc được điểm ảnh.

### Tài liệu thiết kế: ít chữ, không chèn asset thật
- Ngày: 03/11/2026
- Cách tránh lần sau: `docs/thiet-ke-game.html` **không chèn asset của game**; cái gì vẽ được thì vẽ phác hoạ, chữ chỉ làm chú thích (2–4 dòng mỗi mục).
  Không tự thêm đồ nghề hay kỹ năng cho nhân vật ngoài những gì người dùng nói (bản 0.1 tự thêm bút laser cho Angelo và bị bỏ: Angelo chỉ có **dây len**).
