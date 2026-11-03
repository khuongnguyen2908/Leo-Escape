# Ghi chú làm tiếp (cập nhật 03/11/2026)

File này để mở project ở máy khác (máy nhà) là hiểu ngay đang ở đâu và làm tiếp được.
Hướng dẫn dùng game và các nút trong editor nằm ở [README.md](README.md).

## Mở project ở máy mới

1. Cài **Cocos Creator 3.8.8** (đúng bản này, qua Cocos Dashboard).
2. `git clone https://github.com/khuongnguyen2908/Leo-Escape.git` (repo riêng tư, đăng nhập GitHub của bạn).
3. Cocos Dashboard → **Add / Import** → chọn thư mục vừa clone. Lần mở đầu Creator tự tạo lại `library/`, `temp/` (hơi lâu, bình thường).
4. Mở `assets/scenes/Main.scene`, bấm Play để thử.
5. Mỗi lần làm xong: `git add -A`, `git commit`, `git push`. Về máy kia thì `git pull` **trước khi** mở Creator.

> Đừng sửa cùng lúc ở 2 máy: file scene là một khối lớn, sửa song song rất khó gộp.

## Đang ở đâu

**Đã xong trong đợt này**
- Màn chơi đã xếp lại khớp 4 ảnh demo (nút **📐 Xếp theo ảnh demo** trên Canvas, đã bấm và đã lưu scene).
  Phát hiện quan trọng: ảnh demo vẽ mọi thứ **đúng cỡ gốc (tỉ lệ 1)**, không phải 0.87 như trước.
- Node **DemoRef** (con cuối của Canvas): tích *Hiện ảnh demo*, kéo *Khung* 1–4 để so 1-1. Ảnh ở `assets/ref/`, chỉ hiện trong editor, không vào bản build.
- Nền đá lát từng ô chồng mép (hết khe giữa các ô, 2 đầu khối không bị cắt). Ô *Overlap* trong GroundBlock.
- Camera `Offset Y = 46` để mặt đường khớp demo (dưới đáy có dải tường tối giống demo).
- Chim và boss quay mặt đúng hướng (`artFacesRight = false`), chim dưới đất khung 3 dùng ảnh `MG_enermy_2`.
- Đánh: chém combo 3 nhát, giữ J để lướt chém; nhảy/chém/lướt tốn năng lượng (thanh xanh). W đi lên bục, S xuống bục.
- Ánh sáng vẽ bằng code (tia nắng, sương, bụi, hào quang cá), âm thanh tạm, font Super Bouncer, nút cảm ứng.

**Còn thiếu so với demo (cần vẽ thêm ảnh)**
- Tiệm "Lợi Kỳ" và lá cờ đỏ ở khung 4.
- Tán lá tối che 2 góc trên màn hình.
- Cột bê tông bên phải + hàng rào sau lưng boss (khung 4), tủ điện góc phải dưới khung 3.
- Bàn xanh ở khung 2 (ảnh `MG_ban` đang màu hồng), biển "Phố Tạ Hiện" khung 4 có 2 tấm biển đổi chỗ, biển hình mèo khung 4.

**Việc nên làm tiếp**
- Chơi thử từ đầu tới boss: chim, boss, mèo to hơn trước nhưng khung va chạm (PlatformerBody) giữ cỡ cũ → chỉnh *Size* nếu chém hụt / bị đụng sai.
- Các con cá, chai nước bạn tự thêm (không có trong demo) vẫn để nguyên, xem có giữ không.
- Đoạn nối giữa các khung (demo không liền nhau) cần tự sắp cho đẹp.
- Thay âm thanh tạm trong `assets/resources/sounds/` (giữ đúng tên file), thay art nút cảm ứng.
- Trước khi build: tắt *Debug Colliders*, *Touch On Desktop*, node `image 1465` (ảnh tham khảo cũ).
- Font Super Bouncer: kiểm tra giấy phép trước khi phát hành công khai.

## Build và gửi cho bạn bè

1. Creator: **Project → Build**, nền tảng **Web Mobile**, bật *MD5 Cache*, *Orientation* Landscape, tắt *Debug* → Build.
2. Nén: `python tools/zip_build.py build/web-mobile Leo-Escape-web.zip`
   (đừng dùng Compress-Archive của PowerShell: nó ghi dấu `\` trong đường dẫn, itch.io không chạy được).
3. itch.io: *Kind of project* = **HTML**, tải zip lên, tích *played in the browser*, khung 1280×720,
   *Visibility* = **Draft** rồi gửi *Secret URL* cho bạn (hoặc Restricted + mật khẩu).

## Quy tắc khi sửa (cho cả Claude ở máy nhà)

- **Scene là bản chính.** Người dùng tự sắp xếp trong editor; đừng sửa `Main.scene` trên đĩa khi Creator đang mở.
  Muốn sửa hàng loạt thì viết nút bấm trong editor (xem `DemoLevelBuilder.ts`: ⚙ Cập nhật không xoá, 📐 Xếp theo ảnh demo...), chỉ sửa node có sẵn, không xoá.
- Giá trị đã lưu trong scene đè lên giá trị mặc định trong code: muốn đổi hành vi của scene có sẵn thì đặt tên property mới.
- Mỗi file chỉ một `@ccclass`. Hình vẽ bằng Graphics không được lưu → vẽ lại trong `onLoad` với `executeInEditMode`.
- Trong editor không dùng `resources.load` được: hỏi `asset-db` rồi `assetManager.loadAny(uuid)` (xem `loadArtInEditor`).
- Toạ độ demo: ảnh 1280×720, 1px = 1.5 đơn vị game; camera ứng với 4 khung: `FRAME_CAM = [660, 2580, 4500, 6420]`.
  Số liệu xếp màn nằm trong `assets/scripts/level/DemoLayout.ts` (tìm node theo uuid).
- `tools/make_sfx.py` sinh lại âm thanh tạm; `tools/zip_build.py` nén bản build.
