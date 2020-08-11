rem - convenient interface to launch local web server for organicart
rem - used to use Apache, moved to node.js 25 July 2016
rem - good place to verity typescript OK for svn users
setlocal

pushd %~dp0
rem - call organicts.cmd

set NODE_PATH=NOTUSED\..\nodejs\node_modulesNOTUSED
rem start /min "node organic server: %~dp0" ..\nodejs\node.exe  ..\nodeserver.js
set nodee=..\nodejs\node.exe
if not exist %nodee% set nodee=node.exe
start /min "node organic server: %~dp0" %nodee%  dist\organserver.js

popd
exit /b
