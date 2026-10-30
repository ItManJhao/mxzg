/** Reversible source Inspector fixture, not player data or an asset generator. */
const fs=require('node:fs');const path=require('node:path');const {createHash}=require('node:crypto');
const file=path.resolve(__dirname,'../assets/prefabs/ui/backpack/BackpackLayer.prefab');
const output=path.resolve(__dirname,'../temp/project-checks');fs.mkdirSync(output,{recursive:true});
const recordFile=path.join(output,'backpack-authoring-probe.json'),backup=path.join(output,'backpack-authoring-original.prefab');
const parse=bytes=>JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const component=data=>data.find(row=>'overrideCellSize'in row);
const properties={layoutType:'layoutType',gridAxis:'gridAxis',columns:'columns',rows:'rows',spacingX:'_spacingX',spacingY:'_spacingY',
    paddingLeft:'_paddingLeft',paddingRight:'_paddingRight',paddingTop:'_paddingTop',paddingBottom:'_paddingBottom'};
const values=data=>Object.fromEntries(Object.entries(properties).map(([key,field])=>[key,component(data)[field]]));
function capture(name,bytes){fs.writeFileSync(path.join(output,name),JSON.stringify(values(parse(bytes)),null,2)+'\n');}
switch(process.argv[2]) {
case 'apply': {
    if(fs.existsSync(recordFile)&&parse(fs.readFileSync(recordFile)).active)throw Error('Restore the active bag probe first.');
    const original=fs.readFileSync(file),data=parse(original),before=values(data);
    const probe={...before,columns:before.columns===3?4:3,spacingX:30,spacingY:18,paddingLeft:24,paddingRight:24,paddingTop:18,paddingBottom:26};
    for(const[key,field]of Object.entries(properties))component(data)[field]=probe[key];
    const bytes=Buffer.from(JSON.stringify(data,null,2)+'\n');
    fs.writeFileSync(backup,original);fs.writeFileSync(recordFile,JSON.stringify({active:true,before,probe,sourceHash:hash(original),probeHash:hash(bytes)},null,2)+'\n');
    fs.writeFileSync(file,bytes);capture('backpack-probe-expected.json',bytes);console.log('APPLIED source Inspector probe',probe);break;
}
case 'restore': {
    const record=parse(fs.readFileSync(recordFile));if(!record.active)throw Error('No active bag probe.');
    const bytes=fs.readFileSync(file);
    if(hash(bytes)===record.probeHash)fs.writeFileSync(file,fs.readFileSync(backup));
    else {
        const data=parse(bytes),row=component(data);
        for(const[key,field]of Object.entries(properties)) {
            if(row[field]===record.probe[key])row[field]=record.before[key];
            else if(row[field]!==record.before[key])console.log('PRESERVED concurrent edit',key,row[field]);
        }
        fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
    }
    record.active=false;fs.writeFileSync(recordFile,JSON.stringify(record,null,2)+'\n');capture('backpack-final-expected.json',fs.readFileSync(file));console.log('RESTORED probe fields');break;
}
case 'capture':capture('backpack-final-expected.json',fs.readFileSync(file));console.log('CAPTURED without editing');break;
default:throw Error('Usage: node client/tools/backpack-authoring-probe.cjs apply|restore|capture');
}
