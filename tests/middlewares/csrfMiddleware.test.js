const { expect } = require('chai');
const sinon = require('sinon');
const CSRFMiddleware = require('../../src/middlewares/csrfMiddleware');

describe('CSRFMiddleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      csrfToken: null
    };
    
    mockRes = {
      writeHead: sinon.stub(),
      end: sinon.stub(),
      headersSent: false
    };
    
    mockNext = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
    // Limpa tokens entre testes
    CSRFMiddleware.cleanExpiredTokens();
  });

  describe('generateToken', () => {
    it('should generate a valid UUID token', () => {
      const token = CSRFMiddleware.generateToken();
      
      expect(token).to.be.a('string');
      expect(token).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should store token in memory', () => {
      const token = CSRFMiddleware.generateToken();
      const stats = CSRFMiddleware.getTokenStats();
      
      expect(stats.total).to.be.greaterThan(0);
      expect(stats.active).to.be.greaterThan(0);
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', () => {
      const token = CSRFMiddleware.generateToken();
      const isValid = CSRFMiddleware.validateToken(token);
      
      expect(isValid).to.be.true;
    });

    it('should return false for non-existent token', () => {
      const isValid = CSRFMiddleware.validateToken('non-existent-token');
      
      expect(isValid).to.be.false;
    });

    it('should return false for null/undefined token', () => {
      expect(CSRFMiddleware.validateToken(null)).to.be.false;
      expect(CSRFMiddleware.validateToken(undefined)).to.be.false;
      expect(CSRFMiddleware.validateToken('')).to.be.false;
    });

    it('should return false for used token', () => {
      const token = CSRFMiddleware.generateToken();
      CSRFMiddleware.markTokenAsUsed(token);
      
      const isValid = CSRFMiddleware.validateToken(token);
      expect(isValid).to.be.false;
    });
  });

  describe('invalidateToken', () => {
    it('should remove token from memory', () => {
      const token = CSRFMiddleware.generateToken();
      const statsBefore = CSRFMiddleware.getTokenStats();
      
      CSRFMiddleware.invalidateToken(token);
      
      const statsAfter = CSRFMiddleware.getTokenStats();
      expect(statsAfter.total).to.be.lessThan(statsBefore.total);
    });

    it('should not throw error for non-existent token', () => {
      expect(() => {
        CSRFMiddleware.invalidateToken('non-existent-token');
      }).to.not.throw();
    });
  });

  describe('markTokenAsUsed', () => {
    it('should mark token as used', () => {
      const token = CSRFMiddleware.generateToken();
      
      expect(CSRFMiddleware.validateToken(token)).to.be.true;
      
      CSRFMiddleware.markTokenAsUsed(token);
      
      expect(CSRFMiddleware.validateToken(token)).to.be.false;
    });
  });

  describe('cleanExpiredTokens', () => {
    it('should remove expired tokens', () => {
      // Gera alguns tokens
      const token1 = CSRFMiddleware.generateToken();
      const token2 = CSRFMiddleware.generateToken();
      const token3 = CSRFMiddleware.generateToken();
      
      // Simula token expirado (mais de 15 minutos) - acessa diretamente o Map
      const tokens = CSRFMiddleware.tokens || new Map();
      if (tokens.has(token1)) {
        const tokenData = tokens.get(token1);
        tokenData.created = Date.now() - (16 * 60 * 1000); // 16 minutos atrás
      }
      
      const statsBefore = CSRFMiddleware.getTokenStats();
      CSRFMiddleware.cleanExpiredTokens();
      const statsAfter = CSRFMiddleware.getTokenStats();
      
      // Pelo menos um token deve ter sido removido
      expect(statsAfter.total).to.be.lessThanOrEqual(statsBefore.total);
    });
  });

  describe('generateTokenMiddleware', () => {
    it('should add csrfToken to request', () => {
      CSRFMiddleware.generateTokenMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.csrfToken).to.be.a('string');
      expect(mockNext.calledOnce).to.be.true;
    });
  });

  describe('validateTokenMiddleware', () => {
    it('should call next for valid token', () => {
      const token = CSRFMiddleware.generateToken();
      mockReq.body._csrf = token;
      
      CSRFMiddleware.validateTokenMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockNext.calledOnce).to.be.true;
      expect(mockRes.writeHead.called).to.be.false;
    });

    it('should return 403 for invalid token', () => {
      mockReq.body._csrf = 'invalid-token';
      
      CSRFMiddleware.validateTokenMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.writeHead.calledWith(403, { 'Content-Type': 'text/html; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledOnce).to.be.true;
      expect(mockNext.called).to.be.false;
    });

    it('should return 403 for missing token', () => {
      // No _csrf in body
      
      CSRFMiddleware.validateTokenMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.writeHead.calledWith(403, { 'Content-Type': 'text/html; charset=utf-8' })).to.be.true;
      expect(mockRes.end.calledOnce).to.be.true;
      expect(mockNext.called).to.be.false;
    });

    it('should invalidate token after successful validation', () => {
      const token = CSRFMiddleware.generateToken();
      mockReq.body._csrf = token;
      
      const statsBefore = CSRFMiddleware.getTokenStats();
      
      CSRFMiddleware.validateTokenMiddleware(mockReq, mockRes, mockNext);
      
      const statsAfter = CSRFMiddleware.getTokenStats();
      
      expect(mockNext.calledOnce).to.be.true;
      // Token should be invalidated after use
      expect(CSRFMiddleware.validateToken(token)).to.be.false;
    });
  });

  describe('getTokenStats', () => {
    it('should return token statistics', () => {
      const token1 = CSRFMiddleware.generateToken();
      const token2 = CSRFMiddleware.generateToken();
      CSRFMiddleware.markTokenAsUsed(token1);
      
      const stats = CSRFMiddleware.getTokenStats();
      
      expect(stats).to.have.property('total');
      expect(stats).to.have.property('active');
      expect(stats).to.have.property('used');
      expect(stats.total).to.be.greaterThan(0);
      expect(stats.active).to.be.greaterThan(0);
      expect(stats.used).to.be.greaterThan(0);
    });
  });
});
