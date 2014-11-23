var clues = require("../clues"),
    assert = require("assert");

describe('calling clues from prototype',function() {
  var c = clues({value:function() { return 1;}});
  it('returns a new clues object',function() {
    var d = c.clues();
    assert(d.facts.value === undefined);
  });
});