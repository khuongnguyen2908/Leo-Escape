---
name: quy-trinh-lam-viec
description: Quy trình bắt buộc trước mọi việc thay đổi file trong project Leo Escape (code, scene, ảnh, âm thanh, cài đặt, build, commit/push). Phân tích kỹ, hỏi lại người dùng, thảo luận tới phương án cuối, chờ đồng ý rồi mới làm; xong thì ghi bài học vào BAI-HOC.md. Dùng ngay khi người dùng nhờ sửa, thêm, xoá, đổi, chỉnh, làm, build hay commit bất cứ thứ gì.
---

# Quy trình làm việc: phân tích → hỏi → chốt → đồng ý → làm → ghi bài học

Người dùng đặt quy tắc này: **chưa đồng ý thì chưa làm.**

## Khi nào áp dụng

- **Áp dụng:** mọi việc thay đổi file hoặc trạng thái project, như sửa code, sửa scene, thêm hay đổi asset,
  đổi cài đặt, chạy lệnh có ghi đĩa, build, `git commit` và `git push`.
- **Không cần:** câu hỏi thuần tuý, giải thích, đọc hay xem file, tìm kiếm. Những việc này trả lời luôn.
- Nếu không chắc một việc thuộc loại nào thì coi như phải áp dụng.

## Các bước

### 1. Tìm hiểu (chỉ đọc, chưa sửa gì)
- Đọc phần **Luôn nhớ** và mục lục ở đầu [BAI-HOC.md](../../../BAI-HOC.md), rồi chỉ đọc nhóm bài liên quan tới việc sắp làm
  (scene, va chạm, ảnh và âm thanh, menu, build...). Không cần đọc cả file.
  Bài nào liên quan thì phải nói rõ ở bước 3 là mình sẽ tránh lỗi đó bằng cách nào.
- Đọc [GHI-CHU-LAM-TIEP.md](../../../GHI-CHU-LAM-TIEP.md) để biết trạng thái hiện tại và quy tắc sửa.
- Đọc phần code và scene liên quan để hiểu bản đang có thật sự hoạt động thế nào. Đừng đoán.

### 2. Phân tích kỹ
Tự trả lời các câu sau trước khi hỏi người dùng:
- Người dùng thực sự muốn **kết quả** gì khi chơi game hay mở editor? Khác với *cách làm* thế nào?
- Phải đụng tới những file và node nào? Có đụng `Main.scene` không? Creator có đang mở không?
- Có mấy cách làm, mỗi cách được gì và mất gì? Cách nào ít rủi ro cho phần người dùng đã tự sắp xếp?
- Có thể hỏng những gì: mất chỉnh sửa trong scene, giá trị lưu trong scene đè lên code, build lỗi, máy kia bị lệch?
- Kiểm tra kết quả bằng cách nào? Người dùng phải tự làm bước nào trong editor?

### 3. Hỏi lại người dùng
- Chỉ hỏi những điểm **người dùng phải quyết**. Điều gì đọc code hoặc thử là biết thì tự tìm, không hỏi.
- Dùng tiếng Việt, câu ngắn, nói theo những gì người dùng thấy trong game và editor. Người dùng mới làm quen
  Cocos Creator, nên tránh thuật ngữ, hoặc giải thích ngay nếu buộc phải dùng.
- Mỗi câu hỏi kèm các lựa chọn, đưa lựa chọn mình đề xuất lên đầu và nói vì sao
  (có công cụ hỏi nhiều lựa chọn thì dùng, tối đa 4 câu một lần; không có thì hỏi bằng danh sách đánh số).
- Nói luôn những bài học cũ có liên quan và những rủi ro đã thấy.

### 4. Thảo luận tới phương án cuối
Khi đã rõ hết, trình bày **phương án cuối** gọn trong một chỗ:
- **Sẽ làm gì:** từng việc, file và node nào sẽ đổi.
- **Không làm gì:** những gì giữ nguyên, nhất là phần người dùng tự sắp xếp.
- **Bạn cần làm:** ví dụ đóng Creator trước, bấm nút nào, mở scene nào để kiểm tra.
- **Cách kiểm tra:** chơi thử đoạn nào, xem gì là đúng.

Người dùng còn thắc mắc hoặc muốn đổi gì thì quay lại bước 2–3.

### 5. Chờ đồng ý
- Chỉ bắt tay làm khi người dùng **đồng ý rõ ràng** với phương án cuối, ví dụ "ok", "đồng ý", "làm đi", hoặc chọn nút đồng ý.
- Đồng ý chỉ có giá trị cho đúng phương án đó. Việc nào nằm ngoài phương án thì phải hỏi lại.
- Nếu mỗi lựa chọn trong câu hỏi đã nói rõ sẽ đổi file hay node nào, và người dùng chọn đủ mọi điểm cần chốt,
  thì coi các câu trả lời đó là đồng ý, không hỏi lặp lại.
- Nếu trả lời xong mình mới viết ra phương án cuối (có thêm việc mà câu hỏi chưa nói tới) thì chờ thêm một lần "ok".

### 6. Làm
- Làm đúng phương án đã chốt.
- Gặp điều bất ngờ làm phương án phải đổi, như file khác dự đoán, lỗi lạ, hay phải đụng thêm chỗ khác:
  **dừng lại, báo và hỏi**, không tự ý đổi hướng.
- Tôn trọng các quy tắc trong GHI-CHU-LAM-TIEP.md và các bài học trong BAI-HOC.md.

### 7. Kiểm tra và báo cáo trung thực
- Tự kiểm tra được gì thì kiểm tra, ví dụ biên dịch TypeScript hay đọc lại file.
- Nói rõ đã làm gì, chưa kiểm tra được gì, và người dùng cần thử gì trong editor. Không nói "xong rồi" khi chưa chắc.
- Việc vừa làm đổi cách chơi, phím, nút trong editor, tên file hay cách build: sửa luôn đúng đoạn đó trong README.md
  và mục "Đang ở đâu" của GHI-CHU-LAM-TIEP.md (đổi ngày ở dòng đầu). Sửa đè lên câu cũ, không viết thêm "trước đây...".
- Chỉ commit hoặc push khi người dùng bảo.

### 8. Ghi bài học
Ghi vào [BAI-HOC.md](../../../BAI-HOC.md) **ngay** khi có một trong các trường hợp sau, không cần hỏi:
- Một lỗi đã sửa xong và người dùng xác nhận đã hết, hoặc mình kiểm tra được là đã hết.
- Mình làm sai và người dùng phải chỉ ra, kể cả hiểu sai ý hay đoán sai cách editor hoạt động.
- Phát hiện một "bẫy" của Cocos Creator, Windows hay công cụ build mà lần sau dễ vấp lại.

Cách ghi:
- Dùng đúng mẫu ở đầu BAI-HOC.md. Ghi **cách tránh lần sau** cụ thể tới mức làm theo được ngay.
- Nếu đã có bài cùng chủ đề thì bổ sung vào bài đó, đừng tạo bài trùng.
- Một bài tối đa khoảng 8 dòng, đặt vào đúng nhóm và thêm tên bài vào mục lục. Quy tắc dùng cho mọi việc thì thêm một dòng vào **Luôn nhớ**.
- Mẹo thao tác (thử game trong trình duyệt, cắt ảnh, lệnh máy) ghi vào `docs/meo-thu-game.md`, không ghi vào BAI-HOC.md.
- Code liên quan tới một bài đã bị bỏ thì xoá bài đó.
- Cuối lượt báo cho người dùng một dòng: "Đã ghi bài học: …".
- Bài học nằm trong repo, nên nhắc người dùng commit để máy nhà cũng có, trừ khi họ đang chuẩn bị commit.
