import { _decorator, Component, Node, EventTarget, CCString } from 'cc';
import { execVmOptions, VmOptions as VmOptions2 } from './initOptions';
import { DataEvent } from './DataEvent';
const { ccclass, property } = _decorator;

export type VmOptions = VmOptions2;
@ccclass("VmComponent")
export class VmComponent extends Component {
    @property(Boolean)
    public isVmNode: boolean = true;
    @property(CCString)
    public vmRootName: string;
    private _$vmOptions: VmOptions;
    public ___bindKeys___: Set<string>;
    public static ___bindKeys___: Set<string>;
    public ___$dataEvent___: DataEvent;
    public ___$tempHelp___: {};
    constructor(...p) {
        super(...p);
        if (this._$vmOptions) return;
        Object.defineProperty(this, "vmOptions", {
            get: () => {
                return this._$vmOptions;
            },
            set: (opt: VmOptions) => {
                if (!this._$vmOptions && opt) {
                    this._$vmOptions = opt;
                    execVmOptions(opt, this);//关联vm
                }
            }
        })
    }
}



