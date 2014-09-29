"use strict";

var
  rightParenthesisConsumer,
  leftParenthesisConsumer,
  plusConsumer,
  dotConsumer,
  intConsumer,
  sepConsumer,
  decimalConsumer,
  abbrConsumer,
  ordinalConsumer,
  currencyConsumer,
  negCurrencyConsumer,
  byteConsumer,
  percentageConsumer,
  timeConsumer;

function toFixed(num, precision, roundFn){
  var power = Math.pow(10, precision);
  return (roundFn(num * power) / power).toFixed(precision).split('.');
}

function removeSign(pos, output){
  var
    intIndex = pos[intConsumer.Id],
    dotIndex = pos[dotConsumer.Id];

  if(output[intIndex]){
    output[intIndex] = output[intIndex].substr(1);
  } else if(output[dotIndex]){
    output[dotIndex] = output[dotIndex].substr(1);
  }
}

leftParenthesisConsumer = {
  token: '(',
  consume: function(state){
    if(!state.isConsumed(this.Id)){
      return { step: this.step, weight: -100 };
    }
  },
  step: function(state, output, pos){
    if(state.num < 0){
      output[pos] = '(';
    }
  }
};

rightParenthesisConsumer = {
  token: ')',
  consume: function(state){
    if(state.isConsumed(leftParenthesisConsumer.Id) && !state.isConsumed(this.Id)){
      return { step: this.step, weight: 100 };
    }
  },
  step: function(state, output, pos){
    if(state.num < 0){
      removeSign(state.pos, output);
      output[pos] = ')';
    }
  }
};

plusConsumer = {
  token: '+',
  consume: function(state){
    if(!state.isConsumed(this.Id)) {
      return { step: this.step, weight: -30 };
    }
  },
  step: function(state, output, pos){
    if(state.num > 0){
      output[pos] = '+';
    }
  }
};

dotConsumer = {
  token: '.[',
  consume: function(state, input, pos){
    if(!state.isConsumed(this.Id)){
      if(input[pos] === '.'){
        return { step: this.fixedStep, weight: 30 };
      }

      if(input[pos+1] === '.' && input[pos+2] === ']'){
        return { step: this.optStep, consumed: 2, weight: 30 };
      }
    }
  },
  fixedStep: function(state, output, pos){
    var dot = state.lang.delimiters.decimal;
    output[pos] = state.num < 0?
      (output[state.pos[intConsumer.Id]]? dot : '-' + dot) : dot;
  },
  optStep: function(state, output, pos){
    if(state.right !== 0){
      var dot = state.lang.delimiters.decimal;
      output[pos] = state.num < 0?
        (output[state.pos[intConsumer.Id]]? dot : '-' + dot) : dot;
      state.optionalDot = true;
    }
  }
};

intConsumer = {
  token: '0',
  consume: function(state){
    if(!state.isConsumed(dotConsumer.Id) && !state.isConsumed(this.Id)){
      return { step: this.step, weight: 0 };
    }
  },
  step: function(state, output, pos){
    output[pos] = !state.opts.decimalPrecision?
      ''+state.roundFn(state.num) : toFixed(state.num, 0 + state.opts.decimalPrecision, state.roundFn)[0];
  }
};

sepConsumer = {
  token: ',',
  consume: function(state, input, pos){
    if(state.isConsumed(intConsumer.Id) && !state.isConsumed(this.Id)){
      return { step: this.step, weight: 15, consumed: input[pos+1] === '0'? 1 : 0 };
    }
  },
  step: function(state, output){
    var intIndex = state.pos[intConsumer.Id];

    output[intIndex] = output[intIndex].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + state.lang.delimiters.thousands);
  }
};

decimalConsumer = {
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
            }
          }
          break;
        }
      }

      precision = i + optional - pos;

      var ret = {
        consumed: i - pos - 1,
        weight: 60,
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
    var dotIndex = state.pos[dotConsumer.Id];
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

    if(typeof dotIndex === 'number'){
      var decimals = toFixed(state.right, precision, state.roundFn)[1];

      // Eliminate optional '0's from the right
      if(decimals.length > 0){
        for(var len = decimals.length, i = len - 1; i >= 0 && len - i <= optional; --i){
          if(decimals[i] !== '0'){
            break;
          }
        }
        decimals =decimals.substring(0, i+1);
      }

      this.setDecimals(state, output, pos, dotIndex, decimals);
    }
  }
};

abbrConsumer = {
  token: 'a',
  ranges: [
    [ Math.pow(10, 3), Math.pow(10, 6), 'k','thousand' ],
    [ Math.pow(10, 6), Math.pow(10, 9), 'm','million' ],
    [ Math.pow(10, 9), Math.pow(10, 12), 'b','billion' ],
    [ Math.pow(10, 12), Infinity, 't','trillion' ]
  ],
  modifier: {
    'K': 0,
    'M': 1,
    'B': 2,
    'T': 3
  },
  consume: function(state, input, pos){
    if(!state.isConsumed(this.Id)){
      var concrete = input[pos+1];
      if(concrete && concrete in this.modifier){
        return { step: this.singleStep.bind(this, this.ranges[this.modifier[concrete]]), consumed: 1, weight: -5 };
      }

      return { step: this.bestFitStep.bind(this), weight: -200 };
    }
  },
  singleStep: function(range, state, output, pos){
    if(Math.abs(state.num) >= range[0]){
      this.doOutput(range, state, output, pos);
    }
  },
  bestFitStep: function(state, output, pos){
    var abs = Math.abs(state.num);
    for(var i = 0, len = this.ranges.length; i < len; ++i){
      var range = this.ranges[i];
      if(abs < range[1]){
        this.doOutput(range, state, output, pos);
        return;
      }
    }
  },
  doOutput: function(range, state, output, pos){
    output[pos] = state.lang.abbreviations[range[3]];
    state.num /= range[0];
    state.right = state.num % 1;
  }
};

ordinalConsumer = {
  token: 'o',
  consume: function(){
    return { step: this.step, weight: 500 };
  },
  step: function(state, output, pos){
    output[pos] = state.lang.ordinal(state.num);
  }
};

currencyConsumer = {
  token: '$',
  consume: function(state){
    if(!state.isConsumed(this.Id)){
      return { step: this.step, weight: 200 };
    }
  },
  step: function(state, output, pos){
    var symbol = '';

    if(state.num < 0 && !output[state.pos[rightParenthesisConsumer.Id]] &&
      (pos < state.pos[intConsumer.Id] || pos < state.pos[dotConsumer.Id])){
      removeSign(state.pos, output);
      symbol = '-';
    }

    output[pos] = symbol + state.lang.currency.symbol;
  }
};

negCurrencyConsumer = {
  token: '-',
  consume: function(state){
    if(state.isConsumed(currencyConsumer.Id) && !state.isConsumed(this.Id)){
      return { step: this.step, weight: 300 };
    }
  },
  step: function(state, output, pos) {
    if(state.num < 0){
      var
        currencyIndex = state.pos[currencyConsumer.Id],
        currency = output[currencyIndex];

      if(currency[0] === '-'){
        output[currencyIndex] = currency.substr(1);
        output[pos] = '-';
      }
    }
  }
};

byteConsumer = {
  token: 'b',
  ranges: [
    [ 0                , Math.pow(1024, 1), 'B' ],
    [ Math.pow(1024, 1), Math.pow(1024, 2), 'KB' ],
    [ Math.pow(1024, 2), Math.pow(1024, 3), 'MB' ],
    [ Math.pow(1024, 3), Math.pow(1024, 4), 'GB' ],
    [ Math.pow(1024, 4), Math.pow(1024, 5), 'TB' ],
    [ Math.pow(1024, 5), Math.pow(1024, 6), 'PB' ],
    [ Math.pow(1024, 6), Math.pow(1024, 7), 'EB' ],
    [ Math.pow(1024, 7), Math.pow(1024, 8), 'ZB' ],
    [ Math.pow(1024, 8), Infinity         , 'YB' ]
  ],
  consume: function(state){
    if(!state.isConsumed(this.Id)){
      return { step: this.step.bind(this), weight: -200 };
    }
  },
  step: function(state, output, pos){
    var abs = Math.abs(state.num);
    for(var i = 0, len = this.ranges.length; i < len; ++i){
      var range = this.ranges[i];
      if(abs < range[1]){
        output[pos] = range[2];
        state.num /= range[0] || 1;
        state.right = state.num % 1;
        return;
      }
    }
  }
};

percentageConsumer = {
  token: '%',
  consume: function(){
    return { step: this.step, weight: -200 };
  },
  step: function(state, output, pos){
    output[pos] = '%';
    state.num *= 100;
    state.right = state.num % 1;
  }
};

timeConsumer = {
  token: '0',
  priority: -10,
  tokenStr: '00:00:00',
  consume: function(state, input, pos){
    if(input.indexOf(this.tokenStr, pos) === pos){
      return { step: this.step, weight: 200, consumed: this.tokenStr.length - 1 };
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
};

module.exports = [
  leftParenthesisConsumer,
  rightParenthesisConsumer,
  plusConsumer,
  dotConsumer,
  intConsumer,
  sepConsumer,
  abbrConsumer,
  decimalConsumer,
  ordinalConsumer,
  currencyConsumer,
  negCurrencyConsumer,
  byteConsumer,
  percentageConsumer,
  timeConsumer
];