import { _decorator, Component, Node, instantiate, Prefab } from 'cc';
export type RouterCfg = { [key: string]: Prefab };
const mapDelFuncs = {
    0: (node: Node) => {
        node.active = false;
    },
    1: (node: Node, saveContainer: { [key: string]: Node }) => {
        saveContainer[node.name] = node;
        node.parent && node.parent.removeChild(node);
    },
    3: (node: Node, saveContainer: { [key: string]: Node }) => {
        node.parent && node.parent.removeChild(node);
        saveContainer[node.name] && delete saveContainer[node.name];
        node.destroy();
    }
}
//获取指定路由hash段
const getCurrentHashString = (RouterName: string): string => {
    const _RouterName = RouterName.replace("-", "\\-"),
        reg = new RegExp(`#${_RouterName}[^#]*`);
    const mRouter = reg.exec(location.hash);
    return mRouter ? mRouter[0].replace("#", "") : null;
},
    setUrl = (RouterName: string, routeName: string, urlData?: {}) => {
        const _RouterName = RouterName.replace("-", "\\-");
        const reg = new RegExp(`^#?$|#${_RouterName}[^#]*|$`),
            search = !urlData ? "" : Object.keys(urlData).reduce((r, k) => {
                const v = encodeURIComponent((_v => typeof _v === "string" ? _v : JSON.stringify(_v))(urlData[k]));
                return `${r}&${k}=${v}`;
            }, "");
        location.hash = location.hash.replace(reg, `#${RouterName}?${routeName}${search}`);
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
        return { name, data, sData };
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
            router.push(formatRouter.name, formatRouter.data, formatRouter.sData);//切换到正确路由
        }
    },
    hashChange = (RouterName: string) => {
        jumpRouter(RouterName);
        if (hashChange["isHashChange"]) return;
        hashChange["isHashChange"] = true;
        window.addEventListener("hashchange", () => {
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
}
export class Router {
    private static RouterBaseInstantiate: { [key: string]: Router } = {};
    public static getRouter(routeName: string): Router {
        return this.RouterBaseInstantiate[routeName] || null;
    }
    public static getRouteData(target: Component | Node) {
        if (!target) return null;
        if (target instanceof Component) {
            return target.node[routeDatakey] || null;
        } else if (target instanceof Node) {
            return target[routeDatakey] || null;
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

    constructor(option: RouterOptions) {
        if (Router.RouterBaseInstantiate[option.routerName]) {
            throw new Error(`存在相同的routeName:${option.routerName}`);
        }
        this.routerName = option.routerName;
        Router.RouterBaseInstantiate[option.routerName] = this;
        this.node = option.routerViewNode;
        this.routers = option.routerConfig || {};
        this.deletType = option.deletType || 0;
        this.noRemoves = option.noRemoves || [];
        this.mapLocation = !!option.mapLocation;
        this.removeRouts = {};
        this.history = [];
        this.historyIndex = 0;
        this.del();
        this.mapLocation && hashChange(option.routerName);//设置路由监听
        window["_ccRouter"] = Router;
    }
    push(routeName: string, urlData?: {}, routeData?: {}, deletType?: number): Router {
        return this.add(routeName, urlData, routeData, () => {
            this.del(deletType);
        });
    }
    del(deletType?: number, routeNames?: string[]): Router {
        const dtype: number = (deletType !== undefined && deletType !== null) ? deletType : this.deletType;
        const delFunc = mapDelFuncs[dtype];
        if (!delFunc) return this;
        if (routeNames) {
            routeNames.forEach(k => {
                const rtNode: Node = this.node.getChildByName(k);
                delFunc(rtNode, this.removeRouts);
            })
        } else {
            this.node.children.forEach((rtNode: Node) => {
                rtNode instanceof Node && rtNode.name && delFunc(rtNode, this.removeRouts);
            })
        }
        return this;
    }
    //设置默认路由
    default(routeName: string, urlData?: {}, routeData?: {}) {
        return !this.mapLocation || !getUrl(this.routerName) ? this.add(routeName, urlData, routeData) : this;
    }
    add(routeName: string, urlData?: {}, routeData?: {}, added?: Function, isGo?: boolean): Router {
        let routeNode: Node = this.node.getChildByName(routeName);
        const noAddChild: boolean = !!routeNode;
        if (!routeNode) {
            routeNode = this.removeRouts[routeName] || (this.routers[routeName] && instantiate(this.routers[routeName]));
        }
        if (routeNode) {
            added && added();
            routeNode.name = routeName;
            routeNode.active = true;
            !noAddChild && this.node.addChild(routeNode);
            if (!isGo) {
                routeNode[routeDatakey] = routeData || null;
                routeNode[routeDataUrl] = urlData || null;

                if (this.historyIndex < this.history.length) {
                    this.history.splice(this.historyIndex, this.history.length);
                }
                this.history.push(routeName);
                this.historyIndex++;
            }
            this.cRouteName = routeName;
            if (this.mapLocation) {
                setUrl(this.routerName, routeName, urlData)
                // sessionStorage.setItem(`__ccRouter_${this.routerName}.${routeName}`, JSON.stringify(routeData));
                const hashkey = getSessionkey(this.routerName);
                this.cHashStr = getCurrentHashString(this.routerName) || "";
                hashkey && sessionStorage.setItem(hashkey, JSON.stringify(routeData || null));
            }
        } else {
            throw new Error(`名为“${this.routerName}” 的路由中找不到 指定的"${routeName}"页`);
        }
        return this;
    }
    go(step: number = 0): Router {
        if (this.history.length < 1) return;
        const historyIndex = Math.min(Math.max(this.historyIndex + step, 1), this.history.length),
            routeName = this.history[historyIndex - 1];
        return this.add(routeName, null, null, () => {
            this.historyIndex = historyIndex;
            this.del();
        }, true);
    }
    back() {
        return this.go(-1);
    }
}


