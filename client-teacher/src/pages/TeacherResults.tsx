import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, List, Table as TableIcon, CheckCircle, XCircle, Save, Copy, FileDown, Trash2, Zap, FileJson } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import type { Question, Exam, Submission } from '../types';
import { io } from 'socket.io-client';

export default function TeacherResults() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentSubIdx, setCurrentSubIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'individual' | 'grouped' | 'table'>('individual');
  const [allManualScores, setAllManualScores] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchExam();
    fetchSubmissions();
    
    const socket = io();
    socket.on('submission_received', (data) => {
      if (data.examId === examId) fetchSubmissions();
    });
    return () => { socket.disconnect(); };
  }, [examId]);

  const fetchExam = async () => {
    try {
      const res = await fetch(`/api/exams/${examId}`);
      const data = await safeJson(res);
      setExam(data);
    } catch (e) { console.error(e); }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/exams/${examId}/submissions`);
      const data = await safeJson(res);
      setSubmissions(data);
      
      const initialScores: Record<string, any> = {};
      data.forEach((s: Submission) => {
        initialScores[s.id] = s.scores || {};
      });
      setAllManualScores(initialScores);
    } catch (e) { console.error(e); }
  };

  const copyForClassroom = () => {
    const text = submissions.map(sub => {
      const score = calculateTotalScore(sub.id);
      return `${sub.student_name}\t${score}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
    alert('Lijst gekopieerd naar klembord!');
  };

  const exportCSV = () => {
    const header = 'Naam,Klas,Score,Totaal\n';
    const rows = submissions.map(sub => {
      const score = calculateTotalScore(sub.id);
      return `${sub.student_name},${sub.student_klas},${score},${maxPoints}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Resultaten_${exam?.title.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const exportJSON = () => {
    const data = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exam: exam,
      submissions: submissions
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Toets_${exam?.title.replace(/\s+/g, '_')}_volledig.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateTotalScore = (subId: string) => {
    const scores = allManualScores[subId] || {};
    return Object.entries(scores).reduce((total, [_, score]) => {
      if (typeof score === 'object' && score !== null) {
        return total + Object.values(score).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0);
      }
      return total + (parseFloat(score as any) || 0);
    }, 0);
  };

  const getUnevaluatedCount = (subId: string) => {
    const scores = allManualScores[subId] || {};
    return exam?.questions.filter(q => {
      if (q.type === 'image-analysis') {
        const subScores = scores[q.id] || {};
        return q.subQuestions?.some(sq => subScores[sq.id] === undefined || subScores[sq.id] === null);
      }
      if (q.type === 'table-fill') {
        const subScores = scores[q.id] || {};
        return q.tableConfig?.interactiveCells?.some(ic => {
          const cellId = `${ic.r}-${ic.c}`;
          return subScores[cellId] === undefined || subScores[cellId] === null;
        });
      }
      return scores[q.id] === undefined || scores[q.id] === null;
    }).length || 0;
  };

  const maxPoints = exam?.questions.reduce((s: number, q: Question) => s + (q.type === 'image-analysis' ? (q.subQuestions?.reduce((ss, sq) => ss + sq.points, 0) || 0) : q.points), 0);

  const handleGroupScoreChange = (subIds: string[], qId: string, value: string) => {
    setHasUnsavedChanges(true);
    const numValue = value === '' ? null : parseFloat(value);
    setAllManualScores(prev => {
      const newScores = { ...prev };
      subIds.forEach(subId => {
        newScores[subId] = { ...(newScores[subId] || {}), [qId]: numValue };
      });
      return newScores;
    });
  };

  const handleScoreChange = (subIds: string | string[], qId: string, value: string, subQId?: string) => {
    setHasUnsavedChanges(true);
    const numValue = value === '' ? null : parseFloat(value);
    const ids = Array.isArray(subIds) ? subIds : [subIds];
    
    setAllManualScores(prev => {
      const newScores = { ...prev };
      ids.forEach(subId => {
        const currentStudentScores = { ...(newScores[subId] || {}) };
        if (subQId) {
          const subScores = { ...(currentStudentScores[qId] || {}) };
          subScores[subQId] = numValue;
          currentStudentScores[qId] = subScores;
        } else {
          currentStudentScores[qId] = numValue;
        }
        newScores[subId] = currentStudentScores;
      });
      return newScores;
    });
  };

  const saveAllScores = async () => {
    setIsSaving(true);
    try {
      await Promise.all(Object.entries(allManualScores).map(([subId, scores]) => 
        fetch(`/api/submissions/${subId}/scores`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scores })
        })
      ));
      setHasUnsavedChanges(false);
      alert('Alle scores zijn succesvol opgeslagen!');
      fetchSubmissions();
    } catch (e) {
      console.error(e);
      alert('Fout bij het opslaan van de scores.');
    } finally { setIsSaving(false); }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('Inzending definitief verwijderen?')) return;
    await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
    fetchSubmissions();
  };

  const StudentAnswerView = ({ q, answer, subIds }: { q: Question, answer: any, subIds?: string[] }) => {
    const firstSubId = subIds?.[0];
    const studentScores = firstSubId ? (allManualScores[firstSubId] || {}) : {};
    const qScores = studentScores[q.id] || {};

    if (q.type === 'multiple-choice') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {q.options?.map((opt, idx) => {
            const isSelected = answer === opt; const isCorrect = q.correctAnswer === opt;
            return <div key={idx} style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid', background: isSelected ? (isCorrect ? '#f0fdf4' : '#fff1f2') : 'white', borderColor: isSelected ? (isCorrect ? '#22c55e' : '#ef4444') : '#d2d2d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: isSelected ? '700' : '500' }}>{opt}</span>{isSelected && (isCorrect ? <CheckCircle size={18} color="#22c55e" /> : <XCircle size={18} color="#ef4444" />)}</div>;
          })}
        </div>
      );
    }
    if (q.type === 'true-false') {
      const val = answer?.value || answer;
      const explanation = answer?.explanation;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: val === q.correctAnswer ? '#22c55e' : '#ef4444' }}>{val || 'Niet ingevuld'}</div>
          {explanation && (
            <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid var(--system-border)', borderLeft: '4px solid var(--system-blue)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '4px', textTransform: 'uppercase' }}>Uitleg van student:</div>
              <div style={{ fontSize: '15px', lineHeight: '1.5' }}>{explanation}</div>
            </div>
          )}
        </div>
      );
    }
    if (q.type === 'fill-blanks') {
      const parts = (q.content || '').split(/(\{.*?\})/g);
      return (
        <div style={{ fontSize: '17px', lineHeight: '1.8', background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--system-border)' }}>
          {parts.map((part, i) => {
            if (part.startsWith('{') && part.endsWith('}')) {
              const expected = part.slice(1, -1).toLowerCase().trim();
              const studentVal = (answer?.[part] || '').toLowerCase().trim();
              const isCorrect = expected === studentVal;
              return <span key={i} style={{ padding: '2px 8px', borderRadius: '6px', background: isCorrect ? '#f0fdf4' : '#fff1f2', color: isCorrect ? '#166534' : '#991b1b', fontWeight: '700', margin: '0 4px', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444' }}>{studentVal || '___'}{!isCorrect && <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px' }}>({expected})</span>}</span>;
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    }
    if (q.type === 'multi-true-false') {
      return (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--system-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f5f5f7', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left' }}>Stelling</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', width: '150px' }}>Antwoord</th>
              </tr>
            </thead>
            <tbody>
              {(q.statements || []).map((s: any) => {
                const studentVal = answer?.[s.id]; const isCorrect = studentVal === s.correctAnswer;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td style={{ padding: '12px 20px' }}>{s.text}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', background: studentVal ? (isCorrect ? '#f0fdf4' : '#fff1f2') : '#f5f5f7', color: studentVal ? (isCorrect ? '#166534' : '#991b1b') : '#86868b', fontWeight: '700', border: '1px solid', borderColor: studentVal ? (isCorrect ? '#22c55e' : '#ef4444') : '#d2d2d7' }}>{studentVal || 'Geen'}{!isCorrect && studentVal && <span style={{ fontSize: '10px', display: 'block', color: 'var(--system-blue)' }}>Correct: {s.correctAnswer}</span>}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    if (q.type === 'table-fill') {
      const autoGradeAll = () => {
        if (!subIds) return;
        (q.tableData || []).forEach((row, rIdx) => {
          row.forEach((cell, cIdx) => {
            const isInteractive = q.tableConfig?.interactiveCells?.some(ic => ic.r === rIdx && ic.c === cIdx) || (answer?.[`${rIdx}-${cIdx}`] !== undefined);
            if (isInteractive) {
              const cellId = `${rIdx}-${cIdx}`;
              const studentAns = answer?.[cellId];
              const studentText = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';
              const isCellCorrect = studentText.toLowerCase().trim() === cell.toLowerCase().trim();
              handleScoreChange(subIds, q.id, isCellCorrect ? '1' : '0', cellId);
            }
          });
        });
      };

      const hasInteractiveConfig = q.tableConfig?.interactiveCells && q.tableConfig.interactiveCells.length > 0;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {subIds && subIds.length > 0 && (
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 12px', background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}
                onClick={autoGradeAll}
              >
                <Zap size={14} style={{ marginRight: '6px' }} /> Automatisch verbeteren (gebaseerd op exacte match)
              </button>
            )}
            {!hasInteractiveConfig && (
              <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', background: '#fef2f2', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                Let op: Er zijn geen invulvelden geconfigureerd voor deze tabel. Je kunt wel handmatig punten toekennen aan cellen die ingevuld zijn.
              </div>
            )}
          </div>
          <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid var(--system-border)', padding: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>{(q.tableData || []).map((row, rIdx) => (
                <tr key={rIdx}>{row.map((cell, cIdx) => {
                  const cellId = `${rIdx}-${cIdx}`;
                  const studentAns = answer?.[cellId];
                  const hasAnswer = studentAns !== undefined && studentAns !== null && studentAns !== '';
                  const isInteractive = q.tableConfig?.interactiveCells?.some(ic => ic.r === rIdx && ic.c === cIdx);
                  
                  // Toon grading buttons als het interactief IS of als er een antwoord IS (fallback)
                  const showGrading = isInteractive || hasAnswer;

                  if (!showGrading) return <td key={cIdx} style={{ border: '1px solid #eee', padding: '10px', background: rIdx === 0 ? '#f5f5f7' : '#fafafa', fontSize: '13px', fontWeight: rIdx === 0 ? 'bold' : 'normal', textAlign: 'center' }}>{cell}</td>;
                  
                  const studentText = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';
                  const cellScore = qScores[cellId];

                  const isCorrect = studentText.toLowerCase().trim() === cell.toLowerCase().trim();

                  return (
                    <td key={cIdx} style={{ border: '1px solid #eee', padding: '8px', textAlign: 'center', background: isInteractive ? 'white' : '#fffbeb' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
                        <div style={{ padding: '6px', borderRadius: '6px', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', color: isCorrect ? '#166534' : '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                          {studentText || (isInteractive ? '-' : '(Niet ingevuld)')}
                          {!isCorrect && studentText && <div style={{ fontSize: '10px', marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '4px' }}>Correct: {cell}</div>}
                        </div>
                        
                        {subIds && subIds.length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: cellScore === 0 ? 'white' : 'var(--system-error)', background: cellScore === 0 ? 'var(--system-error)' : 'transparent', borderRadius: '6px', border: '1px solid var(--system-error)', cursor: 'pointer' }}
                              onClick={() => handleScoreChange(subIds, q.id, '0', cellId)}
                              title="Fout"
                            >
                              <XCircle size={16} />
                            </button>
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: cellScore === 1 ? 'white' : 'var(--system-success)', background: cellScore === 1 ? 'var(--system-success)' : 'transparent', borderRadius: '6px', border: '1px solid var(--system-success)', cursor: 'pointer' }}
                              onClick={() => handleScoreChange(subIds, q.id, '1', cellId)}
                              title="Goed"
                            >
                              <CheckCircle size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}</tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      );
    }
    return <div style={{ fontSize: '17px', whiteSpace: 'pre-wrap' }}>{typeof answer === 'string' ? answer : <pre style={{ fontSize: '12px' }}>{JSON.stringify(answer, null, 2)}</pre>}</div>;
  };

  const GroupedQuestionResultRenderer = ({ q, groupedSubs }: { q: Question, groupedSubs: { answer: any, submissions: Submission[] }[] }) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {groupedSubs.map((group, idx) => (
          <div key={idx} className="card" style={{ padding: '24px', border: '1px solid var(--system-border)', background: 'rgba(255,255,255,0.5)' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}><StudentAnswerView q={q} answer={group.answer} subIds={group.submissions.map(s => s.id)} /></div>
              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {group.submissions.map(s => <span key={s.id} className="badge" style={{ background: 'var(--system-blue-light)', color: 'var(--system-blue)' }}>{s.student_name}</span>)}
                </div>
                {q.type !== 'table-fill' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="number" className="input" style={{ width: '80px' }} value={allManualScores[group.submissions[0].id]?.[q.id] ?? ''} onChange={e => handleGroupScoreChange(group.submissions.map(s => s.id), q.id, e.target.value)} placeholder="Score..." />
                    <span className="text-muted">/ {q.points}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const safeJson = async (res: Response) => {
    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && contentType.includes("application/json")) return await res.json();
    throw new Error(`Invalid response: ${res.status}`);
  };

  if (!exam) return <div className="loading-container">Laden...</div>;
  const currentSub = submissions[currentSubIdx];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: '72px' }}>
      <TopNav user={user} />
      
      {hasUnsavedChanges && (
        <div className="glass" style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', padding: '16px 32px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 1000, border: '1px solid rgba(255,255,255,0.2)' }}>
          <span style={{ fontWeight: '600' }}>Je hebt niet-opgeslagen wijzigingen</span>
          <button className="btn" onClick={saveAllScores} disabled={isSaving} style={{ padding: '10px 24px' }}><Save size={18} /> {isSaving ? 'Bezig...' : 'Alle scores opslaan'}</button>
        </div>
      )}

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={() => navigate('/teacher')}><ArrowLeft size={20}/></button>
              <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0, letterSpacing: '-0.04em' }}>Resultaten</h1>
            </div>
            <p className="text-muted" style={{ fontSize: '17px', fontWeight: '500' }}>{exam.title} • {submissions.length} inzendingen</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={exportJSON} title="Download alles als JSON"><FileJson size={18} /> JSON Export</button>
            <button className="btn btn-secondary" onClick={copyForClassroom} title="Kopieer voor spreadsheet/Classroom"><Copy size={18} /> Kopieer lijst</button>
            <button className="btn btn-secondary" onClick={exportCSV} title="Download CSV bestand"><FileDown size={18} /> CSV Export</button>
          </div>
        </header>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', background: 'white', padding: '6px', borderRadius: '14px', width: 'fit-content', boxShadow: 'var(--shadow-sm)' }}>
          <button className={`filter-item ${viewMode === 'individual' ? 'active' : ''}`} onClick={() => setViewMode('individual')}><User size={18} /> Per student</button>
          <button className={`filter-item ${viewMode === 'grouped' ? 'active' : ''}`} onClick={() => setViewMode('grouped')}><List size={18} /> Per vraag</button>
          <button className={`filter-item ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><TableIcon size={18} /> Tabel</button>
        </div>

        {submissions.length === 0 ? <div className="card" style={{ padding: '80px', textAlign: 'center' }}><p className="text-muted">Nog geen inzendingen.</p></div> : viewMode === 'individual' ? (
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {submissions.map((sub, idx) => {
                const unevaluated = getUnevaluatedCount(sub.id);
                return (
                  <button key={sub.id} onClick={() => setCurrentSubIdx(idx)} className={`card ${currentSubIdx === idx ? 'active' : ''}`} style={{ padding: '16px 20px', textAlign: 'left', cursor: 'pointer', border: currentSubIdx === idx ? '2px solid var(--system-blue)' : '1px solid transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{sub.student_name}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{sub.student_klas}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: 'var(--system-blue)' }}>{calculateTotalScore(sub.id)} / {maxPoints}</div>
                      {unevaluated > 0 && <span style={{ fontSize: '10px', color: 'orange', fontWeight: 'bold' }}>{unevaluated} te verbeteren</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1 }}>
              {currentSub && (
                <div className="animate-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h2 style={{ margin: 0 }}>{currentSub.student_name}</h2>
                    <button className="btn btn-secondary" style={{ color: 'var(--system-error)' }} onClick={() => handleDeleteSubmission(currentSub.id)}><Trash2 size={18} /> Verwijder</button>
                  </div>
                  {exam.questions.map((q, idx) => {
                    const studentScores = allManualScores[currentSub.id] || {};
                    const isTableFill = q.type === 'table-fill';
                    return (
                      <div key={q.id} className="card" style={{ padding: '40px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                          <span className="badge">VRAAG {idx + 1}</span>
                          {!isTableFill && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <input type="number" className="input" style={{ width: '80px' }} value={studentScores[q.id] ?? ''} onChange={e => handleScoreChange(currentSub.id, q.id, e.target.value)} placeholder="Score..." />
                              <span className="text-muted">/ {q.points}</span>
                            </div>
                          )}
                          {isTableFill && <span className="text-muted" style={{ fontWeight: '700', color: 'var(--system-blue)' }}>Score: {Object.values(studentScores[q.id] || {}).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0)} / {q.points}</span>}
                        </div>
                        <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '32px' }}>{q.text}</p>
                        <StudentAnswerView q={q} answer={currentSub.answers[q.id]} subIds={[currentSub.id]} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'grouped' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {exam.questions.map((q, idx) => {
              const groups: Record<string, { answer: any, submissions: Submission[] }> = {};
              submissions.forEach(sub => {
                const ans = JSON.stringify(sub.answers[q.id] || '');
                if (!groups[ans]) groups[ans] = { answer: sub.answers[q.id], submissions: [] };
                groups[ans].submissions.push(sub);
              });
              return (
                <section key={q.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0 }}>Vraag {idx + 1}: {q.text}</h3>
                    <span className="badge">{q.points} PUNTEN</span>
                  </div>
                  <GroupedQuestionResultRenderer q={q} groupedSubs={Object.values(groups)} />
                </section>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f7', borderBottom: '1px solid var(--system-border)' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left' }}>Student</th>
                  {exam.questions.map((_, i) => <th key={i} style={{ padding: '16px 24px', textAlign: 'center' }}>V{i+1}</th>)}
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>Totaal</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td style={{ padding: '16px 24px', fontWeight: '600' }}>{sub.student_name}</td>
                    {exam.questions.map(q => {
                      const score = allManualScores[sub.id]?.[q.id];
                      const displayScore = typeof score === 'object' && score !== null ? Object.values(score).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0) : (score ?? '-');
                      return <td key={q.id} style={{ padding: '16px 24px', textAlign: 'center' }}>{displayScore}</td>;
                    })}
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '800', color: 'var(--system-blue)' }}>{calculateTotalScore(sub.id)} / {maxPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
