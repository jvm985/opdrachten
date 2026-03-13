import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (response: any) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential, role: 'teacher' }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('user', JSON.stringify(data));
        navigate('/teacher');
      } else {
        setError(data.error || 'Google login mislukt');
      }
    } catch (e) { 
      console.error(e); 
      setError('Er is een fout opgetreden bij de verbinding met de server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-up" style={{ padding: '100px 0', maxWidth: '400px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <LogIn size={48} color="var(--system-blue)" style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>Docent Login</h1>
          <p className="text-muted">Meld je aan met je school-account</p>
        </div>

        {error && <div style={{ background: '#fef2f2', color: 'red', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <GoogleLogin 
            onSuccess={handleGoogleSuccess} 
            onError={() => setError('Google login mislukt')}
          />
        </div>

        <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--system-border)', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '12px' }}>Toegang alleen voor docenten van Atheneum Kapellen.</p>
        </div>
      </div>
    </div>
  );
}
