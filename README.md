# HackathonGitworkflow 🚀

A comprehensive full-stack web application designed to automate and streamline the management of hackathon team registrations, GitHub repository creation, and participant collaboration. This platform enables hackathon organizers to efficiently manage team registrations while automatically provisioning GitHub repositories for participating teams.

**Live Demo:** [https://hackathon-gitworkflow.vercel.app](https://hackathon-gitworkflow.vercel.app)

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Frontend](#frontend)
- [Workflow](#workflow)
- [Environment Variables](#environment-variables)
- [Docker Setup](#docker-setup)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### Core Functionality
- **🎯 Team Registration**: Easy team registration form for hackathon participants
- **🐙 Automated GitHub Repository Creation**: Instantly create GitHub repositories for registered teams
- **👥 Automatic Collaborator Addition**: Add team members as collaborators to their repositories
- **📧 Email Notifications**: Send confirmation emails with repository links and setup instructions
- **📊 Team Management Dashboard**: Comprehensive admin dashboard to view, manage, and track team status
- **🔄 Job Queue System**: Asynchronous processing of repository creation and setup using BullMQ
- **⚡ Real-time Status Updates**: Track team registration status and repository creation progress

### Admin Features
- View all registered teams and their details
- Monitor team status (Active, Eliminated, Winner)
- Eliminate or restore teams during the hackathon
- Track team performance and scoring
- View team members and assigned domains
- Manage deadline enforcement

---

## 🛠️ Tech Stack

### Backend
- **Node.js & Express.js** - Server framework and routing
- **MongoDB** - NoSQL database for team and organization data
- **Mongoose** - MongoDB object modeling
- **BullMQ** - Job queue for asynchronous processing
- **Redis** - In-memory data store for queue management
- **Axios** - HTTP client for GitHub API integration
- **Nodemailer** - Email service for notifications
- **Dotenv** - Environment variable management
- **CORS** - Cross-Origin Resource Sharing middleware

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Responsive styling and animations
- **Vanilla JavaScript** - DOM manipulation and API interaction
- **Vercel** - Deployment platform

### DevOps & Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **GitHub API v3** - Repository management and collaboration

---

## 📁 Project Structure

```
HackathonGitworkflow/
├── hackathon-backend/          # Express backend application
│   ├── server.js              # Main server and API routes
│   ├── worker.js              # Background job processor
│   ├── healthcheck-worker.js  # Worker health monitoring
│   ├── models/
│   │   └── Team.js            # Mongoose Team schema
│   ├── services/
│   │   ├── githubService.js   # GitHub API integration
│   │   └── emailService.js    # Email notification service
│   ├── templates/
│   │   ├── README.md.template # Template for team repositories
│   │   └── GUIDELINES.md      # Hackathon guidelines template
│   ├── .env                   # Environment variables
│   ├── Dockerfile             # Docker container configuration
│   └── package.json           # Backend dependencies
│
├── hackathon-frontend/         # Static frontend application
│   ├── index.html             # Registration page
│   ├── dashboard.html         # Admin dashboard
│   ├── register.js            # Registration form logic
│   ├── dashboard.js           # Dashboard functionality
│   ├── styles.css             # UI styling
│   └── dashboard.css          # Dashboard styling
│
├── docker-compose.yml         # Multi-container orchestration
├── package.json               # Root dependencies
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Docker** and **Docker Compose** (for containerized deployment)
- **MongoDB** (local or Atlas connection string)
- **Redis** (local or cloud instance)
- **GitHub Account** with organization access
- **GitHub Personal Access Token** (with repo and admin:org_hook permissions)
- **Gmail Account** with App Password (for email notifications)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yogesh-naik2003/HackathonGitworkflow.git
   cd HackathonGitworkflow
   ```

2. **Install Root Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd hackathon-backend
   npm install
   cd ..
   ```

### Configuration

#### 1. Create Environment Files

Create a `.env` file in the `hackathon-backend/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGO_URI=mongodb://mongo:27017/hackathon
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/hackathon

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
# For cloud Redis (optional):
# REDIS_URL=redis://user:password@host:port

# GitHub Configuration
GITHUB_TOKEN=ghp_your_personal_access_token_here
ORG_NAME=your-github-organization

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
# For production: FRONTEND_URL=https://your-domain.com

# Hackathon Settings
HACKATHON_DEADLINE=2026-04-02T09:00:00
```

#### 2. GitHub Setup

1. Create a GitHub Organization or use an existing one
2. Generate a Personal Access Token:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Select "Tokens (classic)" or "Fine-grained tokens"
   - Grant permissions: `repo`, `admin:org_hook`, `user:email`
3. Add the token to your `.env` file as `GITHUB_TOKEN`

#### 3. Email Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select Mail and your device
   - Copy the generated password
3. Add credentials to `.env`: `EMAIL_USER` and `EMAIL_PASS`

#### 4. MongoDB Setup

- **Local**: Ensure MongoDB is running (`mongod`)
- **Atlas**: Get your connection string and update `MONGO_URI` in `.env`

#### 5. Redis Setup

- **Local**: Ensure Redis is running (`redis-server`)
- **Cloud**: Use services like Redis Cloud and update `.env`

### Running the Application

#### Option 1: Local Development (Without Docker)

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Start Redis**
   ```bash
   redis-server
   ```

3. **Start Backend Server** (in new terminal)
   ```bash
   cd hackathon-backend
   node server.js
   ```

4. **Start Worker** (in another new terminal)
   ```bash
   cd hackathon-backend
   node worker.js
   ```

5. **Serve Frontend** (in another new terminal)
   ```bash
   # Use any static server, e.g., Live Server in VS Code
   # Or use Python:
   python -m http.server 3000 --directory hackathon-frontend
   ```

6. **Access the Application**
   - Registration: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

#### Option 2: Docker Compose Deployment (Recommended)

1. **Build and Start Services**
   ```bash
   docker-compose up --build
   ```

2. **Verify Services**
   ```bash
   docker-compose ps
   ```

   All containers should show as "healthy" or "running"

3. **Access the Application**
   - Backend API: `http://localhost:5000`
   - Health Check: `http://localhost:5000/health`

4. **View Logs**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f worker
   docker-compose logs -f mongo
   docker-compose logs -f redis
   ```

5. **Stop Services**
   ```bash
   docker-compose down
   ```

   To also remove volumes:
   ```bash
   docker-compose down -v
   ```

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Static)                  │
│              Registration & Dashboard Pages             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
                       ↓
┌─────────────────────────────────────────────────────────┐
│                   Express Backend API                   │
│  ┌────────────────────────────────────────────────┐    │
│  │ Routes:                                        │    │
│  │  POST /create-repo      - Register team        │    │
│  │  GET  /teams            - Fetch all teams      │    │
│  │  PATCH /teams/:id       - Update team status   │    │
│  │  GET  /health           - Health check         │    │
│  └────────────────────────────────────────────────┘    │
└──────────┬─────────────┬──────────────┬────────────────┘
           │             │              │
           ↓             ↓              ↓
    ┌───────────┐ ┌──────────┐  ┌────────────────┐
    │ MongoDB   │ │  Redis   │  │ GitHub API     │
    │  (Data)   │ │  (Queue) │  │  (Repos)       │
    └─────────┬─┘ └────┬─────┘  └────┬───────────┘
              │        │             │
              └────────┼─────────────┘
                       │
                       ↓
            ┌──────────────────────┐
            │   BullMQ Worker      │
            │  (Background Jobs)   │
            │ - Create repos       │
            │ - Add collaborators  │
            │ - Send emails        │
            └──────────────────────┘
```

### Data Flow

1. **Registration Phase**
   - User submits team registration form
   - Frontend validates input and sends POST request to `/create-repo`
   - Backend validates team data and saves to MongoDB

2. **Queue Phase**
   - Backend enqueues a job in BullMQ (Redis-backed)
   - Job ID returned to frontend
   - User receives success/error notification

3. **Processing Phase**
   - Worker picks up job from queue
   - Creates GitHub repository
   - Adds team members as collaborators
   - Uploads README and guidelines
   - Sends confirmation email

4. **Dashboard Phase**
   - Admin accesses dashboard
   - Frontend fetches teams via `/teams` endpoint
   - Real-time status display
   - Admin can eliminate/restore teams

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000
```

### Endpoints

#### 1. Create Repository (Register Team)
```http
POST /create-repo
Content-Type: application/json

{
  "teamName": "Team Phoenix",
  "members": ["user1", "user2", "user3"],
  "domain": "Web Development",
  "email": "team@example.com"
}
```

**Response (Success - 201)**
```json
{
  "success": true,
  "message": "Team registered. Repository creation in progress.",
  "teamId": "507f1f77bcf86cd799439011",
  "repoUrl": "https://github.com/org/team-phoenix-1234567890"
}
```

**Response (Error - 400/500)**
```json
{
  "error": "Team name must be unique",
  "message": "A team with this name already exists"
}
```

#### 2. Get All Teams
```http
GET /teams
```

**Response (Success - 200)**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "teamName": "Team Phoenix",
    "members": ["user1", "user2"],
    "domain": "Web Development",
    "email": "team@example.com",
    "repoUrl": "https://github.com/org/team-phoenix-1234567890",
    "score": 85,
    "status": "Active",
    "currentRound": 2,
    "eliminatedInRound": null,
    "createdAt": "2026-04-15T10:30:00Z"
  }
]
```

#### 3. Update Team Status
```http
PATCH /teams/:id
Content-Type: application/json

{
  "status": "Eliminated",
  "score": 95
}
```

**Response (Success - 200)**
```json
{
  "success": true,
  "message": "Team updated successfully",
  "team": { /* updated team object */ }
}
```

#### 4. Health Check
```http
GET /health
```

**Response (Success - 200)**
```
OK
```

**Response (Error - 500)**
```
Database not connected
```

---

## 🎨 Frontend

### Pages

#### 1. Registration Page (`index.html`)
- Team registration form with fields:
  - Team Name
  - Member Names (4 slots)
  - Domain (dropdown)
  - Email
- Form validation
- Loading state during submission
- Success/error modal with repository link

#### 2. Dashboard Page (`dashboard.html`)
- **Team Table** displaying:
  - Team Name
  - Members
  - Domain
  - Email
  - Repository Link
  - Score
  - Status (Active/Eliminated/Winner)
- **Search & Filter** functionality
- **Status Filter** (Active, Eliminated, Winner)
- **Action Buttons**:
  - View Repository
  - Eliminate/Restore Team
  - Update Score
- **Statistics** section

### Styling
- Responsive design (mobile, tablet, desktop)
- Modern UI with smooth animations
- Color-coded status indicators
- Professional typography

---

## 🔄 Workflow

### Team Registration Workflow

```mermaid
graph TD
    A[User Submits Form] --> B[Frontend Validation]
    B --> C{Valid?}
    C -->|No| D[Show Error Message]
    D --> A
    C -->|Yes| E[Send POST to Backend]
    E --> F{Team Exists?}
    F -->|Yes| D
    F -->|No| G[Save Team to MongoDB]
    G --> H[Enqueue Job in Redis]
    H --> I[Return Success to Frontend]
    I --> J[Show Success Modal]
    J --> K[Worker Processes Job]
    K --> L[Create GitHub Repo]
    L --> M[Add Collaborators]
    M --> N[Upload Templates]
    N --> O[Send Email]
    O --> P[Job Complete]
```

### Job Processing Workflow

```mermaid
graph TD
    A[Job Dequeued] --> B[Fetch Team from DB]
    B --> C{Team Found?}
    C -->|No| D[Job Failed]
    C -->|Yes| E[Create GitHub Repo]
    E -->|Error| F[Retry/Fail Job]
    E -->|Success| G[Generate Unique Repo Name]
    G --> H[Create README]
    H --> I[Add Team Members]
    I --> J[Upload Guidelines]
    J --> K[Send Confirmation Email]
    K --> L[Update Team repoUrl]
    L --> M[Job Success]
```

---

## 🔐 Environment Variables

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` \| `production` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/hackathon` |
| `REDIS_HOST` | Redis hostname | `localhost` \| `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_URL` | Redis connection URL (overrides host/port) | `redis://user:pass@host:port` |
| `GITHUB_TOKEN` | GitHub Personal Access Token | `ghp_xxxxx` |
| `ORG_NAME` | GitHub Organization name | `my-org` |
| `EMAIL_USER` | Gmail email address | `email@gmail.com` |
| `EMAIL_PASS` | Gmail App Password | `xxxx xxxx xxxx xxxx` |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` |
| `HACKATHON_DEADLINE` | Registration deadline | `2026-04-02T09:00:00` |

---

## 🐳 Docker Setup

### Docker Compose Services

#### Redis Service
- **Image**: `redis:7-alpine`
- **Port**: `6379:6379`
- **Persistence**: Enabled (AOF)
- **Health Check**: Redis PING

#### MongoDB Service
- **Image**: `mongo:latest`
- **Port**: `27017:27017`
- **Persistence**: Volume mount `/data/db`
- **Health Check**: MongoDB admin ping

#### Backend Service
- **Build**: From `hackathon-backend/Dockerfile`
- **Port**: `5000:5000`
- **Command**: `node server.js`
- **Dependencies**: Redis, MongoDB
- **Health Check**: HTTP GET `/health`

#### Worker Service
- **Build**: From `hackathon-backend/Dockerfile`
- **Command**: `node worker.js`
- **Dependencies**: Redis, Backend, MongoDB
- **Health Check**: Node healthcheck script
- **Note**: No exposed ports (internal only)

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Build and Deploy

```bash
# Build images
docker-compose build

# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose stop

# Remove services and volumes
docker-compose down -v
```

---

## 🛠️ Development Guide

### Adding a New Route

1. In `hackathon-backend/server.js`:
```javascript
app.post("/new-endpoint", async (req, res) => {
  try {
    // Your logic here
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Adding a New Database Field

1. Update `hackathon-backend/models/Team.js`:
```javascript
const teamSchema = new mongoose.Schema({
  // ... existing fields
  newField: {
    type: String,
    required: false
  }
});
```

2. Update frontend to include the new field in forms/displays

### Running Tests (Future)

```bash
cd hackathon-backend
npm test
```

---

## 📋 Deployment Checklist

- [ ] All environment variables configured
- [ ] MongoDB credentials verified
- [ ] Redis connection tested
- [ ] GitHub token has proper permissions
- [ ] Email credentials configured and tested
- [ ] Frontend URL updated for production
- [ ] CORS origins properly configured
- [ ] Docker images built successfully
- [ ] All health checks passing
- [ ] Logs monitored for errors
- [ ] Backups configured for MongoDB
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting configured
- [ ] Error logging/monitoring set up

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Follow ES6+ standards
- Test before submitting PR

---

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 📞 Support & Contact

For questions, issues, or suggestions:
- **GitHub Issues**: [Create an issue](https://github.com/yogesh-naik2003/HackathonGitworkflow/issues)
- **Email**: Contact through repository

---

## 🙏 Acknowledgments

- Built for **Advaya Hackathon 2.0** at BGS College of Engineering and Technology
- Inspired by the need for streamlined hackathon management
- Thanks to the open-source community for amazing libraries

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Docker Documentation](https://docs.docker.com/)

---

**Last Updated**: April 2026  
**Version**: 1.0.0  
**Status**: Active Development
