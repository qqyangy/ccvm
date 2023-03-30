import { BindBase } from "./BindBase";
import { DataEvent, listenerDEs, oldDEs, recoveryDEs } from "./DataEvent";
import { myEventName } from "./keyName";
import { VmComponent } from "../VmComponent";


const types = ["[object String]", "[object Number]", "[object Boolean]"];
const validValue = (n, o) => {
    return n === o && types.indexOf(Object.prototype.toString.call(n)) !== -1;
}
export interface VmOptions {
    data?: {} | string[],
    props?: {} | string[],
    refs?: {} | string[],
    depth?: { [key: string]: number },//数据观察深度
    watch?: { [key: string]: Function },
    watchImmediate?: string[],//保证初始化立即执行1次
    watchStartImmediate?: string[],//保证最迟start后至少执行1次
    methods?: { [key: string]: Function },
    events?: { [key: string]: Function | null } | string[],//事件相应函数
    computed?: { [key: string]: Function },
    tempHelp?: {},//附加表达式取值变量集合如从cc中导出的对象
    created?: Function,//初始化完成执行
    mounted?: Function,//参数准备就绪执行
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
            enumerable: true,
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
                if (validValue(v, oval)) return;
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
    copyfunction = (opt: { [key: string]: Function }, target: any) => {
        const funcs = opt;
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
            hookKeys = ["onLoad", "onEnable", "start", "update", "lateUpdate", "onDisable", "onDestroy"];
        if (opt.mounted) {
            let oldStart;
            function start() {
                if (oldStart) oldStart.call(this);
                this.node.once(myEventName.mounted, () => {
                    opt.mounted.call(this);
                });
                const node = this.node;
                !(node["_components"] || []).some(c => {
                    return c instanceof BindBase;
                }) && Promise.resolve().then(() => {
                    node.emit(myEventName.mounted);
                });
            }
            [opt, target].find(o => {
                oldStart = o.start;
                if (oldStart) {
                    o.start = start;
                }
                return oldStart;
            }) || (opt.start = start);
        }
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
                        if (validValue(v, oval)) return;
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
    setWatch = (opt: VmOptions, target: any, watchStartdata: {}, watchStartImmediate: string[]) => {
        if (!opt.watch) return;
        const watch = opt.watch;
        Object.keys(watch).forEach((key: string) => {
            const watchfunc: Function = watch[key];
            let listenerOff: Function, oldval: any;
            const getval = (nocall?: boolean) => {
                const oDEs: any = oldDEs();
                DataEvent.DEs = new Set();
                const val = key.split(".").reduce((r, _k) => {
                    return r && Object.prototype.toString.call(r) === "[object Object]" ? r[_k] : undefined;
                }, target);
                const Des: Set<DataEvent> = DataEvent.DEs;
                listenerOff && listenerOff();//移除老的监听
                listenerOff = !Des ? null : listenerDEs(Des, "bindUpdate", getval);
                DataEvent.DEs = recoveryDEs(oDEs);//处理完成后恢复之前状态
                if (!nocall) {
                    watchfunc.call(target, val, oldval);//调用watch
                    watchfunc["__callCount__"] = (watchfunc["__callCount__"] || 0) + 1;//调用次数
                    if (watchStartdata[key]) {
                        delete watchStartdata[key];//已经执行了测删除待执行任务
                    }
                } else {
                    if (watchStartImmediate.indexOf(key) !== -1) {
                        watchStartdata[key] = getval;//保存执行人物
                    }
                }
                oldval = val;
            }
            getval(!opt.watchImmediate || opt.watchImmediate.indexOf(key) === -1);
        });
        watchStartImmediate.length > 0 && watchStartImmediate.splice(0, watchStartImmediate.length);//清空数组
    },
    //生成需要监听watch的starthook
    onwatchCreatStart = (opt: VmOptions, watchStartFuncs: {}) => {
        const watchStartFuncsKeys: string[] = Object.keys(watchStartFuncs);
        if (watchStartFuncsKeys.length < 0) return;//如果没有则不处理
        const watchFunc = () => {
            watchStartFuncsKeys.forEach(fnk => {
                Promise.resolve().then(() => {
                    const fn = watchStartFuncs[fnk];
                    fn && fn();
                });
            });//执行
        }
        const oldstart = opt.start;
        opt.start = oldstart ? function start() {
            oldstart.call(this);
            watchFunc();
        } : watchFunc;
    }
export function execVmOptions(optins: VmOptions, target: VmComponent) {
    const watchStartFuncs = {},//需要最迟start后执行的watch函数
        watchStartImmediate = [...(optins.watchStartImmediate || [])];
    target.___$dataEvent___ = new DataEvent();
    optins.data = formatDataRoProps(optins.data, target);
    optins.props = formatDataRoProps(optins.props, target);
    optins.refs = formatDataRoProps(optins.refs, target);
    const events = optins.events = formatDataRoProps(optins.events, target);
    recursionWatch({ data: optins.data, DE: target.___$dataEvent___, target, depthcfg: optins.depth });//data
    recursionWatch({ data: optins.props, DE: target.___$dataEvent___, target });//props
    recursionWatch({ data: optins.refs, DE: target.___$dataEvent___, target });//refs
    setComputed(optins, target, target.___$dataEvent___);//computed
    setWatch(optins, target, watchStartFuncs, watchStartImmediate);//watch
    onwatchCreatStart(optins, watchStartFuncs);//按照watch时机需求生成start
    const mounted = optins.mounted || target["mounted"];
    if (mounted) {
        optins.mounted = mounted;//设置mounted钩子
        target["mounted"] && delete target["mounted"];
    }
    resethooks(optins, target);//hooks
    copyfunction(optins.methods, target);//methods
    copyfunction(events, target);//events
    target.___$tempHelp___ = optins.tempHelp;
    const created = optins.created || target["created"];
    created && created.call(target);//执行created钩子函数
}