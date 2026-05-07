# Pharmacy Backend API

A Node.js TypeScript backend API for pharmacy management with Supabase integration.

## Railway Deployment Fix for Canvas g_memdup2 Error

If you encounter `undefined symbol: g_memdup2` errors during Railway deployment, this project includes the necessary fixes:

### The Issue
The error occurs when the prebuilt `canvas` npm package binary is incompatible with the nixpacks runtime environment's glib/pango versions.

### Solution Applied
1. **Build from Source**: Canvas is configured to compile from source instead of using prebuilt binaries
2. **Library Compatibility**: Updated nixpacks.toml with compatible glib and pango versions  
3. **Runtime Libraries**: Added necessary build dependencies (gcc, make, python) for node-gyp
4. **Environment Variables**: Set `CANVAS_PREBUILT=false` and proper library paths

### Files Modified
- `nixpacks.toml`: Updated with build dependencies and runtime libraries
- `package.json`: Moved canvas to `optionalDependencies`
- `.npmrc`: Added canvas build configuration
- `railway.json`: Updated build command to use `--build-from-source`

## Features

- User authentication (Signup & Signin)
- Pharmacy table management
- Global error handling
- Async error handling with catchAsync
- TypeScript support
- Swagger API documentation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
ENABLE_NDC_VALIDATION=true  # Set to 'false' or '0' to skip NDC validation in /api/return-reports/process
```

3. Create the pharmacy table:
   - Option 1: Run the SQL script in Supabase SQL Editor (`scripts/pharmacy_table.sql`)
   - Option 2: Run the migration script: `npm run migrate`

4. Start the development server:
```bash
npm run dev
```

5. Access Swagger documentation:
   - Open your browser and navigate to `http://localhost:3000/api-docs`
   - You can test all API endpoints directly from the Swagger UI

## API Documentation

Swagger documentation is available at `/api-docs` endpoint. The documentation includes:
- All API endpoints with request/response schemas
- Interactive API testing interface
- Detailed parameter descriptions
- Example requests and responses

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Authentication
- `POST /api/auth/signup` - Register a new pharmacy user
- `POST /api/auth/signin` - Login with email and password

## Project Structure

```
pharmacy-backend/
├── src/
│   ├── config/
│   │   ├── supabase.ts          # Supabase client configuration
│   │   └── swagger.ts           # Swagger configuration
│   ├── controllers/
│   │   ├── authController.ts    # Auth route handlers
│   │   └── errorController.ts   # Global error handler
│   ├── services/
│   │   └── authService.ts        # Business logic for authentication
│   ├── routes/
│   │   └── authRoutes.ts        # Auth routes
│   ├── utils/
│   │   ├── catchAsync.ts        # Async error wrapper
│   │   └── appError.ts          # Custom error class
│   ├── helpers/
│   │   └── validation.ts        # Validation helper functions
│   └── server.ts                # Express app entry point
├── scripts/
│   ├── migrate.ts               # Migration script
│   └── pharmacy_table.sql       # SQL migration file
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migration

