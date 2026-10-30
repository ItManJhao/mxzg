/** Temporary, reversible authoring edits for the real preview/build acceptance.
 * Never changes business data. Restore preserves any concurrent edits outside the probe.
 */
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const source = resolve(__dirname, '../assets/prefabs/ui/hero/HeroSelectLayer.prefab');
const output = resolve(__dirname, '../temp/project-checks');
const recordPath = resolve(output, 'formation-authoring-probe.json');
const backup = resolve(output, 'formation-authoring-original.prefab');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const parse = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
function fields(data) {
    const view = data.find(row => row.__type__ === '77ec6KxuNlI5K7+yRC3EvV0');
    const title = data[view.titleLabel.__id__];
    const button = data[data[view.confirmButton.__id__].node.__id__];
    return { titleFontSize: [title,'_fontSize'], confirmX: [button._lpos,'x'], confirmY: [button._lpos,'y'],
        columns: [view,'columns'], stepX: [view.cellStep,'x'], stepY: [view.cellStep,'y'] };
}
function values(data) { return Object.fromEntries(Object.entries(fields(data)).map(([key,[object,property]]) => [key,object[property]])); }
function expected(name, bytes) {
    writeFileSync(resolve(output,name), JSON.stringify({...values(parse(bytes)),prefabSha256:hash(bytes),
        cellSha256:hash(readFileSync(resolve(__dirname,'../assets/prefabs/ui/hero/HeroIconCell.prefab'))),
        requireVisibleStars:name.includes('final')},null,2)+'\n');
}
mkdirSync(output,{recursive:true});
if (process.argv[2] === 'apply') {
    if (existsSync(recordPath) && parse(readFileSync(recordPath)).active) throw Error('A formation probe is already active; restore it first.');
    const original = readFileSync(source), data = parse(original), before = values(data);
    const probe = {titleFontSize:before.titleFontSize>24?before.titleFontSize-12:before.titleFontSize+12,
        confirmX:before.confirmX+24,confirmY:before.confirmY+12,columns:before.columns===2?3:2,
        stepX:before.stepX+12,stepY:before.stepY+18};
    for (const [key,[object,property]] of Object.entries(fields(data))) object[property]=probe[key];
    const bytes = Buffer.from(JSON.stringify(data,null,2)+'\n');
    writeFileSync(backup,original);
    writeFileSync(recordPath,JSON.stringify({active:true,original:before,probe,originalHash:hash(original),probeHash:hash(bytes)},null,2)+'\n');
    writeFileSync(source,bytes);
    expected('formation-probe-expected.json',bytes);
    console.log('APPLIED temporary Inspector values:',probe);
} else if (process.argv[2] === 'restore') {
    const record = parse(readFileSync(recordPath)), current = readFileSync(source);
    if (!record.active) throw Error('No active formation probe to restore.');
    if (hash(current) === record.probeHash) {
        writeFileSync(source,readFileSync(backup));
    } else {
        const data = parse(current), changes = fields(data);
        for (const [key,[object,property]] of Object.entries(changes)) {
            if (object[property] === record.probe[key]) object[property]=record.original[key];
            else if (object[property] !== record.original[key]) console.log('PRESERVED concurrent edit:',key,object[property]);
        }
        writeFileSync(source,JSON.stringify(data,null,2)+'\n');
    }
    record.active=false;
    writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n');
    expected('formation-final-expected.json',readFileSync(source));
    console.log('RESTORED probe fields; final expected layout recorded.');
} else if (process.argv[2] === 'capture') {
    expected('formation-final-expected.json',readFileSync(source));
    console.log('CAPTURED current authoring values without editing the Prefab.');
} else {
    throw Error('Usage: node client/tools/formation-authoring-probe.cjs apply|restore|capture');
}
