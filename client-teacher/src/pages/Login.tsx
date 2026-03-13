import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleHint = searchParams.get('role'); // 'teacher' or 'student'

  const handleLogin = async (e?: React.FormEvent, testCreds?: { e: string; p: string }) => {
    if (e) e.preventDefault();
    
    const loginEmail = testCreds ? testCreds.e : email;
    const loginPassword = testCreds ? testCreds.p : password;

    if (!loginEmail || !loginPassword) return setError('Vul alle velden in');

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login mislukt');

      // Sla user info op in session storage
      sessionStorage.setItem('user', JSON.stringify(data));
      
      if (data.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '10vh auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <LogIn size={48} color="#2563eb" style={{ marginBottom: '1rem' }} />
        <h2>Inloggen {roleHint === 'teacher' ? 'Docent' : (roleHint === 'student' ? 'Student' : '')}</h2>
      </div>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="email@voorbeeld.com"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label>Wachtwoord</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="******"
          />
        </div>
        <button type="submit" disabled={isLoading} style={{ marginTop: '1rem' }}>
          {isLoading ? 'Laden...' : 'Inloggen'}
        </button>
      </form>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>Snelkoppelingen voor testen:</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => handleLogin(undefined, { e: 'docent@test.com', p: 'welkom01' })}
            style={{ flex: 1, backgroundColor: '#16a34a', fontSize: '0.8rem' }}
          >
            Test Login Docent
          </button>
          <button 
            onClick={() => handleLogin(undefined, { e: 'student@test.com', p: 'welkom01' })}
            style={{ flex: 1, backgroundColor: '#2563eb', fontSize: '0.8rem' }}
          >
            Test Login Student
          </button>
        </div>
      </div>
    </div>
  );
}
