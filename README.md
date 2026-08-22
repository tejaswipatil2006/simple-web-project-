# Smart Notes AI Assistant 📝✨

A beginner-friendly, production-ready full-stack web application built with **Python Flask**, **Firebase Authentication**, **Firebase Firestore Database**, and the **Google Gemini API**, styled with **Bootstrap 5**.

---

## 📖 Table of Contents

- [1. Description](#1-description)
- [2. Features](#2-features)
- [3. Technologies Used](#3-technologies-used)
- [4. Project Structure](#4-project-structure)
- [5. Firebase Setup Guide](#5-firebase-setup-guide)
- [6. Gemini API Setup Guide](#6-gemini-api-setup-guide)
- [7. Local Setup & Execution](#7-local-setup--execution)
- [8. Running the Application](#8-running-the-application)
- [9. Safe GitHub Repository Upload](#9-safe-github-repository-upload)
- [10. Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. Description

**Smart Notes AI Assistant** allows users to securely register, log in, and manage their personal notes in real time using Google Cloud Firestore. Each note can be summarized into key takeaways or rewritten/polished for clarity and tone with a single click using the **Google Gemini AI API** (`gemini-2.5-flash`).

---

## 2. Features

- 🔐 **Firebase Authentication**: Email and password registration and login with protected server sessions.
- 🗄️ **Firebase Firestore Database**: Full CRUD (Create, Read, Update, Delete) operations with user-isolated data storage.
- 🤖 **Gemini AI Note Summarizer**: Automatically extracts executive summaries and actionable bullet points from notes.
- ✍️ **Gemini AI Note Improver**: Enhances grammar, vocabulary, clarity, and formatting with one-click direct application to notes.
- 🔍 **Live Search & Filter**: Real-time note filtering by title or content.
- 📱 **Clean Bootstrap 5 UI**: Fully responsive cards, modals, alerts, badges, and navigation for mobile and desktop.
- 🛡️ **Secure Backend**: Never exposes secret API keys or private Firebase service account credentials to the client browser.

---

## 3. Technologies Used

| Technology | Purpose |
| :--- | :--- |
| **Python 3.10+ / Flask** | Backend web server, API routing, and session management |
| **Firebase Auth** | Client-side and server-side token authentication |
| **Firebase Admin SDK** | Secure backend communication with Firebase Firestore and Auth |
| **Google Cloud Firestore** | NoSQL document database for persisting notes |
| **Google GenAI SDK (`google-genai`)** | Official Python SDK connecting to Google Gemini AI models |
| **Bootstrap 5 & Icons** | Responsive UI components, typography, cards, and modals |
| **python-dotenv** | Secure local environment variable management |

---

## 4. Project Structure

```text
project/
│
├── app.py                                   # Main Flask backend application & API routes
├── requirements.txt                         # Python dependencies
├── README.md                                # Complete project documentation & guide
├── .env.example                             # Template for environment variables
├── .gitignore                               # Protects secrets & virtual environment
│
├── templates/                               # Flask Jinja2 HTML templates
│   ├── index.html                           # Landing page
│   ├── login.html                           # Login page
│   ├── register.html                        # Registration page
│   └── dashboard.html                       # Protected notes dashboard & AI modal
│
├── static/
│   └── js/
│       └── app.js                           # Frontend JavaScript (Firebase SDK + CRUD + AI)
│
└── firebase/
    └── serviceAccountKey.json.example       # Example service account structure
```

---

## 5. Firebase Setup Guide

Follow these steps to create and configure your Firebase project:

### Step 1: Open the Firebase Console
1. Navigate to [https://console.firebase.google.com/](https://console.firebase.google.com/).
2. Sign in with your Google account and click **"Add project"**.
3. Enter a project name (e.g., `smart-notes-ai`) and click **Continue**.

### Step 2: Enable Firebase Authentication
1. In the left navigation menu, go to **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable the first toggle (**Email/Password**) and click **Save**.

### Step 3: Enable Cloud Firestore Database
1. In the left navigation menu, go to **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose a location close to you (e.g., `nam5 (us-central)` or `asia-south1`).
4. Select **Start in test mode** for development (or configure rules as needed) and click **Create**.

### Step 4: Register a Web App & Get Web Config
1. In the Firebase Console, click the **Gear Icon ⚙️** (Project Settings) in the left sidebar.
2. Under the **General** tab, scroll down to **"Your apps"** and click the **Web icon `</>`**.
3. Register your app with a nickname (e.g., `Smart Notes Web`).
4. Copy the `firebaseConfig` object and paste it into `static/js/app.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyYourActualApiKeyHere...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

### Step 5: Download Firebase Admin Service Account Key
1. In Firebase Console, go to **Project Settings ⚙️** > **Service accounts** tab.
2. Select **Python** and click **"Generate new private key"**.
3. A JSON file will be downloaded to your computer.
4. Rename this file to `serviceAccountKey.json` and place it inside the `firebase/` directory:
   ```text
   firebase/serviceAccountKey.json
   ```

*(Note: `firebase/serviceAccountKey.json` is ignored by `.gitignore` so your private key stays safe).*

---

## 6. Gemini API Setup Guide

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **"Get API key"** in the top left.
4. Click **"Create API key"** and choose your Google Cloud project.
5. Copy your generated API key.
6. Create a `.env` file in the root directory and paste your key:
   ```env
   GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere...
   ```

---

## 7. Local Setup & Execution

### Windows (Command Prompt / PowerShell)

1. Open your terminal in the project directory:
   ```cmd
   cd smart-notes-ai
   ```

2. Create a Python virtual environment:
   ```cmd
   python -m venv venv
   ```

3. Activate the virtual environment:
   ```cmd
   venv\Scripts\activate
   ```

4. Install the required dependencies:
   ```cmd
   pip install -r requirements.txt
   ```

5. Create your `.env` file from `.env.example`:
   ```cmd
   copy .env.example .env
   ```
   *Edit `.env` and fill in your `GEMINI_API_KEY`.*

6. Ensure `firebase/serviceAccountKey.json` is in place.

---

### macOS / Linux

1. Create and activate virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy environment template:
   ```bash
   cp .env.example .env
   ```

---

## 8. Running the Application

Start the Flask development server:

```bash
python app.py
```

You should see output similar to:

```text
 * Serving Flask app 'app'
 * Debug mode: on
[INFO] Firebase Admin SDK initialized successfully.
[INFO] Google GenAI client initialized successfully.
=======================================================
🚀 Smart Notes AI Assistant is running on http://127.0.0.1:5000
=======================================================
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 9. Safe GitHub Repository Upload

Follow these commands to push your project to GitHub without leaking secrets:

```bash
# 1. Initialize git repository
git init

# 2. Check git status to ensure .env and serviceAccountKey.json are ignored
git status

# 3. Stage all files
git add .

# 4. Commit changes
git commit -m "Initial commit - Smart Notes AI Assistant"

# 5. Set main branch
git branch -M main

# 6. Add your remote GitHub repository URL
git remote add origin https://github.com/your-username/smart-notes-ai.git

# 7. Push to GitHub
git push -u origin main
```

⚠️ **SECURITY WARNING**: Never push `.env` or `firebase/serviceAccountKey.json` to GitHub. The included `.gitignore` protects these automatically.

---

## 10. Troubleshooting & FAQ

### 1. `ModuleNotFoundError: No module named 'flask'` or `'google.genai'`
- Ensure your virtual environment is activated (`venv\Scripts\activate` on Windows or `source venv/bin/activate` on macOS/Linux).
- Run `pip install -r requirements.txt`.

### 2. `Firebase Admin service account file not found`
- Verify that your downloaded JSON file is placed at `firebase/serviceAccountKey.json`.
- Check file permissions or verify the path defined in `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`.

### 3. `auth/invalid-api-key` or Firebase Web Login Errors
- Ensure you copied the exact web configuration from your Firebase Console into `static/js/app.js` under `firebaseConfig`.
- Verify that **Email/Password** sign-in provider is enabled under Firebase Authentication in Firebase Console.

### 4. `Gemini API error` or `API key not valid`
- Ensure your `GEMINI_API_KEY` in `.env` is correct without extra quotes or spaces.
- Test your key directly at [Google AI Studio](https://aistudio.google.com/).

### 5. `Address already in use` (Port 5000)
- Another application is using port 5000. You can run on a different port by setting the `PORT` variable or running:
  ```bash
  python -c "import os; from app import app; app.run(port=5001)"
  ```

---

## 📄 License
This project is open-source and free to use for personal, educational, and commercial purposes.
