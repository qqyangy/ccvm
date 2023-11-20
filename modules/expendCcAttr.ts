import { Color, Label, Sprite, UITransform } from 'cc';
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
}