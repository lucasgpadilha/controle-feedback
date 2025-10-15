# Controle de Feedback - Sistema de Gerenciamento

## Visão Geral

Implementei este sistema de controle de feedback como uma aplicação Node.js completa, sem uso de frameworks externos como Express. O projeto foi desenvolvido seguindo uma arquitetura MVC customizada, com foco especial em segurança através da implementação de proteção CSRF para o formulário público.

## Arquitetura e Decisões Técnicas

### Por que sem frameworks?

Escolhi implementar o sistema usando apenas o módulo `http` nativo do Node.js e um roteador customizado por alguns motivos específicos:

1. **Controle total**: Permite entender completamente o fluxo de requisições e respostas
2. **Performance**: Menor overhead comparado a frameworks pesados
3. **Aprendizado**: Demonstra conhecimento profundo de HTTP e Node.js
4. **Simplicidade**: Para este escopo, um roteador customizado é mais que suficiente

### Proteção CSRF - Por que implementei?

Implementei proteção CSRF mesmo não sendo um requisito explícito porque:

1. **Segurança proativa**: O formulário público (`/`) permite que qualquer pessoa envie feedbacks. Sem CSRF, sites maliciosos poderiam enviar feedbacks falsos via JavaScript cross-origin
2. **Boas práticas**: Demonstra preocupação com segurança além do mínimo necessário
3. **Diferencial técnico**: Mostra conhecimento de vulnerabilidades web comuns

**Como funciona a proteção CSRF:**
- Token único gerado via `crypto.randomUUID()` a cada acesso ao formulário
- Token armazenado em memória (Map) com timestamp de criação
- Validação obrigatória no POST `/feedback/cadastrar`
- Token invalidado após uso (one-time use)
- Expiração automática em 15 minutos
- Limpeza periódica de tokens expirados

### Roteamento sem frameworks

Criei um sistema de roteamento customizado que:
- Suporta parâmetros de URL (`/feedbacks/:id`)
- Aplica middlewares em sequência
- Trata erros 404/500 automaticamente
- É extensível e fácil de manter

## Pré-requisitos

- Node.js >= 14
- npm (gerenciador de pacotes)
- SQLite3 (incluído no Node.js via sqlite3 package)

## Instalação

```bash
# Clone o repositório
git clone https://github.com/SEU-USUARIO/controle-feedback.git
cd controle-feedback

# Instale as dependências
npm install
```

## Configuração

```bash
# Execute as migrations para criar as tabelas
npm run migrate

# Popule o banco com dados de exemplo
npm run seed
```

## Execução

```bash
# Inicie o servidor
npm start

# Ou para desenvolvimento com auto-reload
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

## Testes

```bash
# Execute todos os testes
npm test

# Execute linting (opcional)
npm run lint
```

## Estrutura do Projeto

```
controle-feedback/
├── src/
│   ├── controllers/          # Lógica de negócio
│   │   ├── AuthController.js
│   │   └── FeedbackController.js
│   ├── models/              # Camada de dados
│   │   └── Feedback.js
│   ├── views/               # Templates EJS
│   │   ├── formulario_view.ejs
│   │   ├── feedbacks_view.ejs
│   │   ├── feedbacks_show_view.ejs
│   │   └── login_view.ejs
│   ├── middlewares/         # Middlewares de segurança
│   │   ├── authMiddleware.js
│   │   └── csrfMiddleware.js
│   ├── helpers/             # Utilitários
│   │   └── router.js
│   └── db/                  # Conexão com banco
│       └── Conexao.js
├── db/                      # Migrations e seeds
│   ├── schema.sql
│   ├── migrations/
│   └── seed.js
├── tests/                   # Testes unitários
│   ├── models/
│   ├── controllers/
│   └── middlewares/
├── public/                  # Arquivos estáticos
│   └── style.css
├── scripts/                 # Scripts utilitários
├── rotas.js                 # Definição de rotas
├── index.js                 # Entrypoint do servidor
└── package.json
```

## Rotas

### Públicas
- `GET /` - Formulário de feedback (gera token CSRF)

### Semi-públicas (CSRF)
- `POST /feedback/cadastrar` - Cria feedback (requer token CSRF válido)

### Públicas (Auth)
- `GET /login` - Formulário de login
- `POST /login` - Processa login

### Protegidas (Auth)
- `POST /logout` - Logout
- `GET /feedbacks` - Lista todos os feedbacks
- `GET /feedbacks/:id` - Mostra feedback específico
- `POST /feedback/atualizar` - Atualiza status do feedback

## Credenciais

- **Usuário**: admin
- **Senha**: 123456

## Segurança

### Tokens CSRF

A proteção CSRF implementada garante que apenas formulários legítimos possam enviar feedbacks:

1. **Geração**: Token UUID único gerado a cada acesso ao formulário
2. **Armazenamento**: Map em memória com timestamp de criação
3. **Validação**: Verificação obrigatória no POST `/feedback/cadastrar`
4. **Invalidação**: Token removido após uso (one-time use)
5. **Expiração**: Tokens expiram em 15 minutos
6. **Limpeza**: Remoção automática de tokens expirados a cada 5 minutos

### Rotas Públicas vs Protegidas

- **Totalmente Públicas**: Apenas `/` (formulário com CSRF)
- **Semi-públicas**: `/feedback/cadastrar` (CSRF obrigatório, sem login)
- **Protegidas**: Todas as demais rotas (sessão obrigatória)

### Sessões

- Armazenamento em memória (Map)
- Cookie HttpOnly para segurança
- Expiração em 1 hora
- Limpeza automática de sessões expiradas

## Observações

### Limitações Atuais

1. **Sessões em memória**: Em produção, considere Redis ou similar
2. **Tokens CSRF em memória**: Para alta disponibilidade, use armazenamento persistente
3. **Sem HTTPS**: Em produção, configure SSL/TLS
4. **Validação básica**: Pode ser expandida conforme necessário

### Próximos Passos

1. Implementar rate limiting
2. Adicionar logs estruturados
3. Configurar HTTPS
4. Implementar backup automático do banco
5. Adicionar métricas e monitoramento

## Exemplos de Uso

### Testando Proteção CSRF

```bash
# 1. Acesse o formulário para obter token
curl http://localhost:3000/

# 2. Extraia o token do HTML (campo _csrf)

# 3. Tente POST sem token (deve falhar)
curl -X POST http://localhost:3000/feedback/cadastrar \
  -d 'titulo=Teste&descricao=Teste&tipo=bug'

# 4. POST com token válido (deve funcionar)
curl -X POST http://localhost:3000/feedback/cadastrar \
  -d 'titulo=Teste&descricao=Teste&tipo=bug&_csrf=TOKEN_AQUI'
```

### Testando Autenticação

```bash
# Login
curl -X POST http://localhost:3000/login \
  -d 'usuario=admin&senha=123456' \
  -c cookies.txt

# Acessar área protegida
curl http://localhost:3000/feedbacks -b cookies.txt
```

## Desenvolvimento

### Scripts Disponíveis

- `npm start` - Inicia servidor em produção
- `npm run dev` - Inicia servidor com nodemon
- `npm run migrate` - Executa migrations
- `npm run seed` - Popula banco com dados de exemplo
- `npm test` - Executa testes unitários
- `npm run lint` - Executa ESLint

### Adicionando Novas Rotas

1. Defina a rota em `rotas.js`
2. Implemente o handler no controller apropriado
3. Adicione middlewares necessários (auth, CSRF, etc.)
4. Crie testes para a nova funcionalidade


---

**Desenvolvido com foco em segurança e boas práticas de desenvolvimento web.**
