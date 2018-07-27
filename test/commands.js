const assert = require('chai').assert;
const commands = require("../lib/commands");

describe('test isCommand', function () {
  it('isCommand() should return True when command is valid', function () {
    const command = 'createRawTransaction';
    assert.isTrue(commands.isCommand(command));
  });
  it('isCommand() should return False when command is valid', function () {
    const command = 'createRawTransactionFalsy';
    assert.isFalse(commands.isCommand(command));
  });
});
