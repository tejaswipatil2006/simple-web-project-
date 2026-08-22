import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Search,
  BookOpen,
  Trash2,
  Edit3,
  CheckCircle2,
  Database,
  ArrowRight,
  RefreshCw,
  LogOut,
  SlidersHorizontal,
  Bot,
  Zap,
  Clock,
  Tag,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  FileText,
  Wand2,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  firestoreId: string;
}

const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Project Genesis Brainstorm",
    content:
      "Implement a clean, robust backend using Flask. Integrate Firestore for real-time document sync and use Gemini 2.5 Flash for automated summaries and writing enhancements. Next steps: configure serviceAccountKey.json and test token session endpoints.",
    category: "Architecture",
    createdAt: "10 mins ago",
    updatedAt: "2 mins ago",
    firestoreId: "FS_GENESIS_902",
  },
  {
    id: "note-2",
    title: "Firebase Setup & Security Rules",
    content:
      "1. Create Firebase project in Google Cloud Console.\n2. Enable Cloud Firestore in native mode.\n3. Enable Email/Password authentication in Firebase Auth.\n4. Ensure user notes collection checks request.auth.uid == resource.data.user_id.\n5. Download serviceAccountKey.json for the Flask backend.",
    category: "DevOps",
    createdAt: "2 hours ago",
    updatedAt: "1 hour ago",
    firestoreId: "FS_AUTH_741",
  },
  {
    id: "note-3",
    title: "Design System & Bento Grid Spec",
    content:
      "Embrace the Bento Grid modular layout with high contrast cards. Deep slate-900 intelligence terminal for AI features, clean slate-50 canvas, crisp indigo primary accents, and subtle borders with rounded-2xl geometry.",
    category: "Design",
    createdAt: "Yesterday",
    updatedAt: "Yesterday",
    firestoreId: "FS_DESIGN_319",
  },
  {
    id: "note-4",
    title: "Sprint Retrospective & Action Items",
    content:
      "Weekly team retro completed:\n- Good progress on the API proxy endpoints.\n- Need faster error handling for invalid tokens.\n- Gemini AI responses should be formatted with markdown bold highlights.",
    category: "Meetings",
    createdAt: "3 days ago",
    updatedAt: "2 days ago",
    firestoreId: "FS_RETRO_105",
  },
];

export default function App() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(INITIAL_NOTES[0].id);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [userEmail] = useState<string>("tejaswipatil946@gmail.com");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiModalMode, setAiModalMode] = useState<"summarize" | "improve">("summarize");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Form states
  const [formTitle, setFormTitle] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("General");

  // Stats & tokens
  const [tokensUsed, setTokensUsed] = useState<number>(342);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || notes[0] || null,
    [notes, selectedNoteId]
  );

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || note.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notes, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(notes.map((n) => n.category)));
    return ["All", ...cats];
  }, [notes]);

  // Handle Note CRUD
  const handleOpenCreateModal = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("General");
    setIsCreateModalOpen(true);
  };

  const handleSaveCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory || "General",
      createdAt: "Just now",
      updatedAt: "Just now",
      firestoreId: `FS_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    };

    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (noteToEdit?: Note) => {
    const target = noteToEdit || selectedNote;
    if (!target) return;
    setFormTitle(target.title);
    setFormContent(target.content);
    setFormCategory(target.category);
    setIsEditModalOpen(true);
  };

  const handleSaveEditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote || !formTitle.trim()) return;

    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedNote.id
          ? {
              ...n,
              title: formTitle.trim(),
              content: formContent.trim(),
              category: formCategory,
              updatedAt: "Just now",
            }
          : n
      )
    );
    setIsEditModalOpen(false);
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this note from Firestore?")) {
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      if (selectedNoteId === id && remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
      }
    }
  };

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  };

  // AI Operations
  const runAiOperation = (mode: "summarize" | "improve", noteOverride?: Note) => {
    const target = noteOverride || selectedNote;
    if (!target) return;

    setAiModalMode(mode);
    setIsAiModalOpen(true);
    setAiLoading(true);
    setAiResult("");

    // Incremental token simulation
    setTokensUsed((prev) => prev + Math.floor(Math.random() * 40 + 35));

    // Dynamic response generation simulating Gemini 2.5 Flash
    setTimeout(() => {
      if (mode === "summarize") {
        setAiResult(
          `### 📌 Key Executive Summary\n${target.title} outlines strategic priorities and action items with clear implementation milestones.\n\n### 🎯 Key Highlights\n• **Core Objective:** ${target.content.slice(0, 80)}...\n• **Category:** Tagged under #${target.category} with active Firestore synchronization.\n• **Action Item:** Complete integration tests and verify environment credentials.`
        );
      } else {
        setAiResult(
          `### ✍️ Enhanced Note: ${target.title}\n\n**Category:** ${target.category}\n\n${target.content
            .split("\n")
            .map((line) => (line.trim().startsWith("-") || line.trim().startsWith("1.") ? line : `> ${line}`))
            .join("\n\n")}\n\n---\n*Enhanced for clarity, formatting, and actionability via Google Gemini 2.5 Flash.*`
        );
      }
      setAiLoading(false);
    }, 950);
  };

  const applyAiResultToNote = () => {
    if (!selectedNote || !aiResult) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedNote.id
          ? {
              ...n,
              content: aiResult.replace(/### /g, "").replace(/\*\*/g, ""),
              updatedAt: "Just now (AI Enhanced)",
            }
          : n
      )
    );
    setIsAiModalOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <header className="h-16 px-6 lg:px-8 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-200">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              SmartNotes <span className="text-indigo-600 font-extrabold">AI</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
              Bento Edition
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-5">
          <div className="hidden md:flex items-center space-x-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>{userEmail}</span>
          </div>

          <button
            onClick={triggerSync}
            title="Sync with Firestore"
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Note</span>
          </button>
        </div>
      </header>

      {/* Main Bento Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 auto-rows-min">
          {/* ========================================================================= */}
          {/* BENTO CARD 1: Hero Welcome & Quick Actions (Span 8 Cols) */}
          {/* ========================================================================= */}
          <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
            {/* Ambient Background Gradient Orb */}
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-50 rounded-full blur-3xl pointer-events-none opacity-80" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-teal-50 rounded-full blur-2xl pointer-events-none opacity-60" />

            <div className="relative z-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Powered by Google Gemini 2.5 Flash & Firebase Firestore</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                Capture ideas, powered by <span className="text-indigo-600">Gemini</span>.
              </h1>
              <p className="text-slate-500 text-sm sm:text-base max-w-xl leading-relaxed">
                Streamline research, meeting minutes, and architectural notes with built-in AI summarization, grammar refinement, and real-time database sync.
              </p>
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleOpenCreateModal}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-200 transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Note</span>
                </button>
                <button
                  onClick={() => runAiOperation("summarize")}
                  disabled={!selectedNote}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Summarize Selected</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Isolated User Firestore Workspace</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BENTO CARD 2: Dark AI Assistant Hub (Span 4 Cols) */}
          {/* ========================================================================= */}
          <div className="md:col-span-4 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-md border border-slate-800 relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                    AI Assistant
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">READY</span>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-4 mb-4 border border-slate-700/60">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="uppercase font-bold tracking-wider text-[10px]">Active Intelligence</span>
                  <span className="font-mono text-indigo-300">gemini-2.5-flash</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Select any note card to run instant AI summarization, generate action items, or rewrite for professional clarity.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => runAiOperation("summarize")}
                  disabled={!selectedNote}
                  className="w-full py-3 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-all group"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>✨ Summarize Content</span>
                </button>

                <button
                  onClick={() => runAiOperation("improve")}
                  disabled={!selectedNote}
                  className="w-full py-3 px-4 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-xl text-teal-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-all group"
                >
                  <Wand2 className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                  <span>✍️ Rewrite & Improve</span>
                </button>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-white font-mono tracking-tight">{tokensUsed}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  AI Tokens Processed
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% HEALTH
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BENTO CARD 3: Recent Notes List & Filter (Span 5 Cols) */}
          {/* ========================================================================= */}
          <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Your Notes</h2>
                <p className="text-xs text-slate-500">
                  {filteredNotes.length} {filteredNotes.length === 1 ? "document" : "documents"} in Firestore
                </p>
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-100 transition-colors"
                title="Add new note"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Notes List with Bento items */}
            <div className="space-y-2.5 flex-1 max-h-[380px] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No notes found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try a different search query or add a note.</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = selectedNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-300 shadow-sm"
                          : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                          {note.title}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
                          {note.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/80">
                        <span className="text-[10px] text-slate-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {note.updatedAt}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-500 font-medium">
                          {note.firestoreId}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BENTO CARD 4: Active Note Viewer & Editor (Span 7 Cols) */}
          {/* ========================================================================= */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            {selectedNote ? (
              <div className="flex flex-col h-full">
                {/* Note Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">
                        {selectedNote.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        Last updated {selectedNote.updatedAt}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedNote.title}</h2>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(selectedNote)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                      title="Edit note content"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteNote(selectedNote.id, e)}
                      className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Note Content Display with Bento typography */}
                <div className="bg-slate-50/80 flex-1 rounded-xl p-5 border border-slate-100 text-sm text-slate-700 leading-relaxed overflow-y-auto max-h-[300px] whitespace-pre-wrap font-sans">
                  {selectedNote.content}
                </div>

                {/* Note Card Footer Controls */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">
                      Doc ID: {selectedNote.firestoreId}
                    </span>
                    <div className="flex -space-x-1.5">
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold">
                        AI
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-400 flex items-center justify-center text-[9px] text-white font-bold">
                        U
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => runAiOperation("summarize")}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200/60 transition-colors flex items-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Summarize</span>
                    </button>
                    <button
                      onClick={() => runAiOperation("improve")}
                      className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200/60 transition-colors flex items-center space-x-1"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>AI Polish</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-600">Select a note to inspect and edit</p>
                <p className="text-xs text-slate-400 mt-1">Or click &quot;Create New Note&quot; to begin.</p>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* BENTO CARD 5: Database Connection & System Health Status (Span 6 Cols) */}
          {/* ========================================================================= */}
          <div className="md:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Database Architecture</p>
                <p className="text-sm font-bold text-slate-800">Cloud Firestore Connected</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
                Secure
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BENTO CARD 6: Backend Service & GenAI API Status (Span 6 Cols) */}
          {/* ========================================================================= */}
          <div className="md:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">AI Model Pipeline</p>
                <p className="text-sm font-bold text-slate-800">Google Gemini 2.5 Flash</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg uppercase tracking-wider">
              Flask Service
            </span>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: Create Note Modal */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Create New Note</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreateNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Note Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Growth Strategy & Milestones"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Category Tag
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="General">General</option>
                  <option value="Architecture">Architecture</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Design">Design</option>
                  <option value="Meetings">Meetings</option>
                  <option value="Research">Research</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Note Content
                </label>
                <textarea
                  rows={6}
                  placeholder="Type or paste your markdown notes here..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all"
                >
                  Save to Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Edit Note Modal */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-white">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Edit Note</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Note Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Category Tag
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="General">General</option>
                  <option value="Architecture">Architecture</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Design">Design</option>
                  <option value="Meetings">Meetings</option>
                  <option value="Research">Research</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Note Content
                </label>
                <textarea
                  rows={7}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all"
                >
                  Update Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Gemini AI Intelligence Modal (Summarize & Improve) */}
      {/* ========================================================================= */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 text-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {aiModalMode === "summarize"
                      ? "Gemini AI Summary Generator"
                      : "Gemini AI Note Enhancer"}
                  </h3>
                  <p className="text-[11px] text-slate-400">Model: gemini-2.5-flash</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-slate-800/80 rounded-xl p-3 mb-4 border border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-sm">
                  Active Document: <span className="text-white font-semibold">{selectedNote?.title}</span>
                </span>
                <span className="font-mono text-indigo-400 text-[10px] uppercase font-bold">
                  {selectedNote?.firestoreId}
                </span>
              </div>

              {aiLoading ? (
                <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-slate-300 animate-pulse">
                    Gemini AI is processing your note...
                  </p>
                  <span className="text-xs text-slate-500">Generating structured markdown output</span>
                </div>
              ) : (
                <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800/80 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {aiResult}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <button
                onClick={() => copyToClipboard(aiResult)}
                disabled={aiLoading || !aiResult}
                className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center space-x-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Markdown"}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={applyAiResultToNote}
                  disabled={aiLoading || !aiResult}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm shadow-indigo-500/20 transition-all flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Directly to Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
