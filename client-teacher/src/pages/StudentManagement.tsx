import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit3, Trash2, UserPlus, Upload, X, Save, GraduationCap, FileSpreadsheet, Users } from 'lucide-react';
import { TopNav } from '../components/TopNav';

interface Student {
  id: number;
  name: string;
  klas: string;
  email: string | null;
  photo_url: string | null;
}

export default function StudentManagement() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = user.email === 'joachim.vanmeirvenne@atheneumkapellen.be';

  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLinkingPhotos, setIsLinkingPhotos] = useState(false);
  const [isImportingXLSX, setIsImportingXLSX] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null);

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
    if (user.role !== 'teacher' || !isAdmin) {
      navigate('/teacher');
      return;
    }
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      setStudents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Student definitief verwijderen?')) return;
    try {
      const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE' });
      if (res.ok) fetchStudents();
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent?.name || !currentStudent?.klas) return;

    try {
      const method = currentStudent.id ? 'PUT' : 'POST';
      const url = currentStudent.id ? `/api/admin/students/${currentStudent.id}` : '/api/admin/students';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentStudent),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchStudents();
      }
    } catch (e) { console.error(e); }
  };

  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch('/api/admin/import-students-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Succesvol ${data.count} studenten geïmporteerd!`);
        fetchStudents();
      } else {
        alert('Import mislukt: ' + data.error);
      }
    } catch (e) {
      alert('Er is een fout opgetreden.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleLinkPhotosPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log('Geen bestanden geselecteerd');
      return;
    }

    console.log(`📤 Start upload van ${files.length} bestanden...`);
    setIsLinkingPhotos(true);
    let totalLinked = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        console.log(`📄 Verwerken bestand ${i+1}: ${files[i].name} (${files[i].size} bytes)`);
        const formData = new FormData();
        formData.append('pdf', files[i]);

        const res = await fetch('/api/admin/import-photos-pdf', {
          method: 'POST',
          body: formData,
        });
        
        console.log(`📡 Server response status voor ${files[i].name}: ${res.status}`);
        const data = await res.json();
        if (res.ok) {
          console.log(`✅ Succes: ${data.count} foto's gekoppeld`);
          totalLinked += data.count;
        } else {
          console.error(`❌ Fout bij bestand ${files[i].name}: ${data.error}`);
        }
      }
      alert(`Koppelen voltooid! In totaal ${totalLinked} foto's gekoppeld.`);
      fetchStudents();
    } catch (e) {
      console.error('💥 Fatale fout tijdens upload:', e);
      alert('Er is een fout opgetreden tijdens het verwerken van de bestanden. Check de console (F12).');
    } finally {
      setIsLinkingPhotos(false);
      e.target.value = '';
    }
  };

  const handleImportXLSX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingXLSX(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/import-students-xlsx', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Succesvol ${data.count} studenten geïmporteerd uit Excel!`);
        fetchStudents();
      } else {
        alert('Import mislukt: ' + data.error);
      }
    } catch (e) {
      alert('Er is een fout opgetreden.');
    } finally {
      setIsImportingXLSX(false);
      e.target.value = '';
    }
  };

  const handleClearAll = async () => {
    if (!confirm('WEET JE HET ZEKER? Dit verwijdert ALLE leerlingen uit de database!')) return;
    try {
      const res = await fetch('/api/admin/students/clear', { method: 'DELETE' });
      if (res.ok) fetchStudents();
    } catch (e) { console.error(e); }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.klas.toLowerCase().includes(search.toLowerCase())
  );

  const [showImportMenu, setShowImportMenu] = useState(false);
  const fileInputExcel = React.useRef<HTMLInputElement>(null);
  const fileInputPhotos = React.useRef<HTMLInputElement>(null);
  const fileInputPDF = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = () => setShowImportMenu(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // ... (rest van de functies blijven hetzelfde)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: '72px' }}>
      <TopNav user={user} />
      
      {/* Hidden Inputs */}
      <input type="file" ref={fileInputExcel} accept=".xlsx,.xls" onChange={handleImportXLSX} style={{ display: 'none' }} />
      <input type="file" ref={fileInputPhotos} accept=".pdf" onChange={handleLinkPhotosPDF} style={{ display: 'none' }} multiple />
      <input type="file" ref={fileInputPDF} accept=".pdf" onChange={handleImportPDF} style={{ display: 'none' }} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={() => navigate('/teacher')}><ArrowLeft size={20}/></button>
              <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0, letterSpacing: '-0.04em' }}>Leerlingen</h1>
            </div>
            <p className="text-muted" style={{ fontSize: '17px', fontWeight: '500' }}>{students.length} leerlingen in de database</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary" 
                onClick={(e) => { e.stopPropagation(); setShowImportMenu(!showImportMenu); }}
                style={{ background: 'white', border: '1px solid var(--system-border)' }}
              >
                <Upload size={18} /> Importeer / Beheer
              </button>
              
              {showImportMenu && (
                <div className="glass animate-up" 
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '240px', borderRadius: '14px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--system-border-light)', zIndex: 100, padding: '8px' }}>
                  <button onClick={() => { setShowImportMenu(false); fileInputExcel.current?.click(); }} style={{ ...dropdownItemStyle, color: '#1e8e3e' }}>
                    <FileSpreadsheet size={16} /> Excel Schoollijst
                  </button>
                  <button onClick={() => { setShowImportMenu(false); fileInputPhotos.current?.click(); }} style={{ ...dropdownItemStyle, color: 'var(--system-blue)' }}>
                    <Upload size={16} /> Koppel Foto's (PDF)
                  </button>
                  <button onClick={() => { setShowImportMenu(false); fileInputPDF.current?.click(); }} style={{ ...dropdownItemStyle }}>
                    <Users size={16} /> Nieuwe Klas (PDF)
                  </button>
                  <div style={{ height: '1px', background: 'var(--system-border-light)', margin: '4px 0' }} />
                  <button onClick={() => { setShowImportMenu(false); handleClearAll(); }} style={{ ...dropdownItemStyle, color: 'var(--system-error)' }}>
                    <Trash2 size={16} /> Lijst volledig wissen
                  </button>
                </div>
              )}
            </div>

            <button className="btn" onClick={() => { setCurrentStudent({ name: '', klas: '', email: '' }); setIsModalOpen(true); }}>
              <UserPlus size={18} /> Nieuwe Leerling
            </button>
          </div>
        </header>

        <div className="card" style={{ padding: '8px 16px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: 'none', boxShadow: 'var(--shadow-sm)', borderRadius: '14px' }}>
          <Search size={20} color="var(--system-secondary-text)" />
          <input 
            className="input" 
            style={{ border: 'none', boxShadow: 'none', fontSize: '17px', padding: '12px 0' }} 
            placeholder="Zoek op naam of klas..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f7', borderBottom: '1px solid var(--system-border-light)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: 'var(--system-secondary-text)' }}>FOTO</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: 'var(--system-secondary-text)' }}>NAAM</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: 'var(--system-secondary-text)' }}>KLAS</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: 'var(--system-secondary-text)' }}>EMAIL</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', color: 'var(--system-secondary-text)' }}>ACTIES</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} style={{ borderBottom: '1px solid #f5f5f7', transition: 'background 0.2s' }}>
                  <td style={{ padding: '12px 24px' }}>
                    {student.photo_url ? (
                      <img src={student.photo_url} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }} alt="" />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GraduationCap size={20} color="#ccc" />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 24px', fontWeight: '600' }}>{student.name}</td>
                  <td style={{ padding: '12px 24px' }}><span className="badge">{student.klas}</span></td>
                  <td style={{ padding: '12px 24px', color: 'var(--system-secondary-text)', fontSize: '14px' }}>{student.email || '-'}</td>
                  <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '8px', borderRadius: '10px' }} onClick={() => { setCurrentStudent(student); setIsModalOpen(true); }}><Edit3 size={16}/></button>
                      <button className="btn-secondary" style={{ padding: '8px', borderRadius: '10px', color: 'var(--system-error)' }} onClick={() => handleDelete(student.id)}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: 'var(--system-secondary-text)' }}>Geen leerlingen gevonden.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card animate-up" style={{ maxWidth: '450px', width: '100%', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ margin: 0 }}>{currentStudent?.id ? 'Leerling Bewerken' : 'Nieuwe Leerling'}</h2>
              <button className="btn-secondary" style={{ padding: '8px', borderRadius: '50%' }} onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>Naam</label>
                <input className="input" value={currentStudent?.name || ''} onChange={e => setCurrentStudent({...currentStudent!, name: e.target.value})} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>Klas</label>
                <input className="input" value={currentStudent?.klas || ''} onChange={e => setCurrentStudent({...currentStudent!, klas: e.target.value})} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '8px', textTransform: 'uppercase' }}>E-mail</label>
                <input className="input" type="email" value={currentStudent?.email || ''} onChange={e => setCurrentStudent({...currentStudent!, email: e.target.value})} />
              </div>
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
