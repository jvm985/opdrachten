import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function PrintExam() {
  const { examKey } = useParams();
  const [exam, setExam] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/exams/${examKey}`)
      .then(res => res.json())
      .then(data => {
        setExam(data);
        // Automatisch het print-dialoogvenster openen nadat de data geladen is
        setTimeout(() => window.print(), 1000);
      })
      .catch(() => alert('Kan toets niet laden.'));
  }, [examKey]);

  if (!exam) return <p>Laden...</p>;

  const totalPoints = exam.questions.reduce((sum: number, q: any) => sum + (q.type === 'image-analysis' && q.subQuestions ? q.subQuestions.reduce((s: number, sq: any) => s + (sq.points || 0), 0) : (q.points || 0)), 0);

  return (
    <div className="print-container">
      <style>{`
        @media screen {
          body { background: #f0f0f0; padding: 40px; }
          .print-container { 
            background: white; 
            width: 210mm; 
            min-height: 297mm; 
            margin: 0 auto; 
            padding: 20mm; 
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
        }
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body { 
            background: white !important; 
            color: black !important;
            margin: 0 !important; 
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything in the app except our print container */
          #root > *:not(.print-container),
          .app-container > *:not(.print-container),
          .no-print { 
            display: none !important; 
          }
          .app-container {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-container { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important;
            box-shadow: none !important;
            visibility: visible !important;
            display: block !important;
            position: static !important;
          }
          * { 
            animation: none !important; 
            transition: none !important; 
            opacity: 1 !important; 
            transform: none !important;
            color: black !important;
            background-color: transparent !important;
          }
          /* Ensure SVG colors still print */
          svg path { fill: #8b1d41 !important; }
        }
        .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .school-logo { width: 150px; }
        .top-info { text-align: right; font-size: 12px; font-weight: bold; }
        
        .exam-title { font-size: 24px; font-weight: bold; margin: 20px 0; border-bottom: 2px solid #000; padding-bottom: 10px; }
        
        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
        .info-field { border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 10px; display: flex; }
        .info-label { font-weight: bold; margin-right: 10px; min-width: 60px; }
        .info-line { flex: 1; }

        .score-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 12px; }
        .score-table th, .score-table td { border: 1px solid black; padding: 8px; text-align: center; }
        .score-table th { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; }
        
        .question-item { margin-bottom: 35px; position: relative; page-break-inside: avoid; }
        .points-box { 
          position: absolute; 
          left: -45px; 
          top: 0; 
          width: 30px; 
          height: 30px; 
          border: 1px solid black; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: bold;
          font-size: 14px;
        }
        .question-text { font-size: 16px; font-weight: bold; margin-bottom: 15px; padding-left: 0; color: black; }
        .question-subtext { font-style: italic; font-size: 13px; color: #444; margin-bottom: 15px; }
        
        .answer-lines { margin-top: 15px; }
        .answer-line { border-bottom: 1px solid #ccc; height: 30px; margin-bottom: 5px; }
        
        .mc-option { display: flex; align-items: center; margin-bottom: 10px; }
        .mc-box { width: 18px; height: 18px; border: 1px solid black; margin-right: 12px; }
        
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #888; }
      `}</style>

      <div className="print-header">
        <div className="school-logo" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <svg width="60" height="60" viewBox="0 0 100 100">
              <path d="M50 90 C50 70 30 50 30 30 C30 10 50 10 50 30 C50 10 70 10 70 30 C70 50 50 70 50 90" fill="#8b1d41" />
              <path d="M50 90 C40 75 10 65 10 40 C10 20 30 20 40 35 C30 15 50 15 50 35" fill="#8b1d41" transform="rotate(-15 50 90)" />
              <path d="M50 90 C60 75 90 65 90 40 C90 20 70 20 60 35 C70 15 50 15 50 35" fill="#8b1d41" transform="rotate(15 50 90)" />
           </svg>
           <div style={{ color: '#444', fontWeight: 'bold', fontSize: '20px', lineHeight: '1.1', fontFamily: 'sans-serif' }}>
              Atheneum<br/><span style={{ fontSize: '18px', fontWeight: 'normal' }}>Kapellen</span>
           </div>
        </div>
        <div className="top-info">
          {exam.type.toUpperCase()} / {new Date().toLocaleDateString('nl-BE')}
        </div>
      </div>

      <div className="exam-title">
        {exam.title}
      </div>

      <div className="student-info">
        <div style={{ gridColumn: 'span 2' }} className="info-field">
          <span className="info-label">Naam:</span>
          <span className="info-line"></span>
        </div>
        <div className="info-field">
          <span className="info-label">Klas:</span>
          <span className="info-line"></span>
        </div>
        <div className="info-field">
          <span className="info-label">Datum:</span>
          <span className="info-line"></span>
        </div>
      </div>

      {exam.isGraded && (
        <table className="score-table">
          <thead>
            <tr>
              <th>Vraag</th>
              {exam.questions.map((_: any, i: number) => <th key={i}>{i + 1}</th>)}
              <th>Totaal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Punten</td>
              {exam.questions.map((q: any, i: number) => {
                 const pts = q.type === 'image-analysis' && q.subQuestions 
                    ? q.subQuestions.reduce((s: number, sq: any) => s + (sq.points || 0), 0)
                    : (q.points || 0);
                 return <td key={i}>{pts}</td>;
              })}
              <td style={{ fontWeight: 'bold' }}>{totalPoints}</td>
            </tr>
            <tr>
              <td>Score</td>
              {exam.questions.map((_: any, i: number) => <td key={i}></td>)}
              <td></td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="questions-container" style={{ paddingLeft: '45px' }}>
        {exam.questions.map((q: any, idx: number) => {
          const qPoints = q.type === 'image-analysis' && q.subQuestions 
            ? q.subQuestions.reduce((sum: number, sq: any) => sum + (sq.points || 0), 0)
            : q.points;

          return (
            <div key={q.id} className="question-item">
              <div className="points-box">{qPoints}</div>
              <div className="question-text">
                {idx + 1}. {q.text}
              </div>

              {q.type === 'open' && (
                <div className="answer-lines">
                  {[...Array(5)].map((_, i) => <div key={i} className="answer-line" />)}
                </div>
              )}

              {q.type === 'multiple-choice' && (
                <div style={{ marginTop: '10px' }}>
                  {q.options?.map((opt: string, i: number) => (
                    <div key={i} className="mc-option">
                      <div className="mc-box"></div>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'true-false' && (
                <div style={{ display: 'flex', gap: '30px', marginTop: '10px' }}>
                  <div className="mc-option"><div className="mc-box"></div> Waar</div>
                  <div className="mc-option"><div className="mc-box"></div> Onwaar</div>
                </div>
              )}

              {q.type === 'map' && q.image && (
                <div style={{ marginTop: '15px' }}>
                  <img src={q.image} style={{ width: '100%', maxWidth: '150mm', border: '1px solid #eee' }} />
                  <p style={{ fontSize: '12px', marginTop: '10px' }}>Duid de volgende plaatsen aan op de kaart:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    {q.locations?.map((loc: any) => (
                      <div key={loc.id} style={{ display: 'flex', alignItems: 'center' }}>
                         <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid black', marginRight: '5px' }}></div>
                         <span>{loc.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {q.type === 'definitions' && (
                <table className="score-table" style={{ marginTop: '15px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '60%' }}>Definitie / Omschrijving</th>
                      <th style={{ textAlign: 'left' }}>Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.pairs?.map((pair: any) => (
                      <tr key={pair.id}>
                        <td style={{ textAlign: 'left', padding: '15px' }}>{pair.definition}</td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {q.type === 'ordering' && (
                <div style={{ display: 'flex', flexDirection: q.orderDirection === 'horizontal' ? 'row' : 'column', flexWrap: 'wrap', gap: '15px', marginTop: '15px' }}>
                  {q.orderItems?.map((item: any, i: number) => (
                    <div key={i} style={{ padding: '12px 20px', border: '1px solid black', borderRadius: '12px', minWidth: '120px', fontSize: '15px', textAlign: 'center' }}>
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'matching' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {q.matchingPairs?.map((p: any) => (
                      <div key={p.id} style={{ padding: '15px 20px', border: '1px solid black', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', background: '#f9f9f9' }}>
                        {p.left}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {q.matchingPairs?.map((p: any) => (
                      <div key={p.id} style={{ height: '52px', borderBottom: '1px solid black', margin: '5px 0' }}></div>
                    ))}
                  </div>
                </div>
              )}

              {q.type === 'image-analysis' && q.image && (
                <div style={{ marginTop: '15px' }}>
                  <img src={q.image} style={{ width: '100%', maxWidth: '150mm', marginBottom: '20px' }} />
                  {q.subQuestions?.map((sq: any, sIdx: number) => (
                    <div key={sq.id} style={{ marginBottom: '20px' }}>
                       <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{idx + 1}.{sIdx + 1} {sq.text} ({sq.points} pt)</div>
                       <div className="answer-lines">
                          {[...Array(2)].map((_, i) => <div key={i} className="answer-line" />)}
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <button className="btn" onClick={() => window.print()}>Afdrukken</button>
      </div>
    </div>
  );
}
