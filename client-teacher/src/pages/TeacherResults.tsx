import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, List, Table as TableIcon, CheckCircle, XCircle, Save, Copy, FileDown, Trash2, Zap, FileJson, ChevronLeft, ChevronRight, Settings, ChevronDown } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import type { Question, Exam, Submission } from '../types';
import { io } from 'socket.io-client';
import * as JSZip from 'jszip';

export default function TeacherResults() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentSubIdx, setCurrentSubIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'individual' | 'grouped' | 'table'>('individual');
  const [allManualScores, setAllManualScores] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [ignorePunctuation, setIgnorePunctuation] = useState(true);
  const [showGradeOptions, setShowGradeOptions] = useState<string | null>(null);

  useEffect(() => {
    fetchExam();
    fetchSubmissions();
    
    const socket = io();
    socket.on('submission_received', (data) => {
      if (data.examId === examId) fetchSubmissions();
    });

    const handleClickOutside = () => {
      setShowGradeOptions(null);
    };
    window.addEventListener('click', handleClickOutside);

    return () => { 
      socket.disconnect(); 
      window.removeEventListener('click', handleClickOutside);
    };
  }, [examId]);

  const fetchExam = async () => {
    try {
      const res = await fetch(`/api/exams/details/${examId}`);
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

  const exportJSON = async () => {
    try {
      const zip = new JSZip();
      const exportData = {
        version: '2.0',
        exported_at: new Date().toISOString(),
        exam: exam,
        submissions: submissions
      };
      
      zip.file("data.json", JSON.stringify(exportData, null, 2));
      
      const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Toets_${exam?.title.replace(/\s+/g, '_')}_volledig.exam`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Fout bij exporteren');
    }
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

  const normalize = (str: string) => {
    let result = str.trim();
    if (ignoreCase) result = result.toLowerCase();
    if (ignorePunctuation) result = result.replace(/[.,!?;:]/g, '');
    return result.trim();
  };

  const handleAutoGradeTable = (q: Question, targetSubmissions: Submission[]) => {
    setHasUnsavedChanges(true);
    setAllManualScores(prev => {
      const newScores = { ...prev };
      targetSubmissions.forEach(sub => {
        const subId = sub.id;
        const currentStudentScores = { ...(newScores[subId] || {}) };
        const qScores = { ...(currentStudentScores[q.id] || {}) };
        const studentAnswer = sub.answers[q.id] || {};

        (q.tableData || []).forEach((row, rIdx) => {
          row.forEach((cell, cIdx) => {
            const isInteractive = q.tableConfig?.interactiveCells?.some(ic => ic.r === rIdx && ic.c === cIdx) || (studentAnswer?.[`${rIdx}-${cIdx}`] !== undefined);
            if (isInteractive) {
              const cellId = `${rIdx}-${cIdx}`;
              const studentAns = studentAnswer[cellId];
              const studentText = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';
              const isCellCorrect = normalize(studentText) === normalize(cell);
              qScores[cellId] = isCellCorrect ? 1 : 0;
            }
          });
        });
        currentStudentScores[q.id] = qScores;
        newScores[subId] = currentStudentScores;
      });
      return newScores;
    });
  };

  const AutoGradeOptions = () => (
    <div className="glass animate-up" style={{ position: 'absolute', top: '40px', left: '0', background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 100, width: '240px', border: '1px solid rgba(0,0,0,0.05)' }}>
      <p style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '800', color: 'var(--system-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verbeter Opties</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
          <input type="checkbox" checked={ignoreCase} onChange={e => setIgnoreCase(e.target.checked)} style={{ width: '16px', height: '16px' }} />
          Negeer hoofdletters
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
          <input type="checkbox" checked={ignorePunctuation} onChange={e => setIgnorePunctuation(e.target.checked)} style={{ width: '16px', height: '16px' }} />
          Negeer interpunctie
        </label>
      </div>
    </div>
  );

  const StudentAnswerView = ({ q, answer, subIds }: { q: Question, answer: any, subIds?: string[] }) => {
    const firstSubId = subIds?.[0];
    const studentScores = firstSubId ? (allManualScores[firstSubId] || {}) : {};
    const qScores = studentScores[q.id] || {};

    if (q.type === 'map') {
      const studentMarkers = answer || {};
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {subIds && subIds.length > 0 && (
            <button 
              className="btn btn-secondary" 
              style={{ alignSelf: 'flex-start', fontSize: '12px', padding: '8px 16px', background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e', borderRadius: '12px', fontWeight: '700' }}
              onClick={() => {
                setHasUnsavedChanges(true);
                setAllManualScores(prev => {
                  const newScores = { ...prev };
                  subIds.forEach(subId => {
                    const studentAns = submissions.find(s => s.id === subId)?.answers[q.id] || {};
                    let correctCount = 0;
                    q.locations?.forEach(loc => {
                      const pos = studentAns[loc.id];
                      if (pos) {
                        const dist = Math.sqrt(Math.pow(pos.x - loc.x, 2) + Math.pow(pos.y - loc.y, 2));
                        if (dist < 5) correctCount++; // Binnen 5% straal is correct
                      }
                    });
                    newScores[subId] = { ...(newScores[subId] || {}), [q.id]: correctCount };
                  });
                  return newScores;
                });
              }}
            >
              <Zap size={14} style={{ marginRight: '8px' }} /> Automatisch verbeteren (nabijheid < 5%)
            </button>
          )}
          <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--system-border)', background: 'white' }}>
            <img src={q.image} style={{ width: '100%', display: 'block' }} />
            {q.locations?.map(loc => {
              const pos = studentMarkers[loc.id];
              const isPlaced = !!pos;
              const dist = pos ? Math.sqrt(Math.pow(pos.x - loc.x, 2) + Math.pow(pos.y - loc.y, 2)) : 100;
              const isCorrect = dist < 5;

              return (
                <div key={loc.id}>
                  {/* Correcte positie (ghost) */}
                  <div style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, width: '12px', height: '12px', background: 'rgba(34, 197, 94, 0.3)', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '2px dashed #22c55e' }} title={`Correcte plek voor: ${loc.label}`} />
                  
                  {/* Student positie */}
                  {isPlaced && (
                    <div style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', zIndex: 20 }}>
                      <div style={{ padding: '4px 10px', background: isCorrect ? '#22c55e' : '#ef4444', color: 'white', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isCorrect ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {loc.label}
                      </div>
                      <div style={{ width: '2px', height: '10px', background: isCorrect ? '#22c55e' : '#ef4444', margin: '0 auto' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--system-secondary-text)', background: 'var(--system-secondary-bg)', padding: '12px', borderRadius: '10px' }}>
            💡 De gestippelde cirkels geven de correcte locaties aan. De gekleurde labels zijn de antwoorden van de student.
          </div>
        </div>
      );
    }

    if (q.type === 'image-analysis') {
      const studentAnswers = answer || {};
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <img src={q.image} style={{ width: '100%', borderRadius: '16px', border: '1px solid var(--system-border)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {q.subQuestions?.map((sq, idx) => {
              const studentVal = studentAnswers[sq.id] || '';
              const subScore = qScores[sq.id];
              return (
                <div key={sq.id} style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--system-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{idx + 1}. {sq.text}</div>
                    <span className="badge" style={{ fontSize: '10px' }}>{sq.points} PT</span>
                  </div>
                  <div style={{ fontSize: '15px', padding: '12px', background: 'var(--system-secondary-bg)', borderRadius: '10px', minHeight: '60px', whiteSpace: 'pre-wrap' }}>{studentVal || '(Geen antwoord)'}</div>
                  
                  {subIds && subIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>Score:</span>
                      <input 
                        type="number" 
                        className="input" 
                        style={{ width: '70px', height: '32px', textAlign: 'center' }} 
                        value={subScore ?? ''} 
                        onChange={e => handleScoreChange(subIds, q.id, e.target.value, sq.id)}
                        placeholder="0"
                      />
                      <span className="text-muted">/ {sq.points}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
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

    if (q.type === 'definitions') {
      const studentAnswers = answer || {};
      return (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--system-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f7', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left' }}>Definitie</th>
                <th style={{ padding: '12px 20px', textAlign: 'left' }}>Antwoord (Term)</th>
              </tr>
            </thead>
            <tbody>
              {q.pairs?.map(pair => {
                const studentVal = studentAnswers[pair.id];
                const isCorrect = normalize(studentVal || '') === normalize(pair.term);
                return (
                  <tr key={pair.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td style={{ padding: '12px 20px', fontSize: '14px' }}>{pair.definition}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ padding: '4px 12px', borderRadius: '6px', background: isCorrect ? '#f0fdf4' : '#fff1f2', color: isCorrect ? '#166534' : '#991b1b', fontWeight: '700', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444' }}>
                        {studentVal || '(Leeg)'}
                        {!isCorrect && <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '8px' }}>(Correct: {pair.term})</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (q.type === 'matching') {
      const studentAnswers = answer || {};
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {q.matchingPairs?.map(pair => {
            const studentVal = studentAnswers[pair.id];
            const isCorrect = studentVal === pair.right;
            return (
              <div key={pair.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1, padding: '12px 20px', background: '#f5f5f7', borderRadius: '12px', fontWeight: '600' }}>{pair.left}</div>
                <div style={{ color: 'var(--system-secondary-text)' }}>→</div>
                <div style={{ flex: 1, padding: '12px 20px', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', color: isCorrect ? '#166534' : '#991b1b', borderRadius: '12px', fontWeight: '700' }}>
                  {studentVal || '(Geen match)'}
                  {!isCorrect && <span style={{ fontSize: '10px', display: 'block', opacity: 0.7 }}>Correct: {pair.right}</span>}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (q.type === 'ordering') {
      const studentOrder = Array.isArray(answer) ? answer : [];
      const correctOrder = q.orderItems || [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {studentOrder.map((item, idx) => {
            const isCorrect = item === correctOrder[idx];
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', borderRadius: '12px' }}>
                <span style={{ fontWeight: '800', color: 'var(--system-secondary-text)', width: '24px' }}>{idx + 1}.</span>
                <span style={{ fontWeight: '600', color: isCorrect ? '#166534' : '#991b1b' }}>{item}</span>
                {!isCorrect && <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.6 }}>Correcte plek: {correctOrder.indexOf(item) + 1}</span>}
              </div>
            );
          })}
          {studentOrder.length === 0 && <p className="text-muted">Geen antwoord gegeven.</p>}
        </div>
      );
    }

    if (q.type === 'timeline') {
      const studentBuckets = Array.isArray(answer) ? answer : [];
      const correctBuckets = q.timelineData || [];
      return (
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          {correctBuckets.map((bucket, bIdx) => (
            <div key={bIdx} style={{ minWidth: '200px', flex: 1, background: '#f5f5f7', borderRadius: '16px', padding: '16px', border: '1px solid var(--system-border)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '16px', textAlign: 'center', color: 'var(--system-secondary-text)' }}>PERIODE {bIdx + 1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {studentBuckets[bIdx]?.map((item: any, iIdx: number) => {
                  const isInCorrectBucket = bucket.some(b => b.id === item.id);
                  return (
                    <div key={iIdx} style={{ padding: '8px 12px', background: isInCorrectBucket ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isInCorrectBucket ? '#22c55e' : '#ef4444', color: isInCorrectBucket ? '#166534' : '#991b1b', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                      {item.text}
                    </div>
                  );
                })}
                {(!studentBuckets[bIdx] || studentBuckets[bIdx].length === 0) && <div style={{ height: '40px', border: '1px dashed #ccc', borderRadius: '8px' }} />}
              </div>
            </div>
          ))}
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
      const hasInteractiveConfig = q.tableConfig?.interactiveCells && q.tableConfig.interactiveCells.length > 0;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!hasInteractiveConfig && (
            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', background: '#fef2f2', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
              Let op: Er zijn geen invulvelden geconfigureerd voor deze tabel. Je kunt wel handmatig punten toekennen aan cellen die ingevuld zijn.
            </div>
          )}
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

                  const isCorrect = normalize(studentText) === normalize(cell);

                  return (
                    <td key={cIdx} style={{ border: '1px solid #eee', padding: '8px', textAlign: 'center', background: isInteractive ? 'white' : '#fffbeb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: '120px' }}>
                        <div style={{ flex: 1, padding: '6px', borderRadius: '6px', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', color: isCorrect ? '#166534' : '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                          {studentText || (isInteractive ? '-' : '(Niet ingevuld)')}
                          {!isCorrect && studentText && <div style={{ fontSize: '10px', marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '4px' }}>Correct: {cell}</div>}
                        </div>
                        
                        {subIds && subIds.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cellScore === 1 ? 'white' : 'var(--system-success)', background: cellScore === 1 ? 'var(--system-success)' : 'transparent', borderRadius: '4px', border: '1px solid var(--system-success)', cursor: 'pointer' }}
                              onClick={() => handleScoreChange(subIds, q.id, '1', cellId)}
                              title="Goed"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cellScore === 0 ? 'white' : 'var(--system-error)', background: cellScore === 0 ? 'var(--system-error)' : 'transparent', borderRadius: '4px', border: '1px solid var(--system-error)', cursor: 'pointer' }}
                              onClick={() => handleScoreChange(subIds, q.id, '0', cellId)}
                              title="Fout"
                            >
                              <XCircle size={14} />
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
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {group.submissions.map(s => <span key={s.id} className="badge" style={{ background: 'var(--system-blue-light)', color: 'var(--system-blue)' }}>{s.student_name}</span>)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8f9fa', padding: '12px', borderRadius: '14px', border: '1px solid #eee' }}>
                    {q.type === 'table-fill' ? (
                      <span style={{ fontWeight: '800', color: 'var(--system-blue)', fontSize: '14px' }}>
                        Score: {Object.values(allManualScores[group.submissions[0].id]?.[q.id] || {}).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0)} / {q.points}
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#666' }}>Score:</span>
                        <input 
                          type="number" 
                          className="input" 
                          style={{ width: '90px', height: '36px', fontSize: '16px', textAlign: 'center', fontWeight: 'bold' }} 
                          value={allManualScores[group.submissions[0].id]?.[q.id] ?? ''} 
                          onChange={e => handleGroupScoreChange(group.submissions.map(s => s.id), q.id, e.target.value)} 
                        />
                        <span className="text-muted" style={{ fontWeight: '600' }}>/ {q.points}</span>
                      </>
                    )}
                  </div>
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
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', background: 'white', padding: '16px 24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <button className="btn btn-secondary" disabled={currentSubIdx === 0} onClick={() => setCurrentSubIdx(prev => prev - 1)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronLeft size={20} /> Vorige
              </button>
              <div style={{ textAlign: 'center', minWidth: '300px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <select 
                    className="input" 
                    style={{ width: '100%', fontSize: '18px', fontWeight: '800', textAlign: 'center', border: 'none', background: 'transparent', cursor: 'pointer', paddingRight: '20px', appearance: 'none' }}
                    value={currentSubIdx}
                    onChange={(e) => setCurrentSubIdx(parseInt(e.target.value))}
                  >
                    {submissions.map((sub, idx) => (
                      <option key={sub.id} value={idx}>{sub.student_name} ({sub.student_klas})</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '10%', pointerEvents: 'none', opacity: 0.5 }} />
                </div>
                <div className="text-muted" style={{ fontSize: '13px' }}>Student {currentSubIdx + 1} van {submissions.length}</div>
              </div>
              <button className="btn btn-secondary" disabled={currentSubIdx === submissions.length - 1} onClick={() => setCurrentSubIdx(prev => prev + 1)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Volgende <ChevronRight size={20} />
              </button>
            </div>

            {currentSub && (
              <div className="animate-up">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button className="btn btn-secondary" style={{ color: 'var(--system-error)', padding: '6px 12px', fontSize: '13px' }} onClick={() => handleDeleteSubmission(currentSub.id)}><Trash2 size={16} /> Inzending verwijderen</button>
                </div>
                {exam.questions.map((q, idx) => {
                  const studentScores = allManualScores[currentSub.id] || {};
                  const isTableFill = q.type === 'table-fill';
                  return (
                    <div key={q.id} className="card" style={{ padding: '40px', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span className="badge">VRAAG {idx + 1}</span>
                          {isTableFill && (
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ height: '32px', display: 'flex', alignItems: 'center', fontSize: '11px', padding: '0 12px', background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e', borderRadius: '10px 0 0 10px', borderRight: 'none', fontWeight: '600' }}
                                onClick={() => handleAutoGradeTable(q, [currentSub])}
                              >
                                <Zap size={13} style={{ marginRight: '6px' }} /> Verbeter tabel
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e', borderRadius: '0 10px 10px 0' }}
                                onClick={(e) => { e.stopPropagation(); setShowGradeOptions(showGradeOptions === q.id ? null : q.id as any); }}
                              >
                                <Settings size={13} />
                              </button>
                              {showGradeOptions === q.id && <AutoGradeOptions />}
                            </div>
                          )}
                        </div>
                        {!isTableFill ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8f9fa', padding: '8px 16px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#444' }}>Score:</span>
                            <input 
                              type="number" 
                              className="input" 
                              style={{ width: '90px', height: '36px', fontSize: '16px', textAlign: 'center', fontWeight: 'bold' }} 
                              value={studentScores[q.id] ?? ''} 
                              onChange={e => handleScoreChange(currentSub.id, q.id, e.target.value)}
                            />
                            <span className="text-muted" style={{ fontWeight: '600' }}>/ {q.points}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', background: '#f0f7ff', padding: '8px 16px', borderRadius: '12px', border: '1px solid #d0e7ff' }}>
                            <span style={{ fontWeight: '800', color: 'var(--system-blue)', fontSize: '15px' }}>
                              Score: {Object.values(studentScores[q.id] || {}).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0)} / {q.points}
                            </span>
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '32px' }}>{q.text}</p>
                      <StudentAnswerView q={q} answer={currentSub.answers[q.id]} subIds={[currentSub.id]} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : viewMode === 'grouped' ? (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', background: 'white', padding: '16px 24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <button className="btn btn-secondary" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => prev - 1)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronLeft size={20} /> Vorige
              </button>
              <div style={{ textAlign: 'center', minWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <select 
                    className="input" 
                    style={{ width: '100%', fontSize: '18px', fontWeight: '800', textAlign: 'center', border: 'none', background: 'transparent', cursor: 'pointer', paddingRight: '20px', appearance: 'none' }}
                    value={currentQuestionIdx}
                    onChange={(e) => setCurrentQuestionIdx(parseInt(e.target.value))}
                  >
                    {exam.questions.map((q, idx) => (
                      <option key={q.id} value={idx}>Vraag {idx + 1}: {q.text.substring(0, 40)}{q.text.length > 40 ? '...' : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '10%', pointerEvents: 'none', opacity: 0.5 }} />
                </div>
                <div className="text-muted" style={{ fontSize: '13px' }}>Vraag {currentQuestionIdx + 1} van {exam.questions.length}</div>
              </div>
              <button className="btn btn-secondary" disabled={currentQuestionIdx === exam.questions.length - 1} onClick={() => setCurrentQuestionIdx(prev => prev + 1)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Volgende <ChevronRight size={20} />
              </button>
            </div>

            {(() => {
              const q = exam.questions[currentQuestionIdx];
              const groups: Record<string, { answer: any, submissions: Submission[] }> = {};
              submissions.forEach(sub => {
                const ans = JSON.stringify(sub.answers[q.id] || '');
                if (!groups[ans]) groups[ans] = { answer: sub.answers[q.id], submissions: [] };
                groups[ans].submissions.push(sub);
              });
              return (
                <section key={q.id} className="animate-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '22px' }}>{q.text}</h3>
                      {q.type === 'table-fill' && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ height: '36px', display: 'flex', alignItems: 'center', fontSize: '12px', padding: '0 16px', background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e', borderRadius: '12px 0 0 12px', fontWeight: '700', borderRight: 'none' }}
                            onClick={() => handleAutoGradeTable(q, submissions)}
                          >
                            <Zap size={14} style={{ marginRight: '8px' }} /> Alle tabellen automatisch verbeteren
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e', borderRadius: '0 12px 12px 0' }}
                            onClick={(e) => { e.stopPropagation(); setShowGradeOptions(showGradeOptions === q.id ? null : q.id as any); }}
                          >
                            <Settings size={14} />
                          </button>
                          {showGradeOptions === q.id && <AutoGradeOptions />}
                        </div>
                      )}
                    </div>
                    <span className="badge">{q.points} PUNTEN</span>
                  </div>
                  <GroupedQuestionResultRenderer q={q} groupedSubs={Object.values(groups)} />
                </section>
              );
            })()}
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
