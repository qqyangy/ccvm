import { _decorator, Component, Node, CCString, sys } from 'cc';
import { VmComponent, VmOptions } from '../VmComponent';
import { DataEvent, listenerDEs, oldDEs, recoveryDEs } from './DataEvent';
import tools from './tools';
import { VmEvent, VmExpandEvent, VmEventTypeAll } from '../VmEvent';
import { nodeSet } from './nodeSet';
import BindAlias from '../BindAlias';
import { isForTemplet, getForWithdata } from './forTool';
import { myEventName } from './keyName';
import { VmTriggerEvent } from '../VmTriggerEvent';
import { VmImage } from '../VmImage';

const { evalfunc, compileFilter, getExpressionAry } = tools;
const { ccclass, property } = _decorator;

export class BindBase extends Component {
    @property(CCString)
    public bindActive: string = "";
    @property([String])
    public binds: string[] = [];
    @property([String])
    public events: string[] = [];

    public getforWith: Function;//获取forWith
    public forWith: any;//直接forWith
    public get forWithdata() {
        const getforWith = this.getforWith || (this.getforWith = getForWithdata(this?.node, this?.getVm()?.node, this.forWith));
        return getforWith ? getforWith() : null;
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
            return r[o["__classname__"] || o.constructor.name] = o, r;
        }, { node: this.node }))
    }
    /****获取附加数据***/
    private _outerWithData: { $this: any, $vm: any };
    private getOuterWith() {
        if (this._outerWithData?.$vm) return this._outerWithData;
        return this._outerWithData = {
            $this: this,
            $vm: this.getVmNodeComponent()
        }
    }
    // 绑定active
    private _disbindActive: Function;
    private _$bindActive: string;
    private _$successbindActive: boolean = false;//是否已经绑定bindActive
    private _bindactiveListener: boolean = false;
    private initBindActive(nodefine: boolean = false) {
        if (this._$successbindActive) return;
        const valueStr = (this._$bindActive || "").trim();
        if (!nodefine && !this._$bindActive && !this._bindactiveListener) {
            this._bindactiveListener = true;
            return Object.defineProperty(this, "bindActive", {
                get: () => {
                    return this._$bindActive;
                },
                set: (bindstr: string) => {
                    this._$bindActive = bindstr;
                    !this._$successbindActive && requestAnimationFrame(() => {
                        !this._$successbindActive && this.initBindActive(true);
                    })
                }
            })
        }
        if (!valueStr) return;
        const vm: VmComponent = this.getVm();//获取数据源组件
        if (!vm) return;
        if (isForTemplet(this.node, vm.node)) return;
        this._$successbindActive = true;
        const noEditor = sys.platform !== "EDITOR_PAGE";//是否是编辑器模式
        let active_val;
        const outerwith = this.getOuterWith();
        const setdata = () => {
            if (!vm || !vm.___$dataEvent___ || vm.___$dataEvent___.destroy) return;
            const oDEs: any = noEditor && oldDEs();
            noEditor && (DataEvent.DEs = new Set());
            let val;
            try {
                val = evalfunc.call(vm, outerwith, this.forWithdata, false, vm, compileFilter(valueStr, vm), undefined, vm.___$tempHelp___);
            } catch (e) {
                console.log(`%c解析bindActive表达式求值"${valueStr}"出现错误`, 'color: red;');
                console.log(this?.node, vm);
                console.log(e);
                // throw e;
            }
            const Des: Set<DataEvent> = noEditor && DataEvent.DEs;
            if (this._disbindActive) {
                this._disbindActive();
            }
            if (noEditor) {
                this._disbindActive = !Des ? null : listenerDEs(Des, "bindUpdate", setdata);
                DataEvent.DEs = recoveryDEs(oDEs);//处理完成后恢复之前状态
                this.activeAffirmactive = setdata;
                this.forceActiveTrigger();
            }
            this.node && (this.node.active = active_val = !!val);
        }
        setdata();
        if (typeof active_val === "boolean" && this.node && noEditor) {
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
    //获取正确组件集合
    public getComponentFormat(node?: any) {
        const _components_ = this.node["_components"] || {},
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
        return Object.assign({ node: node || this.node }, _components);
    }
    private bindAttribute() {
        if (!this.binds || this.binds.length < 1) return;
        this.callExcBinds = this.callExcBinds || new Set();//设置收集解除绑定集合
        const vm: VmComponent = this.getVm();//获取数据源组件
        if (!vm) return;
        if (isForTemplet(this.node, vm.node)) return;
        const _components: any = this.getComponentFormat(this.node["___$sets___"]);
        this.binds.forEach(t => {
            const exps = getExpressionAry(BindAlias.parse(t, this.node));
            if (!exps?.test) return;
            const { VmFabLoad } = BindAlias.importComponent();
            const special = ({
                vm: () => {
                    const vms: VmComponent[] = this.getVmComponent(this.node);
                    if (vms.length > 0) {
                        const itme: VmComponent = vms[0];
                        exps.attrStr = exps.attrStr.replace("vm", itme["__classname__"] || itme.constructor.name);//可使用vm简称当前节点的第一个VmComponent
                    } else {
                        return console.warn("当前节点不存在任何VmComponent相关组件，绑定表达式无效:" + t);
                    }
                },
                VmImage: () => {
                    if (_components.VmImage) return;
                    const _VmImage = this.node.getComponent(VmImage);
                    _VmImage && (_components.VmImage = _VmImage);
                },
                VmFabLoad: () => {
                    if (_components.VmFabLoad) return;
                    const _VmFabLoad = this.node.getComponent(VmFabLoad);
                    _VmFabLoad && (_components.VmFabLoad = _VmFabLoad);
                }
            })[exps.attrStr.split(".")[0]];
            special && special();
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
            const outerwith = this.getOuterWith();
            const setdata = () => {
                if (!vm || !vm.___$dataEvent___ || vm.___$dataEvent___.destroy) return;
                const oDEs: any = oldDEs();
                DataEvent.DEs = new Set();
                let val;
                try {
                    val = evalfunc.call(vm, outerwith, this.forWithdata, false, vm, compileFilter(valueStr, vm), undefined, vm.___$tempHelp___);
                } catch (e) {
                    console.log(`%c解析binds表达式"${t}"中求值"${valueStr}"出现错误`, 'color: red;');
                    console.log(this?.node, vm);
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
                    evalfunc.call(this, outerwith, this.forWithdata, true, _components, attrStr + "=", val);
                } catch (e) {
                    console.log(`%c解析binds表达式"${t}"中属性"${attrStr}"出现错误`, 'color: red;');
                    console.log(this?.node, vm);
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
            return (o instanceof VmComponent) && (o.isVmNode || o.vmRootName);
        }) as VmComponent[]
    }
    //获取父及节点中对应VmComponent切具有isVmNode属性的组件
    public getVmNodeComponent(): VmComponent {
        if (!this.node) return null;
        let parent: Node = this.node.parent;
        while (parent && parent instanceof Node && parent.components?.length > 0) {
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
        const vmEventCfg = this.events.map((exp: string = "") => {
            const exps = getExpressionAry(exp);
            if (!exps?.test) return;
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
                    _VmEvent = this.node.getComponent(VmEvent) || this.node.addComponent(VmEvent);//获取VmEvent组件
                }
            }
            const outerwith = this.getOuterWith();
            let emitCount: number = 0; //事件触发计数
            const _eventHandler = (...p) => {
                let val;
                try {
                    val = evalfunc.call(vm, Object.assign({ $event: p[0] }, outerwith), this.forWithdata, false, vm, valueStr, undefined, vm.___$tempHelp___);
                } catch (e) {
                    console.log(`%c解析event表达式"${exp}"中属性"${valueStr}"出现错误`, 'color: red;');
                    console.log(this?.node, vm);
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
            const oldexp = _VmEvent.useExp || "";
            _VmEvent.useExp = Array.from(new Set(oldexp.split(",").concat(vmEventCfg.split(",")))).join(",");
        }
    }
    deBindFunc() {
        if (this.callDeBinds) {
            this.callDeBinds.forEach(fn => fn());//禁用解绑函数
            this.callDeBinds = null;
        }
    }
    /******加强active绑定相关********/
    private parentnode: Node;
    private _offTriggerFunc: Function;
    private activeAffirmactive: Function;
    private isActiveTrigger: boolean = false;
    private forceActiveTrigger() {
        if (this.isActiveTrigger || this.parentnode) return;
        this.activeTrigger();//初始化强制加强关联active
    }
    private offTrigger() {
        if (this._offTriggerFunc) {
            this._offTriggerFunc();
            this._offTriggerFunc = null;
        }
    };
    activeTrigger(n?) {
        this.isActiveTrigger = true;
        if (!this.bindActive) return;
        this.parentnode = this.node.parent;
        this.offTrigger();//移除原监听
        if (!this.activeAffirmactive || !this.parentnode || !this.node) return;
        this._offTriggerFunc = VmTriggerEvent.on(VmTriggerEvent.trigger.enable, this.parentnode, () => {
            this.activeAffirmactive();
        });
    }
    private _isInitBindActive: boolean = false;
    onEnable() {
        if (!this.callDeBinds && this.callExcBinds) {
            this.callExcBinds.forEach(fn => fn());//启用所有绑定
        }
        this.node.emit(myEventName.enabled);//触发enabled事件
        if (!this._isInitBindActive) {
            this.initBindActive(true);
            this._isInitBindActive = true;
        }
        this.activeTrigger(1);
    }
    start() {
        nodeSet(this.node);
        this.bindAttribute();
        this.bindEvent();
        this.node.emit(myEventName.mounted);//触发mounted事件
    }
    onDisable() {
        this.deBindFunc();
    }
    onDestroy() {
        this.deBindFunc();
        this.offTrigger();
        this._disbindActive && this._disbindActive();//解绑active
    }
    constructor(...p) {
        super(...p);
        this.initBindActive();
    }
}
