@echo off
echo Restoring file extensions...
for /r %%f in (*.js.txt) do (
    set "file=%%f"
    ren "%%f" "%%~nf"
)
for /r %%f in (*.json.txt) do (
    set "file=%%f"
    ren "%%f" "%%~nf"
)

echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Error during npm install.
    pause
    exit /b %ERRORLEVEL%
)

echo Building the project...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error during npm build.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Build complete! The portable files are in the 'dist' folder.
echo You can now copy the 'dist' folder to your offline PC.
pause
