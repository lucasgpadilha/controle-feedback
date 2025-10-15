const crypto = require('crypto');

// Map para armazenar tokens em memória
const tokens = new Map();

class CSRFMiddleware {
  // Gera um token UUID único
  static generateToken() {
    const token = crypto.randomUUID();
    tokens.set(token, { 
      created: Date.now(),
      used: false 
    });
    return token;
  }

  // Armazena um token (já implementado no generateToken)
  static storeToken(token) {
    tokens.set(token, { 
      created: Date.now(),
      used: false 
    });
  }

  // Valida se o token existe e não foi usado
  static validateToken(token) {
    if (!token || !tokens.has(token)) {
      return false;
    }

    const tokenData = tokens.get(token);
    const age = Date.now() - tokenData.created;
    
    // Token expira em 15 minutos
    if (age > 15 * 60 * 1000) {
      tokens.delete(token);
      return false;
    }

    // Token já foi usado
    if (tokenData.used) {
      return false;
    }

    return true;
  }

  // Invalida um token após uso
  static invalidateToken(token) {
    if (tokens.has(token)) {
      tokens.delete(token);
    }
  }

  // Marca token como usado (antes de invalidar)
  static markTokenAsUsed(token) {
    if (tokens.has(token)) {
      const tokenData = tokens.get(token);
      tokenData.used = true;
    }
  }

  // Limpa tokens expirados
  static cleanExpiredTokens() {
    const now = Date.now();
    const expiredTokens = [];

    for (const [token, data] of tokens.entries()) {
      const age = now - data.created;
      if (age > 15 * 60 * 1000) { // 15 minutos
        expiredTokens.push(token);
      }
    }

    expiredTokens.forEach(token => tokens.delete(token));
    
    if (expiredTokens.length > 0) {
      console.log(`Limpeza CSRF: removidos ${expiredTokens.length} tokens expirados`);
    }
  }

  // Middleware para gerar token em rotas GET
  static generateTokenMiddleware(req, res, next) {
    req.csrfToken = CSRFMiddleware.generateToken();
    next();
  }

  // Middleware para validar token em rotas POST
  static validateTokenMiddleware(req, res, next) {
    const token = req.body._csrf;
    
    if (!CSRFMiddleware.validateToken(token)) {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Erro 403 - Token CSRF Inválido</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>Erro 403 - Token CSRF Inválido</h1>
          <p>O token de segurança é inválido ou expirou. <a href="/">Voltar ao formulário</a></p>
        </body>
        </html>
      `);
      return;
    }

    // Marca token como usado e invalida
    CSRFMiddleware.markTokenAsUsed(token);
    CSRFMiddleware.invalidateToken(token);
    
    next();
  }

  // Retorna estatísticas dos tokens (para debug)
  static getTokenStats() {
    return {
      total: tokens.size,
      active: Array.from(tokens.values()).filter(t => !t.used).length,
      used: Array.from(tokens.values()).filter(t => t.used).length
    };
  }
}

// Expor tokens para testes
CSRFMiddleware.tokens = tokens;

module.exports = CSRFMiddleware;
