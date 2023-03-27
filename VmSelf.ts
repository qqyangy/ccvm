import { _decorator } from 'cc';
import { BindBase } from "./modules/BindBase"
import { VmComponent } from './VmComponent';
const { ccclass, executionOrder } = _decorator;

@ccclass('VmSelf')
@executionOrder(9999)
export class VmSelf extends BindBase {
    //获取需要关联数据的组件
    private _bindVmComponent: VmComponent;
    public getBindVmComponent() {
        if (this._bindVmComponent !== undefined) return this._bindVmComponent; //如果以取得目标组件第二次获取时直接返回
        const comps: VmComponent[] = this.getVmComponent(this.node);
        return this._bindVmComponent = comps.find((_vm: VmComponent) => !_vm.isVmNode && !_vm.vmRootName) || comps[0] || null;
    }
}


