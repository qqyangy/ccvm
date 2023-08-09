import { Color, Label, Sprite } from 'cc';
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
}