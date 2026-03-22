# Sound Sense Flow - Backend API

REST API backend for the Sound Sense Flow acoustic monitoring system.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sound_sense_flow
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Create Database Schema

Make sure MySQL is running, then:

```bash
npm run migrate
```

Or run the schema script directly:
```bash
npx ts-node src/db/schema.ts
```

### 4. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:5000`

### 5. API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

#### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device details

#### Monitoring
- `GET /api/monitoring` - Get monitoring data
- `POST /api/monitoring` - Record monitoring data

#### Alarms
- `GET /api/alarms` - List alarms
- `PATCH /api/alarms/:id/resolve` - Resolve an alarm

#### Reports
- `GET /api/reports` - List reports
- `POST /api/reports` - Generate new report

## Database Schema

### Tables
1. **users** - System users and authentication
2. **locations** - Geographic locations/sites
3. **devices** - Acoustic monitoring devices
4. **monitoring_data** - Sound level readings and acoustic data
5. **thresholds** - Alert threshold configurations
6. **alarms** - Triggered alarms and alerts
7. **reports** - Generated reports
8. **notifications** - User notifications
9. **maintenance_logs** - Device maintenance records
10. **audit_logs** - System audit trail

## Development

- TypeScript for type safety
- Express.js for REST API
- MySQL with mysql2 driver
- CORS enabled for frontend communication
- JWT support for authentication

## Production Deployment

```bash
npm run build
npm start
```

## License

MIT
