import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';

interface TopNavProps {
  isEditing?: boolean;
  user: any;
}

export const TopNav: React.FC<TopNavProps> = ({ isEditing, user }) => {
  const navigate = useNavigate();
  return (
    <nav className="glass" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, height: '72px', 
      borderBottom: '1px solid var(--system-border-light)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '1200px', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/teacher')}>
            <div style={{ background: 'var(--system-blue)', color: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 102, 204, 0.2)' }}><Shield size={20}/></div>
            <span style={{ fontWeight: '800', fontSize: '20px', letterSpacing: '-0.03em' }}>Toetsomgeving</span>
          </div>
          {!isEditing && (
            <div className="filter-bar" style={{ background: 'rgba(0,0,0,0.03)' }}>
              <button className={`filter-item ${window.location.pathname === '/teacher' ? 'active' : ''}`} onClick={() => navigate('/teacher')}>Toetsen</button>
              <button className={`filter-item ${window.location.pathname.startsWith('/teacher/bank') ? 'active' : ''}`} onClick={() => navigate('/teacher/bank')}>Vraagbank</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '1px solid var(--system-border)', paddingLeft: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--system-text)' }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--system-secondary-text)', fontWeight: '500' }}>Atheneum Kapellen</p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--system-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', boxShadow: '0 4px 12px rgba(0, 102, 204, 0.2)' }}>
              {user?.name?.charAt(0)}
            </div>
            <button className="btn-secondary" onClick={() => { sessionStorage.clear(); navigate('/'); }} style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', color: 'var(--system-error)' }} title="Uitloggen"><LogOut size={18}/></button>
          </div>
        </div>
      </div>
    </nav>
  );
};
