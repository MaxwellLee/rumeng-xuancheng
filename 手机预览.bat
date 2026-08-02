@echo off
chcp 65001 >nul
cd /d %~dp0
echo ============================================
echo   入梦悬城 · 互动小说  手机预览
echo ============================================
echo.
echo  1. 请确认手机和这台电脑连着同一个 Wi-Fi
echo  2. 稍等几秒，下面出现 Network: 开头的网址后
echo  3. 用手机浏览器打开那个网址即可阅读
echo.
echo  关闭本窗口即停止服务。
echo ============================================
echo.
node node_modules/vite/bin/vite.js --host --port 5199
pause
