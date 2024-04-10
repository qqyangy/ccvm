import { _decorator, Component, Node, EventTarget, CCString, instantiate } from 'cc';
import forTool from './modules/forTool';
import { VmComponent, VmOptions } from "./VmComponent";
import { VmNode } from './VmNode';

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
    startcall: number = 0;//start调用 1watch调用 2start调用
    nodePoolList: Node[] = [];
    _nodePoolList: [] = [];//节点池
    accept_mapdata: [] | {};//数据集合
    vmOptions: VmOptions = {
        props: ["accept_mapdata", "accept_poolquote", "node"],
        computed: {
            accept_mapdataformat() {
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
                this.ispoolquote && VmForNode.desPoolquote(this._nodePoolList);
                this.node.removeAllChildren();
                childrens.forEach((n: Node) => {
                    if (nodePoolList.length < maxNodePool) {
                        this.nodePoolList.push(n)
                    } else {
                        n.destroy();
                    }
                });
                const keys: string[] = this.accept_mapdata_keys;
                this.ispoolquote && await Promise.resolve(0);//如果使用了公用对象池则延缓添加以满足对象池的充分回收
                keys.forEach((k, i) => {
                    this.creatItemNode(this.accept_mapdataformat[k], i, k, keys.length);
                });
            }
        },
        watchStartImmediate: ["accept_mapdata_keys"],
        watch: {
            accept_mapdata_keys() {
                this.execFor();
            },
            node(nd: Node) {
                nd && nd.children.length > 0 && this.nodeloaded(nd);//挂在成功
            }
        }
    };
    instantiateItem(): Node {
        if (this.ispoolquote && this.itemNode) {
            const itemNode = this.nodePoolList["itemNode"] = this.nodePoolList["itemNode"] || this.itemNode;//配置为共享模板
            if (this.itemNode !== itemNode) {
                this.itemNode.destroy();
            }
            this.itemNode = itemNode;
        }
        return this.nodePoolList.length > 0 ? this.nodePoolList.pop() : instantiate(this.itemNode);
    }
    creatItemNode(item, index, key, length) {
        const attrs = [item, index, key, length];
        const _itemnode: Node = this.instantiateItem();
        const _vmNode: VmNode = _itemnode.getComponent(VmNode);
        const forWith = (this.variables || "").split(",").reduce((r, k, i) => {
            if (!k || !k.trim()) return r;
            return r[k] = attrs[i], r;
        }, { ___VmforList__: this.mapdata });
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
        this.itemNode = this.itemNode || this.node.children[0];
        if (!this.itemNode) return;
        this.node.removeAllChildren();
        VmNode.join(this.node, { binds: [`VmForNode.accept_mapdata=${this.mapdata}`, this.poolquote ? `VmForNode.accept_poolquote=${this.poolquote}` : ""].filter(t => t) });//创建数组的绑定关系
    }
    onDestroy() {
        if (this.ispoolquote) return;
        const children: Node[] = (this.node?.children || []) as Node[];
        this.nodePoolList.forEach((n: Node) => {
            children.indexOf(n) === -1 && n.destroy();
        });
        this.itemNode && this.itemNode.destroy();
        this._nodePoolList = [];
    }
}
