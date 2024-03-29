import { _decorator, Component, Node, instantiate, Prefab } from 'cc';
export type RouterCfg = { [key: string]: Prefab };

const destroyNode = (node: Node) => {
    // node.children.forEach((cNode: Node) => {
    //     destroyNode(cNode);
    // });
    // if (node.parent && node.isValid) {
    //     node.parent.removeChild(node);
    //     // node.destroy();
    // }
    node.destroy();
}
const mapDelFuncs = {
    0: function (node: Node) {
        if (this.transPrevs) {
            this.transPrevs.add(node);
        } else {
            node.active = false;
        }
    },
    1: function (node: Node, pNode: Node, saveContainer: { [key: string]: Node }) {
        saveContainer[node.name] = node;
        if (this.transPrevs) {
            this.transPrevs.add(node);
        } else {
            if (node.parent && pNode === node.parent) {
                node.parent.removeChild(node);
            }
        }

    },
    2: function (node: Node, pNode: Node, saveContainer: { [key: string]: Node }, routerName: string) {
        saveContainer[node.name] && delete saveContainer[node.name];
        if (this.transPrevs) {
            this.transPrevs.add(node);
        } else {
            node.parent.removeChild(node)
            destroyNode(node);
        }
    }
}
//获取指定路由hash段
const getCurrentHashString = (RouterName: string): string => {
    const _RouterName = RouterName.replace("-", "\\-"),
        reg = new RegExp(`#${_RouterName}[^#]*`);
    const mRouter = reg.exec(location.hash);
    return mRouter ? mRouter[0].replace("#", "") : null;
},
    //获取子路由名称
    getChildRouter = (RouterName: string): string => {
        const prouter = getCurrentHashString(RouterName);
        if (!prouter || prouter.indexOf("?") === -1) return "";
        return prouter.split("?")[1].split("&")[0];
    },
    //预算url
    computeUrl = (RouterName: string, routeName: string, urlData?: {}) => {
        const search = !urlData ? "" : Object.keys(urlData).reduce((r, k) => {
            const v = encodeURIComponent((_v => typeof _v === "string" ? _v : JSON.stringify(_v))(urlData[k]));
            return `${r}&${k}=${v}`;
        }, "");
        const _RouterName = RouterName.replace("-", "\\-"),
            reg = new RegExp(`^#?$|#${_RouterName}[^#]*|$`),
            execrusult = reg.exec(location.hash);
        return { current: execrusult ? execrusult[0] : "", next: `#${RouterName}?${routeName}${search}` };
    },
    setUrl = (RouterName: string, compUrl: string, nohistory?: boolean) => {
        const _RouterName = RouterName.replace("-", "\\-");
        const reg = new RegExp(`^#?$|#${_RouterName}[^#]*|$`);
        const nhash = location.hash.replace(reg, compUrl);//新hash
        if (!nohistory) {
            location.hash = nhash;//需要产生历史记录时
        } else {
            history.replaceState(null, null, nhash);//不需要产生历史记录时
        }
    },
    getUrl = (RouterName: string) => {
        const mRouterStr = getCurrentHashString(RouterName);
        if (!mRouterStr) return null;
        if (mRouterStr.indexOf("?") === -1) return null;
        const mRouterAry = mRouterStr.split("?")[1].split("&"),
            name = mRouterAry[0].split("=")[0],
            data = mRouterAry.reduce((r, s, i) => {
                if (i === 0) return r;
                const _r = r || {},
                    sary = s.split("="),
                    k = sary[0],
                    v = sary[1] || "";
                let rv;
                try {
                    rv = JSON.parse(v);
                } catch (e) {
                    rv = v;
                }
                return _r[k] = rv, _r;
            }, null)
        const cHash = getSessionkey(RouterName);
        let sData;
        try {
            sData = JSON.parse(cHash && sessionStorage.getItem(getSessionkey(RouterName)) || "null");
        } catch (e) {
            sData = null;
        }
        return name && { name, data, sData };
    },
    getHashToRouterName = (): [] => {
        return location.hash.split("#").map(t => {
            return t && t.split("?").filter(t => t);
        }).filter(t => t && t.length === 2) as [];
    },
    jumpRouter = (mRouterName: string) => {
        const mhash = getCurrentHashString(mRouterName);
        if (!mhash) return;//找不到匹配路由
        const cHash = mhash.split("?")[1] || "",
            router = Router.getRouter(mRouterName);
        if (router && router.cHashStr !== cHash) {
            const formatRouter = getUrl(mRouterName);
            formatRouter?.name && router.push(formatRouter.name, formatRouter.data, formatRouter.sData);//切换到正确路由
        }
    },
    hashChange = () => {
        if (hashChange["isHashChange"]) return;
        hashChange["isHashChange"] = true;
        window.addEventListener("hashchange", () => {
            if (Router.__nochange__) return;
            getHashToRouterName().forEach((rt: string[]) => {
                const mName: string = rt[0];
                jumpRouter(mName);
            })
        });
    },
    //获取存储Session数据的key
    getSessionkey = (routerName: string): string => {
        const mhas = getCurrentHashString(routerName);
        return mhas && `__ccRouter_${mhas}`;
    }
const routeDatakey = "___routeData___",
    routeDataUrl = "___routeDataUrl___";
export type RouterOptions = {
    routerName: string, //新路由名称
    routerViewNode: Node,//路由容器节点
    routerConfig?: RouterCfg,//子路由配置
    deletType?: number,//移除路由的方式 0设置active 1remove 2remove并且destroy
    mapLocation?: boolean,//是否映射到地址栏
    noRemoves?: string[],//不需要移除的路由名称
    changeListener?: Function,//路由切换监听函数
    autoDel?: boolean
    transfer?: (parent: Node, current: Node, prev?: Node, olds?: Node[]) => void;
}
export class Router {
    private static RouterBaseInstantiate: { [key: string]: Router } = {};
    public static getRouter(routeName: string): Router {
        return this.RouterBaseInstantiate[routeName] || null;
    }
    public static __nochange__: boolean = false;
    public static delRouter(routerName: string) {
        const router = this.getRouter(routerName);
        if (router) {
            delete router.node["__Router__"];
            delete Router.RouterBaseInstantiate[routerName];
            setUrl(routerName, "", true);
        }
    }
    public static getRouteData(target: Component | Node | string) {
        if (!target) return null;
        if (target instanceof Component) {
            return target.node[routeDatakey] || null;
        } else if (target instanceof Node) {
            return target[routeDatakey] || null;
        } else if (typeof target === "string") {
            return Router.getRouteData(Router.getRouter(target)?.cRouterNode);
        }
        return null;
    }
    public static getParamsData(target: Component | Node) {
        if (!target) return null;
        if (target instanceof Component) {
            return target.node[routeDataUrl] || null;
        } else if (target instanceof Node) {
            return target[routeDataUrl] || null;
        }
        return null;
    }
    routers: RouterCfg;
    deletType: number;//0设置active 1remove 2remove并且destroy
    node: Node;
    removeRouts: { [key: string]: Node };
    history: string[];
    historyIndex: number;
    routerName: string;
    noRemoves: string[];
    mapLocation: boolean;
    cRouteName: string;//当前路由名称
    cHashStr: string;//当前路由hash段
    autoDel: boolean = false;//是否需要在非激活状态时自动移除

    changeListener: Function;//路由切换监听函数
    transfer: Function;//路由转换策略函数
    transPrevs: Set<Node>;//原有节点
    constructor(option: RouterOptions) {
        if (option.routerViewNode && option.routerViewNode["__Router__"]) {
            return option.routerViewNode["__Router__"];
        }
        if (Router.RouterBaseInstantiate[option.routerName]) {
            throw new Error(`Same routeName:${option.routerName}`);
        }
        this.autoDel = option.autoDel;
        this.transfer = option.transfer;
        this.routerName = option.routerName;
        Router.RouterBaseInstantiate[option.routerName] = this;
        this.node = option.routerViewNode;
        option.routerViewNode["__Router__"] = this;
        this.routers = option.routerConfig || {};
        this.deletType = option.deletType || 0;
        this.noRemoves = option.noRemoves || [];
        this.mapLocation = !!option.mapLocation;
        this.changeListener = option.changeListener;
        this.removeRouts = {};
        this.history = [];
        this.historyIndex = 0;
        this.del();
        if (this.mapLocation) {
            getUrl(this.routerName) && jumpRouter(option.routerName);//设置路由监听
            hashChange();
        }
        window["_ccRouter"] = Router;
    }
    push(routeName: string, urlData?: {}, routeData?: {}, deletType?: number): Router {
        return this.add(routeName, urlData, routeData, {
            added: () => {
                this.del(deletType);
            }
        });
    }
    del(deletType?: number, routeNames?: string[]): Router {
        if (!this.node || !this.node.isValid || !this.node.activeInHierarchy) return;
        const dtype: number = (deletType !== undefined && deletType !== null) ? deletType : this.deletType;
        const delFunc = mapDelFuncs[dtype];
        if (!delFunc) return this;
        if (routeNames) {
            routeNames.forEach(k => {
                const rtNode: Node = this.node.getChildByName(k);
                delFunc.call(this, rtNode, this.removeRouts, this.routerName);
            })
        } else {
            this.node.children.forEach((rtNode: Node) => {
                rtNode instanceof Node && rtNode.name && delFunc.call(this, rtNode, this.node, this.removeRouts, this.routerName);
            })
        }
        return this;
    }
    //设置默认路由
    lastDefaltOptions: [string, {}, {}];
    default(routeName: string, urlData?: {}, routeData?: {}) {
        this.lastDefaltOptions = [routeName, urlData, routeData];
        return !getUrl(this.routerName) ? this.add(routeName, urlData, routeData) : this;
    }
    //切换路由但不产生历史记录
    change(routeName: string, urlData?: {}, routeData?: {}, deletType?: number) {
        this.add(routeName, urlData, routeData, {
            isChange: true,
            added: () => {
                this.del(deletType);
            }
        });
    }
    lastCurent: string;
    public cRouterNode: Node;
    add(routeName: string, urlData?: {}, routeData?: {}, optins?: { added?: Function, isGo?: boolean, isChange?: boolean }): Router {
        if (!this.node || !this.node.isValid || !this.node.activeInHierarchy) return;
        const opt = optins || {},
            { added, isGo, isChange } = opt;
        // if(Router)
        const { current, next } = computeUrl(this.routerName, routeName, urlData);//预算url
        let routeNode: Node = this.node.children.find(n => n.name === routeName);
        const noAddChild: boolean = !!routeNode;
        if (current === next && this.lastCurent === next) return;//不需要处理
        if (!routeNode) {
            routeNode = this.removeRouts[routeName] || (this.routers[routeName] && instantiate(this.routers[routeName]));
        }
        if (routeNode) {
            this.changeListener && this.changeListener(routeName, this.cRouteName);
            this.transPrevs = this.transfer ? new Set() : null;//是否准备策略函数参数
            added && added();
            routeNode.name = routeName;
            if (this.transPrevs) {
                const transPrevs: Node[] = Array.from(this.transPrevs);
                const prev: Node = transPrevs.find((n: Node) => n.name === this.cRouteName);
                this.transfer(this.node, routeNode, prev, this.transPrevs);
            } else {
                routeNode.active = true;
                !noAddChild && this.node.addChild(routeNode);
            }
            if (!isGo) {
                routeNode[routeDatakey] = routeData || null;
                routeNode[routeDataUrl] = urlData || null;

                if (this.historyIndex < this.history.length) {
                    this.history.splice(this.historyIndex, this.history.length);
                }
                this.history.push(routeName);
                this.historyIndex++;
            }
            this.cRouterNode = routeNode;
            this.cRouteName = routeName;
            if (this.mapLocation) {
                setUrl(this.routerName, next, isChange || next && !getChildRouter(this.routerName));
                const hashkey = getSessionkey(this.routerName);
                this.cHashStr = getCurrentHashString(this.routerName) || "";
                hashkey && sessionStorage.setItem(hashkey, JSON.stringify(routeData || null));
                this.lastCurent = next;
            }
        } else {
            throw new Error(`名为“${this.routerName}” 的路由中找不到 指定的"${routeName}"页`);
        }
        return this;
    }
    go(step: number = 0): Router {
        history.go(step);
        return this;
        // if (this.history.length < 1) return;
        // const historyIndex = Math.min(Math.max(this.historyIndex + step, 1), this.history.length),
        //     routeName = this.history[historyIndex - 1];
        // return this.add(routeName, null, null, {
        //     added: () => {
        //         this.historyIndex = historyIndex;
        //         this.del();
        //     }, isGo: true
        // });
    }
    back() {
        return this.go(-1);
    }
}


