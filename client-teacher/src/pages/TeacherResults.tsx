import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, User, List, Table as TableIcon, CheckCircle, XCircle, MapPin, Save, Copy, FileDown, GraduationCap } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import type { Question, Exam, Submission } from '../types';

export default function TeacherResults() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'individual' | 'question' | 'table'>('individual');
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  
  const [allManualScores, setAllManualScores] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (user.role !== 'teacher') { navigate('/login'); return; }
    fetchData();
  }, [examId]); // Alleen herladen als het examen-ID verandert

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const calculateAutoScore = (q: Question, answer: any): number | null => {
    if (answer === undefined || answer === null) return 0;
    switch (q.type) {
      case 'multiple-choice': return answer === q.correctAnswer ? q.points : 0;
      case 'true-false': return (answer?.value || answer) === q.correctAnswer ? q.points : 0;
      case 'matching': {
        if (!q.matchingPairs || !Array.isArray(answer)) return 0;
        const correctCount = q.matchingPairs.filter((p, idx) => answer[idx]?.text === p.right).length;
        return parseFloat(((correctCount / q.matchingPairs.length) * q.points).toFixed(2));
      }
      case 'ordering': {
        if (!q.orderItems || !Array.isArray(answer)) return 0;
        const correctCount = q.orderItems.filter((item, idx) => answer[idx]?.text === item).length;
        return parseFloat(((correctCount / q.orderItems.length) * q.points).toFixed(2));
      }
      case 'definitions': {
        if (!q.pairs) return 0;
        const correctCount = q.pairs.filter(p => {
          const studentTerm = (answer?.[p.id] || '').toLowerCase().trim();
          return studentTerm === (p.term || '').toLowerCase().trim();
        }).length;
        return parseFloat(((correctCount / q.pairs.length) * q.points).toFixed(2));
      }
      case 'timeline': {
        if (!q.timelineData || !answer?.placed) return 0;
        let correctCount = 0; let totalEvents = 0;
        q.timelineData.forEach((bucket, correctIdx) => {
          bucket.forEach(event => {
            totalEvents++;
            const studentBucketIdx = Object.keys(answer.placed).find(bIdx => 
              answer.placed[bIdx]?.some((ev: any) => ev.id === event.id)
            );
            if (studentBucketIdx === correctIdx.toString()) correctCount++;
          });
        });
        if (totalEvents === 0) return 0;
        return parseFloat(((correctCount / totalEvents) * q.points).toFixed(2));
      }
      case 'table-fill': {
        if (!q.tableConfig?.interactiveCells || !answer) return 0;
        let totalCorrect = 0;
        if (q.tableConfig.ignoreRowOrder) {
          const colCount = q.tableData?.[0].length || 0;
          for (let c = 0; c < colCount; c++) {
            const interactiveInCol = q.tableConfig.interactiveCells.filter(ic => ic.c === c);
            if (interactiveInCol.length === 0) continue;
            const correctValuesInCol = interactiveInCol.map(ic => (q.tableData?.[ic.r][ic.c] || '').toLowerCase().trim());
            const studentValuesInCol = interactiveInCol.map(ic => {
              const studentAns = answer[`${ic.r}-${ic.c}`];
              const text = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';
              return text.toString().toLowerCase().trim();
            }).filter(v => v !== '');
            let colCorrect = 0;
            const remainingCorrect = [...correctValuesInCol];
            studentValuesInCol.forEach(sv => {
              const idx = remainingCorrect.indexOf(sv);
              if (idx !== -1) { colCorrect++; remainingCorrect.splice(idx, 1); }
            });
            totalCorrect += colCorrect;
          }
        } else {
          q.tableConfig.interactiveCells.forEach(cell => {
            const cellId = `${cell.r}-${cell.c}`; const studentAns = answer[cellId];
            const studentText = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';
            const studentVal = studentText.toString().toLowerCase().trim();
            const correctVal = (q.tableData?.[cell.r][cell.c] || '').toLowerCase().trim();
            if (studentVal === correctVal) totalCorrect++;
          });
        }
        return parseFloat(((totalCorrect / q.tableConfig.interactiveCells.length) * q.points).toFixed(2));
      }
      case 'fill-blanks': {
        const fillText = q.content || q.text; // Fallback for transition
        if (!fillText || !answer) return 0;
        const parts = fillText.split(/(\{.*?\})/);
        let correctCount = 0;
        let totalBlanks = 0;
        parts.forEach((part, i) => {
          if (part.startsWith('{') && part.endsWith('}')) {
            totalBlanks++;
            const expected = part.slice(1, -1).toLowerCase().trim();
            const studentVal = (answer[i] || '').toString().toLowerCase().trim();
            if (studentVal === expected) correctCount++;
          }
        });
        if (totalBlanks === 0) return 0;
        return parseFloat(((correctCount / totalBlanks) * q.points).toFixed(2));
      }
      default: return null;
    }
  };

  const fetchData = async () => {
    try {
      const [examRes, subsRes] = await Promise.all([
        fetch(`/api/exams/details/${examId}`),
        fetch(`/api/exams/${examId}/submissions`)
      ]);
      
      if (!examRes.ok || !subsRes.ok) {
        throw new Error('Server fout bij ophalen data');
      }

      const examData: Exam = await examRes.json();
      const subsData: Submission[] = await subsRes.json();
      
      setExam(examData);
      setSubmissions(subsData);
      
      const initialScores: Record<string, any> = {};
      subsData.forEach((s: Submission) => {
        const scores = s.scores || {};
        examData.questions.forEach(q => {
          if (scores[q.id] === undefined || scores[q.id] === null) {
            const auto = calculateAutoScore(q, s.answers[q.id]);
            if (auto !== null) scores[q.id] = auto;
          }
        });
        initialScores[s.id] = scores;
      });
      setAllManualScores(initialScores);
    } catch (e) { 
      console.error('Fetch error:', e);
      alert('Kon de gegevens niet laden. Is de server gecrasht?');
    } finally { 
      setLoading(false); 
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/exams/${examId}/submissions`);
      const data: Submission[] = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
      const updatedScores: Record<string, any> = {};
      data.forEach((s: Submission) => {
        const scores = s.scores || {};
        if (exam) {
          exam.questions.forEach(q => {
            if (scores[q.id] === undefined || scores[q.id] === null) {
              const auto = calculateAutoScore(q, s.answers[q.id]);
              if (auto !== null) scores[q.id] = auto;
            }
          });
        }
        updatedScores[s.id] = scores;
      });
      setAllManualScores(updatedScores);
    } catch (e) { console.error(e); }
  };

  const handleScoreChange = (subId: string, qId: string, value: string, subQId?: string) => {
    setHasUnsavedChanges(true);
    const numValue = value === '' ? null : parseFloat(value);
    setAllManualScores(prev => {
      const studentScores = { ...(prev[subId] || {}) };
      if (subQId) {
        const currentQScore = { ...(studentScores[qId] || {}) };
        studentScores[qId] = { ...currentQScore, [subQId]: numValue };
      } else {
        studentScores[qId] = numValue;
      }
      return { ...prev, [subId]: studentScores };
    });
  };

  const saveAllScores = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(allManualScores).map(([subId, scores]) => 
        fetch(`/api/submissions/${subId}/scores`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scores })
        })
      );
      await Promise.all(updates);
      setHasUnsavedChanges(false);
      alert('Opgeslagen');
    } catch (e) { alert('Fout'); } finally { setIsSaving(false); }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('Inzending verwijderen?')) return;
    await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
    fetchSubmissions();
  };

  const handleBack = () => {
    if (hasUnsavedChanges && !confirm('Niet-opgeslagen punten. Toch weggaan?')) return;
    navigate('/teacher');
  };

  const copyForClassroom = () => {
    const text = submissions.map(sub => {
      const score = calculateTotalScore(sub.id);
      return `${sub.student_name}\t${score}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
    alert('Namen en scores gekopieerd naar klembord (Tab-gescheiden, ideaal voor Excel/Classroom)');
  };

  const exportCSV = () => {
    const header = 'Naam,Klas,Score,Max Punten\n';
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
    if (!exam) return 0;
    const scores = allManualScores[subId] || {};
    return exam.questions.filter((q: Question) => {
      const score = scores[q.id];
      if (q.type === 'image-analysis') {
        if (!score || typeof score !== 'object') return true;
        return Object.keys(score).length < (q.subQuestions?.length || 0) || 
               Object.values(score).some(v => v === null || v === undefined);
      }
      return score === undefined || score === null;
    }).length;
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

  const StudentAnswerView = ({ q, answer }: { q: Question, answer: any }) => {
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
          <div style={{ fontSize: '18px', fontWeight: '700', color: val === q.correctAnswer ? '#22c55e' : '#ef4444' }}>
            {val || 'Niet ingevuld'}
          </div>
          {explanation && (
            <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid var(--system-border)', borderLeft: '4px solid var(--system-blue)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--system-secondary-text)', marginBottom: '4px', textTransform: 'uppercase' }}>Motivatie student:</div>
              <div style={{ fontSize: '15px', lineHeight: '1.5' }}>{explanation}</div>
            </div>
          )}
        </div>
      );
    }
    if (q.type === 'table-fill') {
      return (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid var(--system-border)', padding: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{(q.tableData || []).map((row, rIdx) => (
              <tr key={rIdx}>{row.map((cell, cIdx) => {
                const isInteractive = q.tableConfig?.interactiveCells?.some(ic => ic.r === rIdx && ic.c === cIdx);
                if (!isInteractive) return <td key={cIdx} style={{ border: '1px solid #eee', padding: '10px', background: rIdx === 0 ? '#f5f5f7' : '#fafafa', fontSize: '13px', fontWeight: rIdx === 0 ? 'bold' : 'normal', textAlign: 'center' }}>{cell}</td>;
                const cellId = `${rIdx}-${cIdx}`; const studentAns = answer?.[cellId]; const studentText = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';
                let isCorrect = false;
                if (q.tableConfig?.ignoreRowOrder) {
                  const correctValuesInCol = (q.tableConfig?.interactiveCells || []).filter(ic => ic.c === cIdx).map(ic => (q.tableData?.[ic.r][ic.c] || '').toLowerCase().trim());
                  isCorrect = studentText !== '' && correctValuesInCol.includes(studentText.toLowerCase().trim());
                } else { isCorrect = studentText.toLowerCase().trim() === cell.toLowerCase().trim(); }
                return <td key={cIdx} style={{ border: '1px solid #eee', padding: '8px', textAlign: 'center' }}><div style={{ padding: '6px', borderRadius: '6px', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', color: isCorrect ? '#166534' : '#991b1b', fontSize: '13px', fontWeight: '600' }}>{studentText || '-'}{!isCorrect && studentText && <div style={{ fontSize: '10px', marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '4px' }}>{q.tableConfig?.ignoreRowOrder ? 'Foute kolom' : `Correct: ${cell}`}</div>}</div></td>;
              })}</tr>
            ))}</tbody>
          </table>
        </div>
      );
    }
    if (q.type === 'map') {
      return (
        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid #ddd', background: 'white' }}>
          <img src={q.image} style={{ width: '100%', display: 'block', opacity: 0.6 }} />
          {q.locations?.map(loc => {
            const studentLoc = answer?.[loc.id];
            return studentLoc && <div key={`student-${loc.id}`} style={{ position: 'absolute', left: `${studentLoc.x}%`, top: `${studentLoc.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ background: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', marginBottom: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{loc.label}</div><MapPin size={20} color="var(--system-blue)" fill="var(--system-blue)" /></div>;
          })}
        </div>
      );
    }
    if (q.type === 'timeline') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${q.totalBuckets || 5}, 1fr)`, gap: '10px' }}>
          {Array.from({ length: q.totalBuckets || 5 }).map((_, idx) => {
            const bucketSize = ((q.endYear || 2025) - (q.startYear || 0)) / (q.totalBuckets || 5);
            const rawStart = Math.floor((q.startYear || 0) + idx * bucketSize);
            const displayStart = idx === 0 ? rawStart : rawStart + 1;
            const bEnd = Math.floor((q.startYear || 0) + (idx + 1) * bucketSize);
            return (
              <div key={idx} style={{ background: 'white', border: '1px solid var(--system-border)', borderRadius: '12px', minHeight: '100px' }}>
                <div style={{ padding: '6px', textAlign: 'center', fontSize: '9px', fontWeight: '700', borderBottom: '1px solid #f5f5f7', background: '#fafafa', borderRadius: '12px 12px 0 0' }}>{displayStart}-{bEnd}</div>
                <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(answer?.placed?.[idx] || []).map((ev: any) => {
                    const originalBucketIdx = q.timelineData?.findIndex(bucket => bucket.some(e => e.id === ev.id));
                    const isCorrect = originalBucketIdx === idx;
                    return <div key={ev.id} style={{ padding: '4px 6px', borderRadius: '4px', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', fontSize: '11px', textAlign: 'center', color: isCorrect ? '#166534' : '#991b1b' }}>{ev.text}{!isCorrect && <div style={{ fontSize: '8px', opacity: 0.7 }}>Hoort niet hier</div>}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    if (q.type === 'fill-blanks') {
      const fillText = q.content || q.text;
      return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--system-border)', lineHeight: '2', fontSize: '16px' }}>
          {fillText.split(/(\{.*?\})/).map((part: string, i: number) => {
            if (part.startsWith('{') && part.endsWith('}')) {
              const expected = part.slice(1, -1);
              const studentVal = (answer?.[i] || '').toString();
              const isCorrect = studentVal.toLowerCase().trim() === expected.toLowerCase().trim();
              
              return (
                <span key={i} style={{ 
                  display: 'inline-block', 
                  margin: '0 4px', 
                  padding: '2px 8px', 
                  borderRadius: '6px',
                  background: studentVal === '' ? '#f5f5f7' : (isCorrect ? '#f0fdf4' : '#fff1f2'),
                  border: '1px solid',
                  borderColor: studentVal === '' ? '#d2d2d7' : (isCorrect ? '#22c55e' : '#ef4444'),
                  color: isCorrect ? '#166534' : '#991b1b',
                  fontWeight: '700'
                }}>
                  {studentVal || '...'}
                  {!isCorrect && studentVal !== '' && (
                    <span style={{ fontSize: '10px', color: 'var(--system-blue)', marginLeft: '6px', fontWeight: '500' }}>
                      [{expected}]
                    </span>
                  )}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    }
    return <div style={{ fontSize: '17px', whiteSpace: 'pre-wrap' }}>{typeof answer === 'string' ? answer : <pre style={{ fontSize: '12px' }}>{JSON.stringify(answer, null, 2)}</pre>}</div>;
  };

  const GroupedQuestionResultRenderer = ({ q, groupedSubs }: { q: Question, groupedSubs: { answer: any, submissions: Submission[] }[] }) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {groupedSubs.map((group, gIdx) => {
          const firstSub = group.submissions[0];
          const answer = firstSub.answers[q.id];
          const isImageAnalysis = q.type === 'image-analysis';
          const subIds = group.submissions.map(s => s.id);
          const firstScore = allManualScores[firstSub.id]?.[q.id];

          return (
            <div key={gIdx} className="animate-up" style={{ padding: '32px', borderRadius: '24px', background: 'white', border: '1px solid var(--system-border)', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: '24px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {group.submissions.map(s => (
                      <span key={s.id} className="badge" style={{ background: 'var(--system-blue-light)', color: 'var(--system-blue)', border: 'none', fontWeight: '700', fontSize: '10px' }}>{s.student_name}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--system-secondary-text)', fontWeight: '600' }}>{group.submissions.length} leerlingen met dit antwoord</div>
                </div>
                {!isImageAnalysis && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '8px', color: 'var(--system-error)', borderRadius: '12px' }} 
                      onClick={(e) => { e.stopPropagation(); handleGroupScoreChange(subIds, q.id, '0'); }}
                    >
                      <XCircle size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f7', padding: '4px 14px', borderRadius: '14px', border: '1px solid var(--system-border)' }}>
                      <input 
                        type="number" 
                        className="input" 
                        style={{ width: '60px', padding: '6px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: '800', fontSize: '18px' }} 
                        value={firstScore ?? ''} 
                        onChange={(e) => handleGroupScoreChange(subIds, q.id, e.target.value)} 
                        onClick={(e) => e.stopPropagation()}
                        placeholder="-" 
                      />
                      <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--system-secondary-text)' }}>/ {q.points}</span>
                    </div>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '8px', color: 'var(--system-success)', borderRadius: '12px' }} 
                      onClick={(e) => { e.stopPropagation(); handleGroupScoreChange(subIds, q.id, q.points.toString()); }}
                    >
                      <CheckCircle size={20} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--system-secondary-bg)', padding: '24px', borderRadius: '20px' }}>
                <StudentAnswerView q={q} answer={answer} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const QuestionResultRenderer = ({ q, submission, showHeader = true }: { q: Question, submission: Submission, showHeader?: boolean }) => {
    const answer = submission.answers[q.id];
    const studentScores = allManualScores[submission.id] || {};
    const score = studentScores[q.id];

    return (
      <div style={{ padding: '32px', borderRadius: '24px', background: 'white', border: '1px solid var(--system-border)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {showHeader && <span className="badge" style={{ background: '#f5f5f7', color: '#1d1d1f', border: 'none', fontWeight: '700' }}>{submission.student_name}</span>}
          </div>
          {q.type !== 'image-analysis' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <button 
                className="btn-secondary" 
                style={{ padding: '6px', color: 'var(--system-error)', borderRadius: '8px' }} 
                onClick={() => handleScoreChange(submission.id, q.id, '0')}
                title="Nul punten"
              >
                <XCircle size={18} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f7', padding: '2px 10px', borderRadius: '10px', border: '1px solid var(--system-border)' }}>
                <input type="number" className="input" style={{ width: '60px', padding: '6px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: '700' }} 
                  value={score ?? ''} onChange={(e) => handleScoreChange(submission.id, q.id, e.target.value)} placeholder="-" />
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#86868b' }}>/ {q.points}</span>
              </div>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px', color: 'var(--system-success)', borderRadius: '8px' }} 
                onClick={() => handleScoreChange(submission.id, q.id, q.points.toString())}
                title="Maximum punten"
              >
                <CheckCircle size={18} />
              </button>
            </div>
          )}
        </div>
        {!showHeader && <h3 style={{ fontSize: '19px', fontWeight: '600', marginBottom: '24px' }}>{q.text}</h3>}
        <div style={{ background: '#f5f5f7', padding: '24px', borderRadius: '16px' }}>
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f0f7ff', borderRadius: '12px', border: '1px solid #cce3ff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#0066cc', marginBottom: '8px', textTransform: 'uppercase' }}>Modeloplossing</div>
            <div style={{ fontSize: '15px', color: '#1d1d1f' }}>
              {q.type === 'matching' ? (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>{q.matchingPairs?.map(p => <li key={p.id}><strong>{p.left}</strong> {'\u2192'} {p.right}</li>)}</ul>
              ) : q.type === 'ordering' ? (
                <ol style={{ margin: 0, paddingLeft: '20px' }}>{q.orderItems?.map((item, i) => <li key={i}>{item}</li>)}</ol>
              ) : q.type === 'definitions' ? (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>{q.pairs?.map(p => <li key={p.id}><strong>{p.definition}</strong>: {p.term}</li>)}</ul>
              ) : q.type === 'timeline' ? (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${q.totalBuckets || 5}, 1fr)`, gap: '8px' }}>
                  {(q.timelineData || []).map((bucket, idx) => {
                    const bucketSize = ((q.endYear || 2025) - (q.startYear || 0)) / (q.totalBuckets || 5);
                    const rawStart = Math.floor((q.startYear || 0) + idx * bucketSize);
                    const displayStart = idx === 0 ? rawStart : rawStart + 1;
                    const bEnd = Math.floor((q.startYear || 0) + (idx + 1) * bucketSize);
                    return (
                      <div key={idx} style={{ background: 'white', padding: '8px', borderRadius: '8px', border: '1px solid #cce3ff' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px', borderBottom: '1px solid #eee' }}>{displayStart}-{bEnd}</div>
                        {bucket.map(ev => <div key={ev.id} style={{ fontSize: '11px' }}>• {ev.text}</div>)}
                      </div>
                    );
                  })}
                </div>
              ) : q.type === 'table-fill' ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
                    <tbody>{(q.tableData || []).map((row, rIdx) => (
                      <tr key={rIdx}>{row.map((cell, cIdx) => {
                        const isInteractive = q.tableConfig?.interactiveCells?.some(ic => ic.r === rIdx && ic.c === cIdx);
                        return <td key={cIdx} style={{ border: '1px solid #eee', padding: '8px', background: rIdx === 0 ? '#0066cc' : (isInteractive ? '#fff9c4' : 'white'), color: rIdx === 0 ? 'white' : 'black', fontWeight: rIdx === 0 ? 'bold' : 'normal' }}>{cell}</td>;
                      })}</tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : q.type === 'image-analysis' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{q.subQuestions?.map((sq, i) => <div key={sq.id} style={{ fontSize: '13px' }}><strong>{i + 1}. {sq.text}</strong>: <span style={{ color: '#0066cc' }}>{sq.correctAnswer || 'Geen'}</span></div>)}</div>
              ) : q.type === 'true-false' ? (
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--system-blue)' }}>{q.correctAnswer}</div>
                  {q.correctAnswer === 'Onwaar' && q.correctExplanation && (
                    <div style={{ marginTop: '8px', fontSize: '14px', fontStyle: 'italic', borderTop: '1px solid rgba(0,102,204,0.1)', paddingTop: '8px' }}>
                      <strong>Modelantwoord:</strong> {q.correctExplanation}
                    </div>
                  )}
                </div>
              ) : q.type === 'map' ? (
                <div style={{ position: 'relative', width: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cce3ff' }}>
                  <img src={q.image} style={{ width: '100%', opacity: 0.5 }} />
                  {q.locations?.map(loc => <div key={loc.id} style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ background: '#0066cc', color: 'white', fontSize: '6px', padding: '1px 3px', borderRadius: '2px' }}>{loc.label}</div><MapPin size={8} color="#0066cc" fill="white" /></div>)}
                </div>
              ) : <div style={{ whiteSpace: 'pre-wrap' }}>{q.correctAnswer || 'Geen'}</div>}
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#86868b', marginBottom: '8px', textTransform: 'uppercase' }}>Antwoord student</div>
          <StudentAnswerView q={q} answer={answer} />
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Inzendingen laden...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: '72px' }}>
      <TopNav user={user} />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={handleBack}><ArrowLeft size={20}/></button>
              <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0 }}>Inzendingen</h1>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={`btn ${viewMode === 'individual' ? '' : 'btn-secondary'}`} onClick={() => setViewMode('individual')}><User size={14} style={{ marginRight: '6px' }}/> Per student</button>
              <button className={`btn ${viewMode === 'question' ? '' : 'btn-secondary'}`} onClick={() => setViewMode('question')}><List size={14} style={{ marginRight: '6px' }}/> Per vraag</button>
              <button className={`btn ${viewMode === 'table' ? '' : 'btn-secondary'}`} onClick={() => setViewMode('table')}><TableIcon size={14} style={{ marginRight: '6px' }}/> Tabel</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={copyForClassroom} title="Kopieer voor spreadsheet/Classroom"><Copy size={18} /> Kopieer lijst</button>
            <button className="btn btn-secondary" onClick={exportCSV} title="Download CSV bestand"><FileDown size={18} /> CSV Export</button>
            {user.hasClassroom && (
              <button className="btn" style={{ background: '#1e8e3e' }} title="Synchroniseer met Google Classroom">
                <GraduationCap size={18} /> Sync Classroom
              </button>
            )}
          </div>
        </header>

        {submissions.length === 0 ? <div className="card" style={{ padding: '80px', textAlign: 'center' }}><p className="text-muted">Nog geen inzendingen.</p></div> : viewMode === 'individual' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 24px', borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <button className="btn btn-secondary" disabled={selectedStudentIdx === 0} onClick={() => setSelectedStudentIdx(selectedStudentIdx - 1)}><ChevronLeft size={20}/></button>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '700' }}>{submissions[selectedStudentIdx]?.student_name}</div><div style={{ fontSize: '13px', color: '#86868b' }}>Inzending {selectedStudentIdx + 1} van {submissions.length}</div></div>
              <button className="btn btn-secondary" disabled={selectedStudentIdx === submissions.length - 1} onClick={() => setSelectedStudentIdx(selectedStudentIdx + 1)}><ChevronRight size={20}/></button>
            </div>
            <div className="animate-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div className="card" style={{ padding: '24px 32px', flex: 1, marginRight: '20px' }}><p style={{ color: '#86868b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Totaalscore</p><h2 style={{ margin: 0, fontSize: '32px' }}>{calculateTotalScore(submissions[selectedStudentIdx].id)} <span style={{ fontSize: '18px', color: '#86868b' }}>/ {maxPoints}</span></h2></div>
                <div className="card" style={{ padding: '24px 32px', flex: 1 }}><p style={{ color: '#86868b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Status</p><h2 style={{ margin: 0, fontSize: '24px', color: getUnevaluatedCount(submissions[selectedStudentIdx].id) > 0 ? '#e11d48' : '#059669' }}>{getUnevaluatedCount(submissions[selectedStudentIdx].id) === 0 ? 'Beoordeeld' : `${getUnevaluatedCount(submissions[selectedStudentIdx].id)} vragen te gaan`}</h2></div>
              </div>
              {exam?.questions.map(q => <QuestionResultRenderer key={q.id} q={q} submission={submissions[selectedStudentIdx]} />)}
            </div>
          </div>
        ) : viewMode === 'question' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 24px', borderRadius: '20px' }}>
              <button className="btn btn-secondary" disabled={selectedQuestionIdx === 0} onClick={() => setSelectedQuestionIdx(selectedQuestionIdx - 1)}><ChevronLeft size={20}/></button>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '700' }}>Vraag {selectedQuestionIdx + 1} van {exam?.questions.length}</div><div style={{ fontSize: '13px', color: '#86868b' }}>{exam?.questions[selectedQuestionIdx]?.type.toUpperCase()}</div></div>
              <button className="btn btn-secondary" disabled={selectedQuestionIdx === (exam?.questions.length || 0) - 1} onClick={() => setSelectedQuestionIdx(selectedQuestionIdx + 1)}><ChevronRight size={20}/></button>
            </div>
            {exam?.questions[selectedQuestionIdx] && (() => {
               const q = exam.questions[selectedQuestionIdx];
               // Group submissions by answer
               const groups: { answer: any, submissions: Submission[] }[] = [];
               submissions.forEach(sub => {
                 const answer = sub.answers[q.id];
                 const answerKey = JSON.stringify(answer);
                 const existingGroup = groups.find(g => JSON.stringify(g.answer) === answerKey);
                 if (existingGroup) {
                   existingGroup.submissions.push(sub);
                 } else {
                   groups.push({ answer, submissions: [sub] });
                 }
               });

               return (
                <div className="animate-up">
                  <h2 style={{ padding: '0 12px 32px', fontSize: '24px', fontWeight: '700' }}>{q.text}</h2>
                  <GroupedQuestionResultRenderer q={q} groupedSubs={groups} />
                </div>
               );
            })()}
          </div>
        ) : (
          <div className="card animate-up" style={{ padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f5f5f7', borderBottom: '1px solid var(--system-border)' }}><th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '13px' }}>STUDENT</th><th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '13px' }}>KLAS</th>{exam?.questions.map((q, i) => <th key={q.id} style={{ padding: '20px', textAlign: 'center', fontSize: '11px' }}>V{i+1}</th>)}<th style={{ padding: '20px 32px', textAlign: 'right', fontSize: '13px' }}>TOTAAL</th><th style={{ padding: '20px 32px', width: '50px' }}></th></tr></thead>
              <tbody>{submissions.map(sub => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #f5f5f7' }}><td style={{ padding: '20px 32px', fontWeight: '600' }}>{sub.student_name}</td><td style={{ padding: '20px 32px', color: '#86868b' }}>{sub.student_klas}</td>{exam?.questions.map(q => {
                  const score = allManualScores[sub.id]?.[q.id]; const isComplete = q.type === 'image-analysis' ? (score && typeof score === 'object' && Object.keys(score).length === q.subQuestions?.length) : (score !== null && score !== undefined);
                  const displayScore = typeof score === 'object' && score !== null ? Object.values(score).reduce((a:any, b:any) => a+b, 0) : score;
                  return <td key={q.id} style={{ padding: '20px', textAlign: 'center' }}><span style={{ padding: '4px 8px', borderRadius: '6px', background: isComplete ? '#f0fdf4' : '#fff1f2', color: isComplete ? '#166534' : '#991b1b', fontSize: '12px', fontWeight: '700' }}>{isComplete ? displayScore : '-'}</span></td>;
                })}<td style={{ padding: '20px 32px', textAlign: 'right', fontWeight: '700', fontSize: '18px' }}>{calculateTotalScore(sub.id)}</td><td style={{ padding: '20px 32px' }}><button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => handleDeleteSubmission(sub.id)}><XCircle size={14}/></button></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </main>

      {/* Floating Save Bar */}
      {hasUnsavedChanges && (
        <div 
          className="glass animate-up" 
          onClick={saveAllScores}
          style={{ 
            position: 'fixed', 
            bottom: '32px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            padding: '16px 32px', 
            borderRadius: '20px', 
            boxShadow: 'var(--shadow-lg)', 
            border: '1px solid var(--system-blue)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            cursor: 'pointer',
            zIndex: 2000,
            transition: 'var(--spring)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
        >
          <div style={{ background: 'var(--system-blue)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Save size={18} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: 'var(--system-text)' }}>Scores aangepast</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--system-blue)', fontWeight: '600' }}>Klik hier om alles op te slaan</p>
          </div>
          {isSaving && (
            <div style={{ marginLeft: '12px', width: '20px', height: '20px', border: '2px solid var(--system-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
