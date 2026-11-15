# Ôn tập AI

Web ôn thi bằng đề trắc nghiệm do AI tạo từ chính tài liệu môn học. Dành cho học sinh, sinh viên và giáo viên.

## Có gì trong dự án này

**Học sinh, sinh viên**
- Đăng ký, đăng nhập; chọn môn học (có sẵn 12 môn, thêm môn mới rất dễ)
- Chọn tài liệu (có sẵn hoặc tự thêm), AI tạo đề: chọn số câu, độ khó, dạng câu hỏi
- Làm bài, nộp bài, xem điểm theo từng chủ đề, xem đáp án đúng và giải thích
- Lịch sử mọi bài đã làm; làm lại đề cũ
- Ôn lại câu sai: câu sai tự vào ngân hàng, làm đúng thì tự biến mất
- Vào lớp bằng mã lớp, làm bài giáo viên giao

**Giáo viên**
- Mọi thứ của học sinh, thêm: tài liệu công khai, tạo lớp có mã lớp
- Giao đề cho lớp kèm hạn nộp
- Báo cáo: điểm từng học sinh, chủ đề cả lớp yếu, các câu cả lớp hay sai

**Kiểm soát chi phí:** giới hạn số lần tạo đề bằng AI mỗi người mỗi ngày (mặc định 10). Ôn câu sai và làm lại đề cũ không tốn tiền AI.

## Công nghệ

Next.js 14 (giao diện và máy chủ), Supabase (đăng nhập và cơ sở dữ liệu), Claude API (tạo đề), Vercel (đưa lên mạng).

---

## Cài đặt từ con số 0

Làm lần lượt từng bước. Kẹt ở bước nào, chụp màn hình hoặc sao chép nguyên thông báo lỗi gửi cho Claude, kèm số bước đang làm.

### Bước 1. Cài hai phần mềm trên máy

1. **Node.js** (bản LTS): tải ở https://nodejs.org rồi cài như phần mềm bình thường.
2. **VS Code** (nơi xem và sửa code): https://code.visualstudio.com

Mở VS Code, chọn File > Open Folder, chọn thư mục `ontap-ai` đã giải nén. Mở cửa sổ dòng lệnh bằng menu Terminal > New Terminal.

Kiểm tra Node đã cài: gõ `node -v`, ra số phiên bản (từ 20 trở lên) là được.

### Bước 2. Tạo cơ sở dữ liệu trên Supabase

1. Vào https://supabase.com, đăng ký, bấm **New project**, đặt tên, đặt mật khẩu database (lưu lại), chọn vùng gần Việt Nam (Singapore), bấm tạo. Đợi khoảng 2 phút.
2. Vào **SQL Editor** (menu bên trái) > **New query**.
3. Mở file `supabase/schema.sql` trong VS Code, sao chép **toàn bộ**, dán vào SQL Editor, bấm **Run**. Thấy "Success" là xong.
4. Làm tương tự với file `supabase/seed.sql` (tạo các môn học và vài tài liệu mẫu).
5. Vào **Authentication > Providers > Email**, tắt **Confirm email** nếu bạn muốn đăng ký là dùng được ngay (khi thử nghiệm). Khi chạy thật nên bật lại.
6. Vào **Project Settings > API**, sao chép hai giá trị: **Project URL** và **anon public key**. Bạn sẽ dùng ở bước 4.

### Bước 3. Lấy khóa AI

1. Vào https://console.anthropic.com, đăng ký, vào mục **Billing** nạp một ít tiền (vài đô la là đủ để thử).
2. Vào **API Keys** > **Create Key**, sao chép khóa (bắt đầu bằng `sk-ant-`). Khóa chỉ hiện một lần, hãy lưu lại.

Khóa này là bí mật. Không gửi cho ai, không đưa lên GitHub.

### Bước 4. Điền thông tin vào dự án

Trong thư mục dự án, sao chép file `.env.example` thành `.env.local` (cùng thư mục, đổi tên). Mở `.env.local` và điền:

```
NEXT_PUBLIC_SUPABASE_URL=   (dán Project URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY=   (dán anon public key)
ANTHROPIC_API_KEY=   (dán khóa AI)
```

### Bước 5. Chạy thử trên máy

Trong Terminal của VS Code:

```
npm install
npm run dev
```

Mở trình duyệt vào http://localhost:3000. Đăng ký một tài khoản **Giáo viên**, một tài khoản **Học sinh** (dùng cửa sổ ẩn danh cho tài khoản thứ hai) để thử đủ tính năng.

Thử theo thứ tự: chọn môn Kinh tế lượng > chọn Chương 1 > Tạo đề > làm bài > nộp > xem kết quả. Sau đó thử tạo lớp bằng tài khoản giáo viên, vào lớp bằng tài khoản học sinh, giao bài.

### Bước 6. Đưa lên mạng (Vercel)

1. Tạo tài khoản https://github.com, tạo kho mã mới (New repository, để Private) rồi tải thư mục dự án lên. Tệp `.env.local` đã được loại trừ sẵn, sẽ không bị tải lên.
2. Vào https://vercel.com, đăng nhập bằng GitHub, bấm **Add New > Project**, chọn kho vừa tạo.
3. Ở phần **Environment Variables**, thêm đủ 4 biến như trong `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, và (không bắt buộc) `DAILY_AI_LIMIT`.
4. Bấm **Deploy**. Xong sẽ có địa chỉ dạng `ten-du-an.vercel.app`.
5. Quay lại Supabase > **Authentication > URL Configuration**, điền địa chỉ Vercel vào **Site URL** (để email xác nhận đưa người dùng về đúng chỗ).

---

## Thêm môn học và tài liệu

**Thêm môn:** Supabase > SQL Editor, chạy:

```sql
insert into subjects (slug, name, description, sort)
values ('marketing-can-ban', 'Marketing căn bản', 'Khái niệm, 4P, phân khúc thị trường', 12);
```

`slug` là mã không dấu, không trùng nhau. `sort` là thứ tự hiển thị.

**Thêm tài liệu chung cho mọi người:** cách dễ nhất là đăng nhập bằng tài khoản giáo viên, vào môn, bấm "Thêm tài liệu cho môn này", tích "Chia sẻ công khai".

Học sinh cũng thêm được tài liệu riêng của mình (chỉ bạn đó thấy).

## Cấu trúc thư mục

```
supabase/schema.sql      cấu trúc bảng và quy tắc phân quyền
supabase/seed.sql        môn học và tài liệu mẫu
src/app/                 các trang (mỗi thư mục là một địa chỉ)
src/app/api/generate     gọi AI tạo đề
src/app/api/submit       chấm bài, lưu lịch sử, cập nhật câu sai
src/lib/quiz.ts          câu lệnh gửi AI, kiểm tra và làm sạch câu hỏi
src/components/          các thành phần giao diện dùng chung
```

Muốn đổi cách AI ra đề (phong cách, độ khó, ngôn ngữ), sửa hàm `buildPrompt` trong `src/lib/quiz.ts`. Muốn đổi model AI, sửa `ANTHROPIC_MODEL` trong biến môi trường.

## Giới hạn hiện tại (nên biết trước khi mở cho nhiều người)

- **Tài liệu PDF, Word:** chưa đọc tự động. Hiện dán nội dung hoặc tải tệp `.txt`, `.md`. Bước phát triển tiếp theo là thêm đọc PDF.
- **Đáp án và việc gian lận:** đề được lưu cùng đáp án trong cơ sở dữ liệu. Học sinh biết kỹ thuật vẫn có thể đọc đáp án của đề được giao trước khi nộp. Dùng cho ôn tập thì ổn, chưa phù hợp thi lấy điểm thật. Muốn chặt hơn cần tách đáp án sang bảng riêng.
- **Vai trò giáo viên:** ai cũng tự chọn được khi đăng ký. Muốn kiểm duyệt, cho đăng ký mặc định là học sinh và đổi `role` thành `teacher` trong bảng `profiles` ở Supabase.
- **Chất lượng câu hỏi:** AI có thể sai. Chưa có nút báo lỗi từng câu, và giáo viên chưa sửa được câu hỏi trước khi giao. Đây là hai tính năng nên làm tiếp.
- **Thời gian tạo đề:** 20 đến 60 giây cho 10 câu. Gói miễn phí của Vercel giới hạn thời gian chạy; dự án đã đặt 60 giây.
- **Giới hạn lượt tạo đề:** tính theo ngày giờ quốc tế (UTC), nên đặt lại lúc 7 giờ sáng giờ Việt Nam.
- **Chưa có:** thanh toán, thông báo nhắc ôn, chuỗi ngày học, chat hỏi đáp theo tài liệu, xuất PDF.

## Tình trạng kiểm tra

Đã kiểm tra: dự án build thành công, kiểm tra kiểu dữ liệu không lỗi, `schema.sql` và `seed.sql` chạy đúng trên PostgreSQL, các quy tắc phân quyền (học sinh không xem được dữ liệu của người khác, giáo viên chỉ thấy bài làm của lớp mình, vào lớp bằng mã, học sinh không tự tạo lớp hay đăng tài liệu công khai).

Chưa kiểm tra với dịch vụ thật: đăng nhập qua Supabase, và lệnh gọi AI với khóa thật, vì cần tài khoản và khóa của bạn. Lần chạy đầu tiên nếu có lỗi, gửi thông báo lỗi cho Claude để sửa.
