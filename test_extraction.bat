@echo off
REM Test the enhanced extraction system
echo Testing enhanced extraction system...
echo.

if "%1"=="" (
    echo Error: Please provide an image path
    echo Usage: test_extraction.bat ^<image_path^>
    exit /b 1
)

python "%~dp0\test_extraction.py" "%~1"

if %ERRORLEVEL% EQU 0 (
    echo Test completed successfully
) else (
    echo Test failed with error code %ERRORLEVEL%
)
