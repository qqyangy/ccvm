import { _decorator, Node, CCString, instantiate } from 'cc';
import forTool from './modules/forTool';
import { VmComponent, VmOptions } from "./VmComponent";
import { VmNode } from './VmNode';
import { VmForItem } from './VmForItem';
import tools from './modules/tools';
import { VmForArray } from './VmForArray';

const { ccclass, property } = _decorator;


@ccclass("VmForNode")
export class VmForNode extends VmComponent {
    @property({ type: Boolean, visible: false })
    public isVmNode: boolean = false;
    @property({ type: CCString, visible: false })
    public vmRootName: string;

    @property({ type: Number, tooltip: "复用节点池需要缓存节点的最大数量(设置为负数则可配置公用节点对象池0为100负数为0)", visible() { return this.poolquote === "" } })
    public nodePool: number = 0;
    @property({ type: String, tooltip: "公用对节点象池变量(设置后nodePool默认为10000不设置默认nodePool为0)", visible() { return this.nodePool === -1 } })
    public poolquote: string = "";
    @property({ type: String, tooltip: "需要被循环数组或对象的名称" })
    public mapdata: string = "";
    @property({ type: String, tooltip: "定义循环中的临时变量名称默认：item,index,key,length" })
    public variables: string = "";
    //清除共享节点对象池
    public static desPoolquote(poolquote: Node[]) {
        poolquote && poolquote.forEach(n => n.destroy());
        poolquote.length > 0 && poolquote.splice(0, poolquote.length);
    }
    public static setMaxPool(pool: Node[], maxLength: number): Node[] {
        pool["maxPoollength"] = maxLength;//设置最大缓存量
        return pool;
    }

    ispoolquote: boolean = false;//是否配置了公用对象池
    public itemNode: Node;
    public itemNodeList: Node[];//多模版节点list
    private itemIfTypes: string[];
    startcall: number = 0;//start调用 1watch调用 2start调用
    nodePoolList: Node[] = [];
    _nodePoolList: [] = [];//节点池
    accept_mapdata: [] | {} | number | VmForArray;//数据集合
    updateVmArray: number = 1;
    vmOptions: VmOptions = {
        data: ["updateVmArray"],
        props: ["accept_mapdata", "accept_poolquote", "node"],
        computed: {
            accept_mapdataformat() {
                if (this.accept_mapdata && this.accept_mapdata instanceof VmForArray) return this.updateVmArray, this.accept_mapdata.list;
                return Object.prototype.toString.call(this.accept_mapdata) === "[object Number]" ? new Array(this.accept_mapdata).fill(0).map((v, i) => i) : this.accept_mapdata;
            },
            accept_mapdata_keys() {
                if (!this.accept_mapdataformat) return [];
                return this.accept_mapdataformat instanceof Array ? this.accept_mapdataformat.map((v, i) => i) : Object.keys(this.accept_mapdataformat);
            },
            ispoolquote() {
                return this.accept_poolquote && this.accept_poolquote instanceof Array;//是否配置公用对象池
            },
            nodePoolList() {
                return this.ispoolquote ? this.accept_poolquote : this._nodePoolList;//应用节点对象池
            }
        },
        onLoad() {
            this.initBInd();
        },
        methods: {
            async execFor() {
                const nodePoolList: Node[] = this.nodePoolList,
                    maxNodePool = this.ispoolquote ? (nodePoolList["maxPoollength"] || 10000) : Math.max(this.nodePool || 100, 0),//共享节点对象池允许10000的容量 自生对象池默认100
                    childrens: Node[] = [...this.node.children];
                // this.ispoolquote && VmForNode.desPoolquote(this._nodePoolList);
                childrens.forEach((n: Node) => {
                    if (nodePoolList.length < maxNodePool) {
                        this.nodePoolList.push(n)
                    } else {
                        n.destroy();
                    }
                });
                this.node.removeAllChildren();
                this.ispoolquote && await Promise.resolve(0);//如果使用了公用对象池则延缓添加以满足对象池的充分回收
                this.node.removeAllChildren();
                const keys: string[] = this.accept_mapdata_keys;
                keys.forEach((k, i) => {
                    this.creatItemNode(this.accept_mapdataformat[k], i, k, keys.length);
                });
                this.node.emit("vmForlisted");
            }
        },
        watchStartImmediate: ["accept_mapdata_keys", "accept_mapdata"],
        watch: {
            async accept_mapdata_keys() {
                await Promise.resolve(0);
                this.execFor && this.execFor();
            },
            node(nd: Node) {
                nd && nd.children.length > 0 && this.nodeloaded(nd);//挂在成功
            },
            accept_mapdata(n, o) {
                if (n === o) return;
                if (o && o instanceof VmForArray && n !== o) {
                    o.offAll();
                    o.active = false;
                }
                if (n && n instanceof VmForArray) {
                    n.offAll();
                    n.active = true;
                    const vfa: VmForArray = n;
                    vfa.on(VmForArray.Event.PUSH, (ritem: any, item: any, index: number, length: number) => {
                        this.creatItemNode(ritem, index, index, length);
                        this.node.emit("vmForlisted");
                    })
                    vfa.on(VmForArray.Event.CONCAT, (rlist: any[], item: any, index: number, length: number) => {
                        rlist.forEach((ritem: any, i) => {
                            this.creatItemNode(ritem, index + i, index + i, length);
                        })
                        this.node.emit("vmForlisted");
                    })
                    vfa.on(VmForArray.Event.RESET, () => {
                        this.updateVmArray++;//更新数据
                    })
                }
            }
        }
    };
    instantiateItem(forWith: any): Node {
        if (this.ispoolquote && this.itemNode) {
            const itemNode = this.nodePoolList["itemNode"] = this.nodePoolList["itemNode"] || this.itemNode;//配置为共享模板
            if (this.itemNode !== itemNode) {
                this.itemNode.destroy();
            }
            this.itemNode = itemNode;
        }
        if (this.itemNode) {
            return this.nodePoolList.length > 0 ? this.nodePoolList.pop() : instantiate(this.itemNode);
        }
        if (this.itemNodeList) {
            const itemIfTypes: string[] = this.itemIfTypes;
            if (itemIfTypes.length < 1) return;
            const showType: string = itemIfTypes.find(t => tools.evalfunc.call({}, {}, forWith, false, {}, t));
            if (!showType) return;//没有可显示的类型则不处理
            if (this.nodePoolList.length > 0) {
                const index: number = this.nodePoolList.findIndex(n => n.getComponent(VmForItem)?.if === showType);
                if (index > -1) return this.nodePoolList.splice(index, 1)[0];//从对象池中返回
            }
            const templet = this.itemNodeList.find(n => n.getComponent(VmForItem).if === showType);
            return templet && instantiate(templet) || null;//用模版生成对象返回
        }
    }
    creatItemNode(item, index, key, length) {
        const attrs = [item, index, key, length];
        const forWith = (this.variables || "").split(",").reduce((r, k, i) => {
            if (!k || !k.trim()) return r;
            return r[k] = attrs[i], r;
        }, { ___VmforList__: this.mapdata });
        const _itemnode: Node = this.instantiateItem(forWith);
        if (!_itemnode) return;//条件不匹配添加
        const _vmNode: VmNode = _itemnode.getComponent(VmNode);
        if (_vmNode) {
            _vmNode.forWith = forWith;
        }
        _itemnode[forTool.forWith] = forWith;
        _itemnode[forTool.forIndex] = index;
        this.node.addChild(_itemnode);
    }
    //组件挂在成功
    nodeloaded(node: Node) {
        this.itemNode = node.children[0];
        this.itemNode[forTool.forItem] = true;
    }
    initBInd() {
        const forItems = this.node.children.filter(n => n.getComponent(VmForItem)),
            isForItem: boolean = forItems.length > 0;
        this.itemNode = isForItem ? null : (this.itemNode || this.node.children[0]);
        this.itemNodeList = isForItem && forItems || null;
        this.itemIfTypes = isForItem && forItems.map(n => {
            const fitem: VmForItem = n.getComponent(VmForItem);
            return fitem.if;
        }).filter(t => t) || null;
        if (!this.itemNode && !this.itemNodeList) return;
        this.node.removeAllChildren();
        VmNode.join(this.node, { binds: [`VmForNode.accept_mapdata=${this.mapdata}`, this.poolquote ? `VmForNode.accept_poolquote=${this.poolquote}` : ""].filter(t => t) });//创建数组的绑定关系
    }
    protected onEnable(): void {
        const accept_mapdata = this.accept_mapdata;
        if (accept_mapdata && accept_mapdata instanceof VmForArray) {
            (accept_mapdata as VmForArray).active = true;
        }
    }
    protected onDisable(): void {
        const accept_mapdata = this.accept_mapdata;
        if (accept_mapdata && accept_mapdata instanceof VmForArray) {
            (accept_mapdata as VmForArray).active = false;
        }
    }
    desVmForArray() {
        const accept_mapdata = this.accept_mapdata;
        if (accept_mapdata && accept_mapdata instanceof VmForArray) {
            const vfa: VmForArray = accept_mapdata as VmForArray;
            vfa.offAll();
            vfa.active = false;
        }
    }
    onDestroy() {
        this.desVmForArray();
        if (this.ispoolquote) return;
        const children: Node[] = (this.node?.children || []) as Node[];
        this.nodePoolList.forEach((n: Node) => {
            children.indexOf(n) === -1 && n.destroy();
        });
        this.itemNode && this.itemNode.destroy();
        this._nodePoolList = [];
    }
}
