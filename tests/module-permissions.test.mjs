import test from 'node:test';
import assert from 'node:assert/strict';
import { canOperateModule } from '../src/lib/modulePermissions.js';

test('only administrator or assigned staff/manager can operate a known business module',()=>{
  const modules=['frota','leads','locacao','clientes','investidores','financeiro','faturamento','caucao','manutencaoAdmin','vistoria','multas','oficina','avisos'];
  for(const module of modules){
    assert.equal(canOperateModule({role:'administrador',modules:[]},module),true);
    for(const role of ['funcionario','gerente']){
      assert.equal(canOperateModule({role,modules:[module]},module),true);
      assert.equal(canOperateModule({role,modules:[]},module),false);
      assert.equal(canOperateModule({role,modules:['unknown']},module),false);
    }
  }
});

test('Avisos assignment grants notice operation without investor or account privileges',()=>{
  const profile={role:'funcionario',modules:['avisos']};
  assert.equal(canOperateModule(profile,'avisos'),true);
  for(const module of ['investidores','financeiro','usuarios','system_users']) assert.equal(canOperateModule(profile,module),false);
  assert.equal(canOperateModule({role:'funcionario',modules:['investidores']},'avisos'),false);
});

test('anonymous, investor, forged/unknown roles and read-only/unknown modules cannot gain write controls',()=>{
  for(const profile of [null,undefined,{}, {role:'admin',modules:['locacao']},{role:'investidor',modules:['locacao']},{role:'funcionario',modules:'locacao'},{role:'funcionario',modules:['multas']}, {role:'funcionario',isAdmin:true,modules:[]}]){
    assert.equal(canOperateModule(profile,'locacao'),false);
  }
  for(const module of ['logs','bi','system_users','unknown','constructor','__proto__',null,undefined]){
    assert.equal(canOperateModule({role:'administrador',modules:[module]},module),false);
  }
});
