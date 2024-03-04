import { _decorator, Sprite, resources, SpriteFrame, assetManager } from 'cc';
import { VmComponent, VmOptions } from './VmComponent';
const { ccclass, property } = _decorator;

const srckey = "___src___";
function getValueSpriteFrame(path: string | SpriteFrame | number, target?: VmImage) {
    if (path === "") return { data: target.defaultSpriteFrame };
    if (target && target.preloads.length > 0 && typeof path === "number") {
        return { data: target.preloads[path] };//返回预设图片
    }
    if (path && path instanceof SpriteFrame) return { data: path };
}
@ccclass('VmImage')
export class VmImage extends VmComponent {

    public src: string = "";//资源地址
    @property(SpriteFrame)
    public defaultSpriteFrame: SpriteFrame;//默认SpriteFrame
    @property(Boolean)
    public autoRelease: boolean = true;//是否自动释放资源
    @property(Boolean)
    public isDirect: boolean = true;//是否直接切换（不使用默认）
    @property([SpriteFrame])
    preloads: SpriteFrame[] = [];//预加载图片

    @property({ type: [Boolean], visible: false, override: true })
    public isVmNode: boolean = false;
    @property({ type: [String], visible: false, override: true })
    public vmRootName: string = "";

    /*******获取图片******/
    public static getSpriteFrame(path: string | SpriteFrame | number, target?: VmImage, skipvl: boolean = false): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            if (!skipvl) {
                const vl = getValueSpriteFrame(path, target);
                if (vl) return resolve(vl.data);
            }
            resources.load(`${path}/spriteFrame`, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    return reject(err);
                }
                spriteFrame[srckey] = path;
                spriteFrame.addRef();
                resolve(spriteFrame);
            });
        });
    }
    //获取SpriteFrame数组
    public static getSpriteFrameMap(...p): Promise<SpriteFrame[]> {
        return Promise.all(p.map(s => this.getSpriteFrame(s)));
    }
    //获取SpriteFrame对象
    public static getSpriteFrameDict(...p): Promise<{}> {
        return this.getSpriteFrameMap(...p).then((sf: SpriteFrame[]) => {
            return sf.reduce((r, s, i) => {
                return r[p[i]] = s, r;
            }, {});
        });
    }

    /*****私有属性******/
    _sprite: Sprite;//节点对应的Sprite组件
    _defaultSpriteFrame: SpriteFrame;//默认SpriteFrame
    promiseSpriteFrame: Promise<SpriteFrame>;
    isStart: boolean = false;

    _cachSpriteFrame: { [key: string]: SpriteFrame } = {};

    public static vmOptions: VmOptions = {
        data: ["promiseSpriteFrame", "isStart"],
        props: ["src"],
        methods: {
            init() {
                const _sprite = this.node?.getComponent(Sprite);
                if (!_sprite) return;
                this._sprite = _sprite;
                if (this._defaultSpriteFrame) return;
                if (this.defaultSpriteFrame) {
                    return this._defaultSpriteFrame = this.defaultSpriteFrame;
                }
                if (!this.isDirect && this._sprite && this._sprite.SpriteFrame) {
                    return this._defaultSpriteFrame = this._sprite.SpriteFrame;
                }
            },
            removeImg(desTroy: boolean = false) {
                const sprite: Sprite = this._sprite;
                if (!sprite) return;
                const oldSpritFrame: SpriteFrame = sprite.spriteFrame;
                if (!oldSpritFrame) return;
                sprite.spriteFrame = null;
                const isDes = desTroy || (oldSpritFrame[srckey] !== this.src)
                if (oldSpritFrame[srckey] && this.autoRelease && isDes) {
                    // assetManager.releaseAsset(oldSpritFrame);
                    // oldSpritFrame.decRef();
                }
            },
            releaseImages() {
                const sprite: Sprite = this._sprite;
                sprite && (sprite.spriteFrame = null);
                const cachSf: { [key: string]: SpriteFrame } = this._cachSpriteFrame || {};
                this.autoRelease && Object.keys(cachSf).forEach(k => {
                    cachSf[k].decRef();
                });
                this._cachSpriteFrame = null;
            }
        },
        onDestroy() {
            this.releaseImages();
        },
        start() {
            this.isStart = true;
        },
        computed: {
            currentSpriteFrame(_return) {
                if (!this.isStart) return this.defaultSpriteFrame;
                const src = this.src;
                if (!src && src !== 0 && src !== "") return;
                this.init();
                const vl = getValueSpriteFrame(src, this);
                if (vl) return vl.data;
                const cachSf: { [key: string]: SpriteFrame } = this._cachSpriteFrame;
                if (cachSf[src]) return cachSf[src];
                _return(this._defaultSpriteFrame);
                let isErr = false;;
                VmImage.getSpriteFrame(src, this, true).catch((e) => {
                    console.log(e);
                    isErr = true;
                    return this.defaultSpriteFrame;
                }).then((sf: SpriteFrame) => {
                    if (!isErr) {
                        cachSf[src] = sf;
                    }
                    _return(cachSf[this.src] || sf);
                    return sf;
                });
            }
        },
        watchStartImmediate: ["currentSpriteFrame"],
        watch: {
            currentSpriteFrame(v: SpriteFrame) {
                if (!this.isStart) return;
                const sprite: Sprite = this._sprite;
                sprite && (sprite.spriteFrame = v);
            }
        }
    }
}


