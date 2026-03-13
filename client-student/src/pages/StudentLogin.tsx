import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function StudentLogin() {
  const [examKey, setExamKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (response: any) => {
    if (!examKey) return setError('Vul eerst de examen-sleutel in');
    
    setIsLoading(true);
    setError('');
    
    try {
      // Controleer eerst of het examen bestaat
      const examRes = await fetch(`/api/exams/${examKey.toUpperCase()}`);
      if (!examRes.ok) {
        setError('Ongeldige examen-sleutel');
        setIsLoading(false);
        return;
      }

      // Verifieer Google Token en match met student
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential, role: 'student' }),
      });
      
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('studentName', data.name);
        sessionStorage.setItem('studentKlas', data.klas);
        sessionStorage.setItem('studentPhoto', data.photo_url || '');
        navigate(`/exam/${examKey.toUpperCase()}`);
      } else {
        setError(data.error || 'Google login mislukt');
      }
    } catch (e) { 
      console.error(e); 
      setError('Er is een fout opgetreden.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-up" style={{ padding: '100px 0', maxWidth: '500px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <Shield size={64} color="var(--system-blue)" style={{ marginBottom: '24px' }} />
        <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>Student Login</h1>
        <p className="text-muted" style={{ marginBottom: '40px' }}>Gebruik je school-account om deel te nemen</p>

        {error && <div style={{ background: '#fef2f2', color: 'red', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>{error}</div>}

        <div style={{ textAlign: 'left', marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>EXAMEN SLEUTEL</label>
          <input 
            className="input" 
            style={{ fontSize: '24px', textAlign: 'center', letterSpacing: '4px', textTransform: 'uppercase' }}
            value={examKey} 
            onChange={e => setExamKey(e.target.value)} 
            placeholder="ABC123"
            maxLength={10}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500' }}>Stap 2: Bevestig je identiteit</p>
          <GoogleLogin 
            onSuccess={handleGoogleSuccess} 
            onError={() => setError('Google login mislukt')}
            useOneTap
          />
        </div>

        <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--system-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--system-secondary-text)' }}>
            <Users size={16} />
            <span style={{ fontSize: '13px' }}>Je wordt automatisch gekoppeld aan de klaslijst.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
