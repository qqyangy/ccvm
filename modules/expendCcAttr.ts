import { Color, Label } from 'cc';
export function expendArrt() {
    Object.defineProperty(Label.prototype, "hexColorStr", {
        get() {
            return "#" + this.color.toHEX();
        },
        set(color: string) {
            this.color = new Color().fromHEX(color);
        }
    });
}