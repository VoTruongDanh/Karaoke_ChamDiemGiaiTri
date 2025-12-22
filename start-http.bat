@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Karaoke TV Web App (HTTP - Debug)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║      🎤 KARAOKE TV WEB APP - CHẾ ĐỘ HTTP (DEBUG)            ║
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
    echo [1/3] 📦 Đang cài đặt dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ Lỗi cài đặt!
        pause
        exit /b 1
    )
) else (
    echo [1/3] ✅ Dependencies đã được cài đặt
)

:: Mở firewall
echo [2/3] 🔥 Mở Firewall cho port 3000...
netsh advfirewall firewall delete rule name="Karaoke TV Web App" >nul 2>&1
netsh advfirewall firewall add rule name="Karaoke TV Web App" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
if !errorlevel! equ 0 (
    echo      ✅ Firewall OK
) else (
    echo      ⚠️  Cần quyền Admin để mở firewall
)

:: Tạm đổi tên cert để chạy HTTP
if exist "certs\localhost-key.pem" (
    echo [!] Tạm ẩn SSL cert để chạy HTTP...
    ren "certs\localhost-key.pem" "localhost-key.pem.disabled" >nul 2>&1
)

echo.
echo [3/3] 🚀 Đang khởi động ứng dụng (HTTP)...
echo.
echo ════════════════════════════════════════════════════════════════
echo   📺 TV App:       http://!IP!:3000
echo   📱 Mobile:       http://!IP!:3000/mobile
echo ════════════════════════════════════════════════════════════════
echo.
echo ⚠️  Chế độ HTTP: Không cần chấp nhận certificate
echo ⚠️  Microphone sẽ không hoạt động trên LAN (chỉ localhost)
echo.
echo 💡 Nếu mobile vẫn không kết nối được:
echo    1. Kiểm tra cùng mạng WiFi
echo    2. Thử ping !IP! từ điện thoại
echo    3. Tắt VPN trên điện thoại
echo    4. Chạy start-admin.bat với quyền Admin
echo.
echo 💡 Nhấn Ctrl+C để dừng
echo.

call node server.js

:: Khôi phục cert
if exist "certs\localhost-key.pem.disabled" (
    ren "certs\localhost-key.pem.disabled" "localhost-key.pem" >nul 2>&1
)

if !errorlevel! neq 0 (
    echo ❌ Có lỗi xảy ra!
    pause
)
endlocal
