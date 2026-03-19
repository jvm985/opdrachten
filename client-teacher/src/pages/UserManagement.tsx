import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Edit3, Trash2, UserPlus, Upload, X, Save, GraduationCap, FileSpreadsheet, Users, Shield } from 'lucide-react';
import { TopNav } from '../components/TopNav';

interface Student {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  klas: string;
  email: string | null;
  photo_url: string | null;
}

interface Teacher {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = user.email === 'joachim.vanmeirvenne@atheneumkapellen.be';

  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<any | null>(null);
  const [showImportMenu, setShowImportMenu] = useState(false);
  
  const fileInputExcel = React.useRef<HTMLInputElement>(null);
  const fileInputPhotos = React.useRef<HTMLInputElement>(null);
  const fileInputPDF = React.useRef<HTMLInputElement>(null);

  const dropdownItemStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: '10px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderRadius: '8px',
    transition: 'background 0.2s',
    color: 'inherit'
  };

  useEffect(() => {
    const handleClick = () => setShowImportMenu(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (user.role !== 'teacher' || !isAdmin) {
      navigate('/teacher');
      return;
    }
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const endpoint = activeTab === 'students' ? '/api/admin/students' : '/api/admin/teachers';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (activeTab === 'students') setStudents(data);
      else setTeachers(data);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: any) => {
    const entityName = activeTab === 'students' ? 'Student' : 'Docent';
    if (!confirm(`${entityName} definitief verwijderen?`)) return;
    try {
      const endpoint = activeTab === 'students' ? `/api/admin/students/${id}` : `/api/admin/teachers/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEntity?.first_name || !currentEntity?.last_name || !currentEntity?.email) return;

    try {
      const isNew = !currentEntity.id;
      const method = isNew ? 'POST' : 'PUT';
      const baseUrl = activeTab === 'students' ? '/api/admin/students' : '/api/admin/teachers';
      const url = isNew ? baseUrl : `${baseUrl}/${currentEntity.id}`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentEntity),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Opslaan mislukt');
      }
    } catch (e) { console.error(e); }
  };

  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await fetch('/api/admin/import-students-pdf', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) { alert(`Succesvol ${data.count} studenten geïmporteerd!`); fetchData(); }
      else { alert('Import mislukt: ' + data.error); }
    } catch (e) { alert('Er is een fout opgetreden.'); }
    finally { e.target.value = ''; }
  };

  const handleImportXLSX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/import-students-xlsx', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) { alert(`Succesvol ${data.count} studenten geïmporteerd uit Excel!`); fetchData(); }
      else { alert('Import mislukt: ' + data.error); }
    } catch (e) { alert('Er is een fout opgetreden.'); }
    finally { e.target.value = ''; }
  };

  const handleLinkPhotosPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let totalLinked = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('pdf', files[i]);
        const res = await fetch('/api/admin/import-photos-pdf', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) totalLinked += data.count;
      }
      alert(`Koppelen voltooid! In totaal ${totalLinked} foto's gekoppeld.`);
      fetchData();
    } catch (e) { alert('Er is een fout opgetreden.'); }
    finally { e.target.value = ''; }
  };

  const handleClearAll = async () => {
    if (!confirm('WEET JE HET ZEKER? Dit verwijdert ALLE leerlingen uit de database!')) return;
    try {
      const res = await fetch('/api/admin/students/clear', { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const filtered = (activeTab === 'students' ? students : teachers).filter((item: any) => 
    (item.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (item.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.klas || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: '72px' }}>
      <TopNav user={user} />
      
      <input type="file" ref={fileInputExcel} accept=".xlsx,.xls" onChange={handleImportXLSX} style={{ display: 'none' }} />
      <input type="file" ref={fileInputPhotos} accept=".pdf" onChange={handleLinkPhotosPDF} style={{ display: 'none' }} multiple />
      <input type="file" ref={fileInputPDF} accept=".pdf" onChange={handleImportPDF} style={{ display: 'none' }} />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={() => navigate('/teacher')}><ArrowLeft size={20}/></button>
              <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0, letterSpacing: '-0.04em' }}>Beheer</h1>
            </div>
            <p className="text-muted" style={{ fontSize: '17px', fontWeight: '500' }}>Beheer studenten, docenten en klassenlijsten.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {activeTab === 'students' && (
              <div style={{ position: 'relative' }}>
                <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setShowImportMenu(!showImportMenu); }} style={{ background: 'white', border: '1px solid var(--system-border)' }}>
                  <Upload size={18} /> Importeer / Acties
                </button>
                {showImportMenu && (
                  <div className="glass animate-up" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '240px', borderRadius: '14px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--system-border-light)', zIndex: 100, padding: '8px' }}>
                    <button onClick={() => { setShowImportMenu(false); fileInputExcel.current?.click(); }} style={{ ...dropdownItemStyle, color: '#1e8e3e' }}><FileSpreadsheet size={16} /> Excel Schoollijst</button>
                    <button onClick={() => { setShowImportMenu(false); fileInputPhotos.current?.click(); }} style={{ ...dropdownItemStyle, color: 'var(--system-blue)' }}><Upload size={16} /> Koppel Foto's (PDF)</button>
                    <button onClick={() => { setShowImportMenu(false); fileInputPDF.current?.click(); }} style={{ ...dropdownItemStyle }}><Users size={16} /> Nieuwe Klas (PDF)</button>
                    <div style={{ height: '1px', background: 'var(--system-border-light)', margin: '4px 0' }} />
                    <button onClick={() => { setShowImportMenu(false); handleClearAll(); }} style={{ ...dropdownItemStyle, color: 'var(--system-error)' }}><Trash2 size={16} /> Studentenlijst wissen</button>
                  </div>
                )}
              </div>
            )}
            <button className="btn" onClick={() => { setCurrentEntity({ first_name: '', last_name: '', email: '', klas: '' }); setIsModalOpen(true); }}>
              <UserPlus size={18} /> Nieuwe {activeTab === 'students' ? 'Leerling' : 'Docent'}
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', gap: '32px', marginBottom: '40px', borderBottom: '1px solid var(--system-border-light)' }}>
          <button style={{ padding: '12px 4px', fontSize: '16px', fontWeight: '700', border: 'none', background: 'none', borderBottom: activeTab === 'students' ? '3px solid var(--system-blue)' : '3px solid transparent', color: activeTab === 'students' ? 'var(--system-blue)' : 'var(--system-secondary-text)', cursor: 'pointer' }} onClick={() => setActiveTab('students')}><Users size={18} style={{marginRight: '8px'}}/> Studenten</button>
          <button style={{ padding: '12px 4px', fontSize: '16px', fontWeight: '700', border: 'none', background: 'none', borderBottom: activeTab === 'teachers' ? '3px solid var(--system-blue)' : '3px solid transparent', color: activeTab === 'teachers' ? 'var(--system-blue)' : 'var(--system-secondary-text)', cursor: 'pointer' }} onClick={() => setActiveTab('teachers')}><Shield size={18} style={{marginRight: '8px'}}/> Docenten</button>
        </div>

        <div className="card" style={{ padding: '8px 16px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: 'none', boxShadow: 'var(--shadow-sm)', borderRadius: '14px' }}>
          <Search size={20} color="var(--system-secondary-text)" />
          <input className="input" style={{ border: 'none', boxShadow: 'none', fontSize: '17px', padding: '12px 0' }} placeholder={`Zoek in ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f7', borderBottom: '1px solid var(--system-border-light)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: 'var(--system-secondary-text)' }}>{activeTab === 'students' ? 'FOTO' : 'ID'}</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: 'var(--system-secondary-text)' }}>NAAM</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: 'var(--system-secondary-text)' }}>{activeTab === 'students' ? 'KLAS' : 'ROL'}</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: 'var(--system-secondary-text)' }}>EMAIL</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', color: 'var(--system-secondary-text)' }}>ACTIES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                  <td style={{ padding: '12px 24px' }}>
                    {activeTab === 'students' ? (
                      item.photo_url ? <img src={item.photo_url} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} alt="" /> : <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GraduationCap size={18} color="#ccc" /></div>
                    ) : <span style={{ fontSize: '11px', color: '#888' }}>{item.id}</span>}
                  </td>
                  <td style={{ padding: '12px 24px', fontWeight: '600' }}>{item.last_name}, {item.first_name}</td>
                  <td style={{ padding: '12px 24px' }}><span className="badge">{activeTab === 'students' ? item.klas : 'DOCENT'}</span></td>
                  <td style={{ padding: '12px 24px', color: 'var(--system-secondary-text)', fontSize: '14px' }}>{item.email}</td>
                  <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '8px', borderRadius: '10px' }} onClick={() => { setCurrentEntity(item); setIsModalOpen(true); }}><Edit3 size={16}/></button>
                      <button className="btn-secondary" style={{ padding: '8px', borderRadius: '10px', color: 'var(--system-error)' }} onClick={() => handleDelete(item.id)}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card animate-up" style={{ maxWidth: '450px', width: '100%', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ margin: 0 }}>{currentEntity?.id ? 'Bewerken' : `Nieuwe ${activeTab === 'students' ? 'Leerling' : 'Docent'}`}</h2>
              <button className="btn-secondary" style={{ padding: '8px', borderRadius: '50%' }} onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>Voornaam</label><input className="input" value={currentEntity?.first_name || ''} onChange={e => setCurrentEntity({...currentEntity, first_name: e.target.value})} required /></div>
                <div><label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>Achternaam</label><input className="input" value={currentEntity?.last_name || ''} onChange={e => setCurrentEntity({...currentEntity, last_name: e.target.value})} required /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>E-mail</label><input className="input" type="email" value={currentEntity?.email || ''} onChange={e => setCurrentEntity({...currentEntity, email: e.target.value})} required /></div>
              {activeTab === 'students' && (
                <div><label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>Klas</label><input className="input" value={currentEntity?.klas || ''} onChange={e => setCurrentEntity({...currentEntity, klas: e.target.value})} required /></div>
              )}
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Annuleren</button>
                <button type="submit" className="btn" style={{ flex: 2 }}><Save size={18} /> Opslaan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
