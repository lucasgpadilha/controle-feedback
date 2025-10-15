const Feedback = require('../models/Feedback');
const ejs = require('ejs');
const path = require('path');

class FeedbackController {
  constructor() {
    this.feedback = new Feedback();
  }

  // GET / - Exibe formulário público com token CSRF
  async form(req, res) {
    try {
      await this.feedback.connect();
      
      // Token CSRF já foi gerado pelo middleware
      const csrfToken = req.csrfToken;
      
      const viewPath = path.join(__dirname, '..', 'views', 'formulario_view.ejs');
      const html = await ejs.renderFile(viewPath, { csrfToken });
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      
    } catch (error) {
      console.error('Erro no formulário:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno do servidor');
    } finally {
      await this.feedback.close();
    }
  }

  // GET /feedbacks - Lista todos os feedbacks (PROTEGIDA)
  async index(req, res) {
    try {
      await this.feedback.connect();
      const feedbacks = await this.feedback.all();
      
      const viewPath = path.join(__dirname, '..', 'views', 'feedbacks_view.ejs');
      const html = await ejs.renderFile(viewPath, { feedbacks });
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      
    } catch (error) {
      console.error('Erro ao listar feedbacks:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno do servidor');
    } finally {
      await this.feedback.close();
    }
  }

  // GET /feedbacks/:id - Mostra um feedback específico (PROTEGIDA)
  async show(req, res) {
    try {
      const id = req.params.id;
      
      if (!id || isNaN(id)) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ID inválido');
        return;
      }

      await this.feedback.connect();
      const feedback = await this.feedback.findById(id);
      
      if (!feedback) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Feedback não encontrado</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Feedback não encontrado</h1>
            <p><a href="/feedbacks">Voltar à lista</a></p>
          </body>
          </html>
        `);
        return;
      }

      const viewPath = path.join(__dirname, '..', 'views', 'feedbacks_show_view.ejs');
      const html = await ejs.renderFile(viewPath, { feedback });
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      
    } catch (error) {
      console.error('Erro ao mostrar feedback:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno do servidor');
    } finally {
      await this.feedback.close();
    }
  }

  // POST /feedback/cadastrar - Cria novo feedback (SEMI-PÚBLICA - requer CSRF)
  async store(req, res) {
    try {
      const { titulo, descricao, tipo } = req.body;
      
      // Validação básica
      if (!titulo || !descricao || !tipo) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Erro de Validação</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Erro de Validação</h1>
            <p>Todos os campos são obrigatórios. <a href="/">Voltar ao formulário</a></p>
          </body>
          </html>
        `);
        return;
      }

      // Validação do tipo
      const tiposValidos = ['bug', 'sugestão', 'reclamação', 'feedback'];
      if (!tiposValidos.includes(tipo)) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Erro de Validação</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Erro de Validação</h1>
            <p>Tipo inválido. <a href="/">Voltar ao formulário</a></p>
          </body>
          </html>
        `);
        return;
      }

      await this.feedback.connect();
      const result = await this.feedback.create({ titulo, descricao, tipo });
      
      // Redireciona para página de sucesso
      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end();
      
    } catch (error) {
      console.error('Erro ao criar feedback:', error);
      res.writeHead(302, { 
        'Location': '/?error=1',
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end();
    } finally {
      await this.feedback.close();
    }
  }

  // PUT /feedback/atualizar - Atualiza status (PROTEGIDA)
  async update(req, res) {
    try {
      // Verificar se req.body existe
      if (!req.body) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Dados não recebidos');
        return;
      }

      const { id, status } = req.body;
      
      if (!id || !status) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ID e status são obrigatórios');
        return;
      }

      await this.feedback.connect();
      const result = await this.feedback.updateStatus(id, status);
      
      if (result.changes === 0) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Feedback não encontrado');
        return;
      }

      // Redireciona de volta para o feedback
      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end();
      
      // Fechar conexão após resposta
      await this.feedback.close();
      
    } catch (error) {
      console.error('Erro ao atualizar feedback:', error);
      
      // Fechar conexão em caso de erro
      try {
        await this.feedback.close();
      } catch (closeError) {
        console.error('Erro ao fechar conexão:', closeError);
      }
      
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno do servidor');
    }
  }
}

module.exports = FeedbackController;
