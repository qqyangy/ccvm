import { EventTarget } from 'cc';

//处理触发器集合
export function listenerDEs(DEs: Set<DataEvent>, eventType: string, updata: Function): Function {
    const funcs: Function[] = Array.from(DEs).map((de: DataEvent) => {
        const keys: Set<string> = de.keys;
        de.keys = null;
        if (keys.size < 1) return;
        const callback = (attr: string[]) => {
            if (attr.find(k => keys.has(k))) {
                updata();
            }
        }
        de.on(eventType, callback);
        return () => de.off(eventType, callback);
    })
    return () => funcs.forEach(fn => fn());
};
export function oldDEs(): any[] {
    const DEs: Set<DataEvent> = DataEvent.DEs
    return DEs && Array.from(DEs).map((de: DataEvent) => {
        return [de, de.keys];
    })
}
export function recoveryDEs(oldes: any[]): Set<DataEvent> {
    return oldes ? new Set(oldes.map(([de, keys]) => {
        de.keys = keys;
        return de;
    })) : null
}
export class DataEvent extends EventTarget {
    public static DEs: Set<DataEvent>;
    private static _de: DataEvent;
    public static get DE(): DataEvent {
        return this._de || (this._de = new DataEvent());
    }
    public keys: Set<string>;
    private _$vmMultipleBindUpdates: Set<string>;
    private _$vmMultipleBindUpdateValues: any;
    public $vmMultipleBindUpdate(key: string, nValue: any, oValue: any) {
        this.emit("bindUpdateSync", [key], nValue, oValue);
        if (!this._$vmMultipleBindUpdates) {
            this._$vmMultipleBindUpdates = new Set();
            this._$vmMultipleBindUpdateValues = {};//存储value
            Promise.resolve().then(() => {
                const eventkeys: string[] = [...this._$vmMultipleBindUpdates].map(k => Object.prototype.toString.call(k) === "[object String]" ? k : Array.from(k)[0]);
                this._$vmMultipleBindUpdates = null;
                this.emit("bindUpdate", eventkeys, this._$vmMultipleBindUpdateValues);
            });
        }
        this._$vmMultipleBindUpdates.add(key);
        this._$vmMultipleBindUpdateValues[key] = [nValue, oValue];
    }
}