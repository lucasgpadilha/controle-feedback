const fs = require('fs');
const path = require('path');
const Conexao = require('../../src/db/Conexao');

async function runMigration() {
  const conexao = new Conexao();
  
  try {
    await conexao.connect();
    
    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await conexao.run(schema);
    
    console.log('✅ Migration executada com sucesso: tabela feedbacks criada');
    
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    process.exit(1);
  } finally {
    await conexao.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
