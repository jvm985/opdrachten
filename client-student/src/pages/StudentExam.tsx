import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, ChevronLeft, ChevronRight, CheckCircle, Info, Calculator, MessageSquare, LogOut, GripVertical, MapPin, LayoutList, Layout } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import type { Question } from '../types';

const QuestionRenderer = ({ q, answers, setAnswers, handleDragStart, handleDropMap, handleSortStart, handleSortEnter, draggingIdx }: any) => {
  return (
    <div className="animate-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{q.text}</h2>
        <span className="badge" style={{ background: 'var(--system-secondary-bg)', color: 'var(--system-secondary-text)', border: 'none', fontWeight: 'bold' }}>{q.points} PT</span>
      </div>

      {q.type === 'open' && (
        <textarea className="input" rows={10} placeholder="Typ hier je antwoord..." value={answers[q.id] || ''} onChange={e => setAnswers((prev: any) => ({ ...prev, [q.id]: e.target.value }))} style={{ fontSize: '18px', lineHeight: '1.6', background: 'white' }} />
      )}

      {q.type === 'multiple-choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {q.options?.map((opt: string, i: number) => (
            <button key={i} onClick={() => setAnswers((prev: any) => ({ ...prev, [q.id]: opt }))}
              style={{ padding: '24px 32px', textAlign: 'left', background: answers[q.id] === opt ? 'var(--system-blue)' : 'white', color: answers[q.id] === opt ? 'white' : 'var(--system-text)', border: '1px solid var(--system-border)', borderRadius: '20px', fontSize: '18px', fontWeight: '600', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: answers[q.id] === opt ? '0 10px 20px rgba(0,113,227,0.2)' : 'none' }}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === 'true-false' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['Waar', 'Onwaar'].map(opt => (
              <button key={opt} className={`btn ${answers[q.id]?.value === opt ? '' : 'btn-secondary'}`} style={{ flex: 1, padding: '24px', fontSize: '18px' }} onClick={() => setAnswers((prev: any) => ({ ...prev, [q.id]: { ...prev[q.id], value: opt } }))}>{opt}</button>
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
            {q.locations?.map((loc: any) => {
              const isPlaced = answers[q.id]?.[loc.id];
              return (
                <div key={loc.id} draggable={!isPlaced} onDragStart={(e) => handleDragStart(e, q.id, loc.id, loc.label)} style={{ padding: '8px 16px', background: isPlaced ? 'var(--system-border)' : 'white', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: isPlaced ? 'default' : 'grab', opacity: isPlaced ? 0.4 : 1, boxShadow: isPlaced ? 'none' : 'var(--shadow-sm)', border: '1px solid var(--system-border)', userSelect: 'none' }}>{loc.label}</div>
              );
            })}
          </div>
          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', background: 'white' }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropMap(e, q.id)}>
            <img src={q.image} style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
            {Object.entries(answers[q.id] || {}).map(([locId, pos]: [string, any]) => (
              <div 
                key={locId} 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({ qId: q.id, locId, label: pos.label, isMoving: true }));
                }}
                style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', zIndex: 10, cursor: 'grab' }}
              >
                <div style={{ background: 'var(--system-blue)', padding: '4px 10px', borderRadius: '8px', color: 'white', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{pos.label}</div>
                <MapPin size={20} color="var(--system-blue)" fill="white" />
                <button onClick={() => { const newMapAnswers = { ...answers[q.id] }; delete newMapAnswers[locId]; setAnswers((prev: any) => ({ ...prev, [q.id]: newMapAnswers })); }} style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--system-error)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', zIndex: 20 }}>✕</button>
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
              {q.pairs?.map((pair: any) => (
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
            {q.matchingPairs?.map((p: any) => (
              <div key={p.id} style={{ height: '60px', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'var(--system-secondary-bg)', borderRadius: '12px 0 0 12px', fontWeight: '600', border: '1px solid var(--system-border)', borderRight: 'none' }}>{p.left}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '10px', fontSize: '12px', fontWeight: '700', color: 'var(--system-secondary-text)' }}>MATCH (SLEEP OM TE SORTEREN)</div>
            {(answers[q.id] || []).map((item: any, idx: number) => (
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
          {(answers[q.id] || []).map((item: any, idx: number) => (
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
            {q.subQuestions?.map((sq: any, idx: number) => (
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

      {q.type === 'table-fill' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {q.tableConfig?.mode === 'drag' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '20px', background: 'var(--system-secondary-bg)', borderRadius: '16px', minHeight: '60px' }}>
              {(() => {
                const allTerms = (q.tableConfig?.interactiveCells || []).map((ic: any) => ({ 
                  poolId: `${ic.r}-${ic.c}`, 
                  text: q.tableData?.[ic.r][ic.c] 
                }));
                const currentAnswers = answers[q.id] || {};
                const placedPoolIds = Object.values(currentAnswers).map((a: any) => a?.poolId);
                
                return allTerms
                  .filter((term: any) => !placedPoolIds.includes(term.poolId))
                  .sort((a: any, b: any) => a.text.localeCompare(b.text))
                  .map((term: any) => (
                    <div 
                      key={term.poolId} 
                      draggable 
                      onDragStart={e => e.dataTransfer.setData('term', JSON.stringify(term))}
                      style={{ padding: '8px 16px', background: 'white', borderRadius: '8px', border: '1px solid var(--system-border)', cursor: 'grab', fontSize: '14px', fontWeight: '500', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    >
                      {term.text}
                    </div>
                  ));
              })()}
              {Object.keys(answers[q.id] || {}).length === (q.tableConfig?.interactiveCells || []).length && (
                <p style={{ margin: 0, color: '#86868b', fontSize: '13px' }}>Alle termen zijn geplaatst.</p>
              )}
            </div>
          )}
          <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', border: '1px solid var(--system-border)', padding: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(q.tableData || []).map((row: any, rIdx: number) => (
                  <tr key={rIdx}>
                    {row.map((cell: any, cIdx: number) => {
                      const isInteractive = q.tableConfig?.interactiveCells?.some((ic: any) => ic.r === rIdx && ic.c === cIdx);
                      const cellId = `${rIdx}-${cIdx}`;
                      if (!isInteractive) {
                        return (
                          <td key={cIdx} style={{ border: '1px solid #eee', padding: '12px', background: rIdx === 0 ? 'var(--system-blue)' : '#f9f9f9', color: rIdx === 0 ? 'white' : 'black', fontWeight: rIdx === 0 ? 'bold' : 'normal', textAlign: 'center', fontSize: '14px' }}>
                            {cell}
                          </td>
                        );
                      }
                      const studentAns = answers[q.id]?.[cellId];
                      const studentText = (typeof studentAns === 'object' ? studentAns?.text : studentAns) || '';

                      return (
                        <td 
                          key={cIdx} 
                          style={{ border: '1px solid #eee', padding: '4px', background: 'white', minWidth: '120px' }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            if (q.tableConfig?.mode !== 'drag') return;
                            e.preventDefault();
                            const termData = JSON.parse(e.dataTransfer.getData('term'));
                            setAnswers((prev: any) => ({ 
                              ...prev, 
                              [q.id]: { ...(prev[q.id] || {}), [cellId]: { text: termData.text, poolId: termData.poolId } } 
                            }));
                          }}
                        >
                          {q.tableConfig?.mode === 'type' ? (
                            <input 
                              className="input" 
                              style={{ border: '1px solid var(--system-blue)', borderRadius: '6px', padding: '8px', fontSize: '14px', textAlign: 'center', width: '100%' }}
                              value={studentText || ''}
                              onChange={e => setAnswers((prev: any) => ({ ...prev, [q.id]: { ...(prev[q.id] || {}), [cellId]: e.target.value } }))}
                              placeholder="Typ hier..."
                            />
                          ) : (
                            <div 
                              onClick={() => {
                                setAnswers((prev: any) => {
                                  const newAnswers = { ...(prev[q.id] || {}) };
                                  delete newAnswers[cellId];
                                  return { ...prev, [q.id]: newAnswers };
                                });
                              }}
                              style={{ 
                                minHeight: '36px', 
                                background: studentText ? '#f0f7ff' : '#fff9c4', 
                                borderRadius: '6px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '13px', 
                                fontWeight: '600', 
                                cursor: 'pointer', 
                                border: '1px dashed',
                                borderColor: studentText ? 'var(--system-blue)' : '#fbc02d',
                                color: studentText ? 'var(--system-blue)' : '#86868b',
                                transition: 'all 0.2s ease'
                              }}
                              title={studentText ? "Klik om te verwijderen" : "Sleep hier een term naartoe"}
                            >
                              {studentText || ''}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {q.type === 'timeline' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px', padding: '20px', background: 'var(--system-secondary-bg)', borderRadius: '16px' }}>
            {(answers[q.id]?.unplaced || []).map((event: any) => (
              <div 
                key={event.id} 
                draggable 
                onDragStart={(e) => { e.dataTransfer.setData('event', JSON.stringify(event)); e.dataTransfer.setData('source', 'unplaced'); }}
                style={{ padding: '8px 16px', background: 'white', borderRadius: '8px', border: '1px solid var(--system-border)', cursor: 'grab', fontSize: '14px', fontWeight: '500' }}
              >
                {event.text}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${q.totalBuckets || 5}, 1fr)`, gap: '4px', background: 'var(--system-border)', padding: '4px', borderRadius: '12px' }}>
            {Array.from({ length: q.totalBuckets || 5 }).map((_, idx) => {
              const start = q.startYear || 0;
              const end = q.endYear || 2025;
              const range = end - start;
              const bucketSize = range / (q.totalBuckets || 5);
              const bucketStart = Math.floor(start + idx * bucketSize);
              const displayStart = idx === 0 ? bucketStart : Math.floor(start + idx * bucketSize) + 1;
              const bucketEnd = Math.floor(start + (idx + 1) * bucketSize);
              
              return (
                <div 
                  key={idx}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const event = JSON.parse(e.dataTransfer.getData('event'));
                    const source = e.dataTransfer.getData('source');
                    setAnswers((prev: any) => {
                      const current = prev[q.id] || { unplaced: [], placed: {} };
                      const newUnplaced = source === 'unplaced' ? current.unplaced.filter((ev: any) => ev.id !== event.id) : current.unplaced;
                      const newPlaced = { ...current.placed };
                      Object.keys(newPlaced).forEach(b => { newPlaced[b] = newPlaced[b].filter((ev: any) => ev.id !== event.id); });
                      newPlaced[idx] = [...(newPlaced[idx] || []), event];
                      return { ...prev, [q.id]: { unplaced: newUnplaced, placed: newPlaced } };
                    });
                  }}
                  style={{ background: 'white', minHeight: '150px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#86868b', textAlign: 'center', marginBottom: '8px' }}>{displayStart} - {bucketEnd}</div>
                  {(answers[q.id]?.placed?.[idx] || []).map((event: any) => (
                    <div 
                      key={event.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('event', JSON.stringify(event)); e.dataTransfer.setData('source', idx.toString()); }}
                      onClick={() => {
                        setAnswers((prev: any) => {
                          const current = prev[q.id];
                          const newPlaced = { ...current.placed };
                          newPlaced[idx] = newPlaced[idx].filter((ev: any) => ev.id !== event.id);
                          return { ...prev, [q.id]: { unplaced: [...current.unplaced, event], placed: newPlaced } };
                        });
                      }}
                      style={{ padding: '6px 8px', background: '#f5f5f7', borderRadius: '6px', fontSize: '12px', textAlign: 'center', cursor: 'pointer' }}
                    >
                      {event.text}
                    </div>
                  ))}
                </div>
              );
            })}
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
  
  const [activeTool, setActiveTool] = useState<'calc' | 'chat' | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isSubmittedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFullscreenRef = useRef(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/exams/${examKey}`)
      .then(res => res.json())
      .then(data => {
        setExam(data);
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
          } else if (q.type === 'timeline') {
            const allEvents = (q.timelineData || []).flat();
            initialAnswers[q.id] = {
              unplaced: allEvents.sort(() => Math.random() - 0.5),
              placed: {}
            };
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

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket?.disconnect();
    };
  }, [examKey, name, isPreview]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    examRef.current = exam;
  }, [exam]);

  const enterFullscreen = () => {
    const el = containerRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen();
      setIsFullscreen(true);
      isFullscreenRef.current = true;
    }
  };

  const submitExam = async (finalAnswers: any, idOverride?: string) => {
    if (isSubmittedRef.current) return;
    const exId = idOverride || exam?.id;
    if (!exId) return;

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exId,
          name,
          klas: sessionStorage.getItem('studentKlas'),
          answers: finalAnswers
        }),
      });
      if (res.ok) {
        setIsSubmitted(true);
        isSubmittedRef.current = true;
        if (document.fullscreenElement) document.exitFullscreen();
      }
    } catch (e) { alert('Fout bij inleveren'); }
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

  const isQuestionAnswered = (q: any) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (typeof ans === 'string') return ans.trim() !== '';
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === 'object') {
      return Object.values(ans).some((val: any) => {
        const text = typeof val === 'object' ? val?.text : val;
        return text && text.toString().trim() !== '';
      });
    }
    return !!ans;
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
                  <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
                    {exam.questions.map((q: any, idx: number) => {
                      const isCurrent = currentQuestionIndex === idx;
                      const isAnswered = isQuestionAnswered(q);
                      let bgColor = 'white'; let textColor = 'var(--system-text)'; let borderColor = 'var(--system-border)';
                      if (isAnswered) { bgColor = '#86868b'; textColor = 'white'; borderColor = '#86868b'; }
                      if (isCurrent) { bgColor = 'var(--system-blue)'; textColor = 'white'; borderColor = 'var(--system-blue)'; }
                      return (
                        <button key={idx} onClick={() => setCurrentQuestionIndex(idx)} style={{ width: '36px', height: '36px', borderRadius: '50%', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgColor, color: textColor, border: `1px solid ${borderColor}`, cursor: 'pointer', transition: 'all 0.2s ease', transform: isCurrent ? 'scale(1.15)' : 'scale(1)', boxShadow: isCurrent ? '0 4px 12px rgba(0,113,227,0.25)' : 'none' }} title={`Vraag ${idx + 1}`}>{idx + 1}</button>
                      );
                    })}
                  </nav>
                  <QuestionRenderer q={exam.questions[currentQuestionIndex]} {...rendererProps} />
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', marginTop: '60px', borderTop: '1px solid var(--system-border)', paddingTop: '40px' }}>
                    <button className="btn btn-secondary" style={{ padding: '12px 32px' }} disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}><ChevronLeft size={16} /> Vorige</button>
                    {currentQuestionIndex === exam.questions.length - 1 ? (
                      <button className="btn" style={{ padding: '12px 48px', fontSize: '17px', fontWeight: '700', boxShadow: '0 10px 20px rgba(0,113,227,0.3)' }} onClick={() => { if(confirm('Weet je zeker dat je wilt inleveren?')) submitExam(answers); }}>{exam.type?.toUpperCase() || 'EXAMEN'} INLEVEREN</button>
                    ) : (
                      <button className="btn btn-secondary" style={{ padding: '12px 32px' }} onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>Volgende <ChevronRight size={16} /></button>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
                  {exam.questions.map((q: any) => <QuestionRenderer key={q.id} q={q} {...rendererProps} />)}
                  <div style={{ textAlign: 'center', paddingTop: '40px', borderTop: '1px solid var(--system-border)' }}>
                    <button className="btn" style={{ padding: '16px 40px', fontSize: '18px' }} onClick={() => { if(confirm('Weet je zeker dat je wilt inleveren?')) submitExam(answers); }}>{(exam.type || 'examen').charAt(0).toUpperCase() + (exam.type || 'examen').slice(1)} Inleveren</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
