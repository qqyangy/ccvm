import { Color, Label, Sprite, UITransform, Widget, Node } from 'cc';
//Widget执行updateAlignment
const searchWiaget = (node: Node) => {
    if (!node || !node.active) return;//不处理隐藏节点
    const _widget: Widget = node.getComponent(Widget);
    if (!_widget) return;//不能存在_widget不处理
    _widget.updateAlignment();
    (node.children || []).forEach(n => searchWiaget(n));
}
export function expendArrt() {
    Object.defineProperty(Label.prototype, "hexColorStr", {
        get() {
            return "#" + this.color.toHEX();
        },
        set(color: string) {
            this.color = new Color().fromHEX(color);
        }
    });
    Object.defineProperty(Sprite.prototype, "hexColorStr", {
        get() {
            return "#" + this.color.toHEX();
        },
        set(color: string) {
            this.color = new Color().fromHEX(color);
        }
    });
    Object.defineProperty(UITransform.prototype, "rotationZ", {
        get() {
            return this._rotationZ;
        },
        set(v: number) {
            this.node.setWorldRotationFromEuler(0, 0, v % 360);
        }
    })
    //配置widthUP与heightUP便于强制更新子节点的Widget组件
    Object.defineProperties(UITransform.prototype, ["width", "height"].reduce((r, k) => {
        return Object.assign(r, {
            [`${k}UP`]: {
                get() {
                    return this[k];
                },
                set(v) {
                    this[k] = v;
                    searchWiaget(this.node);
                }
            },
            [`${k}UP2`]: {
                get() {
                    return this[k];
                },
                set(v) {
                    this[k] = v;
                    searchWiaget(this.node);
                    setTimeout(() => this.node && searchWiaget(this.node));
                }
            }
        })
    }, {}))
}