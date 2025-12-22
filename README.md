# 🎤 Karaoke TV Web App

Ứng dụng web karaoke được tối ưu hóa cho Google TV và Android TV, với khả năng điều khiển từ điện thoại.

## 📋 Yêu cầu hệ thống

- Node.js 18+ 
- npm hoặc yarn
- YouTube Data API Key

## 🚀 Hướng dẫn cài đặt

### Bước 1: Clone và cài đặt dependencies

```bash
# Clone repository (nếu cần)
git clone <repository-url>
cd karaoke-tv-web

# Cài đặt dependencies
npm install
```

### Bước 2: Cấu hình YouTube API Key

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services** > **Library**
4. Tìm và enable **YouTube Data API v3**
5. Vào **APIs & Services** > **Credentials**
6. Click **Create Credentials** > **API Key**
7. Copy API Key

8. Mở file `.env.local` và thay thế:
```
NEXT_PUBLIC_YOUTUBE_API_KEY=YOUR_API_KEY_HERE
```

### Bước 3: Chạy ứng dụng

**Cách 1: Chạy cả 2 server cùng lúc (Khuyến nghị)**
```bash
npm run dev:all
```

**Cách 2: Chạy riêng từng server (Mở 2 terminal)**

Terminal 1 - WebSocket Server:
```bash
npm run dev:server
```
✅ Server chạy tại: http://localhost:3001

Terminal 2 - Next.js Frontend:
```bash
npm run dev
```
✅ Frontend chạy tại: http://localhost:3000

## 📱 Cách sử dụng

### Trên TV (hoặc trình duyệt máy tính)

1. Mở http://localhost:3000
2. Màn hình hiển thị mã QR và mã 6 số
3. Điều hướng bằng phím mũi tên, chọn bằng Enter

### Trên điện thoại

1. Mở http://localhost:3000/mobile
2. Nhập mã 6 số từ màn hình TV
3. Tìm kiếm và thêm bài hát vào hàng đợi

## 🌐 Chạy trên mạng LAN (để TV thật truy cập)

### Chế độ HTTP (không có chấm điểm mic)

1. Tìm IP máy tính:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` hoặc `ip addr`

2. Chạy ứng dụng:
   ```bash
   npm run dev:all
   ```

3. Trên TV, mở trình duyệt và truy cập:
   ```
   http://192.168.x.x:3000
   ```

### Chế độ HTTPS (có chấm điểm mic) ⭐ Khuyến nghị

Trình duyệt chỉ cho phép truy cập microphone qua HTTPS hoặc localhost. Để bật chấm điểm khi chạy trên LAN:

1. **Cài đặt mkcert** (tạo certificate được trình duyệt tin tưởng):
   - Windows: `choco install mkcert` hoặc tải từ [GitHub](https://github.com/FiloSottile/mkcert)
   - Mac: `brew install mkcert`
   - Linux: `sudo apt install mkcert`

2. **Tạo certificate**:
   ```bash
   npm run generate-cert
   ```

3. **Chạy với HTTPS**:
   ```bash
   npm run dev:https
   ```

4. Truy cập qua HTTPS:
   ```
   https://192.168.x.x:3000      # TV App
   https://192.168.x.x:3000/mobile  # Mobile Controller
   ```

> ⚠️ Nếu dùng self-signed certificate (không có mkcert), trình duyệt sẽ cảnh báo. Click "Advanced" > "Proceed" để tiếp tục.

## 🎮 Điều khiển TV Remote

| Phím | Chức năng |
|------|-----------|
| ⬆️ Lên | Di chuyển focus lên |
| ⬇️ Xuống | Di chuyển focus xuống |
| ⬅️ Trái | Di chuyển focus trái |
| ➡️ Phải | Di chuyển focus phải |
| Enter/OK | Chọn/Xác nhận |

## 📁 Cấu trúc thư mục

```
karaoke-tv-web/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── page.tsx         # TV App
│   │   └── mobile/          # Mobile Controller
│   ├── components/          # React components
│   │   ├── screens/         # Màn hình chính
│   │   └── ...              # Components dùng chung
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Business logic
│   ├── stores/              # Zustand stores
│   ├── server/              # WebSocket server
│   └── types/               # TypeScript types
├── .env.local               # Environment variables
└── package.json
```

## 🔧 Scripts

```bash
# Development
npm run dev:all      # Chạy cả frontend và server cùng lúc (Khuyến nghị)
npm run dev          # Chạy Next.js frontend
npm run dev:server   # Chạy WebSocket server

# Production
npm run build        # Build production
npm start            # Chạy production frontend
npm run start:server # Chạy production server

# Testing & Linting
npm test             # Chạy tests
npm run lint         # Kiểm tra lỗi code
```

## ✨ Tính năng

- ✅ Giao diện tối ưu cho TV với điều khiển remote
- ✅ Điều khiển từ điện thoại qua WebSocket
- ✅ Tìm kiếm bài hát karaoke từ YouTube
- ✅ Hàng đợi bài hát với sắp xếp lại
- ✅ Tự động phát bài tiếp theo
- ✅ Hệ thống chấm điểm giọng hát
- ✅ Tổng kết phiên hát
- ✅ Dark theme đẹp mắt
- ✅ Responsive cho cả TV và mobile

## ⚠️ Lưu ý

- Cần có YouTube API Key để tìm kiếm bài hát
- Chức năng chấm điểm cần quyền truy cập microphone
- Đảm bảo TV và điện thoại cùng mạng WiFi

## 📄 License

MIT License
