import React, { useState, useEffect } from 'react';
import { Trash2, Database, MapPin, CheckCircle2, Circle, Plus, X, Type, GripHorizontal, MoreHorizontal } from 'lucide-react';
import type { Question } from '../types';

interface QuestionEditorProps {
  q: Question;
  index?: number;
  viewMode?: 'single' | 'list';
  hasSubmissions?: boolean;
  isSavingToBank?: string | null;
  handleRemoveQuestion?: (idx: number) => void;
  handleUpdateQuestion: (id: string, updates: Partial<Question>) => void;
  handleMapClick: (e: React.MouseEvent, q: Question) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, qId: string) => void;
  saveQuestionToBank?: (q: Question) => void;
  showBankButton?: boolean;
  showRemoveButton?: boolean;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ 
  q, index, viewMode, hasSubmissions, isSavingToBank, 
  handleRemoveQuestion, handleUpdateQuestion, handleMapClick, 
  handleImageUpload, saveQuestionToBank, 
  showBankButton = true, showRemoveButton = true 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const close = () => setShowMenu(false);
    if (showMenu) {
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [showMenu]);

  const updateTableCell = (r: number, c: number, val: string) => {
    const newData = [...(q.tableData || [['']])];
    if (!newData[r]) newData[r] = [];
    newData[r][c] = val;
    handleUpdateQuestion(q.id, { tableData: newData });
  };

  const toggleCellInteractive = (r: number, c: number) => {
    if (r === 0) return;
    const current = q.tableConfig?.interactiveCells || [];
    const exists = current.find(cell => cell.r === r && cell.c === c);
    let newList;
    if (exists) {
      newList = current.filter(cell => !(cell.r === r && cell.c === c));
    } else {
      newList = [...current, { r, c }];
    }
    handleUpdateQuestion(q.id, { 
      tableConfig: { ...q.tableConfig, mode: q.tableConfig?.mode || 'type', interactiveCells: newList },
      points: newList.length
    });
  };

  const updateTimelineEvent = (bucketIdx: number, eventIdx: number, text: string) => {
    const newData = [...(q.timelineData || [])];
    if (!newData[bucketIdx]) newData[bucketIdx] = [];
    newData[bucketIdx][eventIdx].text = text;
    handleUpdateQuestion(q.id, { timelineData: newData });
  };

  const addTimelineEvent = (bucketIdx: number) => {
    const newData = [...(q.timelineData || [])];
    if (!newData[bucketIdx]) newData[bucketIdx] = [];
    newData[bucketIdx].push({ id: Math.random().toString(36).substr(2, 9), text: '' });
    // Update punten op basis van totaal aantal events
    const totalEvents = newData.reduce((sum, b) => sum + b.length, 0);
    handleUpdateQuestion(q.id, { timelineData: newData, points: totalEvents });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => handleUpdateQuestion(q.id, { image: reader.result as string });
          reader.readAsDataURL(file);
        }
      }
    }
  };

  return (
    <div 
      className="card animate-up" 
      style={{ padding: '32px', marginBottom: viewMode === 'list' ? '32px' : 0, borderRadius: '20px', position: 'relative' }}
      onPaste={handlePaste}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          {index !== undefined && <span className="badge" style={{ marginBottom: '4px' }}>VRAAG {index + 1}</span>}
          <h3 style={{ margin: 0, fontSize: '18px' }}>{q.type.toUpperCase()}</h3>
        </div>
        {!hasSubmissions && (
          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px', borderRadius: '50%', width: '32px', height: '32px' }} 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              <MoreHorizontal size={18}/>
            </button>
            {showMenu && (
              <div className="animate-up" style={{ position: 'absolute', top: '36px', right: 0, width: '220px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)', zIndex: 100, padding: '6px' }}>
                {showBankButton && saveQuestionToBank && (
                  <button 
                    className="dropdown-item" 
                    onClick={() => saveQuestionToBank(q)} 
                    disabled={isSavingToBank === q.id}
                    style={{ width: '100%', textAlign: 'left', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                  >
                    <Database size={14}/> Kopieer naar vraagbank
                  </button>
                )}
                {showRemoveButton && handleRemoveQuestion && index !== undefined && (
                  <button 
                    className="dropdown-item" 
                    onClick={() => handleRemoveQuestion(index)}
                    style={{ width: '100%', textAlign: 'left', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#ef4444' }}
                  >
                    <Trash2 size={14}/> Vraag verwijderen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <textarea className="input" value={q.text} onChange={e => handleUpdateQuestion(q.id, { text: e.target.value })} rows={2} placeholder="Instructie voor de student..." style={{ fontSize: '17px', fontWeight: '500', borderRadius: '12px', marginBottom: '24px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <select 
          className="input" 
          value={q.type} 
          onChange={e => {
            const newType = e.target.value as any;
            const updates: Partial<Question> = { type: newType };
            if (newType === 'timeline') {
              if (!q.text || q.text.trim() === '') {
                updates.text = 'Zet de gebeurtenissen in het juiste vak van de tijdlijn.';
              }
              updates.timelineData = q.timelineData || Array.from({ length: q.totalBuckets || 5 }, () => []);
              updates.startYear = q.startYear || 1900;
              updates.endYear = q.endYear || 2000;
              updates.totalBuckets = q.totalBuckets || 5;
            }
            if (newType === 'table-fill') {
              updates.tableData = q.tableData || [['Titel 1', 'Titel 2'], ['', '']];
              updates.tableConfig = q.tableConfig || { mode: 'type', interactiveCells: [] };
            }
            handleUpdateQuestion(q.id, updates);
          }} 
          disabled={hasSubmissions} 
          style={{ borderRadius: '10px' }}
        >
          <option value="open">Open vraag</option><option value="multiple-choice">Meerkeuze</option><option value="true-false">Waar/Onwaar</option><option value="map">Blinde kaart</option>
          <option value="definitions">Definities</option><option value="matching">Paren</option><option value="ordering">Volgorde</option><option value="image-analysis">Afbeelding analyse</option>
          <option value="timeline">Tijdlijn (Verbeterd)</option><option value="table-fill">Invultabel</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input className="input" type="number" value={q.points} onChange={e => handleUpdateQuestion(q.id, { points: parseInt(e.target.value) || 0 })} min={0} style={{ borderRadius: '10px', flex: 1 }} />
          <span style={{ fontSize: '12px', color: '#86868b', fontWeight: '600' }}>PUNTEN</span>
        </div>
      </div>
      
      {q.type === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>BEGINJAAR</label>
              <input type="number" className="input" value={q.startYear || 0} onChange={e => handleUpdateQuestion(q.id, { startYear: parseInt(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>EINDJAAR</label>
              <input type="number" className="input" value={q.endYear || 2025} onChange={e => handleUpdateQuestion(q.id, { endYear: parseInt(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>AANTAL VAKJES</label>
              <input type="number" className="input" value={q.totalBuckets || 5} min={2} max={20} onChange={e => {
                const count = parseInt(e.target.value) || 5;
                const newData = Array.from({ length: count }, (_, i) => q.timelineData?.[i] || []);
                handleUpdateQuestion(q.id, { totalBuckets: count, timelineData: newData });
              }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${q.totalBuckets || 5}, 1fr)`, gap: '8px', background: '#f5f5f7', padding: '12px', borderRadius: '16px' }}>
            {Array.from({ length: q.totalBuckets || 5 }).map((_, idx) => {
              const bucketSize = ((q.endYear || 2025) - (q.startYear || 0)) / (q.totalBuckets || 5);
              const bStart = Math.floor((q.startYear || 0) + idx * bucketSize);
              const displayStart = idx === 0 ? bStart : bStart + 1;
              const bEnd = Math.floor((q.startYear || 0) + (idx + 1) * bucketSize);
              return (
                <div key={idx} style={{ background: 'white', border: '1px solid #d2d2d7', borderRadius: '12px', padding: '10px', minHeight: '150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', textAlign: 'center', color: '#86868b' }}>{displayStart}-{bEnd}</div>
                  {(q.timelineData?.[idx] || []).map((event, ei) => (
                    <div key={event.id} style={{ position: 'relative' }}>
                      <input 
                        className="input" 
                        style={{ padding: '6px 20px 6px 6px', fontSize: '11px', textAlign: 'center' }} 
                        value={event.text} 
                        onChange={e => updateTimelineEvent(idx, ei, e.target.value)}
                        placeholder="Gebeurtenis..."
                      />
                      <button 
                        style={{ position: 'absolute', right: '4px', top: '8px', color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                          const newData = [...(q.timelineData || [])];
                          newData[idx] = newData[idx].filter((_, i) => i !== ei);
                          handleUpdateQuestion(q.id, { timelineData: newData, points: newData.reduce((s, b) => s + b.length, 0) });
                        }}
                      >
                        <X size={10}/>
                      </button>
                    </div>
                  ))}
                  <button className="btn btn-secondary" style={{ padding: '4px', fontSize: '10px', marginTop: 'auto' }} onClick={() => addTimelineEvent(idx)}><Plus size={12}/> Gebeurtenis</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {q.type === 'table-fill' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => {
                const newData = [...(q.tableData || [['', '']])].map(r => [...r, '']);
                handleUpdateQuestion(q.id, { tableData: newData });
              }}><Plus size={14}/> Kolom</button>
              <button className="btn btn-secondary" onClick={() => {
                const cols = (q.tableData || [['', '']])[0].length;
                const newData = [...(q.tableData || [['', '']]), Array(cols).fill('')];
                handleUpdateQuestion(q.id, { tableData: newData });
              }}><Plus size={14}/> Rij</button>
            </div>
            <div style={{ display: 'flex', background: '#f5f5f7', padding: '4px', borderRadius: '10px' }}>
              <button 
                className={`btn ${q.tableConfig?.mode === 'type' ? '' : 'btn-secondary'}`} 
                style={{ padding: '6px 12px', fontSize: '12px', border: 'none' }}
                onClick={() => handleUpdateQuestion(q.id, { tableConfig: { ...q.tableConfig, mode: 'type', interactiveCells: q.tableConfig?.interactiveCells || [] } })}
              >
                <Type size={14} style={{ marginRight: '6px' }}/> Typen
              </button>
              <button 
                className={`btn ${q.tableConfig?.mode === 'drag' ? '' : 'btn-secondary'}`} 
                style={{ padding: '6px 12px', fontSize: '12px', border: 'none' }}
                onClick={() => handleUpdateQuestion(q.id, { tableConfig: { ...q.tableConfig, mode: 'drag', interactiveCells: q.tableConfig?.interactiveCells || [] } })}
              >
                <GripHorizontal size={14} style={{ marginRight: '6px' }}/> Slepen
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>
              <input 
                type="checkbox" 
                checked={!!q.tableConfig?.ignoreRowOrder} 
                onChange={e => handleUpdateQuestion(q.id, { 
                  tableConfig: { 
                    mode: q.tableConfig?.mode || 'type',
                    interactiveCells: q.tableConfig?.interactiveCells || [],
                    ignoreRowOrder: e.target.checked 
                  } 
                })} 
              />
              <span>Volgorde negeren</span>
            </label>
          </div>
          <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', border: '1px solid var(--system-border)', padding: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(q.tableData || [['Titel 1', 'Titel 2'], ['Cel 1', 'Cel 2']]).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => {
                      const isInteractive = q.tableConfig?.interactiveCells?.some(ic => ic.r === rIdx && ic.c === cIdx);
                      return (
                        <td key={cIdx} style={{ border: '1px solid #eee', padding: '2px', position: 'relative' }}>
                          <input 
                            className="input" 
                            style={{ 
                              border: 'none', 
                              background: rIdx === 0 ? 'var(--system-blue)' : (isInteractive ? '#fff9c4' : 'white'), 
                              color: rIdx === 0 ? 'white' : 'black',
                              fontWeight: rIdx === 0 ? 'bold' : 'normal', 
                              borderRadius: '4px', padding: '10px', fontSize: '14px', width: '100%',
                              textAlign: 'center'
                            }} 
                            value={cell} 
                            onChange={e => updateTableCell(rIdx, cIdx, e.target.value)}
                            placeholder="..."
                          />
                          {rIdx > 0 && (
                            <div 
                              onClick={() => toggleCellInteractive(rIdx, cIdx)}
                              style={{ position: 'absolute', top: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', background: isInteractive ? '#fbc02d' : '#eee', cursor: 'pointer', zIndex: 10, border: '2px solid white' }}
                              title="Markeer als invulveld"
                            />
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

      {q.type === 'open' && <input className="input" value={q.correctAnswer} onChange={e => handleUpdateQuestion(q.id, { correctAnswer: e.target.value })} placeholder="Modeloplossing..." style={{ borderRadius: '10px' }} />}
      {q.type === 'multiple-choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(q.options || ['']).map((opt: string, idx: number) => (
            <div key={idx} style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleUpdateQuestion(q.id, { correctAnswer: opt })} style={{ color: q.correctAnswer === opt && opt !== '' ? 'var(--system-success)' : 'var(--system-border)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {q.correctAnswer === opt && opt !== '' ? <CheckCircle2 size={24}/> : <Circle size={24}/>}
              </button>
              <input className="input" value={opt} onChange={e => { const n = [...(q.options || [])]; n[idx] = e.target.value; handleUpdateQuestion(q.id, { options: n }); }} />
              {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { options: q.options?.filter((_, i) => i !== idx) })}><X size={16}/></button>}
            </div>
          ))}
          {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { options: [...(q.options || []), ''] })} style={{ alignSelf: 'flex-start' }}><Plus size={16}/> Optie</button>}
        </div>
      )}
      {q.type === 'true-false' && (
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Waar', 'Onwaar'].map(opt => <button key={opt} className={`btn ${q.correctAnswer === opt ? '' : 'btn-secondary'}`} style={{ flex: 1, padding: '16px' }} onClick={() => handleUpdateQuestion(q.id, { correctAnswer: opt })}>{opt}</button>)}
        </div>
      )}
      {(q.type === 'map' || q.type === 'image-analysis') && (
        <div>
          {!q.image ? (
            <div style={{ border: '2px dashed var(--system-border)', padding: '40px', textAlign: 'center', borderRadius: '16px' }}>
              <input type="file" id={`img-${q.id}`} hidden onChange={e => handleImageUpload(e, q.id)} /><label htmlFor={`img-${q.id}`} className="btn btn-secondary" style={{ cursor: 'pointer' }}>Upload Afbeelding</label>
            </div>
          ) : (
            <div 
              style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                if (q.type !== 'map' || hasSubmissions) return;
                const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
                if (data.isMoving) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  handleUpdateQuestion(q.id, { 
                    locations: q.locations?.map(l => l.id === data.locId ? { ...l, x, y } : l) 
                  });
                }
              }}
            >
              <img src={q.image} style={{ width: '100%', display: 'block' }} onClick={q.type === 'map' ? (e) => handleMapClick(e, q) : undefined} />
              {!hasSubmissions && <button className="btn btn-danger" style={{ position: 'absolute', top: '12px', right: '12px', padding: '8px', zIndex: 30 }} onClick={() => handleUpdateQuestion(q.id, { image: undefined, locations: [] })}><Trash2 size={16}/></button>}
              {q.type === 'map' && q.locations?.map((loc: any) => (
                <div 
                  key={loc.id} 
                  draggable={!hasSubmissions}
                  onDragStart={e => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ locId: loc.id, isMoving: true }));
                  }}
                  style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: hasSubmissions ? 'default' : 'grab', zIndex: 20 }}
                >
                  <input className="input" value={loc.label} onChange={e => handleUpdateQuestion(q.id, { locations: q.locations?.map((l: any) => l.id === loc.id ? { ...l, label: e.target.value } : l) })} style={{ width: '80px', fontSize: '10px', padding: '4px', textAlign: 'center', background: 'white', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  <MapPin size={20} color="var(--system-blue)" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}      {q.type === 'image-analysis' && (
        <div style={{ marginTop: '24px' }}>
          {q.subQuestions?.map((sq: any, si: number) => (
            <div key={sq.id} style={{ marginBottom: '16px', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid var(--system-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600' }}>Subvraag {si + 1}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px' }}>PUNTEN:</label>
                  <input 
                    type="number" 
                    className="input" 
                    style={{ width: '60px' }} 
                    value={sq.points} 
                    onChange={e => {
                      const newPoints = parseInt(e.target.value) || 0;
                      const newSubs = q.subQuestions?.map((s: any) => s.id === sq.id ? { ...s, points: newPoints } : s);
                      const totalPoints = newSubs?.reduce((sum: number, s: any) => sum + s.points, 0) || 0;
                      handleUpdateQuestion(q.id, { subQuestions: newSubs, points: totalPoints });
                    }} 
                  />
                  {!hasSubmissions && (
                    <button 
                      className="btn btn-danger" 
                      onClick={() => {
                        const newSubs = q.subQuestions?.filter((s: any) => s.id !== sq.id);
                        const totalPoints = newSubs?.reduce((sum: number, s: any) => sum + s.points, 0) || 0;
                        handleUpdateQuestion(q.id, { subQuestions: newSubs, points: totalPoints });
                      }}
                    >
                      <X size={14}/>
                    </button>
                  )}
                </div>
              </div>
              <input className="input" value={sq.text} onChange={e => handleUpdateQuestion(q.id, { subQuestions: q.subQuestions?.map((s: any) => s.id === sq.id ? { ...s, text: e.target.value } : s) })} placeholder="Vraagstelling..." style={{ marginBottom: '8px' }} />
              <input className="input" value={sq.correctAnswer || ''} onChange={e => handleUpdateQuestion(q.id, { subQuestions: q.subQuestions?.map((s: any) => s.id === sq.id ? { ...s, correctAnswer: e.target.value } : s) })} placeholder="Modeloplossing (optioneel)..." style={{ fontSize: '13px', background: '#f0f7ff' }} />
            </div>
          ))}
          {!hasSubmissions && (
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                const newSubs = [...(q.subQuestions || []), { id: Math.random().toString(36).substr(2,9), text: '', points: 1 }];
                const totalPoints = newSubs.reduce((sum, s) => sum + s.points, 0);
                handleUpdateQuestion(q.id, { subQuestions: newSubs, points: totalPoints });
              }}
            >
              <Plus size={16}/> Subvraag
            </button>
          )}
        </div>
      )}
      {q.type === 'definitions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {q.pairs?.map((p: any) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px' }}>
              <input className="input" value={p.definition} onChange={e => handleUpdateQuestion(q.id, { pairs: q.pairs?.map((x: any) => x.id === p.id ? { ...x, definition: e.target.value } : x) })} placeholder="Definitie..." />
              <input className="input" value={p.term} onChange={e => handleUpdateQuestion(q.id, { pairs: q.pairs?.map((x: any) => x.id === p.id ? { ...x, term: e.target.value } : x) })} placeholder="Term..." />
              {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { pairs: q.pairs?.filter((x: any) => x.id !== p.id) })}><X size={16}/></button>}
            </div>
          ))}
          {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { pairs: [...(q.pairs || []), { id: Math.random().toString(36).substr(2,9), definition: '', term: '' }] })} style={{ alignSelf: 'flex-start' }}><Plus size={16}/> Begrip</button>}
        </div>
      )}
      {q.type === 'matching' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {q.matchingPairs?.map((p: any) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px' }}>
              <input className="input" value={p.left} onChange={e => handleUpdateQuestion(q.id, { matchingPairs: q.matchingPairs?.map((x: any) => x.id === p.id ? { ...x, left: e.target.value } : x) })} placeholder="Links..." />
              <input className="input" value={p.right} onChange={e => handleUpdateQuestion(q.id, { matchingPairs: q.matchingPairs?.map((x: any) => x.id === p.id ? { ...x, right: e.target.value } : x) })} placeholder="Rechts..." />
              {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { matchingPairs: q.matchingPairs?.filter((x: any) => x.id !== p.id) })}><X size={16}/></button>}
            </div>
          ))}
          {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { matchingPairs: [...(q.matchingPairs || []), { id: Math.random().toString(36).substr(2,9), left: '', right: '' }] })} style={{ alignSelf: 'flex-start' }}><Plus size={16}/> Paar</button>}
        </div>
      )}
      {q.type === 'ordering' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {q.orderItems?.map((item: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', width: '20px' }}>{i + 1}.</span>
              <input className="input" value={item} onChange={e => { const n = [...(q.orderItems || [])]; n[i] = e.target.value; handleUpdateQuestion(q.id, { orderItems: n }); }} />
              {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { orderItems: q.orderItems?.filter((_, idx) => i !== idx) })}><X size={16}/></button>}
            </div>
          ))}
          {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { orderItems: [...(q.orderItems || []), ''] })} style={{ alignSelf: 'flex-start' }}><Plus size={16}/> Item</button>}
        </div>
      )}
    </div>
  );
};
