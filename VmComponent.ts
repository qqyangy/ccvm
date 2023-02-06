import { _decorator, Component, Node, EventTarget } from 'cc';
import { execVmOptions, VmOptions } from './initOptions';
const { ccclass, property } = _decorator;

export { type VmOptions };
export class VmComponent extends Component {
    @property(Boolean)
    public isVmNode: boolean = false;
    @property(Boolean)
    public vmRootName: string;
    private _$vmOptions: VmOptions;
    public ___bindKeys___: Set<string>;
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
    private _$vmEvent: EventTarget;
    private _$getVmEvent() {
        return this._$vmEvent || (this._$vmEvent = new EventTarget());
    }
    public $vmOn<TFunction extends (...any: any[]) => void>(type: string, callback: TFunction, thisArg?, once?) {
        const vmEvent = this._$getVmEvent();
        vmEvent.on(type, callback, thisArg, once);
    }
    public $vmEmit(type: string, ...p) {
        const vmEvent = this._$getVmEvent();
        vmEvent.emit(type, ...p);
    }
    public $vmOff<TFunction extends (...any: any[]) => void>(type: string, callback: TFunction) {
        const vmEvent = this._$getVmEvent();
        vmEvent.off(type, callback)
    }
    private _$vmMultipleBindUpdates: Set<string>;
    private _$vmMultipleBindUpdateValues: any;
    public $vmMultipleBindUpdate(key: string, nValue: any, oValue: any) {
        this.$vmEmit("bindUpdateSync", key, nValue, oValue);
        if (!this._$vmMultipleBindUpdates) {
            this._$vmMultipleBindUpdates = new Set();
            this._$vmMultipleBindUpdateValues = {};//存储value
            Promise.resolve().then(() => {
                const eventkeys: string[] = [...this._$vmMultipleBindUpdates];
                this._$vmMultipleBindUpdates = null;
                this.$vmEmit("bindUpdate", eventkeys, this._$vmMultipleBindUpdateValues);
            });
        }
        this._$vmMultipleBindUpdates.add(key);
        this._$vmMultipleBindUpdateValues[key] = [nValue, oValue];
    }
}



