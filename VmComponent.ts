import { _decorator, Component, Node, EventTarget, CCString } from 'cc';
import { execVmOptions, VmOptions as VmOptions2 } from './modules/initOptions';
import { DataEvent } from './modules/DataEvent';
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
        this._$vmOptions = this["vmOptions"];
        if (!this._$vmOptions) {
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
            });
            if (this.constructor["vmOptions"]) {
                this["vmOptions"] = Object.assign({}, this.constructor["vmOptions"]);
            }
        } else {
            execVmOptions(this._$vmOptions, this);
        }
    }
}



