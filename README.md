# EduFocus - Real-Time Classroom Engagement Platform

**Team:** EduFocus

**Members:**
- Shahd Elnaggar
- Rewan Sameh
- Youssef Zain

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
cd back/core

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

Or run the following in separate terminals:
celery -A core worker --pool=solo --concurrency=2 --loglevel=info
python manage.py runserver
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

*   **Task:** Generated the initial UI structure and component boilerplate for the Next.js frontend based on a detailed user journey.
*   **Tool Used:** Vercel v0
*   **Prompt Used:**
    > I want to buid the UI needed for my Django backend, you have the user journey I have in mind. Use Next.js, chat cm, and tailwing css for the UI.
    > Login/Register
    >
    > Login:
    > Ask for the Email, Password
    >
    > Register:
    > Ask for Full Name, Email, Role, Password and Confirm Password
    >
    > Both should redirect to the dashboard (based on Role)
    >
    > Dashboards
    >
    > For the Instructor:
    >
    > the dahsboard contains the classes he created ( showing the class name, students enrolled number, and number of sessions made for it, and the join code, and when clicking it should redirects him to the class view), Last session's stats ( attendance number, duration, avg performance stats and graph ), Reports Section showing the reports of the sessions he made for each class in form of hyperlinks redirecting to the Session Report page (each should contain the stats of the session like duration, student attendance number and list, which shows each one's average focus performance, and a graph showing the whole class's average focus performance vs time of the session, surely the report should be titled by the class name and session number). Additionally, there should be a side section for starting a new session, so that the instructor selects which class to start the session on and redirects him to the live session page.
    >
    > For the Student:
    >
    > the dashboard contains a Live Updates Section where it shows the live sessions made by any instructor of any class he is enrolled in so that he can join it (redirecting him to the live session page and triggering the camera capturing and analysis start), the classes the student enrolled in (showing the class name, description, instructor Name, number of sessions made for it, and when clicking it should redrects him to the class view), Last session's stats (duration, avg focus performance, and focus vs time of session graph), Reports section showing the reports of the sessions he had (either he attended completely, left, or didn't join at all) for each class in form of hyperlinks, redirecting to the Session Report page (each should contain the stats of the session like duration, and the student's personal stats, like attendance duration and attendance percentage of the session, focus performance vs time of session, Final average performance compared with the previous session's of the same class).
    >
    > Now the dashboards could redirect to either class view, or Session Report, or live session pages. Each of those have specific features, functionalities, and elements that is different based on User's role.
    >
    > Class view page
    >
    > for instructors:
    >
    > the class view should show the class info, like name, description, Join code, number of students enrolled in the class, and number of sessions made for this class. Then, it shows the list of the Students enrolled info (Name, Email, and last session's avg performance). Then, a section for the last session's performance, showing session's duration, an average class's performance vs time of the session, final attendance (directly before ending session ) vs enrollment number. then, the last section should be for the Reports of the sessions made for this classroom (with the same idea of that of the dashboard, but you can say it is filtered to that specific class only)
    >
    > for student:
    > the class view should show the class info, like name, description, Join code, instructor name, and number of sessions made for this class. Then, it shows student's specific stats like total attendance number, and the last session's performnace, like the Final average performance compared with the previous session's of the same class, duration attended, focus vs time of session graph. then, the last section should be for his Reports of the sessions made for this classroom (with the same idea of that of the dashboard, but you can say it is filtered to that specific class only)
    >
    > Live Session Page
    >
    > this page should be redirected to when a teacher starts a session for a class from the dashboard (for the instructor role), and when the student joins the session from the live updates section in the dashboard (for the student role). as functionality, starting session triggers sending the updates to the enrolled students in the class which the session is for and joining it triggers the camera capturing and focus analysis running for the student user.
    >
    > for the instrucor
    >
    > it should show a duration timer for the session, attendance number updated in real-time when students join or leave, list of the enrolled students in the class, each with the real-time update of the attendance status and focus performance, and a graph showing the average focus performance of the class vs time of the session (updated in real-time every minute). Lastly, a button for ending the session, which should triggers the ending of the session and session report generation for both the instructor, and the students, and after loading the necessary info for the page, it should redirects them to the session's report page.
    >
    > for the student
    >
    > it should show a duration timer for the session, and the real-time updated focus performance analysis, and a graph showing the performance vs time of the session, with a button for leaving that redirects to the dashboard and basically updates the attendance status and stops the camera capturing and analysis logic. When the instructor ends the session, it should send a notification to him, while reloading tthe necessary info for the session report before redirecting him to the session's report page. for the condition that the student left the session before it ended by the instructor, the session's info is built as well for the report updating the necessary sections in his dashboard (last session's stats and Reports Sections) without the need to notify him.
    >
    > Note that:
    > - the redirecting from the live session when ended (in both roles) is to the Session Report Page (while the returning back of the report page is to the dashboard naturally)
    > - the redirecting from the live session when leaving (for the student) is to the dashboard (while returning back from the dashboard is to the dashboard again if you say so)
*   **AI's Response:** The AI generated the initial JSX/TSX and CSS boilerplate for the main pages and components, including dashboards, session views, and login/register forms. This created the basic structure for the `front/` directory.
    
    *Example snippet from `front/app/session/[id]/page.tsx`:*
    ```tsx
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="h-5 w-5 mr-2" />
          Focus Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* ... camera and focus score components ... */}
      </CardContent>
    </Card>
    ```
*   **Reflection:** This was incredibly useful for rapid prototyping. The AI translated a complex, text-based user journey into a tangible set of frontend components and pages, saving a significant amount of initial setup and manual coding. It provided a solid foundation that was then refined and connected to the backend API.

---

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

    *Example snippet from `.gitignore`:*
    ```
    # Environment
    .env
    venv/

    # Database
    db.sqlite3
    ```
*   **Reflection:** The AI's assistance was highly effective. It automated the creation of comprehensive project documentation by analyzing the codebase to determine dependencies and setup steps. This saved several hours of manual work and ensured all submission requirements were met accurately and efficiently.

---

*   **Task:** Generated unit and integration tests for the Django backend applications.
*   **Tool Used:** Cursor AI Editor
*   **Prompt Used (Reconstructed):**
    > I need to write tests for my Django REST Framework application. For each of the following apps: `users`, `classrooms`, `session`, and `performance`, please generate a `tests.py` file.
    >
    > The tests should cover:
    > 1.  **Model Tests:** Ensure that model instances can be created with valid data and that any custom methods or properties work as expected.
    > 2.  **API Endpoint Tests (ViewSets):**
    >     *   Test that unauthenticated users are denied access.
    >     *   Test that authenticated users (with appropriate roles like 'instructor' or 'student') can perform relevant actions (e.g., list, create, retrieve).
    >     *   Test permission logic, such as ensuring only an instructor can create a classroom or start a session.
    >     *   Test for correct HTTP status codes (200, 201, 403, 404).
    > 3.  **Serializer Tests:** Test data validation and correct object serialization.
    >
    > Use Django's `rest_framework.test.APITestCase` for the test structure.
*   **AI's Response:** The AI generated `tests.py` files for the specified Django apps. The files included test cases for model creation, API endpoint access control, and basic business logic, providing a foundational test suite for the backend.

    *Example snippet from `back/core/integration_e2e_tests.py`:*
    ```python
    class EndToEndWorkflowTest(TransactionTestCase):
        # ... setup ...

        async def test_full_classroom_workflow(self, mock_student_chart, mock_instructor_chart):
            # 1. Instructor creates a classroom
            self.client.force_authenticate(user=self.instructor)
            response = self.client.post('/api/classrooms/', {'name': 'E2E Test Class'})
            # ... more test steps ...
    ```
*   **Reflection:** This significantly accelerated the test-writing process by providing a comprehensive baseline of tests that could be reviewed and customized. It ensured foundational test coverage for critical paths, models, and API endpoints from the start, improving code quality and reliability.

---

*   **Task:** Developed the core backend logic, including database schema, models, API serializers, views, and URL routing.
*   **Tools Used:** Perplexity AI, DeepSeek, ChatGPT, GitHub Copilot
*   **Prompts Used (Reconstructed as a multi-stage process):**
    > **1. High-Level Design (with Perplexity AI):**
    > "I'm building a real-time classroom engagement platform with Django REST Framework. The main entities are Users (Instructors, Students), Classrooms, live Sessions, and Performance tracking. Can you help me outline the database schema, the required Django apps, and the relationships between the models?"
    >
    > **2. Model Implementation (with DeepSeek):**
    > "Based on the following schema [schema description from step 1], generate the Django `models.py` for the `users`, `classrooms`, `session`, and `performance` apps. The User model should extend `AbstractUser` and include a 'role' field. Classrooms should have a foreign key to the instructor. Sessions should link to a classroom. Performance should link a student to a session and store their focus score."
    >
    > **3. API Logic Implementation (with ChatGPT):**
    > "For each of the models, create the corresponding `serializers.py` and `views.py`. Use `ModelSerializer` for serializers and `ModelViewSet` for views. Implement permission logic: only instructors can create classrooms or start sessions. Students should only see classrooms they are enrolled in. Create custom actions for 'join', 'leave', and 'end' in the Session viewset."
    >
    > **4. URL Routing (with Copilot):**
    > "Finally, structure the `urls.py` for the project. I need a root URL router that includes nested routers for classrooms and their sessions (e.g., `/api/classrooms/<classroom_pk>/sessions/`). Also, include the JWT token endpoints for authentication."
*   **AI's Response:** The AI tools collectively produced the foundational backend code. Perplexity AI provided the architectural blueprint. DeepSeek generated the `models.py` files. ChatGPT created the `serializers.py` and `views.py` with the core API logic. Copilot assisted in wiring everything together with the correct URL patterns.

    *1. Model Generation (DeepSeek) - `back/core/classrooms/models.py`:*
    ```python
    class Classroom(models.Model):
        name = models.CharField(max_length=255)
        instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='classrooms')
        join_code = models.CharField(max_length=8, unique=True, blank=True)
        # ...
    ```

    *2. API Logic (ChatGPT) - `back/core/session/serializers.py`:*
    ```python
    class SessionSerializer(serializers.ModelSerializer):
        class Meta:
            model = Session
            fields = ['id', 'classroom', 'start_time', 'end_time', 'is_active']
            read_only_fields = ['start_time', 'end_time', 'is_active']
    ```

    *3. API Logic (ChatGPT) - `back/core/session/views.py`:*
    ```python
    class SessionViewSet(viewsets.ModelViewSet):
        # ... queryset and serializers ...
        @action(detail=True, methods=['post'])
        def end(self, request, pk=None):
            session = self.get_object()
            # ... permission checks and logic ...
            session.end_session()
            # ...
    ```

    *4. URL Routing (Copilot) - `back/core/core/urls.py`:*
    ```python
    from rest_framework_nested import routers
    # ...
    router = routers.DefaultRouter()
    router.register(r'classrooms', ClassroomViewSet)

    classrooms_router = routers.NestedDefaultRouter(router, r'classrooms', lookup='classroom')
    classrooms_router.register(r'sessions', SessionViewSet, basename='classroom-sessions')
    ```
*   **Reflection:** This multi-tool approach was highly efficient. Using different AIs for distinct layers of the application (schema design, model generation, API logic) streamlined the development process. It allowed for rapid scaffolding of the entire backend, with each tool providing a strong starting point for its respective component, which was then refined and integrated manually.

---

*   **Task:** Integrating the Next.js frontend with the Django backend API and debugging related issues.
*   **Tools Used:** DeepSeek, ChatGPT
*   **Prompts Used (Reconstructed):**
    > **1. Initial Integration (with DeepSeek):**
    > "I need to connect my Next.js frontend to the Django REST Framework backend. Can you create an API client module in TypeScript? It should handle JWT authentication by storing tokens in localStorage and attaching the access token to request headers. The client should include functions for user registration, login, and fetching/creating classrooms and sessions."
    >
    > **2. Debugging Example (with ChatGPT/DeepSeek):**
    > "Alright. Now, I have another problem. When I start a new session as an instructor, I get this in the backend terminal:
    > ```
    > Internal Server Error: /api/sessions/
    > Traceback (most recent call last):
    >   ...
    >   File ".../site-packages/django/db/models/query.py", line 663, in create
    >     obj.save(force_insert=True, using=self.db)
    >   ...
    >   File ".../site-packages/django/db/backends/utils.py", line 105, in _execute
    >     return self.cursor.execute(sql, params)
    >   ...
    > django.db.utils.IntegrityError: NOT NULL constraint failed: session_session.report_generated
    > ```
    > Examine the error and its cause, and ask for the needed files to modify it to solve the problem."
*   **AI's Response:**
    *   **For Integration:** The AI provided a TypeScript module (`lib/api.ts`) that encapsulated `fetch` calls to the backend. It included an API client class with methods for login, registration, and other endpoints. It also showed how to create a React Auth Context (`lib/auth.tsx`) to manage user state and tokens across the application.

        *Example snippet from the generated API client:*
        ```typescript
        // lib/api.ts
        async function createSession(classroomId: number): Promise<Session> {
          const res = await fetch(`${API_URL}/classrooms/${classroomId}/sessions/`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ classroom: classroomId }),
          });
          // ... error handling ...
          return res.json();
        }
        ```

    *   **For Debugging:** The AI analyzed the traceback and responded: "The error `IntegrityError: NOT NULL constraint failed: session_session.report_generated` means that when you create a new `Session`, the `report_generated` field is not being given a value, but the database requires one. The traceback shows this happens in `session/views.py` inside the `perform_create` method. To fix this, you need to provide a default value for this field in your model. Please show me your `session/models.py` file." After seeing the model, the AI suggested adding `default=False` to the `report_generated` field.
*   **Reflection:** This iterative process of generating code with one AI and debugging it with another (or the same one in a new context) was crucial for connecting the frontend and backend. The AI was instrumental in quickly scaffolding the API client and then acting as a pair programmer to diagnose runtime errors by interpreting complex tracebacks. This significantly reduced the time spent on troubleshooting integration issues.

---

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
