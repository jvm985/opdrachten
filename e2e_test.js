const puppeteer = require('puppeteer');

async function runTests() {
  console.log('🤖 Start UI End-to-End Tests...');
  let browser;

  try {
    browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    // --- SETUP ERROR MONITORING ---
    const monitorErrors = (page, name) => {
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.error(`🔴 BROWSER ERROR [${name}]:`, msg.text());
          // We crashen de test als er een kritieke React fout is
          if (msg.text().includes('Objects are not valid as a React child') || msg.text().includes('Uncaught Error')) {
            throw new Error(`Kritieke React crash gedetecteerd in ${name}: ${msg.text()}`);
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
    
    // Check if the home page loads
    const homeTitle = await teacherPage.$eval('h1', el => el.textContent);
    if (homeTitle !== 'Toetsomgeving') throw new Error(`Fout: Verwachtte startpagina 'Toetsomgeving', maar vond '${homeTitle}'`);
    
    console.log('✅ Startpagina docent geladen. Navigeren naar login...');
    
    // Click the login button
    await Promise.all([
      teacherPage.waitForNavigation({ waitUntil: 'networkidle2' }),
      teacherPage.evaluate(() => document.querySelector('button').click()),
    ]);

    // Check if the login page loads correctly
    const teacherTitle = await teacherPage.$eval('h1', el => el.textContent);
    if (teacherTitle !== 'Docent Login') throw new Error(`Fout: Verwachtte 'Docent Login', maar vond '${teacherTitle}'`);
    
    // Check if Google button exists
    const hasGoogleButton = await teacherPage.evaluate(() => {
      return document.body.innerText.includes('Inloggen met Google') || document.querySelector('button') !== null;
    });
    if (!hasGoogleButton) throw new Error("Fout: Geen Google login knop gevonden op docenten portaal.");
    
    console.log('✅ Docenten Portaal inlogscherm is in orde.');


    // --- TEST 2: STUDENTEN PORTAAL ---
    console.log('⏳ Testen van Studenten Portaal (http://localhost:5174)...');
    const studentPage = await browser.newPage();
    monitorErrors(studentPage, 'Student Portaal');
    await studentPage.goto('http://localhost:5174', { waitUntil: 'networkidle2' });

    // Check if the student login page loads
    const studentTitle = await studentPage.$eval('h1', el => el.textContent);
    if (studentTitle !== 'Student Login') throw new Error(`Fout: Verwachtte 'Student Login', maar vond '${studentTitle}'`);

    // Check if the Exam Key input exists and works
    const inputSelector = 'input[placeholder="ABC123"]';
    await studentPage.waitForSelector(inputSelector);
    await studentPage.type(inputSelector, 'TESTCODE');
    
    const inputValue = await studentPage.$eval(inputSelector, el => el.value);
    if (inputValue !== 'TESTCODE') throw new Error("Fout: Kan geen examen sleutel typen in het studentenportaal.");
    
    console.log('✅ Studenten Portaal inlogscherm en input veld zijn in orde.');


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
