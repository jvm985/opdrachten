import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit3, ArrowLeft, Save, X, Database, Search, Copy, Eye, Printer, Play, BarChart3, MoreVertical, Lock } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { QuestionEditor } from '../components/QuestionEditor';
import type { Question, Exam } from '../types';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode] = useState<'single' | 'list'>('single');
  const [showBank, setShowBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [hasSubmissions, setHasSubmissions] = useState(false);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'taak' | 'toets' | 'examen' | 'formulier'>('examen');
  const [isGraded, setIsGraded] = useState(true);
  const [requireFullscreen, setRequireFullscreen] = useState(true);
  const [detectTabSwitch, setDetectTabSwitch] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState<string | null>(null);

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
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user.role !== 'teacher') { navigate('/login'); return; }
    fetchExams();
  }, []);

  useEffect(() => {
    if (activeFilters.length > 0) {
      setFilteredExams(exams.filter(e => activeFilters.every(filter => e.labels.includes(filter))));
    } else {
      setFilteredExams(exams);
    }
  }, [activeFilters, exams]);

  const fetchExams = async () => {
    try {
      const res = await fetch(`/api/teacher/exams?teacherId=${user.id}`);
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchBank = async () => {
    try {
      const res = await fetch(`/api/questions-bank?teacherId=${user.id}`);
      const data = await res.json();
      setBankQuestions(Array.isArray(data) ? data : []);
      setShowBank(true);
    } catch (e) { console.error(e); }
  };

  const handleStartCreate = () => {
    setCurrentExamId(null); setHasSubmissions(false); setTitle(''); setType('examen'); setIsGraded(true); 
    setRequireFullscreen(true); setDetectTabSwitch(true); setLabels([]);
    setQuestions([{ id: Math.random().toString(36).substr(2, 9), type: 'open', text: '', points: 1, correctAnswer: '' }]);
    setCurrentQuestionIndex(0); setIsEditing(true);
  };

  const handleStartEdit = (exam: Exam) => {
    setCurrentExamId(exam.id); setHasSubmissions(exam.hasSubmissions); setTitle(exam.title);
    setType(exam.type || 'examen'); setIsGraded(exam.isGraded !== undefined ? exam.isGraded : true);
    setRequireFullscreen(exam.requireFullscreen !== undefined ? exam.requireFullscreen : true);
    setDetectTabSwitch(exam.detectTabSwitch !== undefined ? exam.detectTabSwitch : true);
    setQuestions(exam.questions); setLabels(exam.labels || []); setCurrentQuestionIndex(0); setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Verwijderen?')) return;
    try { await fetch(`/api/exams/${id}`, { method: 'DELETE' }); fetchExams(); } catch (e) { }
  };

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleSaveExam = async (stayInEditMode = false) => {
    if (!title) return alert('Titel verplicht');
    setIsLoading(true);
    try {
      const method = currentExamId ? 'PUT' : 'POST';
      const url = currentExamId ? `/api/exams/${currentExamId}` : '/api/exams';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: user.id, title, questions, labels, type, isGraded, requireFullscreen, detectTabSwitch }),
      });
      const data = await res.json();
      if (res.ok) { if (!stayInEditMode) setIsEditing(false); fetchExams(); return data; }
    } catch (e) { } finally { setIsLoading(false); }
  };

  const getStudentBaseUrl = () => {
    return window.location.hostname === 'localhost' ? 'http://localhost:5174' : 'http://student.irishof.cloud';
  };

  const handlePreview = async () => {
    const data = await handleSaveExam(true);
    if (data && data.examKey) window.open(`${getStudentBaseUrl()}/exam/${data.examKey}?preview=true`, '_blank');
  };

  const handleQuickPreview = (exam: Exam) => {
    window.open(`${getStudentBaseUrl()}/exam/${exam.exam_key}?preview=true`, '_blank');
  };

  const handleAddQuestion = () => {
    if (hasSubmissions) return;
    const newQ: Question = { id: Math.random().toString(36).substr(2, 9), type: 'open', text: '', points: 1, correctAnswer: '' };
    setQuestions([...questions, newQ]); setCurrentQuestionIndex(questions.length);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (hasSubmissions || questions.length <= 1) return;
    const newQs = questions.filter((_, i) => i !== idx);
    setQuestions(newQs); if (currentQuestionIndex >= newQs.length) setCurrentQuestionIndex(newQs.length - 1);
  };

  const handleImportFromBank = (q: Question) => {
    if (hasSubmissions) return;
    setQuestions([...questions, { ...q, id: Math.random().toString(36).substr(2, 9) }]);
    setCurrentQuestionIndex(questions.length); setShowBank(false);
  };

  const saveQuestionToBank = async (q: Question, forceNew = false) => {
    if (!confirm('Wilt u deze vraag kopiëren naar uw persoonlijke vraagbank?')) return;
    setIsSavingToBank(q.id);
    try {
      const res = await fetch('/api/questions-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: user.id, question: q, labels, forceNew }),
      });
      if (res.ok) alert('Vraag succesvol gekopieerd naar de vraagbank!');
    } catch (e) { } finally { setIsSavingToBank(null); }
  };

  const handleDuplicate = async (exam: Exam) => {
    try {
      setIsLoading(true);
      await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: user.id, title: `${exam.title} (kopie)`, questions: exam.questions, labels: exam.labels, type: exam.type, isGraded: exam.isGraded, requireFullscreen: exam.requireFullscreen, detectTabSwitch: exam.detectTabSwitch }),
      });
      fetchExams();
    } catch (e) { } finally { setIsLoading(false); }
  };

  const handleStartLiveSessie = (exam: Exam) => {
    setRequireFullscreen(exam.requireFullscreen ?? true);
    setDetectTabSwitch(exam.detectTabSwitch ?? true);
    setSelectedExamForLive(exam);
  };

  const confirmStartLiveSessie = async () => {
    if (!selectedExamForLive) return;
    await fetch(`/api/exams/${selectedExamForLive.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selectedExamForLive, requireFullscreen, detectTabSwitch }),
    });
    navigate(`/teacher/live/${selectedExamForLive.exam_key}`);
    setSelectedExamForLive(null);
  };

  const handleMapClick = (e: React.MouseEvent, q: Question) => {
    if (hasSubmissions) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    handleUpdateQuestion(q.id, { locations: [...(q.locations || []), { id: Math.random().toString(36).substr(2, 9), label: 'Nieuw', x, y }] });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleUpdateQuestion(qId, { image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const allLabels = Array.from(new Set(exams.flatMap(e => e.labels || []))).sort();
  const toggleFilter = (label: string) => {
    setActiveFilters(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const editorProps = {
    viewMode, hasSubmissions, isSavingToBank, handleRemoveQuestion, handleUpdateQuestion, handleMapClick, handleImageUpload, saveQuestionToBank
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: '72px' }}>
      <TopNav isEditing={isEditing} user={user} />
      
      {isEditing ? (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 20px' }}>
          {showBank && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <div className="card animate-up" style={{ width: '100%', maxWidth: '800px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0 }}>Vraagbank</h2>
                  <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => setShowBank(false)}><X size={20}/></button>
                </div>
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--system-secondary-text)' }} />
                  <input className="input" style={{ paddingLeft: '40px' }} placeholder="Zoek op tekst of label..." value={bankSearch} onChange={e => setBankSearch(e.target.value)} />
                </div>
                <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                  {bankQuestions.filter(bq => bq.text.toLowerCase().includes(bankSearch.toLowerCase()) || bq.labels?.some(l => l.toLowerCase().includes(bankSearch.toLowerCase()))).map(bq => (
                    <div key={bq.id} className="card card-hoverable" style={{ padding: '16px', marginBottom: '12px', border: '1px solid var(--system-border)', background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                            <span className="badge" style={{ fontSize: '10px' }}>{bq.type}</span>
                            {bq.labels?.map(l => <span key={l} className="badge" style={{ fontSize: '10px', background: 'var(--system-blue)', color: 'white', border: 'none' }}>{l}</span>)}
                          </div>
                          <p style={{ margin: 0, fontWeight: '500' }}>{bq.text}</p>
                        </div>
                        <button className="btn" style={{ height: '40px' }} onClick={() => handleImportFromBank(bq)}><Plus size={16}/> Voeg toe</button>
                      </div>
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
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={fetchBank} style={{ borderRadius: '12px', padding: '10px 20px' }}>
                <Database size={18} style={{ marginRight: '8px' }}/> Vraagbank
              </button>
              <button className="btn btn-secondary" onClick={handlePreview} disabled={isLoading} style={{ borderRadius: '12px', padding: '10px 20px' }}>
                <Eye size={18} style={{ marginRight: '8px' }}/> Preview
              </button>
              <button className="btn" onClick={() => handleSaveExam()} disabled={isLoading} style={{ borderRadius: '12px', padding: '10px 24px' }}>
                <Save size={18} style={{ marginRight: '8px' }}/> Opslaan
              </button>
            </div>
          </header>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#86868b', marginBottom: '8px', textTransform: 'uppercase' }}>Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value as any)}><option value="taak">Taak</option><option value="toets">Toets</option><option value="examen">Examen</option><option value="formulier">Formulier</option></select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#86868b', marginBottom: '8px', textTransform: 'uppercase' }}>Punten</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '8px 16px', borderRadius: '10px', border: '1px solid #d2d2d7', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked={isGraded} onChange={e => setIsGraded(e.target.checked)} /><span>Op punten</span>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {viewMode === 'single' ? (
              <>
                <nav style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
                  {questions.map((_, i) => <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`nav-dot ${currentQuestionIndex === i ? 'active' : ''}`} />)}
                  <button className="nav-dot" onClick={handleAddQuestion} style={{ color: 'var(--system-blue)' }}><Plus size={14}/></button>
                </nav>
                {questions[currentQuestionIndex] && <QuestionEditor q={questions[currentQuestionIndex]} index={currentQuestionIndex} {...editorProps} />}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '32px' }}>
                  <button className="btn btn-secondary" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}>Vorige</button>
                  <button className="btn btn-secondary" disabled={currentQuestionIndex === questions.length - 1} onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>Volgende</button>
                </div>
              </>
            ) : (
              questions.map((q, i) => <QuestionEditor key={q.id} q={q} index={i} {...editorProps} />)
            )}
            {!hasSubmissions && viewMode === 'list' && <button className="btn btn-secondary" onClick={handleAddQuestion}><Plus size={20}/> Vraag toevoegen</button>}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 40px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
            <div><h1 style={{ fontSize: '48px', fontWeight: '700', margin: 0, letterSpacing: '-1.5px' }}>Mijn opdrachten</h1><p className="text-muted" style={{ fontSize: '19px', marginTop: '4px' }}>Beheer je digitale sessies.</p></div>
            <button className="btn" style={{ borderRadius: '24px', padding: '12px 24px', fontSize: '16px', fontWeight: '600' }} onClick={handleStartCreate}><Plus size={18} /> Nieuwe Toets</button>
          </header>

          {allLabels.length > 0 && (
            <div style={{ marginBottom: '32px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveFilters([])} style={{ border: 'none', background: activeFilters.length === 0 ? '#0071e3' : 'white', color: activeFilters.length === 0 ? 'white' : '#1d1d1f', padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>Alle</button>
              {allLabels.map(l => <button key={l} onClick={() => toggleFilter(l)} style={{ border: 'none', background: activeFilters.includes(l) ? '#0071e3' : 'white', color: activeFilters.includes(l) ? 'white' : '#1d1d1f', padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{l}</button>)}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredExams.map(exam => {
              const total = exam.questions.reduce((s, q) => s + (q.type === 'image-analysis' ? (q.subQuestions?.reduce((ss, sq) => ss + sq.points, 0) || 0) : q.points), 0);
              return (
                <div key={exam.id} className="card card-hoverable" style={{ padding: '20px', display: 'flex', flexDirection: 'column', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.05)', background: 'white', position: 'relative' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{exam.type}</span>
                        <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '600', lineHeight: '1.2' }}>{exam.title}</h3>
                        <p style={{ fontSize: '13px', color: '#86868b', margin: '4px 0 0' }}>{exam.questions.length} vragen • {exam.isGraded ? `${total} pt` : 'Geen ptn'} • {exam.submissionCount} inzendingen</p>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button className="btn btn-secondary" style={{ padding: '4px', borderRadius: '50%', width: '28px', height: '28px' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === exam.id ? null : exam.id); }}><MoreVertical size={16}/></button>
                        {openMenuId === exam.id && (
                          <div className="animate-up" style={{ position: 'absolute', top: '32px', right: 0, width: '220px', background: 'white', borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)', zIndex: 50, padding: '6px' }}>
                            <button 
                              style={{ ...dropdownItemStyle, color: 'var(--system-blue)', fontWeight: '700' }} 
                              onClick={() => handleStartLiveSessie(exam)}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Play size={14}/> Start Live Sessie
                            </button>
                            <div style={{ height: '1px', background: '#f5f5f7', margin: '4px 0' }} />
                            <button 
                              style={dropdownItemStyle} 
                              onClick={() => navigate(`/teacher/results/${exam.id}`)}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <BarChart3 size={14}/> Inzendingen ({exam.submissionCount})
                            </button>
                            <button 
                              style={dropdownItemStyle} 
                              onClick={() => handleQuickPreview(exam)}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Eye size={14}/> Preview
                            </button>
                            <button 
                              style={dropdownItemStyle} 
                              onClick={() => handleDuplicate(exam)}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Copy size={14}/> Kopieer
                            </button>
                            <button 
                              style={dropdownItemStyle} 
                              onClick={() => window.open(`/teacher/print/${exam.exam_key}`)}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Printer size={14}/> Afdrukken
                            </button>
                            <div style={{ height: '1px', background: '#f5f5f7', margin: '4px 0' }} />
                            <button 
                              style={dropdownItemStyle} 
                              onClick={() => handleStartEdit(exam)}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--system-secondary-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Edit3 size={14}/> Bewerken
                            </button>
                            <button 
                              style={{ ...dropdownItemStyle, color: '#ef4444' }} 
                              onClick={() => handleDelete(exam.id)}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f2'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Trash2 size={14}/> Verwijderen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {exam.labels?.map(l => <span key={l} className="badge" style={{ fontSize: '10px', background: '#f5f5f7', border: 'none' }}>{l}</span>)}
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
