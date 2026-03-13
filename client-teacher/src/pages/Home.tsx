import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="animate-up" style={{ padding: '100px 0', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '80px' }}>
        <h1 style={{ fontSize: '64px', marginBottom: '24px' }}>Toetsomgeving</h1>
        <p className="text-muted" style={{ fontSize: '24px', maxWidth: '600px', margin: '0 auto' }}>
          Beheer je toetsen, examens en formulieren in een veilige digitale omgeving.
        </p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
        <div className="card card-hoverable" onClick={() => navigate('/login')} style={{ flex: 1, cursor: 'pointer', textAlign: 'left', padding: '40px' }}>
          <div style={{ background: 'var(--system-blue)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
             <Users size={32} color="white" />
          </div>
          <h2 style={{ marginBottom: '12px' }}>Docent Portaal</h2>
          <p className="text-muted" style={{ marginBottom: '32px' }}>Maak toetsen, bekijk resultaten en beheer de live sessies van je studenten.</p>
          <button className="btn" style={{ width: '100%', fontSize: '17px', padding: '12px' }}>Inloggen als docent</button>
        </div>
      </div>

      <footer style={{ marginTop: '100px', borderTop: '1px solid var(--system-border)', paddingTop: '40px' }}>
        <p className="text-muted" style={{ fontSize: '14px' }}>
          Voor studenten: ga naar de specifieke examen-URL op de student-omgeving (poort 5174).
        </p>
      </footer>
    </div>
  );
}
