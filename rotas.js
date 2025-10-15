const Router = require('./src/helpers/router');
const FeedbackController = require('./src/controllers/FeedbackController');
const AuthController = require('./src/controllers/AuthController');
const CSRFMiddleware = require('./src/middlewares/csrfMiddleware');
const AuthMiddleware = require('./src/middlewares/authMiddleware');

// Instancia controllers e middlewares
const feedbackController = new FeedbackController();
const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

// Cria router
const router = new Router();

// ===== ROTAS PÚBLICAS =====

// GET / - Formulário público (gera token CSRF)
router.addRoute('GET', '/', feedbackController.form.bind(feedbackController), [
  CSRFMiddleware.generateTokenMiddleware
]);

// GET /login - Formulário de login
router.addRoute('GET', '/login', authController.showLogin.bind(authController), [
  authMiddleware.publicRoute.bind(authMiddleware)
]);

// POST /login - Processa login
router.addRoute('POST', '/login', authController.login.bind(authController), [
  authMiddleware.publicRoute.bind(authMiddleware)
]);

// ===== ROTAS SEMI-PÚBLICAS (CSRF) =====

// POST /feedback/cadastrar - Cria feedback (requer token CSRF válido)
router.addRoute('POST', '/feedback/cadastrar', feedbackController.store.bind(feedbackController), [
  CSRFMiddleware.validateTokenMiddleware
]);

// ===== ROTAS PROTEGIDAS (AUTH) =====

// POST /logout - Logout
router.addRoute('POST', '/logout', authController.logout.bind(authController), [
  authMiddleware.requireAuth.bind(authMiddleware)
]);

// GET /feedbacks - Lista todos os feedbacks
router.addRoute('GET', '/feedbacks', feedbackController.index.bind(feedbackController), [
  authMiddleware.requireAuth.bind(authMiddleware)
]);

// GET /feedbacks/:id - Mostra feedback específico
router.addRoute('GET', '/feedbacks/:id', feedbackController.show.bind(feedbackController), [
  authMiddleware.requireAuth.bind(authMiddleware)
]);

// PUT /feedback/atualizar - Atualiza status
router.addRoute('PUT', '/feedback/atualizar', feedbackController.update.bind(feedbackController), [
  authMiddleware.requireAuth.bind(authMiddleware)
]);

module.exports = router;
