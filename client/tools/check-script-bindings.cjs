/** 全库 Prefab/Scene 绑定检查：沿用原 Python 规则，使用项目已有 Node 运行，避免依赖 Windows Python 占位程序。 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** 校验并压缩脚本 UUID；5 位前缀用于类 ID，2 位前缀只用于识别旧错误格式。 */
function compress(uuid, reserved) {
  const hex = uuid.replaceAll('-', '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error('无效脚本 UUID: ' + uuid);
  let out = hex.slice(0, reserved);
  for (let i = reserved; i < hex.length; i += 3) {
    const value = parseInt(hex.slice(i, i + 3), 16);
    out += alphabet[value >> 6] + alphabet[value & 63];
  }
  return out;
}
/** 递归收集文件，检查范围包括全部 assets，不限于当前业务模块。 */
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? entry.name === '.git' ? [] : files(full) : [full];
  });
}
/** 递归检查序列化类型，包括嵌套对象；数字和 cc.* 保留为引擎内置类型。 */
function checkTypes(value, classes, errors, bindings) {
  if (!value || typeof value !== 'object') return;
  if (Object.hasOwn(value, '__type__')) {
    const type = value.__type__;
    const builtin = Number.isInteger(type) || typeof type === 'string' && (type.startsWith('cc.') || /^\d+$/.test(type));
    if (!builtin) {
      if (typeof type !== 'string' || type.length !== 23 || !classes.has(type)) errors.push('未解析或旧格式脚本类型: ' + String(type));
      else bindings.push(type);
    }
  }
  for (const child of Object.values(value)) checkTypes(child, classes, errors, bindings);
}
/** 检查按钮引用必须指向同一序列化文件中的 Node，而不是组件或越界索引。 */
function checkButtons(data, errors) {
  if (!Array.isArray(data)) return;
  data.forEach((row, index) => {
    if (row?.__type__ !== 'cc.Button' || row._target == null) return;
    const id = row._target.__id__;
    if (!Number.isInteger(id) || data[id]?.__type__ !== 'cc.Node') errors.push('Button[' + index + '] target 不是 cc.Node');
  });
}
/** 固定压缩锚点及反例，防止检查器放过 22 位 ID、未知类或错误按钮引用。 */
function selfTest() {
  for (const [uuid, packed, legacy] of [
    ['7a774133-36cb-47c5-9fca-3c6664370c6c','7a774EzNstHxZ/KPGZkNwxs','7ad0EzNstHxZ/KPGZkNwxs'],
    ['c4e8a1d2-7b63-4e90-8f15-6a2d9c0b47e3','c4e8aHSe2NOkI8Vai2cC0fj','c46KHSe2NOkI8Vai2cC0fj'],
    ['266a134c-7061-4e2c-852d-74d2385fe11a','266a1NMcGFOLIUtdNI4X+Ea','26ahNMcGFOLIUtdNI4X+Ea'],
  ]) {
    assert.equal(compress(uuid,5),packed); assert.equal(compress(uuid,2),legacy);
    const errors=[], bindings=[];
    checkTypes([{__type__:packed},{nested:{__type__:legacy}},{__type__:'unknown'},{__type__:true},{__type__:'cc.Node'},{__type__:123}],new Set([packed]),errors,bindings);
    assert.equal(bindings.length,1); assert.equal(errors.length,3);
  }
  const errors=[];
  checkButtons([{__type__:'cc.Node'},{__type__:'cc.Button',_target:{__id__:0}},{__type__:'cc.Button',_target:{__id__:1}},{__type__:'cc.Button',_target:{__id__:99}}],errors);
  assert.equal(errors.length,2);
  assert.throws(()=>compress('broken',5));
}
/** 全库扫描脚本元数据与所有预制体/场景；任何失败均返回非零退出码。 */
function main() {
  selfTest();
  const all = files(path.join(root,'client/assets')), classes = new Map();
  for (const file of all.filter(p=>/\.(ts|js)\.meta$/.test(p))) {
    const meta = JSON.parse(fs.readFileSync(file,'utf8'));
    if (!['typescript','javascript'].includes(meta.importer)) continue;
    if (!fs.existsSync(file.slice(0,-5))) throw new Error('脚本源文件缺失: ' + file);
    const id = compress(meta.uuid || '',5);
    if (classes.has(id)) throw new Error('脚本 UUID 重复: ' + file + ' / ' + classes.get(id));
    classes.set(id,path.relative(root,file));
  }
  const errors=[], bindings=[];
  const assets = all.filter(p=>/\.(prefab|scene)$/.test(p));
  for (const file of assets) {
    const data=JSON.parse(fs.readFileSync(file,'utf8')), local=[];
    checkTypes(data,classes,local,bindings); checkButtons(data,local);
    errors.push(...local.map(message=>path.relative(root,file)+': '+message));
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`PASS 全库绑定：${classes.size} 个脚本，${assets.length} 个 Prefab/Scene，${bindings.length} 处脚本绑定；无旧格式/未知类/无效按钮目标。检查器反例通过。`);
}
try { main(); } catch (error) { console.error(error.message); process.exitCode=1; }
