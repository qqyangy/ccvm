import { _decorator, Component, instantiate, Node, Prefab, resources, assetManager } from 'cc';
import { VmComponent, VmOptions } from './VmComponent';
import { VmImage } from './VmImage';
const { ccclass, property } = _decorator;

const srckey = "___src___",
    fabkey = "___fab___";
const desNode = (n: Node, autoRelease: boolean) => {
    if (!n) return;
    if (n[fabkey] && autoRelease) {
        assetManager.releaseAsset(n[fabkey]);
        n[fabkey] = null;
    }
    n.destroy();
}
let loadFabEventDt = {};//onloadFab注册的事件
@ccclass('VmFabLoad')
export class VmFabLoad extends VmComponent {
    public static onLoadFab(type: string, handler: Function) {
        loadFabEventDt[type] = handler;
    }
    public static offLoadFab(type: string) {
        loadFabEventDt[type] && delete loadFabEventDt[type];
    }
    public static offLoadFabAll() {
        loadFabEventDt = {};
    }
    public static loadFab(src: string): Promise<Prefab> {
        const path = src.replace(/\.prefab$/, ""),
            rut: Promise<Prefab> = new Promise((resolve, reject) => {
                resources.load(path, Prefab, (err, prefab) => {
                    if (err) {
                        return reject(err);
                    }
                    prefab[srckey] = src;
                    resolve(prefab);
                });
            });
        Object.keys(loadFabEventDt).forEach(key => {
            loadFabEventDt[key](path, rut);
        });
        return rut;
    }
    public static releaseFab(path: string) {
        resources.release(path);
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
    extraLoads: Promise<any>[] = [];
    /***props****/
    @property(String)
    public src: string | number | Prefab = "0";//资源地址
    @property({ type: Number, visible() { return this.morecfg || !!this.delay } })
    public delay: number = 0;//延迟时间
    @property(Boolean)
    public autoRelease: boolean = true;//是否自动释放资源
    @property(Boolean)
    public morecfg: boolean = false

    /*****set****/
    @property({ type: Node, visible() { return this.morecfg || !!this.container } })
    public container: Node;//默认容器节点
    @property({ type: Node, visible() { return this.morecfg || !!this.comptemplet } })
    public comptemplet: Node;//组件模板
    @property({ type: String, visible() { return this.morecfg || !!this.usecomps } })
    public usecomps: string = "";//要应用的组件
    @property({ type: [Prefab], visible() { return this.morecfg || this.preloads.length > 0 } })
    public preloads: Prefab[] = [];//预加载的预制件
    @property({ type: Boolean, visible() { return this.morecfg || !!this.useDestroy } })
    public useDestroy: boolean = false;

    @property({ type: Node, visible() { return this.morecfg || !!this.loading } })
    loading: Node;//loading元素

    @property({ type: [String], tooltip: "额外需要加载的资源带猴子按正确类型加载不带文件类型按图片类型加载", visible() { return this.morecfg || this.extraAssets.length > 0 } })
    extraAssets: string[] = [];

    preSrc: Promise<Prefab> | Prefab;

    /*****overflow******/
    @property({ type: [Boolean], visible: false, override: true })
    public isVmNode: boolean = false;
    @property({ type: [String], visible: false, override: true })
    public vmRootName: string = "";

    nodestroy: boolean = true;//是否没销毁
    isStarted: boolean = false;//是否执行start

    /********computed*******/
    containerBox: Node;//容器节点
    vmOptions: VmOptions = {
        data: ["container", "comptemplet", "usecomps", "preloads", "srcNode", "preSrc", "extraLoads"],
        props: ["src", "extraAssets"],
        computed: {
            containerBox() {
                return this.container || this.node;
            },
            //需要使用的模板组件
            readComponents() {
                const comptemplet: Node = this.comptemplet,
                    usecomps: string = this.usecomps || "",
                    usecompCfg: { [key: string]: string } = usecomps.split(",").map(t => t.trim()).filter(t => t).reduce((r, k) => {
                        const ks = k.split("."),
                            key = ks[0],
                            value = ks[1] || "m";
                        return r[key] = value, r;
                    }, {});
                if (!comptemplet) return [];
                const _component: Component[] = comptemplet["_components"] || [];
                return _component.filter((c: any) => {
                    const cname = (c._name || c.name || c.constructor?.name || "").replace(/^.*<|>.*$/g, ""),
                        cfg = cname && usecompCfg[cname];
                    if (cfg && ["m", "M", "move"].indexOf(cfg) !== -1) {
                        comptemplet.removeComponent(c);
                    }
                    return cfg;
                })
            }
        },
        methods: {
            getpreSrc() {
                if (!this.nodestroy) return;
                this.preSrc = (() => {
                    const v: number | string | Prefab = this.src;
                    if (!v && !(v === 0 || v === "0")) return null;
                    const vtype = typeof v;
                    if (vtype === "number" || v == 0) return this.preloads[v as number] || null;
                    if (vtype === "string") return VmFabLoad.loadFab(v as string);
                    if (v instanceof Prefab) return vtype;
                })();
            },
            //提取要合并的属性
            getAttr(cCons: any) {
                const props = cCons.__props__ || [],
                    attrs = cCons.__attrs__ || {},
                    attrArys = Object.keys(attrs).map(t => t.split("$_$")[0]);
                return props.filter(t => {
                    return t && attrArys.indexOf(t) !== -1;
                })
            },
            setComponent(fab: Prefab) {
                const v: Node = instantiate(fab);
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
                });
                fab[srckey] && (v[fabkey] = fab);
                return v;
            },
            getextraLoads() {
                if (this.extraLoads?.length < 1) return;
                this.extraLoads = this.extraAssets.map(t => {
                    return VmImage.getSpriteFrame(t);
                });
            },
            startFunc() {
                this.nodestroy = true;
                setTimeout(() => {
                    if (!this.getpreSrc) return;
                    this.getpreSrc();
                    this.getextraLoads();
                    this.started = true;
                }, this.delay || 0);
            },
            destroyFunc() {
                const srcNode: Node = this.srcNode;
                this.nodestroy = false;
                const autoRelease = this.autoRelease;
                desNode(srcNode, autoRelease);
                autoRelease && Promise.all(this.extraLoads).then((assets) => {
                    assets.forEach(d => {
                        assetManager.releaseAsset(d);
                    })
                });
                this.extraLoads = [];//清空预加载资源
            }
        },
        onEnable() {
            if (!this.useDestroy || !this.isStarted) return;//非自动销毁不处理
            this.startFunc();
        },
        start() {
            this.isStarted = true;
            this.startFunc();
        },
        onDestroy() {
            if (this.useDestroy) return;//已自动销毁不处理
            this.destroyFunc();
        },
        onDisable() {
            if (!this.useDestroy) return;//非自动销毁不处理
            this.destroyFunc();
        },
        watch: {
            extraAssets() {
                this.getextraLoads();
            },
            src() {
                if (!this.started) return;
                this.getpreSrc();
            },
            preSrc(v: Prefab | Promise<Prefab>) {
                const autoRelease = this.autoRelease;
                if (!v) return this.srcNode = null;
                if (v instanceof Prefab) {
                    return this.srcNode = this.setComponent(v);
                }
                if (v instanceof Promise) {
                    return v.then(d => {
                        if (!this.nodestroy) return autoRelease && assetManager.releaseAsset(d);
                        this.srcNode = this.setComponent(d);
                    }).catch(e => { })
                }
            },
            async srcNode(v: Node) {
                const containerBox: Node = this.containerBox,
                    loading: Node = this.loading,
                    autoRelease = this.autoRelease;
                if (!this.nodestroy) return;
                await Promise.all(this.extraLoads || []);
                loading && (loading.active = !v);
                containerBox?.children.forEach((n: Node) => {
                    if (v && n === v) return;
                    desNode(n, autoRelease);
                })
                if (!v) return;
                containerBox.addChild(v);
            }
        }
    }
}


