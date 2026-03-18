import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Edit3, X, Users, Save } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import type { Question } from '../types';

export default function TeacherBank() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sharedQuestions, setSharedBankQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user.role !== 'teacher') { navigate('/login'); return; }
    fetchBank();
  }, []);

  const fetchBank = async () => {
    try {
      const [mineRes, sharedRes] = await Promise.all([
        fetch(`/api/questions-bank?teacherId=${user.id}`),
        fetch(`/api/questions-bank/shared?teacherId=${user.id}`)
      ]);
      const mine = await mineRes.json();
      const shared = await sharedRes.json();
      setQuestions(Array.isArray(mine) ? mine : []);
      setSharedBankQuestions(Array.isArray(shared) ? shared : []);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vraag definitief verwijderen uit je bank?')) return;
    try {
      const res = await fetch(`/api/questions-bank/${id}`, { method: 'DELETE' });
      if (res.ok) fetchBank();
    } catch (e) { console.error(e); }
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
          isShared: editingQuestion.isShared 
        })
      });
      if (res.ok) {
        setEditingQuestion(null);
        fetchBank();
      }
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const filtered = (activeTab === 'mine' ? questions : sharedQuestions).filter(q => 
    q.text.toLowerCase().includes(search.toLowerCase()) ||
    q.labels?.some((l: string) => l.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: '72px' }}>
      <TopNav user={user} />
      
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={() => navigate('/teacher')}><ArrowLeft size={20}/></button>
              <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0, letterSpacing: '-0.04em' }}>Vraagbank</h1>
            </div>
            <p className="text-muted" style={{ fontSize: '17px', fontWeight: '500' }}>Beheer en hergebruik je vragen.</p>
          </div>
        </header>

        <div style={{ display: 'flex', gap: '32px', marginBottom: '40px', borderBottom: '1px solid var(--system-border-light)' }}>
          <button 
            style={{ padding: '12px 4px', fontSize: '16px', fontWeight: '700', border: 'none', background: 'none', borderBottom: activeTab === 'mine' ? '3px solid var(--system-blue)' : '3px solid transparent', color: activeTab === 'mine' ? 'var(--system-blue)' : 'var(--system-secondary-text)', cursor: 'pointer' }}
            onClick={() => setActiveTab('mine')}
          >
            Mijn vragen
          </button>
          <button 
            style={{ padding: '12px 4px', fontSize: '16px', fontWeight: '700', border: 'none', background: 'none', borderBottom: activeTab === 'shared' ? '3px solid var(--system-blue)' : '3px solid transparent', color: activeTab === 'shared' ? 'var(--system-blue)' : 'var(--system-secondary-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setActiveTab('shared')}
          >
            <Users size={18}/> Gedeeld door collega's
          </button>
        </div>

        <div className="card" style={{ padding: '8px 16px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: 'none', boxShadow: 'var(--shadow-sm)', borderRadius: '14px' }}>
          <Search size={20} color="var(--system-secondary-text)" />
          <input className="input" style={{ border: 'none', boxShadow: 'none', fontSize: '17px', padding: '12px 0' }} placeholder="Zoek op tekst of label..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filtered.map(q => (
            <div key={q.id} className="card card-hoverable" style={{ padding: '24px', display: 'flex', flexDirection: 'column', background: 'white' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge" style={{ background: 'var(--system-blue-light)', color: 'var(--system-blue)' }}>{q.type.toUpperCase()}</span>
                  {activeTab === 'mine' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '6px', borderRadius: '8px' }} onClick={() => setEditingQuestion(q)}><Edit3 size={14}/></button>
                      <button className="btn-secondary" style={{ padding: '6px', borderRadius: '8px', color: 'var(--system-error)' }} onClick={() => handleDelete(q.id)}><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '16px', lineHeight: '1.4' }}>{q.text}</p>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {q.labels?.map((l: string) => <span key={l} className="badge" style={{ fontSize: '10px' }}>{l}</span>)}
                </div>
              </div>
              {activeTab === 'shared' && <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--system-blue)', fontWeight: '700' }}>Docent: {(q as any).teacherName}</p>}
            </div>
          ))}
        </div>
      </main>

      {editingQuestion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card animate-up" style={{ maxWidth: '500px', width: '100%', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ margin: 0 }}>Vraag Bewerken</h2>
              <button className="btn-secondary" style={{ padding: '8px', borderRadius: '50%' }} onClick={() => setEditingQuestion(null)}><X size={20}/></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>Vraagstelling</label>
                <textarea className="input" value={editingQuestion.text} onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} rows={3} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>Labels</label>
                <input 
                  className="input" 
                  placeholder="Nieuw label..." 
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !editingQuestion.labels?.includes(val)) {
                        setEditingQuestion({...editingQuestion, labels: [...(editingQuestion.labels || []), val]});
                      }
                      (e.target as HTMLInputElement).value = '';
                    }
                  }} 
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {editingQuestion.labels?.map((l: string) => (
                    <span key={l} className="badge" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {l} <X size={10} style={{ cursor: 'pointer' }} onClick={() => setEditingQuestion({...editingQuestion, labels: editingQuestion.labels?.filter((x: string) => x !== l)})} />
                    </span>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f5f5f7', borderRadius: '12px' }}>
                <input type="checkbox" checked={!!editingQuestion.isShared} onChange={e => setEditingQuestion({...editingQuestion, isShared: e.target.checked})} />
                <span style={{ fontWeight: '600', fontSize: '14px' }}>Delen met collega's</span>
              </label>

              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingQuestion(null)}>Annuleren</button>
                <button className="btn" style={{ flex: 2 }} onClick={handleSaveEdit} disabled={isSaving}><Save size={18} /> {isSaving ? 'Opslaan...' : 'Wijzigingen Opslaan'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
