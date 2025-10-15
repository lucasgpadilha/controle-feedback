const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const router = require('./rotas');
const CSRFMiddleware = require('./src/middlewares/csrfMiddleware');
const AuthMiddleware = require('./src/middlewares/authMiddleware');

// Instancia middleware de autenticação
const authMiddleware = new AuthMiddleware();

// Configuração do servidor
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  try {
    // Parse da URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Servir arquivos estáticos
    if (pathname.startsWith('/style.css') || pathname.startsWith('/favicon.ico')) {
      await serveStaticFile(req, res, pathname);
      return;
    }

    // Parse do body para requisições POST e PUT
    if (req.method === 'POST' || req.method === 'PUT') {
      await parseRequestBody(req, res);
    }

    // Adiciona sessionStore ao request para uso nos controllers
    req.sessionStore = authMiddleware.sessionStore;

    // Processa rota
    await router.handleRequest(req, res);

  } catch (error) {
    console.error('Erro no servidor:', error);
    
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Erro Interno</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>500 - Erro interno do servidor</h1>
          <p>Ocorreu um erro inesperado. <a href="/">Voltar ao início</a></p>
        </body>
        </html>
      `);
    }
  }
});

// Função para servir arquivos estáticos
async function serveStaticFile(req, res, pathname) {
  try {
    let filePath;
    
    if (pathname === '/style.css') {
      filePath = path.join(__dirname, 'public', 'style.css');
    } else if (pathname === '/favicon.ico') {
      // Retorna 404 para favicon (não temos um)
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // Verifica se arquivo existe
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    // Lê e serve o arquivo
    const fileContent = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    
    let contentType = 'text/plain';
    if (ext === '.css') {
      contentType = 'text/css';
    }

    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
    });
    res.end(fileContent);

  } catch (error) {
    console.error('Erro ao servir arquivo estático:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// Função para parse do body das requisições POST e PUT
async function parseRequestBody(req, res) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    
    // Suportar POST e PUT
    if (req.method === 'POST' || req.method === 'PUT') {
      if (contentType.includes('application/x-www-form-urlencoded')) {
        // Parse URL-encoded data
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          req.body = {};
          if (body) {
            const params = new URLSearchParams(body);
            for (const [key, value] of params.entries()) {
              req.body[key] = value;
            }
          }
          resolve();
        });
        req.on('error', reject);
      } else if (contentType.includes('application/json')) {
        // Parse JSON data
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          if (body) {
            try {
              req.body = JSON.parse(body);
            } catch (error) {
              console.error('Erro ao parsear JSON:', error);
              reject(error);
              return;
            }
          } else {
            req.body = {};
          }
          resolve();
        });
        req.on('error', reject);
      } else {
        // Parse multipart/form-data with formidable
        const form = formidable({
          maxFileSize: 5 * 1024 * 1024, // 5MB max
          keepExtensions: true
        });

        form.parse(req, (err, fields, files) => {
          if (err) {
            console.error('Erro ao parsear body:', err);
            reject(err);
            return;
          }

          // Converte fields para req.body
          req.body = {};
          for (const [key, value] of Object.entries(fields)) {
            // formidable retorna arrays, pega o primeiro valor
            req.body[key] = Array.isArray(value) ? value[0] : value;
          }

          resolve();
        });
      }
    } else {
      resolve();
    }
  });
}

let csrfCleanupInterval;
let sessionCleanupInterval;

// Inicia limpeza periódica de tokens CSRF expirados (a cada 5 minutos)
csrfCleanupInterval = setInterval(() => {
  CSRFMiddleware.cleanExpiredTokens();
}, 5 * 60 * 1000);

// Inicia limpeza periódica de sessões expiradas (a cada 10 minutos)
sessionCleanupInterval = setInterval(() => {
  authMiddleware.cleanExpiredSessions();
}, 10 * 60 * 1000);


// Inicia o servidor
server.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`📝 Formulário público: http://${HOST}:${PORT}/`);
  console.log(`🔐 Login admin: http://${HOST}:${PORT}/login`);
  console.log(`📊 Feedbacks: http://${HOST}:${PORT}/feedbacks`);
  console.log(`\n🔒 Credenciais:`);
  console.log(`   Usuário: admin`);
  console.log(`   Senha: 123456`);
  console.log(`\n🛡️  Proteção CSRF ativa para formulário público`);
  console.log(`⏰ Limpeza automática de tokens e sessões ativa`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});

function gracefulShutdown(signal) {
  console.log(`\n🛑 Recebido ${signal}, encerrando servidor...`);
  
  // Limpar intervals
  if (csrfCleanupInterval) clearInterval(csrfCleanupInterval);
  if (sessionCleanupInterval) clearInterval(sessionCleanupInterval);
  
  // Fechar servidor com timeout
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
  
  // Forçar encerramento após 5 segundos
  setTimeout(() => {
    console.log('⚠️ Forçando encerramento...');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
