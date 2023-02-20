import { _decorator, Component, Node, CCString } from 'cc';
import { VmComponent, VmOptions } from './VmComponent';
import { DataEvent, listenerDEs, oldDEs, recoveryDEs } from './DataEvent';
import tools from './tools';
const { evalfunc, getExpressionAry } = tools;
const { ccclass, property } = _decorator;

export class BindBase extends Component {
    @property(CCString)
    public bindActive: string = "";
    @property([String])
    public binds: string[] = [];
    @property([String])
    public events: string[] = [];

    private callExcBinds: Set<Function>;
    private callDeBinds: Set<Function>;
    private _vm: VmComponent;
    private getVm() {
        return this._vm = this._vm || this.getBindVmComponent();
    }

    private _components: Object;
    //获取当前节点挂在的所有组件和及节点
    private getMynodeComponents(): Object {
        return this._components || (this._components = this.node["_components"].reduce((r, o) => {
            return r[o.constructor.name] = o, r;
        }, { node: this.node }))
    }
    // 绑定active
    private _disbindActive: Function;
    private _$bindActive: string;
    private _$successbindActive: boolean = false;//是否已经绑定bindActive
    private initBindActive(nodefine: boolean = false) {
        if (this._$successbindActive) return;
        const valueStr = (this._$bindActive || "").trim();
        if (!nodefine && !this._$bindActive) {
            return Object.defineProperty(this, "bindActive", {
                get: () => {
                    return this._$bindActive;
                },
                set: (bindstr: string) => {
                    this._$bindActive = bindstr;
                    Promise.resolve().then(() => {
                        this.initBindActive(true);
                    });
                }
            })
        }
        if (!valueStr) return;
        const vm: VmComponent = this.getVm();//获取数据源组件
        if (!vm) return;
        this._$successbindActive = true;
        const setdata = () => {
            const oDEs: any = oldDEs();
            DataEvent.DEs = new Set();
            let val;
            try {
                val = evalfunc.call(vm, vm, valueStr, undefined, vm.___$tempHelp___);
            } catch (e) {
                console.log(`%c解析bindActive表达式求值"${valueStr}"出现错误`, 'color: red;');
                throw e;
            }
            this.node.active = !!val;
            const Des: Set<DataEvent> = DataEvent.DEs;
            if (this._disbindActive) {
                this._disbindActive();
            }
            this._disbindActive = !Des ? null : listenerDEs(Des, "bindUpdate", setdata);
            DataEvent.DEs = recoveryDEs(oDEs);//处理完成后恢复之前状态
        }
        setdata();
    }
    private bindAttribute() {
        if (!this.binds || this.binds.length < 1) return;
        this.callExcBinds = this.callExcBinds || new Set();//设置收集解除绑定集合
        const vm: VmComponent = this.getVm();//获取数据源组件
        if (!vm) return;
        let _components = this.getMynodeComponents();
        (() => {
            const ritem: any = _components["NewComponent"];
            if (!ritem || !(ritem instanceof Component) || !ritem.name) return;
            const name = (ritem.name.split("<")[1] || "").split(">")[0];
            if (!name || name === "NewComponent") return;
            _components = Object.assign({}, _components);
            delete _components["NewComponent"];
            _components[name] = ritem;
        })()
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
                if (!vmOptions || !vmOptions.props || !Object.prototype.hasOwnProperty.call(vmOptions.props, attrStrA[1])) return;
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
                    console.log(`%c解析binds表达式"${t}"中求值"${valueStr}"出现错误`, 'color: red;');
                    throw e;
                }
                const Des: Set<DataEvent> = DataEvent.DEs;
                this.callDeBinds = this.callDeBinds || new Set();//设置收集解除绑定集合
                if (listenerOff) {
                    this.callDeBinds.has(listenerOff) && this.callDeBinds.delete(listenerOff);//删除老解除绑定函数
                    listenerOff();//移除老的监听
                }
                listenerOff = !Des ? null : listenerDEs(Des, "bindUpdate", setdata);
                DataEvent.DEs = recoveryDEs(oDEs);//处理完成后恢复之前状态
                listenerOff && this.callDeBinds.add(listenerOff);//添加解除绑定函数
                try {
                    evalfunc.call(this, _components, attrStr + "=", val);
                } catch (e) {
                    console.log(`%c解析binds表达式"${t}"中属性"${attrStr}"出现错误`, 'color: red;');
                    throw e;
                }
            }
            this.callExcBinds.add(setdata);
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
        const vm: VmComponent = this.getVm();//获取数据源组件
        if (!vm) return;
        this.events.forEach((exp: string) => {
            const exps = getExpressionAry(exp);
            if (!exps) return;
            const { attrStr, valueStr } = exps;
            this.node.on(attrStr, (...p) => {
                let val;
                try {
                    val = evalfunc.call(vm, vm, valueStr);
                } catch (e) {
                    console.log(`%c解析event表达式"${exp}"中属性"${valueStr}"出现错误`, 'color: red;');
                    throw e;
                }
                if (val && val instanceof Function) {
                    val.call(vm, ...p);
                }
            })
        })
    }
    deBindFunc() {
        if (this.callDeBinds) {
            this.callDeBinds.forEach(fn => fn());//禁用解绑函数
            this.callDeBinds = null;
        }
    }
    onEnable() {
        if (!this.callDeBinds && this.callExcBinds) {
            this.callExcBinds.forEach(fn => fn());//启用所有绑定
        }
    }
    start() {
        this.initBindActive(true);
        this.bindAttribute();
        this.bindEvent();
    }
    onDisable() {
        this.deBindFunc();
    }
    onDestroy() {
        this.deBindFunc();
        this._disbindActive && this._disbindActive();//解绑active
    }
    constructor(...p) {
        super(...p);
        this.initBindActive();
    }
}
