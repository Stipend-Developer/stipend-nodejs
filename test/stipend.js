const assert = require('chai').assert
  , sinon = require("sinon");

const stipend = require("../lib/stipend")();

describe('Stipend API', function () {
  describe('invalid()', () => {
    it('should log missing command to console with Error', () => {
      const logStub = sinon.stub(console, "log");

      const fakeCmd = 'cmd';
      stipend.invalid(fakeCmd);

      const errArg = logStub.firstCall.args[0];
      assert.instanceOf(errArg, Error);
      assert.equal(errArg.message, `No such command "${fakeCmd}"`);

      logStub.restore();
    });

    it('should call passed fn with Error', () => {
      const spy = sinon.spy();

      const fakeCmd = 'cmd';
      stipend.invalid(fakeCmd, spy);

      const errArg = spy.firstCall.args[0];
      assert.instanceOf(errArg, Error);
      assert.equal(errArg.message, `No such command "${fakeCmd}"`);
    });
  });

  describe('exec()', () => {
    it('should call invalid()', () => {
      const invalidStub = sinon.stub(stipend, "invalid");
      const fakeCmd = 'cmd';

      stipend.exec(fakeCmd);

      sinon.assert.calledWith(invalidStub, fakeCmd);

      invalidStub.restore();
    });

    it('should call send()', () => {
      const sendStub = sinon.stub(stipend, "send");
      const cmd = 'addMultiSigAddress';

      stipend.exec(cmd);

      sinon.assert.calledWith(sendStub, cmd);

      sendStub.restore();
    });
  });

  describe('auth()', () => {
    it('should set auth opts', () => {
      const user = 'user'
        , pass = 'pass';

      const exptectedAuthHeader = ('Basic ') + new Buffer(user + ':' + pass).toString('base64');

      stipend.auth(user, pass);

      assert.equal(exptectedAuthHeader, stipend.opts.headers['Authorization']);
      stipend.opts.headers['Authorization'] = '';
    });
    it('should not set auth opts when no user and pass passed', () => {
      stipend.auth();
      assert.equal('', stipend.opts.headers['Authorization']);
    });
  })
});
