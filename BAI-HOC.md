# Sổ bài học

Những lỗi đã gặp và đã sửa. **Đọc trước mỗi việc**: việc nào giống bài nào thì làm theo phần *Cách tránh*.
Quy trình làm việc và lúc nào cần ghi: `.claude/skills/quy-trinh-lam-viec/SKILL.md`.

Mẫu một bài (mới nhất ghi lên đầu nhóm của nó; nếu đã có bài cùng chủ đề thì bổ sung vào bài đó):

```
### Tên ngắn của lỗi
- Ngày: dd/mm/yyyy · Nhóm: scene / editor / code / build / art / git / làm việc
- Triệu chứng: người dùng thấy gì
- Nguyên nhân: vì sao bị
- Cách sửa: đã sửa thế nào (file, node)
- Cách tránh lần sau: làm gì cụ thể để không bị lại
```

---

## Scene và editor

### Chuyển thư mục ra khỏi `assets` khi Creator đang mở
- Ngày: 05/11/2026 · Nhóm: editor
- Triệu chứng: `mv "assets/resources/art/fx/SlashFX Combos" art-nguon/SlashFX` báo `Device or resource busy`.
- Nguyên nhân: Creator vừa nhập thư mục mới (đã sinh `.meta`) và đang giữ nó. Thư mục chưa có `.meta` (như SmokeFX) thì vẫn chuyển được.
- Cách sửa: chép sang chỗ mới (`cp`), xoá các `.meta` đã bị chép theo, rồi `rm -rf` thư mục cũ cùng file `.meta` của nó (xoá thì được).
- Cách tránh lần sau: người dùng thả file nguồn (gif, `.ase`, dải sheet) vào `assets` thì chép ra `art-nguon/` rồi xoá bản trong `assets`.
  Nhớ bỏ `.meta` ở bản chép, và nhắc người dùng lần sau thả thẳng vào `art-nguon/`.

### Mèo đi xuyên vào thùng, khung va chạm lệch khỏi hình
- Ngày: 04/11/2026 · Nhóm: scene
- Triệu chứng: Leo đứng lẫn vào giữa thùng giấy có viên gạch (`mg_up`), không bị chặn. Không nhảy lên viên gạch được.
- Nguyên nhân:
  - Mọi đồ dựng bằng `platform()` đều là **bục một chiều** (`oneWay`): chỉ đứng được trên mặt, đi ngang thì xuyên qua.
  - Khung va chạm tính theo tỉ lệ ảnh cũ 0.87 × `widthFrac` 0.85, nên chỉ rộng khoảng 74% hình và đặt giữa ảnh.
  - Ảnh `MG_up` vẽ chung viên gạch với thùng, nên khung còn lệch hẳn sang trái, phủ khoảng trống phía trên viên gạch.
- Cách sửa: bảng `SOLID_PROPS` và hàm `applySolidProp` trong DemoLevelBuilder.ts, chạy ở bước 13 của nút ⚙ Cập nhật.
  - `mg_up` và `mg_thungrac` bỏ một chiều, khung ôm đúng thân, giữ độ cao mặt đứng đang có trong scene.
  - Viên gạch là một Solid thứ hai trên cùng node (Solid phải là con trực tiếp của Gameplay, nên không tách ra node con).
- Cách tránh lần sau:
  - Đo thân đồ vật trên ảnh gốc (quét alpha từng hàng bằng Python) rồi vẽ thử khung lên ảnh để xem trước khi ghi số.
  - Một ảnh chứa nhiều khối (thùng + gạch) thì mỗi khối một Solid.
  - Các đồ một chiều còn lại (thùng xốp, thùng điện, bàn, ghế đá) vẫn có khung khoảng 74% hình.
    Người dùng muốn chặn thêm đồ nào thì thêm vào `SOLID_PROPS`.

### Sửa `Main.scene` trên đĩa khi Creator đang mở
- Ngày: trước 03/11/2026 · Nhóm: scene
- Triệu chứng: chỉnh sửa bị mất, hoặc Creator ghi đè lên scene khi lưu.
- Nguyên nhân: Creator giữ scene trong bộ nhớ. Bấm Ctrl+S là ghi bản trong bộ nhớ đè lên file.
- Cách sửa: sửa hàng loạt bằng nút bấm trong editor (`DemoLevelBuilder.ts`: ⚙ Cập nhật, 📐 Xếp lại theo ảnh demo).
- Cách tránh lần sau: **scene là bản chính.** Hỏi người dùng Creator có đang mở không. Ưu tiên viết nút bấm
  trong editor, chỉ sửa node có sẵn và không xoá. Nếu buộc phải sửa file scene thì người dùng phải đóng Creator trước.

### Bấm "⚙ Cập nhật không xoá" làm mép đá tụt xuống, hở khe dưới chân đồ vật
- Ngày: 03/11/2026 · Nhóm: scene · **Lỗi do Claude**
- Triệu chứng: giữa chân đồ vật (hàng rào, chậu cây, thùng) và mặt đá hở một dải trống. Lỗi này đã được 📐 sửa một lần rồi.
- Nguyên nhân: Claude bảo người dùng bấm ⚙ để gắn ảnh nút mới, nhưng không đọc hết các bước cũ trong nút đó.
  Bước 1 của ⚙ tự tính lại `Sink` (`tileHeight × 60/285` = 59.2 và 58.7), ghi đè số đo từ ảnh demo mà 📐 đã đặt (66.5 và 83.5).
- Cách sửa: bước 1 của ⚙ giờ dùng `sink` trong `DEMO_GROUNDS` (DemoLayout.ts) nếu khối đá có trong đó. Bấm ⚙ lại là mép đá về đúng chỗ.
- Cách tránh lần sau:
  1. Trước khi bảo người dùng bấm một nút trong editor, **đọc hết mọi bước của nút đó** và nói rõ nó sẽ đổi gì.
  2. Nút sửa hàng loạt không được ghi đè số đo của nút khác (📐, DemoLayout). Số nào đã có trong DemoLayout thì lấy từ đó.
  3. Sau khi người dùng bấm nút và Ctrl+S, so scene với bản trên git (script so `_id` giữa `git show HEAD:assets/scenes/Main.scene`
     và file hiện tại) để bắt những gì bị đổi ngoài ý muốn.

### Bước ⚙ "thêm nếu chưa có" thêm lại node người dùng đã chuyển sang lớp khác
- Ngày: 06/11/2026 · Nhóm: scene
- Triệu chứng: người dùng chuyển `bg_filter` từ BG sang MG và `bg_nha` từ Gameplay sang BG; bấm ⚙ lần sau thì có thêm một
  `bg_filter` trong BG và một `bg_nha` trong Gameplay (bản trùng, làm khung 1–2 mờ đục và hiện nhà nền ở khung 3).
- Nguyên nhân: bước 23 chỉ kiểm tra "lớp cũ đã có node tên này chưa" (`parent.getChildByName`), không biết node đã sang lớp khác.
- Cách sửa: tìm theo tên trên cả Canvas (`named()` trong `applyNewArt`), và xoá hai bản trùng do bản cũ thêm vào.
- Cách tránh lần sau: bước ⚙ "thêm nếu chưa có" luôn tìm theo tên **trên cả scene**, không chỉ trong lớp cha.
  Người dùng hay kéo node sang lớp khác; đó là phần của họ, ⚙ không được tạo lại.

### Bấm ⚙ rồi Ctrl+S mà scene không được lưu
- Ngày: 06/11/2026 · Nhóm: editor
- Triệu chứng: người dùng báo "đã bấm và lưu", log Creator có dòng "Đã cập nhật...", nhưng `Main.scene` trên đĩa vẫn là bản cũ (2 lần liền).
- Nguyên nhân: thay đổi do code của nút ⚙ làm không phải lúc nào cũng bật dấu `*` (chưa lưu) trên tên scene, nên Ctrl+S không ghi gì.
- Cách sửa: nhờ người dùng kéo nhẹ một node cho hiện dấu `*` rồi Ctrl+S; lần đó file được ghi.
- Cách tránh lần sau: người dùng báo đã lưu thì **luôn xem giờ sửa của `assets/scenes/Main.scene`** (`ls -la --time-style=full-iso`)
  và tìm trong file một node/giá trị mà ⚙ vừa đổi, trước khi thử hay so ảnh. Khi nhờ bấm ⚙, dặn luôn: thấy dấu `*` rồi mới Ctrl+S.

### Nhiều nút sửa hàng loạt giằng co nhau (📌 Ghim băng rôn với 📐)
- Ngày: 03/11/2026 · Nhóm: scene
- Triệu chứng: 📐 đặt băng rôn theo độ cao demo, nhưng PinToScreenTop (thêm bởi 📌) kéo ngay về sát mép trên.
  Băng rôn ở khung 1, 3, 4 cao hơn demo khoảng 100px.
- Nguyên nhân: 7 nút, mỗi nút viết vào một lúc, không nút nào biết nút kia đặt gì. Cùng loại lỗi với vụ mép đá ở trên.
- Cách sửa: gộp lại còn 3 nút. ⚙ gồm mọi việc "thêm nếu thiếu, không dời". 📐 bỏ qua độ cao của node đã ghim.
  ⟳ có khoá an toàn "Cho phép xoá màn đang có".
- Cách tránh lần sau: **không thêm nút mới.** Việc mới thì thêm thành một bước của ⚙, và bước đó phải bấm nhiều lần
  vẫn ra cùng kết quả. Hai chỗ cùng đặt một giá trị (vị trí, độ cao, sink...) thì chọn một nguồn (DemoLayout) và cho chỗ kia đọc từ đó.
- Bổ sung 06/11/2026: bước 9 của ⚙ gắn PinToScreenTop cho **mọi** hình trong `FR_Top`, nên 4 tán lá `fr_bush` mới thêm cũng bị ghim
  sát mép trên (Overlap 4). Tán lá lớn vốn nhô ra ngoài khung bị kéo tụt xuống ~280, che chim và bảng Lợi Ký. Sửa: bước 24 đặt
  Overlap riêng cho từng tán lá. **Thêm hình vào `FR_Top` thì tính luôn việc nó sẽ bị ghim**: đặt sẵn Overlap đúng thay vì đặt y.

### Kiểm tra lớp nào đè lớp nào so với demo
- Ngày: 03/11/2026 · Nhóm: làm việc
- Cách làm: `tools/so-sanh-demo/` dựng lại 4 khung camera từ file scene (vị trí, tỉ lệ, parallax, thứ tự vẽ) bằng Node
  và System.Drawing, rồi đặt ảnh demo bên dưới. Không cần mở Creator. Phóng to từng vùng để so chân đồ vật với mép đá.
- Lưu ý: không vẽ phần Graphics (tia nắng, sương, hào quang). Muốn so bản trên git thì chạy với `git show HEAD:assets/scenes/Main.scene`.
- Bẫy: trước khi kết luận "lỗi do nút X", đọc lại số trong scene **hiện tại**, vì người dùng có thể đã bấm và lưu rồi.

### Giá trị lưu trong scene đè lên giá trị mặc định trong code
- Ngày: trước 03/11/2026 · Nhóm: code
- Triệu chứng: đổi giá trị mặc định của `@property` trong code nhưng game không đổi.
- Nguyên nhân: component đã lưu trong scene giữ giá trị cũ, và giá trị đó thắng giá trị trong code.
- Cách sửa: đặt **tên property mới**, ví dụ `artFacesRight`, để scene nhận giá trị mặc định mới.
- Cách tránh lần sau: muốn đổi hành vi của node đã có trong scene thì không chỉ sửa giá trị mặc định.
  Đặt tên property mới, hoặc sửa qua nút "Cập nhật", hoặc bảo người dùng chỉnh trong Inspector.

### Font Super Bouncer thiếu chữ có dấu tiếng Việt
- Ngày: 03/11/2026 · Nhóm: art
- Triệu chứng: chữ tiếng Việt viết bằng font game sẽ mất hoặc vỡ những chữ như Ế Ụ Ặ Ề Ư Ợ Ạ Ệ Ứ Ờ Ả Ỹ Ơ Ổ Ị Ọ.
- Nguyên nhân: font chỉ có 442 ký tự, có À Á Â Ê nhưng không có các chữ có dấu kép của tiếng Việt.
  Kiểm tra bằng cách đọc bảng `cmap` của file .ttf (script node, xem lịch sử phiên 03/11/2026).
- Cách sửa: `UiKit.setText` tự chọn font. Chữ không dấu (START, LEO) dùng font game, chữ có dấu dùng font hệ thống (Arial đậm).
  `GameFont.keepSystemFont` chặn font game tải xong muộn gắn đè lên label đã chuyển sang font hệ thống.
- Cách tránh lần sau: chữ trên màn hình có dấu tiếng Việt thì luôn đi qua `setText`, đừng gọi thẳng `useGameFont`.
  Muốn đồng bộ font thì tìm font có hỗ trợ tiếng Việt (ví dụ Baloo 2, Be Vietnam Pro).

### Giới hạn tốc độ rơi (bám tường) nhưng vẫn rơi nhanh
- Ngày: 04/11/2026 · Nhóm: code
- Triệu chứng: Angelo bám tường mà vẫn trượt xuống nhanh (đo được 300 thay vì 170).
- Nguyên nhân: giới hạn vận tốc ngay trước `b.move`, nhưng trong `move` trọng lực lại cộng thêm.
- Cách tránh lần sau: muốn giữ tốc độ rơi cố định thì đặt `gravityScale = 0` trong frame đó và tự cộng gia tốc nhỏ.
  Sửa vật lý xong thì đo vận tốc qua vài frame trong trình duyệt, đừng đoán.

### Hai `@ccclass` trong cùng một file
- Ngày: trước 03/11/2026 · Nhóm: code
- Triệu chứng: component không hiện hoặc không nhận đúng trong editor.
- Cách tránh lần sau: mỗi file `.ts` chỉ một `@ccclass`, tên file trùng tên class.

### Hình vẽ bằng Graphics bị mất sau khi mở lại scene
- Ngày: trước 03/11/2026 · Nhóm: code
- Nguyên nhân: nét vẽ của `Graphics` không được lưu vào scene.
- Cách tránh lần sau: vẽ lại trong `onLoad`, kèm `executeInEditMode` để editor cũng thấy.

### `resources.load` không chạy trong editor
- Ngày: trước 03/11/2026 · Nhóm: editor
- Cách sửa: hỏi `asset-db` lấy uuid rồi gọi `assetManager.loadAny(uuid)` (xem `loadArtInEditor`).
- Cách tránh lần sau: code chạy trong editor (`executeInEditMode`, nút bấm) không dùng `resources.load`.

### Đổi tên file asset ngoài Creator làm sai tên file .meta
- Ngày: 06/11/2026 · Nhóm: editor
- Triệu chứng: đổi tên nhạc thành `bgm_boss.mp3` mà file kèm thành `bgm_boss.meta` (đúng phải là `bgm_boss.mp3.meta`).
  Để vậy thì Creator tạo meta mới (mã uuid mới) và coi meta cũ là "mồ côi".
- Cách sửa: đổi tên meta thành `<tên file đầy đủ kèm đuôi>.meta`, nội dung giữ nguyên.
- Cách tránh lần sau: đổi tên asset trong Creator (chuột phải → Rename). Mỗi khi người dùng thêm / đổi file, kiểm tra từng file có đúng cặp `X.ext` + `X.ext.meta`.

### Nhạc nặng làm chậm mọi tiếng hiệu ứng
- Ngày: 06/11/2026 · Nhóm: code
- Nguyên nhân: `resources.loadDir('sounds')` tải cả thư mục một lượt; thêm 2 bài nhạc 13 MB thì tiếng nhảy, chém... phải chờ tải xong hết mới kêu.
- Cách sửa: `Sound.preload` chỉ tải tiếng hiệu ứng (bỏ file tên bắt đầu "bgm"); `Sound.music` tải riêng bài cần phát; `Sound.prefetch` tải sẵn nhạc boss lúc chiếu mở màn.
- Cách tránh lần sau: file lớn (nhạc, ảnh nền to) không gộp chung với thứ nhỏ cần dùng ngay.

### Về đích: mèo tự chạy mà không ra khỏi màn hình được
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: chạm cờ, camera đứng yên, mèo chạy sang phải nhưng đụng tường cuối màn ngay mép màn hình, đứng kẹt tới hết 4 giây chờ.
- Nguyên nhân: cờ nằm gần cuối màn; chạy vào cờ thì camera nhìn trước (~380 px) nên đã chạm Max X, mép phải khung hình trùng tường.
  Lúc thử đầu tiên tôi dịch mèo tới cạnh cờ nên camera chưa kịp nhìn trước, thấy chạy đúng và suýt bỏ sót.
- Cách sửa: lúc giữ camera, nếu mép phải khung hình cách Max X ít hơn `holdExitRoom` (250) thì camera trượt nhẹ sang trái.
- Cách tránh lần sau: thử hiệu ứng camera thì đặt camera đúng chỗ nó sẽ đứng khi chơi thật (đang chạy, sát giới hạn màn),
  đừng chỉ dịch nhân vật tới rồi đo. Cờ, cửa ra... nằm sát cuối màn thì nhớ camera đã bị giới hạn chặn.
- Bẫy khi thử: cờ đích đứng trên bậc đá cao ngay mép trái bậc; đặt mèo lùi về bên trái là rơi xuống dưới bậc, không tới cờ được.

### Về menu mà nhạc rừng vẫn phát chồng lên nhạc menu
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: vào game rồi về menu thì nghe cả `bgm_forest` lẫn nhạc menu `bgm` cùng lúc.
- Nguyên nhân: bẫy của AudioSource trong Cocos 3.8: gán `clip` mới **trong lúc đang phát** thì engine tạo trình phát mới
  mà không tắt trình phát cũ, nên bài cũ vẫn chạy (bắt được bằng cách móc `AudioBufferSourceNode.start/stop` trong trình duyệt:
  sau khi về menu còn 2 nguồn đang phát, dài 167 giây và 16 giây).
- Cách sửa: `Sound.music()` gọi `stop()` trước khi đổi `clip` (`core/Sound.ts`). Thử lại: về menu chỉ còn đúng nguồn 16 giây.
- Cách tránh lần sau: đổi `clip` của AudioSource thì luôn `stop()` trước. Thử nhạc thì đếm số nguồn âm thanh đang phát
  (móc `AudioBufferSourceNode.prototype.start/stop`), đừng chỉ nghe hay chỉ xem `playing`.

### Nhạc thường vẫn phát trong trận boss
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: vào đánh boss mà vẫn nghe `bgm_forest`, không chuyển sang `bgm_boss`.
- Nguyên nhân: `prefetch('bgm_boss')` đang tải dở thì tới lúc đánh, `music('bgm_boss')` thấy "đang tải" nên thoát luôn;
  `prefetch` tải xong chỉ cất bài đó lại, không ai bật. Nhạc thường cũng chưa được tắt lúc vào hang.
- Cách sửa: `prefetch` tải xong thì kiểm tra, nếu game đang muốn phát đúng bài đó thì phát luôn. Vào hang thì `Sound.stopMusic()` ngay.
- Cách tránh lần sau: có hai đường cùng tải một thứ thì đường nào tải xong trước cũng phải làm nốt việc của đường kia.
  Khi thử, phải thử cả trường hợp file **chưa tải xong** lúc cần dùng, đừng chỉ thử khi đã có sẵn.

### Slow motion: engine không có nút chỉnh tốc độ thời gian cho mọi thứ
- Ngày: 06/11/2026 · Nhóm: code
- Đã thử: `Scheduler.setTimeScale` chỉ ảnh hưởng hẹn giờ, không ảnh hưởng `update(dt)` của component.
- Cách làm: `core/TimeScale.ts` thay `director.tick` bằng hàm nhân `dt` với tốc độ → mọi update, tween, hẹn giờ đều chậm theo.
  Nhịp chậm dần / nhanh dần chạy bằng `setInterval` + `Date.now()` (giờ thật, không bị chậm theo chính nó). Vào màn mới gọi `TimeScale.reset()`.
- Lưu ý: trong lúc chậm, `scheduleOnce(…, 0.6)` thành vài giây giờ thật; thứ cần hiện đúng lúc (chữ ĐÃ HẠ BOSS!) dùng `setTimeout`.

### Ảnh mới thả vào bị nhập dạng texture, code không lấy được
- Ngày: 03/11/2026 · Nhóm: art
- Triệu chứng: ảnh mới (`Button_*`, `MG_energy_*`) đã nằm trong `assets/resources/art` nhưng game vẫn dùng hình vẽ tạm.
- Nguyên nhân: Creator nhập ảnh mới với `"type": "texture"` trong file `.meta`, nên không có sprite-frame để `resources.load(.../spriteFrame)` lấy.
- Cách sửa: chọn ảnh → Inspector → **Type = sprite-frame** → Apply.
- Cách tránh lần sau: mỗi khi người dùng thêm ảnh, kiểm tra `.meta` bằng `grep '"type"' assets/resources/art/<tên>.png.meta`.
  Nếu là `texture` thì nhắc người dùng đổi trước khi làm.
- Ảnh do mình tự tạo (cắt sprite sheet...): ghi sẵn `.meta` tối giản trước khi Creator nhập
  (`"importer": "image"`, `"imported": false`, uuid mới, `"subMetas": {}`, `"userData": {"type": "sprite-frame", ...}`).
  Creator giữ đúng `sprite-frame` và tự điền phần còn lại (đã thử 05/11/2026 với 26 ảnh `FX_*`). Sau đó vẫn grep lại cho chắc.

### Cắt sprite sheet hiệu ứng
- Ngày: 05/11/2026 · Nhóm: art
- Bẫy: hai bản màu của cùng một tấm sheet có thể xếp hàng khác nhau (bản xanh và bản cam của tấm FX: cột phải lệch thứ tự).
  Luôn dò lại hàng trên đúng tấm sẽ cắt, đừng dùng số hàng của bản kia.
- Cách làm: đo trước (chạy thử không ghi file) xem hình có chạm mép ô / tràn sang ô bên không, cắt xong ghép thành một hình kiểm tra gửi người dùng.
- Bẫy PowerShell: `| Select-Object -First 1` sau một script sẽ **dừng luôn script** sau dòng đầu tiên (file không được ghi). Dùng `| Out-Null`.
- Bẫy PowerShell: tên biến không phân biệt hoa thường. Tham số `$Jobs` và biến `$jobs` trong script là **một biến**, ghi đè nhau. Đặt tên khác hẳn (`$JobSpec`).
- Hình to hơn ô lưới (vòng sóng khung cuối) thì bị cắt mất viền: kiểm tra số điểm ảnh chạm mép (`edge`) khi đo trước, khung nào bị cắt thì bỏ.

### Khung chọn menu lệch 2 dòng so với dòng đang chọn
- Ngày: 05/11/2026 · Nhóm: code
- Triệu chứng: chọn NEW GAME mà khung chọn nằm ở ACHIEVEMENTS (thấp hơn 2 dòng).
- Nguyên nhân: code lấy khoảng lệch giữa node `Selection` và **dòng đầu** làm mốc; người dùng kéo `Selection` xuống dòng ACHIEVEMENTS trong editor
  để xem thử, nên khoảng lệch thành −152.
- Cách sửa: lấy khoảng lệch so với **dòng gần khung nhất** (`setupMenu` trong `LandingScreen.ts`).
- Cách tránh lần sau: đồ vật người dùng kéo trong editor để "xem thử" có thể nằm bất kỳ đâu. Đừng giả định nó ở chỗ ban đầu; lấy mốc gần nhất.

### Đặt ảnh theo ảnh mẫu mà tâm bị lệch (Sprite tự cắt viền trong suốt)
- Ngày: 04/11/2026 · Nhóm: art
- Triệu chứng: đo tâm logo, khung chọn trên ảnh mẫu rồi đặt đúng số đó, nhưng hình vẫn lệch vài chục px.
- Nguyên nhân: Sprite mặc định bật *Trim*, cắt bỏ phần trong suốt quanh hình rồi đặt phần còn lại vào giữa node.
  Ảnh có quầng sáng hay viền trống không đều (như `logo.png`) thì tâm phần còn lại khác tâm ảnh gốc.
- Cách tránh lần sau: ảnh đặt theo số đo trên ảnh mẫu thì để `trim = false` và *Size Mode* = RAW (xem `ensureMainMenu` trong DemoLevelBuilder).
  Đo vị trí bằng cách dò ảnh gốc trên ảnh mẫu (OpenCV `matchTemplate` có mask), đừng ước bằng mắt.

### Kích thước va chạm không tự theo khi scale hình
- Ngày: trước 03/11/2026 · Nhóm: scene
- Triệu chứng: chém hụt, đứng lơ lửng, hoặc bị đụng khi chưa chạm.
- Nguyên nhân: `Size` của **Solid** và **PlatformerBody** không đổi khi scale node hay đổi ảnh.
- Cách tránh lần sau: đổi cỡ hình thì nhắc chỉnh `Size`, rồi bật *Debug Colliders* và Play để kiểm tra.

## Code giao diện (menu, bảng)

### Khối vẽ trong editor bị chồng component, sửa scene xong "tự nhảy về"
- Ngày: 08/11/2026 · Nhóm: scene
- Triệu chứng: console editor báo "Can't add component 'cc.UITransform' because Tut_Pillar already contains…",
  "Can't add renderable component…"; người dùng thấy sửa scene xong bị trả về.
- Nguyên nhân: node \`Tut_Pillar\` (TutorialBlock) có 3 Solid chồng nhau (cao 400 / 430 / 428.6), chắc do nhân bản / Undo khi đang
  sửa chiều cao. Code chỉ cập nhật Solid đầu, hai cái thừa vẫn chặn mèo theo cỡ cũ; lỗi khi thêm component làm editor huỷ thao tác.
- Cách sửa: \`TutorialBlock.redraw\` tự gỡ Solid thừa (giữ 1), chỉ thêm Graphics khi node chưa có thứ vẽ nào.
  Người dùng đổi Height của khối một chút rồi đổi lại để nó vẽ lại, Ctrl+S.
- Cách tránh lần sau: component tự thêm component khác (executeInEditMode) phải dùng \`getComponents\` và dọn bản thừa,
  không chỉ \`getComponent ?? addComponent\`. Thấy lỗi "Can't add component" thì mở scene đếm component của node đó.
- Thêm: \`useGameFont\` trong editor không tải được font qua resources (báo lỗi vàng vô hại) → bỏ qua khi EDITOR.

### Xoá Graphics rồi gắn Sprite trên cùng node: Sprite không bao giờ hiện
- Ngày: 07/11/2026 · Nhóm: code
- Triệu chứng: màn tải đổi hình tạm (Graphics) sang ảnh hoạ tiết (Sprite) trên cùng node: Sprite có ảnh, có màu, đúng lớp
  mà không vẽ ra gì; không có lỗi nào trong console.
- Nguyên nhân: \`destroy()\` component chỉ chạy ở cuối khung hình; lúc chạy, Graphics gỡ luôn "chỗ vẽ" của node,
  kéo theo Sprite vừa gắn cùng khung.
- Cách sửa: giữ Graphics (chỉ \`clear()\`), ảnh đặt vào **node con** riêng.
- Cách tránh lần sau: mỗi node chỉ một thứ vẽ (Sprite / Label / Graphics). Muốn đổi loại thì dùng node con, đừng xoá-rồi-gắn trên cùng node.
- Thêm: ảnh mới thả vào mà Type = texture thì \`resources.load(..., SpriteFrame)\` không tìm thấy — phải đổi Type = sprite-frame (Apply);
  tên thư mục phân biệt chữ hoa thường (\`Loading_pattern\` ≠ \`loading_pattern\`).

### Hiệu ứng vẽ bằng Graphics: con số "đúng" mà nhìn không thấy / quá nhạt
- Ngày: 07/11/2026 · Nhóm: code
- Triệu chứng: vệt sáng ngang chữ ở menu (nét 3px, quầng alpha 16) chạy đúng, đúng chỗ mà nhìn không thấy;
  lớp tối của bảng tạm dừng alpha 205 nhưng màn hướng dẫn (tờ giấy trắng) phía sau vẫn sáng rõ.
- Nguyên nhân: nét mảnh và mờ thì ở cỡ màn hình thật / khung xem thu nhỏ biến mất; nền trắng cần lớp tối đậm hơn nhiều so với nền rừng tối.
- Cách sửa: vệt sáng 5px, quầng alpha 34 × 7 lớp, dài hơn chữ 200 mỗi bên; lớp tối bảng tạm dừng 240.
- Cách tránh lần sau: hiệu ứng mờ / sáng phải **chụp màn hình xem bằng mắt** trên nền sáng nhất và tối nhất nó sẽ nằm lên,
  chỉnh trực tiếp trên trang (gán lại hàm vẽ bằng JS) cho tới khi thấy rõ rồi mới ghi số vào code. Thử vẽ một hình đặc màu đỏ
  để tách "không vẽ" với "vẽ mà quá nhạt".

### Lớp tối vẽ bằng Graphics hiện đen kịt dù UIOpacity đang ở mức thấp
- Ngày: 07/11/2026 · Nhóm: code
- Triệu chứng: lật trang truyện, trang đang gập lẽ ra tối dần (UIOpacity 106/255) nhưng hiện đen đặc, che hết tranh.
- Nguyên nhân (đoán, chưa đào tới tận engine): đổi UIOpacity liên tục trên node chỉ có Graphics không làm hình vẽ trong suốt theo ngay;
  màu đã vẽ (đen 255) được giữ nguyên.
- Cách sửa: vẽ lại Graphics mỗi khung với độ trong suốt nằm trong màu tô (\`fillColor\` có alpha), không dùng UIOpacity cho hình vẽ.
- Cách tránh lần sau: hiệu ứng mờ dần trên hình vẽ bằng code thì đổi alpha trong màu rồi vẽ lại; UIOpacity dùng cho Sprite và Label.
  Luôn chụp giữa chừng hiệu ứng (dừng game, tick tay) để thấy, đừng chỉ đọc số opacity.

### Import vòng làm "Missing class", mất luôn nút ⚙
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: Console Creator đầy "Missing class ...", "Found possible circular reference ... PlayerTrigger"; Checkpoint, Goal, cá... mất script,
  DemoLevelBuilder cũng hỏng nên không thấy nút ⚙ Cập nhật. tsc vẫn báo không lỗi.
- Nguyên nhân: mình cho `LandingScreen` import `TutorialRoom` → `TutorialExit` (kế thừa `PlayerTrigger`) → `PlayerTrigger` import `GameManager`
  → `GameManager` import `LandingScreen`. Creator nạp theo vòng nên lúc định nghĩa `TutorialExit` thì lớp `PlayerTrigger` chưa có.
- Cách sửa: `TutorialRoom` tự gắn vào `GameSession.tutorial`, `LandingScreen` gọi qua đó, không import `TutorialRoom` nữa.
- Cách tránh lần sau: thêm import giữa các file giao diện / màn chơi / GameManager thì chạy `python tools/kiem_tra_import_vong.py`
  trước khi nhờ người dùng bấm Creator. Muốn gọi ngược lên thì đi qua một chỗ trung gian không import gì (GameSession, biến tĩnh).

### Đổi ngôn ngữ báo lỗi `keyCells is not iterable` sau khi chơi lại màn
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: Chơi lại / Về menu rồi đổi ngôn ngữ trong Cài đặt thì màn hình lỗi đỏ.
- Nguyên nhân: PauseMenu đăng ký `Lang.onChange(...)` nhưng không gỡ. Scene cũ bị xoá, component cũ bị xoá sạch dữ liệu (`keyCells` thành null)
  mà hàm nghe vẫn nằm trong danh sách, đổi ngôn ngữ là gọi vào nó.
- Cách sửa: hàm nghe là thuộc tính cố định (`private readonly onLang = () => ...`), `onDestroy` gọi `Lang.offChange(this.onLang)`;
  TutorialHint gỡ `Settings.onChange` trong `onDestroy`.
- Cách tránh lần sau: mỗi `X.onChange(...)` / `input.on(...)` / danh sách tĩnh phải có cặp gỡ trong `onDestroy`. Đừng truyền hàm mũi tên viết tại chỗ (không gỡ được).

### Hiệu ứng nổ bám theo thứ đang teo đi
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: cá bị ăn, quầng sáng đáng ra nở to rồi tan thì lại co về 0 cùng con cá.
- Nguyên nhân: cỡ quầng tính theo bề ngang cá mỗi khung, mà lúc nổ cá đang teo (tween scale → 0).
- Cách tránh lần sau: lúc bắt đầu hiệu ứng nổ thì "chốt" vị trí / cỡ của vật gốc, đừng bám theo nữa. Đo số từng khung (scale, opacity) để thấy ngay.

### Bảng gợi ý bám theo mèo đè lên hàng tim
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: mèo đứng trên bậc cao thì bảng hướng dẫn trên đầu mèo bị đẩy lên mép trên, che tim và thanh năng lượng.
- Cách sửa: `TutorialHint.follow` kẹp mép trên bảng dưới dải HUD (250 tính từ mép trên khung); bị kẹp tới đầu mèo thì dời sang bên cạnh.
  Đổi toạ độ: chỗ trên màn hình = toạ độ trong lớp Gameplay + `Gameplay.position` (lớp là con của Canvas, tâm khung hình).
- Cách tránh lần sau: mọi thứ vẽ trong thế giới mà bám theo nhân vật (chữ, bảng, mũi tên) phải thử cả lúc nhân vật ở bậc cao nhất và mép màn.

### Quay lại trang trước thì khung chọn nhảy về ô đầu
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: Chơi lại màn → KHÔNG → về menu, khung chọn nhảy lên "Tiếp tục"; bấm Enter tiếp là đóng menu.
- Cách sửa: `MenuNav.open(first, keep)`; PauseMenu quay về từ trang con (Quay lại, KHÔNG, Esc) thì `keep = true`. Mở mới (Esc) vẫn chọn ô đầu.
- Cách tránh lần sau: thử bảng hỏi lại bằng bàn phím cả hai đường KHÔNG và CÓ, mỗi đường bấm tiếp một lần sau đó.

### Tải lại màn bị hỏng vì bảng vẽ lại nút lúc đang bị xoá
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: bấm Về menu / Chơi lại ở bảng kết quả thì màn không tải lại, scene trống (không còn Canvas); console báo lỗi
  `Cannot read properties of null (reading 'r')` trong `Graphics.fill` ← `MenuNav.close` ← `PauseMenu.onDestroy`.
- Nguyên nhân: đổi scene thì mọi component bị xoá; `onDestroy` của PauseMenu đóng các bảng, bảng tắt viền chọn của từng nút
  → vẽ lại trên Graphics đã bị xoá → lỗi văng giữa lúc engine đang xoá scene cũ, làm hỏng luôn việc chuyển scene.
- Cách sửa: `MenuNav.close(false)` trong `onDestroy` (không vẽ lại); nút trong `UiKit` không vẽ khi `Graphics` đã `!isValid`.
- Cách tránh lần sau: trong `onDestroy` chỉ dọn dẹp (gỡ đăng ký, huỷ hẹn giờ), **không vẽ, không đổi hình**.
  Viết xong bảng nào cũng thử một lần đổi scene (Chơi lại / Về menu) và xem console.

### Bảng vừa mở nhận luôn chính phím vừa mở nó
- Ngày: 06/11/2026 · Nhóm: code
- Triệu chứng: Esc mở menu tạm dừng rồi menu đóng ngay; Enter vào "Chơi lại màn" thì bảng hỏi lại tự chọn KHÔNG.
- Nguyên nhân: nhiều chỗ cùng nghe sự kiện phím. Bảng mở ra trong lúc xử lý một lần bấm, rồi bộ nghe của bảng (chạy sau) lại xử lý tiếp chính lần bấm đó.
  Lần đầu không bị vì bộ nghe của MenuNav chỉ đăng ký sau lần mở đầu tiên, nên thử một lần thấy đúng, mở lần hai mới lỗi.
- Cách sửa: `MenuNav.open` đánh dấu `justOpened`, `setTimeout(0)` mới gỡ (chạy sau khi sự kiện hiện tại xử lý xong, kể cả lúc tạm dừng).
- Cách tránh lần sau: thử mỗi bảng **hai lần liên tiếp** (mở, đóng, mở lại) bằng đúng phím người chơi bấm.

### Định dạng thời gian ra "01:010.0"
- Ngày: 06/11/2026 · Nhóm: code
- Nguyên nhân: kiểm tra "giây < 10 thì thêm số 0" trước khi làm tròn; 9.96 làm tròn thành "10.0" nhưng vẫn bị thêm 0.
- Cách tránh lần sau: làm tròn trước (đổi ra số phần mười), rồi mới tách phút / giây.

## Xếp màn theo ảnh demo

### Đoán sai tỉ lệ ảnh demo (0.87 thay vì 1)
- Ngày: trước 03/11/2026 · Nhóm: làm việc
- Triệu chứng: đồ vật xếp lệch và sai cỡ so với 4 ảnh demo.
- Nguyên nhân: tỉ lệ được đoán chứ không đo. Thực ra ảnh demo vẽ mọi thứ đúng cỡ gốc (tỉ lệ 1).
- Cách tránh lần sau: con số nào lấy từ ảnh mẫu thì **đo và so 1-1** trước (node DemoRef, tích *Hiện ảnh demo*),
  không đoán. Toạ độ: 1px ảnh = 1.5 đơn vị game, `FRAME_CAM = [660, 2580, 4500, 6420]`.

## Build và phát hành

### Zip bằng Compress-Archive làm itch.io không chạy
- Ngày: trước 03/11/2026 · Nhóm: build
- Nguyên nhân: Compress-Archive của PowerShell ghi dấu `\` trong đường dẫn file zip.
- Cách sửa: `python tools/zip_build.py build/web-mobile Leo-Escape-web.zip`.
- Cách tránh lần sau: không dùng Compress-Archive để nén bản build.

### Nút QUIT trên bản web không đóng được tab
- Ngày: 04/11/2026 · Nhóm: build
- Nguyên nhân: trình duyệt chỉ cho `window.close()` đóng tab do chính trang đó mở bằng script. Mở game từ itch.io thì bị chặn, không báo lỗi.
- Cách làm: bản native gọi `game.end()`. Bản web thử `window.close()`, không được thì thoát toàn màn hình, tắt nhạc,
  hiện "THANKS FOR PLAYING!" kèm nút về menu (`LandingScreen.answerQuit`). Đây cũng là cách các game web hay làm.

### Đoán sai ảnh góc trái / phải của ô đá
- Ngày: 06/11/2026 · Nhóm: art
- Triệu chứng: đầu khối đá ngay trước cái hố ở khung 1 hiện `MG_tile_4`, người dùng phải chỉ ra "chỗ này phải xài tile_3".
- Nguyên nhân: người dùng nói tile_3 và tile_4 đều là "khối lộ ra ngoài"; mình coi cả hai là góc phải và bốc ngẫu nhiên cho mọi đầu khối,
  không mở ảnh ra xem. Thật ra tile_3 có viền liền ở mép **phải** (góc phải), tile_4 có viền liền ở mép **trái** (góc trái).
- Cách sửa: GroundBlock có ô *Left End Frame*; đầu phải dùng tile_3, đầu trái dùng tile_4 (không lật).
- Cách tránh lần sau: ảnh mới để ghép (ô đá, góc, mép) thì **cắt riêng mép trái và mép phải ra xem** trước khi quyết định dùng ở đâu.
  Hai ảnh "cùng loại" thường là một cặp trái / phải.

### Tên file asset có dấu tiếng Việt
- Ngày: trước 03/11/2026 · Nhóm: art
- Nguyên nhân: tên như `AS_câyquất` hay `FR_cờ` có thể lỗi khi build ra Android hoặc iOS.
- Cách tránh lần sau: đặt tên file không dấu, ví dụ `AS_cayquat` hay `FR_co`.

## Tài liệu thiết kế

### Tài liệu nhiều chữ, lại chèn asset thật của game
- Ngày: 03/11/2026 · Nhóm: làm việc
- Triệu chứng: người dùng yêu cầu bỏ hết ảnh asset đang có ra khỏi `docs/thiet-ke-game.html` và cắt bớt chữ.
- Nguyên nhân: bản 0.1 chèn art thật (Leo, boss, ảnh demo) và viết đoạn văn dài, bảng nhiều chữ.
- Cách sửa: bản 0.2 chỉ dùng hình phác hoạ tự vẽ. Mỗi mục có hình làm chính, kèm 2–4 dòng ngắn. Bảng chỉ giữ ở chỗ cần tra (phím, giai đoạn trùm).
- Cách tránh lần sau: tài liệu thiết kế **không chèn asset của game**. Cái gì vẽ được thì vẽ, chữ chỉ làm chú thích.
  Không tự thêm đồ nghề hay kỹ năng cho nhân vật ngoài những gì người dùng nói. Bản 0.1 tự thêm bút laser cho Angelo và bị bỏ đi:
  Angelo chỉ có **dây len**.

## Công cụ trên máy

### Máy công ty không có Python
- Ngày: 03/11/2026 · Nhóm: build
- Triệu chứng: chạy `python ...` báo "Python was not found" (Windows mở Microsoft Store).
- Nguyên nhân: máy công ty chưa cài Python, chỉ có Node.js. `tools/zip_build.py` và `tools/make_sfx.py` cần Python.
- Cách tránh lần sau: trước khi chạy script Python thì kiểm tra `python --version`. Ở máy công ty, viết script phụ bằng Node.
  Muốn nén bản build hay sinh lại âm thanh ở máy này thì phải nhờ người dùng cài Python trước.
- Bổ sung 05/11/2026: cần xử lý ảnh (cắt nền, đọc `.webp`) mà không có Python thì nhúng ảnh dạng data URI vào một trang HTML,
  xử lý bằng canvas, rồi chạy Edge ngầm: `--screenshot` để xem, `--dump-dom` để lấy kết quả (`toDataURL`) ra file.
  Ảnh phải là data URI, nếu nạp từ `file://` thì canvas bị khoá, không đọc được điểm ảnh.
  Trang thử trên máy phải tự có `[hidden]{display:none!important}`. Thiếu dòng này thì mọi bảng có `display:grid/flex` hiện chồng lên nhau
  (trang Artifact đã đăng thì có sẵn dòng này).

### Nút "Về màn hình chính" (và thua rồi chơi lại) không tải lại được màn
- Ngày: 04/11/2026 · Nhóm: code · **Lỗi do Claude**
- Triệu chứng: bấm "Về màn hình chính" thì không có gì xảy ra. Console báo `loadScene: Can not load the scene ''`.
- Nguyên nhân: lúc chạy, `director.getScene().name` là chuỗi rỗng, nên `director.loadScene(scene.name)` không tải được gì.
  Lỗi có từ trước trong GameManager (thua rồi chơi lại), và Claude chép lại y nguyên vào menu.
- Cách sửa: hàm `reloadScene()` trong `GameSession.ts` tìm tên scene theo uuid trong danh sách scene của bundle (ra `Main`).
- Cách tránh lần sau: muốn tải lại màn thì gọi `reloadScene()`, đừng dùng `director.getScene().name`.
  Chép một đoạn code cũ sang chỗ mới thì kiểm tra xem đoạn cũ đã từng chạy đúng chưa.

### Thử game ngay trong trình duyệt của app (không cần người dùng bấm)
- Ngày: 04/11/2026 · Nhóm: làm việc
- Cách làm: Creator đang mở thì bản chạy thử có ở `http://localhost:7456`. Mở bằng trình duyệt của app (`resize_window` 1280×760),
  chờ khoảng 20 giây cho game tải, rồi bấm bằng toạ độ. Đọc lỗi bằng `read_console_messages`, soi trạng thái bằng
  `javascript_tool` (`cc.director.getScene()`...).
- Bẫy: Creator chỉ biên dịch lại script khi cửa sổ Creator được bấm vào. Sửa code xong mà trình duyệt vẫn chạy bản cũ
  (soi bằng JS thấy chưa có thứ mới, ví dụ `cc.js.getClassByName('LeoSkills')` ra false) thì nhờ người dùng bấm vào cửa sổ Creator một cái, rồi tải lại trang.
  Sau khi biên dịch, Creator tự tải lại trang vài lần; game có thể mất tới 1–2 phút mới hiện (khung trình duyệt bị ẩn thì chạy chậm). Cứ chờ rồi soi lại.
- Mẹo bấm phím bằng JS: phát `KeyboardEvent` với `code` (ví dụ `'KeyJ'`, `'Space'`, `'Tab'`, `'ArrowRight'`) lên `document.getElementById('GameCanvas')`.
  Muốn chụp đúng lúc thì gọi `cc.director.pause()` ngay sau khi bấm, chụp xong `cc.director.resume()`.
  Đo kết quả bằng số (độ cao nhảy, máu địch, vận tốc) chứ đừng chỉ nhìn ảnh.
- Bẫy: khung trình duyệt của app bị ẩn (`tabs_context` báo "hidden") thì trình duyệt gần như không cho game chạy khung hình nào,
  số đo ra vô lý (vận tốc đứng yên, nhân vật không nhúc nhích). Cách đo đúng: `cc.game.pause()`, rồi tự chạy từng khung bằng
  `cc.director.tick(1/60)` trong vòng lặp JS (phát phím trước khi tick), đo xong `cc.game.resume()`. Kết quả không phụ thuộc máy nhanh hay chậm.
- Bẫy (05/11/2026): `HitStop` đếm bằng `Date.now()` (giờ thật). Tick dồn cả trăm khung trong một lệnh JS thì giờ thật gần như đứng yên,
  nên sau nhát chém trúng đầu tiên mèo và địch bị "khựng" mãi: combo chỉ ra 1 nhát, tưởng code lỗi.
  Khi thử đòn đánh trúng, chờ thật giữa các khung: `for (...) { cc.director.tick(1/60); await new Promise(r => setTimeout(r, 16)); }`.
  Thử cạnh kẻ địch thì cho mèo bất tử (`invincible = 30`) để bị chạm không làm ngắt đòn.
- Mẹo (05/11/2026): muốn thử một cách sửa trước khi nhờ người dùng bấm Creator, vá tạm hàm trong trang
  (`cc.js.getClassByName('X').prototype.hàm = ...`), đo, rồi mới sửa code thật. Xong thì tải lại trang để bỏ bản vá.
  Combo trên không: đo vị trí cả hai bên ngay lúc chém (bọc hàm `slash`) mới thấy đòn trượt vì mèo rơi nhanh hơn địch.
- Bẫy: thử chiêu có bấm W (chém hất) cạnh bàn/ghế thì W làm mèo nhảy lên bục trước. Đặt mèo và địch ở chỗ trống không có bục phía trên.
- Bẫy (06/11/2026): trước khi kết luận "phím không ăn", đo số khung hình chạy trong 0.5 giây (`cc.director.getTotalFrames()`).
  Ra 0 thì trình duyệt đang bóp khung hình (mèo không chạy, menu đọc phím trong update không đổi): chuyển sang tự tick.
  Ảnh chụp lúc đó có thể là khung cũ: kiểm tra bằng số (node có tồn tại, opacity...) chứ đừng chỉ nhìn ảnh.
- Bẫy (06/11/2026): ép cửa sổ (`resize_window`) thì trang xem trước của Creator đặt khung game 1920 lệch ra ngoài (left âm),
  hai mép bị cắt; đừng tưởng HUD đặt sai rồi sửa theo `getVisibleSize`. Letterbox luôn giữ phần chơi đúng 1920×1080,
  thứ bám mép màn hình đặt theo khung thiết kế. Đo `GameCanvas.getBoundingClientRect()` để biết trang có cắt không.
- Bẫy (06/11/2026): sửa file bằng `node -e '...'` dài trong bash hay vỡ dấu nháy (chữ có dấu, `${}`, nháy đơn lồng nhau).
  Đoạn sửa dài thì ghi ra file `.js` trong scratchpad (Write) rồi `node file.js đường-dẫn`.
- Bẫy: đếm số lần bấm ↓ để tới một nút rất dễ sai (ô ẩn bị bỏ qua). Viết hàm "bấm ↓ tới khi ô đang chọn tên X" rồi mới bấm.
- Phím ảo: `KeyboardEvent` phải có cả `code` lẫn `keyCode` (ghi đè bằng `Object.defineProperty`) thì Enter / Esc mới tới được engine.
- Bẫy (06/11/2026): khung trình duyệt của app bị **ẩn** thì game không chạy khung nào (`cc.director.getTotalFrames()` đứng yên),
  dù `document.visibilityState` vẫn là `visible`. Đo bằng `cc.director.tick(1/60)` trong vòng lặp (tween, update chạy theo);
  phần chạy theo giờ thật (`setTimeout`, như màn logo / thanh tải) thì không qua được, gọi thẳng hàm của nó (ví dụ `dropMenu()`).
- Bẫy (06/11/2026): node `Landing` trong file scene có thể đang **tắt** mà lúc chạy vẫn được code bật lên. Đọc file scene thấy tắt,
  mình bật thêm bằng JS → màn mở đầu chạy hai lần chồng nhau, đo ra số vô lý (logo vừa hiện đã mờ). Trước khi bật / tắt gì bằng JS,
  đọc trạng thái **lúc chạy** (`node.active`, component đang có) trước, đừng tin file scene.
- Bẫy (05/11/2026): `getComponentsInChildren('PlayerController')[0]` có thể ra **Angelo đang bị ẩn** (đếm giữ J mãi bằng 0). Lọc `p.node.activeInHierarchy`.
  Trong trang, `getComponent(cc.UITransform)` có thể ra null; dùng tên chuỗi `getComponent('cc.UITransform')`.
- Mẹo (05/11/2026): khung trình duyệt của app nhỏ, chụp màn hình không nhìn rõ chi tiết. Cắt thẳng từ canvas game:
  `cc.game.pause(); cc.director.tick(1/60)` rồi `drawImage(GameCanvas, ...)` sang một canvas nhỏ, đặt ảnh đó (phóng to) đè lên trang bằng thẻ `<img>` rồi chụp.
  Toạ độ canvas: `cameraComponent.worldToScreen(node.worldPosition)`, trục y lật (`canvas.height - y`). Đổi gì xong phải chờ vài khung rồi mới cắt.
- Bẫy (05/11/2026): file ảnh mình ghi vào `assets` **sau** lúc người dùng bấm vào Creator thì chưa được nhập (`.meta` còn `"imported": false`),
  trang chạy thử không thấy ảnh. Ghi hết file trước rồi mới nhờ người dùng bấm vào Creator.
- Bẫy (05/11/2026): giữa hai lệnh JS game vẫn chạy thật. Thử cạnh boss mà chỉ cho Leo bất tử trong lệnh, hết lệnh boss húc Leo tới thua,
  màn tự tải lại, các biến `window.__...` mất, lệnh sau báo lỗi `null`. Mỗi lệnh thử tự dựng lại từ đầu (tìm lại Leo, boss), và đặt Leo xa boss.
- Bẫy (05/11/2026): hiệu ứng gắn trên đầu boss to (cao 427) mà đặt cao hơn đầu (y = chiều cao + 90) thì nằm ngoài mép trên màn hình
  khi camera theo mèo ở dưới. Đặt quanh đầu (khoảng 0.6 lần chiều cao) và chụp thử cả màn hình để chắc thấy được.

### Kiểm tra lỗi TypeScript khi không mở được Creator
- Ngày: 03/11/2026 · Nhóm: code
- Cách làm: dùng tsc đi kèm Creator:
  `node "C:/ProgramData/cocos/editors/Creator/3.8.8/resources/resources/3d/engine/node_modules/typescript/bin/tsc" -p tsconfig.json --noEmit --skipLibCheck`,
  rồi bỏ các dòng bắt đầu bằng `C:/ProgramData` (lỗi của file khai báo engine, không phải của game).
- Bẫy: project biên dịch với thư viện cũ, nên `Array.includes` báo lỗi. Dùng `indexOf(...) >= 0`.

### Xem trước trang HTML trên máy
- Ngày: 03/11/2026 · Nhóm: làm việc
- Triệu chứng: trình duyệt trong app không mở được file `.html` trên đĩa; trang Artifact đã đăng thì bắt đăng nhập.
- Cách tránh lần sau: chụp bằng Edge chạy ngầm (`msedge --headless=new --screenshot=... --window-size=1280,11000 file:///...`),
  rồi cắt ảnh dài thành nhiều khúc bằng System.Drawing của PowerShell để xem. Đừng chụp theo `#mục`: ảnh ra bị trống.

## Git và làm ở 2 máy

### Sửa cùng lúc ở 2 máy
- Ngày: trước 03/11/2026 · Nhóm: git
- Nguyên nhân: file scene là một khối lớn, sửa song song ở 2 máy rất khó gộp.
- Cách tránh lần sau: luôn `git pull` **trước khi** mở Creator, làm xong thì commit và push ngay.
  Trước khi sửa, hỏi người dùng máy kia còn thay đổi nào chưa push không.
