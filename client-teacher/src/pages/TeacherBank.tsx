import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Search, Tag, Database, Filter } from 'lucide-react';

interface Question {
  id: string;
  type: string;
  text: string;
  points: number;
  labels: string[];
}

export default function TeacherBank() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user.role !== 'teacher') {
      navigate('/login?role=teacher');
      return;
    }
    fetchBank();
  }, []);

  const fetchBank = async () => {
    try {
      const res = await fetch(`/api/questions-bank?teacherId=${user.id}`);
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze vraag definitief uit de vraagbank wilt verwijderen? Dit heeft geen effect op bestaande toetsen.')) return;
    try {
      const res = await fetch(`/api/questions-bank/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQuestions(questions.filter(q => q.id !== id));
      }
    } catch (e) {
      alert('Verwijderen mislukt');
    }
  };

  const toggleFilter = (label: string) => {
    setActiveFilters(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const allLabels = Array.from(new Set(questions.flatMap(q => q.labels || []))).sort();

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(search.toLowerCase()) || 
                         q.labels?.some(l => l.toLowerCase().includes(search.toLowerCase())) ||
                         q.type.toLowerCase().includes(search.toLowerCase());
    
    const matchesLabels = activeFilters.length === 0 || 
                         activeFilters.every(f => q.labels?.includes(f));
    
    return matchesSearch && matchesLabels;
  });

  return (
    <div className="animate-up" style={{ padding: '80px 0' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/teacher')}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '32px' }}>Vraagbank Beheer</h1>
          <p className="text-muted" style={{ margin: 0 }}>Beheer al je herbruikbare vragen</p>
        </div>
        <div style={{ width: '120px' }}></div>
      </header>

      <div style={{ marginBottom: '40px' }}>
        <div className="filter-bar" style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '12px 24px', marginBottom: '20px' }}>
          <Search size={20} color="var(--system-secondary-text)" />
          <input 
            className="input" 
            style={{ border: 'none', background: 'none', fontSize: '18px', padding: 0, boxShadow: 'none' }}
            placeholder="Zoek op tekst..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {allLabels.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--system-secondary-text)', fontSize: '13px', fontWeight: '600' }}>
              <Filter size={14} /> FILTER OP LABELS (AND):
            </div>
            {allLabels.map(l => (
              <button 
                key={l} 
                onClick={() => toggleFilter(l)}
                style={{ 
                  padding: '4px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', border: '1px solid',
                  background: activeFilters.includes(l) ? 'var(--system-text)' : 'white',
                  borderColor: activeFilters.includes(l) ? 'transparent' : 'var(--system-border)',
                  color: activeFilters.includes(l) ? 'white' : 'var(--system-secondary-text)',
                  fontWeight: '600', transition: 'all 0.2s'
                }}
              >
                {l}
              </button>
            ))}
            {activeFilters.length > 0 && (
              <button 
                onClick={() => setActiveFilters([])}
                style={{ background: 'none', border: 'none', color: 'var(--system-blue)', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
              >
                Wis filters
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <p style={{ textAlign: 'center' }}>Laden...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredQuestions.map(q => (
            <div key={q.id} className="card card-hoverable" style={{ padding: '24px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    <span className="badge" style={{ background: 'var(--system-secondary-bg)', color: 'var(--system-text)' }}>{q.type}</span>
                    <span className="badge" style={{ background: 'var(--system-blue)', color: 'white', border: 'none' }}>{q.points} PT</span>
                    {q.labels?.map(l => (
                      <span key={l} className="badge" style={{ background: 'none', border: '1px solid var(--system-border)', color: 'var(--system-secondary-text)' }}>
                        <Tag size={10} /> {l}
                      </span>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '500', lineHeight: '1.4' }}>{q.text}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '10px' }} 
                    onClick={() => handleDelete(q.id)}
                    title="Definitief verwijderen uit bank"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredQuestions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--system-secondary-text)' }}>
              <Database size={64} style={{ margin: '0 auto 24px', opacity: 0.2 }} />
              <h3>Geen vragen gevonden</h3>
              <p>Probeer een andere zoekopdracht of filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
