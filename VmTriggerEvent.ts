import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

const disIdent = "_triggerEventIsDestroy";
@ccclass('VmTriggerEvent')
export class VmTriggerEvent extends Component {
    public static trigger = {
        enable: "__trigger@enable__",
        disable: "__trigger@disable__"
    }
    public static on(type: string, pNode: Node, handler: Function, target?: any): Function {
        if (!pNode.getComponent(VmTriggerEvent)) {
            pNode.addComponent(VmTriggerEvent);
        }
        pNode.on(type, handler, target);//注册事件
        return () => {
            this.off(type, pNode, handler, target);//返回移除监听函数
        }
    }
    public static off(type: string, pNode: Node, handler: Function, target?: any) {
        if (!pNode || pNode[disIdent]) return;//如果已销毁这不用调用off
        pNode.off(type, handler, target);//注册事件
    }
    protected onEnable(): void {
        this.node.emit(VmTriggerEvent.trigger.enable);
    }
    protected onDisable(): void {
        this.node.emit(VmTriggerEvent.trigger.disable);
    }
    protected onDestroy(): void {
        this.node[disIdent] = true;//添加销毁标识
    }
}


