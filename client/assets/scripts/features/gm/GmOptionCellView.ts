/** GM 下拉选项格子：SuperContent 管理位置与复用，只显示名称/ID 并转交点击。 */
import {_decorator,Component,Button,Label} from "cc";
const {ccclass,property}=_decorator;
@ccclass("GmOptionCellView")
export class GmOptionCellView extends Component {
 /** 预制体按钮。 */
 @property(Button) button:Button|null=null;
 /** 配置名称和 ID。 */
 @property(Label) caption:Label|null=null;
 /** 当前复用项的操作，重新绑定前清理。 */
 private tap:(()=>void)|null=null;
 /** 更新展示并替换旧点击回调。 */
 show(text:string,action:()=>void):void{this.clear();this.caption!.string=text;this.tap=action;this.button!.node.on(Button.EventType.CLICK,action);}
 /** 销毁时释放回调。 */
 onDestroy():void{this.clear();}
 /** 解绑旧条目，避免一次点击选择多个配置。 */
 private clear():void{if(this.tap)this.button?.node?.off(Button.EventType.CLICK,this.tap);this.tap=null;}
}
