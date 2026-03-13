import React from 'react';
import { Trash2, Database, ImageIcon, MapPin, CheckCircle2, Circle, Plus, X } from 'lucide-react';

interface Location { id: string; label: string; x: number; y: number; }
interface DefinitionPair { id: string; definition: string; term: string; }
interface MatchingPair { id: string; left: string; right: string; }
interface SubQuestion { id: string; text: string; points: number; }

interface Question {
  id: string;
  type: 'open' | 'multiple-choice' | 'true-false' | 'map' | 'definitions' | 'matching' | 'ordering' | 'image-analysis';
  text: string;
  points: number;
  options?: string[];
  correctAnswer: string;
  image?: string;
  locations?: Location[];
  pairs?: DefinitionPair[];
  matchingPairs?: MatchingPair[];
  orderItems?: string[];
  orderDirection?: 'vertical' | 'horizontal';
  subQuestions?: SubQuestion[];
  explainIfFalse?: boolean;
  labels?: string[];
}

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
}) => (
  <div className="card animate-up" style={{ padding: '32px', marginBottom: viewMode === 'list' ? '32px' : 0, borderRadius: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
      <div>
        {index !== undefined && <span className="badge" style={{ marginBottom: '4px' }}>VRAAG {index + 1}</span>}
        <h3 style={{ margin: 0, fontSize: '18px' }}>{q.type.toUpperCase()}</h3>
      </div>
      {!hasSubmissions && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {showBankButton && saveQuestionToBank && (
            <button className="btn btn-secondary" onClick={() => saveQuestionToBank(q)} disabled={isSavingToBank === q.id}><Database size={16}/></button>
          )}
          {showRemoveButton && handleRemoveQuestion && index !== undefined && (
            <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => handleRemoveQuestion(index)}><Trash2 size={14}/></button>
          )}
        </div>
      )}
    </div>
    <textarea className="input" value={q.text} onChange={e => handleUpdateQuestion(q.id, { text: e.target.value })} rows={2} placeholder="Vraag..." style={{ fontSize: '17px', fontWeight: '500', borderRadius: '12px' }} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '24px 0' }}>
      <select className="input" value={q.type} onChange={e => handleUpdateQuestion(q.id, { type: e.target.value as any })} disabled={hasSubmissions} style={{ borderRadius: '10px' }}>
        <option value="open">Open vraag</option><option value="multiple-choice">Meerkeuze</option><option value="true-false">Waar/Onwaar</option><option value="map">Blinde kaart</option>
        <option value="definitions">Definities</option><option value="matching">Paren</option><option value="ordering">Volgorde</option><option value="image-analysis">Afbeelding analyse</option>
      </select>
      {q.type !== 'image-analysis' && <input className="input" type="number" value={q.points} onChange={e => handleUpdateQuestion(q.id, { points: parseInt(e.target.value) || 0 })} min={0} style={{ borderRadius: '10px' }} />}
    </div>
    
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
          <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
            <img src={q.image} style={{ width: '100%', display: 'block' }} onClick={q.type === 'map' ? (e) => handleMapClick(e, q) : undefined} />
            {!hasSubmissions && <button className="btn btn-danger" style={{ position: 'absolute', top: '12px', right: '12px', padding: '8px' }} onClick={() => handleUpdateQuestion(q.id, { image: undefined, locations: [] })}><Trash2 size={16}/></button>}
            {q.type === 'map' && q.locations?.map((loc: any) => (
              <div key={loc.id} style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input className="input" value={loc.label} onChange={e => handleUpdateQuestion(q.id, { locations: q.locations?.map((l: any) => l.id === loc.id ? { ...l, label: e.target.value } : l) })} style={{ width: '80px', fontSize: '10px', padding: '4px', textAlign: 'center', background: 'white', borderRadius: '4px' }} />
                <MapPin size={20} color="var(--system-blue)" />
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {q.type === 'image-analysis' && (
      <div style={{ marginTop: '24px' }}>
        {q.subQuestions?.map((sq: any, si: number) => (
          <div key={sq.id} style={{ marginBottom: '16px', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid var(--system-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600' }}>Subvraag {si + 1}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px' }}>PUNTEN:</label>
                <input type="number" className="input" style={{ width: '60px' }} value={sq.points} onChange={e => handleUpdateQuestion(q.id, { subQuestions: q.subQuestions?.map((s: any) => s.id === sq.id ? { ...s, points: parseInt(e.target.value) || 0 } : s) })} />
                {!hasSubmissions && <button className="btn btn-danger" onClick={() => handleUpdateQuestion(q.id, { subQuestions: q.subQuestions?.filter((s: any) => s.id !== sq.id) })}><X size={14}/></button>}
              </div>
            </div>
            <input className="input" value={sq.text} onChange={e => handleUpdateQuestion(q.id, { subQuestions: q.subQuestions?.map((s: any) => s.id === sq.id ? { ...s, text: e.target.value } : s) })} placeholder="Tekst..." />
          </div>
        ))}
        {!hasSubmissions && <button className="btn btn-secondary" onClick={() => handleUpdateQuestion(q.id, { subQuestions: [...(q.subQuestions || []), { id: Math.random().toString(36).substr(2,9), text: '', points: 1 }] })}><Plus size={16}/> Subvraag</button>}
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

    {q.type === 'open' && <input className="input" value={q.correctAnswer} onChange={e => handleUpdateQuestion(q.id, { correctAnswer: e.target.value })} placeholder="Modeloplossing..." style={{ borderRadius: '10px' }} />}
  </div>
);
