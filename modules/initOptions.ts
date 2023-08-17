import { BindBase } from "./BindBase";
import { DataEvent, listenerDEs, oldDEs, recoveryDEs } from "./DataEvent";
import { myEventName } from "./keyName";
import { VmComponent } from "../VmComponent";
import staticVm from "./staticVm";


const types = ["[object String]", "[object Number]", "[object Boolean]"],
    typecfg = {
        function: "[object Function]",
        object: "[object Object]"
    }
const validValue = (n, o) => {
    return n === o && types.indexOf(Object.prototype.toString.call(n)) !== -1;
}


type Functions = { [key: string]: Function }
//watch类型
type WatchItem = {
    [key: string]: Function | WatchOption,//其他值
    _?: Function//默认值
}
type WatchOption = { [key: string]: WatchItem | Function }
type DataType = {} | string[];
type DataTypeC = DataType | (() => DataType);
export interface VmOptions {
    data?: DataTypeC,
    props?: DataTypeC,
    refs?: DataTypeC,
    depth?: { [key: string]: number },//数据观察深度
    watch?: WatchOption,
    watchImmediate?: string[],//保证初始化立即执行1次
    watchStartImmediate?: string[],//保证最迟start后至少执行1次
    methods?: { [key: string]: Function | null } | string[],
    events?: { [key: string]: Function | null } | string[],//事件相应函数
    filters?: { [key: string]: Function | null } | string[],//过滤器相关函数
    computed?: Functions,
    tempHelp?: {},//附加表达式取值变量集合如从cc中导出的对象
    created?: Function,//初始化完成执行
    mounted?: Function,//参数准备就绪执行
    enabled?: Function,//onEnable的后置执行函数
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
const formatDataRoProps = (_data: any, target: any) => {
    const data = _data instanceof Function ? _data.call(target) : _data;
    return data instanceof Array ? data.reduce((r, k) => {
        return r[k] = target[k], r;
    }, {}) : data;
},
    //合并相同key的watch值
    mergeWatchCfg = (val1: any, val2: any) => {
        const v1type: string = Object.prototype.toString.call(val1),
            v2type: string = Object.prototype.toString.call(val2),
            typemaps = {
                //处理都是函数情况
                [typecfg.function + typecfg.function]: () => {
                    return function (...p) {
                        val1.call(this, ...p);
                        val2.call(this, ...p);
                    }
                },
                //处理第一个是函数第二个是对象情况
                [typecfg.function + typecfg.object]: () => {
                    val2["_"] = val2["_"] ? mergeWatchCfg(val2["_"], val1) : val1;
                    return val2;
                },
                //处理第一个是对象第二个是函数情况
                [typecfg.object + typecfg.function]: () => {
                    val1["_"] = val1["_"] ? mergeWatchCfg(val1["_"], val2) : val2;
                    return val1;
                },
                //处理都是对象情款
                [typecfg.object + typecfg.object]: () => {
                    Object.keys(val2).forEach((k) => {
                        return val1[k] = val1[k] ? mergeWatchCfg(val1[k], val2[k]) : val2[k];
                    });
                    return val1;
                },
            },
            mkey = v1type + v2type;
        return typemaps[mkey] ? typemaps[mkey]() : val1;
    },
    //格式化watch配置
    formatWatch = (watch: WatchItem | WatchOption, result: Functions = {}, key: string = "", set: Set<any> = new Set()): Functions => {
        if (!watch || set.has(watch)) return watch as Functions;
        set.add(watch);
        return Object.keys(watch).reduce((r, k) => {
            const item = watch[k];
            if (!item || [typecfg.function, typecfg.object].indexOf(Object.prototype.toString.call(item)) === -1) return r;
            const isDefalut = k === "-",
                isFunction = item instanceof Function;
            k.split(",").map((t: string) => t.trim()).filter(t => t).forEach(k1 => {
                const nkey = key ? `${key}.${k1}` : k1;
                if (isFunction || isDefalut) {
                    if (isFunction) {
                        const funcname = isDefalut ? key : nkey;
                        r[funcname] = r[funcname] ? mergeWatchCfg(r[funcname], item) : item
                    }
                } else {
                    formatWatch(item as WatchItem, result, nkey, set)
                }
            })
            return r;
        }, result) as Functions;
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
        if (opt.enabled) {
            const oldOnEnable = opt.onEnable,
                oldMounted = opt.mounted;
            let isMounted: boolean = false;//知否已执行mounted
            function mounted() {
                oldMounted && oldMounted.call(this);
                isMounted = true;
                opt.enabled.call(this);
            }
            function onEnable() {
                oldOnEnable && oldOnEnable.call(this);
                isMounted && Promise.resolve().then(() => {
                    opt.enabled.call(this);
                })
            }
            opt.onEnable = onEnable;
            opt.mounted = mounted;
        }
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
                        if (t === "onEnable" && this.___$staticBindOnEnable___) {
                            this.___$staticBindOnEnable___();
                        }
                        oldhooks[t].call(target, ...p);
                        opt[t].call(target, ...p);
                        if (t === "onDisable" && this.___$staticBindOnDisable___) {
                            this.___$staticBindOnDisable___();
                        }
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
                        const getval = () => {
                            const oDEs: any = oldDEs();
                            DataEvent.DEs = new Set();//设置数据依赖收集口袋
                            const myComputedval = computed[k].call(target);
                            const DEs: Set<DataEvent> = DataEvent.DEs;
                            listenerOff && listenerOff();//移除老的监听
                            listenerOff = !DEs ? null : listenerDEs(DEs, "bindUpdateSync", () => {
                                target[k] = getval();
                            }, target)
                            DataEvent.DEs = recoveryDEs(oDEs);//处理完成后恢复之前状态
                            if (DEs.size > 1 || !DEs.has(target.___$dataEvent___)) {
                                const setComputed = target.___$dependentComputed___;
                                setComputed[k] = {
                                    unset() {
                                        listenerOff && listenerOff();//移除老的监听
                                    },
                                    set() {
                                        target[k] = getval();//恢复监听
                                    }
                                }
                            }
                            return myComputedval;
                        }
                        return computedval[k] = getval(); //没有值时计算出值在返回
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
            const watchfunc: Function = watch[key] as Function;
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
//映射静态属性

export function mapStatic(target: any, keysOpt: { [key: string]: string } | string[]): Functions {
    if (!target || !(target instanceof Function)) return {};
    const kOptions = staticVm.formatOptin(target, keysOpt),
        { data, DE } = staticVm.getDataAndDE(target, kOptions);
    Object.keys(data).length > 0 && recursionWatch({ data, DE, target });//添加监听
    const result = Object.keys(kOptions).reduce((r, k) => {
        const func = function () {
            return target[kOptions[k]];
        };
        r[k] = func
        return r;
    }, {});
    return result;
}

export function execVmOptions(optins: VmOptions, target: VmComponent) {
    const watchStartFuncs = {},//需要最迟start后执行的watch函数
        watchStartImmediate = [...(optins.watchStartImmediate || [])];
    target.___$dataEvent___ = new DataEvent();
    optins.data = formatDataRoProps(optins.data, target);
    optins.props = formatDataRoProps(optins.props, target);
    optins.refs = formatDataRoProps(optins.refs, target);
    const events = optins.events = formatDataRoProps(optins.events, target),
        methods = optins.methods = formatDataRoProps(optins.methods, target),
        filters = optins.filters = formatDataRoProps(optins.filters, target);
    recursionWatch({ data: optins.data, DE: target.___$dataEvent___, target, depthcfg: optins.depth });//data
    recursionWatch({ data: optins.props, DE: target.___$dataEvent___, target });//props
    recursionWatch({ data: optins.refs, DE: target.___$dataEvent___, target });//refs
    setComputed(optins, target, target.___$dataEvent___);//computed
    optins.watch = formatWatch(optins.watch);//格式化watch
    setWatch(optins, target, watchStartFuncs, watchStartImmediate);//watch
    onwatchCreatStart(optins, watchStartFuncs);//按照watch时机需求生成start
    const mounted = optins.mounted || target["mounted"];
    if (mounted) {
        optins.mounted = mounted;//设置mounted钩子
        target["mounted"] && delete target["mounted"];
    }
    resethooks(optins, target);//hooks
    copyfunction(methods, target);//methods
    copyfunction(events, target);//events
    copyfunction(filters, target);//filters
    target.___$tempHelp___ = optins.tempHelp;
    const created = optins.created || target["created"];
    created && created.call(target);//执行created钩子函数
}