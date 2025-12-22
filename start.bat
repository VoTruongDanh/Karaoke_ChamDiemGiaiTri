@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Karaoke TV Web App

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           🎤 KARAOKE TV WEB APP - KHỞI ĐỘNG NHANH           ║
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
    echo [1/4] 📦 Đang cài đặt dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ Lỗi cài đặt!
        pause
        exit /b 1
    )
    echo ✅ Cài đặt hoàn tất!
) else (
    echo [1/4] ✅ Dependencies đã được cài đặt
)

:: Tạo SSL certificate nếu chưa có
if not exist "certs\localhost-key.pem" (
    echo [2/4] 🔐 Đang tạo SSL Certificate...
    call node scripts/generate-cert.js
    echo ✅ SSL Certificate đã được tạo!
) else (
    echo [2/4] ✅ SSL Certificate đã có
)

:: Mở firewall cho port 3000
echo [3/4] 🔥 Kiểm tra Firewall...
netsh advfirewall firewall show rule name="Karaoke TV Web App" >nul 2>&1
if !errorlevel! neq 0 (
    echo      Đang thêm rule firewall cho port 3000...
    netsh advfirewall firewall add rule name="Karaoke TV Web App" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
    if !errorlevel! equ 0 (
        echo      ✅ Đã mở firewall cho port 3000
    ) else (
        echo      ⚠️  Không thể mở firewall tự động. Hãy chạy với quyền Admin
        echo      hoặc tự mở port 3000 trong Windows Firewall
    )
) else (
    echo      ✅ Firewall đã được cấu hình
)

echo.
echo [4/4] 🚀 Đang khởi động ứng dụng...
echo.
echo ════════════════════════════════════════════════════════════════
echo   🔒 HTTPS - TẤT CẢ TRÊN CÙNG 1 PORT
echo ════════════════════════════════════════════════════════════════
echo.
echo   📺 TV App:       https://!IP!:3000
echo   📱 Mobile:       https://!IP!:3000/mobile
echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo ⚠️  LẦN ĐẦU TRUY CẬP:
echo    1. Mở https://!IP!:3000 trên TV
echo    2. Nhấn "Advanced" rồi "Proceed" để chấp nhận certificate
echo    3. Trên điện thoại, quét QR hoặc mở https://!IP!:3000/mobile
echo    4. Chấp nhận certificate trên điện thoại (chỉ 1 lần)
echo.
echo 💡 Nếu điện thoại không kết nối được:
echo    - Kiểm tra cùng mạng WiFi
echo    - Thử tắt VPN trên điện thoại
echo    - Chạy lại file này với quyền Admin (để mở firewall)
echo.
echo 💡 Nhấn Ctrl+C để dừng ứng dụng
echo.

:: Chạy server all-in-one
call node server.js

if !errorlevel! neq 0 (
    echo.
    echo ❌ Có lỗi xảy ra!
    pause
)
endlocal
