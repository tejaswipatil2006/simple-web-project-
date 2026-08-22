/**
 * ============================================================================
 * Smart Notes AI Assistant - Frontend Client JavaScript
 * ============================================================================
 * 
 * This file handles:
 * 1. Firebase Web SDK initialization and client-side Authentication (Login, Register, Logout)
 * 2. Synchronizing the Firebase Auth ID token with the Flask backend session
 * 3. Loading, Creating, Editing, and Deleting user notes from Firestore via Flask API
 * 4. Invoking Google Gemini AI features (Summarize Note & Improve Note)
 * 
 * ----------------------------------------------------------------------------
 * FIREBASE WEB CONFIGURATION INSTRUCTIONS:
 * ----------------------------------------------------------------------------
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Select your Project -> Project Settings -> General -> "Your apps"
 * 3. Click the Web icon (</>) or choose your registered web app
 * 4. Copy the config values and replace the placeholders below!
 */

// REPLACE THE PLACEHOLDER VALUES WITH YOUR ACTUAL FIREBASE WEB CONFIGURATION:
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Global state
let auth = null;
let currentNotes = [];
let activeNoteForAI = null;

// Initialize Firebase Web SDK if valid config is provided
function initFirebaseClient() {
  if (typeof firebase === "undefined") {
    console.warn("Firebase SDK script not loaded in HTML.");
    return false;
  }

  // Check if user has replaced placeholder
  const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");

  try {
    if (!firebase.apps.length) {
      if (isConfigured) {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        console.log("Firebase Web SDK initialized successfully.");
      } else {
        console.warn("Firebase Web config contains placeholders. Please update firebaseConfig in static/js/app.js.");
      }
    } else {
      auth = firebase.auth();
    }
    return isConfigured;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Helper: Show Bootstrap Alert Messages
// ----------------------------------------------------------------------------
function showAlert(message, type = "danger", containerId = "alertContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show shadow-sm" role="alert">
      <div>${message}</div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  container.innerHTML = alertHtml;

  // Auto dismiss after 6 seconds
  setTimeout(() => {
    const alertEl = container.querySelector(".alert");
    if (alertEl) {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl);
      bsAlert.close();
    }
  }, 6000);
}

// ----------------------------------------------------------------------------
// Authentication Handlers
// ----------------------------------------------------------------------------

/**
 * Handle user registration with email and password
 */
async function handleRegister(event) {
  event.preventDefault();
  const emailInput = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const confirmPasswordInput = document.getElementById("registerConfirmPassword");
  const submitBtn = document.getElementById("registerSubmitBtn");

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!email || !password) {
    showAlert("Please fill in all required fields.", "warning", "authAlertContainer");
    return;
  }

  if (password.length < 6) {
    showAlert("Password must be at least 6 characters long.", "warning", "authAlertContainer");
    return;
  }

  if (password !== confirmPassword) {
    showAlert("Passwords do not match.", "warning", "authAlertContainer");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creating account...';

  try {
    const isConfigured = initFirebaseClient();
    if (!isConfigured) {
      // Demo / simulation mode fallback if user hasn't set up Firebase Web config yet
      showAlert(
        "<strong>Note:</strong> Firebase Web credentials not configured yet in <code>static/js/app.js</code>. Simulating login for demonstration...",
        "info",
        "authAlertContainer"
      );
      await sendTokenToBackend("demo_token", "demo_uid_" + Date.now(), email);
      window.location.href = "/dashboard";
      return;
    }

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // Establish Flask session on backend
    await sendTokenToBackend(idToken, user.uid, user.email);
    window.location.href = "/dashboard";

  } catch (error) {
    console.error("Registration error:", error);
    let errorMessage = error.message;
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "This email address is already registered. Please sign in instead.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Please enter a valid email address.";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak. Please use a stronger password.";
    }
    showAlert(errorMessage, "danger", "authAlertContainer");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Register';
  }
}

/**
 * Handle user login with email and password
 */
async function handleLogin(event) {
  event.preventDefault();
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const submitBtn = document.getElementById("loginSubmitBtn");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showAlert("Please enter your email and password.", "warning", "authAlertContainer");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Signing in...';

  try {
    const isConfigured = initFirebaseClient();
    if (!isConfigured) {
      showAlert(
        "<strong>Note:</strong> Firebase Web credentials not configured yet in <code>static/js/app.js</code>. Simulating login for demonstration...",
        "info",
        "authAlertContainer"
      );
      await sendTokenToBackend("demo_token", "demo_uid_123", email);
      window.location.href = "/dashboard";
      return;
    }

    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // Establish Flask session
    await sendTokenToBackend(idToken, user.uid, user.email);
    window.location.href = "/dashboard";

  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = error.message;
    if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      errorMessage = "Invalid email or password. Please check your credentials.";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many failed attempts. Please try again in a few minutes.";
    }
    showAlert(errorMessage, "danger", "authAlertContainer");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Login';
  }
}

/**
 * Synchronize authentication token with Flask backend session
 */
async function sendTokenToBackend(idToken, uid, email) {
  const response = await fetch("/api/session-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, uid, email })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to establish server session.");
  }
  return data;
}

/**
 * Sign out user from Firebase and backend session
 */
async function handleLogout() {
  try {
    if (auth) {
      await auth.signOut();
    }
  } catch (e) {
    console.warn("Client signOut error:", e);
  }
  window.location.href = "/logout";
}

// ----------------------------------------------------------------------------
// Dashboard: Notes CRUD Operations
// ----------------------------------------------------------------------------

/**
 * Fetch and render all notes for current user
 */
async function loadNotes() {
  const notesContainer = document.getElementById("notesGrid");
  const loadingSpinner = document.getElementById("notesLoading");
  const emptyState = document.getElementById("emptyNotesState");

  if (!notesContainer) return;

  if (loadingSpinner) loadingSpinner.style.display = "block";
  if (emptyState) emptyState.style.display = "none";
  notesContainer.innerHTML = "";

  try {
    const response = await fetch("/api/notes");
    const data = await response.json();

    if (loadingSpinner) loadingSpinner.style.display = "none";

    if (!response.ok || !data.success) {
      showAlert(data.error || "Could not load notes from database.", "danger");
      return;
    }

    if (data.warning) {
      showAlert(data.warning, "warning");
    }

    currentNotes = data.notes || [];
    renderNotesList(currentNotes);

  } catch (error) {
    if (loadingSpinner) loadingSpinner.style.display = "none";
    console.error("Error loading notes:", error);
    showAlert("Failed to connect to notes backend: " + error.message, "danger");
  }
}

/**
 * Render notes array into responsive Bootstrap cards
 */
function renderNotesList(notes) {
  const notesContainer = document.getElementById("notesGrid");
  const emptyState = document.getElementById("emptyNotesState");
  const noteCountBadge = document.getElementById("noteCountBadge");

  if (!notesContainer) return;

  if (noteCountBadge) {
    noteCountBadge.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
  }

  if (notes.length === 0) {
    notesContainer.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  notesContainer.innerHTML = notes.map(note => {
    // Format timestamp nicely
    let formattedDate = "Just now";
    if (note.updated_at || note.created_at) {
      try {
        const d = new Date(note.updated_at || note.created_at);
        formattedDate = d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {}
    }

    const safeTitle = escapeHtml(note.title || "Untitled Note");
    const safeContent = escapeHtml(note.content || "");
    const previewContent = safeContent.length > 200 ? safeContent.substring(0, 200) + "..." : safeContent;

    return `
      <div class="col-12 col-md-6 col-lg-4" id="note-card-${note.id}">
        <div class="bento-card bento-hover h-100 p-4 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="fw-bold text-dark mb-0 text-truncate" style="max-width: 70%;" title="${safeTitle}">${safeTitle}</h5>
              <span class="badge bg-light text-secondary border px-2 py-1 small" style="font-size: 0.7rem;">
                <i class="bi bi-clock me-1"></i>${formattedDate}
              </span>
            </div>
            
            <p class="text-secondary flex-grow-1 my-3" style="white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6;">${previewContent || '<em class="text-muted">No content</em>'}</p>
          </div>

          <div>
            <!-- AI Action Buttons in Bento style -->
            <div class="p-2 rounded-3 mb-3 border border-slate-200" style="background: #f8fafc;">
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary flex-fill d-flex align-items-center justify-content-center border-0 text-indigo-600 bg-white shadow-sm" onclick="openAISummarize('${note.id}')" title="Summarize with Gemini AI">
                  <i class="bi bi-stars me-1 text-indigo-600"></i> Summarize
                </button>
                <button type="button" class="btn btn-sm btn-outline-success flex-fill d-flex align-items-center justify-content-center border-0 text-success bg-white shadow-sm" onclick="openAIImprove('${note.id}')" title="Improve with Gemini AI">
                  <i class="bi bi-magic me-1 text-success"></i> Polish
                </button>
              </div>
            </div>

            <!-- Card Bottom Controls -->
            <div class="d-flex justify-content-between align-items-center pt-2 border-top">
              <span class="text-muted font-monospace small" style="font-size: 0.7rem;">ID: ${note.id.substring(0, 8)}...</span>
              <div class="d-flex gap-1">
                <button type="button" class="btn btn-sm btn-light text-secondary border-0" onclick="openEditNoteModal('${note.id}')" title="Edit Note">
                  <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light text-danger border-0" onclick="confirmDeleteNote('${note.id}')" title="Delete Note">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Handle creating a new note
 */
async function handleCreateNote(event) {
  event.preventDefault();
  const titleInput = document.getElementById("newNoteTitle");
  const contentInput = document.getElementById("newNoteContent");
  const saveBtn = document.getElementById("saveNewNoteBtn");

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title) {
    showAlert("Please provide a title for the note.", "warning", "newNoteAlertContainer");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

  try {
    const response = await fetch("/api/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showAlert(data.error || "Failed to save note in database.", "danger", "newNoteAlertContainer");
      return;
    }

    // Close modal
    const modalEl = document.getElementById("newNoteModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    // Reset form
    titleInput.value = "";
    contentInput.value = "";

    showAlert("Note created successfully!", "success");
    await loadNotes();

  } catch (error) {
    console.error("Create note error:", error);
    showAlert("Failed to create note: " + error.message, "danger", "newNoteAlertContainer");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Note';
  }
}

/**
 * Open the Edit Note modal and populate fields
 */
function openEditNoteModal(noteId) {
  const note = currentNotes.find(n => n.id === noteId);
  if (!note) return;

  document.getElementById("editNoteId").value = note.id;
  document.getElementById("editNoteTitle").value = note.title || "";
  document.getElementById("editNoteContent").value = note.content || "";

  const modal = new bootstrap.Modal(document.getElementById("editNoteModal"));
  modal.show();
}

/**
 * Handle updating an existing note
 */
async function handleUpdateNote(event) {
  event.preventDefault();
  const id = document.getElementById("editNoteId").value;
  const title = document.getElementById("editNoteTitle").value.trim();
  const content = document.getElementById("editNoteContent").value.trim();
  const updateBtn = document.getElementById("updateNoteBtn");

  if (!title) {
    showAlert("Note title cannot be empty.", "warning", "editNoteAlertContainer");
    return;
  }

  updateBtn.disabled = true;
  updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

  try {
    const response = await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showAlert(data.error || "Failed to update note.", "danger", "editNoteAlertContainer");
      return;
    }

    const modalEl = document.getElementById("editNoteModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    showAlert("Note updated successfully!", "success");
    await loadNotes();

  } catch (error) {
    console.error("Update note error:", error);
    showAlert("Failed to update note: " + error.message, "danger", "editNoteAlertContainer");
  } finally {
    updateBtn.disabled = false;
    updateBtn.innerHTML = 'Save Changes';
  }
}

/**
 * Delete a note
 */
async function confirmDeleteNote(noteId) {
  const note = currentNotes.find(n => n.id === noteId);
  const noteTitle = note ? `"${note.title}"` : "this note";

  if (!confirm(`Are you sure you want to delete ${noteTitle}? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "DELETE"
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showAlert(data.error || "Failed to delete note.", "danger");
      return;
    }

    showAlert("Note deleted successfully.", "info");
    await loadNotes();

  } catch (error) {
    console.error("Delete note error:", error);
    showAlert("Failed to delete note: " + error.message, "danger");
  }
}

// ----------------------------------------------------------------------------
// Google Gemini AI Features
// ----------------------------------------------------------------------------

/**
 * Open AI Summarize Modal and request summary from Gemini API
 */
async function openAISummarize(noteId) {
  const note = currentNotes.find(n => n.id === noteId);
  if (!note) return;

  activeNoteForAI = note;

  const modalEl = document.getElementById("aiModal");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  document.getElementById("aiModalTitle").innerHTML = '<i class="bi bi-stars text-primary me-2"></i>Gemini AI Note Summary';
  document.getElementById("aiTargetNoteTitle").textContent = `Note: ${note.title}`;
  
  const loadingEl = document.getElementById("aiLoadingSpinner");
  const contentEl = document.getElementById("aiResultContent");
  const applyBtn = document.getElementById("aiApplyBtn");

  loadingEl.style.display = "block";
  contentEl.innerHTML = "";
  applyBtn.style.display = "none";

  try {
    const response = await fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: note.title,
        content: note.content
      })
    });

    const data = await response.json();
    loadingEl.style.display = "none";

    if (!response.ok || !data.success) {
      contentEl.innerHTML = `
        <div class="alert alert-danger mb-0">
          <i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(data.error || "Failed to generate summary.")}
        </div>
      `;
      return;
    }

    // Format simple markdown into clean HTML
    const formattedSummary = formatMarkdown(data.summary);
    contentEl.innerHTML = `
      <div class="bg-light p-3 rounded border text-dark" style="font-size: 0.95rem; line-height: 1.6;">
        ${formattedSummary}
      </div>
    `;

  } catch (error) {
    loadingEl.style.display = "none";
    contentEl.innerHTML = `
      <div class="alert alert-danger mb-0">
        <i class="bi bi-exclamation-triangle me-2"></i>Network Error: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

/**
 * Open AI Improve Modal and request rewrite/suggestions from Gemini API
 */
async function openAIImprove(noteId) {
  const note = currentNotes.find(n => n.id === noteId);
  if (!note) return;

  activeNoteForAI = note;

  const modalEl = document.getElementById("aiModal");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  document.getElementById("aiModalTitle").innerHTML = '<i class="bi bi-magic text-success me-2"></i>Gemini AI Note Enhancement';
  document.getElementById("aiTargetNoteTitle").textContent = `Note: ${note.title}`;

  const loadingEl = document.getElementById("aiLoadingSpinner");
  const contentEl = document.getElementById("aiResultContent");
  const applyBtn = document.getElementById("aiApplyBtn");

  loadingEl.style.display = "block";
  contentEl.innerHTML = "";
  applyBtn.style.display = "none";

  try {
    const response = await fetch("/api/ai/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: note.title,
        content: note.content
      })
    });

    const data = await response.json();
    loadingEl.style.display = "none";

    if (!response.ok || !data.success) {
      contentEl.innerHTML = `
        <div class="alert alert-danger mb-0">
          <i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(data.error || "Failed to generate improvements.")}
        </div>
      `;
      return;
    }

    const formattedImprovement = formatMarkdown(data.improved_text);
    contentEl.innerHTML = `
      <div class="bg-light p-3 rounded border text-dark" style="font-size: 0.95rem; line-height: 1.6;">
        ${formattedImprovement}
      </div>
      <div class="text-muted small mt-2">
        <i class="bi bi-info-circle me-1"></i>Click "Apply to Edit Form" to paste this improved text directly into your note editor.
      </div>
    `;

    applyBtn.style.display = "inline-block";
    applyBtn.onclick = () => {
      // Close AI modal and open edit note modal with improved content
      modal.hide();
      openEditNoteModal(activeNoteForAI.id);
      document.getElementById("editNoteContent").value = data.improved_text;
    };

  } catch (error) {
    loadingEl.style.display = "none";
    contentEl.innerHTML = `
      <div class="alert alert-danger mb-0">
        <i class="bi bi-exclamation-triangle me-2"></i>Network Error: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

/**
 * Filter notes in real-time by search query
 */
function handleSearchNotes(event) {
  const query = event.target.value.toLowerCase().trim();
  if (!query) {
    renderNotesList(currentNotes);
    return;
  }

  const filtered = currentNotes.filter(note => {
    const titleMatch = (note.title || "").toLowerCase().includes(query);
    const contentMatch = (note.content || "").toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });

  renderNotesList(filtered);
}

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatMarkdown(text) {
  if (!text) return "";
  let html = escapeHtml(text);
  
  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Headers # or ##
  html = html.replace(/^### (.*$)/gim, '<h6 class="fw-bold mt-3 mb-1 text-primary">$1</h6>');
  html = html.replace(/^## (.*$)/gim, '<h5 class="fw-bold mt-3 mb-2 text-dark">$1</h5>');
  html = html.replace(/^# (.*$)/gim, '<h4 class="fw-bold mt-3 mb-2 text-dark">$1</h4>');

  // Bullet items * or -
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="mb-1">$1</li>');
  html = html.replace(/(<li.*<\/li>)/s, '<ul class="ps-3 my-2">$1</ul>');

  // Newlines to <br> for non-list items
  html = html.replace(/\n\n/g, '<div class="my-2"></div>');

  return html;
}

// ----------------------------------------------------------------------------
// Page Event Listeners Initialization
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Initialize client Firebase SDK
  initFirebaseClient();

  // Bind Auth Forms if present on page
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Bind Dashboard actions if on dashboard page
  const newNoteForm = document.getElementById("newNoteForm");
  if (newNoteForm) {
    newNoteForm.addEventListener("submit", handleCreateNote);
  }

  const editNoteForm = document.getElementById("editNoteForm");
  if (editNoteForm) {
    editNoteForm.addEventListener("submit", handleUpdateNote);
  }

  const searchInput = document.getElementById("searchNotesInput");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearchNotes);
  }

  // If on Dashboard page, load user notes
  if (document.getElementById("notesGrid")) {
    loadNotes();
  }
});
