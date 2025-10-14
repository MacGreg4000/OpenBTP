const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let browser = null;

// Initialiser le browser au démarrage
async function initBrowser() {
  try {
    console.log('🚀 Initialisation du browser Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    console.log('✅ Browser Puppeteer initialisé');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du browser:', error);
  }
}

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    browser: browser ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Route principale de génération PDF
app.post('/generate-pdf', async (req, res) => {
  if (!browser) {
    return res.status(500).json({ error: 'Browser non initialisé' });
  }

  const { html, options = {} } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML requis' });
  }

  let page = null;
  
  try {
    console.log('📄 Génération PDF demandée...');
    
    page = await browser.newPage();
    
    // Configuration de la page
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Options par défaut
    const pdfOptions = {
      format: options.format || 'A4',
      landscape: options.orientation === 'landscape' || false,
      printBackground: true,
      margin: options.margins || {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      displayHeaderFooter: options.displayHeaderFooter || false,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || '',
      preferCSSPageSize: true
    };

    const pdfBuffer = await page.pdf(pdfOptions);
    
    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`);
    
    // Retourner le PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': `attachment; filename="document.pdf"`
    });
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération PDF:', error);
    res.status(500).json({ error: 'Erreur lors de la génération PDF' });
  } finally {
    if (page) {
      await page.close();
    }
  }
});

// Cleanup au shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du service PDF...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt du service PDF...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

// Démarrer le serveur
app.listen(PORT, async () => {
  console.log(`🚀 Service PDF démarré sur le port ${PORT}`);
  await initBrowser();
});
