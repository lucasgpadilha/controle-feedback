const Conexao = require('../db/Conexao');

class Feedback extends Conexao {
  constructor(databasePath = 'feedbacks.db') {
    super(databasePath);
  }

  async all() {
    const sql = 'SELECT * FROM feedbacks ORDER BY created_at DESC';
    return await this.query(sql);
  }

  async findById(id) {
    const sql = 'SELECT * FROM feedbacks WHERE id = ?';
    const results = await this.query(sql, [id]);
    return results.length > 0 ? results[0] : null;
  }

  async create({ titulo, descricao, tipo }) {
    const sql = `
      INSERT INTO feedbacks (titulo, descricao, tipo, status) 
      VALUES (?, ?, ?, 'recebido')
    `;
    const result = await this.run(sql, [titulo, descricao, tipo]);
    return result;
  }

  async updateStatus(id, status) {
    const validStatuses = ['recebido', 'em análise', 'em desenvolvimento', 'finalizado'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Status inválido: ${status}`);
    }

    const sql = 'UPDATE feedbacks SET status = ? WHERE id = ?';
    const result = await this.run(sql, [status, id]);
    return result;
  }

  async delete(id) {
    const sql = 'DELETE FROM feedbacks WHERE id = ?';
    const result = await this.run(sql, [id]);
    return result;
  }
}

module.exports = Feedback;
