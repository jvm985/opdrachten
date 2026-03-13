import { useNavigate } from 'react-router-dom';
import { Shield, Save, Eye, LogOut } from 'lucide-react';

export const TopNav = ({ isEditing, user, onSave, onPreview, isLoading }: any) => {
  const navigate = useNavigate();
  return (
    <nav style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, height: '72px', 
      background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', 
      borderBottom: '1px solid var(--system-border)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '1200px', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/teacher')}>
            <div style={{ background: 'var(--system-blue)', color: 'white', padding: '6px', borderRadius: '10px' }}><Shield size={20}/></div>
            <span style={{ fontWeight: '700', fontSize: '18px', letterSpacing: '-0.5px' }}>Toetsomgeving</span>
          </div>
          {!isEditing && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="nav-link" onClick={() => navigate('/teacher')} style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: window.location.pathname === '/teacher' ? '600' : '500', background: window.location.pathname === '/teacher' ? 'var(--system-secondary-bg)' : 'transparent' }}>Toetsen</button>
              <button className="nav-link" onClick={() => navigate('/teacher/bank')} style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: window.location.pathname.startsWith('/teacher/bank') ? '600' : '500', background: window.location.pathname.startsWith('/teacher/bank') ? 'var(--system-secondary-bg)' : 'transparent' }}>Vraagbank</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--system-border)', paddingLeft: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--system-secondary-text)' }}>Atheneum Kapellen</p>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--system-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
              {user?.name?.charAt(0)}
            </div>
            <button onClick={() => { sessionStorage.clear(); navigate('/'); }} style={{ color: 'var(--system-error)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }} title="Uitloggen"><LogOut size={18}/></button>
          </div>
        </div>
      </div>
    </nav>
  );
};
