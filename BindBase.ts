import { _decorator, Component, Node } from 'cc';
import { VmComponent, VmOptions } from './VmComponent';
import { DataEvent, listenerDEs, oldDEs, recoveryDEs } from './DataEvent';
const { ccclass, property } = _decorator;
const evalfuncsring = `function ____evalfunc____(optins,code,_____data_____,____tempHelp____){
                var ____code____=code;
                if(_____data_____!==undefined && code.charAt(code.length-1)==="="){
                    ____code____=code+"_____data_____";
                }
                ____tempHelp____=____tempHelp____||{};
                with (____tempHelp____){
                    with (optins) {
                        return eval(____code____);
                    }
                }
            }
            document.head.removeChild(document.getElementById("____evalfuncdom_____"));
            `
function evalfunc(optins: any, code: any, _____data_____: any, tempHelp: {}) {
    if (!window["____evalfunc____"]) {
        const script = document.createElement("script");
        script.id = "____evalfuncdom_____";
        document.head.appendChild(script);
        script.innerHTML = evalfuncsring;
    }
    return window["____evalfunc____"].call(this, optins, code, _____data_____, tempHelp);
}
function getExpressionAry(exp: string): { attrStr: string, valueStr: string } {
    const expv = exp && exp.trim();
    if (!expv) return;
    const attrStr: string = expv.split("=")[0].trim(),
        valueStr: string = expv.replace(/^[^=]*=/, "").trim();
    return attrStr && valueStr ? { attrStr, valueStr } : null
}

export class BindBase extends Component {
    @property([String])
    public binds: string[];
    @property([String])
    public events: string[];

    private _components: Object;
    //获取当前节点挂在的所有组件和及节点
    private getMynodeComponents(): Object {
        return this._components || (this._components = this.node["_components"].reduce((r, o) => {
            return r[o.constructor.name] = o, r;
        }, { node: this.node }))
    }
    private bindAttribute() {
        if (!this.binds || this.binds.length < 1) return;
        const vm: VmComponent = this.getBindVmComponent();//获取数据源组件
        if (!vm) return;
        const _components = this.getMynodeComponents();
        this.binds.forEach(t => {
            const exps = getExpressionAry(t);
            if (!exps) return;
            const { attrStr, valueStr } = exps;
            /******限定VmComponent组件只能被绑定props --start******/
            const attrStrA = attrStr.split(".").map(t => t.trim()).filter(t => t),//获取被赋值表达式数组形式
                bindTarget: Component = _components[attrStrA[0]];
            if (!bindTarget) return;
            if (bindTarget instanceof VmComponent) {
                if (attrStrA.length !== 2) return;
                const vmOptions: VmOptions = bindTarget["vmOptions"];
                if (!vmOptions || !vmOptions.props || Object.prototype.hasOwnProperty.call(vmOptions.props, attrStrA[1])) return;
            }
            /******限定VmComponent组件只能被绑定props --end******/
            let listenerOff: Function;
            const setdata = () => {
                const oDEs: any = oldDEs();
                DataEvent.DEs = new Set();
                let val;
                try {
                    val = evalfunc.call(vm, vm, valueStr, undefined, vm.___$tempHelp___);
                } catch (e) {
                    throw new Error(`解析binds表达式"${t}"中取值"${valueStr}"出现错误`);
                }
                const Des: Set<DataEvent> = DataEvent.DEs;
                listenerOff && listenerOff();//移除老的监听
                listenerOff = !Des ? null : listenerDEs(Des, "bindUpdate", setdata);
                DataEvent.DEs = recoveryDEs(oDEs);//处理完成后恢复之前状态
                try {
                    evalfunc.call(this, _components, attrStr + "=", val);
                } catch (e) {
                    throw new Error(`解析binds表达式"${t}"中属性"${attrStr}"出现错误`);
                }
            }
            setdata();
        });
    }
    //获取指定节点对应VmComponent组件
    public getVmComponent(node: Node): VmComponent[] {
        return (node["_components"] || []).filter((o) => {
            return o instanceof VmComponent;
        }) as VmComponent[]
    }
    //获取父及节点中对应VmComponent切具有isVmNode属性的组件
    public getVmNodeComponent(): VmComponent {
        let parent: Node = this.node.parent;
        while (parent && parent instanceof Node) {
            const vms = this.getVmComponent(parent),
                vm = vms.find((_vm: VmComponent) => _vm.isVmNode);
            if (vm) return vm;
            parent = parent.parent;
        }
        return null;
    }
    //获取需要关联数据的目标组件 在子类中重写
    public getBindVmComponent(): VmComponent {
        return null;
    }
    //绑定事件
    private bindEvent() {
        if (!this.events || this.events.length < 1) return;
        const vm: VmComponent = this.getBindVmComponent();//获取数据源组件
        if (!vm) return;
        this.events.forEach((exp: string) => {
            const exps = getExpressionAry(exp);
            if (!exps) return;
            const { attrStr, valueStr } = exps;
            this.node.on(attrStr, (...p) => {
                try {
                    const val = evalfunc.call(vm, vm, valueStr);
                    if (val instanceof Function) {
                        val.call(vm, ...p);
                    }
                } catch (e) {
                    throw new Error(`解析event表达式"${exp}"中属性"${valueStr}"出现错误`);
                }
            })
        })
    }
    start() {
        this.bindAttribute();
        this.bindEvent();
    }
}
