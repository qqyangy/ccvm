import { _decorator, Component, Node, EventTarget, CCString } from 'cc';
import { execVmOptions, VmOptions as VmOptions2, mapStatic, mapObjct } from './modules/initOptions';
import { DataEvent } from './modules/DataEvent';
const { ccclass, property } = _decorator;

export type VmOptions = VmOptions2;
export { mapStatic, mapObjct };
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
    public ___$dependentComputed___: { [key: string]: { unset: Function, set: Function } } = {};
    public ___$enabled___: boolean = false;//组件激活状态
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
            const _vmOptions = this.constructor["vmOptions"];
            if (_vmOptions) {
                this["vmOptions"] = Object.assign({}, _vmOptions);
            }
        } else {
            execVmOptions(this._$vmOptions, this);
        }
    }
    protected ___$staticBindOnEnable___(): void {
        this.___$enabled___ = true;
        const cig = this.___$dependentComputed___,
            setfuncs = Object.keys(cig).map(k => cig[k].set);
        if (setfuncs.length > 0) {
            this.___$dependentComputed___ = {};
            setfuncs.forEach(fn => fn());
        }
    }
    protected ___$staticBindOnDisable___(): void {
        this.___$enabled___ = false;
        const cig = this.___$dependentComputed___;
        Object.keys(cig).forEach((k) => {
            cig[k].unset();//停用有依赖其他数据模型的计算属性
        })
    }
}



