import { DataEvent, listenerDEs, oldDEs, recoveryDEs } from "./DataEvent";
import { VmComponent } from "./VmComponent";
export interface VmOptions {
    data?: {} | string[],
    props?: {} | string[],
    depth?: { [key: string]: number },
    watch?: { [key: string]: Function },
    watchImmediate?: string[],
    methods?: { [key: string]: Function },
    computed?: { [key: string]: Function },
    onLoad?: Function,
    onEnable?: Function,
    start?: Function,
    update?: Function,
    lateUpdate?: Function,
    onDisable?: Function,
    onDestroy?: Function,
}
interface recursparmas {
    data: any,
    DE: DataEvent,
    key?: string
    depth?: number,
    target?: any,
    depthcfg?: { [key: string]: number }
}
const recursionWatch = (par: recursparmas) => {
    let { data, depth = 0, key = "", DE, target, depthcfg } = par;
    if (!data || Object.prototype.toString.call(data) !== "[object Object]") return data;
    target = target || {};
    const options: {} = Object.keys(data).reduce((r: Object, k: string) => {
        const _key: string = key ? `${key}.${k}` : k;
        r[k] = {
            get() {
                if (DataEvent.DEs) {
                    if (!DataEvent.DEs.has(DE)) {
                        DataEvent.DEs.add(DE);
                        DE.keys = new Set();
                    }
                    DE.keys.add(_key);
                }
                return data[k];
            },
            set(v: any) {
                const oval = data[k];
                if (oval !== v) data[k] = v;
                DE.$vmMultipleBindUpdate(_key, v, oval);
            }
        }
        if (depthcfg && depthcfg[k]) depth = depthcfg[k];//获取当前k需要的深度
        data[k] = depth > 0 ? recursionWatch({
            data: data[k], depth: depth - 1, DE, key: _key
        }) : data[k];
        return r;
    }, {});
    Object.defineProperties(target, options);
    return target;
}
//格式化data和props
const formatDataRoProps = (data: any, target: any) => {
    return data instanceof Array ? data.reduce((r, k) => {
        return r[k] = target[k], r;
    }, {}) : data;
},
    //直接拷贝函数 methods
    copyfunction = (opt: VmOptions, target: any) => {
        const funcs = opt.methods;
        if (!funcs) return;
        Object.keys(funcs).forEach((k) => {
            if (funcs[k] instanceof Function) {
                target[k] = funcs[k];
            }
        })
    },
    //设置钩子函数
    resethooks = (opt: VmOptions, target: any) => {
        const newhooks = {},
            oldhooks = {},
            hookKeys = ["onLoad", "onEnable", "start", "update", "lateUpdate", "onDisable", "onDestroy"]
        const innithooks = hookKeys.reduce((r, k) => {
            return (target[k] && (r[k] = target[k])), r;
        }, {});
        Object.defineProperties(target, hookKeys.reduce((r, t) => {
            r[t] = {
                get: () => {
                    return newhooks[t] || opt[t];
                },
                set: (fn: Function) => {
                    if (newhooks[t] || !fn) return;
                    oldhooks[t] = fn;
                    newhooks[t] = opt[t] ? (function (...p) {
                        oldhooks[t].call(target, ...p);
                        opt[t].call(target, ...p);
                    }) : fn;
                }
            }
            return r;
        }, {}));
        Object.assign(target, innithooks);
    },
    //处理计算属性
    setComputed = (opt: VmOptions, target: any, DE: DataEvent) => {
        const computed = opt.computed;
        if (!computed) return;
        const computedval = {};
        const definopts: {} = Object.keys(computed).reduce((r: Object, k: string) => {
            if (computed[k] && computed[k] instanceof Function) {
                let listenerOff: Function;
                r[k] = {
                    get() {
                        if (DataEvent.DEs) {
                            if (!DataEvent.DEs.has(DE)) {
                                DataEvent.DEs.add(DE);
                                DE.keys = new Set();
                            }
                            DE.keys.add(k);
                        }
                        if (k in computedval) return computedval[k]; //有值直接返回
                        const oDEs: any = oldDEs();
                        DataEvent.DEs = new Set();//设置数据依赖收集口袋
                        computedval[k] = computed[k].call(target);
                        const DEs: Set<DataEvent> = DataEvent.DEs;
                        listenerOff && listenerOff();//移除老的监听
                        listenerOff = !DEs ? null : listenerDEs(DEs, "bindUpdateSync", () => {
                            target[k] = computed[k].call(target);
                        })
                        DataEvent.DEs = recoveryDEs(oDEs);//处理完成后恢复之前状态
                        return computedval[k]; //没有值时计算出值在返回
                    },
                    set(v: any) {
                        const oval = computedval[k];
                        computedval[k] = v;
                        DE.$vmMultipleBindUpdate(k, v, oval);
                    }
                }
                target[k] = computedval[k];
            } else {
                delete computed[k];
            }
            return r;
        }, {});
        if (Object.keys(definopts).length > 0) {
            Object.defineProperties(target, definopts);
        }
    },
    //处理watch
    setWatch = (opt: VmOptions, target: any, DE: DataEvent) => {
        if (!opt.watch || Object.keys(opt.watch).length < 1) return;
        DE.on("bindUpdate", (keys: string[], vals: any) => {
            keys.forEach(k => {
                if (opt.watch[k]) {
                    opt.watch[k].call(target, ...vals[k]);
                }
            })
        });
        opt.watchImmediate && opt.watchImmediate.forEach((k) => {
            opt.watch[k] && opt.watch[k].call(target, target[k]);
        })
    }
export function execVmOptions(optins: VmOptions, target: VmComponent) {
    target.___$dataEvent___ = new DataEvent();
    optins.data = formatDataRoProps(optins.data, target);
    optins.props = formatDataRoProps(optins.props, target);
    recursionWatch({ data: optins.data, DE: target.___$dataEvent___, target, depthcfg: optins.depth });//data
    recursionWatch({ data: optins.props, DE: target.___$dataEvent___, target });//props
    setComputed(optins, target, target.___$dataEvent___);//computed
    resethooks(optins, target);//hooks
    copyfunction(optins, target);//methods
    setWatch(optins, target, target.___$dataEvent___);//watch
}