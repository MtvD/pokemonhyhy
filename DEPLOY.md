# Huong dan deploy len cPanel + Namecheap domain

Website nay dung PHP + MySQL de luu du lieu giua nhieu thiet bi.

## 1. Tao database trong cPanel

1. Vao cPanel.
2. Mo `MySQL Databases`.
3. Tao database, vi du: `pokemon`.
4. Tao database user, vi du: `pokemon_user`.
5. Gan user vao database va tick `ALL PRIVILEGES`.

Ten thuc te tren cPanel thuong co prefix, vi du:

```txt
Database: username_pokemon
User: username_pokemon_user
```

Hay dung dung ten day du co prefix.

## 2. Import bang database

1. Mo `phpMyAdmin`.
2. Chon database vua tao.
3. Vao tab `Import`.
4. Upload file `database.sql`.
5. Bam `Import`.

Sau khi import sẽ có 2 bảng:

```txt
sessions
players
```

## 3. Dien thong tin database

Mo file `api/config.php` va sua:

```php
const DB_HOST = 'localhost';
const DB_NAME = 'username_pokemon';
const DB_USER = 'username_pokemon_user';
const DB_PASS = 'mat_khau_database';
```

`DB_HOST` tren shared hosting thuong la `localhost`.

## 4. Upload file len hosting

Trong cPanel, vao `File Manager` -> `public_html`, upload:

```txt
index.html
styles.css
app.js
database.sql
api/
```

File `database.sql` không bắt buộc để website chạy sau khi import xong. Có thể xóa file này khỏi `public_html` sau khi import.

## 5. Cập nhật database cũ khi nâng cấp

Nếu bạn đã import `database.sql` trước phiên bản có lịch sử ẩn/khôi phục, hãy mở `phpMyAdmin` -> chọn database -> tab `SQL`, rồi chạy:

```sql
ALTER TABLE sessions
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER buyin_value;
```

Nếu bạn đã import database trước phiên bản cho phép `Lượt khởi động` là số âm, chạy thêm:

```sql
ALTER TABLE players
  MODIFY buyins INT NOT NULL DEFAULT 0;
```

Nếu tạo database mới từ file `database.sql` hiện tại thì không cần chạy bước này.

## 6. Kiểm tra website

Mo domain:

```txt
https://tenmiencuaban.com
```

Thêm một phiên/người chơi trên máy A, sau đó mở domain trên máy B. Dữ liệu sẽ lấy từ database.

## 7. Trỏ domain Namecheap về hosting

Neu hosting/cPanel da cung cap nameserver, vi du:

```txt
ns1.tenhosting.com
ns2.tenhosting.com
```

Thi vao Namecheap:

1. `Domain List`
2. Bam `Manage` o domain
3. Muc `Nameservers`
4. Chon `Custom DNS`
5. Nhập nameserver hosting cung cấp
6. Luu lai

DNS co the mat vai phut den 24-48 gio de cap nhat hoan toan.

Neu hosting yeu cau tro bang IP, vao Namecheap `Advanced DNS` va tao:

```txt
Type: A Record
Host: @
Value: IP cua hosting
TTL: Automatic

Type: CNAME Record
Host: www
Value: tenmiencuaban.com
TTL: Automatic
```

Chi dung mot trong hai cach theo thong tin hosting cung cap: nameserver hoac A record.
