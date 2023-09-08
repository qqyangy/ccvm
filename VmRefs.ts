import { _decorator, Component, Node, CCString } from 'cc';
import { BindBase } from './modules/BindBase';
import { VmComponent } from './VmComponent';
import tools from './modules/tools';
const { evalfunc, getExpressionAry } = tools;
const { ccclass, property, executionOrder, executeInEditMode } = _decorator;


const nodeparentLister = async (n: Node, callback: Function) => {
    if (!n) return;
    const code = await callback();
    if (code !== 404) return;
    let cn = n,
        pn = cn.parent;
    while (pn && pn instanceof Node) {
        cn = pn;
        pn = cn.parent;
    }
    cn !== n && cn.once(Node.EventType.PARENT_CHANGED, () => {
        nodeparentLister(cn, callback);
    })
}


@ccclass('VmRefs')
@executionOrder(-1)
@executeInEditMode(true)
export class VmRefs extends Component {
    @property([String])
    public refs: string[] = [];
    getVmComponent = BindBase.prototype.getVmComponent;
    getVmNodeComponent = BindBase.prototype.getVmNodeComponent;
    //获取需要关联数据的组件
    private _bindVmComponent: VmComponent;
    public getBindVmComponent() {
        if (this._bindVmComponent) return this._bindVmComponent;//如果以取得目标组件第二次获取时直接返回
        return this._bindVmComponent = this.getVmNodeComponent() || null;
    }
    private _vm: VmComponent;
    private getVm() {
        return this._vm = this._vm || this.getBindVmComponent();
    }
    getComponentFormat = BindBase.prototype.getComponentFormat;
    private isinit: boolean = false;
    constructor(...p) {
        super(...p);
        let _node: Node = this.node;
        Object.defineProperty(this, "node", {
            get() { return _node; },
            set(node: Node) {
                _node = node;
                nodeparentLister(_node, async () => {
                    return Promise.resolve().then(() => {
                        return this.init(1);
                    });
                })
            }
        })
    }
    //格式化自动类型绑定
    formatAutoType(t: string) {
        return !t.includes("=") && t.includes(":") ? t.split(":").map((v: string, i: number) => {
            const rt = v.trim().replace(/;$/, "");
            return i === 1 && rt === "Node" ? "node" : rt;
        }).reverse().join("=") : t;
    }
    async init(n) {
        if (this.isinit) return;
        const vm: any = this.getVm();
        if (!vm) return 404;
        this.isinit = true;
        const refs = this.refs.map(t => t.trim()).filter(t => t);
        if (refs.length < 1) return;
        const optRefs = vm.vmOptions?.refs;
        if (!optRefs || Object.keys(optRefs).length < 1) return;
        const comp = this.getComponentFormat();//获取所有组件
        refs.forEach(_t => {
            const t = this.formatAutoType(_t);
            const exps = getExpressionAry(t);
            if (exps.code !== 1 && exps.code !== 3) return;
            if (exps.code === 1) {
                exps.valueStr = exps.attrStr;
                exps.attrStr = "node";
            }
            const { attrStr, valueStr } = exps;
            if (!(attrStr in comp)) return;
            const attr = /[\w$]+/.exec(valueStr);
            if (!attr || !(attr[0] in optRefs)) return;
            try {
                evalfunc.call(vm, undefined, true, vm, valueStr.replace(/;$/, "") + "=", comp[attrStr]);
            } catch (e) {
                console.log(`%c解析refs表达式"${t}"中属性"${attrStr}"出现错误`, 'color: red;');
                console.log(e);
                // throw e;
            }
        })
    }
    onLoad() {
        this.init(2);
    }
}