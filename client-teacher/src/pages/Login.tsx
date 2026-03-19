import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, GraduationCap } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

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

  const login = useGoogleLogin({
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
        setError('Inloggen mislukt');
      } finally {
        setIsLoading(false);
      }
    },
    flow: 'auth-code',
    scope: 'email profile openid https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/classroom.coursework.students',
  });

  return (
    <div className="animate-up" style={{ padding: '100px 0', maxWidth: '400px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ background: 'var(--system-blue-light)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <LogIn size={40} color="var(--system-blue)" />
          </div>
          <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>Docent Login</h1>
          <p className="text-muted">Meld je aan met je school-account</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: 'var(--system-error)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', textAlign: 'center', border: '1px solid #fee2e2' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            className="btn" 
            onClick={() => login()}
            disabled={isLoading}
            style={{ width: '100%', height: '56px', fontSize: '17px', gap: '12px' }}
          >
            {isLoading ? (
              'Bezig met inloggen...'
            ) : (
              <>
                <GraduationCap size={22} />
                Inloggen via Google
              </>
            )}
          </button>
          
          <p className="text-muted" style={{ fontSize: '13px', textAlign: 'center', marginTop: '12px' }}>
            Door in te loggen geef je toestemming voor synchronisatie met Google Classroom.
          </p>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--system-border-light)', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '12px', fontWeight: '500' }}>Toegang alleen voor @atheneumkapellen.be accounts.</p>
        </div>
      </div>
    </div>
  );
}
