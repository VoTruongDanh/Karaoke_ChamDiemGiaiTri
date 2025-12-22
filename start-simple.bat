@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Karaoke TV Web App (HTTP)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║      🎤 KARAOKE TV WEB APP - CHẾ ĐỘ ĐƠN GIẢN (HTTP)         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Lấy IP của máy
set "IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "TEMPIP=%%a"
    set "IP=!TEMPIP:~1!"
    goto :got_ip
)
:got_ip

:: Kiểm tra node_modules
if not exist "node_modules" (
    echo [1/2] 📦 Đang cài đặt dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ Lỗi cài đặt!
        pause
        exit /b 1
    )
) else (
    echo [1/2] ✅ Dependencies đã được cài đặt
)

:: Xóa cert tạm để chạy HTTP
if exist "certs\localhost-key.pem" (
    echo [!] Đang tạm ẩn SSL cert để chạy HTTP...
    ren "certs\localhost-key.pem" "localhost-key.pem.bak"
)

echo.
echo [2/2] 🚀 Đang khởi động ứng dụng...
echo.
echo ════════════════════════════════════════════════════════════════
echo   📺 TV App:       http://!IP!:3000
echo   📱 Mobile:       http://!IP!:3000/mobile
echo   🔌 WebSocket:    http://!IP!:3000 (cùng port!)
echo ════════════════════════════════════════════════════════════════
echo.
echo ⚠️  Chế độ HTTP: Kết nối nhanh, nhưng không có chấm điểm mic
echo 💡 Dùng start.bat để chạy HTTPS với đầy đủ tính năng
echo 💡 Nhấn Ctrl+C để dừng
echo.

call node server.js

:: Khôi phục cert
if exist "certs\localhost-key.pem.bak" (
    ren "certs\localhost-key.pem.bak" "localhost-key.pem"
)

if !errorlevel! neq 0 (
    echo ❌ Có lỗi xảy ra!
    pause
)
endlocal
