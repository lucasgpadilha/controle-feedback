CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('bug','sugestão','reclamação','feedback')),
  status TEXT NOT NULL CHECK(status IN ('recebido','em análise','em desenvolvimento','finalizado')) DEFAULT 'recebido',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
