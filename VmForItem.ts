import { _decorator, Component, CCString } from 'cc';

const { ccclass, property } = _decorator;
@ccclass("VmForItem")
export class VmForItem extends Component {
    @property({ type: CCString })
    public if: string = "";
}