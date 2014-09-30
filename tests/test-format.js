"use strict";

var
  mocha = require('mocha'),
  expect = require('chai').expect,
  Numbr = require('../numbr.js').Numbr;

describe('Numbr#format', function(){

  function checkValues(values){
    for(var i = 0; i < values.length; ++i) {
      var
        value = values[i],
        N = new Numbr(value[0]);

      expect(N.format(value[1])).to.equal(value[2]);
    }
  }

  it('should format simple numbers', function(){
    var values = [
        [1000.25, '0,0.0', '1,000.3'],
        [10000,'0,0.0000','10,000.0000'],
        [10000.23,'0,0','10,000'],
        [-10000,'0,0.0','-10,000.0'],
        [10000.1234,'0.000','10000.123'],
        [10000,'0[.]00','10000'],
        [10000.1,'0[.]00','10000.10'],
        [10000.123,'0[.]00','10000.12'],
        [10000.456,'0[.]00','10000.46'],
        [10000.001,'0[.]00','10000'],
        [10000.45,'0[.]00[0]','10000.45'],
        [10000.456,'0[.]00[0]','10000.456'],
        [-10000,'(0,0.0000)','(10,000.0000)'],
        [-12300,'+0,0.0000','-12,300.0000'],
        [1230,'+0,0','+1,230'],
        [100.78, '0', '101'],
        [100.28, '0', '100'],
        [1.932,'0.0','1.9'],
        [1.9687,'0','2'],
        [1.9687,'0.0','2.0'],
        [-0.23,'.00','-.23'],
        [-0.23,'(.00)','(.23)'],
        [0.23,'0.00000','0.23000'],
        [0.67,'0.0[0000]','0.67'],
        [1.99,'0.[0]','2'],
        [1.0501,'0.00[0]','1.05'],
        [2000000000,'0.0a','2.0b'],
        [1230974,'0.0a','1.2m'],
        [1460,'0a','1k'],
        [-104000,'0 a','-104 k'],
        [1,'0o','1st'],
        [52,'0 o','52 nd'],
        [23,'0o','23rd'],
        [100,'0o','100th'],
        [-5444333222111, '0,0 aK', '-5,444,333,222 k'],
        [-5444333222111, '0,0 aM', '-5,444,333 m'],
        [-5444333222111, '0,0 aB', '-5,444 b'],
        [-5444333222111, '0,0 aT', '-5 t'],
        [123456, '0.0[0] aK', '123.46 k']
      ];

    checkValues(values);
  });

  it('should format optional decimals', function () {
    var values = [
      [4510.451, '0.[0]', '4510.5'],
      [1234, '0.[0]', '1234'],
      [1234.2, '0.[0]', '1234.2'],
      [12.451, '.[0]', '.5'],
      [-12.451, '.[0]', '-.5'],
      [12.451, '.[00]', '.45'],
      [-12.451, '.[00]', '-.45']
    ];

    checkValues(values);
  });

  it('should format currency', function(){
    var values = [
      [1000.234,'$0,0.00','$1,000.23'],
      [1001,'$ 0,0.[00]','$ 1,001'],
      [1000.234,'0,0.00 $','1,000.23 $'],
      [-1000.234,'($0,0)','($1,000)'],
      [-1000.234,'(0,0$)','(1,000$)'],
      [-1000.234,'$0.00','-$1000.23'],
      [1230974,'($0.00 a)','$1.23 m'],

      // test symbol position before negative sign / open parens
      [-1000.234,'$ (0,0)','$ (1,000)'],
      [-1000.234,'$(0,0)','$(1,000)'],
      [-1000.234,'$ (0,0.00)','$ (1,000.23)'],
      [-1000.234,'$(0,0.00)','$(1,000.23)'],
      [-1000.238,'$(0,0.00)','$(1,000.24)'],
      [-1000.234,'$-0,0','$-1,000'],
      [-1000.234,'$ -0,0','$ -1,000'],

      [1000.234,'$ (0,0)','$ 1,000'],
      [1000.234,'$(0,0)','$1,000'],
      [1000.234,'$ (0,0.00)','$ 1,000.23'],
      [1000.234,'$(0,0.00)','$1,000.23'],
      [1000.238,'$(0,0.00)','$1,000.24'],
      [1000.234,'$-0,0','$1,000'],
      [1000.234,'$ -0,0','$ 1,000']
    ];

    checkValues(values);
  });

  it('should format bytes', function(){
    var values = [
      [100,'0b','100B'],
      [1024*2,'0 b','2 KB'],
      [1024*1024*5,'0b','5MB'],
      [1024*1024*1024*7.343,'0.[0] b','7.3 GB'],
      [1024*1024*1024*1024*3.1536544,'0.000b','3.154TB'],
      [1024*1024*1024*1024*1024*2.953454534534,'0b','3PB']
    ];

    checkValues(values);
  });

  it('should format percentages', function(){
    var values = [
      [1,'0%','100%'],
      [0.974878234,'0.000%','97.488%'],
      [-0.43,'0 %','-43 %'],
      [0.43,'(0.00[0]%)','43.00%'],
      [0.43,'(0.00[0]%)','43.00%'],
      [1, '%0', '%100'],
      [-1, '% -0', '% -100'],
      [0.43, '%0', '%43'],
      [-0.43, '-%0', '-%43'],
      [-0.43, '%-0', '%-43']
    ];

    checkValues(values);
  });

  it('should floor and ceil numbers correctly', function(){
    var values = [
      // value, format string, expected w/ floor, expected w/ ceil
      [2280002, '0.00a', '2.28m', '2.29m'],
      [10000.23, '0,0', '10,000', '10,001'],
      [1000.234, '$0,0.00', '$1,000.23', '$1,000.24'],
      [0.974878234, '0.000%', '97.487%', '97.488%'],
      [-0.433, '0 %', '-44 %', '-43 %']
    ];

    for(var i = 0; i < values.length; ++i) {
      var
        value = values[1],
        N = new Numbr(value[0]);

      expect(N.format(value[1], Math.floor)).to.equal(value[2]);
      expect(N.format(value[1], Math.ceil)).to.equal(value[3]);
    }
  });

  it('should format times', function(){
    var values = [
      [25, '00:00:00', '0:00:25'],
      [238, '00:00:00', '0:03:58'],
      [63846, '00:00:00', '17:44:06']
    ];

    checkValues(values);
  });

  it('should echo non-format tokens', function(){
    var values = [
      [2342, 'cdefghijklmnpqrstuvwxyz', 'cdefghijklmnpqrstuvwxyz'],
      [2341, 'cdefghijkl0,0.00mnpqrsuvwxyz', 'cdefghijkl2,341.00mnpqrsuvwxyz'],
      [123, 'And the Answer is: 0[.][00]', 'And the Answer is: 123'],
      [1234, '!"#&/=\\\'?¡¿_{}^|<>/', '!"#&/=\\\'?¡¿_{}^|<>/'],
      [33.7, '(L0.0 ME) WIN $', 'L33.7 ME WIN $']
    ];

    checkValues(values);
  });
});