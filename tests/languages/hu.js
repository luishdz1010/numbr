var expect = require('chai').expect;
var numbr = require('../../numbr'),
    language = require('../../languages/hu');

numbr.language('hu', language);

describe('language:hu', function () {

  before(function () {
    numbr.setGlobalLang('hu');
  });

  after(function () {
    numbr.setGlobalLang('en');
  });

  it('format', function () {
    var values = [
      [10000, '0,0.0000', '10 000,0000'],
      [10000.23, '0,0', '10 000'],
      [-10000, '0,0.0', '-10 000,0'],
      [10000.1234, '0.000', '10000,123'],
      [-10000, '(0,0.0000)', '(10 000,0000)'],
      [-0.23, '.00', '-,23'],
      [-0.23, '(.00)', '(,23)'],
      [0.23, '0.00000', '0,23000'],
      [1230974, '0.0a', '1,2M'],
      [1460, '0a', '1E'],
      [-104000, '0a', '-104E'],
      [1, '0o', '1.'],
      [52, '0o', '52.'],
      [23, '0o', '23.'],
      [100, '0o', '100.'],
      [1, '0[.]0', '1']
    ];

    for (var i = 0; i < values.length; ++i) {
      expect(numbr(values[i][0]).format(values[i][1])).to.equal(values[i][2], values[i][1]);
    }
  });

  it('currency', function () {
    var values = [
      [1000.234, '0,0.00$', '1 000,23 Ft'],
      [-1000.234, '(0,0$)', '(1 000 Ft)'],
      [-1000.234, '0.00$', '-1000,23 Ft'],
      [1230974, '(0.00a$)', '1,23M Ft']
    ];

    for (var i = 0; i < values.length; ++i) {
      expect(numbr(values[i][0]).format(values[i][1])).to.equal(values[i][2], values[i][1]);
    }
  });

  it('percentages', function () {
    var values = [
      [1, '0%', '100%'],
      [0.974878234, '0.000%', '97,488%'],
      [-0.43, '0%', '-43%'],
      [0.43, '(0.000%)', '43,000%']
    ];

    for (var i = 0; i < values.length; ++i) {
      expect(numbr(values[i][0]).format(values[i][1])).to.equal(values[i][2], values[i][1]);
    }
  });

/*it('unformat', function(){
    var values = [
            ['10 000,123',10000.123],
            ['(0,12345)',-0.12345],
            ['(1,23M Ft)',-1230000],
            ['10E',10000],
            ['-10E',-10000],
            ['23.',23],
            ['10 000,00 Ft',10000],
            ['-76%',-0.76],
            ['2:23:57',8637]
        ];

        for (var i = 0; i < values.length; ++i) {
            test.strictEqual(numbr().unformat(values[i][0]), values[i][1], values[i][0]);
        }  });*/
});