import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit3, ArrowLeft, Save, ChevronLeft, ChevronRight, X, Image as ImageIcon, MapPin, Database, Search, Copy, HardDrive, Lock, LayoutList, Layout, Eye, Printer, CheckCircle2, Circle } from 'lucide-react';

interface Location {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface DefinitionPair {
  id: string;
  definition: string;
  term: string;
}

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface SubQuestion {
  id: string;
  text: string;
  points: number;
}

interface Question {
  id: string;
  type: 'open' | 'multiple-choice' | 'true-false' | 'map' | 'definitions' | 'matching' | 'ordering' | 'image-analysis';
  text: string;
  points: number;
  options?: string[];
  correctAnswer: string;
  image?: string;
  locations?: Location[];
  pairs?: DefinitionPair[];
  matchingPairs?: MatchingPair[];
  orderItems?: string[];
  orderDirection?: 'vertical' | 'horizontal';
  subQuestions?: SubQuestion[];
  explainIfFalse?: boolean;
  labels?: string[];
}

interface Exam {
  id: string;
  title: string;
  exam_key: string;
  questions: Question[];
  labels: string[];
  type: 'taak' | 'toets' | 'examen' | 'formulier';
  isGraded: boolean;
  hasSubmissions: boolean;
  created_at: string;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');
  const [showBank, setShowBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [hasSubmissions, setHasSubmissions] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'taak' | 'toets' | 'examen' | 'formulier'>('examen');
  const [isGraded, setIsGraded] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState<string | null>(null);

  const allAvailableLabels = Array.from(new Set(exams.flatMap(e => e.labels || []))).sort();
  const allLabels = allAvailableLabels; // Gebruik dezelfde lijst voor filtering

  const toggleFilter = (label: string) => {
    setActiveFilters(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user.role !== 'teacher') {
      navigate('/login?role=teacher');
      return;
    }
    fetchExams();
  }, []);

  useEffect(() => {
    if (activeFilters.length > 0) {
      setFilteredExams(exams.filter(e => 
        activeFilters.every(filter => e.labels.includes(filter))
      ));
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
    setCurrentExamId(null);
    setHasSubmissions(false);
    setTitle('');
    setType('examen');
    setIsGraded(true);
    setLabels([]);
    const firstQ: Question = { id: Math.random().toString(36).substr(2, 9), type: 'open', text: '', points: 1, correctAnswer: '' };
    setQuestions([firstQ]);
    setCurrentQuestionIndex(0);
    setIsEditing(true);
  };

  const handleStartEdit = (exam: Exam) => {
    setCurrentExamId(exam.id);
    setHasSubmissions(exam.hasSubmissions);
    setTitle(exam.title);
    setType(exam.type || 'examen');
    setIsGraded(exam.isGraded !== undefined ? exam.isGraded : true);
    setQuestions(exam.questions);
    setLabels(exam.labels || []);
    setCurrentQuestionIndex(0);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit examen wilt verwijderen?')) return;
    try {
      await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      fetchExams();
    } catch (e) { alert('Verwijderen mislukt'); }
  };

  const handleDuplicate = async (exam: Exam) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teacherId: user.id, 
          title: `${exam.title} (kopie)`, 
          questions: exam.questions,
          labels: exam.labels,
          type: exam.type,
          isGraded: exam.isGraded
        }),
      });
      if (res.ok) fetchExams();
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleAddQuestion = () => {
    if (hasSubmissions) return;
    const newQ: Question = { id: Math.random().toString(36).substr(2, 9), type: 'open', text: '', points: 1, correctAnswer: '' };
    setQuestions([...questions, newQ]);
    setCurrentQuestionIndex(questions.length);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (hasSubmissions) return;
    if (questions.length <= 1) return alert("Een toets moet minstens 1 vraag hebben.");
    const newQs = questions.filter((_, i) => i !== idx);
    setQuestions(newQs);
    if (currentQuestionIndex >= newQs.length) setCurrentQuestionIndex(newQs.length - 1);
  };

  const handleImportFromBank = (q: Question) => {
    if (hasSubmissions) return;
    const importedQ = { ...q, id: Math.random().toString(36).substr(2, 9) };
    setQuestions([...questions, importedQ]);
    setCurrentQuestionIndex(questions.length);
    setShowBank(false);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    if (hasSubmissions) {
      const allowedUpdates: Partial<Question> = {};
      if ('points' in updates) allowedUpdates.points = updates.points;
      if ('correctAnswer' in updates) allowedUpdates.correctAnswer = updates.correctAnswer;
      if ('matchingPairs' in updates) allowedUpdates.matchingPairs = updates.matchingPairs;
      if ('orderItems' in updates) allowedUpdates.orderItems = updates.orderItems;
      if ('pairs' in updates) allowedUpdates.pairs = updates.pairs;
      if ('orderDirection' in updates) allowedUpdates.orderDirection = updates.orderDirection;
      if ('subQuestions' in updates) {
        const q = questions.find(x => x.id === id);
        if (q && q.subQuestions) {
          allowedUpdates.subQuestions = q.subQuestions.map((sq, i) => ({
            ...sq,
            points: updates.subQuestions![i].points
          }));
        }
      }
      setQuestions(questions.map(q => q.id === id ? { ...q, ...allowedUpdates } : q));
    } else {
      setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    }
  };

  const saveQuestionToBank = async (q: Question, forceNew = false) => {
    setIsSavingToBank(q.id);
    try {
      if (!forceNew) {
        const checkRes = await fetch(`/api/questions-bank/check/${q.id}`);
        const checkData = await checkRes.json();
        if (checkData.exists) {
          const choice = confirm('Deze vraag staat al in de vraagbank. Wilt u de bestaande vraag OVERSCHRIJVEN?\n\n(Annuleren om als een NIEUWE vraag op te slaan)');
          if (!choice) forceNew = true;
        }
      }
      const res = await fetch('/api/questions-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: user.id, question: q, labels, forceNew }),
      });
      if (res.ok) alert('Vraag succesvol opgeslagen in de bank!');
    } catch (e) { console.error(e); } finally { setIsSavingToBank(null); }
  };

  const handleSaveExam = async (stayInEditMode = false) => {
    let finalLabels = [...labels];
    if (labelInputRef.current && labelInputRef.current.value.trim()) {
      const pendingLabel = labelInputRef.current.value.trim();
      if (!finalLabels.includes(pendingLabel)) finalLabels.push(pendingLabel);
    }
    if (!title) return alert('Vul een titel in');
    setIsLoading(true);
    try {
      const method = currentExamId ? 'PUT' : 'POST';
      const url = currentExamId ? `/api/exams/${currentExamId}` : '/api/exams';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: user.id, title, questions, labels: finalLabels, type, isGraded }),
      });
      const data = await res.json();
      console.log('Save response:', data); // Debug log
      if (res.ok) { 
        if (!stayInEditMode) setIsEditing(false); 
        fetchExams(); 
        return data;
      } else {
        alert('Opslaan mislukt: ' + (data.error || 'Onbekende fout'));
      }
    } catch (e) { 
      console.error('Save error:', e); 
      alert('Er is een fout opgetreden bij het opslaan.');
    } finally { 
      setIsLoading(false); 
    }
  };

  const handlePreview = async () => {
    console.log('Preview clicked');
    // Open het venster onmiddellijk (voor pop-up blockers)
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('De preview kon niet worden geopend. Controleer of je browser pop-ups toestaat.');
      return;
    }
    newWindow.document.write('<html><head><title>Preview laden...</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f0f0f0;"><div><h2>Preview voorbereiden...</h2><p>Even geduld a.u.b.</p></div></body></html>');

    const data = await handleSaveExam(true);
    
    if (data && data.examKey) {
      sessionStorage.setItem('studentName', `PREVIEW - ${user.name}`);
      sessionStorage.setItem('studentKlas', 'PREVIEW');
      newWindow.location.href = `/exam/${data.examKey}?preview=true`;
    } else {
      newWindow.close();
      alert('Kon preview niet starten: er is geen sleutel ontvangen van de server.');
    }
  };

  const handleQuickPreview = (exam: Exam) => {
    sessionStorage.setItem('studentName', `PREVIEW - ${user.name}`);
    sessionStorage.setItem('studentKlas', 'PREVIEW');
    window.open(`/exam/${exam.exam_key}?preview=true`, '_blank');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleUpdateQuestion(qId, { image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent, qId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => handleUpdateQuestion(qId, { image: reader.result as string });
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>, q: Question) => {
    if (hasSubmissions) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newLocation: Location = { id: Math.random().toString(36).substr(2, 9), label: 'Nieuwe plaats', x, y };
    handleUpdateQuestion(q.id, { locations: [...(q.locations || []), newLocation] });
  };

  const QuestionEditor = ({ q, index }: { q: Question, index: number }) => (
    <div className="card animate-up" style={{ padding: '40px', marginBottom: viewMode === 'list' ? '40px' : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0 }}>Vraag {index + 1}</h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--system-secondary-text)' }}>{q.type}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => saveQuestionToBank(q)} disabled={isSavingToBank === q.id} style={{ padding: '8px 16px', fontSize: '13px' }}><HardDrive size={16}/> Sla op in bank</button>
          {!hasSubmissions && <button onClick={() => handleRemoveQuestion(index)} style={{ color: 'var(--system-error)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}><Trash2 size={20}/></button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <select className="input" value={q.type} disabled={hasSubmissions} onChange={e => {
          const type = e.target.value as any;
          const updates: any = { type, options: undefined, locations: undefined, pairs: undefined, matchingPairs: undefined, orderItems: undefined, subQuestions: undefined, image: undefined, correctAnswer: '' };
          if (type === 'multiple-choice') updates.options = ['', '', ''];
          if (type === 'definitions') updates.pairs = [{ id: '1', definition: '', term: '' }];
          if (type === 'matching') updates.matchingPairs = [{ id: '1', left: '', right: '' }];
          if (type === 'ordering') updates.orderItems = ['', ''];
          if (type === 'image-analysis') updates.subQuestions = [{ id: '1', text: '', points: 1 }];
          handleUpdateQuestion(q.id, updates);
        }}>
          <option value="open">Open vraag</option>
          <option value="multiple-choice">Meerkeuze</option>
          <option value="true-false">Waar / Onwaar</option>
          <option value="map">Kaart / Sleepvraag</option>
          <option value="definitions">Definities-tabel</option>
          <option value="matching">Verbinden (Matching)</option>
          <option value="ordering">Juiste volgorde</option>
          <option value="image-analysis">Afbeelding analyse</option>
        </select>
        <input type="number" className="input" value={q.points} onChange={e => handleUpdateQuestion(q.id, { points: parseInt(e.target.value) || 0 })} disabled={q.type === 'image-analysis'} />
      </div>

      <textarea className="input" value={q.text} disabled={hasSubmissions} onChange={e => handleUpdateQuestion(q.id, { text: e.target.value })} placeholder="Stel je vraag hier..." rows={3} style={{ fontSize: '19px', marginBottom: '32px' }}/>

      {q.type === 'multiple-choice' && (
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--system-secondary-text)', marginBottom: '16px' }}>OPTIES</label>
          {q.options?.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
              <div onClick={() => handleUpdateQuestion(q.id, { correctAnswer: opt })} style={{ cursor: 'pointer', color: q.correctAnswer === opt && opt !== '' ? 'var(--system-success)' : 'var(--system-border)' }}>
                {q.correctAnswer === opt && opt !== '' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </div>
              <input className="input" value={opt} disabled={hasSubmissions} onChange={e => {
                const newOpts = [...(q.options || [])];
                const oldVal = newOpts[idx];
                newOpts[idx] = e.target.value;
                const updates: any = { options: newOpts };
                if (q.correctAnswer === oldVal) updates.correctAnswer = e.target.value;
                handleUpdateQuestion(q.id, updates);
              }} />
            </div>
          ))}
        </div>
      )}

      {q.type === 'true-false' && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {['Waar', 'Onwaar'].map(opt => (
              <button key={opt} onClick={() => handleUpdateQuestion(q.id, { correctAnswer: opt })} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid', borderColor: q.correctAnswer === opt ? 'var(--system-blue)' : 'var(--system-border)', background: q.correctAnswer === opt ? 'var(--system-blue)' : 'white', color: q.correctAnswer === opt ? 'white' : 'var(--system-text)', cursor: 'pointer', fontWeight: '600', fontSize: '17px', transition: 'all 0.2s' }}>{opt}</button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
            <input type="checkbox" disabled={hasSubmissions} checked={q.explainIfFalse || false} onChange={(e) => handleUpdateQuestion(q.id, { explainIfFalse: e.target.checked })} style={{ width: '18px', height: '18px' }} />
            Indien onwaar, leg uit waarom
          </label>
        </div>
      )}

      {q.type === 'map' && (
        <div style={{ marginBottom: '32px' }}>
          {!q.image ? (
            <div style={{ border: '2px dashed var(--system-border)', borderRadius: '20px', padding: '60px', textAlign: 'center', background: 'white' }} onPaste={(e) => !hasSubmissions && handlePaste(e, q.id)} tabIndex={0}>
              <ImageIcon size={48} color="var(--system-secondary-text)" />
              <p>Upload kaart of plak direct</p>
              <input type="file" accept="image/*" disabled={hasSubmissions} onChange={(e) => handleImageUpload(e, q.id)} />
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', cursor: hasSubmissions ? 'default' : 'crosshair' }} onClick={(e) => handleMapClick(e, q)}>
                <img src={q.image} style={{ width: '100%', display: 'block' }} />
                {q.locations?.map(loc => (
                  <div key={loc.id} style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'var(--system-blue)', padding: '4px 8px', borderRadius: '6px', color: 'white', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{loc.label}</div>
                    <MapPin size={20} color="var(--system-blue)" fill="white" />
                  </div>
                ))}
              </div>
              {!hasSubmissions && (
                <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {q.locations?.map(loc => (
                    <div key={loc.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--system-secondary-bg)', padding: '8px 12px', borderRadius: '10px' }}>
                      <input className="input" style={{ padding: '4px', fontSize: '13px', width: '120px' }} value={loc.label} onChange={e => {
                        const newLocs = q.locations?.map(l => l.id === loc.id ? { ...l, label: e.target.value } : l);
                        handleUpdateQuestion(q.id, { locations: newLocs });
                      }} />
                      <button onClick={() => handleUpdateQuestion(q.id, { locations: q.locations?.filter(l => l.id !== loc.id) })} style={{ color: 'var(--system-error)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {q.type === 'definitions' && (
        <div style={{ marginBottom: '32px' }}>
          {q.pairs?.map((pair, idx) => (
            <div key={pair.id} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input className="input" style={{ flex: 2 }} placeholder="Definitie" value={pair.definition} disabled={hasSubmissions} onChange={e => {
                const newPairs = [...(q.pairs || [])];
                newPairs[idx].definition = e.target.value;
                handleUpdateQuestion(q.id, { pairs: newPairs });
              }}/>
              <input className="input" style={{ flex: 1 }} placeholder="Term" value={pair.term} onChange={e => {
                const newPairs = [...(q.pairs || [])];
                newPairs[idx].term = e.target.value;
                handleUpdateQuestion(q.id, { pairs: newPairs });
              }}/>
              {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { pairs: q.pairs?.filter(p => p.id !== pair.id) })}><Trash2 size={16}/></button>}
            </div>
          ))}
          {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { pairs: [...(q.pairs || []), { id: Math.random().toString(), definition: '', term: '' }] })}><Plus size={16}/> Rij toevoegen</button>}
        </div>
      )}

      {q.type === 'matching' && (
        <div style={{ marginBottom: '32px' }}>
          {q.matchingPairs?.map((pair, idx) => (
            <div key={pair.id} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input className="input" placeholder="Links" value={pair.left} disabled={hasSubmissions} onChange={e => {
                const newPairs = [...(q.matchingPairs || [])];
                newPairs[idx].left = e.target.value;
                handleUpdateQuestion(q.id, { matchingPairs: newPairs });
              }}/>
              <input className="input" placeholder="Rechts" value={pair.right} onChange={e => {
                const newPairs = [...(q.matchingPairs || [])];
                newPairs[idx].right = e.target.value;
                handleUpdateQuestion(q.id, { matchingPairs: newPairs });
              }}/>
              {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { matchingPairs: q.matchingPairs?.filter(p => p.id !== pair.id) })}><Trash2 size={16}/></button>}
            </div>
          ))}
          {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { matchingPairs: [...(q.matchingPairs || []), { id: Math.random().toString(), left: '', right: '' }] })}><Plus size={16}/> Paar toevoegen</button>}
        </div>
      )}

      {q.type === 'ordering' && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--system-secondary-text)', marginBottom: '12px' }}>ORIËNTATIE</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['vertical', 'horizontal'].map(dir => (
                <button key={dir} className="btn btn-secondary" style={{ flex: 1, textTransform: 'capitalize', borderColor: (q.orderDirection || 'vertical') === dir ? 'var(--system-blue)' : 'var(--system-border)', background: (q.orderDirection || 'vertical') === dir ? 'var(--system-secondary-bg)' : 'white' }} onClick={() => handleUpdateQuestion(q.id, { orderDirection: dir as any })}>{dir === 'vertical' ? 'Verticaal' : 'Horizontaal'}</button>
              ))}
            </div>
          </div>
          {q.orderItems?.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', width: '20px' }}>{idx + 1}.</span>
              <input className="input" value={item} onChange={e => {
                const newItems = [...(q.orderItems || [])];
                newItems[idx] = e.target.value;
                handleUpdateQuestion(q.id, { orderItems: newItems });
              }}/>
              {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { orderItems: q.orderItems?.filter((_, i) => i !== idx) })}><Trash2 size={16}/></button>}
            </div>
          ))}
          {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { orderItems: [...(q.orderItems || []), ''] })}><Plus size={16}/> Item toevoegen</button>}
        </div>
      )}

      {q.type === 'image-analysis' && (
        <div style={{ marginBottom: '32px' }}>
          {!q.image ? (
            <div className="card" style={{ border: '2px dashed var(--system-border)', textAlign: 'center', padding: '40px' }} onPaste={(e) => !hasSubmissions && handlePaste(e, q.id)} tabIndex={0}>
              <ImageIcon size={48} color="var(--system-secondary-text)" /><p>Upload afbeelding of plak direct</p><input type="file" accept="image/*" disabled={hasSubmissions} onChange={(e) => handleImageUpload(e, q.id)} />
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <img src={q.image} style={{ width: '100%', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }} />
                {!hasSubmissions && <button className="btn btn-secondary" style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)' }} onClick={() => handleUpdateQuestion(q.id, { image: undefined })}>Andere afbeelding</button>}
              </div>
              {q.subQuestions?.map((sq, idx) => (
                <div key={sq.id} className="card" style={{ marginBottom: '12px', padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 40px', gap: '12px' }}>
                    <input className="input" placeholder="Vraag..." value={sq.text} disabled={hasSubmissions} onChange={e => {
                      const newSq = [...(q.subQuestions || [])];
                      newSq[idx].text = e.target.value;
                      handleUpdateQuestion(q.id, { subQuestions: newSq });
                    }}/>
                    <input className="input" type="number" value={sq.points} onChange={e => {
                      const newSq = [...(q.subQuestions || [])];
                      newSq[idx].points = parseInt(e.target.value) || 0;
                      handleUpdateQuestion(q.id, { subQuestions: newSq });
                    }}/>
                    {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { subQuestions: q.subQuestions?.filter(s => s.id !== sq.id) })}><Trash2 size={16}/></button>}
                  </div>
                </div>
              ))}
              {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { subQuestions: [...(q.subQuestions || []), { id: Math.random().toString(), text: '', points: 1 }] })}><Plus size={16}/> Vraag toevoegen</button>}
            </div>
          )}
        </div>
      )}
      
      {q.type === 'open' && (
        <div style={{ padding: '24px', background: 'var(--system-secondary-bg)', borderRadius: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px' }}>CORRECT ANTWOORD / FEEDBACK</label>
          <input className="input" value={q.correctAnswer} onChange={e => handleUpdateQuestion(q.id, { correctAnswer: e.target.value })} style={{ border: 'none', padding: 0, background: 'none' }} placeholder="Typ hier de verwachte tekst..." />
        </div>
      )}
    </div>
  );

  if (isEditing) {
    const q = questions[currentQuestionIndex];

    return (
      <div className="animate-up" style={{ padding: '40px 0' }}>
        {showBank && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
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

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
          <button className="btn btn-secondary" onClick={() => setIsEditing(false)}><ArrowLeft size={16} /> Terug</button>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '24px' }}>{currentExamId ? 'Toets bewerken' : 'Nieuwe toets'}</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '14px' }}>{title || 'Zonder titel'}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setViewMode(viewMode === 'single' ? 'list' : 'single')}>
              {viewMode === 'single' ? <LayoutList size={16}/> : <Layout size={16}/>}
              {viewMode === 'single' ? 'Lijstweergave' : 'Stapsgewijs'}
            </button>
            {!hasSubmissions && <button className="btn btn-secondary" onClick={fetchBank}><Database size={16}/> Vraagbank</button>}
            <button className="btn btn-secondary" onClick={handlePreview} disabled={isLoading}><Eye size={16}/> Preview</button>
            <button className="btn" onClick={() => handleSaveExam()} disabled={isLoading}><Save size={16} /> Bewaar</button>
          </div>
        </header>

        {hasSubmissions && (
          <div className="card" style={{ marginBottom: '2.5rem', background: 'var(--system-secondary-bg)', border: '1px solid var(--system-blue)', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px' }}>
            <Lock size={20} color="var(--system-blue)" />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>Deze toets heeft al inzendingen. De structuur is vergrendeld. U kunt wel punten en antwoorden wijzigen.</p>
          </div>
        )}

        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <section className="card" style={{ marginBottom: '40px', background: 'var(--system-secondary-bg)', border: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px' }}>TITEL</label>
                <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Naam van de opdracht..." disabled={hasSubmissions} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px' }}>TYPE OPDRACHT</label>
                <select className="input" value={type} onChange={e => setType(e.target.value as any)} disabled={hasSubmissions}>
                  <option value="taak">Taak</option>
                  <option value="toets">Toets</option>
                  <option value="examen">Examen</option>
                  <option value="formulier">Formulier</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px' }}>PUNTEN</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid var(--system-border)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isGraded} onChange={e => setIsGraded(e.target.checked)} disabled={hasSubmissions} style={{ width: '20px', height: '20px' }} />
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>Op punten staan</span>
                </label>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px' }}>LABELS (VOOR FILTERING & BANK)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', background: 'white', borderRadius: '12px', border: '1px solid var(--system-border)', minHeight: '46px', alignItems: 'center', marginBottom: '8px' }}>
                  {labels.map(l => (
                    <span key={l} className="badge" style={{ background: 'var(--system-text)', color: 'white', border: 'none' }}>
                      {l} <button onClick={() => !hasSubmissions && setLabels(labels.filter(x => x !== l))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }} disabled={hasSubmissions}><X size={12}/></button>
                    </span>
                  ))}
                  {!hasSubmissions && <input ref={labelInputRef} placeholder="Label..." style={{ border: 'none', outline: 'none', fontSize: '14px', flex: 1, minWidth: '60px' }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val && !labels.includes(val)) { setLabels([...labels, val]); (e.target as HTMLInputElement).value = ''; } } }} />}
                </div>
                {allAvailableLabels.length > 0 && !hasSubmissions && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {allAvailableLabels.filter(l => !labels.includes(l)).map(l => (
                      <button key={l} onClick={() => setLabels([...labels, l])} style={{ background: 'var(--system-secondary-bg)', border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', color: 'var(--system-secondary-text)' }}>+ {l}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {viewMode === 'single' ? (
            <>
              <nav style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
                {questions.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentQuestionIndex(idx)} className={`nav-dot ${currentQuestionIndex === idx ? 'active' : ''}`} />
                ))}
                {!hasSubmissions && <button className="nav-dot" onClick={handleAddQuestion} style={{ background: 'none', color: 'var(--system-blue)' }}><Plus size={16}/></button>}
              </nav>
              {q && <QuestionEditor q={q} index={currentQuestionIndex} />}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '40px' }}>
                <button className="btn btn-secondary" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}><ChevronLeft size={16} /> Vorige</button>
                <button className="btn btn-secondary" disabled={currentQuestionIndex === questions.length - 1} onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>Volgende <ChevronRight size={16} /></button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {questions.map((question, idx) => <QuestionEditor key={question.id} q={question} index={idx} />)}
              {!hasSubmissions && <button className="btn btn-secondary" style={{ padding: '20px', border: '2px dashed var(--system-border)', background: 'white' }} onClick={handleAddQuestion}><Plus size={20} /> Nieuwe vraag toevoegen</button>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-up" style={{ padding: '80px 0' }}>
      <header style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ margin: 0 }}>Mijn toetsen</h1>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <p className="text-muted" style={{ margin: 0, fontSize: '17px' }}>Welkom, <strong>{user.name}</strong></p>
            <button className="btn btn-secondary" onClick={() => navigate('/teacher/bank')}><Database size={18}/> Vraagbank</button>
            <button className="btn" onClick={handleStartCreate} style={{ fontSize: '17px', padding: '12px 24px' }}><Plus size={20} /> Nieuw</button>
            <button onClick={() => { sessionStorage.clear(); navigate('/'); }} style={{ background: 'none', border: 'none', color: 'var(--system-blue)', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Log uit</button>
          </div>
        </div>
      </header>

      {allLabels.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div className="filter-bar">
            <div className={`filter-item ${activeFilters.length === 0 ? 'active' : ''}`} onClick={() => setActiveFilters([])}>Alle</div>
            {allLabels.map(l => (
              <div key={l} className={`filter-item ${activeFilters.includes(l) ? 'active' : ''}`} onClick={() => toggleFilter(l)}>{l}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '40px' }}>
        {filteredExams.map(exam => {
          const totalPoints = exam.questions.reduce((sum, q) => sum + (q.type === 'image-analysis' && q.subQuestions ? q.subQuestions.reduce((s, sq) => s + (sq.points || 0), 0) : (q.points || 0)), 0);
          return (
            <div key={exam.id} className="card card-hoverable">
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge" style={{ background: 'var(--system-blue)', color: 'white', border: 'none', textTransform: 'uppercase', fontSize: '10px' }}>{exam.type || 'examen'}</span>
                  {exam.hasSubmissions && <Lock size={14} color="var(--system-secondary-text)"/>}
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>{exam.title}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                  {exam.questions.length} vragen • {exam.isGraded ? `${totalPoints} punten` : 'Niet op punten'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '32px' }}>
                {exam.labels?.map(l => (
                  <span 
                    key={l} 
                    className="badge" 
                    onClick={(e) => { e.stopPropagation(); toggleFilter(l); }} 
                    style={{ cursor: 'pointer', background: activeFilters.includes(l) ? 'var(--system-blue)' : 'var(--system-secondary-bg)', color: activeFilters.includes(l) ? 'white' : 'inherit' }}
                  >
                    {l}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="btn" onClick={() => navigate(`/teacher/live/${exam.exam_key}`)}>Start Live sessie</button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate(`/teacher/results/${exam.id}`)}>Resultaten</button>
                  <button className="btn btn-secondary" style={{ padding: '8px 12px' }} title="Preview" onClick={() => handleQuickPreview(exam)}><Eye size={16}/></button>
                  <button className="btn btn-secondary" style={{ padding: '8px 12px' }} title="Afdrukken" onClick={() => window.open(`/teacher/print/${exam.exam_key}`, '_blank')}><Printer size={16}/></button>
                  <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => handleStartEdit(exam)}><Edit3 size={16}/></button>
                  <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => handleDuplicate(exam)}><Copy size={16}/></button>
                  <button className="btn btn-danger" style={{ padding: '8px 12px' }} onClick={() => handleDelete(exam.id)}><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
