# Microservices + Dynamic Form Client

A full-stack application featuring two Nest.js microservices (Product Service and Order Service) and a Next.js client application with dynamic form rendering.

## Project Structure

```
/repo-root
  /product-service    # Product Management Microservice (Nest.js)
  /order-service      # Order Management Microservice (Nest.js)
  /client             # Dynamic Form Client (Next.js + TypeScript)
  README.md
  .gitignore
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- SQLite (or PostgreSQL/MySQL - configured in each service)

## Quick Start

### 1. Product Service

```bash
cd product-service
npm install
npm run build
npm run start:dev
```

Service runs on: `http://localhost:3001`

### 2. Order Service

```bash
cd order-service
npm install
npm run build
npm run start:dev
```

Service runs on: `http://localhost:3002`

**Note:** Make sure Product Service is running before starting Order Service.

### 3. Client Application

```bash
cd client
npm install
npm run dev
```

Client runs on: `http://localhost:3000`

## API Endpoints

### Product Service (Port 3001)

- `POST /products` - Create a product
- `GET /products` - Get all products
- `GET /products/:id` - Get product by ID
- `PATCH /products/:id` - Update product (partial update)
- `DELETE /products/:id` - Delete product

### Order Service (Port 3002)

- `POST /orders` - Create an order (validates product exists and has sufficient quantity)
- `GET /orders` - Get all orders
- `GET /orders/:id` - Get order by ID
- `PATCH /orders/:id` - Update order (partial update, validates product if productId changes)
- `DELETE /orders/:id` - Delete order
- `GET /orders/with-products` - Get orders with product details (fetches product info from Product Service)

## Example API Requests

### Create Product

```bash
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "quantity": 10
  }'
```

Response will include the created product with a UUID `id`.

### Get All Products

```bash
curl http://localhost:3001/products
```

### Create Order

First, get a product ID from the Product Service, then:

```bash
curl -X POST http://localhost:3002/orders \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid-here",
    "quantity": 2,
    "status": "PENDING"
  }'
```

**Note:** The Order Service will validate that:
- The product exists in the Product Service
- The product has sufficient quantity available

### Get Orders with Products

```bash
curl http://localhost:3002/orders/with-products
```

This endpoint fetches product details from the Product Service for each order and returns combined data.

### Update Order

```bash
curl -X PATCH http://localhost:3002/orders/order-uuid-here \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```

## Verification Checklist

- [x] Both services start successfully
- [x] Products CRUD operations work
- [x] Orders CRUD operations work
- [x] Inter-service communication works
- [x] Dynamic form renders properly
- [x] LocalStorage persistence works

## Testing

### Product Service Tests

```bash
cd product-service
npm test
```

### Order Service Tests

```bash
cd order-service
npm test
```

## Technologies Used

### Backend
- Nest.js
- TypeORM
- SQLite (default, can be configured for PostgreSQL/MySQL)
- class-validator
- class-transformer

### Frontend
- Next.js 14
- TypeScript
- React Hook Form
- Material UI (MUI)
- LocalStorage API

## Database Schema

### Product
- `id` (UUID)
- `name` (string)
- `description` (string, optional)
- `price` (number)
- `quantity` (number)
- `createdAt` (Date)
- `updatedAt` (Date)

### Order
- `id` (UUID)
- `productId` (string, FK to Product Service)
- `quantity` (number)
- `status` (PENDING | CONFIRMED | CANCELLED)
- `createdAt` (Date)
- `updatedAt` (Date)

## Development

Each service and the client are independent applications. They can be developed and deployed separately.

For development, run all three applications in separate terminal windows:

1. **Terminal 1** - Product Service: `cd product-service && npm run start:dev`
2. **Terminal 2** - Order Service: `cd order-service && npm run start:dev`
3. **Terminal 3** - Client: `cd client && npm run dev`

## Frontend Features

The client application includes:

- **Dynamic Form Rendering**: Form fields are rendered based on JSON schema
- **Field Types Supported**:
  - `TEXT` - Text input with min/max length validation
  - `LIST` - Dropdown select
  - `RADIO` - Radio button group
- **Validation**: React Hook Form with email pattern validation
- **Persistence**: Form data automatically saves to LocalStorage and persists across page refreshes
- **UI**: Material UI components with responsive design

## Environment Variables

### Order Service

- `PRODUCT_SERVICE_URL` - URL of the Product Service (default: `http://localhost:3001`)
- `PORT` - Port to run the service on (default: `3002`)

### Product Service

- `PORT` - Port to run the service on (default: `3001`)

## License

MIT

