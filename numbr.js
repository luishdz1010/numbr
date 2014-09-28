"use strict";

var
  _ = require('lodash');

var
  zeroFormat;

var
  autoId = 0,
  fmtConsumers = {},
  defaultConsumers,
  formatFn = formatWithCache,
  formatCache = {};

module.exports = numbr;

function Numbr(value){
  this.num = value;
}

Numbr.SIMPLE = 1 << 0;
Numbr.CURRENCY = 1 << 1;
Numbr.TIME = 1 << 2;

function InvalidFormatError(a, b){

}

function toFixed(value, exp, roundFn){
  return decimalAdjust(value, exp, roundFn).toFixed(exp).split('.');
}

function decimalAdjust(value, exp, roundFn){
  exp = -exp;
  value = value.toString().split('e');
  value = roundFn(+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  value = value.toString().split('e');
  return (+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));
}

/**
 * Does the actual formatting.
 * By default the format is compiled into a series of transformations and then cached globally, if you'd like to
 * disable the caching feature, use {@link numbr.setCacheEnabled}.
 */
Numbr.prototype.format = function(fmt, roundFn){
  return formatFn(fmt, this.num, roundFn);
};

function format(fmt, num, roundFn){
  return compileFormat(fmt).run(num, roundFn || Math.round);
}

function formatWithCache(fmt, num, roundFn){
  var compiled = formatCache[fmt];
  if(!compiled){
    compiled = formatCache[fmt] = compileFormat(fmt);
  }

  return compiled.run(num, roundFn || Math.round);
}

function compileFormat(fmt){
  var
    state = new ConsumerState(),
    steps = [],
    opts = {};

  for(var i = 0, len = fmt.length; i < len; ++i){
    var
      char = fmt[i],
      consumers = fmtConsumers[char] || defaultConsumers,
      res = consumeInput(consumers, state, fmt, i);

    if(!res){
      res = consumeInput(defaultConsumers, state, fmt, i);
    }

    if(res.consumed){
      i += res.consumed;
    }

    if(res.step){
      if(typeof res.step === 'string'){
        res.step = identity(res.step);
      }
      res.step.consumer = res.consumer;
      steps = steps.concat(res);

      if(res.opts){
        _.extend(opts, res.opts);
      }
    }
  }

  steps = steps
    .sort(function(stepA, stepB){
      return stepA.weight - stepB.weight;
    }).map(function(step){
      return step.step;
    });

  return new CompiledFormat(steps, opts);
}

function identity(value){
  return function(state, output, pos){
    output[pos] = value;
  };
}

function consumeInput(consumers, state, fmt, pos){
  for(var i = 0, len = consumers.length; i < len; ++i){
    var
      consumer = consumers[i],
      res = consumer.consume(state, fmt, pos);

    if(res){
      state.incConsumed(consumer.Id);
      res.consumer = consumer;
      return res;
    }
  }
}

function ConsumerState(){
  this.ranConsumers = {};
}

ConsumerState.prototype.isConsumed = function(id){
  return !!this.ranConsumers[id];
};

ConsumerState.prototype.incConsumed = function(id){
  if(this.ranConsumers[id]){
    ++this.ranConsumers[id];
  } else {
    this.ranConsumers[id] = 1;
  }
};

ConsumerState.prototype.timesConsumed = function(id){
  return this.ranConsumers[id] || 0;
};

function CompiledFormat(steps, opts){
  this.steps = steps;
  this.opts = opts;
}

CompiledFormat.prototype.run = function(num, roundFn){
  if(num === 0 && zeroFormat){
    return zeroFormat;
  }

  var
    state = {
      opts: this.opts,
      roundFn : roundFn,
      num: num,
      left: num | 0,
      right: num % 1
    },
    output = new Array(this.steps.length);

  this.steps.forEach(function(step, pos){
    step(state, output, pos);
    state[step.consumer.Id] = pos;
  });

  return output.join('');
};

var parenthesisConsumer = {
  token: '()',
  consume: function(state, input, pos){
    if(input[pos] === '('){
      if(state.timesConsumed(this.Id) === 0){
        return { step: this.stepLeft , weight: -20 };
      }
    } else {
      if(state.timesConsumed(this.Id) === 1){
        return { step: this.stepRight, weight: 40 };
      }
    }
  },
  stepLeft: function(state, output, pos){
    if(state.num < 0){
      output[pos] = '(';
    }
  },
  stepRight: function(state, output, pos){
    if(state.num < 0){
      var
        intIndex = state[intConsumer.Id],
        dotIndex = state[dotConsumer.Id];

      if(output[intIndex]){
        output[intIndex] = output[intIndex].substr(1);
      } else if(output[dotIndex]){
        output[dotIndex] = output[dotIndex].substr(1);
      }

      output[pos] = ')';
    }
  }
};

var plusConsumer = {
  token: '+',
  consume: function(state){
    if(!state.isConsumed(this.Id)) {
      return { step: this.step, weight: -10 };
    }
  },
  step: function(state, output, pos){
    if(state.num > 0){
      output[pos] = '+';
    }
  }
};

var dotConsumer = {
  token: '.[',
  consume: function(state, input, pos){
    if(!state.isConsumed(this.Id)){
      if(input[pos] === '.'){
        return { step: this.fixedStep, weight: 20 };
      }

      if(input[pos+1] === '.' && input[pos+2] === ']'){
        return { step: this.optStep, consumed: 2, weight: 10 };
      }

      throw new InvalidFormatError(input, pos);
    }
  },
  fixedStep: function(state, output, pos){
    output[pos] = state.num < 0?
      (output[state[intConsumer.Id]]? '.' : '-.') : '.';
  },
  optStep: function(state, output, pos){
    if(state.right !== 0){
      output[pos] = state.num < 0?
        (output[state[intConsumer.Id]]? '.' : '-.') : '.';
      state.optionalDot = true;
    }
  }
};

var intConsumer = {
  token: '0',
  consume: function(state){
    if(!state.isConsumed(dotConsumer.Id) && !state.isConsumed(this.Id)){
      return { step: this.step, weight: 0 };
    }
  },
  step: function(state, output, pos){
    output[pos] = toFixed(state.num, 0 + (state.opts.decimalPrecision || 0), state.roundFn)[0];
  }
};

var sepConsumer = {
  token: ',',
  consume: function(state){
    if(state.isConsumed(intConsumer.Id) && !state.isConsumed(this.Id)){
      return { step: this.step, weight: 10 };
    }
  },
  step: function(state, output){
    var intIndex = state[intConsumer.Id];

    // + state.lang.delimiters.thousand
    output[intIndex] = output[intIndex].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + ',');
  }
};

var decimalConsumer = {
  token: '0[',
  priority: 10,
  consume: function(state, input, pos){
    if(state.isConsumed(dotConsumer.Id) && !state.isConsumed(this.Id)){
      var
        precision,
        optional = 0;

      for(var i = pos, len = input.length; i < len; ++i){
        var char = input[i];
        if(char !== '0'){
          if(char === '['){
            for(var k = i+1; k < len; ++k){
              char = input[k];
              if(char !== '0'){
                 break;
              }
            }

            if(char === ']' && k > i+1){
              optional = k - i - 1;
            } else {
              throw new InvalidFormatError(input, k);
            }
          }
          break;
        }
      }

      precision = i + optional - pos;

      var ret = {
        consumed: i - pos - 1,
        weight: 30,
        opts: {
          decimalPrecision: precision
        }
      };

      if(optional > 0){
        ret.consumed += optional + 2;
        ret.step = this.optStep.bind(this, precision, optional);
      } else {
        ret.step = this.fixedStep.bind(this, precision);
      }
      return ret;
    }
  },
  getDotIndex: function(state, output){
    var dotIndex = state[dotConsumer.Id];
    // If the decimal separator isn't present, we don't need to output decimals
    return typeof output[dotIndex] === 'undefined'? false : dotIndex;
  },
  setDecimals: function(state, output, pos, dotIndex, decimals){

    if(decimals && decimals.length > 0 && (!state.optionalDot || Number('0.'+decimals) !== 0)){
      output[pos] = decimals;
    } else {
      // Eliminate the decimal point
      output[dotIndex] = null;
    }
  },
  fixedStep: function(precision, state, output, pos){
    var dotIndex = this.getDotIndex(state, output);

    if(typeof dotIndex === 'number'){
      this.setDecimals(state, output, pos, dotIndex, toFixed(state.right, precision, state.roundFn)[1]);
    }
  },
  optStep: function(precision, optional, state, output, pos){
    var dotIndex = this.getDotIndex(state, output);

    if(dotIndex){
      var decimals = toFixed(state.right, precision, state.roundFn)[1];

      // Eliminate optional '0's from the right
      if(decimals.length > 0){
        for(var len = decimals.length, i = len - 1; i >= 0 && len - i <= optional; --i){
          if(decimals[i] !== '0'){
            break;
          }
        }
        decimals = i > 0? decimals.substring(0, i+1) : null;
      }

      this.setDecimals(state, output, pos, dotIndex, decimals);
    }
  }
};

/*var abbrConsumer = {
  token: 'a',
  consume: function(state, input, pos){
    var concrete = input[pos+1];
    if(concrete){

    } else {

    }
  },
};*/

function numbr(){}

numbr.Numbr = Numbr;

numbr.setCacheEnabled = function(enabled){
  formatFn = enabled? formatWithCache : format;
};

numbr.setDefaultConsumer = function(consumer){
  consumer.Id = ++autoId;
  defaultConsumers = [consumer];
};

numbr.addConsumer = function(consumer){
  consumer.Id = ++autoId;

  consumer.token.split('').forEach(function(char){
    var consumerArr = fmtConsumers[char];
    if(!consumerArr){
      consumerArr = fmtConsumers[char] = [];
    }
    consumerArr.push(consumer);
    consumerArr.sort(numbr.consumerCompare);
  });
};

numbr.consumerCompare = function(a, b){
  return (a.priority || 0) - (b.priority || 0);
};

numbr._noopConsumer = {
  consume: function(){
    return {};
  }
};

numbr.setDefaultConsumer(numbr._noopConsumer);

[parenthesisConsumer, plusConsumer, intConsumer, sepConsumer, dotConsumer, decimalConsumer].map(numbr.addConsumer);