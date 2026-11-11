# Mẹo thử game và công cụ

Chỉ đọc khi cần: thử game trong trình duyệt của app, so lớp với ảnh demo, cắt sprite sheet.
Đây là mẹo thao tác, không phải bài học lỗi (bài học nằm ở [BAI-HOC.md](../BAI-HOC.md)).

## 1. Thử game trong trình duyệt của app

### Mở và nạp lại
- Creator đang mở thì bản chạy thử có ở `http://localhost:7456`. Mở bằng trình duyệt của app (`resize_window` 1280×760),
  chờ khoảng 20 giây cho game tải, rồi bấm bằng toạ độ. Đọc lỗi bằng `read_console_messages`, soi trạng thái bằng
  `javascript_tool` (`cc.director.getScene()`...).
- Creator chỉ biên dịch lại script khi cửa sổ Creator được bấm vào. Sửa code xong mà trang vẫn chạy bản cũ
  (ví dụ `cc.js.getClassByName('LeoSkills')` ra false) thì nhờ người dùng bấm vào cửa sổ Creator một cái, rồi tải lại trang.
  Sau khi biên dịch, Creator tự tải lại trang vài lần; game có thể mất 1–2 phút mới hiện. Cứ chờ rồi soi lại.
- File ảnh ghi vào `assets` **sau** lúc người dùng bấm vào Creator thì chưa được nhập (`.meta` còn `"imported": false`),
  trang chạy thử không thấy ảnh. Ghi hết file trước rồi mới nhờ bấm vào Creator.
- Ép cửa sổ (`resize_window`) thì trang xem trước đặt khung game 1920 lệch ra ngoài (left âm), hai mép bị cắt.
  Đừng tưởng HUD đặt sai rồi sửa theo `getVisibleSize`: Letterbox luôn giữ phần chơi đúng 1920×1080, thứ bám mép màn hình
  đặt theo khung thiết kế. Đo `GameCanvas.getBoundingClientRect()` để biết trang có cắt không.

### Khung trình duyệt bị ẩn: game không chạy khung hình nào
- Nhận biết: `tabs_context` báo "hidden", hoặc `cc.director.getTotalFrames()` đứng yên sau 0.5 giây
  (dù `document.visibilityState` vẫn là `visible`). Số đo lúc đó vô lý (vận tốc đứng yên, phím "không ăn", menu không đổi);
  ảnh chụp có thể là khung cũ, nên kiểm tra bằng số (node có tồn tại, opacity...).
- Cách đo đúng: `cc.game.pause()`, tự chạy từng khung bằng `cc.director.tick(1/60)` trong vòng lặp JS (phát phím trước khi tick),
  đo xong `cc.game.resume()`. Kết quả không phụ thuộc máy nhanh hay chậm.
- Phần chạy theo giờ thật (`setTimeout`, như màn logo / thanh tải) không qua được bằng tick: gọi thẳng hàm của nó (ví dụ `dropMenu()`).
- Cả cửa sổ Claude bị thu nhỏ / che khuất (chụp màn hình báo "window is minimized or hidden"): trang nạp lại sẽ kẹt ở màn logo Cocos,
  `cc.game.inited` là false hoặc `cc.director.getScene()` là null mãi. Cách qua (11/11/2026): nạp lại trang và **ngay trong cùng lượt gọi**
  thay `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)`; chờ `cc.game.inited` thành true rồi gọi
  `cc.game._updateCallback()` lặp lại (mỗi 25 ms) tới khi scene có Canvas. Sau đó tự `cc.director.tick(1/60)` như trên.
  Tải ảnh / tiếng (`cc.resources.load`) trong lúc đó cũng phải vừa tick vừa chờ.
- `HitStop` đếm bằng `Date.now()` (giờ thật). Tick dồn cả trăm khung trong một lệnh thì sau nhát trúng đầu tiên mèo và địch
  "khựng" mãi (combo chỉ ra 1 nhát). Khi thử đòn đánh trúng, chờ thật giữa các khung:
  `for (...) { cc.director.tick(1/60); await new Promise(r => setTimeout(r, 16)); }`.

### Bấm phím
- Phát `KeyboardEvent` lên `document.getElementById('GameCanvas')`, phải có cả `code` (ví dụ `'KeyJ'`, `'Space'`, `'ArrowRight'`)
  lẫn `keyCode` (ghi đè bằng `Object.defineProperty`) thì Enter / Esc mới tới được engine.
- Phím giả lập có lúc không tới được game. Muốn thử "giữ phím" thì thay `cat.controls` bằng
  `new Proxy(controls, { get: (t, p) => p in held ? held[p] : Reflect.get(t, p, t) })` (`held = { down, upHeld, ... }`),
  đặt hướng mặt bằng `cat.facing = -1`; xong nhớ trả `cat.controls` về như cũ. Phím thật thì dùng công cụ bấm phím của trình duyệt.
- Đếm số lần bấm ↓ để tới một nút rất dễ sai (ô ẩn bị bỏ qua). Viết hàm "bấm ↓ tới khi ô đang chọn tên X" rồi mới bấm.
- Muốn chụp đúng lúc: gọi `cc.director.pause()` ngay sau khi bấm, chụp xong `cc.director.resume()`.

### Dựng tình huống thử
- Trước khi bật / tắt gì bằng JS, đọc trạng thái **lúc chạy** (`node.active`, component đang có), đừng tin file scene:
  node `Landing` trong file có thể đang tắt mà lúc chạy vẫn được code bật lên; bật thêm lần nữa là màn mở đầu chạy hai lần chồng nhau.
- Tắt `Landing` bằng JS để vào thẳng màn chơi thì mèo vẫn ở trạng thái chờ (`idle = true`): boss không coi là mục tiêu.
  Gọi `GameManager.instance.beginPlay(false)` sau khi tắt Landing.
- `getComponentsInChildren('PlayerController')[0]` có thể ra con mèo đang bị ẩn: lọc `p.node.activeInHierarchy`.
  Trong trang, `getComponent(cc.UITransform)` có thể ra null; dùng tên chuỗi `getComponent('cc.UITransform')`.
- Giữa hai lệnh JS game vẫn chạy thật. Hết lệnh mà Leo hết bất tử thì boss đánh Leo tới thua, màn tự tải lại, các biến
  `window.__...` mất. Mỗi lệnh thử tự dựng lại từ đầu (tìm lại Leo, boss), và đặt Leo xa boss.
- Thử cạnh kẻ địch thì cho mèo bất tử (`invincible = 30`) để bị chạm không làm ngắt đòn. Nhưng khi đếm số lần mèo trúng đòn
  thì đừng xoá `invincible` sau mỗi lần trúng: ra số ảo.
- Thử chiêu có bấm W (chém hất) cạnh bàn / ghế thì W làm mèo nhảy lên bục trước. Đặt mèo và địch ở chỗ trống không có bục phía trên.
- Mèo giả nhảy bằng `startJump` mà không giữ phím Nhảy thì game cắt nhảy, chỉ cao ~200. Muốn nhảy cao hết cỡ thì đặt
  `cat.jumping = false` ngay sau `startJump`.
- Dịch mèo tới cuối màn (sau x ~9000) là vào khu boss: tường chặn hiện ra, lướt bị chặn giữa chừng, tưởng va chạm lỗi.
  Thử chỗ đó thì tắt `BossArena` (`enabled = false`) và ẩn node `Boss` trước khi dịch mèo.
- Cờ đích đứng trên bậc đá cao ngay mép trái bậc: đặt mèo lùi về bên trái là rơi xuống dưới bậc, không tới cờ được.

### Đo và chụp
- Đo kết quả bằng số (độ cao nhảy, máu địch, vận tốc, scale, opacity từng khung), đừng chỉ nhìn ảnh.
- Thử một cách sửa trước khi nhờ người dùng bấm Creator: vá tạm hàm trong trang
  (`cc.js.getClassByName('X').prototype.hàm = ...`), đo, rồi mới sửa code thật. Xong thì tải lại trang để bỏ bản vá.
- Combo trên không: đo vị trí cả hai bên ngay lúc chém (bọc hàm `slash`) mới thấy đòn trượt vì mèo rơi nhanh hơn địch.
- Khung trình duyệt nhỏ, chụp không rõ chi tiết: cắt thẳng từ canvas game. `cc.game.pause(); cc.director.tick(1/60)` rồi
  `drawImage(GameCanvas, ...)` sang một canvas nhỏ, đặt ảnh đó (phóng to) đè lên trang bằng thẻ `<img>` rồi chụp.
  Toạ độ canvas: `cameraComponent.worldToScreen(node.worldPosition)`, trục y lật (`canvas.height - y`). Đổi gì xong chờ vài khung rồi mới cắt.
- Nút / hình nhỏ trên màn: tạm phóng to node cha (scale 3) để soi.

### Sửa file bằng lệnh
- `node -e '...'` dài trong bash hay vỡ dấu nháy (chữ có dấu, `${}`, nháy đơn lồng nhau).
  Đoạn sửa dài thì ghi ra file `.js` trong scratchpad rồi `node file.js đường-dẫn`.
- GNU sed: gạch chéo ngược + dấu huyền nghĩa là "đầu dòng", lệnh thay chuỗi đó sẽ chèn dấu huyền vào đầu mọi dòng.
  Sửa chữ có dấu huyền thì dùng Edit, đừng dùng sed.

## 2. So lớp nào đè lớp nào với ảnh demo

- `tools/so-sanh-demo/` dựng lại 4 khung camera từ file scene (vị trí, tỉ lệ, parallax, thứ tự vẽ) bằng Node và System.Drawing,
  rồi đặt ảnh demo bên dưới. Không cần mở Creator. Phóng to từng vùng để so chân đồ vật với mép đá.
- Không vẽ phần Graphics (tia nắng, sương, hào quang). Muốn so bản trên git thì chạy với `git show HEAD:assets/scenes/Main.scene`.
- Trước khi kết luận "lỗi do nút X", đọc lại số trong scene **hiện tại**, vì người dùng có thể đã bấm và lưu rồi.

## 3. Cắt sprite sheet hiệu ứng

- Hai bản màu của cùng một tấm sheet có thể xếp hàng khác nhau (bản xanh và bản cam của tấm FX: cột phải lệch thứ tự).
  Luôn dò lại hàng trên đúng tấm sẽ cắt, đừng dùng số hàng của bản kia.
- Đo trước (chạy thử không ghi file) xem hình có chạm mép ô / tràn sang ô bên không; cắt xong ghép thành một hình kiểm tra gửi người dùng.
- Hình to hơn ô lưới (vòng sóng khung cuối) bị cắt mất viền: kiểm tra số điểm ảnh chạm mép (`edge`) khi đo trước, khung nào bị cắt thì bỏ.
- PowerShell: `| Select-Object -First 1` sau một script sẽ **dừng luôn script** sau dòng đầu tiên (file không được ghi). Dùng `| Out-Null`.
- PowerShell: tên biến không phân biệt hoa thường. Tham số `$Jobs` và biến `$jobs` là **một biến**, ghi đè nhau. Đặt tên khác hẳn (`$JobSpec`).
