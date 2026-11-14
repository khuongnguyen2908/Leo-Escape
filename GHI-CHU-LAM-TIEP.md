# Ghi chú làm tiếp (cập nhật 11/11/2026)

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

**Angelo và chế độ 2 người đang TẠM TẮT:** node Angelo đã xoá khỏi scene (nút ⚙ xoá nếu còn), code còn giữ; chưa quyết bỏ hẳn hay làm lại.
Hai dòng "bước 1", "bước 2" ngay dưới là việc đã làm trước khi tắt.

**Đã xong trong đợt này**
- **Chương 1 · bước 1 (đang thử):** hai con mèo Leo + Angelo (Angelo tạm là Leo nhuộm xám), chọn 1 người / 2 người sau START,
  màn chọn mèo cho 2 người, mỗi con một dãy tim, gục và kéo dậy, camera giữ khung và chặn hai con đi xa nhau,
  menu Esc (Tiếp tục, Cài đặt, Về màn hình chính) với âm lượng, toàn màn hình, rung, đổi phím (lưu trên máy).
  Kế hoạch bước 2–5 (kỹ năng Angelo/Leo, 3 câu đố, Chihuahua 3 giai đoạn, mọt con) xem `docs/thiet-ke-game.html` mục 12.
- **Bước 2 (đang thử):** kỹ năng hai mèo (README mục "Kỹ năng hai con mèo"). Còn chừa: đu dây qua hố, sàn yếu để đập vỡ (bước 3).
- DemoLevelBuilder giờ chỉ còn 3 nút: **⚙ Cập nhật** (dùng hằng ngày, không dời gì), **📐 Xếp lại theo ảnh demo**,
  **⟳ Dựng màn từ đầu** (có khoá an toàn). Chi tiết ở README mục 4.
- Màn mở đầu (node `Landing`, `LandingScreen.ts`): logo chữ tạm + nút START, nền là màn chơi làm mờ.
  Thêm ảnh `MG_logo` vào `assets/resources/art` là tự thay chữ tạm.
- Thanh năng lượng, nút nhảy, nút đánh đã dùng ảnh mới (`MG_energy_*`, `Button_*`).
- Màn chơi đã xếp lại khớp 4 ảnh demo (nút **📐**, đã bấm và đã lưu scene). Ngày 03/11/2026 đã dựng lại 4 khung từ scene
  để so với demo (`tools/so-sanh-demo/`): thứ tự lớp khớp hết.
  Phát hiện quan trọng: ảnh demo vẽ mọi thứ **đúng cỡ gốc (tỉ lệ 1)**, không phải 0.87 như trước.
- Node **DemoRef** (con của Canvas): tích *Hiện ảnh demo*, kéo *Khung* 1–4 để so 1-1. Ảnh ở `assets/ref/`, chỉ hiện trong editor, không vào bản build.
- Nền đá lát từng ô chồng mép (hết khe giữa các ô, 2 đầu khối không bị cắt). Ô *Overlap* trong GroundBlock.
- Camera `Offset Y = 33` để mặt đường khớp demo (dưới đáy có dải tường tối giống demo).
- Chim và boss quay mặt đúng hướng (`artFacesRight = false`), chim dưới đất khung 3 dùng ảnh `MG_enermy_2`.
- Đánh: chém combo 5 nhát; giữ J rồi thả là sóng kiếm (phải mua ở cửa hàng trước). Lướt có phím riêng (Space, kiểu Mũi tên là Shift phải, điện thoại là nút »).
  Thanh xanh là thanh nộ: đánh trúng thì đầy dần, chỉ Special (L) và Mèo Nổ dùng tới; nhảy, chém, lướt đều miễn phí. W đi lên bục, S S xuống bục.
- Camera kiểu Hollow Knight (CameraRig nhóm *Kiểu Hollow Knight*), khu boss rộng 1640 vừa một khung hình và khoá camera.
- Camera **zoom 0.7** (11/11, bước ⚙ 34, theo bản thử `camera-demo.html`). Phần dưới mặt đất lộ ra được tô **đất tối tạm**
  (GroundBlock ô *Fill Below*) và **nước sâu** dưới dòng sông (RiverFlow ô *Deep*). Cần art: thân đất / tường dưới mặt đường để thay đất tối.
- Chưa xử lý (có từ trước, không do zoom): trên bậc cao quanh x 7300 các ô đá có khe hở lộ sông và gai nhọn, nhưng khung va chạm
  của khối vẫn liền nên mèo đi ngang qua khe như đứng trên không. Chờ người dùng nói là hố gai cố ý hay cần lấp.
- Cửa hàng: NPC tạm `ShopNPC` sau checkpoint 1, cây kỹ năng trong `game/Upgrades.ts`, cá bự `BigFishPickup` (README mục *Cửa hàng và cá bự*).
  Ô lưu đã qua màn mà chơi lại thì bắt đầu từ đầu màn nhưng **giữ cá vàng, cá bự và kỹ năng đã mua** (cá bự đã nhặt không hiện lại).
- Boss: máu 150. `BossBrain` và `BossArena` giờ gắn sẵn trên node Boss trong scene (bước ⚙ 33), chỉnh các ô trong Inspector là có tác dụng;
  vì vậy muốn đổi số của boss bằng code thì phải viết thêm bước ⚙ (giá trị lưu trong scene đè lên mặc định trong code).
- `art-nguon/` chỉ còn 9 dải ảnh gốc mà `tools/cat_khoi.py` dùng; phần còn lại nằm ở `art-nguon/khong-dung/` (không đưa vào git).
- Ánh sáng vẽ bằng code (tia nắng, sương, bụi, hào quang cá), âm thanh tạm, font Super Bouncer, nút cảm ứng.

**Còn thiếu so với demo (cần vẽ thêm ảnh)**
- Lá cờ đỏ ở khung 4.
- Cột bê tông bên phải + hàng rào sau lưng boss (khung 4), tủ điện góc phải dưới khung 3.
- Biển "Phố Tạ Hiện" khung 4 có 2 tấm biển đổi chỗ, biển hình mèo khung 4.
- Bụi cây dày sau hàng rào trên bậc đá khung 3 (lớp MG có vài bụi nhưng chưa phủ chỗ này).
- Băng rôn cờ ở khung 1, 3, 4 trong demo treo thấp hơn khoảng 100px. Hiện đang ghim sát mép trên;
  đã có tán lá tối che rồi, muốn giống demo thì bỏ ghim (tắt PinToScreenTop) và hạ xuống.

**Việc nên làm tiếp**
- Chơi thử từ đầu tới boss: thấy chém hụt / bị đụng sai thì chỉnh *Size* của khung va chạm (PlatformerBody).
- Các con cá, chai nước bạn tự thêm (không có trong demo) vẫn để nguyên, xem có giữ không.
- Đoạn nối giữa các khung (demo không liền nhau) cần tự sắp cho đẹp.
- Thay âm thanh tạm trong `assets/resources/sounds/` (giữ đúng tên file), thay art nút cảm ứng.
- Trước khi build: tắt *Debug Colliders*, *Touch On Desktop*; kiểm tra node `Landing` (màn mở đầu) đang **bật**. Node `image 1465` (ảnh tham khảo cũ) đã tắt sẵn.
- Font Super Bouncer: kiểm tra giấy phép trước khi phát hành công khai.

## Map 1 ngoài phố và cây kỹ năng

**Đã chốt (10/11/2026):** cách khoá đường (2 chìa, cổng 2 ổ khoá) và cây kỹ năng.
**CHƯA chốt:** bố cục các khu. Người dùng muốn bàn kỹ và thử ở `docs/camera-demo.html` trước; **chưa dựng khu nào vào `Main.scene` khi chưa được đồng ý**.

- `docs/camera-demo.html`: bản chơi thử Map 1 chạy thẳng trong trình duyệt (không cần Cocos), dựng trên khối va chạm thật của phố.
  Phím riêng của bản thử (Space nhảy), có nút đổi zoom, kiểu Cống (liền dưới phố / phòng riêng), wall jump. Sửa cho ưng ở đây rồi mới đưa sang game.
- Bố cục đang thử (11/11): đầu map là **Nhà Leo** (không có khu Chợ); **Bờ sông nằm dưới đầu phố**, khe x 933–998 sau Nhà Leo là chỗ thấy nước,
  vào bằng ống cống ở đầu trái Cống. Chưa quyết: Cống liền dưới phố hay phòng riêng, zoom 0.8 hay 1.0.
- Sơ đồ trong `docs/thiet-ke-game.html` mục 10 là **bản nháp cũ** (Bờ sông còn vẽ ở cuối phố).
- **14/11: Main.scene = bản chép của MapThu** (Map 1 đầy đủ: cột điện + dây + sân thượng + cây tổ chim, hồ lá sen, kênh ngầm, hầm bí mật, phòng boss chuột,
  cổng kẽm gai, nền bám mặt phố). Nút 🧱 ("Dựng Map 1") giờ chạy được trong Main lẫn MapThu; sửa map thì sửa thẳng trong Main, MapThu là bản nháp.
  Main cũ còn trong git. Nút ⚙ Cập nhật trong Main có thể đặt lại khối đá mà map mới đã sửa: đọc lại các bước của ⚙ trước khi bấm.
  **Điểm lưu = miếu (14/11):** `SavePoint` (ảnh MG_checkpoint / _active), phím Dùng E / V (hành động `use` mới), điện thoại nút Nhảy đổi thành Dùng khi gần;
  lưu = ghi ô + hồi sinh ở miếu + đầy tim (`GameManager.saveAtShrine`). 1 miếu `MieuLuu_CayBu` trên sân thượng x 7350 (thân ~7450); 2 cờ `Checkpoint` cũ ẩn.
- **Scene thử `assets/scenes/MapThu.scene`** (11/11, bản sao của Main): nút **🧱 Dựng map thử** trên DemoLevelBuilder dựng Map 1 bằng khối màu
  vẽ code theo `camera-demo.html` (code: `level/MapThuBuilder.ts`). Có: mái nhà + tổ chim (chìa 1), cống dưới phố (2 nắp cống, S S để chui,
  leo lên bằng wall jump), bờ sông dưới Nhà Leo, hầm bí mật và hang (phòng riêng, vào bằng cửa, chìa 2 trong hang), cửa sắt lên phố,
  cổng 2 ổ khoá ở x 8850, 2 ô chìa trên HUD. Đã chơi thử trọn một vòng. Chưa có: boss phụ, lưu chìa vào ô lưu, hình thật.
  Component mới dùng được ở mọi scene: `MapBlock` (khối màu có va chạm), `Door`, `KeyPickup`, `LockedGate`, `CameraZone`, `ui/KeySlots`;
  `PlayerController.wallJump` và `PlatformerBody.stepHeight` (Main đang tắt). Bấm 🧱 lại thì dựng mới từ đầu (chỉnh tay trong node MapThu sẽ mất).
  Nền MapThu (12/11): BG, MG, River, Light Factor Y 1, bám mặt phố theo chiều dọc (nhảy, lên mái thì nhà cây, sông tụt xuống cùng phố,
  không hở chân); Main vẫn là BG Y 0 / MG Y 1 / River, Light 0.6. Khúc cột x 6690 → 8930 có hố thật (bước `pillarPits` của 🧱: đáy hố y 0,
  từ 12/11 là đường sụt lộ kênh ngầm: `FishPit` vẽ nước, mỗi hố một con cá lóc nhảy lên cắn khi mèo tới gần, rơi xuống nước mất 1 máu và bật lên mép;
  4 nón `mg_cone` dời lên mép hố làm biển báo, tắt sát thương. Cá, nước, vách hố là hình tạm, chờ art). (Main đã có từ 14/11, chép từ MapThu.) Chưa vẽ: mây, chim cho trời trống khi lên mái, tổ chim (lớp đứng yên như `Light_Far`).
  Bục không lơ lửng (12/11): đầu phố = sàn nhà cây gắn vào thân `mg_cay_2` → bục giữa có giàn gỗ chống vào vách quán `mg_cafe` → bục trên mái quán (y 535),
  thanh chống nằm TRƯỚC ảnh của bạn (node `MapThu/NhaCay_ThanhChong`) → nóc tiệm SHOP → máy lạnh (giờ là chỗ cụt, khúc 2 tính tiếp). Hình tạm `PropArt`, chờ art vẽ thật.
  **Làm theo bản vẽ của người dùng (13/11, ảnh toàn cảnh MapThu tô thêm, chia 8 khúc, làm từng khúc, duyệt rồi mới qua khúc sau):**
  khúc 1 mây hình thú · 2 tán cây che đầu phố · 3 cột điện + dây · 4 thang + sân thượng + cây · 5, 6 cột đèn đen cong + hàng rào · 7 hồ lá sen (thay khúc cột + hố cá:
  vài lá sen cách nhau, đứng lên vài giây thì chìm, lá khác nổi, phải nhảy lẹ) · 8 nhà lớn hồng sau cổng, hoa giấy, dây leo trên cổng. 1px ảnh ≈ 10 đơn vị game.
  Đã xong khúc 3 + 4 (hàm `highRoute`): bỏ mái nhà, gác trái, bồn nước, giếng trời, cây lớn cũ. Cột trái = ảnh `mg_cotdien` (xà 820, đỉnh 1250) → dây võng đi được
  (khối cứng mỏng, thấp nhất 950 ở x 4770) → cột phải `mg_cotdien-001` (nối tạm lên 1250) → thang W x 6120 → 6440 → lỗ chui → sân thượng x 5750 → 8620 (mặt 1835)
  → cành 2260 / 2680 → ngọn thân cây 3080 (tổ chim, chìa 1). Cá bự gác trái tạm ở đầu trái sân thượng.
  14/11: cây bự chặn kín bên phải (theo ý người dùng, bỏ đường tắt xuống cổng): thân x 8350 → 8800 là khối cứng tới 4000 (đỉnh tán, không đứng trên đỉnh cây được), tổ chim + chìa 1 trên cành trên (7921, 2705), sân thượng kéo tới 8800,
  cổng 2 ổ khoá cao 4400. Bám / bật tường không còn hồi nhảy 2 lần (Leo và Angelo): tường đơn không leo mãi được, ống 2 vách vẫn leo được.
  Khúc 7 (14/11): ẩn cột giữa `Tile_4` (không xoá) → một hồ x 7182 → 8458 (FishPit, giữ cá lóc), 3 lá sen to `LilyPad` (level/LilyPad.ts) rộng 260 ở y 165:
  chạm là rung, 0,5 giây sau chìm (nhảy đi rồi vẫn chìm), 2,5 giây sau nổi lại; rơi xuống nước mất 1 máu, bật lên mép. Điểm lưu 2 dời sang cột đầu (x 6952), 4 nón chia 2 mép hồ.
  Khúc 5 + 6 (14/11, `lampsAndFences`): hàng rào = bản sao ảnh MG_hangrao_1 / _2 của bạn (x 6810, 7020 trên cột đầu; 8660 trên cột cuối, y 441);
  2 cột đèn cổ cong hình tạm `PropArt` StreetLamp (`CotDen_CotDau` x 7050 cổ sang phải, `CotDen_CotCuoi` x 8580 cổ sang trái), chờ ảnh thật. Hoa lục bình ở lá 2, 3.
  Khúc 8 (14/11): cổng 2 ổ khoá (`LockedGate`, chỉ MapThu dùng) vẽ thành cuộn dây kẽm gai xám, 2 ổ khoá hồng ở 330 / 675 trên chân cổng;
  đủ chìa thì dây mờ dần rồi ẩn (không trượt lên nữa). Nhà hồng trong bản vẽ chỉ là đánh dấu khu boss, không làm. Còn khúc 1 (mây), 2 (tán cây đầu phố).
  **Kênh ngầm liền dải (14/11, hàm `canal`, thay Cống tím + kênh dưới Nhà Leo):** x -820 → 6160, gờ đi bộ -1150, 3 đoạn nước (100→700, 2000→2450 có bè;
  4200→4600) là `FishPit` tắt cá kiểu kênh. Ống cống trái x 1380 chỉ rớt xuống (không vách, miệng ống cao hơn gờ 680), ống phải x 5530 bật tường leo lên.
  Cửa phòng boss chuột x 3600 (Hang chó-gián đổi thành `PhongBossChuot`, chìa 2, cửa sắt lên phố). Hốc đầu trái có cửa Hầm bí mật, che bằng
  `FakeWall` (level/FakeWall.ts: chém 3 nhát thì vỡ, che cả hốc bằng màu đất); cửa Hầm bí mật trên phố đã bỏ. Vùng camera kênh chặn 2 bên theo vùng.
  Lớp FR / FR_Top của MapThu có `FadeBelow`: camera xuống dưới phố thì tủ điện, cột đèn, lá cây mờ dần.
  Hầm cầu thang dưới khối đá cao + song sắt: **đã bỏ (14/11)**, khối đá cao liền lại, ô đá `Tile_6` ẩn, file SongSat.ts đã xoá. Map 1 còn 4 cá bự.

Thiết kế (các khu, giá từng ô): `docs/thiet-ke-game.html` mục 10 và 11.
- Mọi kỹ năng có từ đầu, riêng **Sóng kiếm** mua ở **cửa hàng** (hiện là NPC tạm `ShopNPC`). Đường bị khoá bằng **chìa khoá**, không bằng kỹ năng.
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

## Mô-đun engine đã tắt (Project → Project Settings → Feature Cropping, 11/11/2026)

Đã bỏ tick: **Physics 3D** (cả Cannon, PhysX, Builtin), **WebGL 2.0**, **WebGPU**, **Video Player**, **WebView**, **Terrain**, **XR**,
Spine 4.2 (Spine 3.8 vẫn bật), Meshopt, Sorting 2D, Occlusion Query, Geometry / Debug Renderer, Procedural Animation, Legacy Pipeline, Post Process.
Vẫn bật: 2D, UI, Graphics, Audio, Tween, Particle 2D / 3D, Physics 2D, Tiled Map, Spine 3.8, DragonBones, Animation.
Muốn dùng thứ đã tắt (video, webview, vật lý 3D...): **bật lại trong Feature Cropping trước**, không thì component không có hoặc build lỗi.

## Build và đưa lên web (GitHub Pages)

Bản chơi thử đang ở https://khuongnguyen2908.github.io/Leo-Escape/ (nhánh `gh-pages` của repo, tách riêng với `main`).

1. Trước khi build: node `Landing` đang **bật**, *Debug Colliders* tắt, Ctrl+S.
2. Creator: **Project → Build**, nền tảng **Web Mobile**, bật *MD5 Cache*, *Orientation* Landscape, tắt *Debug* → Build. Kết quả ở `build/web-mobile` (không nằm trong git).
3. Chép `build/web-mobile` ra một thư mục tạm ngoài repo, thêm file rỗng `.nojekyll`, rồi trong thư mục đó:
   `git init -b gh-pages`, `git add -A`, `git commit`, `git push -f <địa chỉ repo> gh-pages`.
4. Chờ 1–2 phút, mở link kèm `?v=<gì đó>` để trình duyệt không lấy bản cũ đã nhớ.

itch.io để dành, chưa làm (các bước ở cuối README). Nếu cần nén zip: `python tools/zip_build.py build/web-mobile <tên>.zip`,
đừng dùng Compress-Archive của PowerShell (nó ghi dấu `\` trong đường dẫn, itch.io không chạy được).

## Quy tắc khi sửa (cho cả Claude ở máy nhà)

- **Scene là bản chính.** Người dùng tự sắp xếp trong editor; đừng sửa `Main.scene` trên đĩa khi Creator đang mở.
  Muốn sửa hàng loạt thì viết nút bấm trong editor (thêm bước mới vào nút **⚙ Cập nhật** trong `DemoLevelBuilder.ts`, đừng thêm nút mới), chỉ sửa node có sẵn, không xoá.
  Bước mới không được ghi đè số đo của 📐 (DemoLayout.ts). Xem BAI-HOC.md.
- Giá trị đã lưu trong scene đè lên giá trị mặc định trong code: muốn đổi hành vi của scene có sẵn thì đặt tên property mới.
- Mỗi file chỉ một `@ccclass`. Hình vẽ bằng Graphics không được lưu → vẽ lại trong `onLoad` với `executeInEditMode`.
- Trong editor không dùng `resources.load` được: hỏi `asset-db` rồi `assetManager.loadAny(uuid)` (xem `loadArtInEditor`).
- Toạ độ demo: ảnh 1280×720, 1px = 1.5 đơn vị game; camera ứng với 4 khung: `FRAME_CAM = [660, 2580, 4500, 6420]`.
  Số liệu xếp màn nằm trong `assets/scripts/level/DemoLayout.ts` (tìm node theo uuid).
- `tools/zip_build.py` nén bản build. Công cụ sinh âm thanh tạm `make_sfx.py` đã xoá (11/11): âm thanh giờ là file thật.
