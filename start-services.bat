@echo off
REM Script to start both Product and Order services concurrently on Windows
REM Usage: start-services.bat

echo Starting Product Service and Order Service...
echo.

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

echo Product Service: http://localhost:3001
echo Product Service API Docs: http://localhost:3001/api-docs
echo Order Service: http://localhost:3002
echo Order Service API Docs: http://localhost:3002/api-docs
echo.
echo Press Ctrl+C to stop all services
echo.

REM Start Product Service
start "Product Service" cmd /k "cd product-service && npm run start:dev"

REM Wait a bit for the first service to start
timeout /t 2 /nobreak >nul

REM Start Order Service
start "Order Service" cmd /k "cd order-service && npm run start:dev"

echo.
echo Both services are starting in separate windows.
echo Close the windows or press Ctrl+C in each window to stop the services.

