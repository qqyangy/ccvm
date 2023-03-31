import { _decorator } from 'cc';
import tools from './modules/tools';
import { VmComponent } from './VmComponent';
import { VmRefs } from './VmRefs';
const { ccclass, property, executionOrder, executeInEditMode } = _decorator;
@ccclass('VmSelfRefs')
@executionOrder(-1)
@executeInEditMode(true)
export class VmSelfRefs extends VmRefs {
    //获取需要关联数据的组件
    private _bindVmComponent2: VmComponent;
    public getBindVmComponent() {
        if (this._bindVmComponent2 !== undefined) return this._bindVmComponent2; //如果以取得目标组件第二次获取时直接返回
        const comps: VmComponent[] = this.getVmComponent(this.node);
        return this._bindVmComponent2 = comps.find((_vm: VmComponent) => !_vm.isVmNode && !_vm.vmRootName) || comps[0] || null;
    }
}