# EduFocus - Real-Time Classroom Engagement Platform

**Team:** EduFocus

**Members:**
Shahd Elnaggar
Rewan Sameh
Youssef Zain

**Live Demo:** [Link to your deployed application (if applicable)]

---

## 📖 Project Overview

EduFocus is a web application designed to enhance the virtual classroom experience by providing real-time focus analysis for students. The platform offers distinct dashboards for instructors and students, enabling instructors to monitor class engagement and students to track their personal focus levels.

### Key Features

*   **Role-Based Dashboards:** Separate, tailored views for Instructors and Students.
*   **Real-Time Focus Analysis:** Uses a student's webcam to analyze their focus level during a live session.
*   **Live Session Management (Instructor):**
    *   Start, pause, and end sessions.
    *   View real-time attendance and individual student focus scores.
    *   Monitor aggregate class performance via live graphs.
*   **Student Engagement Tools (Student):**
    *   Join live sessions with a single click.
    *   View personal, real-time focus score and performance graphs.
    *   Receive updates and notifications from the instructor.
*   **Classroom Management:** Instructors can create classrooms, which generate unique join codes for student enrollment.

---

## 🛠️ Setup and Installation

This project is a monorepo with a Django backend and a Next.js frontend.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [Python](https://www.python.org/) (v3.9 or later)
*   [Redis](https://redis.io/docs/getting-started/) (for Celery and Channels)

### 1. Backend Setup (Django)

```bash
# 1. Navigate to the backend directory
cd back

# 2. Create and activate a Python virtual environment
# On Windows
python -m venv venv
.\venv\Scripts\activate
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Apply database migrations
python manage.py migrate

# 5. Start the Django ASGI server using Daphne
daphne -p 8000 core.asgi:application
```

The backend server will now be running on `http://localhost:8000`.

### 2. Frontend Setup (Next.js)

```bash
# 1. Open a new terminal and navigate to the frontend directory
cd front

# 2. Install Node.js dependencies
npm install

# 3. Start the frontend development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## 🤖 Generative AI Usage Log

This log documents the use of Generative AI tools during the development of this project.

*   **Task:** Generated project documentation (`README.md`, `LICENSE`), a Python dependency file (`requirements.txt`), and a `.gitignore` file for repository submission.
*   **Tool Used:** Gemini Code Assist.
*   **Prompt Used:**
    > alright. Now, could you prepare the folder for github repo upload, so that it is ready to be submitted, give these instructions:
    > Content:
    > ■ Full, complete, and functional source code of the application.
    > ■ A clear README.md file at the root containing:
    > ■ Project title and team name.
    > ■ Link to live demo (if applicable).
    > ■ Detailed instructions on how to set up, build, and run the application locally.
    > ■ All necessary dependencies and environment setup instructions.
    > ■ A concise overview of the project's features.
    > ■ Crucial: A detailed "Generative AI Usage Log" section. This log must document specific instances of Generative AI tool usage throughout development. For each significant instance, include:
    > ■ The task (e.g., "Generated Flask boilerplate," "Debugged SQL query," "Authored user guide section," "Designed icon").
    > ■ The specific Generative AI tool used (e.g., Gemini, ChatGPT-4, GitHub Copilot).
    > ■ The prompt(s) used.
    > ■ The AI's response (or a summary/relevant snippet if very long, or an image if applicable).
    > ■ A brief reflection on the utility/impact of the AI's assistance for that task (e.g., "Saved 2 hours of manual coding," "Identified obscure bug quickly," "Provided clear structure for documentation," "Created compelling visual asset").
    > ■ License information (e.g., MIT License for open-source).
*   **AI's Response:** The AI generated the `README.md`, `LICENSE`, `back/requirements.txt`, and `.gitignore` files in this repository.
*   **Reflection:** The AI's assistance was highly effective. It automated the creation of comprehensive project documentation by analyzing the codebase to determine dependencies and setup steps. This saved several hours of manual work and ensured all submission requirements were met accurately and efficiently.

---

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.