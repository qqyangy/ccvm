import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;
export type VmTransCfg = {
    parmcomps?: (typeof Component)[],//函数组件的参数
    action: (args: Component[], node: Node, tag: string) => void
}
@ccclass('VmTransValue')
export class VmTransValue extends Component {
    private _tcfg: VmTransCfg = null;
    private _isSet: boolean = true;
    @property(String)
    public tag: string = "";//标识
    public get value(): VmTransCfg {
        return this._tcfg;
    }
    public set value(cfg: VmTransCfg) {
        this._tcfg = cfg;
        this._isSet = false;
        this.exec();
    }
    private exec() {
        if (this._isSet || !this.node || !this._tcfg?.action) return;
        this._isSet = true;
        const node: Node = this.node,
            parmcomps = this._tcfg.parmcomps;
        this._tcfg.action(parmcomps && parmcomps.length > 0 ? node.components.filter(_c => parmcomps.some(c => _c instanceof c)) : [], node, this.tag);
    }
    protected start(): void {
        this.exec();
    }
}


