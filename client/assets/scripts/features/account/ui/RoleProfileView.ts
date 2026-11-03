/** 自身角色资料只读 View：复用旧 SettingLayer，主城注入唯一角色状态；不查询角色、不修改资产。 */
import {_decorator,Button,Component,Label,Node,UITransform,view} from "cc";
import type {RoleProfile} from "../AccountModel";
import {paintRolePortrait} from "./RolePortrait";
const {ccclass,property}=_decorator;
@ccclass("RoleProfileView")
export class RoleProfileView extends Component {
    /** 服务器昵称，长昵称按预制区域收缩。 */
    @property(Label) nickname:Label|null=null;
    /** 字符串角色 ID，不转换为数值或伪造旧服编号。 */
    @property(Label) roleId:Label|null=null;
    /** 角色等级，不是英雄等级。 */
    @property(Label) level:Label|null=null;
    /** 独立头像资源节点。 */
    @property(Node) face:Node|null=null;
    /** 独立头像框资源节点。 */
    @property(Node) border:Node|null=null;
    /** 全屏遮罩，拦截点击以防操作底下的背包。 */
    @property(Node) backdrop:Node|null=null;
    /** 关闭资料页按钮。 */
    @property(Button) closeButton:Button|null=null;
    /** 只读保留入口：头像、改名、形象及称号，点击仅说明未开放。 */
    @property([Button]) readonlyButtons:Button[]=[];
    /** 原设置按钮，仅保留已存在的退出登录功能。 */
    @property(Button) settingsButton:Button|null=null;
    /** 账号设置小面板，默认隐藏，不能改角色属性。 */
    @property(Node) settingsPanel:Node|null=null;
    /** 明确标注退出登录，不将点击设置直接解释为退出。 */
    @property(Button) logoutButton:Button|null=null;
    /** 设置面板返回按钮。 */
    @property(Button) settingsClose:Button|null=null;
    /** 当前实例的按钮注销函数；重复绑定先清理，销毁时释放。 */
    private stops:Array<()=>void>=[];
    /** 主城注入已有账号操作和提示出口；关闭详情不会退出登录。 */
    bind(logout:()=>void,notice:(text:string)=>void):void {
        this.release();
        const bind=(button:Button|null,action:()=>void)=>{if(!button)throw new Error("角色详情按钮未绑定");button.node.on(Button.EventType.CLICK,action);this.stops.push(()=>button.node.off(Button.EventType.CLICK,action));};
        bind(this.closeButton,()=>this.hide());
        bind(this.settingsButton,()=>{if(this.settingsPanel)this.settingsPanel.active=true;});
        bind(this.settingsClose,()=>{if(this.settingsPanel)this.settingsPanel.active=false;});
        bind(this.logoutButton,logout);
        for(const button of this.readonlyButtons)bind(button,()=>notice("当前为角色资料只读展示，该操作暂未开放"));
    }
    /** 由主城订阅回调刷新；空角色关闭窗口，不持有第二份角色数据。 */
    render(role:Readonly<RoleProfile>|null):void {
        if(!role){this.hide();return;}
        if(!this.nickname||!this.roleId||!this.level)throw new Error("角色详情资料未绑定");
        this.nickname.string=role.nickname;this.roleId.string="角色 ID："+role.id;this.level.string=String(role.level);
        paintRolePortrait(this.face,this.border,role.basics?.headId,role.basics?.borderId);
    }
    /** 点击顶栏头像时显示既有预制体；重复打开不加载、不发请求。 */
    show():void {this.node.active=true;if(this.settingsPanel)this.settingsPanel.active=false;this.fit();view.off("canvas-resize",this.fit,this);view.on("canvas-resize",this.fit,this);}
    /** 收起资料和设置，解除适配监听，角色状态仍由账号模块保存。 */
    hide():void {view.off("canvas-resize",this.fit,this);if(this.settingsPanel)this.settingsPanel.active=false;this.node.active=false;}
    /** 只做整体适配，不在运行时生成界面或重排旧节点。 */
    private fit():void {const size=view.getVisibleSize();const scale=Math.min(1,size.width/640,size.height/880);this.node.setScale(scale,scale,1);this.backdrop?.getComponent(UITransform)?.setContentSize(size.width/scale,size.height/scale);}
    /** 释放当前实例绑定，防止重复开关累计回调。 */
    private release():void {for(const stop of this.stops.splice(0))stop();}
    /** 主城销毁时结束窗口监听和所有按钮回调。 */
    onDestroy():void {view.off("canvas-resize",this.fit,this);this.release();}
}
