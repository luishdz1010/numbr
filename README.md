numbr
=====
[![Build Status](https://travis-ci.org/sulibautista/numbr.svg)](https://travis-ci.org/sulibautista/numbr)

A simple, fast javascript library for formatting numbers. Based heavily on [Numeral.js](https://github.com/adamwdraper/Numeral-js/)


# Formatting options
Soon. In the meantime, all format strings from http://numeraljs.com/ work as expected.

# Examples
```javascript
var numbr = require('numbr');

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

#Index

**Classes**

* [class: Numbr](#Numbr)
  * [new Numbr(value, [lang])](#new_Numbr)
  * [numbr.format([fmt], [roundFn])](#Numbr#format)
  * [numbr.setLang(lang)](#Numbr#setLang)
  * [numbr.valueOf()](#Numbr#valueOf)
  * [numbr.value()](#Numbr#value)
  * [numbr.set(num)](#Numbr#set)
  * [numbr.clone()](#Numbr#clone)
* [class: CompiledFormat](#CompiledFormat)
  * [new CompiledFormat(steps, opts, sortedPos)](#new_CompiledFormat)
  * [compiledFormat.run(num, roundFn, lang)](#CompiledFormat#run)
* [class: Step](#Step)
  * [new Step(step, weight, [opts], [consumed])](#new_Step)
* [class: Consumer](#Consumer)
  * [new Consumer(tokens, def)](#new_Consumer)

**Namespaces**

* [numbr](#numbr)
  * [numbr.echoConsumer](#numbr.echoConsumer)
  * [numbr.noopConsumer](#numbr.noopConsumer)
  * [numbr.compile(fmt)](#numbr.compile)
  * [numbr.zeroFormat(fmt)](#numbr.zeroFormat)
  * [numbr.defaultFormat(fmt)](#numbr.defaultFormat)
  * [numbr.loadLang(langCode, langDef)](#numbr.loadLang)
  * [numbr.getGlobalLang()](#numbr.getGlobalLang)
  * [numbr.setGlobalLang(langCode)](#numbr.setGlobalLang)
  * [numbr.language([langCode], [langDef])](#numbr.language)
  * [numbr.cacheEnabled(enabled)](#numbr.cacheEnabled)
  * [numbr.setDefaultConsumer(consumer)](#numbr.setDefaultConsumer)
  * [numbr.addConsumer(consumer)](#numbr.addConsumer)
 
<a name="Numbr"></a>
#class: Numbr
**Members**

* [class: Numbr](#Numbr)
  * [new Numbr(value, [lang])](#new_Numbr)
  * [numbr.format([fmt], [roundFn])](#Numbr#format)
  * [numbr.setLang(lang)](#Numbr#setLang)
  * [numbr.valueOf()](#Numbr#valueOf)
  * [numbr.value()](#Numbr#value)
  * [numbr.set(num)](#Numbr#set)
  * [numbr.clone()](#Numbr#clone)

<a name="new_Numbr"></a>
##new Numbr(value, [lang])
A wrapper for numeral-like formatting.
Stores the given value for further formatting.

**Params**

- value `number`  
- \[lang\] `string`  

<a name="Numbr#format"></a>
##numbr.format([fmt], [roundFn])
Formats the wrapped value according to fmt.
By default, the format is compiled into a series of transformations and then cached globally, if you'd like to
disable the caching feature, use [cacheEnabled](#numbr.cacheEnabled).

**Params**

- \[fmt=defaultFormat\] `string`  
- \[roundFn=Math.round\] `function`  

**Returns**: `string` - the formatted number  
<a name="Numbr#setLang"></a>
##numbr.setLang(lang)
Sets the language for this Numbr.
The provided language must be already loaded via [loadLang](#numbr.loadLang).

**Params**

- lang  - the language code  

<a name="Numbr#valueOf"></a>
##numbr.valueOf()
**Returns**: `number`  
<a name="Numbr#value"></a>
##numbr.value()
Access to the wrapped value

**Returns**: `number`  
<a name="Numbr#set"></a>
##numbr.set(num)
Sets the wrapped value

**Params**

- num `number`  

<a name="Numbr#clone"></a>
##numbr.clone()
Returns a new Numbr object with the same value and language as this Numbr.

**Returns**: [Numbr](#Numbr)  
<a name="CompiledFormat"></a>
#class: CompiledFormat
**Members**

* [class: CompiledFormat](#CompiledFormat)
  * [new CompiledFormat(steps, opts, sortedPos)](#new_CompiledFormat)
  * [compiledFormat.run(num, roundFn, lang)](#CompiledFormat#run)

<a name="new_CompiledFormat"></a>
##new CompiledFormat(steps, opts, sortedPos)
A wrapper object for compiled formats.
Objects of this class should not be created directly. Use [compile](#numbr.compile) instead.

**Params**

- steps <code>[Array.&lt;Step&gt;](#Step)</code> - An array of step functions to be called during [run](#CompiledFormat#run)  
- opts `object` - A options object that will be passed to every step function as part of the run state  
- sortedPos `Array.<number>` - An array of output position indexes of each step in steps  

<a name="CompiledFormat#run"></a>
##compiledFormat.run(num, roundFn, lang)
Runs all the transformation step functions using the given number and rounding function.

**Params**

- num  - The number to format  
- roundFn `function` - A rounding function  
- lang `string` - The language code  

**Returns**: `string` - the formatted number  
<a name="Step"></a>
#class: Step
**Members**

* [class: Step](#Step)
  * [new Step(step, weight, [opts], [consumed])](#new_Step)

<a name="new_Step"></a>
##new Step(step, weight, [opts], [consumed])
**Params**

- step `function`  
- weight `number`  
- \[opts\] `object`  
- \[consumed\] `number`  

<a name="Consumer"></a>
#class: Consumer
**Members**

* [class: Consumer](#Consumer)
  * [new Consumer(tokens, def)](#new_Consumer)

<a name="new_Consumer"></a>
##new Consumer(tokens, def)
**Params**

- tokens `string` - A list of characters which will trigger this consumer  
- def `object` - The consumer definition  

<a name="numbr"></a>
#numbr
Function wrapper for creating new Numbr instances, it also has useful static methods to
control the global module behaviour.

All classes can be accessed via numbr.ClassName, e.g. numbr.Numbr, numbr.CompiledFormat, etc.

**Params**

- value `number`  
- \[lang\] `string`  

**Returns**: [Numbr](#Numbr)  
**Members**

* [numbr](#numbr)
  * [numbr.echoConsumer](#numbr.echoConsumer)
  * [numbr.noopConsumer](#numbr.noopConsumer)
  * [numbr.compile(fmt)](#numbr.compile)
  * [numbr.zeroFormat(fmt)](#numbr.zeroFormat)
  * [numbr.defaultFormat(fmt)](#numbr.defaultFormat)
  * [numbr.loadLang(langCode, langDef)](#numbr.loadLang)
  * [numbr.getGlobalLang()](#numbr.getGlobalLang)
  * [numbr.setGlobalLang(langCode)](#numbr.setGlobalLang)
  * [numbr.language([langCode], [langDef])](#numbr.language)
  * [numbr.cacheEnabled(enabled)](#numbr.cacheEnabled)
  * [numbr.setDefaultConsumer(consumer)](#numbr.setDefaultConsumer)
  * [numbr.addConsumer(consumer)](#numbr.addConsumer)

<a name="numbr.echoConsumer"></a>
##numbr.echoConsumer
A simple consumer that echoes back as many characters as possible in one step.
This is the default consumer.

**Type**: [Consumer](#Consumer)  
<a name="numbr.noopConsumer"></a>
##numbr.noopConsumer
A simple consumer that consumes the single character is given and does nothing else.
You can set this consumer as the default by using [setDefaultConsumer](#numbr.setDefaultConsumer)

**Type**: [Consumer](#Consumer)  
<a name="numbr.compile"></a>
##numbr.compile(fmt)
Compiles the given string into a [CompiledFormat](#CompiledFormat) object ready to be used.

**Params**

- fmt `string`  

**Returns**: [CompiledFormat](#CompiledFormat)  
<a name="numbr.zeroFormat"></a>
##numbr.zeroFormat(fmt)
Sets the global zero format.
If defined, the zero format is used as the outout of [format](#Numbr#format) whenever the wrapped value === 0.

**Params**

- fmt   

<a name="numbr.defaultFormat"></a>
##numbr.defaultFormat(fmt)
Sets the default format.
The default format is used if [format](#Numbr#format) is called without arguments. By default, the format is '0.0'.

**Params**

- fmt `string`  

<a name="numbr.loadLang"></a>
##numbr.loadLang(langCode, langDef)
Stores the given language definition with the code langCode.

**Params**

- langCode `string`  
- langDef `object`  

<a name="numbr.getGlobalLang"></a>
##numbr.getGlobalLang()
Access the global language code.

**Returns**: `string`  
<a name="numbr.setGlobalLang"></a>
##numbr.setGlobalLang(langCode)
Sets the global language.

**Params**

- langCode   

<a name="numbr.language"></a>
##numbr.language([langCode], [langDef])
Gets the global language, sets the global language or loads a language.
If called with no arguments, returns the global language.
If called with just the language code, it sets the global language.
If called with both arguments, the language is just loaded.

**Params**

- \[langCode\] `string` - The language code  
- \[langDef\] `object` - A valid language definition  

<a name="numbr.cacheEnabled"></a>
##numbr.cacheEnabled(enabled)
Enables or disables the format cache.
By default every format is compiled into a series of transformation functions that are cached and reused every
time [format](#Numbr#format) is called.

Disabling the cache may cause a significant performance hit and it is not recommended. Most applications will
probably use just a handful of formats, so the memory overhead is non-existent.

**Params**

- enabled `boolean` - Whether to enable or disable the cache  

<a name="numbr.setDefaultConsumer"></a>
##numbr.setDefaultConsumer(consumer)
Sets the default consumer.
The default consumer is used when no other consumer is able to consume a slice of the input format string.
By default, this is [echoConsumer](#numbr.echoConsumer).

**Params**

- consumer <code>[Consumer](#Consumer)</code>  

<a name="numbr.addConsumer"></a>
##numbr.addConsumer(consumer)
Adds a consumer to the list of global consumers.
Consumers are used to translate the string format input into actual transforming steps.

**Params**

- consumer <code>[Consumer](#Consumer)</code>