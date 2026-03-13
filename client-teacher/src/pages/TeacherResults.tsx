import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Download, Save, MapPin, Trash2, LayoutList, Layout, ChevronLeft, ChevronRight, User, List, CheckCircle2, AlertTriangle, Table as TableIcon, CheckCircle, XCircle } from 'lucide-react';
import { TopNav } from '../components/TopNav';

interface Submission {
  id: string;
  student_name: string;
  student_klas: string;
  answers: Record<string, any>;
  scores: Record<string, any>;
  submitted_at: string;
}

interface Question {
  id: string;
  type: 'open' | 'multiple-choice' | 'true-false' | 'map' | 'definitions' | 'matching' | 'ordering' | 'image-analysis';
  text: string;
  correctAnswer: string;
  points: number;
  options?: string[];
  image?: string;
  locations?: { id: string, label: string, x: number, y: number }[];
  pairs?: { id: string, definition: string, term: string }[];
  matchingPairs?: { id: string, left: string, right: string }[];
  orderItems?: string[];
  subQuestions?: { id: string, text: string, points: number }[];
}

export default function TeacherResults() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'question' | 'table'>('individual');
  
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  
  const [allManualScores, setAllManualScores] = useState<Record<string, Record<string, any>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    if (user.id) {
      fetch(`/api/teacher/exams?teacherId=${user.id}`)
        .then(res => res.json())
        .then(exams => {
          const found = exams.find((e: any) => e.id === examId);
          if (found) setExam(found);
        });
    }
  }, [examId]);

  useEffect(() => {
    const scoresMap: Record<string, Record<string, any>> = {};
    submissions.forEach(sub => {
      scoresMap[sub.id] = sub.scores || {};
    });
    setAllManualScores(scoresMap);
    setHasUnsavedChanges(false);
  }, [submissions]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/exams/${examId}/submissions`);
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
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
      fetchSubmissions();
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
          {/* Modeloplossing (nieuw) */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f0f7ff', borderRadius: '12px', border: '1px solid #cce3ff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#0066cc', marginBottom: '8px', textTransform: 'uppercase' }}>Modeloplossing</div>
            <div style={{ fontSize: '15px', color: '#1d1d1f', whiteSpace: 'pre-wrap' }}>
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
              ) : q.correctAnswer || 'Geen modeloplossing opgegeven'}
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
              <img src={q.image} crossOrigin="anonymous" style={{ width: '100%', borderRadius: '12px', border: '1px solid #ddd' }} />
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
              <img src={q.image} crossOrigin="anonymous" style={{ width: '100%', display: 'block', opacity: 0.6 }} />
              {q.locations?.map(loc => (
                <div key={`target-${loc.id}`} style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', opacity: 0.4 }}>
                  <MapPin size={24} color="#22c55e" fill="#22c55e" />
                </div>
              ))}
              {Object.entries(answer || {}).map(([locId, pos]: [string, any]) => (
                <div key={`student-${locId}`} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}>
                  <div style={{ background: '#0071e3', padding: '4px 10px', borderRadius: '8px', color: 'white', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>{pos.label}</div>
                  <MapPin size={20} color="#0071e3" fill="white" />
                </div>
              ))}
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
          ) : (
            <div style={{ fontSize: '17px', whiteSpace: 'pre-wrap' }}>{answer || <i style={{ color: '#aaa' }}>Geen antwoord</i>}</div>
          )}
        </div>
        {q.type !== 'open' && q.type !== 'image-analysis' && q.type !== 'multiple-choice' && (
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#86868b' }}>Correct: <strong>{q.correctAnswer}</strong></div>
        )}
      </div>
    );
  };

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            {hasUnsavedChanges && <div style={{ color: '#e11d48', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} /> Niet-opgeslagen punten</div>}
            <button className="btn" onClick={saveAllScores} disabled={isSaving || !hasUnsavedChanges} style={{ background: hasUnsavedChanges ? '#0071e3' : '#86868b', borderRadius: '12px', padding: '12px 24px' }}>
              <Save size={18} style={{ marginRight: '8px' }}/> Sla punten op
            </button>
          </div>
        </header>

        {submissions.length === 0 ? (
          <div className="card" style={{ padding: '80px', textAlign: 'center' }}><p className="text-muted">Nog geen inzendingen.</p></div>
        ) : viewMode === 'individual' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 24px', borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <button className="btn btn-secondary" disabled={selectedStudentIdx === 0} onClick={() => setSelectedStudentIdx(selectedStudentIdx - 1)}><ChevronLeft size={20}/></button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>{submissions[selectedStudentIdx]?.student_name}</div>
                <div style={{ fontSize: '13px', color: '#86868b' }}>Inzending {selectedStudentIdx + 1} van {submissions.length}</div>
              </div>
              <button className="btn btn-secondary" disabled={selectedStudentIdx === submissions.length - 1} onClick={() => setSelectedStudentIdx(selectedStudentIdx + 1)}><ChevronRight size={20}/></button>
            </div>
            {submissions[selectedStudentIdx] && (
              <div className="animate-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: '800' }}>{calculateTotalScore(submissions[selectedStudentIdx].id)} <span style={{ color: '#86868b', fontSize: '24px' }}>/ {maxPoints} pt</span></div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: getUnevaluatedCount(submissions[selectedStudentIdx].id) > 0 ? '#e11d48' : '#059669' }}>{getUnevaluatedCount(submissions[selectedStudentIdx].id) > 0 ? `${getUnevaluatedCount(submissions[selectedStudentIdx].id)} nog te beoordelen` : 'Beoordeeld'}</div>
                  </div>
                  <button className="btn btn-danger" style={{ height: 'fit-content', padding: '10px 20px' }} onClick={() => handleDeleteSubmission(submissions[selectedStudentIdx].id)}><Trash2 size={16}/></button>
                </div>
                {exam?.questions.map((q: Question) => <QuestionResultRenderer key={q.id} q={q} submission={submissions[selectedStudentIdx]} showHeader={false} />)}
              </div>
            )}
          </div>
        ) : viewMode === 'question' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 24px', borderRadius: '20px' }}>
              <button className="btn btn-secondary" disabled={selectedQuestionIdx === 0} onClick={() => setSelectedQuestionIdx(selectedQuestionIdx - 1)}><ChevronLeft size={20}/></button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>Vraag {selectedQuestionIdx + 1} van {exam?.questions.length}</div>
                <div style={{ fontSize: '13px', color: '#86868b' }}>{exam?.questions[selectedQuestionIdx]?.type.toUpperCase()}</div>
              </div>
              <button className="btn btn-secondary" disabled={selectedQuestionIdx === (exam?.questions.length || 0) - 1} onClick={() => setSelectedQuestionIdx(selectedQuestionIdx + 1)}><ChevronRight size={20}/></button>
            </div>
            {exam?.questions[selectedQuestionIdx] && (
              <div className="animate-up">
                <h2 style={{ padding: '0 12px 32px', fontSize: '24px', fontWeight: '700' }}>{exam.questions[selectedQuestionIdx].text}</h2>
                {submissions.map(sub => <QuestionResultRenderer key={sub.id} q={exam.questions[selectedQuestionIdx]} submission={sub} showHeader={true} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="card animate-up" style={{ padding: 0, overflowX: 'auto', borderRadius: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f5f7', borderBottom: '1px solid var(--system-border)' }}>
                  <th style={{ padding: '20px', textAlign: 'left', fontWeight: '700', position: 'sticky', left: 0, background: '#f5f5f7', zIndex: 10 }}>Student</th>
                  {exam?.questions.map((_: any, i: number) => <th key={i} style={{ padding: '20px', textAlign: 'center', fontWeight: '700' }}>V{i + 1}</th>)}
                  <th style={{ padding: '20px', textAlign: 'center', fontWeight: '800', color: '#0071e3' }}>Totaal</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '600', position: 'sticky', left: 0, background: 'white', zIndex: 5 }}>{sub.student_name}</td>
                    {exam?.questions.map((q: Question) => {
                      const s = allManualScores[sub.id]?.[q.id];
                      const totalQ = typeof s === 'object' && s !== null ? Object.values(s).reduce((a:number, b:any) => a + (parseFloat(b) || 0), 0) : (parseFloat(s as any) || 0);
                      return <td key={q.id} style={{ padding: '16px', textAlign: 'center', color: '#86868b' }}>{totalQ}</td>;
                    })}
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '700', color: '#0071e3', background: '#f0f7ff' }}>{calculateTotalScore(sub.id)} / {maxPoints}</td>
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
