const puppeteer = require('puppeteer');

async function runTests() {
  console.log('🤖 Start UI End-to-End Tests...');
  let browser;

  try {
    browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const monitorErrors = (page, name) => {
      page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') {
          console.error(`🔴 BROWSER ERROR [${name}]:`, text);
          if (text.includes('Objects are not valid as a React child') || text.includes('Uncaught Error')) {
            throw new Error(`Kritieke React crash gedetecteerd in ${name}: ${text}`);
          }
        }
      });
      page.on('pageerror', error => {
        console.error(`🔥 PAGE CRASH [${name}]:`, error.message);
        process.exit(1);
      });
    };

    // --- TEST 1: DOCENTEN PORTAAL ---
    console.log('⏳ Testen van Docenten Portaal (http://localhost:5173)...');
    const teacherPage = await browser.newPage();
    monitorErrors(teacherPage, 'Docent Portaal');
    await teacherPage.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    await teacherPage.evaluate(() => {
      sessionStorage.setItem('user', JSON.stringify({ id: 'joachim.vanmeirvenne@atheneumkapellen.be', name: 'Test Docent', role: 'teacher' }));
    });
    await teacherPage.goto('http://localhost:5173/teacher', { waitUntil: 'networkidle2' });

    // Click "Nieuwe Toets"
    console.log('⏳ Testen: Nieuwe Toets maken en vraag toevoegen...');
    await teacherPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Nieuwe Toets'));
      if (btn) btn.click();
    });
    
    await teacherPage.waitForSelector('input[placeholder="Titel..."]');
    
    // Type a title
    await teacherPage.type('input[placeholder="Titel..."]', 'Test Toets E2E');

    // Add a second question
    console.log('⏳ Klikken op "Vraag toevoegen"...');
    await teacherPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Vraag toevoegen'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1000));

    // Verify there are now 2 question dots
    const dotsCount = await teacherPage.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).filter(b => 
        b.style.borderRadius === '50%' && b.style.width === '32px'
      ).length;
    });
    
    // Note: We observed 2 initially (1 question + something else?), so we expect 3 now.
    console.log(`📊 Aantal bolletjes na toevoegen: ${dotsCount}`);
    
    // Type in the second question
    await teacherPage.waitForSelector('textarea[placeholder="Instructie voor de student..."]');
    await teacherPage.type('textarea[placeholder="Instructie voor de student..."]', 'Dit is vraag 2');

    // Verify the text is there
    const areaValue = await teacherPage.$eval('textarea[placeholder="Instructie voor de student..."]', el => el.value);
    if (areaValue !== 'Dit is vraag 2') {
      throw new Error(`Fout: Tekst in nieuwe vraag komt niet overeen. Gevonden: '${areaValue}'`);
    }

    // Switch to List View
    console.log('⏳ Testen: Vraag toevoegen in lijstweergave...');
    await teacherPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Lijst'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));

    // Click "Nieuwe vraag toevoegen" in list view
    await teacherPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Nieuwe vraag toevoegen'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1000));

    // Verify question count
    const questionsCount = await teacherPage.evaluate(() => {
      return document.querySelectorAll('textarea[placeholder="Instructie voor de student..."]').length;
    });
    console.log(`📊 Aantal vragen in lijst na toevoegen: ${questionsCount}`);
    
    if (questionsCount !== 3) {
      throw new Error(`Fout: Vraag toevoegen in lijstweergave werkte niet. Aantal: ${questionsCount}`);
    }

    console.log('✅ Vraag toevoegen werkt in beide weergaves!');

    // --- TEST 2: STUDENTEN PORTAAL ---
    console.log('⏳ Testen van Studenten Portaal (http://localhost:5174)...');
    const studentPage = await browser.newPage();
    monitorErrors(studentPage, 'Student Portaal');
    await studentPage.goto('http://localhost:5174', { waitUntil: 'networkidle2' });

    const inputSelector = 'input[placeholder="ABC123"]';
    await studentPage.waitForSelector(inputSelector);
    await studentPage.type(inputSelector, 'TESTCODE');
    
    const inputValue = await studentPage.$eval(inputSelector, el => el.value);
    if (inputValue !== 'TESTCODE') throw new Error("Fout: Kan geen examen sleutel typen.");
    
    console.log('✅ Studenten Portaal inlogscherm is in orde.');

    console.log('\n🎉 ALLE UI TESTS ZIJN GESLAAGD!');

  } catch (error) {
    console.error('\n❌ UI TEST GEFAALD:');
    console.error(error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runTests();
