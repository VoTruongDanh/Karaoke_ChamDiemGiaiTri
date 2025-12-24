# Deploy Karaoke App Miễn Phí

## 🚀 Cách 1: Railway (Khuyên dùng - Đơn giản nhất)

### Bước 1: Tạo tài khoản
1. Vào https://railway.app
2. Đăng ký bằng GitHub

### Bước 2: Deploy
1. Click "New Project" → "Deploy from GitHub repo"
2. Chọn repo karaoke của bạn
3. Railway tự động detect và build

### Bước 3: Cấu hình
1. Vào Settings → Variables, thêm:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_YOUTUBE_API_KEY=your_api_key (nếu có)
   ```
2. Railway tự động cấp domain HTTPS miễn phí

### Free tier: 500 giờ/tháng (~20 ngày liên tục)

---

## 🚀 Cách 2: Render

### Bước 1: Tạo tài khoản
1. Vào https://render.com
2. Đăng ký bằng GitHub

### Bước 2: Deploy
1. Click "New" → "Web Service"
2. Connect GitHub repo
3. Cấu hình:
   - Build Command: `npm install && npm run build`
   - Start Command: `node server.js`

### Free tier: 750 giờ/tháng, tự động sleep sau 15 phút không dùng

---

## 🚀 Cách 3: Fly.io

### Bước 1: Cài CLI
```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Hoặc dùng npm
npm install -g flyctl
```

### Bước 2: Deploy
```bash
fly auth login
fly launch
fly deploy
```

### Free tier: 3 shared VMs, 160GB bandwidth

---

## ⚠️ Lưu ý quan trọng

1. **HTTPS tự động**: Các platform trên đều cấp HTTPS miễn phí - cần thiết cho mic trên mobile

2. **WebSocket**: Tất cả đều hỗ trợ WebSocket/Socket.io

3. **YouTube API Key**: Nếu muốn tìm kiếm YouTube, cần thêm API key vào Environment Variables

4. **Sleep mode**: Free tier thường tự động sleep - lần đầu truy cập sẽ chậm ~30s

---

## 📱 Sau khi deploy

1. Mở URL trên TV: `https://your-app.railway.app`
2. Quét QR hoặc mở trên điện thoại: `https://your-app.railway.app/mobile`
3. Nhập mã 4 số để kết nối

Xong! 🎤
