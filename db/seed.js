const Feedback = require('../src/models/Feedback');

async function seedDatabase() {
  const feedback = new Feedback();
  
  try {
    await feedback.connect();
    
    // Dados de exemplo conforme especificação
    const feedbacksData = [
      {
        titulo: "Erro ao salvar perfil",
        descricao: "Ao tentar salvar meu perfil o sistema retorna erro 500",
        tipo: "bug",
        status: "recebido"
      },
      {
        titulo: "Sugestão de relatório",
        descricao: "Adicionar filtro por data no relatório de vendas",
        tipo: "sugestão",
        status: "em análise"
      },
      {
        titulo: "Reclamação sobre atraso",
        descricao: "Aplicativo demora para carregar telas",
        tipo: "reclamação",
        status: "em desenvolvimento"
      },
      {
        titulo: "Feedback UI",
        descricao: "Texto dos botões poderia ser maior",
        tipo: "feedback",
        status: "recebido"
      },
      {
        titulo: "Bug no login",
        descricao: "Não consigo logar no firefox",
        tipo: "bug",
        status: "finalizado"
      }
    ];

    console.log('🌱 Iniciando seed do banco de dados...');
    
    // Insere cada feedback
    for (const feedbackData of feedbacksData) {
      const result = await feedback.create(feedbackData);
      console.log(`✅ Feedback criado: ID ${result.id} - ${feedbackData.titulo}`);
    }
    
    console.log(`\n🎉 Seed concluído! ${feedbacksData.length} feedbacks inseridos com sucesso.`);
    
  } catch (error) {
    console.error('❌ Erro no seed:', error.message);
    process.exit(1);
  } finally {
    await feedback.close();
  }
}

// Executa seed se chamado diretamente
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
