import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, GraduationCap } from 'lucide-react';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLoginResponse = async (res: Response) => {
    const data = await res.json();
    if (res.ok) {
      sessionStorage.setItem('user', JSON.stringify(data));
      navigate('/teacher');
    } else {
      setError(data.error || 'Google login mislukt');
    }
  };

  const handleStandardLogin = async (response: any) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential, role: 'teacher' }),
      });
      await handleLoginResponse(res);
    } catch (e) { 
      setError('Verbindingsfout');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithClassroom = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setError('');
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code: codeResponse.code, 
            role: 'teacher' 
          }),
        });
        await handleLoginResponse(res);
      } catch (e) {
        setError('Classroom koppeling mislukt');
      } finally {
        setIsLoading(false);
      }
    },
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/classroom.coursework.students',
  });

  return (
    <div className="animate-up" style={{ padding: '100px 0', maxWidth: '400px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <LogIn size={48} color="var(--system-blue)" style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>Docent Login</h1>
          <p className="text-muted">Meld je aan met je school-account</p>
        </div>

        {error && <div style={{ background: '#fef2f2', color: 'red', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <GoogleLogin 
            onSuccess={handleStandardLogin} 
            onError={() => setError('Google login mislukt')}
          />
          
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--system-border-light)' }}></div>
            <span style={{ fontSize: '12px', color: 'var(--system-secondary-text)', fontWeight: '600' }}>OF</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--system-border-light)' }}></div>
          </div>

          <button 
            className="btn" 
            onClick={() => loginWithClassroom()}
            disabled={isLoading}
            style={{ width: '100%', background: '#1e8e3e', gap: '12px' }}
          >
            <GraduationCap size={20} />
            {isLoading ? 'Bezig...' : 'Login + Classroom Sync'}
          </button>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--system-border)', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '12px' }}>Voor automatische synchronisatie van cijfers kies je de Classroom optie.</p>
        </div>
      </div>
    </div>
  );
}
