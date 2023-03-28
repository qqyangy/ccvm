import { _decorator, Component, Node, CCString } from 'cc';
import { VmComponent, VmOptions } from '../VmComponent';
import { DataEvent, listenerDEs, oldDEs, recoveryDEs } from './DataEvent';
import tools from './tools';
import { VmEvent, VmExpandEvent, VmEventTypeAll } from '../VmEvent';
import { nodeSet } from './nodeSet';
import BindMapKey from '../BindMapKey';
import { isForTemplet, getForWithdata } from './forTool';
import { myEventName } from './keyName';
const { evalfunc, getExpressionAry } = tools;
const { ccclass, property } = _decorator;

export class BindBase extends Component {
    @property(CCString)
    public bindActive: string = "";
    @property([String])
    public binds: string[] = [];
    @property([String])
    public events: string[] = [];

    public forWith: {};//for组件附加域
    public get forWithdata() {
        return this.forWith || (this.forWith = getForWithdata(this.node, this.getVm().node));
    }

    //通过代码动态关联绑定关系方法
    public static join(node: Node, optins: { bindActive?: string, binds?: string[], events?: string[] }) {
        let myComponent: BindBase = node.getComponent(this);
        if (myComponent && !myComponent.enabled) {
            //存在对应组件并且是非激活状态则移除组件
            const _comps: any[] = node["_components"];
            _comps.splice(_comps.indexOf(myComponent), 1);
            myComponent.destroy();
            myComponent = null;
        }
        let _components: BindBase
        if (!myComponent) {
            node.addComponent(this);
            _components = node.getComponent(this);
        } else {
            _components = myComponent;
        }
        if (optins.bindActive && typeof optins.bindActive === "string") {
            _components.bindActive = optins.bindActive;
        }
        ["binds", "events"].forEach(k => {
            if (optins[k] && optins[k] instanceof Array && optins[k].length > 0) {
                const opk: string[] = optins[k];
                if (myComponent) {
                    const oldary: string[] = _components[k] || [],
                        oset: Set<string> = new Set(oldary);
                    opk.forEach(k => oset.add(k));
                    _components[k] = Array.from(oset);
                } else {
                    _components[k] = opk;
                }
            }
        })
    }


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
                    requestAnimationFrame(() => {
                        this.initBindActive(true);
                    })
                }
            })
        }
        if (!valueStr) return;
        const vm: VmComponent = this.getVm();//获取数据源组件
        if (!vm) return;
        if (isForTemplet(this.node, vm.node)) return;
        this._$successbindActive = true;
        let active_val;
        const setdata = () => {
            const oDEs: any = oldDEs();
            DataEvent.DEs = new Set();
            let val;
            try {
                val = evalfunc.call(vm, this.forWithdata, false, vm, valueStr, undefined, vm.___$tempHelp___);
            } catch (e) {
                console.log(`%c解析bindActive表达式求值"${valueStr}"出现错误`, 'color: red;');
                console.log(e);
                // throw e;
            }
            this.node.active = active_val = !!val;
            const Des: Set<DataEvent> = DataEvent.DEs;
            if (this._disbindActive) {
                this._disbindActive();
            }
            this._disbindActive = !Des ? null : listenerDEs(Des, "bindUpdate", setdata);
            DataEvent.DEs = recoveryDEs(oDEs);//处理完成后恢复之前状态
        }
        setdata();
        if (typeof active_val === "boolean" && this.node) {
            let _active = this.node.active;
            Object.defineProperty(this.node, "_active", {
                get() { return _active; },
                set: (v) => {
                    _active = v;
                    if (_active !== active_val && this.node) {
                        this.node.active = active_val;
                    }
                }
            })
        }
    }
    private bindAttribute() {
        if (!this.binds || this.binds.length < 1) return;
        this.callExcBinds = this.callExcBinds || new Set();//设置收集解除绑定集合
        const vm: VmComponent = this.getVm();//获取数据源组件
        if (!vm) return;
        if (isForTemplet(this.node, vm.node)) return;
        const _components_ = Object.assign({ node: this.node["___$sets___"] }, this.node["_components"] || {}),
            _components = Object.keys(_components_).reduce((r, k) => {
                const ritem: any = _components_[k],
                    isComp: boolean = (ritem instanceof Component) && !!ritem.name,
                    key = (() => {
                        if (!isComp || (!ritem.name && !ritem._name)) return k;
                        if (ritem._name) return ritem._name;
                        const cname: string = ritem.name;
                        if (cname) {
                            return cname.indexOf("<") != -1 ? (cname.split("<")[1] || "").split(">")[0] || k : cname
                        }
                        return k;
                    })();
                return r[key] = ritem, r;
            }, {});
        this.binds.forEach(t => {
            const exps = getExpressionAry(BindMapKey.parse(t));
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
                    val = evalfunc.call(vm, this.forWithdata, false, vm, valueStr, undefined, vm.___$tempHelp___);
                } catch (e) {
                    console.log(`%c解析binds表达式"${t}"中求值"${valueStr}"出现错误`, 'color: red;');
                    console.log(e);
                    // throw e;
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
                    evalfunc.call(this, this.forWithdata, true, _components, attrStr + "=", val);
                } catch (e) {
                    console.log(`%c解析binds表达式"${t}"中属性"${attrStr}"出现错误`, 'color: red;');
                    console.log(e);
                    // throw e;
                }
            }
            this.callExcBinds.add(setdata);
            setdata();
        });
    }
    //获取指定节点对应VmComponent组件
    public getVmComponent(node: Node): VmComponent[] {
        if (!node) return [];
        return (node["_components"] || []).filter((o) => {
            return o instanceof VmComponent;
        }) as VmComponent[]
    }
    //获取父及节点中对应VmComponent切具有isVmNode属性的组件
    public getVmNodeComponent(): VmComponent {
        if (!this.node) return null;
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
        if (isForTemplet(this.node, vm.node)) return;
        let _VmEvent: VmEvent;//节点的VmEvent组件
        const vmEventCfg = this.events.map((exp: string) => {
            const exps = getExpressionAry(exp);
            if (!exps) return;
            const { attrStr, valueStr } = exps;
            const attrStrAry: string[] = attrStr.split(".").map(t => t.trim()).filter(t => t),
                eventName = attrStrAry[0], eventCount = parseInt(attrStrAry[1] || "0");
            let eventAttr: string = eventName, veType: string;

            if (eventName.charAt(0) === "@") {
                veType = eventName.substring(1, eventName.length).toUpperCase();
                const typeStr: string = VmEventTypeAll[veType];
                eventAttr = typeStr || eventAttr; //拓展事件名称
                veType = VmExpandEvent[veType] && veType || "";
                if (typeStr && veType) {
                    if (!this.node.getComponent(VmEvent)) {
                        _VmEvent = this.node.addComponent(VmEvent);//获取VmEvent组件
                    }
                }
            }
            let emitCount: number = 0; //事件触发计数
            const _eventHandler = (...p) => {
                let val;
                try {
                    val = evalfunc.call(vm, this.forWithdata, false, vm, valueStr);
                } catch (e) {
                    console.log(`%c解析event表达式"${exp}"中属性"${valueStr}"出现错误`, 'color: red;');
                    console.log(e);
                    // throw e;
                }
                if (val && val instanceof Function) {
                    val.call(vm, ...p);
                }
                if (eventCount) {
                    ++emitCount >= eventCount && this.node.off(eventAttr, _eventHandler); //需要处理eventCount时
                }
            }
            // VmEventTypeAll
            this.node.on(eventAttr, _eventHandler);
            return veType;
        }).filter(t => t).join(",");
        if (_VmEvent && vmEventCfg) {
            _VmEvent.useExp = vmEventCfg;
        }
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
        nodeSet(this.node);
        this.initBindActive(true);
        this.bindAttribute();
        this.bindEvent();
        this.node.emit(myEventName.mounted);//触发mounted事件
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