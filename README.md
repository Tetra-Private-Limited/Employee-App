# Employee-App

Employee tracking system with a backend API, admin portal, and Android mobile app.

## Project Structure

| Component | Tech Stack | Directory | Default Port |
|-----------|-----------|-----------|-------------|
| Backend API | Express, Prisma, PostgreSQL | `backend/` | 3001 |
| Admin Portal | Next.js 14, Tailwind CSS | `admin-portal/` | 3000 |
| Mobile App | Android (Kotlin), Hilt, Room | `android/` | — |

## Prerequisites

- **Node.js** (v18+)
- **PostgreSQL** (v14+)
- **Android Studio** (for mobile app only)

## Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your environment file and configure it:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:

   | Variable | Description | Default |
   |----------|-------------|---------|
   | `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/employee_tracker` |
   | `JWT_ACCESS_SECRET` | Secret key for access tokens | — |
   | `JWT_REFRESH_SECRET` | Secret key for refresh tokens | — |
   | `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
   | `PORT` | Server port | `3001` |
   | `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
   | `NODE_ENV` | Environment | `development` |

4. Set up the database:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3001`.

## Admin Portal Setup

1. Navigate to the admin portal directory:

   ```bash
   cd admin-portal
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your environment file:

   ```bash
   cp .env.local.example .env.local
   ```

   The default `NEXT_PUBLIC_API_URL` is `http://localhost:3001`. Update it if your backend runs elsewhere.

4. Start the development server:

   ```bash
   npm run dev
   ```

   The portal will be available at `http://localhost:3000`.

## Android App Setup

1. Open the `android/` directory in Android Studio.
2. Configure the backend API URL in the network module (`android/app/src/main/java/com/employee/tracker/di/NetworkModule.kt`).
3. Build and run on a device or emulator.


## API Contract Notes (Backend + Mobile)

To keep Android and backend behavior aligned, the mobile app uses a dedicated endpoint for assigned geofences:

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /geofences/my` | Any authenticated user | Returns active, non-deleted geofences assigned to the current user. |

This endpoint is consumed by Android `ApiService.getMyGeofences()` (`android/app/src/main/java/com/employee/tracker/network/ApiService.kt`).

## Available Scripts

### Backend (`backend/`)

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `tsx watch src/app.ts` | Start dev server with hot reload |
| `npm run build` | `tsc` | Compile TypeScript |
| `npm run start` | `node dist/app.js` | Start production server |
| `npm run test` | `vitest run` | Run tests |
| `npm run test:watch` | `vitest` | Run tests in watch mode |
| `npm run db:migrate` | `prisma migrate dev` | Run database migrations |
| `npm run db:push` | `prisma db push` | Push schema to database |
| `npm run db:seed` | `tsx prisma/seed.ts` | Seed the database |
| `npm run db:studio` | `prisma studio` | Open Prisma Studio GUI |

### Admin Portal (`admin-portal/`)

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `next dev` | Start dev server |
| `npm run build` | `next build` | Build for production |
| `npm run start` | `next start` | Start production server |
| `npm run lint` | `next lint` | Run linter |
| `npm run test` | `vitest run` | Run tests |
| `npm run test:watch` | `vitest` | Run tests in watch mode |