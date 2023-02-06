export interface VmOptions {
    data?: {} | string[],
    props?: {} | string[],
    watch?: {},
    watchImmediate?: string[],
    methods?: {},
    computed?: {},
    onLoad?: Function,
    onEnable?: Function,
    start?: Function,
    update?: Function,
    lateUpdate?: Function,
    onDisable?: Function,
    onDestroy?: Function,
}

//格式化data和props
const formatDataRoProps = (data: any, target: any) => {
    return data instanceof Array ? data.reduce((r, k) => {
        return r[k] = target[k], r;
    }, {}) : data;
},
    //处理data和props
    setdata = (data: any, target: any) => {
        if (!data) return;
        const options: {} = Object.keys(data).reduce((r: Object, k: string) => {
            r[k] = {
                get() {
                    if (target.___bindKeys___) {
                        target.___bindKeys___.add(k);
                    }
                    return data[k];
                },
                set(v: any) {
                    const oval = data[k];
                    if (oval !== v) data[k] = v;
                    target.$vmMultipleBindUpdate(k, v, oval);
                }
            }
            target[k] = data[k];
            return r;
        }, {});
        Object.defineProperties(target, options);
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
    setComputed = (opt: VmOptions, target: any) => {
        const computed = opt.computed;
        if (!computed) return;
        const computedval = {};
        const definopts: {} = Object.keys(computed).reduce((r: Object, k: string) => {
            if (computed[k] && computed[k] instanceof Function) {
                r[k] = {
                    get() {
                        if (target.___bindKeys___) {
                            target.___bindKeys___.add(k);
                        }
                        if (Object.prototype.hasOwnProperty.call(computedval, k)) return computedval[k]; //有值直接返回
                        target.___bindKeys___ = new Set();
                        computedval[k] = computed[k].call(target);
                        computed[k].keys = target.___bindKeys___;
                        target.___bindKeys___ = null;
                        return computedval[k]; //没有值时计算出值在返回
                    },
                    set(v: any) {
                        const oval = computedval[k];
                        if (oval !== v) computedval[k] = v;
                        target.$vmMultipleBindUpdate(k, v, oval);
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
            target.$vmOn("bindUpdateSync", (t: string) => {
                if (!t) return;
                Object.keys(computed).filter(k => {
                    const fn = computed[k];
                    return fn.keys && fn.keys instanceof Set && fn.keys.has(t);
                }).forEach((k: string) => {
                    target[k] = computed[k].call(target);
                })
            });
        }
    },
    //处理watch
    setWatch = (opt: VmOptions, target: any) => {
        if (!opt.watch || Object.keys(opt.watch).length < 1) return;
        target.$vmOn("bindUpdate", (keys: string[], vals: any) => {
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
export function execVmOptions(optins: VmOptions, target: any) {
    optins.data = formatDataRoProps(optins.data, target);
    optins.props = formatDataRoProps(optins.props, target);
    setdata(optins.data, target);//data
    setdata(optins.props, target);//props
    setComputed(optins, target);//computed
    resethooks(optins, target);//hooks
    copyfunction(optins, target);//methods
    setWatch(optins, target);//watch
}