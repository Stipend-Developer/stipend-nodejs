const http = require('http')
  , https = require('https');

const api = require('./commands')
  , errors = require('./errors');

function Client(options) {
  this.opts = {
    host: 'localhost'
    , port: 46979
    , method: 'POST'
    , user: ''
    , pass: ''
    , headers: {
      'Host': 'localhost'
      , 'Authorization': ''
    }
    , passphrasecallback: null
    , https: false
    , ca: null
  };

  if (options) {
    this.set(options)
  }
}

Client.prototype = {

  invalid: function (command) {
    const args = Array.prototype.slice.call(arguments, 1);
    let fn = args.pop();

    if (typeof fn !== 'function') {
      fn = console.log
    }

    return fn(new Error(`No such command "${command}"`))
  },

  send: function (command) {
    const args = Array.prototype.slice.call(arguments, 1)
      , self = this;
    let fn;

    if (typeof args[args.length - 1] === 'function') {
      fn = args.pop().bind(this)
    } else {
      fn = console.log
    }

    const rpcData = JSON.stringify({
      id: new Date().getTime()
      , method: command.toLowerCase()
      , params: args
    });

    const options = this.opts;
    options.headers['Content-Length'] = rpcData.length;

    const request = options.https === true ? https.request : http.request;

    const req = request(options, function (res) {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        data += chunk
      });
      res.on('end', function () {
        try {
          data = JSON.parse(data)
        } catch (exception) {
          let errMsg = res.statusCode !== 200
            ? 'Invalid params ' + res.statusCode
            : 'Failed to parse JSON';
          errMsg += ' : ' + JSON.stringify(data);
          return fn(new Error(errMsg));
        }
        if (data.error) {
          if (data.error.code === errors.RPC_WALLET_UNLOCK_NEEDED &&
            options.passphrasecallback) {
            return self.unlock(command, args, fn)
          } else {
            const err = new Error(JSON.stringify(data));
            err.code = data.error.code;
            return fn(err);
          }
        }
        fn(null, data.result !== null ? data.result : data)
      })
    });

    req.on('error', fn);
    req.end(rpcData);
    return this
  },

  exec: function (command) {
    const func = api.isCommand(command) ? 'send' : 'invalid';
    return this[func].apply(this, arguments)
  },

  auth: function (user, pass) {
    if (user && pass) {
      this.opts.headers['Authorization'] = ('Basic ') + new Buffer(user + ':' + pass).toString('base64')
    }
    return this
  },

  unlock: function (command, args, fn) {
    const self = this;

    const retry = function (err) {
      if (err) {
        fn(err)
      } else {
        const sendargs = args.slice();
        sendargs.unshift(command);
        sendargs.push(fn);
        self.send.apply(self, sendargs)
      }
    };

    this.opts.passphrasecallback(command, args, function (err, passphrase, timeout) {
      if (err) {
        fn(err)
      } else {
        self.send('walletpassphrase', passphrase, timeout, retry)
      }
    })
  },

  set: function (k, v) {
    if (typeof(k) === 'object') {
      for (let key in k) {
        if (k.hasOwnProperty(key))
          this.set(key, k[key]);
      }
      return;
    }

    const opts = this.opts;
    k = k.toLowerCase();

    if (opts.hasOwnProperty(k)) {
      opts[k] = v
      if (/^(user|pass)$/.test(k)) {
        this.auth(opts.user, opts.pass)
      } else if (k === 'host') {
        opts.headers['Host'] = v
      } else if (k === 'passphrasecallback' ||
        k === 'https' ||
        k === 'ca') {
        opts[k] = v
      }
    }

    return this;
  },

  get: function (k) {
    //Special case for booleans
    if (this.opts[k] === false) {
      return false;
    } else {
      if (this.opts[k] !== false) {
        var opt = this.opts[k.toLowerCase()]
      }
      return opt; //new Error('No such option "'+k+'" exists');
    }
  },

  errors
};

api.commands.forEach(function (command) {
  const cp = Client.prototype;
  const tlc = [command.toLowerCase()];

  cp[command] = cp[tlc] = function () {
    cp.send.apply(this, tlc.concat(([]).slice.call(arguments)));
  };
});

module.exports = options => new Client(options);
