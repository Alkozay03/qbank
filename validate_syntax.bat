@echo off
REM Validate syntax of extract_single.py
echo Validating syntax of extract_single.py...
echo.

python "%~dp0validate_syntax.py"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Validation successful! The file has no syntax errors.
) else (
    echo.
    echo Validation failed. Please fix the syntax errors.
)
