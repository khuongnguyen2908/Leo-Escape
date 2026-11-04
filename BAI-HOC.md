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

### Nhiều nút sửa hàng loạt giằng co nhau (📌 Ghim băng rôn với 📐)
- Ngày: 03/11/2026 · Nhóm: scene
- Triệu chứng: 📐 đặt băng rôn theo độ cao demo, nhưng PinToScreenTop (thêm bởi 📌) kéo ngay về sát mép trên.
  Băng rôn ở khung 1, 3, 4 cao hơn demo khoảng 100px.
- Nguyên nhân: 7 nút, mỗi nút viết vào một lúc, không nút nào biết nút kia đặt gì. Cùng loại lỗi với vụ mép đá ở trên.
- Cách sửa: gộp lại còn 3 nút. ⚙ gồm mọi việc "thêm nếu thiếu, không dời". 📐 bỏ qua độ cao của node đã ghim.
  ⟳ có khoá an toàn "Cho phép xoá màn đang có".
- Cách tránh lần sau: **không thêm nút mới.** Việc mới thì thêm thành một bước của ⚙, và bước đó phải bấm nhiều lần
  vẫn ra cùng kết quả. Hai chỗ cùng đặt một giá trị (vị trí, độ cao, sink...) thì chọn một nguồn (DemoLayout) và cho chỗ kia đọc từ đó.

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

### Ảnh mới thả vào bị nhập dạng texture, code không lấy được
- Ngày: 03/11/2026 · Nhóm: art
- Triệu chứng: ảnh mới (`Button_*`, `MG_energy_*`) đã nằm trong `assets/resources/art` nhưng game vẫn dùng hình vẽ tạm.
- Nguyên nhân: Creator nhập ảnh mới với `"type": "texture"` trong file `.meta`, nên không có sprite-frame để `resources.load(.../spriteFrame)` lấy.
- Cách sửa: chọn ảnh → Inspector → **Type = sprite-frame** → Apply.
- Cách tránh lần sau: mỗi khi người dùng thêm ảnh, kiểm tra `.meta` bằng `grep '"type"' assets/resources/art/<tên>.png.meta`.
  Nếu là `texture` thì nhắc người dùng đổi trước khi làm.

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
