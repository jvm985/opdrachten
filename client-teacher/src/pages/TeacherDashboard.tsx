import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Plus, Trash2, Edit3, ArrowLeft, Save, X, Database, Search, Copy, Eye, Printer, Play, BarChart3, MoreVertical, Lock, Share2, Users, Layout, LayoutList, FileJson, Upload } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { QuestionEditor } from '../components/QuestionEditor';
import type { Question, Exam } from '../types';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [exams, setExams] = useState<Exam[]>([]);
  const [sharedExams, setSharedExams] = useState<Exam[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allTeachers, setAllTeachers] = useState<{id: string, name: string, email: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'mine' | 'shared' | 'admin'>('mine');
  const isAdmin = user.email === 'joachim.vanmeirvenne@atheneumkapellen.be';
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');
  const [showBank, setShowBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [sharedBankQuestions, setSharedBankQuestions] = useState<Question[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTab, setBankTab] = useState<'mine' | 'shared'>('mine');
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [hasSubmissions, setHasSubmissions] = useState(false);
  
  const [title, setTitle] = useState('');
  const [isGraded, setIsGraded] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [requireFullscreen, setRequireFullscreen] = useState(true);
  const [detectTabSwitch, setDetectTabSwitch] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState<string | null>(null);
  const [showEditMenu, setShowEditMenu] = useState(false);

  const [selectedExamForLive, setSelectedExamForLive] = useState<Exam | null>(null);

  const dropdownItemStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: '10px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderRadius: '8px',
    transition: 'background 0.2s',
    color: 'inherit'
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setShowEditMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user.role !== 'teacher') { navigate('/login'); return; }
    fetchExams();
    fetchSharedExams();
    if (isAdmin) {
      fetchAllExams();
      fetchAllTeachers();
    }

    const socket = io();
    socket.on('submission_received', ({ examId }) => {
      setExams(prev => prev.map(e => e.id === examId ? { ...e, submissionCount: e.submissionCount + 1, hasSubmissions: true } : e));
      if (isAdmin) fetchAllExams();
    });

    socket.on('exam_created', () => {
      if (isAdmin) fetchAllExams();
      fetchSharedExams();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let list: Exam[] = [];
    if (activeTab === 'mine') list = exams;
    else if (activeTab === 'shared') list = sharedExams;
    else if (activeTab === 'admin') list = allExams;

    if (activeFilters.length > 0) {
      setFilteredExams(list.filter(e => activeFilters.every(filter => e.labels.includes(filter))));
    } else {
      setFilteredExams(list);
    }
  }, [activeFilters, exams, sharedExams, allExams, activeTab]);

  const safeJson = async (res: Response) => {
    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    throw new Error(`Invalid response: ${res.status}`);
  };

  const fetchExams = async () => {
    try {
      const res = await fetch(`/api/teacher/exams?teacherId=${user.id}`);
      const data = await safeJson(res);
      setExams(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchExams error:', e); }
  };

  const fetchSharedExams = async () => {
    try {
      const res = await fetch(`/api/teacher/shared-exams?teacherId=${user.id}`);
      const data = await safeJson(res);
      setSharedExams(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchSharedExams error:', e); }
  };

  const fetchAllExams = async () => {
    try {
      const res = await fetch('/api/admin/all-exams');
      const data = await safeJson(res);
      setAllExams(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchAllExams error:', e); }
  };

  const fetchAllTeachers = async () => {
    try {
      const res = await fetch('/api/admin/teachers');
      const data = await safeJson(res);
      setAllTeachers(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchAllTeachers error:', e); }
  };

  const handleReassignTeacher = async (examId: string, teacherId: string) => {
    if (!confirm('Toets toewijzen aan deze docent?')) return;
    try {
      const res = await fetch(`/api/admin/exams/${examId}/reassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId })
      });
      if (res.ok) {
        fetchAllExams();
        fetchExams();
        alert('Toets succesvol toegewezen!');
      }
    } catch (e) { console.error(e); }
  };

  const fetchBank = async () => {
    try {
      const [mineRes, sharedRes] = await Promise.all([
        fetch(`/api/questions-bank?teacherId=${user.id}`),
        fetch(`/api/questions-bank/shared?teacherId=${user.id}`)
      ]);
      const mine = await mineRes.json();
      const shared = await sharedRes.json();
      setBankQuestions(Array.isArray(mine) ? mine : []);
      setSharedBankQuestions(Array.isArray(shared) ? shared : []);
      setShowBank(true);
    } catch (e) { console.error(e); }
  };

  const handleStartCreate = () => {
    setCurrentExamId(null);
    setTitle('');
    setIsGraded(true);
    setIsShared(false);
    setRequireFullscreen(true);
    setDetectTabSwitch(true);
    setQuestions([{ id: crypto.randomUUID(), type: 'open', text: '', points: 1, correctAnswer: '' }]);
    setLabels([]);
    setHasSubmissions(false);
    setIsEditing(true);
    setCurrentQuestionIndex(0);
  };

  const handleStartEdit = async (exam: Exam) => {
    setCurrentExamId(exam.id);
    setTitle(exam.title);
    setIsGraded(exam.isGraded);
    setIsShared(exam.isShared);
    setRequireFullscreen(exam.requireFullscreen);
    setDetectTabSwitch(exam.detectTabSwitch);
    setQuestions(exam.questions);
    setLabels(exam.labels || []);
    setHasSubmissions(exam.submissionCount > 0);
    setIsEditing(true);
    setCurrentQuestionIndex(0);
  };

  const handleSaveExam = async () => {
    if (!title.trim()) return alert('Titel is verplicht');
    setIsLoading(true);
    try {
      const url = currentExamId ? `/api/exams/${currentExamId}` : '/api/exams';
      const method = currentExamId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          title, questions, labels,
          isGraded, requireFullscreen, detectTabSwitch, isShared
        })
      });
      if (res.ok) {
        setIsEditing(false);
        fetchExams();
        if (isAdmin) fetchAllExams();
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleAddQuestion = () => {
    const newQ: Question = { id: crypto.randomUUID(), type: 'open', text: '', points: 1, correctAnswer: '' };
    setQuestions([...questions, newQ]);
    setCurrentQuestionIndex(questions.length);
  };

  const handleRemoveQuestion = (idx: number) => {
    const newQs = questions.filter((_, i) => i !== idx);
    setQuestions(newQs);
    if (currentQuestionIndex >= newQs.length) setCurrentQuestionIndex(Math.max(0, newQs.length - 1));
  };

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Toets naar prullenbak verplaatsen?')) return;
    try {
      const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExams();
        if (isAdmin) fetchAllExams();
      }
    } catch (e) { console.error(e); }
  };

  const handleDuplicate = async (exam: Exam) => {
    if (!confirm('Toets kopiëren?')) return;
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          title: `${exam.title} (kopie)`,
          questions: exam.questions.map(q => ({ ...q, id: crypto.randomUUID() })),
          labels: exam.labels,
          isGraded: exam.isGraded,
          requireFullscreen: exam.requireFullscreen,
          detectTabSwitch: exam.detectTabSwitch,
          isShared: false
        })
      });
      if (res.ok) {
        fetchExams();
        if (isAdmin) fetchAllExams();
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleShare = async (exam: Exam) => {
    try {
      await fetch(`/api/exams/${exam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...exam, isShared: !exam.isShared })
      });
      fetchExams();
    } catch (e) { console.error(e); }
  };

  const getStudentUrl = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:5174' : 'https://student.irishof.cloud';
  };

  const handleQuickPreview = (exam: Exam) => {
    window.open(`${getStudentUrl()}/exam/${exam.exam_key}?preview=true`, '_blank');
  };

  const handleExportJSON = async (exam: Exam) => {
    try {
      const res = await fetch(`/api/exams/${exam.id}/submissions`);
      const submissions = await safeJson(res);
      const data = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        exam: exam,
        submissions: submissions
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Toets_${exam.title.replace(/\s+/g, '_')}_met_inzendingen.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Fout bij exporteren');
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.exam) throw new Error('Ongeldig bestandsformaat');

        setIsLoading(true);
        const res = await fetch('/api/exams/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId: user.id,
            exam: data.exam,
            submissions: data.submissions
          })
        });

        if (res.ok) {
          alert('Examen en inzendingen succesvol geïmporteerd!');
          fetchExams();
          if (isAdmin) fetchAllExams();
        } else {
          alert('Fout bij importeren');
        }
      } catch (err) {
        console.error(err);
        alert('Fout bij het lezen van het JSON bestand: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    alert('Voorvertoning opent in nieuw tabblad. Sla je wijzigingen eerst op om de nieuwste versie te zien.');
    window.open(`${getStudentUrl()}/exam/PREVIEW?preview=true`, '_blank');
  };

  const saveQuestionToBank = async (q: Question) => {
    setIsSavingToBank(q.id);
    try {
      const res = await fetch('/api/questions-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: user.id, question: q, labels: q.labels || [] })
      });
      if (res.ok) alert('Vraag opgeslagen in je bank!');
    } catch (e) { console.error(e); }
    finally { setIsSavingToBank(null); }
  };

  const handleAddFromBank = (q: Question) => {
    const { id, ...rest } = q;
    setQuestions([...questions, { id: crypto.randomUUID(), ...rest } as Question]);
  };

  const handleMapClick = (e: React.MouseEvent, q: Question) => {
    if (q.type !== 'map' || hasSubmissions) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const label = prompt('Naam voor deze locatie:');
    if (label) {
      const newLoc = { id: crypto.randomUUID(), label, x, y };
      handleUpdateQuestion(q.id, { locations: [...(q.locations || []), newLoc] });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleUpdateQuestion(qId, { image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleStartLiveSessie = (exam: Exam) => {
    setSelectedExamForLive(exam);
    setRequireFullscreen(exam.requireFullscreen);
    setDetectTabSwitch(exam.detectTabSwitch);
  };

  const confirmStartLiveSessie = async () => {
    if (!selectedExamForLive) return;
    try {
      await fetch(`/api/exams/${selectedExamForLive.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedExamForLive, requireFullscreen, detectTabSwitch })
      });
      navigate(`/teacher/live/${selectedExamForLive.exam_key}`);
    } catch (e) { console.error(e); }
  };

  const toggleFilter = (label: string) => {
    setActiveFilters(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const allLabels = Array.from(new Set([
    ...exams.flatMap(e => e.labels || []),
    ...sharedExams.flatMap(e => e.labels || []),
    ...allExams.flatMap(e => e.labels || [])
  ])).sort();

  const editorProps = {
    handleUpdateQuestion,
    handleRemoveQuestion,
    handleMapClick,
    handleImageUpload,
    saveQuestionToBank,
    hasSubmissions,
    isSavingToBank,
    viewMode
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: '72px' }}>
      <TopNav user={user} />
      
      {isEditing ? (
        <div className="animate-up" style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 20px' }}>
          {showBank && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="card animate-scale" style={{ maxWidth: '800px', width: '100%', height: '80vh', display: 'flex', flexDirection: 'column', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0 }}>Vraagbank</h2>
                  <button className="btn btn-secondary" style={{ padding: '8px', borderRadius: '50%' }} onClick={() => setShowBank(false)}><X size={20}/></button>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '12px', color: '#86868b' }} size={18}/>
                    <input className="input" style={{ paddingLeft: '40px' }} placeholder="Zoek in bank..." value={bankSearch} onChange={e => setBankSearch(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #f5f5f7' }}>
                  <button style={{ padding: '8px 4px', border: 'none', background: 'none', borderBottom: bankTab === 'mine' ? '2px solid var(--system-blue)' : 'none', fontWeight: '600', cursor: 'pointer' }} onClick={() => setBankTab('mine')}>Mijn vragen</button>
                  <button style={{ padding: '8px 4px', border: 'none', background: 'none', borderBottom: bankTab === 'shared' ? '2px solid var(--system-blue)' : 'none', fontWeight: '600', cursor: 'pointer' }} onClick={() => setBankTab('shared')}>Gedeeld</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(bankTab === 'mine' ? bankQuestions : sharedBankQuestions).filter(q => q.text.toLowerCase().includes(bankSearch.toLowerCase())).map(q => (
                    <div key={q.id} style={{ padding: '16px', border: '1px solid #eee', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <span className="badge" style={{ marginBottom: '4px' }}>{q.type.toUpperCase()}</span>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{q.text}</p>
                      </div>
                      <button className="btn btn-secondary" onClick={() => handleAddFromBank(q)}><Plus size={16}/> Toevoegen</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={() => setIsEditing(false)}><ArrowLeft size={20}/></button>
              <input style={{ border: 'none', background: 'none', fontSize: '28px', fontWeight: '700', outline: 'none', width: '400px', letterSpacing: '-0.5px' }} value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel..." />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'white', padding: '2px', borderRadius: '10px', border: '1px solid var(--system-border)', marginRight: '8px' }}>
                <button 
                  className={`btn ${viewMode === 'single' ? '' : 'btn-secondary'}`} 
                  onClick={() => setViewMode('single')}
                  style={{ padding: '8px', border: 'none', borderRadius: '8px', display: 'flex' }}
                  title="Stapsgewijs bewerken"
                >
                  <Layout size={18}/>
                </button>
                <button 
                  className={`btn ${viewMode === 'list' ? '' : 'btn-secondary'}`} 
                  onClick={() => setViewMode('list')}
                  style={{ padding: '8px', border: 'none', borderRadius: '8px', display: 'flex' }}
                  title="Lijstweergave"
                >
                  <LayoutList size={18}/>
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={(e) => { e.stopPropagation(); setShowEditMenu(!showEditMenu); }}
                  style={{ borderRadius: '10px', padding: '10px' }}
                >
                  <MoreVertical size={20}/>
                </button>
                
                {showEditMenu && (
                  <div className="glass animate-up" style={{ position: 'absolute', top: '42px', right: 0, width: '280px', background: 'white', borderRadius: '14px', boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(0,0,0,0.05)', zIndex: 100, padding: '6px' }}>
                    <button style={dropdownItemStyle} onClick={fetchBank}>
                      <Database size={16}/> Vraagbank openen
                    </button>
                    <button style={dropdownItemStyle} onClick={handlePreview} disabled={isLoading}>
                      <Eye size={16}/> Voorvertoning (Preview)
                    </button>
                    
                    <div style={{ height: '1px', background: '#f5f5f7', margin: '4px 0' }} />
                    
                    <div style={{ padding: '8px 12px' }}>
                      <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--system-secondary-text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instellingen</p>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '12px' }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isGraded} 
                          onChange={e => setIsGraded(e.target.checked)} 
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                        />
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>Op punten berekenen</span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isShared} 
                          onChange={e => setIsShared(e.target.checked)} 
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                        />
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>Delen met collega's</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <button className="btn" onClick={() => handleSaveExam()} disabled={isLoading} style={{ borderRadius: '10px', padding: '10px 16px' }} title="Toets opslaan">
                <Save size={20}/> Opslaan
              </button>
            </div>
          </header>
          
          <div style={{ marginBottom: '40px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--system-border-light)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--system-secondary-text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Labels & Categorieën</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="input" 
                    placeholder="Typ om nieuw label toe te voegen..." 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && !labels.includes(val)) setLabels([...labels, val]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                    style={{ background: '#f5f5f7', border: 'none' }}
                  />
                </div>
              </div>

              {labels.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '4px 0' }}>
                  {labels.map((l: string) => (
                    <span key={l} className="animate-scale" style={{ 
                      background: 'var(--system-blue)', 
                      color: 'white', 
                      padding: '6px 12px', 
                      borderRadius: '10px', 
                      fontSize: '13px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(0, 102, 204, 0.2)'
                    }}>
                      {l} 
                      <X 
                        size={14} 
                        style={{ cursor: 'pointer', opacity: 0.8 }} 
                        onClick={() => setLabels(labels.filter((x: string) => x !== l))} 
                      />
                    </span>
                  ))}
                </div>
              )}

              {(() => {
                const allExistingLabels = Array.from(new Set([
                  ...exams.flatMap(e => e.labels || []),
                  ...sharedExams.flatMap(e => e.labels || []),
                  ...allExams.flatMap(e => e.labels || [])
                ])).filter(l => !labels.includes(l)).sort();

                if (allExistingLabels.length > 0) {
                  return (
                    <div style={{ marginTop: '4px', paddingTop: '16px', borderTop: '1px solid #f5f5f7' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '10px', textTransform: 'uppercase' }}>Suggesties uit je bibliotheek:</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {allExistingLabels.map((l: string) => (
                          <button 
                            key={l} 
                            onClick={() => setLabels([...labels, l])}
                            style={{ 
                              background: '#f5f5f7', 
                              border: 'none', 
                              padding: '6px 14px', 
                              borderRadius: '10px', 
                              fontSize: '12px', 
                              cursor: 'pointer', 
                              color: 'var(--system-text)', 
                              fontWeight: '500',
                              transition: 'var(--transition-fast)' 
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--system-tertiary-bg)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#f5f5f7';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {viewMode === 'single' ? (
              <>
                <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
                  {questions.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentQuestionIndex(i)} 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', background: currentQuestionIndex === i ? 'var(--system-blue)' : 'white', color: currentQuestionIndex === i ? 'white' : 'var(--system-text)', border: '1px solid var(--system-border)', cursor: 'pointer' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    onClick={handleAddQuestion} 
                    disabled={hasSubmissions}
                    style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      background: 'white', border: '1px dashed var(--system-blue)', color: 'var(--system-blue)', cursor: 'pointer',
                      opacity: hasSubmissions ? 0.5 : 1
                    }}
                    title="Nieuwe vraag"
                  >
                    <Plus size={16}/>
                  </button>
                </nav>
                
                <QuestionEditor q={questions[currentQuestionIndex]} index={currentQuestionIndex} {...editorProps} />
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '40px' }}>
                  <button className="btn btn-secondary" style={{ padding: '12px 32px' }} disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}>Vorige</button>
                  <button className="btn btn-secondary" style={{ padding: '12px 32px' }} disabled={currentQuestionIndex === questions.length - 1} onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>Volgende</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {questions.map((q, i) => <QuestionEditor key={q.id} q={q} index={i} {...editorProps} />)}
                <button 
                  className="btn btn-secondary" 
                  onClick={handleAddQuestion} 
                  disabled={hasSubmissions}
                  style={{ 
                    padding: '24px', 
                    borderStyle: 'dashed', 
                    background: hasSubmissions ? '#f5f5f7' : 'rgba(0,102,204,0.02)', 
                    fontSize: '17px', 
                    fontWeight: '600',
                    cursor: hasSubmissions ? 'not-allowed' : 'pointer',
                    color: hasSubmissions ? '#86868b' : 'inherit',
                    opacity: hasSubmissions ? 0.6 : 1
                  }}
                  title={hasSubmissions ? "Kan geen vragen toevoegen: er zijn al inzendingen" : "Nieuwe vraag toevoegen"}
                >
                  <Plus size={20}/> {hasSubmissions ? 'Bewerken vergrendeld (inzendingen aanwezig)' : 'Nieuwe vraag toevoegen'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 40px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '56px' }}>
            <div><h1 style={{ margin: 0 }}>Toetsomgeving</h1><p className="text-muted" style={{ fontSize: '20px', fontWeight: '500', marginTop: '4px', letterSpacing: '-0.02em' }}>Beheer en deel je digitale sessies.</p></div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="file" id="import-json" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
              <label htmlFor="import-json" className="btn btn-secondary" style={{ height: '48px', padding: '0 28px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Upload size={20} /> Importeer JSON
              </label>
              <button className="btn" style={{ height: '48px', padding: '0 28px', fontSize: '16px' }} onClick={handleStartCreate}><Plus size={20} /> Nieuwe Toets</button>
            </div>
          </header>

          <div style={{ display: 'flex', gap: '32px', marginBottom: '40px', borderBottom: '1px solid var(--system-border-light)' }}>
            <button 
              style={{ padding: '12px 4px', fontSize: '16px', fontWeight: '700', border: 'none', background: 'none', borderBottom: activeTab === 'mine' ? '3px solid var(--system-blue)' : '3px solid transparent', color: activeTab === 'mine' ? 'var(--system-blue)' : 'var(--system-secondary-text)', cursor: 'pointer', transition: 'var(--transition-fast)' }}
              onClick={() => setActiveTab('mine')}
            >
              Mijn opdrachten
            </button>
            <button 
              style={{ padding: '12px 4px', fontSize: '16px', fontWeight: '700', border: 'none', background: 'none', borderBottom: activeTab === 'shared' ? '3px solid var(--system-blue)' : '3px solid transparent', color: activeTab === 'shared' ? 'var(--system-blue)' : 'var(--system-secondary-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'var(--transition-fast)' }}
              onClick={() => setActiveTab('shared')}
            >
              <Users size={18}/> Gedeeld door collega's
            </button>
            {isAdmin && (
              <button 
                style={{ padding: '12px 4px', fontSize: '16px', fontWeight: '700', border: 'none', background: 'none', borderBottom: activeTab === 'admin' ? '3px solid var(--system-blue)' : '3px solid transparent', color: activeTab === 'admin' ? 'var(--system-blue)' : 'var(--system-secondary-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'var(--transition-fast)' }}
                onClick={() => setActiveTab('admin')}
              >
                <Database size={18}/> Alle opdrachten (Admin)
              </button>
            )}
          </div>

          {allLabels.length > 0 && (
            <div className="filter-bar" style={{ marginBottom: '40px', padding: '6px' }}>
              <button onClick={() => setActiveFilters([])} className={`filter-item ${activeFilters.length === 0 ? 'active' : ''}`}>Alle</button>
              {allLabels.map((l: string) => <button key={l} onClick={() => toggleFilter(l)} className={`filter-item ${activeFilters.includes(l) ? 'active' : ''}`}>{l}</button>)}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {filteredExams.map(exam => {
              const total = exam.questions.reduce((s, q) => s + (q.type === 'image-analysis' ? (q.subQuestions?.reduce((ss, sq) => ss + sq.points, 0) || 0) : q.points), 0);
              const isOwn = activeTab === 'mine' || (activeTab === 'admin' && exam.teacher_id === user.id);
              const showTeacherInfo = activeTab === 'shared' || activeTab === 'admin';
              
              return (
                <div key={exam.id} className="card card-hoverable" style={{ padding: '24px', position: 'relative' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {exam.isShared && isOwn && <Share2 size={12} color="var(--system-blue)" />}
                        </div>
                        <h3 style={{ margin: '4px 0', fontSize: '20px', lineHeight: '1.2' }}>{exam.title}</h3>
                        {showTeacherInfo && (
                          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '240px', overflow: 'hidden' }}>
                            <p style={{ 
                              fontSize: '13px', 
                              color: 'var(--system-blue)', 
                              fontWeight: '700', 
                              margin: '2px 0',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'block'
                            }} title={exam.teacherName}>
                              {exam.teacherName}
                            </p>
                            {activeTab === 'admin' && exam.teacherEmail && (
                              <p style={{ 
                                fontSize: '11px', 
                                color: 'var(--system-secondary-text)', 
                                margin: '0 0 8px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block'
                              }} title={exam.teacherEmail}>
                                {exam.teacherEmail}
                              </p>
                            )}
                            {activeTab === 'admin' && (
                              <select 
                                className="input" 
                                style={{ padding: '4px 8px', fontSize: '12px', marginTop: '8px', height: 'auto', width: 'auto' }}
                                value={exam.teacher_id}
                                onChange={(e) => handleReassignTeacher(exam.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {allTeachers.map(t => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                        <p style={{ fontSize: '14px', color: 'var(--system-secondary-text)', fontWeight: '500', marginTop: '4px' }}>{exam.questions.length} vragen • {exam.isGraded ? `${total} pt` : 'Geen ptn'}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: exam.submissionCount > 0 ? 'var(--system-success)' : 'var(--system-tertiary-text)' }}></div>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--system-secondary-text)' }}>{exam.submissionCount} inzendingen</span>
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button className="btn-secondary" style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === exam.id ? null : exam.id); }}><MoreVertical size={18}/></button>
                        {openMenuId === exam.id && (
                          <div className="animate-up" style={{ position: 'absolute', top: '32px', right: 0, width: '220px', background: 'white', borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)', zIndex: 50, padding: '6px' }}>
                            {(isOwn || activeTab === 'admin') ? (
                              <>
                                <button style={{ ...dropdownItemStyle, color: 'var(--system-blue)', fontWeight: '700' }} onClick={() => handleStartLiveSessie(exam)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Play size={14}/> Start Live Sessie</button>
                                <div style={{ height: '1px', background: '#f5f5f7', margin: '4px 0' }} />
                                <button style={dropdownItemStyle} onClick={() => navigate(`/teacher/results/${exam.id}`)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><BarChart3 size={14}/> Inzendingen ({exam.submissionCount})</button>
                                <button style={dropdownItemStyle} onClick={() => handleQuickPreview(exam)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Eye size={14}/> Preview</button>
                                <button style={dropdownItemStyle} onClick={() => handleExportJSON(exam)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><FileJson size={14}/> Exporteer JSON</button>
                                <button style={dropdownItemStyle} onClick={() => handleDuplicate(exam)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Copy size={14}/> Kopieer</button>
                                <button style={dropdownItemStyle} onClick={() => handleToggleShare(exam)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Share2 size={14}/> {exam.isShared ? 'Niet meer delen' : 'Delen met collega\'s'}</button>
                                <button style={dropdownItemStyle} onClick={() => window.open(`/teacher/print/${exam.exam_key}`)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Printer size={14}/> Afdrukken</button>
                                <div style={{ height: '1px', background: '#f5f5f7', margin: '4px 0' }} />
                                <button style={dropdownItemStyle} onClick={() => handleStartEdit(exam)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Edit3 size={14}/> Bewerken</button>
                                <button style={{ ...dropdownItemStyle, color: '#ef4444' }} onClick={() => handleDelete(exam.id)} onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f2'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Trash2 size={14}/> Verwijderen</button>
                              </>
                            ) : (
                              <>
                                <button style={dropdownItemStyle} onClick={() => handleQuickPreview(exam)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Eye size={14}/> Bekijken (Preview)</button>
                                <button style={{ ...dropdownItemStyle, color: 'var(--system-blue)', fontWeight: '700' }} onClick={() => handleDuplicate(exam)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}><Copy size={14}/> Kopieer naar mijn opdrachten</button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {exam.labels?.map((l: string) => <span key={l} className="badge" style={{ fontSize: '10px', background: '#f5f5f7', border: 'none' }}>{l}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedExamForLive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card animate-up" style={{ maxWidth: '380px', width: '100%', padding: '32px', textAlign: 'center', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <Lock size={48} color="var(--system-blue)" style={{ margin: '0 auto 24px' }} />
            <h2 style={{ marginBottom: '8px', fontSize: '24px' }}>Sessie Starten</h2>
            <p style={{ color: '#86868b', fontSize: '15px', marginBottom: '24px' }}>Beveiliging instellen.</p>
            <div style={{ textAlign: 'left', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', borderRadius: '12px', background: '#f5f5f7' }}>
                <input type="checkbox" checked={requireFullscreen} onChange={e => setRequireFullscreen(e.target.checked)} />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Fullscreen verplichten</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', borderRadius: '12px', background: '#f5f5f7' }}>
                <input type="checkbox" checked={detectTabSwitch} onChange={e => setDetectTabSwitch(e.target.checked)} />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Tabbladwissel detecteren</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, borderRadius: '12px' }} onClick={() => setSelectedExamForLive(null)}>Annuleren</button>
              <button className="btn" style={{ flex: 2, borderRadius: '12px' }} onClick={confirmStartLiveSessie}>Start Nu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
