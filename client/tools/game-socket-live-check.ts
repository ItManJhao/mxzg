/** 真实 TS→Java 联调，仅对核验运行标识的独立测试后端验证登录、同步及免费首抽。 */
import {strict as assert} from "node:assert";
import {randomUUID} from "node:crypto";
import {GameSocketClient} from "../assets/scripts/platform/GameSocketClient";
import { GAME_SOCKET_PROTOCOL } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol, type ProtocolName } from "../assets/scripts/platform/Protocol";
import { ProtocolStateUtils } from "../assets/scripts/platform/ProtocolStateUtils";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import {AccountModel} from "../assets/scripts/features/account/AccountModel";
import {AccountService} from "../assets/scripts/features/account/AccountService";
import {RoleController} from "../assets/scripts/features/account/RoleController";
import {BagController} from "../assets/scripts/features/bag/BagController";
import {BagModel} from "../assets/scripts/features/bag/BagModel";
import { BagItemDataUtils } from "../assets/scripts/features/bag/data/BagItemDataUtils";
import {AssetStateBinding} from "../assets/scripts/app/remake/AssetStateBinding";
import type { HeroLevelReceipt } from "../assets/scripts/features/hero/data/HeroLevelData";
/** 等待真实连接状态，超时明确失败。 */
async function until(check:()=>boolean):Promise<void>{for(let i=0;i<300;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail("真实客户端状态超时");}
/** 装配真实模块，只有网络适配为 Node 原生 WebSocket。 */
function fixture(port:string){
 const account=new AccountModel(),model=new BagModel(),bag=new BagController(model),wires:WebSocket[]=[];
 const socket=new GameSocketClient("ws://127.0.0.1:"+port+"/api/v1/game/socket",{
  create:url=>{const wire=new WebSocket(url,GAME_SOCKET_PROTOCOL);wires.push(wire);return wire;},retryDelay:()=>20,
  validateSnapshot:value=>{const row=value as any;AccountApi.readRole(row.role);BagItemDataUtils.readBagItems(row.inventory);assert(Number.isSafeInteger(row.revision));},
 });
 const service=new AccountService(account,new AccountApi(socket),{read:()=>null,write:()=>{},clear:()=>{}});
 bag.initialize();const role=new RoleController(value=>service.acceptRole(value)),assets=new AssetStateBinding(account,bag,role);
 service.onInitialized=frame=>assets.apply(frame);socket.onState=frame=>assets.apply(frame);
 socket.onReady=()=>{if(account.snapshot.role && socket.latestState)assets.apply(socket.latestState);};
 socket.onRejected=(token,message)=>service.rejectSession(token,message);
 return {service,account,model,socket,wires,stop:()=>{socket.onReady=socket.onState=socket.onRejected=null;socket.disconnect();assets.dispose();bag.dispose();}};
}
/** 用真实两端编解码验证首次发放、提交状态、原回执重放及重新登录。 */
async function checkFirstSummon(client: ReturnType<typeof fixture>): Promise<void> {
    const account = "summon_" + randomUUID().slice(0, 12);
    const readState = () => {
        const frame = client.socket.latestState;
        assert(frame);
        return ProtocolStateUtils.statePayload(frame.name as ProtocolName, frame.body);
    };
    const request = (name: typeof Protocol.HERO_FIRST_SUMMON | typeof Protocol.HERO_FIRST_SUMMON_STATUS,
        requestId: string) => client.service.authenticated(token => client.socket.firstSummon(token, name, requestId));

    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    const initial = readState();
    assert.deepEqual(initial.heroes, []);
    assert.deepEqual(initial.heroSummon, { schemaVersion: 1, firstNormalCompleted: false, normalFreeAtSeconds: 0 });
    const requestId = randomUUID();
    const receipt = (await request(Protocol.HERO_FIRST_SUMMON, requestId)).body as Record<string, unknown>;
    assert.equal(receipt.requestId, requestId);
    assert.equal(receipt.roleId, client.account.snapshot.role!.id);
    await until(() => readState().revision === receipt.assetRevision);
    const committed = readState();
    assert.deepEqual(committed.heroSummon, receipt.state);
    const heroes = committed.heroes as { templateId: number; star: number; level: number }[];
    assert.equal(heroes.length, 1);
    assert.equal(heroes[0].templateId, 10304012);
    assert.equal(heroes[0].star, 4);
    assert.equal(heroes[0].level, 1);
    assert.equal(client.model.items.find(item => item.itemId === 900302)?.quantity, 1);
    assert.equal(client.model.items.some(item => item.itemId === 900201), false);
    assert.deepEqual((await request(Protocol.HERO_FIRST_SUMMON, requestId)).body, receipt);

    client.service.logout();
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    assert.deepEqual(readState().heroes, committed.heroes);
    assert.deepEqual(readState().heroSummon, committed.heroSummon);
    assert.deepEqual((await request(Protocol.HERO_FIRST_SUMMON_STATUS, requestId)).body,
        { requestId, found: true, receipt });
    const unknownId = randomUUID();
    assert.deepEqual((await request(Protocol.HERO_FIRST_SUMMON_STATUS, unknownId)).body,
        { requestId: unknownId, found: false });
    assert.equal(readState().revision, receipt.assetRevision);
    await checkAfterFirstBattle(client, readState, account);
}

/** 从实际首抽结果出阵，验证装备、合成、升级扣费及冷重登原回执。 */
async function checkAfterFirstBattle(client: ReturnType<typeof fixture>, readState: () => Record<string, unknown>,
    account: string): Promise<void> {
    const formation = readState().mainFormation as { version: number; formationId: number };
    const [hero] = readState().heroes as { id: string }[];
    const chapter = (name: Parameters<GameSocketClient["chapter"]>[1], input: unknown) =>
        client.service.authenticated(token => client.socket.chapter(token, name, input));
    const fragment = (name: Parameters<GameSocketClient["combineHeroFragments"]>[1], input: unknown) =>
        client.service.authenticated(token => client.socket.combineHeroFragments(token, name, input));
    const upgrade = (name: Parameters<GameSocketClient["heroLevel"]>[1], input: unknown) =>
        client.service.authenticated(token => client.socket.heroLevel(token, name, input));
    const quantity = (itemId: number) => client.model.items.find(item => item.itemId === itemId)?.quantity ?? 0;

    await assert.rejects(chapter(Protocol.CHAPTER_FIRST_REWARD_CLAIM, { chapter: 1 }), { code: "FIRST_REWARD_NOT_REACHED" });
    await client.service.authenticated(token => client.socket.saveFormation(token, {
        requestId: randomUUID(), expectedVersion: formation.version, formationId: formation.formationId,
        slots: [{ position: 2, heroId: hero.id }],
    }));
    const fight = (await chapter(Protocol.CHAPTER_CHALLENGE, { requestId: randomUUID() })).body as { battleId: string };
    await chapter(Protocol.CHAPTER_CLAIM, { battleId: fight.battleId });
    await until(() => quantity(20204004) === 30);

    const first = (await chapter(Protocol.CHAPTER_FIRST_REWARD_CLAIM, { chapter: 1 })).body as { assetRevision: number };
    await until(() => Number(readState().revision) >= first.assetRevision);
    assert(quantity(1001001) === 1 && quantity(1002001) === 1);
    assert.equal(quantity(20204004), 30);
    assert.deepEqual((await chapter(Protocol.CHAPTER_FIRST_REWARD_CLAIM, { chapter: 1 })).body, first);
    const requestId = randomUUID();
    const input = { requestId, itemId: 20204004, quantity: 1 };
    const combined = (await fragment(Protocol.HERO_FRAGMENT_COMBINE, input)).body as { assetRevision: number; costQuantity: number };
    assert.equal(combined.costQuantity, 30);
    await until(() => Number(readState().revision) >= combined.assetRevision);
    assert.equal(quantity(20204004), 0);
    const heroes = readState().heroes as { templateId: number }[];
    assert(heroes.some(entry => entry.templateId === 10204004));
    assert.equal(heroes.length, 2);
    assert.deepEqual((await fragment(Protocol.HERO_FRAGMENT_COMBINE, input)).body, combined);

    const upgradeInput = { requestId: randomUUID(), heroId: hero.id, expectedLevel: 1, levels: 5 };
    assert.equal(client.account.snapshot.role!.gold, 4000);
    assert.equal(quantity(900101), 500);
    const upgraded = (await upgrade(Protocol.HERO_LEVEL_UPGRADE, upgradeInput)).body as HeroLevelReceipt;
    assert.equal(upgraded.fromLevel, 1);
    assert.equal(upgraded.toLevel, 6);
    assert.equal(upgraded.roleId, client.account.snapshot.role!.id);
    await until(() => Number(readState().revision) >= upgraded.assetRevision);
    assert.equal(client.account.snapshot.role!.gold, 3590);
    assert.equal(quantity(900101), 395);
    assert.equal((readState().heroes as { id: string; level: number }[]).find(row => row.id === hero.id)?.level, 6);
    assert.deepEqual((await upgrade(Protocol.HERO_LEVEL_UPGRADE, upgradeInput)).body, upgraded);
    await assert.rejects(upgrade(Protocol.HERO_LEVEL_UPGRADE, { ...upgradeInput, levels: 4 }),
        { code: "IDEMPOTENCY_CONFLICT" });

    client.service.logout();
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    assert.deepEqual((await chapter(Protocol.CHAPTER_FIRST_REWARD_STATUS, { chapter: 1 })).body,
        { chapter: 1, found: true, receipt: first });
    assert.deepEqual((await fragment(Protocol.HERO_FRAGMENT_COMBINE_STATUS, { requestId })).body,
        { requestId, found: true, receipt: combined });
    assert.deepEqual((await upgrade(Protocol.HERO_LEVEL_UPGRADE_STATUS, { requestId: upgradeInput.requestId })).body,
        { requestId: upgradeInput.requestId, found: true, receipt: upgraded });
    assert.equal(client.account.snapshot.role!.gold, 3590);
    assert.equal(quantity(900101), 395);
    assert.equal(quantity(20204004), 0);
    assert(quantity(1001001) === 1 && quantity(1002001) === 1);
    assert.equal((readState().heroes as unknown[]).length, 2);
}

/** 登录首包、断线、顶号、换服和首战成长均使用独立测试账号。 */
async function main(){
 const [port,run]=process.argv.slice(2);assert(/^\d{4,5}$/.test(port)&&![18080,18081,3306].includes(Number(port)));assert(/^[0-9a-f-]{36}$/.test(run));
 // 测试身份探针不是游戏业务接口，只有测试上下文存在。
 const identity=await(await fetch("http://127.0.0.1:"+port+"/api/v1/socket-test-identity")).json() as any;
 assert.equal(identity.kind,"mxzg-owned-socket-it");assert.equal(identity.run,run);
 const one=fixture(port),two=fixture(port);
 try{
  const servers=await one.socket.catalog() as any[];assert(servers.some(row=>row.id==="local-2"));
  const account="wsclient_"+randomUUID().slice(0,12);
  assert(await one.service.login(account,"local-1"),one.account.snapshot.error);assert.equal(one.model.snapshot.synced,true);
  const basics=one.account.snapshot.role!.basics!;assert(basics);assert.equal(basics.experience,0);assert.equal(basics.cup,1000);assert.equal(basics.imageId,410304012);assert.equal(basics.experienceToNextLevel,120);assert(basics.createdAtSeconds>0);assert(Object.isFrozen(basics));
  assert.deepEqual(one.model.items,[]);const role=one.account.snapshot.role!.id,count=one.wires.length;
  one.wires[one.wires.length-1].close();await until(()=>one.wires.length>count && one.socket.latestState?.name==="session.authenticate" && one.model.snapshot.synced);
  assert.deepEqual(one.account.snapshot.role!.basics,basics,"网络恢复不重置角色基础资料");
  // 使用第二个连接登录同角色，旧客户端不能自动抢回。
  assert(await two.service.login(account,"local-1"),two.account.snapshot.error);await until(()=>!one.service.hasSession);
  assert.equal(one.model.items.length,0);assert.equal(two.account.snapshot.role!.id,role);
  assert(await two.service.login(account,"local-2"),two.account.snapshot.error);assert.notEqual(two.account.snapshot.role!.id,role);assert.equal(two.model.snapshot.synced,true);
  two.service.logout();assert.equal(two.model.snapshot.status,"idle");assert.equal(two.model.snapshot.synced,false);assert.equal(two.model.items.length,0);
  await checkFirstSummon(two);
  console.log("PASS real TS client → isolated H2: login, first battle, rewards, fragment combination, hero upgrade and original receipts");
 }finally{one.stop();two.stop();}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
