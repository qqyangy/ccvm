import { Node } from 'cc';
import { VmImage } from './VmImage';
let instanceBindAlias: BindAlias;
function getBindAlias(): BindAlias {
    return instanceBindAlias || new BindAlias();
}
type Cfg = { [key: string]: string };
export default class BindAlias {
    constructor() {
        if (instanceBindAlias) return instanceBindAlias;
        instanceBindAlias = this;
    }

    //获取配置
    public static getConfig(): Cfg {
        return getBindAlias().alias;
    }
    //追加配置
    public static addConfig(cfg: Cfg): Cfg {
        const _bindAlias: BindAlias = getBindAlias();
        return Object.assign(_bindAlias.alias, cfg);
    }
    //映射转回
    public static parse(exp: string, node?: Node): string {
        return getBindAlias().parsekey(exp, node);
    }

    //初始配置
    public alias: Cfg = {
        text: "Label.string",
        fontSize: "Label.fontSize",
        lineHeight: "Label.lineHeight",
        src: "Sprite.spriteFrame",
        image: "VmImage.src",
        "image#1": "VmImage.src",
        width: "UITransform.width",
        height: "UITransform.height",
        anchorX: "UITransform.anchorX",
        anchorY: "UITransform.anchorY",
        x: "node.x",
        y: "node.y",
        z: "node.z",
        scale: "node.scale",
        scaleX: "node.scaleX",
        scaleY: "node.scaleY",
        scaleZ: "node.scaleZ",
        opacity: "UIOpacity.opacity"
    };
    public parsekey(exp: string, node?: Node) {
        const _exp = exp.trim();
        if (_exp.charAt(0) !== ":") return exp;
        const str = (t => t.substring(1, t.length))(_exp.split("=")[0].split(".")[0]);
        if (!str || !this.alias[str]) return exp;
        if (node && str.indexOf("image") === 0) {
            const _vmImage: VmImage = node.getComponent(VmImage) || node.addComponent(VmImage);
            if (str.includes("#1")) {
                _vmImage.isDirect = false;
            }
        }
        return exp.replace(`:${str}`, this.alias[str]);//替换成正确的表达式
    }
}