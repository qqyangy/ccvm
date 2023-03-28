import { _decorator, Component, Node, CCString } from 'cc';
import { BindBase } from './modules/BindBase';
import { VmComponent } from './VmComponent';
import tools from './modules/tools';
const { evalfunc, getExpressionAry } = tools;
const { ccclass, property, executionOrder } = _decorator;
@ccclass('VmRefs')
@executionOrder(-1)
export class VmRefs extends Component {
    @property([String])
    public refs: string[] = [];
    getVmComponent = BindBase.prototype.getVmComponent;
    getVmNodeComponent = BindBase.prototype.getVmNodeComponent;
    //获取需要关联数据的组件
    private _bindVmComponent: VmComponent;
    public getBindVmComponent() {
        if (this._bindVmComponent !== undefined) return this._bindVmComponent;//如果以取得目标组件第二次获取时直接返回
        return this._bindVmComponent = this.getVmNodeComponent() || null;
    }
    private _vm: VmComponent;
    private getVm() {
        return this._vm = this._vm || this.getBindVmComponent();
    }
    getComponentFormat = BindBase.prototype.getComponentFormat;
    onLoad() {
        const vm: any = this.getVm();
        if (!vm) return;
        const refs = this.refs.map(t => t.trim()).filter(t => t);
        if (refs.length < 1) return;
        const optRefs = vm.vmOptions?.refs;
        if (!optRefs || Object.keys(optRefs).length < 1) return;
        const comp = this.getComponentFormat();//获取所有组件
        refs.forEach(t => {
            const exps = getExpressionAry(t);
            if (exps.code !== 1 && exps.code !== 3) return;
            if (exps.code === 1) {
                exps.valueStr = exps.attrStr;
                exps.attrStr = "node";
            }
            const { attrStr, valueStr } = exps;
            if (!(attrStr in comp)) return;
            const attr = /[^\s.\[\(]+/.exec(valueStr);
            if (!attr || !(attr[0] in optRefs)) return;
            try {
                evalfunc.call(vm, undefined, true, vm, valueStr + "=", comp[attrStr]);
            } catch (e) {
                console.log(`%c解析refs表达式"${t}"中属性"${attrStr}"出现错误`, 'color: red;');
                console.log(e);
                // throw e;
            }
        })
    }
}