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
- **Chương 1 · bước 1 (đang thử):** hai con mèo Leo + Angelo (Angelo tạm là Leo nhuộm xám), chọn 1 người / 2 người sau START,
  màn chọn mèo cho 2 người, mỗi con một dãy tim, gục và kéo dậy, camera giữ khung và chặn hai con đi xa nhau,
  menu Esc (Tiếp tục, Cài đặt, Về màn hình chính) với âm lượng, toàn màn hình, rung, đổi phím (lưu trên máy).
  Kế hoạch bước 2–5 (kỹ năng Angelo/Leo, 3 câu đố, Chihuahua 3 giai đoạn, mọt con) xem `docs/thiet-ke-game.html` mục 11.
- **Bước 2 (đang thử):** kỹ năng hai mèo (README mục "Kỹ năng hai con mèo"). Còn chừa: đu dây qua hố, sàn yếu để đập vỡ (bước 3).
- DemoLevelBuilder giờ chỉ còn 3 nút: **⚙ Cập nhật** (dùng hằng ngày, không dời gì), **📐 Xếp lại theo ảnh demo**,
  **⟳ Dựng màn từ đầu** (có khoá an toàn). Chi tiết ở README mục 4.
- Màn mở đầu (node `Landing`, `LandingScreen.ts`): logo chữ tạm + nút START, nền là màn chơi làm mờ.
  Thêm ảnh `MG_logo` vào `assets/resources/art` là tự thay chữ tạm.
- Thanh năng lượng, nút nhảy, nút đánh đã dùng ảnh mới (`MG_energy_*`, `Button_*`).
- Màn chơi đã xếp lại khớp 4 ảnh demo (nút **📐**, đã bấm và đã lưu scene). Ngày 03/11/2026 đã dựng lại 4 khung từ scene
  để so với demo (`tools/so-sanh-demo/`): thứ tự lớp khớp hết.
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
- Mây trắng trên trời (demo có ở cả 4 khung).
- Bụi cây dày sau hàng rào trên bậc đá khung 3 (lớp MG có vài bụi nhưng chưa phủ chỗ này).
- Băng rôn cờ ở khung 1, 3, 4 trong demo treo thấp hơn khoảng 100px. Hiện đang ghim sát mép trên vì chưa có tán lá che;
  có tán lá rồi thì bỏ ghim (tắt PinToScreenTop) và hạ xuống như demo.

**Việc nên làm tiếp**
- Chơi thử từ đầu tới boss: chim, boss, mèo to hơn trước nhưng khung va chạm (PlatformerBody) giữ cỡ cũ → chỉnh *Size* nếu chém hụt / bị đụng sai.
- Các con cá, chai nước bạn tự thêm (không có trong demo) vẫn để nguyên, xem có giữ không.
- Đoạn nối giữa các khung (demo không liền nhau) cần tự sắp cho đẹp.
- Thay âm thanh tạm trong `assets/resources/sounds/` (giữ đúng tên file), thay art nút cảm ứng.
- Trước khi build: tắt *Debug Colliders*, *Touch On Desktop*, node `image 1465` (ảnh tham khảo cũ).
- Font Super Bouncer: kiểm tra giấy phép trước khi phát hành công khai.

## Map 1 ngoài phố và cây kỹ năng (đã chốt 10/11/2026)

Thiết kế đầy đủ (bản đồ, các khu, giá từng ô): `docs/thiet-ke-game.html` mục 10 và 11.
- Mọi kỹ năng có từ đầu, riêng **Sóng kiếm** mua ở **tiệm Lợi Ký**. Đường bị khoá bằng **chìa khoá**, không bằng kỹ năng.
- Boss Chihuahua sau **cổng nhà lớn** cuối Phố (2 ổ khoá): chìa 1 trên Mái nhà (tổ Chim đầu đàn), chìa 2 dưới Hang chó-gián (Chó-gián chúa).
  Hạ boss → cửa nhà mở sang **Map 2 (trong nhà)**.
- **Cá bự** (nguyên liệu mở kỹ năng, Map 1 có 4 con trong phòng bí mật) + **cá vàng** (tiền). Cây kỹ năng 3 nhánh: Kiếm, Thân, Chiêu.

Các đợt làm:
1. ~~Camera kiểu Hollow Knight~~ (đã làm 10/11: CameraRig nhóm *Kiểu Hollow Knight*; khu boss khoá camera).
2. ~~Cá bự + cá vàng (lưu ô)~~ (đã làm 10/11: `BigFishPickup`, không hiện trên HUD, chỉ thấy trong cửa hàng; hiện có 1 con để thử).
3. ~~Cửa hàng + cây kỹ năng~~ (đã làm 10/11: NPC tạm `ShopNPC` mèo xám sau checkpoint 1, chưa dùng tiệm Lợi Ký; `ShopPage`, `game/Upgrades.ts`.
   Ô "năng lượng" = nộ đầy nhanh 40%. Mọi ô lưu khoá hết, mua lại). Còn: thay hình NPC, đặt 4 cá bự vào phòng bí mật.
4. Cổng nhà lớn 2 ổ khoá + 2 chìa.
5. Dựng từng khu: Mái nhà, Cống, Hang, Bờ sông (cần vẽ thêm asset: mái ngói, dây điện, bể nước, tường cống, ống, nước bẩn, kè đá, thuyền, Chim đầu đàn, Chó-gián chúa).
6. Map 2 trong nhà.

## Build và gửi cho bạn bè

1. Creator: **Project → Build**, nền tảng **Web Mobile**, bật *MD5 Cache*, *Orientation* Landscape, tắt *Debug* → Build.
2. Nén: `python tools/zip_build.py build/web-mobile Leo-Escape-web.zip`
   (đừng dùng Compress-Archive của PowerShell: nó ghi dấu `\` trong đường dẫn, itch.io không chạy được).
3. itch.io: *Kind of project* = **HTML**, tải zip lên, tích *played in the browser*, khung 1280×720,
   *Visibility* = **Draft** rồi gửi *Secret URL* cho bạn (hoặc Restricted + mật khẩu).

## Quy tắc khi sửa (cho cả Claude ở máy nhà)

- **Scene là bản chính.** Người dùng tự sắp xếp trong editor; đừng sửa `Main.scene` trên đĩa khi Creator đang mở.
  Muốn sửa hàng loạt thì viết nút bấm trong editor (thêm bước mới vào nút **⚙ Cập nhật** trong `DemoLevelBuilder.ts`, đừng thêm nút mới), chỉ sửa node có sẵn, không xoá.
  Bước mới không được ghi đè số đo của 📐 (DemoLayout.ts). Xem BAI-HOC.md.
- Giá trị đã lưu trong scene đè lên giá trị mặc định trong code: muốn đổi hành vi của scene có sẵn thì đặt tên property mới.
- Mỗi file chỉ một `@ccclass`. Hình vẽ bằng Graphics không được lưu → vẽ lại trong `onLoad` với `executeInEditMode`.
- Trong editor không dùng `resources.load` được: hỏi `asset-db` rồi `assetManager.loadAny(uuid)` (xem `loadArtInEditor`).
- Toạ độ demo: ảnh 1280×720, 1px = 1.5 đơn vị game; camera ứng với 4 khung: `FRAME_CAM = [660, 2580, 4500, 6420]`.
  Số liệu xếp màn nằm trong `assets/scripts/level/DemoLayout.ts` (tìm node theo uuid).
- `tools/make_sfx.py` sinh lại âm thanh tạm; `tools/zip_build.py` nén bản build.
