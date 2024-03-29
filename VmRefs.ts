import { _decorator, Component, Node, CCString } from 'cc';
import { BindBase } from './modules/BindBase';
import { VmComponent } from './VmComponent';
import tools from './modules/tools';
const { evalfunc, getExpressionAry } = tools;
const { ccclass, property, executionOrder, executeInEditMode } = _decorator;




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
        return this._bindVmComponent = this.getVmNodeComponent && this.getVmNodeComponent() || null;
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
                Promise.resolve().then(() => {
                    this.setrefs(_node);
                });
            }
        })
    }
    setrefs(n: Node) {
        if (!n) return;
        const code = this.init(1);
        if (code !== 404) return;
        let parent: Node = n.parent,
            cnode: Node = n;
        while (parent && parent instanceof Node) {
            cnode = parent;
            parent = parent.parent;
        }
        if (parent) return;
        cnode.once(Node.EventType.PARENT_CHANGED, this.parentchange, this);
        this.cnode = cnode;
    }
    cnode: Node;
    protected onDestroy(): void {
        if (!this.cnode) return;
        this.cnode.off(Node.EventType.PARENT_CHANGED, this.parentchange, this);
    }
    parentchange() {
        this.init(1);
        this.cnode = null;
    }
    //格式化自动类型绑定
    formatAutoType(t: string) {
        return !t.includes("=") && t.includes(":") ? t.split(":").map((v: string, i: number) => {
            const rt = v.trim().replace(/;$/, "");
            return i === 1 && rt === "Node" ? "node" : rt;
        }).reverse().join("=") : t;
    }
    init(n) {
        if (this.isinit) return;
        const vm: any = this.getVm();
        if (!vm) return 404;
        if (vm.node.activeInHierarchy) {
            this.isinit = true;
        }
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
                evalfunc.call(vm, {}, undefined, true, vm, valueStr.replace(/;$/, "") + "=", comp[attrStr]);
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