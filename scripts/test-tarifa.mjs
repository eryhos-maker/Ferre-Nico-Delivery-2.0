// Prueba la fórmula de Code.gs contra la tabla de comunidades (node scripts/test-tarifa.mjs)
import fs from 'fs'; import vm from 'vm';
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
const t = {}; ctx.TARIFAS_DEFAULT.forEach(([k, v]) => (t[k] = v));
let diffs = [], fails = 0;
const check = (name, cond) => { if (!cond) { fails++; console.log('FALLA:', name); } };
for (const [cp, com, km, min, precio, , , nota] of ctx.COMUNIDADES_DEFAULT) {
  const r = ctx.computePrice(t, { km, minutos: min, monto_compra: 0 });
  diffs.push({ com, km, min, tabla: precio, formula: r.total, dif: r.total - precio, revisar: nota.startsWith('REVISAR') });
}
const ok = diffs.filter(d => !d.revisar);
const mae = ok.reduce((s, d) => s + Math.abs(d.dif), 0) / ok.length;
const bias = ok.reduce((s, d) => s + d.dif, 0) / ok.length;
console.table(diffs.map(d => ({ comunidad: d.com.slice(0, 28), km: d.km, min: d.min, tabla: d.tabla, formula: d.formula, dif: d.dif })));
console.log(`Diferencia promedio: $${mae.toFixed(1)} | sesgo: $${bias.toFixed(1)} | dentro de ±$10: ${ok.filter(d => Math.abs(d.dif) <= 10).length}/${ok.length}`);
// Reglas
const base = { km: 8, minutos: 20 };
check('mínimo $35', ctx.computePrice(t, { km: 0.5, minutos: 2 }).total === 35);
check('gratis ≥5000 y ≤10km', ctx.computePrice(t, { ...base, monto_compra: 5000 }).total === 0);
check('sin gratis si >10km, aplica 50%', ctx.computePrice(t, { km: 12, minutos: 25, monto_compra: 6000 }).descuento > 0 && ctx.computePrice(t, { km: 12, minutos: 25, monto_compra: 6000 }).total > 0);
const full = ctx.computePrice(t, base).total, half = ctx.computePrice(t, { ...base, monto_compra: 1500 }).total;
check('50% desde 1500', Math.abs(half - full / 2) <= 5);
check('urgente +50 sin descuento', ctx.computePrice(t, { ...base, monto_compra: 5000, urgente: true }).total === 50);
check('zona difícil +30', ctx.computePrice(t, { ...base, zona_dificil: 'SI' }).total === full + 30);
check('factor vehículo', ctx.computePrice(t, { ...base, factor: 1.5 }).total > full);
check('autorización >60km', ctx.computePrice(t, { km: 61, minutos: 55 }).requiere_autorizacion === true);
check('redondeo a 5', ctx.computePrice(t, { km: 7.3, minutos: 17 }).total % 5 === 0);
console.log(fails ? `${fails} reglas fallaron` : 'Todas las reglas OK');
process.exit(fails ? 1 : 0);
