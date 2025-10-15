const ejs = require('ejs');
const path = require('path');
const crypto = require('crypto');

class AuthController {
  // GET /login - Exibe formulário de login
  async showLogin(req, res) {
    try {
      const viewPath = path.join(__dirname, '..', 'views', 'login_view.ejs');
      const html = await ejs.renderFile(viewPath, {});
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      
    } catch (error) {
      console.error('Erro no login:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno do servidor');
    }
  }

  // POST /login - Processa login
  async login(req, res) {
    try {
      const { usuario, senha } = req.body;
      
      // Validação básica
      if (!usuario || !senha) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Erro de Login</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Erro de Login</h1>
            <p>Usuário e senha são obrigatórios. <a href="/login">Tentar novamente</a></p>
          </body>
          </html>
        `);
        return;
      }

      // Verifica credenciais (admin/123456)
      if (usuario === 'admin' && senha === '123456') {
        // Gera session ID único
        const sessionId = crypto.randomUUID();
        
        // Armazena sessão (será implementado no middleware)
        req.sessionStore.set(sessionId, {
          userId: 'admin',
          loginTime: Date.now(),
          isAuthenticated: true
        });

        // Define cookie de sessão
        res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=3600`);
        
        // Redireciona para feedbacks
        res.writeHead(302, { 
          'Location': '/feedbacks',
          'Content-Type': 'text/html; charset=utf-8'
        });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Login Realizado</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Login realizado com sucesso!</h1>
            <p>Redirecionando...</p>
            <script>setTimeout(() => window.location.href = '/feedbacks', 1000);</script>
          </body>
          </html>
        `);
      } else {
        // Credenciais inválidas
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Erro de Login</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Erro de Login</h1>
            <p>Usuário ou senha incorretos. <a href="/login">Tentar novamente</a></p>
          </body>
          </html>
        `);
      }
      
    } catch (error) {
      console.error('Erro no login:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno do servidor');
    }
  }

  // POST /logout - Processa logout
  async logout(req, res) {
    try {
      const sessionId = req.sessionId;
      
      if (sessionId && req.sessionStore) {
        // Remove sessão
        req.sessionStore.delete(sessionId);
      }

      // Limpa cookie de sessão
      res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Path=/; Max-Age=0');
      
      // Redireciona para login
      res.writeHead(302, { 
        'Location': '/login',
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Logout Realizado</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>Logout realizado com sucesso!</h1>
          <p>Redirecionando...</p>
          <script>setTimeout(() => window.location.href = '/login', 1000);</script>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Erro no logout:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno do servidor');
    }
  }
}

module.exports = AuthController;
