rem - convenient interface to launch local web server for organicart
rem - used to use Apache, moved to node.js 25 July 2016
rem - good place to verity typescript OK for svn users
rem - will lauch using windows node.exe if available and no option
rem - will launch wsl linux if no node.exe found, or if %1 == linux
setlocal

pushd %~dp0
rem - call organicts.cmd

set NODE_PATH=NOTUSED\..\nodejs\node_modulesNOTUSED
rem start /min "node organic server: %~dp0" ..\nodejs\node.exe dist\organserver.js
set nodee=..\nodejs\node.exe
set linux=%1
if not exist %nodee% set nodee=node.exe
if not exist %nodee% set linux=linux

if  "%linux%"=="linux" (
    start /min "linux node organic server: %~dp0\dist\organserver.js" wsl -d Ubuntu /mnt/c/temp/linuxnode/bin/node dist/organserver.js
)else (
    start /min "windows node organic server: %~dp0\dist\organserver.js" %nodee%  dist\organserver.js
)

popd
exit /b

rem for avoid this cmd file (eg shortcut)
C:\GoldsmithsSVN\aaorganicart\organicart
C:\GoldsmithsSVN\aaorganicart\nodejs\node.exe dist\organserver.js