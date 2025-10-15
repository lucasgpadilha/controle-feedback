const { expect } = require('chai');
const sinon = require('sinon');
const FeedbackController = require('../../src/controllers/FeedbackController');

describe('FeedbackController', () => {
  let controller;
  let mockReq, mockRes;

  beforeEach(() => {
    controller = new FeedbackController();
    
    // Mock request
    mockReq = {
      params: {},
      body: {},
      csrfToken: 'test-csrf-token'
    };

    // Mock response
    mockRes = {
      writeHead: sinon.stub(),
      end: sinon.stub(),
      headersSent: false
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('form', () => {
    it('should render form with CSRF token', async () => {
      // Mock EJS renderFile
      const ejsStub = sinon.stub(require('ejs'), 'renderFile');
      ejsStub.resolves('<html>Form with CSRF token</html>');

      // Mock database connection
      const connectStub = sinon.stub(controller.feedback, 'connect');
      const closeStub = sinon.stub(controller.feedback, 'close');

      await controller.form(mockReq, mockRes);

      expect(connectStub.calledOnce).to.be.true;
      expect(closeStub.calledOnce).to.be.true;
      expect(ejsStub.calledOnce).to.be.true;
      expect(ejsStub.firstCall.args[1]).to.deep.equal({ csrfToken: 'test-csrf-token' });
      expect(mockRes.writeHead.calledWith(200, { 'Content-Type': 'text/html; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledWith('<html>Form with CSRF token</html>')).to.be.true;
    });
  });

  describe('index', () => {
    it('should render feedbacks list', async () => {
      const mockFeedbacks = [
        { id: 1, titulo: 'Test 1', tipo: 'bug', status: 'recebido' },
        { id: 2, titulo: 'Test 2', tipo: 'sugestão', status: 'em análise' }
      ];

      // Mock database operations
      const connectStub = sinon.stub(controller.feedback, 'connect');
      const allStub = sinon.stub(controller.feedback, 'all').resolves(mockFeedbacks);
      const closeStub = sinon.stub(controller.feedback, 'close');

      // Mock EJS renderFile
      const ejsStub = sinon.stub(require('ejs'), 'renderFile');
      ejsStub.resolves('<html>Feedbacks list</html>');

      await controller.index(mockReq, mockRes);

      expect(connectStub.calledOnce).to.be.true;
      expect(allStub.calledOnce).to.be.true;
      expect(closeStub.calledOnce).to.be.true;
      expect(ejsStub.calledOnce).to.be.true;
      expect(ejsStub.firstCall.args[1]).to.deep.equal({ feedbacks: mockFeedbacks });
      expect(mockRes.writeHead.calledWith(200, { 'Content-Type': 'text/html; charset=utf-8' })).to.be.true;
    });
  });

  describe('show', () => {
    it('should render feedback details for valid ID', async () => {
      const mockFeedback = { id: 1, titulo: 'Test', descricao: 'Description', tipo: 'bug', status: 'recebido' };
      
      mockReq.params.id = '1';

      // Mock database operations
      const connectStub = sinon.stub(controller.feedback, 'connect');
      const findByIdStub = sinon.stub(controller.feedback, 'findById').resolves(mockFeedback);
      const closeStub = sinon.stub(controller.feedback, 'close');

      // Mock EJS renderFile
      const ejsStub = sinon.stub(require('ejs'), 'renderFile');
      ejsStub.resolves('<html>Feedback details</html>');

      await controller.show(mockReq, mockRes);

      expect(findByIdStub.calledWith('1')).to.be.true;
      expect(ejsStub.firstCall.args[1]).to.deep.equal({ feedback: mockFeedback });
      expect(mockRes.writeHead.calledWith(200, { 'Content-Type': 'text/html; charset=utf-8' })).to.be.true;
    });

    it('should return 404 for non-existent feedback', async () => {
      mockReq.params.id = '999';

      // Mock database operations
      const connectStub = sinon.stub(controller.feedback, 'connect');
      const findByIdStub = sinon.stub(controller.feedback, 'findById').resolves(null);
      const closeStub = sinon.stub(controller.feedback, 'close');

      await controller.show(mockReq, mockRes);

      expect(findByIdStub.calledWith('999')).to.be.true;
      expect(mockRes.writeHead.calledWith(404, { 'Content-Type': 'text/html; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledOnce).to.be.true;
    });

    it('should return 400 for invalid ID', async () => {
      mockReq.params.id = 'invalid';

      await controller.show(mockReq, mockRes);

      expect(mockRes.writeHead.calledWith(400, { 'Content-Type': 'text/plain; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledWith('ID inválido')).to.be.true;
    });
  });

  describe('store', () => {
    it('should create feedback with valid data', async () => {
      mockReq.body = {
        titulo: 'Test Bug',
        descricao: 'Test description',
        tipo: 'bug'
      };

      const mockResult = { id: 1, changes: 1 };

      // Mock database operations
      const connectStub = sinon.stub(controller.feedback, 'connect');
      const createStub = sinon.stub(controller.feedback, 'create').resolves(mockResult);
      const closeStub = sinon.stub(controller.feedback, 'close');

      await controller.store(mockReq, mockRes);

      expect(createStub.calledWith({
        titulo: 'Test Bug',
        descricao: 'Test description',
        tipo: 'bug'
      })).to.be.true;
      expect(mockRes.writeHead.calledWith(200, { 
        'Content-Type': 'text/html; charset=utf-8'
      })).to.be.true;
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = {
        titulo: 'Test',
        // Missing descricao and tipo
      };

      await controller.store(mockReq, mockRes);

      expect(mockRes.writeHead.calledWith(400, { 'Content-Type': 'text/html; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledOnce).to.be.true;
    });

    it('should return 400 for invalid tipo', async () => {
      mockReq.body = {
        titulo: 'Test',
        descricao: 'Description',
        tipo: 'invalid_type'
      };

      await controller.store(mockReq, mockRes);

      expect(mockRes.writeHead.calledWith(400, { 'Content-Type': 'text/html; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledOnce).to.be.true;
    });
  });

  describe('update', () => {
    it('should update feedback status', async () => {
      mockReq.body = {
        id: '1',
        status: 'em análise'
      };

      const mockResult = { changes: 1 };

      // Mock database operations
      const connectStub = sinon.stub(controller.feedback, 'connect');
      const updateStatusStub = sinon.stub(controller.feedback, 'updateStatus').resolves(mockResult);
      const closeStub = sinon.stub(controller.feedback, 'close');

      await controller.update(mockReq, mockRes);

      expect(updateStatusStub.calledWith('1', 'em análise')).to.be.true;
      expect(mockRes.writeHead.calledWith(200, { 
        'Content-Type': 'text/html; charset=utf-8'
      })).to.be.true;
    });

    it('should return 400 for missing fields', async () => {
      mockReq.body = {
        id: '1'
        // Missing status
      };

      await controller.update(mockReq, mockRes);

      expect(mockRes.writeHead.calledWith(400, { 'Content-Type': 'text/plain; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledWith('ID e status são obrigatórios')).to.be.true;
    });

    it('should return 404 for non-existent feedback', async () => {
      mockReq.body = {
        id: '999',
        status: 'em análise'
      };

      const mockResult = { changes: 0 };

      // Mock database operations
      const connectStub = sinon.stub(controller.feedback, 'connect');
      const updateStatusStub = sinon.stub(controller.feedback, 'updateStatus').resolves(mockResult);
      const closeStub = sinon.stub(controller.feedback, 'close');

      await controller.update(mockReq, mockRes);

      expect(mockRes.writeHead.calledWith(404, { 'Content-Type': 'text/plain; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledWith('Feedback não encontrado')).to.be.true;
    });
  });
});
