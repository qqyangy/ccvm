import { _decorator, Component, Node, EventTarget, CCString, instantiate } from 'cc';
import { VmComponent, VmOptions } from "./VmComponent";
import { VmNode } from './VmNode';

const { ccclass, property } = _decorator;
@ccclass("VmForNode")
export class VmForNode extends VmComponent {
    @property({ type: Boolean, visible: false })
    public isVmNode: boolean = false;
    @property({ type: CCString, visible: false })
    public vmRootName: string;

    @property({ type: String, tooltip: "需要被循环数组或对象的名称" })
    public mapdata: string = "";
    @property({ type: String, tooltip: "定义循环中的临时变量名称默认：item,index,key,length" })
    public variables: string = "";


    public itemNode: Node;
    start() {
        this.initBInd();
    }
    accept_mapdata: [] | {};//数据集合
    vmOptions: VmOptions = {
        props: ["accept_mapdata"],
        computed: {
            accept_mapdataformat() {
                return Object.prototype.toString.call(this.accept_mapdata) === "[object Number]" ? new Array(this.accept_mapdata).fill(0).map((v, i) => i) : this.accept_mapdata;
            },
            accept_mapdata_keys() {
                if (!this.accept_mapdataformat) return [];
                return this.accept_mapdataformat instanceof Array ? this.accept_mapdataformat.map((v, i) => i) : Object.keys(this.accept_mapdataformat);
            }
        },
        watch: {
            accept_mapdata_keys() {
                this.node.removeAllChildren();
                const keys: string[] = this.accept_mapdata_keys;
                keys.forEach((k, i) => {
                    this.creatItemNode(this.accept_mapdataformat[k], i, k, keys.length);
                })
            }
        }
    };

    creatItemNode(item, index, key, length) {
        const attrs = [item, index, key, length];
        const _itemnode: Node = instantiate(this.itemNode);
        const _vmNode: VmNode = _itemnode.getComponent(VmNode);
        const forWith = (this.variables || "").split(",").reduce((r, k, i) => {
            if (!k || !k.trim()) return r;
            return r[k] = attrs[i], r;
        }, {});
        if (_vmNode) {
            _vmNode.forWith = forWith;
        } else {
            _itemnode["__forWith__"] = forWith;
        }
        this.node.addChild(_itemnode);

    }
    initBInd() {
        this.itemNode = this.node.children[0];
        if (!this.itemNode) return;
        this.node.removeAllChildren();
        VmNode.join(this.node, { binds: [`VmForNode.accept_mapdata=${this.mapdata}`] });//创建数组的绑定关系
    }
}