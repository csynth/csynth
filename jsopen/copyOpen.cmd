rem copy our owned git project builds to this jsopen directory
rem convention is that runtime for 'our' projects are in jsopen
rem and runtime for other open projects in jsdeps
setlocal
cd %~dp0
set source=c:\gitProjects
copy C:\gitProjects\dat.guiVR\build\* .
copy C:\gitProjects\webGLDebug\gldebug.js .