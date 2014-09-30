"use strict";

var
  _ = require('lodash'),
  consumers = require('./lib/consumers'),
  Consumer = consumers.Consumer,
  Step = consumers.Step;

var
  autoId = 0,
  zeroFormat,
  defaultFormat = '0.0',
  fmtConsumers = {},
  defaultConsumers,
  compileFn = compileWithCache,
  formatCache = {},
  languages = {},
  globalLang = 'en';

/**
 * A wrapper for numeral-like formatting
 * @param value
 * @constructor
 */
function Numbr(value){
  this.num = value;
  this.lang = '';
}

/**
 * Formats the wrapped value according to fmt.
 * By default, the format is compiled into a series of transformations and then cached globally, if you'd like to
 * disable the caching feature, use {@link numbr.cacheEnabled}.
 * @param {string} fmt
 * @param {function} [roundFn=Math.round]
 * @returns {string} Returns the formatted number
 */
Numbr.prototype.format = function(fmt, roundFn){
  return compileFn(fmt || defaultFormat).run(this.num, roundFn || Math.round, this.lang || globalLang);
};

/**
 * Sets the language for this Numbr.
 * The provided language must be already loaded via {@link numbr.loadLang}.
 * @param lang The language code
 */
Numbr.prototype.setLang = function(lang){
  this.lang = lang;
};

Numbr.prototype.valueOf = function(){
  return this.num;
};

Numbr.prototype.value = function(){
  return this.value;
};

Numbr.prototype.set = function(num){
  this.num = num;
};

Numbr.prototype.clone = function(){
  return new Numbr(this.num);
};

/**
 * Returns a compiled format from the cache or compiles one on the fly.
 * @private
 * @param {string} fmt
 * @returns {CompiledFormat}
 */
function compileWithCache(fmt){
  var compiled = formatCache[fmt];
  if(!compiled){
    compiled = formatCache[fmt] = compileFormat(fmt);
  }
  return compiled;
}

/**
 * Compiles the format string.
 * @private
 * @param fmt
 * @returns {CompiledFormat}
 */
function compileFormat(fmt){
  var
    state = new ConsumerState(),
    steps = [],
    opts = {},
    pos = {};

  opts.pos = pos;

  for(var i = 0, len = fmt.length; i < len; ++i){
    var
      char = fmt[i],
      consumers = fmtConsumers[char] || defaultConsumers,
      res = consumeInput(consumers, state, fmt, i) || consumeInput(defaultConsumers, state, fmt, i);

    if(res.consumed){
      i += res.consumed;
    }

    if(res.step){
      // Cache this step position following a natural order, so that the final output corresponds
      // to the input string and not the internal weight order
      pos[res.step.consumerId] = steps.push(res) - 1;

      if(res.opts){
        _.extend(opts, res.opts);
      }
    }
  }

  steps = _(steps)
    .sortBy('weight')
    .pluck('step')
    .value();

  var sortedPos = new Array(steps.length);

  for(i = 0, len = steps.length; i < len; ++i){
    sortedPos[i] = pos[steps[i].consumerId];
  }

  return new CompiledFormat(steps, opts, sortedPos);
}

/**
 * Finds an appropriate consumer object to swallow the current input cursor.
 *
 * @private
 * @param {Consumer[]} consumers An array of consumers
 * @param {ConsumerState} state A consumer state object
 * @param {string} fmt The format string
 * @param {number} pos The format string cursor
 * @returns {Step|null} Returns an appropriate step definition given by one of the consumers on the
 * supplied array, if any
 */
function consumeInput(consumers, state, fmt, pos){
  for(var i = 0, len = consumers.length; i < len; ++i){
    var
      consumer = consumers[i],
      res = consumer.consume(state, fmt, pos);

    if(res){
      state.incConsumed(consumer.Id);
      return res;
    }
  }
}

/**
 * Simple counter for used consumers during a compile operation.
 * This can be used by individual consumers to check for other consumers' state.
 * @private
 * @constructor
 */
function ConsumerState(){
  this.ranConsumers = {};
}

/**
 * Returns whether the given consumer id has been used previously during the compile operation.
 * @param id The consumer Id
 * @returns {boolean}
 */
ConsumerState.prototype.isConsumed = function(id){
  return !!this.ranConsumers[id];
};

/**
 * Increments the usage count of the given consumer id
 * @param id The consumer Id
 */
ConsumerState.prototype.incConsumed = function(id){
  if(this.ranConsumers[id]){
    ++this.ranConsumers[id];
  } else {
    this.ranConsumers[id] = 1;
  }
};

/**
 * Returns the total usage count for the given consumer id
 * @param id The consumer Id
 * @returns {number}
 */
ConsumerState.prototype.timesConsumed = function(id){
  return this.ranConsumers[id] || 0;
};

/**
 * A wrapper object for compiled formats.
 * @param {Step[]} steps An array of step functions to be called during {@link CompiledFormat#run}
 * @param {object} opts A options object that will be passed to every step function as part of the run state
 * @param {number[]} sortedPos The an array output position indexes of each step in steps
 * @constructor
 */
function CompiledFormat(steps, opts, sortedPos){
  this.steps = steps;
  this.opts = opts;
  this.pos = opts.pos;
  this.sortedPos = sortedPos;
}

/**
 * Runs all the transformation step functions using the given number and rounding function.
 * @param num The number to format
 * @param {function} roundFn A rounding function
 * @param {string} lang The language code
 * @returns {string} The formatted number
 */
CompiledFormat.prototype.run = function(num, roundFn, lang){
  if(num === 0 && zeroFormat){
    return zeroFormat;
  }

  var
    len = this.steps.length,
    i = 0,
    state = {
      num: num,
      signPos: -1,
      right: num % 1,
      rightStr: '',
      optionalDot: false,
      roundFn : roundFn,
      lang: languages[lang],
      opts: this.opts,
      pos: this.pos
    },
    output = new Array(len);

  for(; i < len; ++i){
    this.steps[i](state, output, this.sortedPos[i]);
  }

  return output.join('');
};


/**
 * Function wrapper for creating new Numbr instances, it also has useful static methods to
 * control the global module behaviour.
 * @param {number} value
 * @returns {Numbr}
 */
function numbr(value){
  return new Numbr(value);
}

/**
 * Compiles the given string into a {@link CompiledFormat} object ready to be used.
 * @param {string} fmt
 * @returns {CompiledFormat}
 */
numbr.compile = function(fmt){
  return compileFn(fmt);
};

numbr.zeroFormat = function(fmt){
  zeroFormat = _.isString(fmt)? fmt : null;
};

numbr.defaultFormat = function(fmt){
  defaultFormat = _.isString(fmt)? fmt : '0.0';
};

numbr.loadLang = function(langCode, langDef){
  languages[langCode.toLowerCase()] = langDef;
};

numbr.getGlobalLang = function(){
  return globalLang;
};

/**
 * Sets the global language.
 * @param langCode
 */
numbr.setGlobalLang = function(langCode){
  langCode = langCode.toLowerCase();

  if(!languages[langCode]){
    throw new Error('Unknown language : ' + langCode);
  }

  globalLang = langCode;
};

/**
 * Gets the global language, sets the global language or loads a language.
 * If called with no arguments, returns the global language.
 * If called with just the language code, it sets the global language.
 * If called with both arguments, the language is just loaded.
 *
 * @param {string} [langCode] The language code
 * @param {object} [langDef] A valid language definition
 */
numbr.language = function(langCode, langDef) {
  if(!langCode) {
    return globalLang;
  }

  if(langDef){
    numbr.loadLang(langCode, langDef);
  } else {
    numbr.setGlobalLang(langCode);
  }
};


/**
 * Enables or disables the format cache.
 * By default every format is compiled into a series of transformation functions that are cached and reused every
 * time {@link Numbr.format} is called.
 *
 * Disabling the cache may cause a significant performance hit and it is not recommended. Most applications will
 * probably use just a handful of formats, so the memory overhead is non-existent.
 *
 * @param {boolean} enabled Whether to enable or disable the cache
 */
numbr.cacheEnabled = function(enabled){
  compileFn = enabled? compileWithCache : compileFormat;
};

numbr.setDefaultConsumer = function(consumer){
  consumer.Id = ++autoId;
  defaultConsumers = [consumer];
};

/**
 * Adds a consumer to the list of global consumers.
 * Cosumers are used to translate the string format input into actual transforming steps.
 * @param {Consumer} consumer
 */
numbr.addConsumer = function(consumer){
  consumer.setId(++autoId);

  consumer.token.split('').forEach(function(char){
    var consumerArr = fmtConsumers[char] || [];
    consumerArr.push(consumer);
    fmtConsumers[char] = _.sortBy(consumerArr, 'priority');
  });
};

/**
 * A simple consumer that echoes back as many characters as possible in one step.
 * This is the default consumer.
 * @type {Consumer}
 */
numbr.echoConsumer = new Consumer('', {
  consume: function(state, input, pos){
    for(var i = pos+1, len = input.length; i < len; ++i){
      if(fmtConsumers[input[i]]){
        break;
      }
    }

    var
      str = input.substring(pos, i),
      fn = function(state, output, pos){
        output[pos] = str;
      };

    fn.consumerId = ++autoId;

    return new Step(fn, 2000, null, i - pos - 1);
  }
});

/**
 * A simple consumer that consumes the single character is given and does nothing else.
 * You can set this consumer as the default by using {@link numbr.setDefaultConsumer}
 * @type {Consumer}
 */
numbr.noopConsumer = new Consumer('', {
  consume: function(){
    return {};
  }
});

numbr.Numbr = Numbr;
numbr.CompiledFormat = CompiledFormat;
numbr.standardConsumers = consumers;

// Initializes the default and standard consumers
numbr.setDefaultConsumer(numbr.echoConsumer);
consumers.map(numbr.addConsumer);

numbr.loadLang('en', {
  delimiters: {
    thousands: ',',
    decimal: '.'
  },
  abbreviations: {
    thousand: 'k',
    million: 'm',
    billion: 'b',
    trillion: 't'
  },
  ordinal: function(number) {
    var b = number % 10;
    return (~~(number % 100 / 10) === 1) ? 'th' :
      (b === 1) ? 'st' :
        (b === 2) ? 'nd' :
          (b === 3) ? 'rd' : 'th';
  },
  currency: {
    symbol: '$'
  }
});

module.exports = numbr;