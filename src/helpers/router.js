const url = require('url');

class Router {
  constructor() {
    this.routes = new Map();
  }

  // Registra uma rota
  addRoute(method, path, handler, middlewares = []) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, {
      handler,
      middlewares,
      path,
      method: method.toUpperCase()
    });
  }

  // Processa uma requisição
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();
    
    // Procura por rota exata primeiro
    let routeKey = `${method}:${pathname}`;
    let route = this.routes.get(routeKey);
    
    // Se não encontrou, procura por rota com parâmetros
    if (!route) {
      for (const [key, routeData] of this.routes.entries()) {
        if (routeData.method === method && this.matchesPath(routeData.path, pathname)) {
          route = routeData;
          // Extrai parâmetros da URL
          req.params = this.extractParams(routeData.path, pathname);
          break;
        }
      }
    }

    if (!route) {
      this.send404(res);
      return;
    }

    // Executa middlewares em sequência
    try {
      for (const middleware of route.middlewares) {
        await this.executeMiddleware(middleware, req, res);
        // Se middleware enviou resposta, para a execução
        if (res.headersSent) {
          return;
        }
      }

      // Executa handler da rota
      await route.handler(req, res);
    } catch (error) {
      console.error('Erro na rota:', error);
      this.send500(res);
    }
  }

  // Verifica se um path pattern corresponde à URL
  matchesPath(pattern, pathname) {
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      // Se é um parâmetro (:id), aceita qualquer valor
      if (patternPart.startsWith(':')) {
        continue;
      }

      // Se não é parâmetro, deve ser exatamente igual
      if (patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }

  // Extrai parâmetros da URL
  extractParams(pattern, pathname) {
    const params = {};
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      if (patternPart.startsWith(':')) {
        const paramName = patternPart.substring(1);
        params[paramName] = pathParts[i];
      }
    }

    return params;
  }

  // Executa um middleware
  async executeMiddleware(middleware, req, res) {
    return new Promise((resolve, reject) => {
      const next = (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };

      try {
        const result = middleware(req, res, next);
        // Se middleware retorna Promise, aguarda
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(reject);
        } else if (result === undefined) {
          // Middleware não chamou next(), assume que enviou resposta
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Resposta 404
  send404(res) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Página não encontrada</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>404 - Página não encontrada</h1>
        <p><a href="/">Voltar ao início</a></p>
      </body>
      </html>
    `);
  }

  // Resposta 500
  send500(res) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erro interno</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>500 - Erro interno do servidor</h1>
        <p><a href="/">Voltar ao início</a></p>
      </body>
      </html>
    `);
  }
}

module.exports = Router;
