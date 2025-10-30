/** @type {import('../util/solve')} */
const { solve } = require('../util/solve');

const t = require('tap');

class Logic {
 A() {
  return 10;
 }
 async B() {
  const a = await solve(this, r => r.A);
  return {
    C: a * 2
  }
 }
 async C() {
  const parent = this;
  return {
    D: {
      E: async () => {
        const b = await solve(parent, r => r.B.C);
        return `Answer is: ${b}`;
      }
    }
  }
 }
 F() {
  return {
    $property: string => ({
      G: () => `Value is: ${string}`
    })
  }
 }
}

t.test('Solve works',async t => {
  const logic = new Logic();
  const c = await solve(logic, r => r.B.C);
  const txt = await solve(logic, r => r.C.D.E);
  const g = await solve(logic, r => r.F['Test'].G);
  //@ts-expect-error
  const notfound = await solve(logic, r => r.X.Y.Z)
  .catch(Object);

  t.same(c, 20, 'resolves B.C');
  t.same(txt, 'Answer is: 20', 'resolves C.D.E');
  t.same(notfound.message, 'X not defined', 'handles not found');
  t.same(g, 'Value is: Test', 'resolves F.Test.G');
});

t.test('Solve with multiple paths works',async t => {
  const logic = new Logic();
  const [c, txt] = await solve(logic, r => [
    r.B.C,
    r.C.D.E
  ]);

  t.same(c, 20, 'resolves B.C');
  t.same(txt, 'Answer is: 20', 'resolves C.D.E');
});
