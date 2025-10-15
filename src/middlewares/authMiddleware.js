class AuthMiddleware {
  constructor() {
    // Map para armazenar sessões em memória
    this.sessionStore = new Map();
  }

  // Middleware para verificar autenticação
  requireAuth(req, res, next) {
    // Adiciona sessionStore ao request para uso nos controllers
    req.sessionStore = this.sessionStore;
    
    // Extrai sessionId do cookie
    const cookies = this.parseCookies(req.headers.cookie || '');
    const sessionId = cookies.sessionId;
    
    if (!sessionId) {
      this.redirectToLogin(res);
      return;
    }

    // Verifica se sessão existe e é válida
    const session = this.sessionStore.get(sessionId);
    if (!session || !session.isAuthenticated) {
      this.redirectToLogin(res);
      return;
    }

    // Verifica se sessão não expirou (1 hora)
    const sessionAge = Date.now() - session.loginTime;
    if (sessionAge > 60 * 60 * 1000) { // 1 hora
      this.sessionStore.delete(sessionId);
      this.redirectToLogin(res);
      return;
    }

    // Adiciona informações da sessão ao request
    req.sessionId = sessionId;
    req.user = session;
    
    next();
  }

  // Middleware para rotas que não precisam de autenticação
  publicRoute(req, res, next) {
    // Adiciona sessionStore ao request para uso nos controllers
    req.sessionStore = this.sessionStore;
    next();
  }

  // Redireciona para página de login
  redirectToLogin(res) {
    res.writeHead(302, { 
      'Location': '/login',
      'Content-Type': 'text/html; charset=utf-8'
    });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Necessário</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>Login Necessário</h1>
        <p>Você precisa fazer login para acessar esta página.</p>
        <p><a href="/login">Fazer Login</a></p>
      </body>
      </html>
    `);
  }

  // Parse cookies do header
  parseCookies(cookieHeader) {
    const cookies = {};
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length === 2) {
          cookies[parts[0]] = parts[1];
        }
      });
    }
    return cookies;
  }

  // Limpa sessões expiradas
  cleanExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessionStore.entries()) {
      const sessionAge = now - session.loginTime;
      if (sessionAge > 60 * 60 * 1000) { // 1 hora
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => this.sessionStore.delete(sessionId));
    
    if (expiredSessions.length > 0) {
      console.log(`Limpeza de sessões: removidas ${expiredSessions.length} sessões expiradas`);
    }
  }

  // Retorna estatísticas das sessões (para debug)
  getSessionStats() {
    return {
      total: this.sessionStore.size,
      active: Array.from(this.sessionStore.values()).filter(s => s.isAuthenticated).length
    };
  }
}

module.exports = AuthMiddleware;
