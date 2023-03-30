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
    public static parse(exp: string): string {
        return getBindAlias().parsekey(exp);
    }

    //初始配置
    public alias: Cfg = {
        text: "Label.string",
        src: "Sprite.spriteFrame",
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
    public parsekey(exp: string) {
        const _exp = exp.trim();
        if (_exp.charAt(0) !== ":") return exp;
        const str = (t => t.substring(1, t.length))(_exp.split("=")[0].split(".")[0]);
        if (!str || !this.alias[str]) return exp;
        return exp.replace(`:${str}`, this.alias[str]);//替换成正确的表达式
    }
}