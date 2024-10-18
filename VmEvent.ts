import { _decorator, Component, Node, CCString, UITransform, Vec2, Rect, Button } from 'cc';
import { EventTouch } from 'cc';
const { ccclass, property } = _decorator;

export enum VmEventType {
    //事件简称
    START = "touch-start",
    END = "touch-end",
    MOVE = "touch-move",
    CANCEL = "touch-cancel"
}
export enum VmExpandEvent {
    //拓展事件
    CLICK = "vm-click",
    OVER = "vm-over",
    LONG = "vm-long"
}
export const VmEventTypeAll = Object.assign({}, VmEventType, VmExpandEvent);
let RootNode: Node;
const expandkeys: string[] = Object.keys(VmExpandEvent).map(t => t.toLowerCase());

//所有全局事件
const globalListners = {
    [VmExpandEvent.CLICK]: new Set(),
    [VmExpandEvent.OVER]: new Set(),
    [VmExpandEvent.LONG]: new Set()
};
const coolingTime = {
    [VmExpandEvent.CLICK]: null,//点击事件冷却状态
    [VmExpandEvent.LONG]: null//长按事件冷却状态
}
let setCoolingTime: any;
@ccclass('VmEvent')
export class VmEvent extends Component {
    public static clickTime = 500;
    public static longTime = 1000;
    public static moveDistance = 5;
    public static clickCooling: number = 200;//点击冷却时间
    public static longCooling: number = 500;//长按冷却时间
    public static disLong: boolean = false;//禁用全局长按事件

    public static on(eventType: VmExpandEvent, handler: Function) {
        globalListners[eventType].add(handler);
    }
    public static off(eventType: VmExpandEvent, handler: Function) {
        globalListners[eventType].delete(handler);
    }
    public static offAll(eventType?: VmExpandEvent) {
        eventType ? globalListners[eventType]?.clear() : Object.keys(VmExpandEvent).forEach((k) => {
            globalListners[VmExpandEvent[k]]?.clear();
        })
    }

    @property({ type: CCString, tooltip: `需要扩展的事件名称用逗号隔开大小写不限\n可使用：${expandkeys.join("、")}` })
    useExp: string = "";
    disable: boolean;//是否禁用
    eventNames: string[];//需要拓展的事件名称

    startTime: number = 0;//手指按下时的时间
    overStartTime: number = 0;
    includes(type: string): boolean {
        return this.eventNames.indexOf(type) !== -1;
    }
    getRootNode(node?: Node): Node {
        const _node = node || this.node;
        return RootNode = RootNode || (_node.parent ? this.getRootNode(_node.parent) : _node);
    }
    emit(eventType: string, event: EventTouch, ...p) {
        if (this.disable) return;
        if (eventType === VmExpandEvent.LONG && VmEvent.disLong) return;//长按事件被禁用时
        if (eventType in coolingTime) {
            if (!coolingTime[eventType]) {
                clearTimeout(setCoolingTime);
                setCoolingTime = setTimeout(() => {
                    coolingTime[eventType] = setTimeout(() => {
                        coolingTime[eventType] = null;
                    }, eventType === VmExpandEvent.CLICK ? VmEvent.clickCooling : VmEvent.longCooling);
                })
            } else {
                return;
            }
        }
        this.node.emit(eventType, event, ...p);
        globalListners[eventType] && Array.from(globalListners[eventType]).forEach((fn: Function) => {
            fn(eventType, event, ...p);
        })
    }
    //开始事件处理函数
    startEvent(e: EventTouch) {
        if (this.disable) return;
        this.startTime = Date.now();
        if (this.includes("OVER")) {
            this.overStartTime = this.startTime;//如果有over事件
        }
        if (this.includes("LONG")) {
            this.unscheduleAllCallbacks();
            this.scheduleOnce(() => this.longEvent(e), Math.max(VmEvent.longTime, VmEvent.clickTime + 100) / 1000);
        }
    }
    protected onDestroy(): void {
        this.unscheduleAllCallbacks();
    }
    //结算事件处理函数
    endEvent(e: EventTouch) {
        this.overEvent(e, "end");//触发over
        if (!this.startTime) return;
        const now = Date.now();
        if (this.includes("CLICK") && now - this.startTime < VmEvent.clickTime) {
            this.emit(VmExpandEvent.CLICK, e);
        }
        this.startTime = 0;
    }
    //长按事件处理函数
    longEvent(e: EventTouch) {
        if (this.startTime && this.includes("LONG")) {
            this.emit(VmExpandEvent.LONG, e);
            this.startTime = 0;
        }
    }
    //事件处理函数
    overEvent(e: EventTouch, type: string) {
        if (!this.overStartTime) return;
        this.overStartTime = 0;
        this.emit(VmExpandEvent.OVER, e);
    }
    //中断事件处理函数
    cancelEvent(e) {
        this.startTime = 0;//事件中断
        this.overEvent(e, "cancel");//触发over
    }
    //移动事件处理函数
    moveEvent(e: EventTouch) {
        if (!e) return;
        if (this.startTime) {
            const { x, y } = e.touch.getLocation(),
                { x: sx, y: sy } = e.touch.getStartLocation(),
                distance = Math.sqrt(Math.pow(x - sx, 2) + Math.pow(y - sy, 2));//距离
            if (distance > VmEvent.moveDistance) {
                this.startTime = 0;//事件中断
            }
        }
        //处理over事件
        if (this.overStartTime) {
            const trans: UITransform = this.node.getComponent(UITransform),
                rect: Rect = this.node.getComponent(UITransform).getBoundingBoxToWorld(),
                point: Vec2 = e.getUILocation();
            if (!rect.contains(point)) {
                this.overEvent(e, "move");//触发over事件
            }
        }
    }
    //注册依赖的事件
    relyOn() {
        //按下事件
        this.node.on(VmEventType.START, this.startEvent, this);
        this.node.on(VmEventType.END, this.endEvent, this);
        this.node.on(VmEventType.CANCEL, this.cancelEvent, this);
        this.node.on(VmEventType.MOVE, this.moveEvent, this);
    }
    addlistener() {
        this.eventNames = this.useExp.split(",").map(t => t.trim().toUpperCase()).filter(t => t && VmExpandEvent[t]);
        this.eventNames.length > 0 && this.relyOn();//满足条件注册依赖事件
    }
    start() {
        this.addlistener();
    }
}


