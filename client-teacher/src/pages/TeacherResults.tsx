import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Download, Save, MapPin, Trash2 } from 'lucide-react';

interface Submission {
  id: string;
  student_name: string;
  student_klas: string;
  answers: Record<string, any>;
  scores: Record<string, number> | null;
  submitted_at: string;
}

interface Question {
  id: string;
  type: 'open' | 'multiple-choice' | 'true-false' | 'map' | 'definitions' | 'matching' | 'ordering' | 'image-analysis';
  text: string;
  correctAnswer: string;
  points: number;
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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
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
    if (selectedSubmission) {
      if (selectedSubmission.scores) {
        setManualScores(selectedSubmission.scores);
      } else {
        const initial: Record<string, number> = {};
        exam?.questions.forEach((q: Question) => {
          const answer = selectedSubmission.answers[q.id];
          if (q.type === 'map' || q.type === 'open' || q.type === 'definitions' || q.type === 'matching' || q.type === 'ordering' || q.type === 'image-analysis') {
            initial[q.id] = 0;
          } else {
            const answerValue = typeof answer === 'object' ? answer?.value : answer;
            const isCorrect = answerValue?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
            initial[q.id] = isCorrect ? q.points : 0;
          }
        });
        setManualScores(initial);
      }
    }
  }, [selectedSubmission, exam]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/exams/${examId}/submissions`);
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubmission = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Weet je zeker dat je deze inzending wilt verwijderen?')) return;
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedSubmission?.id === id) setSelectedSubmission(null);
        fetchSubmissions();
      }
    } catch (e) {
      alert('Verwijderen mislukt');
    }
  };

  const handleScoreChange = (qId: string, value: number) => {
    setManualScores(prev => ({ ...prev, [qId]: value }));
  };

  const saveScores = async () => {
    if (!selectedSubmission) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}/scores`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: manualScores })
      });
      if (res.ok) {
        alert('Scores opgeslagen');
        fetchSubmissions();
      }
    } catch (e) {
      alert('Fout bij opslaan');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    if (!exam || submissions.length === 0) return;
    let csv = 'Student,Klas,Datum,Totaal Score,' + exam.questions.map((_: any, i: number) => `Vraag ${i + 1}`).join(',') + '\n';
    submissions.forEach(s => {
      const scores = s.scores || {};
      const total = Object.values(scores).reduce((a, b) => a + b, 0);
      csv += `${s.student_name},${s.student_klas},${new Date(s.submitted_at).toLocaleString()},${total},`;
      csv += exam.questions.map((q: any) => {
        const val = s.answers[q.id];
        if (typeof val === 'object') return '"Ingevuld"';
        return `"${(val || '').replace(/"/g, '""')}"`;
      }).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Resultaten_${exam.title.replace(/\s+/g, '_')}.csv`);
    link.click();
  };

  return (
    <div className="animate-up" style={{ padding: '40px 0' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/teacher')}>
          <ArrowLeft size={16} /> Terug
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          {submissions.length > 0 && (
            <button className="btn btn-secondary" onClick={exportToCSV}>
              <Download size={16} /> Exporteer CSV
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '40px', alignItems: 'start' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Inzendingen ({submissions.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {submissions.map(s => {
              const totalScore = s.scores ? Object.values(s.scores).reduce((a, b) => a + b, 0) : null;
              return (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedSubmission(s)}
                  style={{ 
                    padding: '16px', borderRadius: '14px', cursor: 'pointer',
                    background: selectedSubmission?.id === s.id ? 'var(--system-secondary-bg)' : 'white',
                    border: '1px solid',
                    borderColor: selectedSubmission?.id === s.id ? 'var(--system-blue)' : 'var(--system-border)',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>{s.student_name}</strong>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--system-secondary-text)' }}>{s.student_klas}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {totalScore !== null && <span className="badge" style={{ background: 'var(--system-blue)', color: 'white' }}>{totalScore} pt</span>}
                      <button 
                        onClick={(e) => handleDeleteSubmission(e, s.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--system-error)', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--system-secondary-text)', marginTop: '4px' }}>
                    {new Date(s.submitted_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ minHeight: '600px' }}>
          {selectedSubmission ? (
            <div>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--system-border)', paddingBottom: '24px', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '28px' }}>{selectedSubmission.student_name}</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0' }}>Klas: <strong>{selectedSubmission.student_klas}</strong> | Examen: <strong>{exam?.title}</strong></p>
                </div>
                <button className="btn" onClick={saveScores} disabled={isSaving}>
                  <Save size={16} /> {isSaving ? 'Bezig...' : 'Sla Punten Op'}
                </button>
              </header>

              {exam?.questions.map((q: Question, i: number) => {
                const answer = selectedSubmission.answers[q.id];
                const answerValue = typeof answer === 'object' ? answer?.value : answer;
                const currentScore = manualScores[q.id] || 0;

                return (
                  <div key={q.id} style={{ marginBottom: '32px', padding: '24px', borderRadius: '18px', background: 'var(--system-secondary-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                      <span className="badge" style={{ background: 'white' }}>Vraag {i + 1} ({q.type})</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600' }}>PUNTEN:</label>
                        <input 
                          type="number" 
                          className="input" 
                          style={{ width: '70px', textAlign: 'center', padding: '6px' }}
                          value={currentScore}
                          onChange={(e) => handleScoreChange(q.id, parseFloat(e.target.value) || 0)}
                          max={q.points}
                          min={0}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--system-secondary-text)' }}>/ {q.points}</span>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '17px', fontWeight: '500', marginBottom: '20px' }}>{q.text}</p>
                    
                    {q.type === 'map' ? (
                      <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--system-border)', background: 'white' }}>
                        <img src={q.image} style={{ width: '100%', display: 'block', opacity: 0.6 }} alt="Map" />
                        {q.locations?.map(loc => (
                          <div key={`target-${loc.id}`} style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', opacity: 0.4 }}>
                            <MapPin size={24} color="#34c759" fill="#34c759" />
                            <div style={{ fontSize: '10px', whiteSpace: 'nowrap', background: '#34c759', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>DOEL: {loc.label}</div>
                          </div>
                        ))}
                        {Object.entries(answer || {}).map(([locId, pos]: [string, any]) => (
                          <div key={`student-${locId}`} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}>
                            <div style={{ background: 'var(--system-blue)', padding: '4px 10px', borderRadius: '8px', color: 'white', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                              {pos.label}
                            </div>
                            <MapPin size={20} color="var(--system-blue)" fill="white" />
                          </div>
                        ))}
                      </div>
                    ) : q.type === 'matching' ? (
                      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--system-border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--system-border)' }}>
                              <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>TERM LINKS</th>
                              <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>MATCH STUDENT</th>
                              <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>CORRECTE MATCH</th>
                            </tr>
                          </thead>
                          <tbody>
                            {q.matchingPairs?.map((pair, idx) => {
                              const studentMatch = (answer as any)?.[idx]?.text || '-';
                              const isCorrect = studentMatch === pair.right;
                              return (
                                <tr key={pair.id} style={{ borderBottom: '1px solid var(--system-border)' }}>
                                  <td style={{ padding: '12px', fontSize: '14px' }}>{pair.left}</td>
                                  <td style={{ padding: '12px', fontSize: '14px', color: isCorrect ? 'var(--system-success)' : 'var(--system-error)', fontWeight: '600' }}>{studentMatch}</td>
                                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{pair.right}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : q.type === 'definitions' ? (
                      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--system-border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--system-border)' }}>
                              <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>DEFINITIE</th>
                              <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>ANTWOORD STUDENT</th>
                              <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: 'var(--system-secondary-text)' }}>CORRECTE TERM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {q.pairs?.map(pair => {
                              const studentTerm = answer?.[pair.id] || '';
                              const isCorrect = studentTerm.toLowerCase().trim() === (pair.term || '').toLowerCase().trim();
                              return (
                                <tr key={pair.id} style={{ borderBottom: '1px solid var(--system-border)' }}>
                                  <td style={{ padding: '12px', fontSize: '14px' }}>{pair.definition}</td>
                                  <td style={{ padding: '12px', fontSize: '14px', color: isCorrect ? 'var(--system-success)' : 'var(--system-error)', fontWeight: '600' }}>{studentTerm || '-'}</td>
                                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{pair.term}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : q.type === 'ordering' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--system-secondary-text)', fontWeight: '700', marginBottom: '8px' }}>VOLGORDE STUDENT:</p>
                        {Array.isArray(answer) && answer.map((item: any, idx: number) => {
                          const isCorrectPos = q.orderItems?.[idx] === item.text;
                          return (
                            <div key={idx} style={{ padding: '12px 20px', background: 'white', border: '1px solid var(--system-border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontWeight: '700', color: isCorrectPos ? 'var(--system-success)' : 'var(--system-error)' }}>{idx + 1}.</span>
                              <span>{item.text}</span>
                              {!isCorrectPos && <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--system-secondary-text)' }}>Zou moeten zijn: {q.orderItems?.[idx]}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : q.type === 'image-analysis' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <img src={q.image} style={{ width: '100%', borderRadius: '12px', opacity: 0.8 }} />
                        {q.subQuestions?.map((sq: any, idx: number) => (
                          <div key={sq.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--system-border)' }}>
                            <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--system-secondary-text)' }}>{idx + 1}. {sq.text} ({sq.points} pt)</p>
                            <p style={{ fontSize: '16px', margin: 0, whiteSpace: 'pre-wrap' }}>{answer?.[sq.id] || <i>Geen antwoord</i>}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--system-border)' }}>
                        <p style={{ fontSize: '11px', color: 'var(--system-secondary-text)', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase' }}>Antwoord student:</p>
                        {q.type === 'true-false' ? (
                          <div>
                            <p style={{ fontSize: '17px', margin: 0, fontWeight: '600', color: answerValue?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim() ? 'var(--system-success)' : 'var(--system-error)' }}>
                              {answerValue || <i>Geen antwoord</i>}
                            </p>
                            {answer?.explanation && (
                              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--system-secondary-bg)', borderRadius: '8px', borderLeft: '4px solid var(--system-border)' }}>
                                <p style={{ fontSize: '11px', color: 'var(--system-secondary-text)', marginBottom: '4px', fontWeight: '700' }}>UITLEG WAAROM ONWAAR:</p>
                                <p style={{ fontSize: '15px', margin: 0 }}>{answer.explanation}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p style={{ fontSize: '17px', margin: 0 }}>{typeof answer === 'object' ? JSON.stringify(answer) : (answer || <i>Geen antwoord gegeven</i>)}</p>
                        )}
                      </div>
                    )}

                    {q.type !== 'open' && q.type !== 'map' && q.type !== 'definitions' && q.type !== 'matching' && q.type !== 'ordering' && q.type !== 'image-analysis' && (
                      <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--system-secondary-text)' }}>
                        Correct antwoord: <strong style={{ color: 'var(--system-text)' }}>{q.correctAnswer}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--system-secondary-text)' }}>
              <HelpCircle size={64} style={{ margin: '0 auto 24px', opacity: 0.2 }} />
              <h3>Selecteer een student</h3>
              <p>Kies een inzending aan de linkerkant om deze na te kijken.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
