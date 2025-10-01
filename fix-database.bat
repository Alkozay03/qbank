@echo off
echo.
echo ========================================
echo    FIXING DATABASE SCHEMA ISSUES
echo ========================================
echo.
echo This will fix the missing User.updatedAt column
echo and create missing Notification tables.
echo.
pause

echo Running database schema fix...
node fix-database-schema.js

echo.
echo ========================================
echo           RESTART REQUIRED
echo ========================================
echo.
echo Please restart your development server:
echo 1. Stop the current server (Ctrl+C)
echo 2. Run: npm run dev
echo.
pause
