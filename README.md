numbr
=====
[![Build Status](https://travis-ci.org/sulibautista/numbr.svg)](https://travis-ci.org/sulibautista/numbr)

A simple, fast javascript library for formatting numbers. Based heavily on [Numeral.js](https://github.com/adamwdraper/Numeral-js/)


# Formatting options
Soon. In the meantime, all format strings from http://numeraljs.com/ work as expected.

# Example
```javascript
var numbr = require('number');

numbr(1000.25).format('0,0.0');
// 1,000.3
```

```javascript
// Global language
var fr = require('numbr/languages/fr');
numbr.loadLang('fr', fr);
numbr.setGlobalLang('fr');
numbr(1000.234).format('$0,0.00');
// €1 000,23
```

```javascript
// Reuse a format
var fmt = numbr.compile('$ 0,0[.]00');
fmt.run(1001);
// $ 1,001
```

```javascript
// Per-instance language, all output '1er'
var num = numbr(1);
num.setLang('es');
num.format('0o');

numbr(1, 'es').format('0o');

var fmt = numbr.compile('0o');
fmt.run(1, null, 'es');
```

```javascript
// Custom round function
numbr(2280002).format('0.00a', Math.ceil);
// 2.29m
```

```javascript
// Add custom formatting options
var boolConsumer = new numbr.Consumer('&', {
  // null means use the step below, 0 means 'normal weight' i.e. I don't care about the execution order of this step
  consume: new numbr.Step(null, 0), 
  step: function(state, output, pos){
    output[pos] = !!state.num? 'true' : 'false';
  }
});

numbr.addConsumer(boolConsumer);

numbr(1).format('0 is &');
// 1 is true
numbr(0).format('0 is &');
// 0 is false
```

# Why duplicate Numeral.js?
Because I needed faster formatting times and extensibility for a project I am working on.

# License
MIT
