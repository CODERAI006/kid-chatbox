# Kid Chatbox - AI Quiz Tutor

A complete full-stack learning and quiz application for kids aged 6-14 years. Built with React, TypeScript, Node.js, Express, PostgreSQL, and OpenAI.

## Features

### Frontend
- **Secure Authentication**: Email/password and social login (Google/Apple)
- **User Profiles**: Store name, age, grade, and preferred language
- **Dashboard**: View recent scores, suggested topics, and motivational messages
- **Study Mode**: Interactive lessons with age-appropriate content
- **Quiz Mode**: 15-question quizzes with timer and instant feedback
- **Multi-language Support**: Hindi, English, or Hinglish
- **Multiple Subjects**: Hindi, English, Maths, EVS/Science, General Knowledge, or Custom topics
- **Analytics**: Track performance, identify strengths/weaknesses, and get recommendations

### Backend
- **RESTful API**: Node.js/Express server
- **PostgreSQL Database**: Secure data storage
- **JWT Authentication**: Secure token-based auth
- **Quiz Results Storage**: Save all quiz attempts and answers
- **Analytics Engine**: Calculate performance metrics and recommendations

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+ installed and running
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Quick Setup

### 1. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE kidchatbox;
\q
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kidchatbox
DB_USER=postgres
DB_PASSWORD=your_password

# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key_here

# API
VITE_API_BASE_URL=http://localhost:3000/api
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

### 4. Start Application

**Option 1: Run both frontend and backend together**
```bash
npm run dev:all
```

**Option 2: Run separately**
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev
```

### 5. Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── auth/          # Authentication components
│   │   ├── Dashboard.tsx  # Main dashboard
│   │   ├── StudyMode.tsx  # Study mode
│   │   └── QuizTutor.tsx  # Quiz mode
│   ├── services/          # API services
│   │   ├── api.ts        # Backend API client
│   │   ├── openai.ts     # OpenAI integration
│   │   └── study.ts      # Study mode service
│   ├── types/            # TypeScript types
│   └── constants/        # App constants
│
├── server/                 # Backend Node.js/Express API
│   ├── config/           # Configuration
│   │   └── database.js   # PostgreSQL connection
│   ├── routes/           # API routes
│   │   ├── auth.js      # Authentication endpoints
│   │   ├── quiz.js      # Quiz endpoints
│   │   └── analytics.js # Analytics endpoints
│   ├── middleware/       # Express middleware
│   │   └── auth.js      # JWT authentication
│   └── index.js         # Server entry point
│
└── package.json          # Dependencies and scripts
```

## Usage

1. Enter the child's age (7-14 years)
2. Select preferred language (Hindi/English/Hinglish)
3. Choose a subject and subtopic
4. Answer 15 questions one by one
5. Review results and explanations
6. Try another quiz or retry the same topic

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Chakra UI** - Component library
- **OpenAI GPT-4** - AI question generation
- **Vite** - Build tool

## Development

### Scripts

- `npm run dev` - Start frontend only
- `npm run dev:server` - Start backend only
- `npm run dev:all` - Start both frontend and backend
- `npm run build` - Build frontend for production
- `npm run lint` - Lint TypeScript files
- `npm run format` - Format code with Prettier

### Database

The database tables are created automatically on first server startup. For schema and migration patterns, see `docs/best-practices/db/README.md` and `server/README.md`.

### API Documentation

REST routes live under `server/` (Express). For API design patterns, see `docs/best-practices/API/README.md`.

## License

MIT

