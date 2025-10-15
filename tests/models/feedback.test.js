const { expect } = require('chai');
const Feedback = require('../../src/models/Feedback');

describe('Feedback Model', () => {
  let feedback;
  let testDbPath = ':memory:';

  beforeEach(async () => {
    feedback = new Feedback(testDbPath);
    await feedback.connect();
    
    // Create table for each test
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('bug','sugestão','reclamação','feedback')),
        status TEXT NOT NULL CHECK(status IN ('recebido','em análise','em desenvolvimento','finalizado')) DEFAULT 'recebido',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await feedback.run(createTableSQL);
  });

  afterEach(async () => {
    await feedback.close();
  });

  describe('create', () => {
    it('should create a new feedback with default status', async () => {
      const feedbackData = {
        titulo: 'Teste de bug',
        descricao: 'Descrição do bug',
        tipo: 'bug'
      };

      const result = await feedback.create(feedbackData);
      
      expect(result).to.have.property('id');
      expect(result).to.have.property('changes', 1);
      
      const created = await feedback.findById(result.id);
      expect(created.titulo).to.equal('Teste de bug');
      expect(created.descricao).to.equal('Descrição do bug');
      expect(created.tipo).to.equal('bug');
      expect(created.status).to.equal('recebido');
    });
  });

  describe('findById', () => {
    it('should return feedback by id', async () => {
      const feedbackData = {
        titulo: 'Teste findById',
        descricao: 'Descrição',
        tipo: 'sugestão'
      };

      const created = await feedback.create(feedbackData);
      const found = await feedback.findById(created.id);
      
      expect(found).to.not.be.null;
      expect(found.titulo).to.equal('Teste findById');
    });

    it('should return null for non-existent id', async () => {
      const found = await feedback.findById(999);
      expect(found).to.be.null;
    });
  });

  describe('all', () => {
    it('should return all feedbacks ordered by created_at DESC', async () => {
      // Insert with explicit timestamps
      await feedback.run(`
        INSERT INTO feedbacks (titulo, descricao, tipo, status, created_at) 
        VALUES ('Primeiro', 'Desc 1', 'bug', 'recebido', '2023-01-01 10:00:00')
      `);

      await feedback.run(`
        INSERT INTO feedbacks (titulo, descricao, tipo, status, created_at) 
        VALUES ('Segundo', 'Desc 2', 'sugestão', 'recebido', '2023-01-01 11:00:00')
      `);

      const all = await feedback.all();
      
      expect(all).to.have.length(2);
      expect(all[0].titulo).to.equal('Segundo'); // Most recent first
      expect(all[1].titulo).to.equal('Primeiro');
    });

    it('should return empty array when no feedbacks', async () => {
      const all = await feedback.all();
      expect(all).to.be.an('array').that.is.empty;
    });
  });

  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      const created = await feedback.create({
        titulo: 'Teste status',
        descricao: 'Desc',
        tipo: 'bug'
      });

      const result = await feedback.updateStatus(created.id, 'em análise');
      expect(result.changes).to.equal(1);

      const updated = await feedback.findById(created.id);
      expect(updated.status).to.equal('em análise');
    });

    it('should throw error for invalid status', async () => {
      const created = await feedback.create({
        titulo: 'Teste',
        descricao: 'Desc',
        tipo: 'bug'
      });

      try {
        await feedback.updateStatus(created.id, 'status_invalido');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Status inválido');
      }
    });
  });

  describe('delete', () => {
    it('should delete feedback successfully', async () => {
      const created = await feedback.create({
        titulo: 'Para deletar',
        descricao: 'Desc',
        tipo: 'bug'
      });

      const result = await feedback.delete(created.id);
      expect(result.changes).to.equal(1);

      const found = await feedback.findById(created.id);
      expect(found).to.be.null;
    });
  });
});
