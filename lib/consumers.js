"use strict";

var
  _ = require('lodash');

var
  percentageConsumer,
  byteConsumer,
  abbrConsumer,
  leftParenthesisConsumer,
  plusConsumer,
  intConsumer,
  ordinalConsumer,
  timeConsumer,
  sepConsumer,
  dotConsumer,
  decimalConsumer,
  rightParenthesisConsumer,
  currencyConsumer,
  negConsumer;

/**
 * @todo Step documentation
 * @param {function} step
 * @param {number} weight
 * @param {object} [opts]
 * @param {number }[consumed]
 * @constructor
 */
function Step(step, weight, opts, consumed){
  this.step = step;
  this.weight = weight;
  this.opts = opts;
  this.consumed = consumed || 0;
}

/**
 * @todo Consumer documentation
 * @param {string} tokens A list of characters which will trigger this consumer
 * @param {object} def The consumer definition
 * @constructor
 */
function Consumer(tokens, def){
  this.Id = -1;
  this.token = tokens;

  if(def.consume instanceof Step){
    var
      step = def.consume,
      self = this;

    step.step = def.step;

    if(def.maxConsumes){
      var maxConsumes = def.maxConsumes;
      def.consume = function(state){
        return state.timesConsumed(self.Id) < maxConsumes && step;
      };
    } else {
      def.consume = function(){
        return step;
      };
    }
  }

  if(def.cachedStep){
    def.cachedStep.step = def.step;
  }

  this.consume = def.consume;
  this.step = def.step;
  this.cachedStep = def.cachedStep;
  this.priority = def.priority || 0;
  this.usedStepFns = _.compact([].concat(def.step, def.usedStepFns));
}

/**
 * @private
 * @param {number} id
 */
Consumer.prototype.setId = function(id){
  this.Id = id;
  this.usedStepFns.forEach(function(step){
    step.consumerId = id;
  });
};

function toFixed(num, precision, roundFn){
  var
    power = Math.pow(10, precision),
    fixed = (roundFn(num * power) / power).toFixed(precision),
    dot = fixed.lastIndexOf('.');

  return [fixed.substring(0, dot), fixed.substring(dot+1)];
}

function removeSign(pos, output){
  var sign = pos !== -1 && output[pos];
  if(sign){
    output[pos] = sign.substring(1);
  }
}

percentageConsumer = new Consumer('%', {
  consume: new Step(null, -900),
  maxConsumes: 1,
  step: function(state, output, pos){
    output[pos] = '%';
    state.num *= 100;
    state.right = state.num % 1;
  }
});

var byteRanges = [
  [ 0                , Math.pow(1024, 1), 'B' ],
  [ Math.pow(1024, 1), Math.pow(1024, 2), 'KB' ],
  [ Math.pow(1024, 2), Math.pow(1024, 3), 'MB' ],
  [ Math.pow(1024, 3), Math.pow(1024, 4), 'GB' ],
  [ Math.pow(1024, 4), Math.pow(1024, 5), 'TB' ],
  [ Math.pow(1024, 5), Math.pow(1024, 6), 'PB' ],
  [ Math.pow(1024, 6), Math.pow(1024, 7), 'EB' ],
  [ Math.pow(1024, 7), Math.pow(1024, 8), 'ZB' ],
  [ Math.pow(1024, 8), Infinity         , 'YB' ]
];

byteConsumer = new Consumer('b', {
  consume: new Step(null, -900),
  step: function(state, output, pos){
    var
      abs = Math.abs(state.num);

    for(var i = 0, len = byteRanges.length; i < len; ++i){
      var range = byteRanges[i];
      if(abs < range[1]){
        output[pos] = range[2];
        state.num /= range[0] || 1;
        state.right = state.num % 1;
        return;
      }
    }
  }
});

var
  abbrRanges = [
    [ Math.pow(10, 3),  Math.pow(10, 6),  'k', 'thousand' ],
    [ Math.pow(10, 6),  Math.pow(10, 9),  'm', 'million'  ],
    [ Math.pow(10, 9),  Math.pow(10, 12), 'b', 'billion'  ],
    [ Math.pow(10, 12), Infinity,         't', 'trillion' ]
  ],
  abbrModifier = {
    'K': 0,
    'M': 1,
    'B': 2,
    'T': 3
  };

function abbrSingleRangeStep(state, output, pos){
  var range = state.opts.abbrRange;
  if(Math.abs(state.num) >= range[0]){
    abbrDoOutput(range, state, output, pos);
  }
}

function abbrBestFitStep(state, output, pos){
  var abs = Math.abs(state.num);
  for(var i = 0, len = abbrRanges.length; i < len; ++i){
    var range = abbrRanges[i];
    if(abs < range[1]){
      abbrDoOutput(range, state, output, pos);
      return;
    }
  }
}

function abbrDoOutput(range, state, output, pos){
  output[pos] = state.lang.abbreviations[range[3]];
  state.num /= range[0];
  state.right = state.num % 1;
}

abbrConsumer = new Consumer('a', {
  usedStepFns: [abbrSingleRangeStep, abbrBestFitStep],
  consume: function(state, input, pos){
    var
      concrete = input[pos+1],
      range = concrete && abbrRanges[abbrModifier[concrete]];

    return range?
      new Step(abbrSingleRangeStep, -900, { abbrRange: range }, 1) : new Step(abbrBestFitStep, -900);
  }
});

leftParenthesisConsumer = new Consumer('(', {
  consume: new Step(null, 0),
  step: function(state, output, pos){
    if(state.num < 0){
      output[pos] = '(';
    }
  }
});

plusConsumer = new Consumer('+', {
  consume: new Step(null, 0),
  step: function(state, output, pos){
    if(state.num > 0){
      state.singPos = pos;
      output[pos] = '+';
    }
  }
});

intConsumer = new Consumer('0', {
  cachedStep: new Step(null, 0),
  consume: function(state){
    if(!state.isConsumed(dotConsumer.Id) && !state.isConsumed(this.Id)){
      return this.cachedStep;
    }
  },
  step: function(state, output, pos){
    var
      num = state.num,
      leftStr,
      decimalPrecision = state.opts.decimalPrecision;

    if(decimalPrecision){
      var fixed = toFixed(num, decimalPrecision, state.roundFn);
      leftStr = fixed[0];
      state.rightStr = fixed[1];
    } else {
      leftStr = '' + state.roundFn(state.num);
    }

    if(num < 0){
      state.signPos = pos;
    }

    output[pos] = leftStr;
  }
});

ordinalConsumer = new Consumer('o', {
  consume: new Step(null, 0),
  step: function(state, output, pos){
    output[pos] = state.lang.ordinal(state.num);
  }
});

var timeFullToken = '00:00:00';

timeConsumer = new Consumer('0', {
  cachedStep: new Step(null, 0, null, timeFullToken.length - 1),
  priority: -10,
  consume: function(state, input, pos){
    if(input.indexOf(timeFullToken, pos) === pos){
      return this.cachedStep;
    }
  },
  step: function(state, output, pos){
    var
      hours = Math.floor(state.num/60/60),
      minutes = Math.floor((state.num - (hours * 60 * 60))/60),
      seconds = Math.round(state.num - (hours * 60 * 60) - (minutes * 60));

    output[pos] = hours +
      ':' + ((minutes < 10)? '0' + minutes : minutes) +
      ':' + ((seconds < 10) ? '0' + seconds : seconds);
  }
});

var
  sepStep0 = new Step(null, 300, null, 0),
  sepStep1 = new Step(null, 300, null, 1);

sepConsumer = new Consumer(',', {
  consume: function(state, input, pos){
    if(state.isConsumed(intConsumer.Id) && !state.isConsumed(this.Id)){
      return input[pos+1] === '0'? sepStep1 :  sepStep0;
    }
  },
  step: function(state, output){
    var intIndex = state.pos[intConsumer.Id];
    output[intIndex] = output[intIndex].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + state.lang.delimiters.thousands);
  }
});
sepStep0.step = sepStep1.step = sepConsumer.step;

function dotFixedStep(state, output, pos){
  var dot = state.lang.delimiters.decimal;
  if(state.num < 0  && state.signPos === -1){
    output[pos] = '-' + dot;
    state.signPos = pos;
  } else {
    output[pos] = dot;
  }
}

function dotOptStep(state, output, pos){
  if(state.right !== 0){
    state.optionalDot = true;
    var dot = state.lang.delimiters.decimal;
    if(state.num < 0  && state.signPos === -1){
      output[pos] = '-' + dot;
      state.signPos = pos;
    } else {
      output[pos] = dot;
    }
  }
}

var
  dotFixedStepObj = new Step(dotFixedStep, 300),
  dotOptStepObj = new Step(dotOptStep, 300, null, 2);

dotConsumer = new Consumer('.[', {
  usedStepFns: [dotFixedStep, dotOptStep],
  consume: function(state, input, pos){
    if(input[pos] === '.'){
      return dotFixedStepObj;
    }

    if(input[pos+1] === '.' && input[pos+2] === ']'){
      return dotOptStepObj;
    }
  }
});

function decimalFixedStep(state, output, pos){
  var dotIndex = getDotIndex(state.pos, output);

  if(dotIndex !== -1){
    var decimals = state.rightStr || toFixed(state.right, state.opts.decimalPrecision, state.roundFn)[1];
    setDecimals(state.optionalDot, output, pos, dotIndex, decimals);
  }
}

function decimalOptStep(state, output, pos){
  var dotIndex = getDotIndex(state.pos, output);

  if(dotIndex !== -1){
    var
      decimals =  state.rightStr || toFixed(state.right, state.opts.decimalPrecision, state.roundFn)[1],
      optional = state.opts.optionalPrecision;

    // Eliminate optional '0's from the right
    for(var len = decimals.length, i = len - 1; i >= 0 && len - i <= optional; --i){
      if(decimals[i] !== '0'){
        break;
      }
    }
    decimals = decimals.substring(0, i+1);

    setDecimals(state.optionalDot, output, pos, dotIndex, decimals);
  }
}

function getDotIndex(pos, output){
  var dotIndex = pos[dotConsumer.Id];
  return typeof output[dotIndex] === 'undefined'? -1 : dotIndex;
}

function setDecimals(optionalDot, output, pos, dotIndex, decimals){
  if(decimals.length > 0 && (!optionalDot|| Number('0.'+decimals) !== 0)){
    output[pos] = decimals;
  } else {
    // Eliminate the decimal point
    output[dotIndex] = null;
  }
}

decimalConsumer = new Consumer('0[', {
  priority: 10,
  usedStepFns: [decimalOptStep, decimalFixedStep],
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
            }
          }
          break;
        }
      }

      precision = i + optional - pos;

      var
        consumed = i - pos - 1,
        opts = {
          decimalPrecision: precision,
          optionalPrecision: optional
        };

      if(optional > 0){
        return new Step(decimalOptStep, 600, opts, consumed + optional + 2);
      } else {
        return new Step(decimalFixedStep, 600, opts, consumed);
      }
    }
  }
});

rightParenthesisConsumer = new Consumer(')', {
  cachedStep: new Step(null, 600),
  consume: function(state){
    if(state.isConsumed(leftParenthesisConsumer.Id) && !state.isConsumed(this.Id)){
      return this.cachedStep;
    }
  },
  step: function(state, output, pos){
    if(state.num < 0){
      removeSign(state.signPos, output);
      state.signPos = -1;
      output[pos] = ')';
    }
  }
});

currencyConsumer = new Consumer('$', {
  consume: function(state){
    // Should only place negative sign before currency sign if we havent found any of '0', '.0', '-' or '(' before
    var shouldNeg =
      !state.isConsumed(intConsumer.Id) &&
      !state.isConsumed(dotConsumer.Id) &&
      !state.isConsumed(negConsumer.Id) &&
      !state.isConsumed(leftParenthesisConsumer.Id);

    return new Step(this.step, 900, { currencyShouldNeg: shouldNeg });
  },
  step: function(state, output, pos){
    var symbol = state.lang.currency.symbol;

    if(state.num < 0 && state.opts.currencyShouldNeg && !output[state.pos[rightParenthesisConsumer.Id]]){
      removeSign(state.signPos, output);
      state.signPos = pos;
      output[pos] = '-' + symbol;
    } else {
      output[pos] = symbol;
    }
  }
});

negConsumer = new Consumer('-', {
  consume: new Step(null, 1200),
  step: function(state, output, pos){
    if(state.num < 0){
      removeSign(state.signPos, output);
      output[pos] = '-';
    }
  }
});

var exp = [
  percentageConsumer,
  byteConsumer,
  abbrConsumer,
  leftParenthesisConsumer,
  plusConsumer,
  intConsumer,
  ordinalConsumer,
  timeConsumer,
  sepConsumer,
  dotConsumer,
  decimalConsumer,
  rightParenthesisConsumer,
  currencyConsumer,
  negConsumer
];

exp.Consumer = Consumer;
exp.Step = Step;

module.exports = exp;