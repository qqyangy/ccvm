import { _decorator, Node } from 'cc';
import { BindBase } from "./modules/BindBase"
import { VmComponent } from './VmComponent';
const { ccclass, executionOrder, property } = _decorator;
@ccclass('VmRoot')
@executionOrder(9999)
export class VmRoot extends BindBase {
    @property([String])
    public vmRootName: string = "";
    //获取需要关联数据的组件
    private _bindVmComponent: VmComponent;
    private getVmRootComponent(): VmComponent {
        const vmRootName = this.vmRootName.trim();
        if (!vmRootName) return;
        let parent: Node = this.node;
        while (parent && parent instanceof Node) {
            const vms = this.getVmComponent(parent),
                vm = vms.find((_vm: VmComponent) => vmRootName === (_vm.vmRootName || "").trim());
            if (vm) return vm;
            parent = parent.parent;
        }
        return null;
    }
    public getBindVmComponent() {
        if (this._bindVmComponent !== undefined) return this._bindVmComponent; //如果以取得目标组件第二次获取时直接返回
        return this._bindVmComponent = this.getVmRootComponent() || null;
    }
}