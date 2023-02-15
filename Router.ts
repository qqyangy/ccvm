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
const routeDatakey = "___routeData___";
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
    constructor(routeName: string, routerViewNode: Node, routerConfig?: RouterCfg, deletType?: number) {
        if (Router.RouterBaseInstantiate[routeName]) {
            throw new Error(`存在相同的routeName:${routeName}`);
        }
        this.routerName = routeName;
        Router.RouterBaseInstantiate[routeName] = this;
        this.node = routerViewNode;
        this.routers = routerConfig || {};
        this.deletType = deletType || 0;
        this.removeRouts = {};
        this.history = [];
        this.historyIndex = 0;
        this.del();
        window["_ccRouter"] = Router;
    }
    push(routeName: string, routeData?: {}, deletType?: number): Router {
        return this.add(routeName, routeData, () => {
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
    add(routeName: string, rootData?: {}, added?: Function, isGo?: boolean): Router {
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
                routeNode[routeDatakey] = rootData || null;
                if (this.historyIndex < this.history.length) {
                    this.history.splice(this.historyIndex, this.history.length);
                }
                this.history.push(routeName);
                this.historyIndex++;
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
        return this.add(routeName, null, () => {
            this.historyIndex = historyIndex;
            this.del();
        }, true);
    }
    back() {
        return this.go(-1);
    }
}


