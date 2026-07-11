@echo off
setlocal
set "APP_DIR=%~dp0."
set "NODE_EXE=C:\Program Files\nodejs\node.exe"

if not exist "%NODE_EXE%" (
  set "NODE_EXE=node"
)

echo.
echo MusicDocs Wi-Fi server
echo ----------------------------
echo Keep this window open while testing on iPhone.
echo.
echo Open this on iPhone:
echo http://192.168.1.188:8787/?verify=iphone#favorites
echo.
pushd "%APP_DIR%"
"%NODE_EXE%" "server.mjs" "." 8787
popd
echo.
echo Server stopped. Press any key to close.
pause > nul
