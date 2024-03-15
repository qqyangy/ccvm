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

    @property({ type: Number, tooltip: "复用节点池需要缓存节点的最大数量" })
    public nodePool: number = 0;
    @property({ type: String, tooltip: "需要被循环数组或对象的名称" })
    public mapdata: string = "";
    @property({ type: String, tooltip: "定义循环中的临时变量名称默认：item,index,key,length" })
    public variables: string = "";

    public itemNode: Node;
    startcall: number = 0;//start调用 1watch调用 2start调用
    nodePoolList: [] = [];//节点池
    accept_mapdata: [] | {};//数据集合
    vmOptions: VmOptions = {
        props: ["accept_mapdata", "node"],
        computed: {
            accept_mapdataformat() {
                return Object.prototype.toString.call(this.accept_mapdata) === "[object Number]" ? new Array(this.accept_mapdata).fill(0).map((v, i) => i) : this.accept_mapdata;
            },
            accept_mapdata_keys() {
                if (!this.accept_mapdataformat) return [];
                return this.accept_mapdataformat instanceof Array ? this.accept_mapdataformat.map((v, i) => i) : Object.keys(this.accept_mapdataformat);
            }
        },
        onLoad() {
            this.initBInd();
        },
        methods: {
            execFor() {
                const childrenLength = this.node.children.length,
                    nodePool = this.nodePool || 100,
                    maxlength = Math.max(Math.min(nodePool - this.nodePoolList.length, childrenLength), 0),
                    children = this.node.children.slice(0, maxlength),
                    nodePoolList: Node[] = this.nodePoolList = children.concat(this.nodePoolList);
                this.node.children.forEach((n: Node) => {
                    nodePoolList.indexOf(n) === -1 && n.destroy();
                });
                this.node.removeAllChildren();
                const keys: string[] = this.accept_mapdata_keys;
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
        return this.nodePoolList.length > 0 ? this.nodePoolList.shift() : instantiate(this.itemNode);
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
        VmNode.join(this.node, { binds: [`VmForNode.accept_mapdata=${this.mapdata}`] });//创建数组的绑定关系
    }
    onDestroy() {
        const children: Node[] = (this.node?.children || []) as Node[];
        this.nodePoolList.forEach((n: Node) => {
            children.indexOf(n) === -1 && n.destroy();
        });
        this.itemNode && this.itemNode.destroy();
        this.nodePoolList = [];
    }
}
