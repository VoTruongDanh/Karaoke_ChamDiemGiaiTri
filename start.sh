#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🎤 KARAOKE TV WEB APP - KHỞI ĐỘNG NHANH           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Get local IP
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "localhost")

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "[1/3] 📦 Đang cài đặt dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Lỗi cài đặt!"
        exit 1
    fi
    echo "✅ Cài đặt hoàn tất!"
else
    echo "[1/3] ✅ Dependencies đã được cài đặt"
fi

# Generate SSL cert if needed
if [ ! -f "certs/localhost-key.pem" ]; then
    echo "[2/3] 🔐 Đang tạo SSL Certificate..."
    node scripts/generate-cert.js
    echo "✅ SSL Certificate đã được tạo!"
else
    echo "[2/3] ✅ SSL Certificate đã có"
fi

echo ""
echo "[3/3] 🚀 Đang khởi động ứng dụng..."
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🔒 HTTPS - TẤT CẢ TRÊN CÙNG 1 PORT"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  📺 TV App:       https://$IP:3000"
echo "  📱 Mobile:       https://$IP:3000/mobile"
echo "  🔌 WebSocket:    https://$IP:3000 (cùng port!)"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  LẦN ĐẦU: Chấp nhận certificate trên cả TV và điện thoại"
echo "💡 Nhấn Ctrl+C để dừng"
echo ""

node server.js
