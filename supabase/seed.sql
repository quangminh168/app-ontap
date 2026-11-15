-- =====================================================================
-- ONTAP AI - dữ liệu mẫu: các môn học và vài tài liệu để thử ngay
-- Chạy SAU schema.sql. Có thể chạy lại nhiều lần mà không bị trùng môn.
-- Muốn thêm môn mới: copy một dòng trong khối "insert into subjects" bên dưới.
-- =====================================================================

insert into subjects (slug, name, description, sort) values
  ('kinh-te-luong',      'Kinh tế lượng',            'Hồi quy, kiểm định giả thuyết, vi phạm giả định OLS', 1),
  ('xac-suat-thong-ke',  'Xác suất thống kê',        'Biến ngẫu nhiên, phân phối, ước lượng, kiểm định', 2),
  ('toan-cao-cap',       'Toán cao cấp',             'Giới hạn, đạo hàm, tích phân, đại số tuyến tính', 3),
  ('kinh-te-vi-mo',      'Kinh tế vi mô',            'Cung cầu, độ co giãn, hành vi người tiêu dùng, thị trường', 4),
  ('kinh-te-macro',      'Kinh tế vĩ mô',           'GDP, lạm phát, thất nghiệp, chính sách tài khóa và tiền tệ', 5),
  ('nguyen-ly-ke-toan',  'Nguyên lý kế toán',        'Phương trình kế toán, tài khoản, báo cáo tài chính', 6),
  ('tai-chinh-doanh-nghiep', 'Tài chính doanh nghiệp', 'Giá trị thời gian của tiền, NPV, chi phí vốn', 7),
  ('lap-trinh-python',   'Lập trình Python',         'Cú pháp, cấu trúc dữ liệu, hàm, lập trình hướng đối tượng', 8),
  ('vat-ly-dai-cuong',   'Vật lý đại cương',         'Cơ học, nhiệt học, điện từ', 9),
  ('tieng-anh-ielts',    'Tiếng Anh IELTS',          'Từ vựng, ngữ pháp, đọc hiểu', 10),
  ('triet-hoc-mac-lenin','Triết học Mác - Lênin',    'Vật chất và ý thức, phép biện chứng, quy luật', 11),
  ('khac',               'Môn khác',                 'Dán tài liệu của bất kỳ môn nào để tạo đề', 99)
on conflict (slug) do nothing;

-- Tài liệu mẫu (tài liệu hệ thống: owner_id trống, công khai)

insert into documents (subject_id, owner_id, title, content, is_public)
select s.id, null, 'Chương 1 - Hồi quy đơn và OLS',
$ktl1$Mô hình hồi quy tuyến tính đơn có dạng Yi = β1 + β2Xi + ui, trong đó Y là biến phụ thuộc, X là biến giải thích và ui là sai số ngẫu nhiên. Phương pháp bình phương nhỏ nhất thông thường (OLS) chọn các ước lượng β̂1 và β̂2 sao cho tổng bình phương phần dư Σei² nhỏ nhất, với ei = Yi − Ŷi.

Ước lượng độ dốc là β̂2 = Σ(Xi − X̄)(Yi − Ȳ) / Σ(Xi − X̄)². Hệ số chặn là β̂1 = Ȳ − β̂2X̄. Ý nghĩa của β2: khi X tăng 1 đơn vị thì giá trị kỳ vọng của Y thay đổi β2 đơn vị.

Theo định lý Gauss–Markov, khi các giả định cổ điển được thỏa mãn (mô hình tuyến tính theo tham số, E(ui|X) = 0, phương sai sai số không đổi, các sai số không tự tương quan, và trong hồi quy bội thì các biến giải thích không có quan hệ tuyến tính hoàn hảo), ước lượng OLS là ước lượng tuyến tính không chệch tốt nhất (BLUE).

Hệ số xác định R² = ESS/TSS = 1 − RSS/TSS đo tỷ lệ biến động của Y được giải thích bởi mô hình và nằm trong khoảng từ 0 đến 1. R² cao chưa chắc mô hình đúng hay quan hệ mang tính nhân quả.$ktl1$, true
from subjects s where s.slug = 'kinh-te-luong'
and not exists (select 1 from documents d where d.subject_id = s.id and d.title = 'Chương 1 - Hồi quy đơn và OLS');

insert into documents (subject_id, owner_id, title, content, is_public)
select s.id, null, 'Chương 2 - Kiểm định và khoảng tin cậy',
$ktl2$Để kiểm định ý nghĩa thống kê của hệ số βj, dùng thống kê t = β̂j / se(β̂j) với n − k bậc tự do, trong đó k là số tham số kể cả hệ số chặn. Giả thuyết H0: βj = 0. Nếu |t| lớn hơn giá trị tới hạn, hoặc p-value nhỏ hơn mức ý nghĩa α (thường là 5%), thì bác bỏ H0, nghĩa là biến Xj có ý nghĩa thống kê.

Khoảng tin cậy 95% cho βj là β̂j ± t(α/2, n−k) · se(β̂j). Sai số chuẩn của hệ số càng nhỏ thì ước lượng càng chính xác và khoảng tin cậy càng hẹp.

Kiểm định F dùng để kiểm định đồng thời H0: tất cả các hệ số độ dốc bằng 0, với F = [ESS/(k−1)] / [RSS/(n−k)]. Một mô hình có thể có F có ý nghĩa dù từng hệ số riêng lẻ không có ý nghĩa.

Trong hồi quy bội, R² luôn không giảm khi thêm biến, vì vậy dùng R² hiệu chỉnh: R̄² = 1 − (1 − R²)(n − 1)/(n − k). R² hiệu chỉnh có thể giảm khi thêm một biến không có giá trị giải thích.$ktl2$, true
from subjects s where s.slug = 'kinh-te-luong'
and not exists (select 1 from documents d where d.subject_id = s.id and d.title = 'Chương 2 - Kiểm định và khoảng tin cậy');

insert into documents (subject_id, owner_id, title, content, is_public)
select s.id, null, 'Chương 3 - Vi phạm giả định',
$ktl3$Đa cộng tuyến xảy ra khi các biến giải thích tương quan mạnh với nhau. Hậu quả là sai số chuẩn tăng, các hệ số khó có ý nghĩa thống kê dù R² cao, nhưng ước lượng OLS vẫn không chệch. Có thể phát hiện bằng hệ số phóng đại phương sai VIF; VIF lớn hơn 10 thường được xem là dấu hiệu nghiêm trọng.

Phương sai sai số thay đổi (heteroskedasticity) nghĩa là Var(ui) không đồng nhất giữa các quan sát. Ước lượng OLS vẫn không chệch nhưng không còn hiệu quả, và sai số chuẩn thông thường bị sai lệch nên kiểm định t và F không đáng tin. Có thể kiểm định bằng Breusch–Pagan hoặc White; khắc phục bằng sai số chuẩn vững (robust, White) hoặc bình phương nhỏ nhất có trọng số (WLS).

Tự tương quan là hiện tượng sai số các kỳ có tương quan với nhau, thường gặp ở chuỗi thời gian. Thống kê Durbin–Watson gần 2 cho thấy không có tự tương quan bậc nhất; gần 0 cho thấy tự tương quan dương; gần 4 cho thấy tự tương quan âm.

Bỏ sót biến quan trọng có tương quan với biến đã đưa vào mô hình sẽ làm ước lượng bị chệch.$ktl3$, true
from subjects s where s.slug = 'kinh-te-luong'
and not exists (select 1 from documents d where d.subject_id = s.id and d.title = 'Chương 3 - Vi phạm giả định');

insert into documents (subject_id, owner_id, title, content, is_public)
select s.id, null, 'Cung, cầu và độ co giãn',
$kvm1$Luật cầu: khi giá của một hàng hóa tăng lên và các yếu tố khác không đổi, lượng cầu về hàng hóa đó giảm xuống. Đường cầu dốc xuống từ trái sang phải. Luật cung: khi giá tăng, lượng cung tăng, đường cung dốc lên.

Cân bằng thị trường đạt được tại mức giá mà lượng cung bằng lượng cầu. Nếu giá cao hơn giá cân bằng sẽ dư thừa hàng hóa; nếu giá thấp hơn giá cân bằng sẽ thiếu hụt hàng hóa và giá có xu hướng tăng lên.

Các yếu tố làm dịch chuyển đường cầu gồm thu nhập, giá hàng hóa liên quan (thay thế, bổ sung), thị hiếu và kỳ vọng. Khi thu nhập tăng, cầu hàng hóa thông thường tăng, đường cầu dịch sang phải; với hàng hóa thứ cấp thì cầu giảm.

Độ co giãn của cầu theo giá EP = (%ΔQ)/(%ΔP). Nếu |EP| > 1 cầu co giãn nhiều, giá tăng làm tổng doanh thu giảm. Nếu |EP| < 1 cầu co giãn ít, giá tăng làm tổng doanh thu tăng. Nếu |EP| = 1, tổng doanh thu không đổi. Hàng thiết yếu thường có cầu co giãn ít.

Thặng dư tiêu dùng là chênh lệch giữa mức giá tối đa người tiêu dùng sẵn sàng trả và giá thực tế phải trả. Thặng dư sản xuất là chênh lệch giữa giá bán và chi phí tối thiểu người sản xuất sẵn sàng chấp nhận.$kvm1$, true
from subjects s where s.slug = 'kinh-te-vi-mo'
and not exists (select 1 from documents d where d.subject_id = s.id and d.title = 'Cung, cầu và độ co giãn');

insert into documents (subject_id, owner_id, title, content, is_public)
select s.id, null, 'Biến ngẫu nhiên và phân phối chuẩn',
$xs1$Biến ngẫu nhiên là đại lượng nhận giá trị số tùy thuộc vào kết quả của một phép thử ngẫu nhiên. Biến ngẫu nhiên rời rạc nhận các giá trị đếm được, biến ngẫu nhiên liên tục nhận giá trị trong một khoảng.

Kỳ vọng E(X) là giá trị trung bình theo xác suất của X. Phương sai Var(X) = E(X²) − [E(X)]². Độ lệch chuẩn là căn bậc hai của phương sai. Với a, b là hằng số: E(aX + b) = aE(X) + b và Var(aX + b) = a²Var(X).

Phân phối nhị thức B(n, p) mô tả số lần thành công trong n phép thử độc lập, mỗi lần xác suất thành công là p. Kỳ vọng là np và phương sai là np(1 − p).

Phân phối chuẩn N(μ, σ²) có đồ thị hình chuông đối xứng quanh μ. Biến chuẩn hóa Z = (X − μ)/σ có phân phối chuẩn tắc N(0, 1). Khoảng μ ± 1σ chứa khoảng 68% giá trị, μ ± 2σ chứa khoảng 95%, μ ± 3σ chứa khoảng 99,7%.

Định lý giới hạn trung tâm: với mẫu đủ lớn, trung bình mẫu có phân phối xấp xỉ chuẩn, bất kể phân phối gốc của tổng thể, với kỳ vọng μ và độ lệch chuẩn σ/√n.$xs1$, true
from subjects s where s.slug = 'xac-suat-thong-ke'
and not exists (select 1 from documents d where d.subject_id = s.id and d.title = 'Biến ngẫu nhiên và phân phối chuẩn');

insert into documents (subject_id, owner_id, title, content, is_public)
select s.id, null, 'Cấu trúc dữ liệu cơ bản trong Python',
$py1$List là dãy có thứ tự và có thể thay đổi, tạo bằng ngoặc vuông, ví dụ a = [1, 2, 3]. Chỉ số bắt đầu từ 0, chỉ số âm đếm từ cuối danh sách. Phương thức append thêm phần tử vào cuối, pop lấy phần tử ra, sort sắp xếp tại chỗ.

Tuple giống list nhưng không thể thay đổi sau khi tạo, tạo bằng ngoặc tròn, ví dụ t = (1, 2). Dictionary lưu cặp khóa và giá trị, ví dụ d = {"ten": "An", "tuoi": 20}; khóa phải là kiểu không thay đổi được như chuỗi, số hoặc tuple. Truy cập d["ten"] gây lỗi KeyError nếu khóa không tồn tại, còn d.get("ten") trả về None.

Set là tập hợp không có thứ tự và không có phần tử trùng, hỗ trợ phép hợp, giao, hiệu. Ví dụ set([1, 2, 2, 3]) cho {1, 2, 3}.

List comprehension tạo list ngắn gọn: [x * x for x in range(5) if x % 2 == 0] cho [0, 4, 16]. Hàm range(5) tạo dãy từ 0 đến 4. Hàm len trả về số phần tử.

Chuỗi (str) cũng không thể thay đổi. Lát cắt s[1:4] lấy ký tự từ chỉ số 1 đến 3. Phương thức split tách chuỗi thành list, join ghép các phần tử thành chuỗi.$py1$, true
from subjects s where s.slug = 'lap-trinh-python'
and not exists (select 1 from documents d where d.subject_id = s.id and d.title = 'Cấu trúc dữ liệu cơ bản trong Python');
