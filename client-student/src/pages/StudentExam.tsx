import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Calculator, MessageSquare, Info, Shield, LogOut, CheckCircle, MapPin, GripVertical, LayoutList, Layout, ChevronLeft, ChevronRight } from 'lucide-react';

interface Question {
  id: string;
  type: 'open' | 'multiple-choice' | 'true-false' | 'map' | 'definitions' | 'matching' | 'ordering' | 'image-analysis';
  text: string;
  points: number;
  options?: string[];
  correctAnswer: string;
  image?: string;
  locations?: { id: string, label: string, x: number, y: number }[];
  pairs?: { id: string, definition: string, term: string }[];
  matchingPairs?: { id: string, left: string, right: string }[];
  orderItems?: string[];
  orderDirection?: 'vertical' | 'horizontal';
  subQuestions?: { id: string, text: string, points: number }[];
  explainIfFalse?: boolean;
}

const QuestionRenderer = ({ 
  q, 
  index, 
  exam, 
  answers, 
  setAnswers, 
  viewMode, 
  handleDragStart, 
  handleDropMap, 
  handleSortStart, 
  handleSortEnter,
  draggingIdx
}: { 
  q: Question, 
  index: number, 
  exam: any, 
  answers: any, 
  setAnswers: any, 
  viewMode: string,
  handleDragStart: any,
  handleDropMap: any,
  handleSortStart: any,
  handleSortEnter: any,
  draggingIdx: number | null
}) => {
  const isImageAnalysis = q.type === 'image-analysis';
  const totalQPoints = isImageAnalysis && q.subQuestions 
    ? q.subQuestions.reduce((sum, sq) => sum + (sq.points || 0), 0)
    : q.points;

  return (
    <div className="animate-up" style={{ marginBottom: viewMode === 'list' ? '100px' : '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span className="badge">VRAAG {index + 1}</span>
        {exam.isGraded && <span className="text-muted" style={{ fontSize: '14px', fontWeight: '600' }}>{totalQPoints} PUNTEN</span>}
      </div>
      <p style={{ fontSize: '24px', fontWeight: '600', marginBottom: '32px', lineHeight: '1.3' }}>{q.text}</p>
      
      {q.type === 'open' && (
        <textarea className="input" rows={8} placeholder="Typ je antwoord hier..." value={answers[q.id] || ''} onChange={e => setAnswers((prev: any) => ({ ...prev, [q.id]: e.target.value }))} style={{ fontSize: '19px', lineHeight: '1.5', padding: '24px' }} />
      )}

      {q.type === 'multiple-choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {q.options?.map((opt, idx) => (
            <div key={idx} onClick={() => setAnswers((prev: any) => ({ ...prev, [q.id]: opt }))} style={{ padding: '20px 24px', borderRadius: '16px', border: '1px solid', borderColor: answers[q.id] === opt ? 'var(--system-blue)' : 'var(--system-border)', background: answers[q.id] === opt ? 'var(--system-secondary-bg)' : 'white', cursor: 'pointer', transition: 'var(--transition)', fontSize: '17px', fontWeight: '500' }}>{opt}</div>
          ))}
        </div>
      )}

      {q.type === 'true-false' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['Waar', 'Onwaar'].map(opt => (
              <button key={opt} className="btn" style={{ flex: 1, padding: '20px', borderRadius: '16px', background: answers[q.id]?.value === opt ? 'var(--system-blue)' : 'white', color: answers[q.id]?.value === opt ? 'white' : 'var(--system-text)', border: '1px solid var(--system-border)', fontSize: '17px', boxShadow: 'none' }} onClick={() => setAnswers((prev: any) => ({ ...prev, [q.id]: { ...prev[q.id], value: opt } }))}>{opt}</button>
            ))}
          </div>
          {q.explainIfFalse && answers[q.id]?.value === 'Onwaar' && (
            <div className="animate-up">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--system-secondary-text)', marginBottom: '8px' }}>LEGE UIT WAAROM DIT ONWAAR IS:</label>
              <textarea className="input" rows={3} placeholder="Jouw uitleg..." value={answers[q.id]?.explanation || ''} onChange={e => setAnswers((prev: any) => ({ ...prev, [q.id]: { ...prev[q.id], explanation: e.target.value } }))} style={{ fontSize: '17px' }} />
            </div>
          )}
        </div>
      )}

      {q.type === 'map' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', padding: '20px', background: 'var(--system-secondary-bg)', borderRadius: '16px', border: '1px dashed var(--system-border)' }}>
            {q.locations?.map(loc => {
              const isPlaced = answers[q.id]?.[loc.id];
              return (
                <div key={loc.id} draggable={!isPlaced} onDragStart={(e) => handleDragStart(e, q.id, loc.id, loc.label)} style={{ padding: '8px 16px', background: isPlaced ? 'var(--system-border)' : 'white', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: isPlaced ? 'default' : 'grab', opacity: 0.4, boxShadow: isPlaced ? 'none' : 'var(--shadow-sm)', border: '1px solid var(--system-border)', userSelect: 'none' }}>{loc.label}</div>
              );
            })}
          </div>
          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', background: 'white' }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropMap(e, q.id)}>
            <img src={q.image} style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
            {Object.entries(answers[q.id] || {}).map(([locId, pos]: [string, any]) => (
              <div key={locId} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', zIndex: 10 }}>
                <div style={{ background: 'var(--system-blue)', padding: '4px 10px', borderRadius: '8px', color: 'white', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{pos.label}</div>
                <MapPin size={20} color="var(--system-blue)" fill="white" />
                <button onClick={() => { const newMapAnswers = { ...answers[q.id] }; delete newMapAnswers[locId]; setAnswers((prev: any) => ({ ...prev, [q.id]: newMapAnswers })); }} style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--system-error)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {q.type === 'definitions' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--system-secondary-text)' }}>Definitie / Omschrijving</th>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', width: '250px', color: 'var(--system-secondary-text)' }}>Term</th>
              </tr>
            </thead>
            <tbody>
              {q.pairs?.map((pair) => (
                <tr key={pair.id}>
                  <td style={{ padding: '20px', background: 'var(--system-secondary-bg)', borderRadius: '16px 0 0 16px', fontSize: '17px', fontWeight: '500' }}>{pair.definition}</td>
                  <td style={{ padding: '20px', background: 'var(--system-secondary-bg)', borderRadius: '0 16px 16px 0' }}>
                    <input className="input" style={{ background: 'white', border: '1px solid var(--system-border)' }} placeholder="..." value={answers[q.id]?.[pair.id] || ''} onChange={(e) => setAnswers((prev: any) => ({ ...prev, [q.id]: { ...(prev[q.id] || {}), [pair.id]: e.target.value } }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {q.type === 'matching' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '10px', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)' }}>TERM</div>
            {q.matchingPairs?.map(p => (
              <div key={p.id} style={{ height: '60px', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'var(--system-secondary-bg)', borderRadius: '12px 0 0 12px', fontWeight: '600', border: '1px solid var(--system-border)', borderRight: 'none' }}>{p.left}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '10px', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)' }}>MATCH (SLEEP OM TE SORTEREN)</div>
            {(answers[q.id] || q.matchingPairs?.map(p => ({ id: p.id, text: p.right }))).map((item: any, idx: number) => (
              <div key={item.id} draggable onDragStart={() => handleSortStart(idx)} onDragEnter={() => handleSortEnter(q.id, idx, 'matching')} onDragOver={(e: any) => e.preventDefault()} onDragEnd={() => handleSortStart(null)}
                style={{ height: '60px', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px', background: 'white', border: '1px solid var(--system-border)', borderRadius: '0 12px 12px 0', cursor: 'grab', opacity: draggingIdx === idx ? 0.5 : 1, transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)' }}>
                <GripVertical size={18} color="var(--system-secondary-text)" /><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {q.type === 'ordering' && (
        <div style={{ display: 'flex', flexDirection: q.orderDirection === 'horizontal' ? 'row' : 'column', flexWrap: 'wrap', gap: '12px' }}>
          {(answers[q.id] || q.orderItems?.map((v, i) => ({ id: i.toString(), text: v }))).map((item: any, idx: number) => (
            <div key={item.id} draggable onDragStart={() => handleSortStart(idx)} onDragEnter={() => handleSortEnter(q.id, idx, 'ordering')} onDragOver={(e: any) => e.preventDefault()} onDragEnd={() => handleSortStart(null)}
              style={{ padding: q.orderDirection === 'horizontal' ? '12px 20px' : '16px 24px', background: 'white', border: '1px solid var(--system-border)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'grab', opacity: draggingIdx === idx ? 0.5 : 1, transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)', flex: q.orderDirection === 'horizontal' ? '0 1 auto' : 'initial', minWidth: q.orderDirection === 'horizontal' ? '100px' : 'auto' }}>
              <GripVertical size={q.orderDirection === 'horizontal' ? 16 : 20} color="var(--system-secondary-text)" /><span style={{ fontWeight: '700', color: 'var(--system-blue)', fontSize: q.orderDirection === 'horizontal' ? '14px' : 'inherit' }}>{idx + 1}.</span><span style={{ fontWeight: '500', fontSize: q.orderDirection === 'horizontal' ? '15px' : 'inherit' }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {q.type === 'image-analysis' && (
        <div>
          <img src={q.image} style={{ width: '100%', borderRadius: '24px', marginBottom: '40px', boxShadow: 'var(--shadow-lg)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {q.subQuestions?.map((sq, idx) => (
              <div key={sq.id} style={{ background: 'var(--system-secondary-bg)', padding: '32px', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>{idx + 1}. {sq.text}</p>
                  <span className="badge" style={{ background: 'white' }}>{sq.points} PT</span>
                </div>
                <textarea className="input" rows={4} style={{ background: 'white' }} value={answers[q.id]?.[sq.id] || ''} onChange={(e) => setAnswers((prev: any) => ({ ...prev, [q.id]: { ...(prev[q.id] || {}), [sq.id]: e.target.value } }))} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function StudentExam() {
  const { examKey } = useParams();
  const navigate = useNavigate();
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
  const storedName = sessionStorage.getItem('studentName');
  const name = isPreview ? (storedName || 'PREVIEW DOCENT') : storedName;
  
  const [exam, setExam] = useState<any>(null);
  const examRef = useRef<any>(null);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const answersRef = useRef<Record<string, any>>({});
  
  const socketRef = useRef<Socket | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isSubmittedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { examRef.current = exam; }, [exam]);
  useEffect(() => { isSubmittedRef.current = isSubmitted; }, [isSubmitted]);
  useEffect(() => { isFullscreenRef.current = isFullscreen; }, [isFullscreen]);

  useEffect(() => {
    if (!name && !isPreview) {
      navigate('/');
      return;
    }

    fetch(`/api/exams/${examKey}`)
      .then(res => res.json())
      .then(data => {
        setExam(data);
        // Initialiseer matching en ordering vragen met een gehusselde staat
        const initialAnswers: Record<string, any> = {};
        data.questions.forEach((q: Question) => {
          if (q.type === 'matching' && q.matchingPairs) {
            initialAnswers[q.id] = [...q.matchingPairs]
              .map(p => ({ id: p.id, text: p.right }))
              .sort(() => Math.random() - 0.5);
          } else if (q.type === 'ordering' && q.orderItems) {
            initialAnswers[q.id] = q.orderItems
              .map((text, i) => ({ id: i.toString(), text }))
              .sort(() => Math.random() - 0.5);
          }
        });
        setAnswers(prev => ({ ...initialAnswers, ...prev }));
      })
      .catch(() => alert('Kan examen niet laden.'));

    let socket: any = null;
    if (!isPreview) {
      socket = io('');
      socketRef.current = socket;

      socket.on('connect', () => {
        const klas = sessionStorage.getItem('studentKlas');
        const photo_url = sessionStorage.getItem('studentPhoto');
        socket.emit('student_join', { examKey, name, klas, photo_url });
      });

      socket.on('session_closed', () => {
        if (examRef.current && !isSubmittedRef.current) {
          alert('De docent heeft de live sessie beëindigd. Je antwoorden worden automatisch ingeleverd.');
          submitExam(answersRef.current, examRef.current.id);
        }
      });
    }

    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittedRef.current && isFullscreenRef.current && !isPreview) {
        socketRef.current?.emit('cheat_alert', { reason: 'Tabblad verwisseld' });
        alert('WAARSCHUWING: Je hebt de examenomgeving verlaten!');
      }
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      } else {
        setTimeout(() => {
          if (!document.fullscreenElement && !isSubmittedRef.current && isFullscreenRef.current) {
            setIsFullscreen(false);
            if (!isPreview) {
              socketRef.current?.emit('cheat_alert', { reason: 'Fullscreen verlaten' });
              alert('WAARSCHUWING: Je hebt de beveiligde omgeving (fullscreen) verlaten!');
            }
          }
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (socket) socket.disconnect();
    };
  }, [examKey, name, navigate]);

  const enterFullscreen = () => {
    containerRef.current?.requestFullscreen().catch(() => alert('Fullscreen vereist!'));
  };

  const submitExam = async (finalAnswers: Record<string, any>, forceExamId?: string) => {
    const idToUse = forceExamId || exam?.id;
    if (!idToUse || isSubmittedRef.current) return;

    try {
      const klas = sessionStorage.getItem('studentKlas');
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: idToUse, name, klas, answers: finalAnswers })
      });
      if (res.ok) {
        if (document.fullscreenElement) document.exitFullscreen();
        setIsSubmitted(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleDragStart = (e: React.DragEvent, qId: string, locId: string, label: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ qId, locId, label }));
  };

  const handleDropMap = (e: React.DragEvent, qId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.qId !== qId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setAnswers(prev => ({
        ...prev,
        [qId]: { ...(prev[qId] || {}), [data.locId]: { x, y, label: data.label } }
      }));
    } catch (err) { console.error(err); }
  };

  const handleSortStart = (idx: number | null) => { setDraggingIdx(idx); };

  const handleSortEnter = (qId: string, targetIdx: number, type: 'matching' | 'ordering') => {
    if (draggingIdx === null || draggingIdx === targetIdx) return;
    const q = exam?.questions.find((x:any) => x.id === qId);
    if (!q) return;
    let items = answers[qId];
    if (!items) {
      if (type === 'matching') items = q.matchingPairs.map((p:any) => ({ id: p.id, text: p.right }));
      else items = q.orderItems.map((v:any, i:any) => ({ id: i.toString(), text: v }));
    }
    const newOrder = [...items];
    const movedItem = newOrder[draggingIdx];
    newOrder.splice(draggingIdx, 1);
    newOrder.splice(targetIdx, 0, movedItem);
    setAnswers(prev => ({ ...prev, [qId]: newOrder }));
    setDraggingIdx(targetIdx);
  };

  if (!exam) return <p>Examen laden...</p>;

  if (isSubmitted) {
    return (
      <div className="animate-up" style={{ padding: '80px 0', textAlign: 'center' }}>
        <CheckCircle size={64} color="var(--system-success)" style={{ marginBottom: '24px' }} />
        <h1>Ingeleverd</h1>
        <p className="text-muted">Bedankt voor het maken van <strong>{exam.title}</strong>.</p>
        <button className="btn" style={{ marginTop: '40px' }} onClick={() => navigate('/')}>Dashboard</button>
      </div>
    );
  }

  const rendererProps = {
    exam,
    answers,
    setAnswers,
    viewMode,
    handleDragStart,
    handleDropMap,
    handleSortStart,
    handleSortEnter,
    draggingIdx
  };

  return (
    <div ref={containerRef} style={{ background: 'var(--system-bg)', minHeight: '100vh' }}>
      {!isFullscreen ? (
        <div className="animate-up" style={{ padding: '100px 0', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <Shield size={48} color="var(--system-blue)" style={{ marginBottom: '24px' }} />
          <h2>Beveiligde Omgeving</h2>
          <p className="text-muted" style={{ marginBottom: '40px' }}>Je gaat nu het examen <strong>{exam.title}</strong> maken. Verlaat de browser niet.</p>
          <button className="btn" onClick={enterFullscreen} style={{ fontSize: '17px', padding: '12px 32px' }}>Start in Fullscreen</button>
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100vh' }}>
          <div style={{ width: '70px', background: 'var(--system-secondary-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '24px', borderRight: '1px solid var(--system-border)' }}>
            <div title="Vragen" style={{ cursor: 'pointer', opacity: activeTool === null ? 1 : 0.4 }} onClick={() => setActiveTool(null)}><Info /></div>
            <div title="Rekenmachine" style={{ cursor: 'pointer', opacity: activeTool === 'calc' ? 1 : 0.4 }} onClick={() => setActiveTool('calc')}><Calculator /></div>
            <div title="Chat" style={{ cursor: 'pointer', opacity: activeTool === 'chat' ? 1 : 0.4 }} onClick={() => setActiveTool('chat')}><MessageSquare /></div>
            <div style={{ marginTop: 'auto', cursor: 'pointer', color: 'var(--system-error)' }} onClick={() => { if(confirm('Inleveren?')) submitExam(answers); }}><LogOut /></div>
          </div>

          <div style={{ flex: 1, padding: '60px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <header style={{ marginBottom: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--system-border)', paddingBottom: '24px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge" style={{ background: 'var(--system-blue)', color: 'white', border: 'none', textTransform: 'uppercase' }}>{exam.type || 'examen'}</span>
                  </div>
                  <h1 style={{ margin: 0, fontSize: '32px' }}>{exam.title}</h1>
                  <p className="text-muted" style={{ margin: '8px 0 0' }}>Kandidaat: <strong>{name}</strong></p>
                </div>
                <button className="btn btn-secondary" onClick={() => setViewMode(viewMode === 'single' ? 'list' : 'single')}>
                  {viewMode === 'single' ? <LayoutList size={16}/> : <Layout size={16}/>}
                  {viewMode === 'single' ? 'Lijstweergave' : 'Stapsgewijs'}
                </button>
              </header>

              {viewMode === 'single' ? (
                <>
                  <nav style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
                    {exam.questions.map((_: any, idx: number) => (
                      <button key={idx} onClick={() => setCurrentQuestionIndex(idx)} className={`nav-dot ${currentQuestionIndex === idx ? 'active' : 'inactive'}`}>
                        {idx + 1}
                      </button>
                    ))}
                  </nav>
                  <QuestionRenderer q={exam.questions[currentQuestionIndex]} index={currentQuestionIndex} {...rendererProps} />
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '40px' }}>
                    <button className="btn btn-secondary" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}><ChevronLeft size={16} /> Vorige</button>
                    <button className="btn btn-secondary" disabled={currentQuestionIndex === exam.questions.length - 1} onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>Volgende <ChevronRight size={16} /></button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {exam.questions.map((q: any, idx: number) => (
                    <QuestionRenderer key={q.id} q={q} index={idx} {...rendererProps} />
                  ))}
                </div>
              )}

              <button className="btn" style={{ width: '100%', padding: '20px', fontSize: '19px', marginTop: '80px' }} onClick={() => { if (confirm('Weet je zeker dat je wilt inleveren?')) submitExam(answers); }}>{(exam.type || 'examen').charAt(0).toUpperCase() + (exam.type || 'examen').slice(1)} Inleveren</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
