const sqlite3 = require('sqlite3').verbose();

class Conexao {
  constructor(databasePath = 'feedbacks.db') {
    this.databasePath = databasePath;
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.databasePath, (err) => {
        if (err) {
          console.error('Erro ao conectar com o banco:', err.message);
          reject(err);
        } else {
          console.log('Conectado ao banco SQLite');
          resolve();
        }
      });
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Erro na query:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Erro na execução:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Erro ao fechar conexão:', err.message);
            reject(err);
          } else {
            console.log('Conexão fechada');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = Conexao;
