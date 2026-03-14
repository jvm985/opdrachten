import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, User, List, Table as TableIcon, CheckCircle, XCircle, MapPin, Save } from 'lucide-react';
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
  
  // Scoring state
  const [allManualScores, setAllManualScores] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (user.role !== 'teacher') { navigate('/login'); return; }
    fetchData();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, examId]);

  const calculateAutoScore = (q: Question, answer: any): number | null => {
    if (answer === undefined || answer === null) return 0;

    switch (q.type) {
      case 'multiple-choice':
        return answer === q.correctAnswer ? q.points : 0;
      
      case 'true-false':
        return (answer?.value || answer) === q.correctAnswer ? q.points : 0;

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
        let correctCount = 0;
        let totalEvents = 0;
        
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
              if (idx !== -1) {
                colCorrect++;
                remainingCorrect.splice(idx, 1);
              }
            });
            totalCorrect += colCorrect;
          }
        } else {
          q.tableConfig.interactiveCells.forEach(cell => {
            const cellId = `${cell.r}-${cell.c}`;
            const studentAns = answer[cellId];
            const studentText = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';
            const studentVal = studentText.toString().toLowerCase().trim();
            const correctVal = (q.tableData?.[cell.r][cell.c] || '').toLowerCase().trim();
            if (studentVal === correctVal) totalCorrect++;
          });
        }
        return parseFloat(((totalCorrect / q.tableConfig.interactiveCells.length) * q.points).toFixed(2));
      }

      default:
        return null;
    }
  };

  const fetchData = async () => {
    try {
      const [examRes, subsRes] = await Promise.all([
        fetch(`/api/exams/details/${examId}`),
        fetch(`/api/exams/${examId}/submissions`)
      ]);
      const examData: Exam = await examRes.json();
      const subsData: Submission[] = await subsRes.json();
      
      setExam(examData);
      setSubmissions(subsData);
      
      const initialScores: Record<string, any> = {};
      subsData.forEach((s: Submission) => {
        const scores = s.scores || {};
        // Auto-grade ontbrekende scores
        examData.questions.forEach(q => {
          if (scores[q.id] === undefined || scores[q.id] === null) {
            const auto = calculateAutoScore(q, s.answers[q.id]);
            if (auto !== null) scores[q.id] = auto;
          }
        });
        initialScores[s.id] = scores;
      });
      setAllManualScores(initialScores);
    } catch (e) { console.error(e); } finally { setLoading(false); }
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
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scores })
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

  const QuestionResultRenderer = ({ q, submission, showHeader = true }: { q: Question, submission: Submission, showHeader?: boolean }) => {
    const answer = submission.answers[q.id];
    const studentScores = allManualScores[submission.id] || {};
    const score = studentScores[q.id];

    return (
      <div style={{ padding: '32px', borderRadius: '24px', background: 'white', border: '1px solid var(--system-border)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {showHeader && <span className="badge" style={{ background: '#f5f5f7', color: '#1d1d1f', border: 'none', fontWeight: '700' }}>{submission.student_name}</span>}
            <span className="badge" style={{ background: 'var(--system-blue)', color: 'white', border: 'none' }}>{q.type.toUpperCase()}</span>
          </div>
          {q.type !== 'image-analysis' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="number" 
                className="input" 
                style={{ width: '70px', padding: '10px', textAlign: 'center', borderRadius: '12px', border: score === null || score === undefined ? '2px dashed #e11d48' : '1px solid #d2d2d7' }} 
                value={score ?? ''} 
                onChange={(e) => handleScoreChange(submission.id, q.id, e.target.value)} 
                placeholder="-" 
              />
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#86868b' }}>/ {q.points} pt</span>
            </div>
          )}
        </div>
        {!showHeader && <h3 style={{ fontSize: '19px', fontWeight: '600', marginBottom: '24px' }}>{q.text}</h3>}
        <div style={{ background: '#f5f5f7', padding: '24px', borderRadius: '16px' }}>
          {/* Modeloplossing */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f0f7ff', borderRadius: '12px', border: '1px solid #cce3ff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#0066cc', marginBottom: '8px', textTransform: 'uppercase' }}>Modeloplossing</div>
            <div style={{ fontSize: '15px', color: '#1d1d1f' }}>
              {q.type === 'matching' ? (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {q.matchingPairs?.map(p => <li key={p.id}><strong>{p.left}</strong> → {p.right}</li>)}
                </ul>
              ) : q.type === 'ordering' ? (
                <ol style={{ margin: 0, paddingLeft: '20px' }}>
                  {q.orderItems?.map((item, i) => <li key={i}>{item}</li>)}
                </ol>
              ) : q.type === 'definitions' ? (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {q.pairs?.map(p => <li key={p.id}><strong>{p.definition}</strong>: {p.term}</li>)}
                </ul>
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
                    <tbody>
                      {(q.tableData || []).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => {
                            const isInteractive = q.tableConfig?.interactiveCells?.some(ic => ic.r === rIdx && ic.c === cIdx);
                            return (
                              <td key={cIdx} style={{ border: '1px solid #eee', padding: '8px', background: rIdx === 0 ? '#0066cc' : (isInteractive ? '#fff9c4' : 'white'), color: rIdx === 0 ? 'white' : 'black', fontWeight: rIdx === 0 ? 'bold' : 'normal' }}>
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : q.type === 'image-analysis' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {q.subQuestions?.map((sq, i) => (
                    <div key={sq.id} style={{ fontSize: '13px' }}>
                      <strong>{i + 1}. {sq.text}</strong>: <span style={{ color: '#0066cc' }}>{sq.correctAnswer || 'Geen modeloplossing'}</span>
                    </div>
                  ))}
                </div>
              ) : q.type === 'map' ? (
                <div style={{ position: 'relative', width: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cce3ff' }}>
                  <img src={q.image} style={{ width: '100%', opacity: 0.5 }} />
                  {q.locations?.map(loc => (
                    <div key={loc.id} style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ background: '#0066cc', color: 'white', fontSize: '6px', padding: '1px 3px', borderRadius: '2px' }}>{loc.label}</div>
                      <MapPin size={8} color="#0066cc" fill="white" />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{q.correctAnswer || 'Geen modeloplossing opgegeven'}</div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: '700', color: '#86868b', marginBottom: '8px', textTransform: 'uppercase' }}>Antwoord student</div>
          {q.type === 'multiple-choice' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {q.options?.map((opt, idx) => {
                const isSelected = answer === opt;
                const isCorrect = q.correctAnswer === opt;
                return (
                  <div key={idx} style={{ 
                    padding: '16px 20px', borderRadius: '12px', border: '1px solid',
                    background: isSelected ? (isCorrect ? '#f0fdf4' : '#fff1f2') : 'white',
                    borderColor: isSelected ? (isCorrect ? '#22c55e' : '#ef4444') : '#d2d2d7',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: isSelected ? '700' : '500' }}>{opt}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isSelected && (isCorrect ? <CheckCircle size={18} color="#22c55e" /> : <XCircle size={18} color="#ef4444" />)}
                      {isCorrect && !isSelected && <span style={{ fontSize: '11px', fontWeight: '700', color: '#22c55e', textTransform: 'uppercase' }}>Correct antwoord</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : q.type === 'true-false' ? (
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: answer?.value === q.correctAnswer ? '#22c55e' : '#ef4444' }}>
                {answer?.value || 'Niet ingevuld'} 
                <span style={{ fontSize: '14px', color: '#86868b', fontWeight: '500', marginLeft: '12px' }}>(Correct: {q.correctAnswer})</span>
              </div>
              {answer?.explanation && <div style={{ marginTop: '16px', padding: '16px', background: 'white', borderRadius: '12px', borderLeft: '4px solid #0071e3' }}>{answer.explanation}</div>}
            </div>
          ) : q.type === 'image-analysis' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <img src={q.image} style={{ width: '100%', borderRadius: '12px', border: '1px solid #ddd' }} />
              {q.subQuestions?.map((sq, idx) => (
                <div key={sq.id} style={{ padding: '20px', background: 'white', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>{idx + 1}. {sq.text}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number" 
                        className="input" 
                        style={{ width: '60px', padding: '6px', textAlign: 'center', borderRadius: '8px', border: score?.[sq.id] === null || score?.[sq.id] === undefined ? '2px dashed #e11d48' : '1px solid #d2d2d7' }} 
                        value={score?.[sq.id] ?? ''} 
                        onChange={(e) => handleScoreChange(submission.id, q.id, e.target.value, sq.id)} 
                        placeholder="-" 
                      />
                      <span style={{ fontSize: '12px', color: '#86868b' }}>/ {sq.points}</span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '16px', whiteSpace: 'pre-wrap' }}>{answer?.[sq.id] || <i style={{ color: '#aaa' }}>Geen antwoord</i>}</p>
                </div>
              ))}
            </div>
          ) : q.type === 'map' ? (
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid #ddd', background: 'white' }}>
              <img src={q.image} style={{ width: '100%', display: 'block', opacity: 0.6 }} />
              {q.locations?.map(loc => (
                <div key={`target-${loc.id}`} style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', opacity: 0.15, pointerEvents: 'none' }}>
                  <MapPin size={16} color="#22c55e" fill="#22c55e" />
                </div>
              ))}
              {q.locations?.map(loc => {
                const studentLoc = answer?.[loc.id];
                return studentLoc && (
                  <div key={`student-${loc.id}`} style={{ position: 'absolute', left: `${studentLoc.x}%`, top: `${studentLoc.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', marginBottom: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{loc.label}</div>
                    <MapPin size={20} color="var(--system-blue)" fill="var(--system-blue)" />
                  </div>
                );
              })}
            </div>
          ) : q.type === 'definitions' ? (
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--system-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--system-border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>DEFINITIE</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>ANTWOORD</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>CORRECT</th>
                  </tr>
                </thead>
                <tbody>
                  {q.pairs?.map(pair => {
                    const studentTerm = answer?.[pair.id] || '';
                    const isCorrect = studentTerm.toLowerCase().trim() === (pair.term || '').toLowerCase().trim();
                    return (
                      <tr key={pair.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{pair.definition}</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: isCorrect ? '#059669' : '#e11d48', fontWeight: '600' }}>{studentTerm || '-'}</td>
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{pair.term}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : q.type === 'matching' ? (
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--system-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--system-border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#86868b' }}>TERM</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#86868b' }}>MATCH STUDENT</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#86868b' }}>CORRECT</th>
                  </tr>
                </thead>
                <tbody>
                  {q.matchingPairs?.map((pair, idx) => {
                    const studentItem = (answer as any)?.[idx];
                    const studentMatch = studentItem?.text || '-';
                    const isCorrect = studentMatch === pair.right;
                    return (
                      <tr key={pair.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>{pair.left}</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: isCorrect ? '#059669' : '#e11d48', fontWeight: '700' }}>{studentMatch}</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#86868b' }}>{pair.right}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : q.type === 'ordering' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(Array.isArray(answer) ? answer : []).map((item: any, idx: number) => {
                const isCorrect = q.orderItems?.[idx] === item.text;
                return (
                  <div key={idx} style={{ padding: '14px 20px', background: 'white', borderRadius: '12px', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: isCorrect ? '#22c55e' : '#ef4444', marginRight: '16px' }}>{idx + 1}.</span>
                      <span style={{ fontSize: '16px', fontWeight: '500' }}>{item.text}</span>
                    </div>
                    {!isCorrect && <span style={{ fontSize: '12px', color: '#86868b' }}>Correct: <strong>{q.orderItems?.[idx]}</strong></span>}
                  </div>
                );
              })}
            </div>
          ) : q.type === 'timeline' ? (
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
                        return (
                          <div key={ev.id} style={{ padding: '4px 6px', borderRadius: '4px', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', fontSize: '11px', textAlign: 'center', color: isCorrect ? '#166534' : '#991b1b' }}>
                            {ev.text}
                            {!isCorrect && <div style={{ fontSize: '8px', opacity: 0.7 }}>Hoort niet hier</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : q.type === 'table-fill' ? (
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid var(--system-border)', padding: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {(q.tableData || []).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => {
                        const isInteractive = q.tableConfig?.interactiveCells?.some(ic => ic.r === rIdx && ic.c === cIdx);
                        if (!isInteractive) {
                          return (
                            <td key={cIdx} style={{ border: '1px solid #eee', padding: '10px', background: rIdx === 0 ? '#f5f5f7' : '#fafafa', fontSize: '13px', fontWeight: rIdx === 0 ? 'bold' : 'normal', textAlign: 'center' }}>
                              {cell}
                            </td>
                          );
                        }
                        const cellId = `${rIdx}-${cIdx}`;
                        const studentAns = answer?.[cellId];
                        const studentText = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';
                        
                        let isCorrect = false;
                        if (q.tableConfig?.ignoreRowOrder) {
                          const correctValuesInCol = (q.tableConfig?.interactiveCells || [])
                            .filter(ic => ic.c === cIdx)
                            .map(ic => (q.tableData?.[ic.r][ic.c] || '').toLowerCase().trim());
                          isCorrect = studentText !== '' && correctValuesInCol.includes(studentText.toLowerCase().trim());
                        } else {
                          isCorrect = studentText.toLowerCase().trim() === cell.toLowerCase().trim();
                        }

                        return (
                          <td key={cIdx} style={{ border: '1px solid #eee', padding: '8px', textAlign: 'center' }}>
                            <div style={{ padding: '6px', borderRadius: '6px', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: '1px solid', borderColor: isCorrect ? '#22c55e' : '#ef4444', color: isCorrect ? '#166534' : '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                              {studentText || '-'}
                              {!isCorrect && studentText && <div style={{ fontSize: '10px', marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '4px' }}>
                                {q.tableConfig?.ignoreRowOrder ? 'Hoort niet in deze kolom' : `Correct: ${cell}`}
                              </div>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: '17px', whiteSpace: 'pre-wrap' }}>{answer || <i style={{ color: '#aaa' }}>Geen antwoord</i>}</div>
          )}
        </div>
      </div>
    );
  };
