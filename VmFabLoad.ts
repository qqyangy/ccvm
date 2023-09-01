import { _decorator, Component, instantiate, Node, Prefab, resources } from 'cc';
import { VmComponent, VmOptions } from './VmComponent';
const { ccclass, property } = _decorator;

@ccclass('VmFabLoad')
export class VmFabLoad extends VmComponent {
    public static loadFab(src: string): Promise<Prefab> {
        return new Promise((resolve, reject) => {
            resources.load(src.replace(/\.prefab$/, ""), Prefab, (err, prefab) => {
                if (err) {
                    return reject(err);
                }
                resolve(prefab);
            });
        })
    }
    public static async prefab2Node(dt: Promise<Prefab> | Prefab): Promise<Node> {
        if (!dt) return;
        if (dt instanceof Prefab) {
            instantiate(dt);
        } else if (dt instanceof Promise) {
            return instantiate(await dt);
        }
    }
    /******data*******/
    srcNode: Node;
    /***props****/
    public src: string | number | Prefab = "";//资源地址

    /*****set****/
    @property(Node)
    public container: Node;//默认容器节点
    @property(Node)
    public comptemplet: Node;//组件模板
    @property(String)
    public usecomps: string = "";//要应用的组件
    @property([Prefab])
    public preloads: Prefab[] = [];//预加载的预制件

    @property(Node)
    loading: Node;//loading元素

    /*****overflow******/
    @property({ type: [Boolean], visible: false, override: true })
    public isVmNode: boolean = false;
    @property({ type: [String], visible: false, override: true })
    public vmRootName: string = "";

    /********computed*******/
    preSrc: Promise<Prefab> | Prefab;
    containerBox: Node;//容器节点
    vmOptions: VmOptions = {
        data: ["container", "comptemplet", "usecomps", "preloads", "srcNode"],
        props: ["src"],
        computed: {
            containerBox() {
                return this.container || this.node;
            },
            preSrc() {
                const v: number | string | Prefab = this.src;
                if (!v && v !== 0) return null;
                const vtype = typeof v;
                if (vtype === "number") return this.preloads[v as number] || null;
                if (vtype === "string") return VmFabLoad.loadFab(v as string);
                if (v instanceof Prefab) return vtype;
            },
            //需要使用的模板组件
            readComponents() {
                const comptemplet: Node = this.comptemplet,
                    usecomps: string = this.usecomps || "",
                    usecompAry: string[] = usecomps.split(",").map(t => t.trim()).filter(t => t);
                if (!comptemplet) return [];
                const _component: Component[] = comptemplet["_components"] || [];
                return _component.filter((c: any) => {
                    const cname = (c._name || c.name || c.constructor?.name || "").replace(/^.*<|>.*$/g, "");
                    return cname && usecompAry.indexOf(cname) !== -1;
                })
            }
        },
        watchStartImmediate: ["preSrc", "srcNode"],
        methods: {
            //提取要合并的属性
            getAttr(cCons: any) {
                const props = cCons.__props__ || [],
                    attrs = cCons.__attrs__ || {},
                    attrArys = Object.keys(attrs).map(t => t.split("$_$")[0]);
                return props.filter(t => {
                    return t && attrArys.indexOf(t) !== -1;
                })
            },
            setComponent(v: Node) {
                const readComponents: Component[] = this.readComponents;
                readComponents.forEach((c: any) => {
                    const compCons: any = c?.constructor;
                    if (!compCons) return;
                    const nodeComp: Component = v.getComponent(compCons) || v.addComponent(compCons),
                        keys: string[] = this.getAttr(compCons);
                    keys.forEach(k => {
                        const value = c[k];
                        let nvalue = value;
                        if (value && ["[object Object]", "[object Array]"].indexOf(Object.prototype.toString.call(value)) !== -1) {
                            nvalue = JSON.parse(JSON.stringify(value));
                        }
                        nodeComp[k] = nvalue;
                    })
                })
                return v;
            }
        },
        watch: {
            preSrc(v: Prefab | Promise<Prefab>) {
                if (!v) return this.srcNode = null;
                if (v instanceof Prefab) {
                    return this.srcNode = this.setComponent(instantiate(v));
                }
                if (v instanceof Promise) {
                    return v.then(d => {
                        this.srcNode = this.setComponent(instantiate(d));
                    }).catch(e => { })
                }
            },
            srcNode(v: Node) {
                const containerBox: Node = this.containerBox,
                    loading: Node = this.loading;
                loading && (loading.active = !v);
                containerBox.removeAllChildren();
                if (!v) return;
                containerBox.addChild(v);
            }
        }
    }
}


