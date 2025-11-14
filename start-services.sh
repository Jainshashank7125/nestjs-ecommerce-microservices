#!/bin/bash

# Script to start both Product and Order services concurrently
# Usage: ./start-services.sh

echo "🚀 Starting Product Service and Order Service..."
echo ""

# Check if services are already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Product Service is already running on port 3001"
else
    echo "✅ Starting Product Service on port 3001..."
fi

if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Order Service is already running on port 3002"
else
    echo "✅ Starting Order Service on port 3002..."
fi

echo ""
echo "📝 Services will be available at:"
echo "   Product Service: http://localhost:3001"
echo "   Product Service API Docs: http://localhost:3001/api-docs"
echo "   Order Service: http://localhost:3002"
echo "   Order Service API Docs: http://localhost:3002/api-docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start Product Service in background
cd product-service
npm run start:dev > ../logs/product-service.log 2>&1 &
PRODUCT_PID=$!

# Start Order Service in background
cd ../order-service
npm run start:dev > ../logs/order-service.log 2>&1 &
ORDER_PID=$!

# Create logs directory if it doesn't exist
mkdir -p ../logs

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $PRODUCT_PID 2>/dev/null
    kill $ORDER_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $PRODUCT_PID $ORDER_PID

