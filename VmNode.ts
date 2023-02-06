import { _decorator } from 'cc';
import { BindBase } from "./BindBase"
import { VmComponent } from './VmComponent';
const { ccclass, executionOrder } = _decorator;

@ccclass('VmNode')
@executionOrder(9999)
export class VmNode extends BindBase {
    //获取需要关联数据的组件
    private _bindVmComponent: VmComponent;
    public getBindVmComponent() {
        if (this._bindVmComponent !== undefined) return this._bindVmComponent;//如果以取得目标组件第二次获取时直接返回
        return this._bindVmComponent = this.getVmNodeComponent() || null;
    }
}


