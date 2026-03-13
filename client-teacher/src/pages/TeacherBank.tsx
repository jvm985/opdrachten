import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Search, Edit3, Save } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { QuestionEditor } from '../components/QuestionEditor';
import type { Question } from '../types';

export default function TeacherBank() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Editing state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user.role !== 'teacher') { navigate('/login'); return; }
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const res = await fetch(`/api/questions-bank?teacherId=${user.id}`);
    const data = await res.json();
    setQuestions(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vraag verwijderen uit bank?')) return;
    await fetch(`/api/questions-bank/${id}`, { method: 'DELETE' });
    fetchQuestions();
  };

  const handleStartEdit = (q: Question) => {
    setEditingQuestion({ ...q });
  };

  const handleUpdateEditingQuestion = (id: string, updates: Partial<Question>) => {
    if (editingQuestion && editingQuestion.id === id) {
      setEditingQuestion({ ...editingQuestion, ...updates });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/questions-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teacherId: user.id, 
          question: editingQuestion, 
          labels: editingQuestion.labels, 
          forceNew: false 
        }),
      });
      if (res.ok) {
        alert('Vraag bijgewerkt!');
        setEditingQuestion(null);
        fetchQuestions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const allLabels = Array.from(new Set(questions.flatMap(q => q.labels || []))).sort();

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilters.length === 0 || activeFilters.every(f => q.labels?.includes(f));
    return matchesSearch && matchesFilter;
  });

  const toggleFilter = (label: string) => {
    setActiveFilters(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const handleMapClick = (e: React.MouseEvent, q: Question) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newLocation = { id: Math.random().toString(36).substr(2, 9), label: 'Nieuw', x, y };
    handleUpdateEditingQuestion(q.id, { locations: [...(q.locations || []), newLocation] });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleUpdateEditingQuestion(qId, { image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: '72px' }}>
      <TopNav user={user} />
      
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px' }}>
        {editingQuestion ? (
          <div className="animate-up">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={() => setEditingQuestion(null)}><ArrowLeft size={20}/></button>
                <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0 }}>Vraag bewerken</h1>
              </div>
              <button className="btn" onClick={handleSaveEdit} disabled={isSaving}>
                <Save size={18} style={{ marginRight: '8px' }} /> {isSaving ? 'Bezig...' : 'Opslaan in bank'}
              </button>
            </header>

            <QuestionEditor 
              q={editingQuestion} 
              handleUpdateQuestion={handleUpdateEditingQuestion}
              handleMapClick={handleMapClick}
              handleImageUpload={handleImageUpload}
              showBankButton={false}
              showRemoveButton={false}
            />
          </div>
        ) : (
          <>
            <header style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '48px', fontWeight: '700', margin: 0, letterSpacing: '-1.5px' }}>Vraagbank</h1>
              <p className="text-muted" style={{ fontSize: '19px' }}>Herbruik en beheer je opgeslagen vragen.</p>
            </header>

            <div className="card" style={{ marginBottom: '32px', padding: '24px', borderRadius: '20px' }}>
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: '#86868b' }} />
                <input className="input" style={{ paddingLeft: '48px', borderRadius: '12px' }} placeholder="Zoek in je vragen..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {allLabels.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => setActiveFilters([])} style={{ border: 'none', background: activeFilters.length === 0 ? '#0071e3' : '#f5f5f7', color: activeFilters.length === 0 ? 'white' : '#1d1d1f', padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Alle</button>
                  {allLabels.map(l => (
                    <button key={l} onClick={() => toggleFilter(l)} style={{ border: 'none', background: activeFilters.includes(l) ? '#0071e3' : '#f5f5f7', color: activeFilters.includes(l) ? 'white' : '#1d1d1f', padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{l}</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredQuestions.map(q => (
                <div key={q.id} className="card card-hoverable" style={{ padding: '24px', borderRadius: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <span className="badge" style={{ fontSize: '10px', textTransform: 'uppercase', color: '#0071e3', border: 'none', background: '#f0f7ff' }}>{q.type}</span>
                        <span style={{ fontSize: '10px', color: '#86868b', fontWeight: '600' }}>{q.points} pt</span>
                      </div>
                      <p style={{ fontSize: '18px', margin: 0, fontWeight: '600', color: '#1d1d1f' }}>{q.text}</p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
                        {q.labels?.map(l => <span key={l} className="badge" style={{ fontSize: '10px', background: '#f5f5f7' }}>{l}</span>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '8px', borderRadius: '10px' }} onClick={() => handleStartEdit(q)}><Edit3 size={16}/></button>
                      <button className="btn btn-danger" style={{ padding: '8px', borderRadius: '10px' }} onClick={() => handleDelete(q.id)}><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredQuestions.length === 0 && (
                <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                  <p className="text-muted">Geen vragen gevonden.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
