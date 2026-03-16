import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="animate-up" style={{ padding: '120px 20px', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '100px' }}>
        <h1 style={{ fontSize: '72px', marginBottom: '24px', letterSpacing: '-0.05em' }}>Toetsomgeving</h1>
        <p className="text-muted" style={{ fontSize: '26px', fontWeight: '500', maxWidth: '700px', margin: '0 auto', lineHeight: '1.3', letterSpacing: '-0.02em' }}>
          Beheer je toetsen, examens en formulieren in een veilige, moderne digitale omgeving.
        </p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <div className="card card-hoverable" onClick={() => navigate('/login')} style={{ flex: 1, cursor: 'pointer', textAlign: 'left', padding: '48px', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ background: 'var(--system-blue)', width: '64px', height: '64px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', boxShadow: '0 8px 20px rgba(0, 102, 204, 0.3)' }}>
             <Users size={32} color="white" />
          </div>
          <h2 style={{ marginBottom: '16px', fontSize: '28px' }}>Docent Portaal</h2>
          <p className="text-muted" style={{ marginBottom: '40px', fontSize: '17px', fontWeight: '500' }}>Maak toetsen, bekijk resultaten en beheer de live sessies van je studenten.</p>
          <button className="btn" style={{ width: '100%', height: '54px', fontSize: '17px' }}>Inloggen als docent</button>
        </div>
      </div>

      <footer style={{ marginTop: '120px', borderTop: '1px solid var(--system-border-light)', paddingTop: '60px' }}>
        <p className="text-muted" style={{ fontSize: '15px', fontWeight: '500' }}>
          Voor studenten: ga naar de specifieke examen-URL op de student-omgeving.
        </p>
      </footer>
    </div>
  );
}
