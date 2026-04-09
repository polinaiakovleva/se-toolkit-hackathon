# ContextTask AI

**An intelligent task management system that transforms natural language into structured tasks using LLM.**

## Demo

![Task List View](docs/screenshots/tasks.png)
*Main dashboard showing tasks organized by deadlines*

![Smart Input](docs/screenshots/smart-input.png)
*Natural language input parsing multiple tasks*

![Calendar View](docs/screenshots/calendar.png)
*Calendar showing tasks by date*

![Today's Tasks](docs/screenshots/today-tasks.png)
*Daily task overview with checkboxes*

## Product Context

### End Users
- Students managing assignments and deadlines
- Professionals organizing daily work tasks
- Anyone who wants to manage tasks using natural language instead of complex forms

### Problem
Traditional task managers require users to fill out multiple fields (title, description, deadline, priority, tags) manually. This is:
- Time-consuming for quick task entry
- Requires cognitive overhead to structure thoughts
- Discourages capturing fleeting thoughts and ideas

### Solution
ContextTask AI allows users to input tasks naturally:
- "Submit C++ lab tomorrow by 10am #university"
- "Buy groceries Saturday at 5pm"
- "Call mom and submit report by Friday"

The LLM automatically extracts:
- Task title
- Deadline (with relative date support: tomorrow, next Monday, in 2 weeks)
- Priority level
- Tags/categories

### Key Features

**Implemented:**
- Natural language task parsing with LLM (Ollama)
- Automatic date extraction (relative and absolute dates)
- Multi-language support (English, Russian)
- Smart task creation from text input
- Calendar view for tasks with deadlines
- Ideas section for tasks without deadlines
- Task filtering by status, priority, and tags
- Task editing and deletion
- Voice input support (Web Speech API)
- Dark/light theme
- Browser notifications for deadlines
- Today's tasks overview with completion tracking

**Not Yet Implemented:**
- Task sharing and team collaboration
- Push notifications (mobile)
- Recurring tasks
- Task attachments

## Usage

### Creating Tasks
1. Type your task in natural language:
   - "Submit report by Friday at 3pm #work"
   - "Купить продукты завтра в 5 вечера"
   - "Call mom tomorrow and submit report by Friday"
2. Click "Preview Tasks" to see parsed tasks
3. Edit if needed
4. Click "Create Task"

### Managing Tasks
- Click on a task to edit it
- Use checkboxes in "Today's Tasks" to mark completion
- Filter tasks by status, priority, or tags
- View tasks by date in the calendar

### Ideas
- Toggle "Add as Idea" for tasks without deadlines
- Ideas appear in the left sidebar

## Deployment

### Operating System
Ubuntu 24.04 LTS

### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download LLM model
ollama pull llama3.2
```

### Step-by-Step Deployment

1. **Clone the repository**
   ```bash
   git clone https://github.com/polinaiakovleva/se-toolkit-hackathon.git
   cd se-toolkit-hackathon
   ```

2. **Configure environment**
   ```bash
   # Copy environment template
   cp backend/.env.example backend/.env
   
   # Edit if needed (for production, update DATABASE_URL)
   nano backend/.env
   ```

3. **Start with Docker Compose**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Check status
   docker-compose ps
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

5. **For production deployment**
   ```bash
   # Build for production
   cd frontend
   npm install
   npm run build
   
   # Serve with nginx or similar
   # Update vite.config.ts for production API URL
   ```

### Manual Deployment (without Docker)

1. **Backend**
   ```bash
   cd backend
   
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Create database
   sudo -u postgres createdb contexttask
   
   # Run
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Frontend**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Development
   npm run dev
   
   # Production build
   npm run build
   ```

3. **Ollama**
   ```bash
   # Start Ollama service
   ollama serve
   
   # In another terminal, pull model
   ollama pull llama3.2
   ```

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Alembic
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Database**: PostgreSQL
- **AI/ML**: Ollama (llama3.2)
- **Containerization**: Docker, Docker Compose

## License

MIT License - see [LICENSE](LICENSE) file for details.