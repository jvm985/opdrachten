import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  klas: string;
  photo_url: string;
}

export default function StudentLogin() {
  const [examKey, setExamKey] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        // Sorteer op klas en naam
        const sorted = data.sort((a: Student, b: Student) => {
          if (a.klas !== b.klas) return a.klas.localeCompare(b.klas);
          return a.name.localeCompare(b.name);
        });
        setStudents(sorted);
      })
      .catch(err => console.error('Fout bij ophalen studenten:', err));
  }, []);

  const handleTestLogin = () => {
    const elise = students.find(s => s.name.includes('Van Aelst Elise'));
    if (elise) {
      setSelectedStudent(elise);
      // We vullen de code niet in, dat moet de gebruiker nog doen of we kunnen een default pakken
    } else {
      alert('Van Aelst Elise niet gevonden in de lijst. Is de import al klaar?');
    }
  };

  const handleJoinExam = async () => {
    if (!examKey) return setError('Vul de examencode in');
    if (!selectedStudent) return setError('Selecteer je naam uit de lijst');
    
    try {
      const res = await fetch(`/api/exams/${examKey}`);
      if (!res.ok) throw new Error('Examen niet gevonden. Controleer de code.');
      
      // Student info opslaan voor het examen
      sessionStorage.setItem('studentName', selectedStudent.name);
      sessionStorage.setItem('studentKlas', selectedStudent.klas);
      sessionStorage.setItem('studentPhoto', selectedStudent.photo_url);
      
      navigate(`/exam/${examKey}`);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="animate-up" style={{ padding: '80px 0', maxWidth: '500px', margin: '0 auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Users size={48} color="var(--system-blue)" style={{ marginBottom: '16px' }} />
          <h2>Aanmelden voor examen</h2>
        </div>

        {error && <p style={{ color: 'var(--system-error)', textAlign: 'center', marginBottom: '20px', fontSize: '14px', fontWeight: '600' }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>JOUW NAAM</label>
            <select 
              className="input" 
              value={selectedStudent?.id || ''} 
              onChange={e => {
                const s = students.find(s => s.id === parseInt(e.target.value));
                setSelectedStudent(s || null);
              }}
            >
              <option value="">-- Selecteer je naam --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.klas} - {s.name}</option>
              ))}
            </select>
          </div>

          {selectedStudent && (
            <div className="animate-up" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--system-secondary-bg)', borderRadius: '12px' }}>
              <img src={selectedStudent.photo_url} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }} alt={selectedStudent.name} />
              <div>
                <p style={{ margin: 0, fontWeight: '700' }}>{selectedStudent.name}</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--system-secondary-text)' }}>Klas: {selectedStudent.klas}</p>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>EXAMENCODE</label>
            <input 
              className="input" 
              placeholder="Bijv. A4B-9X" 
              value={examKey} 
              onChange={e => setExamKey(e.target.value.toUpperCase())} 
              style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '4px', fontWeight: '700' }}
            />
          </div>

          <button className="btn" style={{ width: '100%', padding: '16px', fontSize: '17px' }} onClick={handleJoinExam}>
            Start Examen
          </button>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--system-border)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--system-secondary-text)', marginBottom: '12px' }}>TESTEN:</p>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleTestLogin}>
              Snelkoppeling: Van Aelst Elise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
