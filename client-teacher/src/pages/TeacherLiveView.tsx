import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { AlertTriangle, CheckCircle, Clock, Power, ArrowLeft, Copy, Check } from 'lucide-react';

interface Student {
  socketId: string;
  name: string;
  klas: string;
  photo_url: string;
  status: 'active' | 'cheated' | 'finished';
}

export default function TeacherLiveView() {
  const { examKey } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const newSocket = io('');
    setSocket(newSocket);

    newSocket.emit('teacher_join', examKey);

    newSocket.on('current_students', (currentStudents) => setStudents(currentStudents));
    
    newSocket.on('student_joined', (student) => {
      setStudents(prev => [
        ...prev.filter(s => s.socketId !== student.socketId && s.name !== student.name), 
        student
      ]);
    });

    newSocket.on('student_cheated', ({ socketId, name }) => {
      setStudents(prev => prev.map(s => (s.socketId === socketId || s.name === name) ? { ...s, status: 'cheated' } : s));
    });

    newSocket.on('student_finished', ({ name }) => {
      setStudents(prev => prev.map(s => s.name === name ? { ...s, status: 'finished' } : s));
    });

    newSocket.on('student_disconnected', ({ socketId }) => {
      setStudents(prev => prev.filter(s => s.socketId !== socketId || s.status === 'finished'));
    });

    return () => { newSocket.disconnect(); };
  }, [examKey]);

  const handleCloseSession = () => {
    if (confirm('Weet je zeker dat je de sessie wilt afsluiten? Alle studenten die nog bezig zijn worden direct uitgelogd.')) {
      socket?.emit('session_close', examKey);
      navigate('/teacher');
    }
  };

  const handleCopyCode = () => {
    if (!examKey) return;
    navigator.clipboard.writeText(examKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-up" style={{ padding: '40px 0' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/teacher')}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <h2 style={{ margin: 0 }}>Live Monitor</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div 
            onClick={handleCopyCode}
            style={{ 
              background: 'white', 
              padding: '8px 20px', 
              borderRadius: '12px', 
              border: '1px solid var(--system-border)', 
              textAlign: 'center',
              cursor: 'pointer',
              minWidth: '160px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '10px', color: 'var(--system-secondary-text)', fontWeight: '700', textTransform: 'uppercase' }}>CODE</p>
              {copied ? <Check size={10} color="var(--system-success)" /> : <Copy size={10} color="var(--system-secondary-text)" />}
            </div>
            <span style={{ color: 'var(--system-blue)', fontSize: '20px', letterSpacing: '2px', fontWeight: '700' }}>{examKey}</span>
          </div>
          
          <button className="btn btn-danger" onClick={handleCloseSession}>
            <Power size={16} /> Sluit sessie
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
        {students.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 0', color: 'var(--system-secondary-text)' }}>
            <Clock size={48} style={{ margin: '0 auto 24px', opacity: 0.2 }} />
            <p>Wachten op studenten...</p>
          </div>
        )}
        {students.map(student => (
          <div key={student.socketId} className="card" style={{ 
            padding: '20px',
            borderTop: `6px solid ${student.status === 'cheated' ? 'var(--system-error)' : (student.status === 'finished' ? 'var(--system-success)' : 'var(--system-blue)')}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <img src={student.photo_url} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--system-border)' }} alt={student.name} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '17px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {student.name}
                {student.status === 'finished' && <CheckCircle size={18} color="var(--system-success)" />}
                {student.status === 'cheated' && <AlertTriangle size={18} color="var(--system-error)" />}
              </h3>
              <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--system-secondary-text)', fontWeight: '600' }}>Klas: {student.klas}</p>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: student.status === 'cheated' ? 'var(--system-error)' : 'var(--system-secondary-text)' }}>
                {student.status === 'active' && 'Aan het werk...'}
                {student.status === 'finished' && 'Ingeleverd'}
                {student.status === 'cheated' && 'FRAUDE GEDETECTEERD!'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
