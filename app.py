import os
import datetime
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash

# Load environment variables from .env file
load_dotenv()

# Initialize Flask application
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "smart_notes_ai_assistant_secret_key_12345")

# Environment configurations
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase/serviceAccountKey.json")

# -----------------------------------------------------------------------------
# 1. Firebase Admin SDK Initialization
# -----------------------------------------------------------------------------
db = None
firebase_initialized = False

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth

    if os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        firebase_initialized = True
        print("[INFO] Firebase Admin SDK initialized successfully.")
    else:
        print(f"[WARNING] Firebase service account file not found at '{FIREBASE_SERVICE_ACCOUNT_PATH}'.")
        print("[WARNING] Please download your serviceAccountKey.json from Firebase Console and place it in the firebase/ directory.")
except Exception as e:
    print(f"[ERROR] Failed to initialize Firebase Admin SDK: {e}")

# -----------------------------------------------------------------------------
# 2. Google Gemini API Initialization
# -----------------------------------------------------------------------------
gemini_client = None

try:
    from google import genai

    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("[INFO] Google GenAI client initialized successfully.")
    else:
        print("[WARNING] GEMINI_API_KEY is not set or using placeholder value.")
        print("[WARNING] Please set your GEMINI_API_KEY in .env file to enable AI features.")
except Exception as e:
    print(f"[ERROR] Failed to initialize Google GenAI client: {e}")

# -----------------------------------------------------------------------------
# Authentication Helper Decorator
# -----------------------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            if request.is_json or request.path.startswith("/api/"):
                return jsonify({"success": False, "error": "Unauthorized. Please log in first."}), 401
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function

# -----------------------------------------------------------------------------
# Web Page Routes
# -----------------------------------------------------------------------------

@app.route("/")
def index():
    """Home landing page with project introduction and auth links."""
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("index.html")


@app.route("/login")
def login():
    """Login page with Firebase Auth email/password."""
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("login.html")


@app.route("/register")
def register():
    """Register page with Firebase Auth email/password."""
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("register.html")


@app.route("/dashboard")
@login_required
def dashboard():
    """Protected Dashboard page for managing notes and AI operations."""
    return render_template(
        "dashboard.html",
        user_email=session.get("user_email", "User"),
        user_id=session.get("user_id", "")
    )


@app.route("/logout")
def logout():
    """Clear Flask session and redirect to login."""
    session.clear()
    flash("You have been successfully logged out.", "info")
    return redirect(url_for("login"))


# -----------------------------------------------------------------------------
# API: Authentication & Session Verification
# -----------------------------------------------------------------------------

@app.route("/api/session-login", methods=["POST"])
def session_login():
    """
    Receives the Firebase ID token from client-side Firebase Auth,
    verifies it using the Firebase Admin SDK, and establishes a secure Flask session.
    """
    data = request.get_json() or {}
    id_token = data.get("idToken")

    if not id_token:
        return jsonify({"success": False, "error": "Missing ID token."}), 400

    if not firebase_initialized:
        # Graceful fallback demo mode for testing before serviceAccountKey.json is configured
        session["user_id"] = data.get("uid", "demo_user_uid")
        session["user_email"] = data.get("email", "user@example.com")
        return jsonify({
            "success": True,
            "message": "Logged in (Development mode: Firebase Admin service account not configured yet)."
        })

    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email", "")

        # Store user identity in the server-side session
        session["user_id"] = uid
        session["user_email"] = email

        return jsonify({
            "success": True,
            "message": "Authentication successful",
            "uid": uid,
            "email": email
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Invalid or expired token: {str(e)}"}), 401


# -----------------------------------------------------------------------------
# API: Firestore CRUD Operations for Notes
# -----------------------------------------------------------------------------

@app.route("/api/notes", methods=["GET"])
@login_required
def get_notes():
    """Fetch all notes belonging to the currently authenticated user."""
    user_id = session.get("user_id")

    if not firebase_initialized or db is None:
        # Return fallback empty/demo notes if Firestore is not initialized yet
        return jsonify({
            "success": True,
            "notes": [],
            "warning": "Firebase Firestore is not initialized. Please configure firebase/serviceAccountKey.json."
        })

    try:
        notes_ref = db.collection("notes")
        # Query only the logged-in user's notes
        query = notes_ref.where("user_id", "==", user_id)
        docs = query.stream()

        notes = []
        for doc in docs:
            note_data = doc.to_dict()
            note_data["id"] = doc.id
            notes.append(note_data)

        # Sort in memory by updated_at or created_at descending (newest first)
        notes.sort(key=lambda x: str(x.get("updated_at", x.get("created_at", ""))), reverse=True)

        return jsonify({"success": True, "notes": notes})
    except Exception as e:
        return jsonify({"success": False, "error": f"Error fetching notes from Firestore: {str(e)}"}), 500


@app.route("/notes/create", methods=["POST"])
@app.route("/api/notes/create", methods=["POST"])
@login_required
def create_note():
    """Create a new note in Firebase Firestore."""
    user_id = session.get("user_id")
    data = request.get_json() or request.form

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title:
        return jsonify({"success": False, "error": "Note title is required."}), 400

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_note_data = {
        "user_id": user_id,
        "title": title,
        "content": content,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    if not firebase_initialized or db is None:
        # Fallback simulation if Firebase is not linked yet
        new_note_data["id"] = "temp_" + str(int(datetime.datetime.now().timestamp()))
        return jsonify({
            "success": True,
            "message": "Note created (Simulation mode: configure Firebase for persistence).",
            "note": new_note_data
        })

    try:
        doc_ref = db.collection("notes").add(new_note_data)
        new_note_id = doc_ref[1].id
        new_note_data["id"] = new_note_id

        return jsonify({
            "success": True,
            "message": "Note created successfully!",
            "note": new_note_data
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to save note in Firestore: {str(e)}"}), 500


@app.route("/notes/update/<note_id>", methods=["POST", "PUT"])
@app.route("/api/notes/<note_id>", methods=["PUT", "POST"])
@login_required
def update_note(note_id):
    """Update an existing note in Firestore after verifying ownership."""
    user_id = session.get("user_id")
    data = request.get_json() or request.form

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title:
        return jsonify({"success": False, "error": "Note title cannot be empty."}), 400

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if not firebase_initialized or db is None:
        return jsonify({
            "success": True,
            "message": "Note updated (Simulation mode: configure Firebase).",
            "note": {"id": note_id, "title": title, "content": content, "updated_at": now_iso}
        })

    try:
        doc_ref = db.collection("notes").document(note_id)
        doc = doc_ref.get()

        if not doc.exists:
            return jsonify({"success": False, "error": "Note not found."}), 404

        existing_data = doc.to_dict()
        if existing_data.get("user_id") != user_id:
            return jsonify({"success": False, "error": "Access denied. You can only edit your own notes."}), 403

        update_payload = {
            "title": title,
            "content": content,
            "updated_at": now_iso
        }
        doc_ref.update(update_payload)

        update_payload["id"] = note_id
        update_payload["created_at"] = existing_data.get("created_at", now_iso)
        return jsonify({"success": True, "message": "Note updated successfully!", "note": update_payload})
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to update note: {str(e)}"}), 500


@app.route("/notes/delete/<note_id>", methods=["POST", "DELETE"])
@app.route("/api/notes/<note_id>", methods=["DELETE"])
@login_required
def delete_note(note_id):
    """Delete a note from Firestore after verifying user ownership."""
    user_id = session.get("user_id")

    if not firebase_initialized or db is None:
        return jsonify({"success": True, "message": "Note deleted (Simulation mode)."})

    try:
        doc_ref = db.collection("notes").document(note_id)
        doc = doc_ref.get()

        if not doc.exists:
            return jsonify({"success": False, "error": "Note not found."}), 404

        existing_data = doc.to_dict()
        if existing_data.get("user_id") != user_id:
            return jsonify({"success": False, "error": "Access denied. You can only delete your own notes."}), 403

        doc_ref.delete()
        return jsonify({"success": True, "message": "Note deleted successfully!"})
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to delete note: {str(e)}"}), 500


# -----------------------------------------------------------------------------
# API: Google Gemini AI Integration
# -----------------------------------------------------------------------------

@app.route("/api/ai/summarize", methods=["POST"])
@login_required
def ai_summarize():
    """
    Summarize the provided note title and content using the Gemini API.
    """
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not content and not title:
        return jsonify({"success": False, "error": "Cannot summarize empty note content."}), 400

    if not gemini_client:
        return jsonify({
            "success": False,
            "error": "Gemini API is not configured. Please set GEMINI_API_KEY in your .env file."
        }), 500

    try:
        prompt = f"""
You are a smart, concise AI assistant. Please generate a clear, structured summary of the following note.

Note Title: {title}
Note Content:
{content}

Provide:
1. A 1-2 sentence executive summary.
2. 3-5 bullet points covering the key ideas or action items.
Keep the formatting clean with Markdown.
"""
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        summary_text = response.text or "No summary generated."
        return jsonify({"success": True, "summary": summary_text})

    except Exception as e:
        return jsonify({"success": False, "error": f"Gemini API error: {str(e)}"}), 500


@app.route("/api/ai/improve", methods=["POST"])
@login_required
def ai_improve():
    """
    Improve, rewrite, and enhance the clarity, grammar, and organization
    of the provided note using the Gemini API.
    """
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not content and not title:
        return jsonify({"success": False, "error": "Cannot improve empty note content."}), 400

    if not gemini_client:
        return jsonify({
            "success": False,
            "error": "Gemini API is not configured. Please set GEMINI_API_KEY in your .env file."
        }), 500

    try:
        prompt = f"""
You are a professional writing and note-organization assistant.
Please rewrite and improve the following note. Fix any spelling or grammar errors, improve readability, enhance the vocabulary, and organize the content with clear paragraphs or bullet points where appropriate.

Original Title: {title}
Original Content:
{content}

Return the improved version formatted with:
- An improved, catchy Title
- The polished, well-structured Content
"""
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        improved_text = response.text or "No improvements generated."
        return jsonify({"success": True, "improved_text": improved_text})

    except Exception as e:
        return jsonify({"success": False, "error": f"Gemini API error: {str(e)}"}), 500


# -----------------------------------------------------------------------------
# System Status & Health Route
# -----------------------------------------------------------------------------

@app.route("/api/status", methods=["GET"])
def system_status():
    """Returns the initialization status of Firebase and Gemini API."""
    return jsonify({
        "status": "online",
        "firebase_initialized": firebase_initialized,
        "gemini_api_configured": bool(gemini_client)
    })


# -----------------------------------------------------------------------------
# Main Application Runner
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"\n=======================================================")
    print(f"🚀 Smart Notes AI Assistant is running on http://127.0.0.1:{port}")
    print(f"=======================================================\n")
    app.run(host="0.0.0.0", port=port, debug=True)
