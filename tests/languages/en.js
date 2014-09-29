var expect = require('chai').expect;
var numbr = require('../../numbr');

describe('language:en', function () {

  before(function () {
    numbr.setGlobalLang('en');
  });

  after(function () {
    numbr.setGlobalLang('en');
  });

  it('format', function () {
    var values = [
      [10000, '0,0.0000', '10,000.0000'],
      [10000.23, '0,0', '10,000'],
      [-10000, '0,0.0', '-10,000.0'],
      [10000.1234, '0.000', '10000.123'],
      [-10000, '(0,0.0000)', '(10,000.0000)'],
      [-0.23, '.00', '-.23'],
      [-0.23, '(.00)', '(.23)'],
      [0.23, '0.00000', '0.23000'],
      [1230974, '0.0a', '1.2m'],
      [1460, '0a', '1k'],
      [-104000, '0a', '-104k'],
      [1, '0o', '1st'],
      [52, '0o', '52nd'],
      [23, '0o', '23rd'],
      [100, '0o', '100th'],
      [1, '0[.]0', '1']
    ];

    for (var i = 0; i < values.length; ++i) {
      expect(numbr(values[i][0]).format(values[i][1])).to.equal(values[i][2], values[i][1]);
    }
  });

  it('currency', function () {
    var values = [
      [1000.234, '$0,0.00', '$1,000.23'],
      [-1000.234, '($0,0)', '($1,000)'],
      [-1000.234, '$0.00', '-$1000.23'],
      [1230974, '($0.00a)', '$1.23m']
    ];

    for (var i = 0; i < values.length; ++i) {
      expect(numbr(values[i][0]).format(values[i][1])).to.equal(values[i][2], values[i][1]);
    }
  });

  it('percentages', function () {
    var values = [
      [1, '0%', '100%'],
      [0.974878234, '0.000%', '97.488%'],
      [-0.43, '0%', '-43%'],
      [0.43, '(0.000%)', '43.000%']
    ];

    for (var i = 0; i < values.length; ++i) {
      expect(numbr(values[i][0]).format(values[i][1])).to.equal(values[i][2], values[i][1]);
    }
  });

/*it('unformat', function(){
    var values = [
            ['10,000.123',10000.123],
            ['(0.12345)',-0.12345],
            ['($1.23m)',-1230000],
            ['10k',10000],
            ['-10k',-10000],
            ['23rd',23],
            ['$10,000.00',10000],
            ['-76%',-0.76],
            ['2:23:57',8637]
        ];

        for (var i = 0; i < values.length; ++i) {
            test.strictEqual(numbr().unformat(values[i][0]), values[i][1], values[i][0]);
        }  });*/
});