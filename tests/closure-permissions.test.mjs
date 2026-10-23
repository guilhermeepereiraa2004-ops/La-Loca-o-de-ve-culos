import test from 'node:test';
import assert from 'node:assert/strict';
import { assertClosurePermissions } from '../src/lib/closurePermissions.js';

const staff = (...modules) => ({ role: 'funcionario', modules });
const denies = (profile, data, module, options) => assert.throws(
  () => assertClosurePermissions(profile, data, options),
  (error) => error.code === '42501' && error.message.includes(module),
);

test('every closure requires Locação, including empty and financially authorized requests', () => {
  for (const profile of [null, {}, staff(), staff('financeiro', 'faturamento', 'multas'), { role: 'investidor', modules: ['locacao'] }]) {
    denies(profile, {}, 'Locação');
  }
});

test('Locação alone can close without financial writes, including unpaid amounts with no offsets', () => {
  for (const data of [undefined, {}, { caucaoAvailable: 500 }, {
    caucaoAvailable: 0, unpaidCyclesList: [{ debtValue: 100 }], unpaidFinesList: [{ value: 50 }],
    manualDebts: [{ value: 25 }], inspectionDetails: [{ value: 10 }], isEarlyTermination: true, earlyTerminationPenalty: 40,
  }, { caucaoAvailable: 100, unpaidCyclesList: [{ debtValue: 0 }], manualDebts: [{ value: -5 }], inspectionDetails: [],
    unpaidFinesList: [{ value: 60, installments: 2, paidInstallments: [1, 2] }], earlyTerminationPenalty: 50, isEarlyTermination: false }]) {
    assert.equal(assertClosurePermissions(staff('locacao'), data), true);
  }
});

test('manual rental payment needs a finance module before any closure write', () => {
  const data = { unpaidRentalsMarkedAsPaid: true, unpaidCyclesList: [{ debtValue: '100.50' }] };
  denies(staff('locacao', 'caucao', 'vistoria'), data, 'Financeiro ou Faturamento');
  for (const module of ['financeiro', 'faturamento']) assert.equal(assertClosurePermissions(staff('locacao', module), data), true);
  assert.equal(assertClosurePermissions(staff('locacao'), { ...data, unpaidCyclesList: [{ debtValue: 0 }] }), true);
});

test('each positive deposit offset needs Financeiro or Faturamento, without cross-module substitutes', () => {
  const offsets = [
    { unpaidCyclesList: [{ debtValue: 100 }] }, { manualDebts: [{ value: 'R$ 1.200,50' }] },
    { inspectionDetails: [{ value: 30 }] }, { isEarlyTermination: true, earlyTerminationPenalty: 50 },
  ];
  for (const offset of offsets) {
    const data = { caucaoAvailable: 1, ...offset };
    denies(staff('locacao', 'caucao', 'vistoria', 'multas'), data, 'Financeiro ou Faturamento');
    for (const module of ['financeiro', 'faturamento']) assert.equal(assertClosurePermissions(staff('locacao', module), data), true);
  }
});

test('active replacement requires financial access even with no debt or deposit', () => {
  denies(staff('locacao', 'oficina'), {}, 'Financeiro ou Faturamento', { hasActiveReplacement: true });
  assert.equal(assertClosurePermissions(staff('locacao', 'faturamento'), {}, { hasActiveReplacement: true }), true);
  assert.equal(assertClosurePermissions(staff('locacao'), {}, { hasActiveReplacement: false }), true);
});

test('fine offsets require both a financial module and Multas, including partial remaining installments', () => {
  const data = { caucaoAvailable: 1, unpaidFinesList: [{ value: 200, installments: 2, installmentValue: 100, paidInstallments: [1] }] };
  denies(staff('locacao', 'multas'), data, 'Financeiro ou Faturamento');
  for (const module of ['financeiro', 'faturamento']) {
    denies(staff('locacao', module), data, 'Multas');
    assert.equal(assertClosurePermissions(staff('locacao', module, 'multas'), data), true);
  }
  assert.equal(assertClosurePermissions(staff('locacao'), { ...data, caucaoAvailable: 0 }), true);
});

test('administrator can close every combined operation without assigned modules and inputs remain unchanged', () => {
  const data = { caucaoAvailable: 400, unpaidRentalsMarkedAsPaid: true, unpaidCyclesList: [{ debtValue: 100 }],
    unpaidFinesList: [{ value: 50 }], manualDebts: [{ value: 25 }], inspectionDetails: [{ value: 10 }],
    isEarlyTermination: true, earlyTerminationPenalty: 40 };
  const original = structuredClone(data);
  assert.equal(assertClosurePermissions({ role: 'administrador', modules: [] }, data, { hasActiveReplacement: true }), true);
  assert.deepEqual(data, original);
});
