# Bus Ticketing System API

A comprehensive backend API for a bus ticketing system built with Node.js, TypeScript, PostgreSQL, and Prisma.

## Features

- **User Management**: CRUD operations with role-based access (admin, operator, customer)
- **Authentication**: JWT-based authentication with role-based authorization
- **Bus & Route Management**: Complete CRUD operations for buses and routes
- **Trip Management**: Create and manage bus trips with schedules and pricing
- **Seat Management**: Define seat layouts per bus
- **Booking System**: Book seats, view available trips, manage bookings
- **Payment Integration**: Support for eSewa and Khalti payment gateways
- **Error Handling**: Comprehensive error handling and input validation

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Testing**: Jest with Supertest
- **Architecture**: Service Layer pattern

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── repositories/    # Data access layer
├── middleware/      # Custom middleware
├── routes/          # API route definitions
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── validators/      # Input validation schemas
└── server.ts        # Application entry point

prisma/
├── schema.prisma    # Database schema
├── migrations/      # Database migrations
└── seed.ts         # Database seeding script
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bus-ticketing-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration values.

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run database migrations
   npm run prisma:migrate
   
   # Seed the database with initial data
   npm run prisma:seed
   ```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Routes
- `GET /api/routes` - Get all routes
- `POST /api/routes` - Create new route (admin/operator)
- `GET /api/routes/:id` - Get route by ID
- `PUT /api/routes/:id` - Update route
- `DELETE /api/routes/:id` - Delete route

### Buses
- `GET /api/buses` - Get all buses
- `POST /api/buses` - Create new bus (admin/operator)
- `GET /api/buses/:id` - Get bus by ID
- `PUT /api/buses/:id` - Update bus
- `DELETE /api/buses/:id` - Delete bus

### Trips
- `GET /api/trips` - Get all trips with filters
- `POST /api/trips` - Create new trip (admin/operator)
- `GET /api/trips/:id` - Get trip by ID
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking by ID
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Payments
- `POST /api/payments/esewa/initiate` - Initiate eSewa payment
- `POST /api/payments/khalti/initiate` - Initiate Khalti payment
- `GET /api/payments/esewa/success` - eSewa payment success callback
- `GET /api/payments/khalti/success` - Khalti payment success callback

## Request/Response Examples

### User Registration
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "9841234567",
  "role": "customer"
}
```

### Create Trip
```json
POST /api/trips
{
  "busId": "uuid-here",
  "routeId": "uuid-here",
  "departureTime": "2024-01-15T10:00:00Z",
  "arrivalTime": "2024-01-15T16:00:00Z",
  "price": 800,
  "status": "scheduled"
}
```

### Book Seat
```json
POST /api/bookings
{
  "tripId": "uuid-here",
  "seatNumbers": ["A1", "A2"],
  "passengerDetails": [
    {
      "name": "John Doe",
      "phone": "9841234567",
      "seatNumber": "A1"
    }
  ]
}
```

## Environment Variables

See `.env.example` for all required environment variables.

## Database Schema

The database uses PostgreSQL with the following main entities:
- Users (with roles: admin, operator, customer)
- Routes (origin, destination, distance, duration)
- Buses (with seat layouts)
- Trips (scheduled bus journeys)
- Bookings (passenger reservations)
- Payments (transaction records)

## Payment Integration

### eSewa
- Supports standard eSewa payment flow
- Handles success/failure callbacks
- Automatically updates booking status

### Khalti
- Supports Khalti payment gateway
- Real-time payment verification
- Automatic booking confirmation

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Security headers with Helmet

## Error Handling

- Centralized error handling middleware
- Custom error classes
- Consistent error response format
- Proper HTTP status codes
- Detailed error logging

## Testing

The project includes comprehensive tests:
- Unit tests for services
- Integration tests for controllers
- API endpoint testing
- Database testing with test database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC License
