import { _decorator, Sprite, resources, SpriteFrame } from 'cc';
import { VmComponent, VmOptions } from './VmComponent';
const { ccclass, property } = _decorator;

@ccclass('VmImage')
export class VmImage extends VmComponent {

    public src: string = "";//资源地址
    @property(SpriteFrame)
    public defaultSpriteFrame: SpriteFrame;//默认SpriteFrame
    @property(Boolean)
    public isDirect: boolean = true;//是否直接切换（不使用默认）

    @property({ type: [Boolean], visible: false, override: true })
    public isVmNode: boolean = false;
    @property({ type: [String], visible: false, override: true })
    public vmRootName: string = "";

    /*******获取图片******/
    public static getSpriteFrame(path: string | SpriteFrame): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            if (path && path instanceof SpriteFrame) return resolve(path);
            resources.load(`${path}/spriteFrame`, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    return reject(err);
                }
                resolve(spriteFrame)
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

    public static vmOptions: VmOptions = {
        data: ["promiseSpriteFrame"],
        props: ["src"],
        methods: {
            init() {
                this._sprite = this._sprite = this.node.getComponent(Sprite);
                if (this._defaultSpriteFrame) return;
                if (this.defaultSpriteFrame) {
                    return this._defaultSpriteFrame = this.defaultSpriteFrame;
                }
                if (!this.isDirect && this._sprite && this._sprite.SpriteFrame) {
                    return this._defaultSpriteFrame = this._sprite.SpriteFrame;
                }
            }
        },
        onEnable() {
            this.init();
        },
        start() {
            if (this.promiseSpriteFrame && this._sprite) {
                this.promiseSpriteFrame.then(d => (this._sprite.spriteFrame = d))
            }
        },
        watchStartImmediate: ["src"],
        watch: {
            src(v) {
                if (!v) return;
                this.init();
                this.promiseSpriteFrame = VmImage.getSpriteFrame(v);
            },
            promiseSpriteFrame(p: Promise<SpriteFrame>) {
                const sprite: Sprite = this._sprite;
                if (!sprite || !p) return;
                p.then((sf: SpriteFrame) => (sprite.spriteFrame = sf)).catch((e) => {
                    console.log(e);//图片加载失败
                });
                if (this._defaultSpriteFrame) {
                    return sprite.spriteFrame = this._defaultSpriteFrame;
                }
            }
        }
    }
}


