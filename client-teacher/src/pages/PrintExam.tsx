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
          body { background: #f0f0f0; padding: 40px; margin: 0; }
          .print-container { 
            background: white; 
            width: 210mm; 
            min-height: 297mm; 
            margin: 0 auto; 
            padding: 20mm; 
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            box-sizing: border-box;
          }
        }
        @media print {
          @page { size: A4; margin: 10mm; }
          
          /* Verberg ALLES behalve de print container */
          html, body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-container, .print-container * {
            visibility: visible;
          }
          
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            display: block !important;
          }

          .no-print { display: none !important; }
          
          /* Forceer zwart op wit en zet kleuren aan */
          * { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: black !important;
            background: transparent !important;
            animation: none !important;
            transition: none !important;
          }
          
          svg path { fill: #8b1d41 !important; }
          .score-table th { background: #f5f5f5 !important; }
          .badge { border: 1px solid #000 !important; }
        }
        
        .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .top-info { text-align: right; font-size: 12px; font-weight: bold; }
        .exam-title { font-size: 24px; font-weight: bold; margin: 20px 0; border-bottom: 2px solid #000; padding-bottom: 10px; text-transform: uppercase; }
        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
        .info-field { border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 10px; display: flex; }
        .info-label { font-weight: bold; margin-right: 10px; min-width: 60px; }
        .info-line { flex: 1; }
        .score-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 12px; }
        .score-table th, .score-table td { border: 1px solid black; padding: 8px; text-align: center; }
        .score-table th { background: #f5f5f5; }
        .question-item { margin-bottom: 40px; position: relative; page-break-inside: avoid; }
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
        .question-text { font-size: 16px; font-weight: bold; margin-bottom: 15px; color: black; }
        .answer-line { border-bottom: 1px solid #ccc; height: 35px; margin-bottom: 5px; }
        .mc-option { display: flex; align-items: center; margin-bottom: 10px; }
        .mc-box { width: 18px; height: 18px; border: 1px solid black; margin-right: 12px; }
      `}</style>

      <div className="print-header">
        <div className="school-logo" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <svg width="60" height="60" viewBox="0 0 100 100">
              {/* Center teardrop */}
              <path d="M50 90 C50 70 35 55 35 35 C35 15 50 15 50 35 C50 15 65 15 65 35 C65 55 50 70 50 90" fill="#8b1d41" />
              {/* Left teardrop */}
              <path d="M45 88 C35 75 10 65 10 40 C10 20 30 20 40 35 C30 15 45 15 45 35" fill="#8b1d41" transform="rotate(-20 50 90)" />
              {/* Right teardrop */}
              <path d="M55 88 C65 75 90 65 90 40 C90 20 70 20 60 35 C70 15 55 15 55 35" fill="#8b1d41" transform="rotate(20 50 90)" />
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                  <p style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '5px' }}>Zet in de juiste volgorde door een nummer (1, 2, 3...) in het vakje te schrijven:</p>
                  {q.orderItems?.map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '30px', height: '30px', border: '1px solid black', borderRadius: '4px' }}></div>
                      <div style={{ padding: '10px 15px', border: '1px solid #eee', borderRadius: '8px', flex: 1, fontSize: '15px' }}>
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'matching' && (
                <div style={{ marginTop: '15px' }}>
                  <p style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '10px' }}>Trek lijnen tussen de bijbehorende termen of schrijf de juiste term in de kolom rechts:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid black', paddingBottom: '5px' }}>TERMEN</div>
                      {q.matchingPairs?.map((p: any) => (
                        <div key={p.id} style={{ padding: '12px 15px', border: '1px solid black', borderRadius: '8px', fontSize: '14px', background: '#f9f9f9', minHeight: '45px', display: 'flex', alignItems: 'center' }}>
                          {p.left}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid black', paddingBottom: '5px' }}>PAREN</div>
                      {/* We maken een kopie van de rechterkant en husselen deze */}
                      {[...(q.matchingPairs || [])].sort(() => Math.random() - 0.5).map((p: any) => (
                        <div key={p.id} style={{ padding: '12px 15px', border: '1px solid black', borderRadius: '8px', fontSize: '14px', minHeight: '45px', display: 'flex', alignItems: 'center' }}>
                          {p.right}
                        </div>
                      ))}
                    </div>
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
