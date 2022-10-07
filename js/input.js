const SINGLE = 0x53;
const MULTIPLAYER = 0xBA;
const COIN = 0x43;
const LEFT = 0x25;
const RIGHT = 0x27;
const SPACE = 0x20;
const P = 0x50;
const RESET = 0x52;


class Input {
    constructor( cpu) {
        this.cpu = cpu;
        this.mapper = [];

        this.out_port2 = 0;
        this.out_port3 = 0;
        this.out_port4l = 0;
        this.out_port4h = 0;
        this.out_port5 = 0;

        this.in_port1 = 0;
        this.in_port2 = 0;
                
        this.in_port2 |= (0x1 | 0x2);
        this.in_port2 |= (0x80);
    }
    update() {
        this.in_port1 = this.in_port1 & (~(0x1 | 0x2 | 0x4 | 0x10 | 0x20 | 0x40));
        this.in_port2 = this.in_port2 & (~(0x4 | 0x10 | 0x20 | 0x40));
        
        if (this.mapper[COIN]) {
            this.in_port1 |= 0x1;
        }
        if (this.mapper[MULTIPLAYER]) {
            this.in_port1 |= 0x2;
        }
        if (this.mapper[SINGLE]) {
            this.in_port1 |= 0x4;
        }
        if (this.mapper[LEFT]) {
            this.in_port1 |= 0x20;
            this.in_port2 |= 0x20;
        }
        if (this.mapper[RIGHT]) {
            this.in_port1 |= 0x40;
            this.in_port2 |= 0x40;
        }
        if (this.mapper[SPACE]) {
            this.in_port1 |= 0x10;
            this.in_port2 |= 0x10;
        }
        if (this.mapper[RESET]) {
            this.cpu.Reset();
        }
    }
    OutPutPort(port, value) {
        switch (port) {
            case 2:
                this.out_port2 = value;
                break;
            case 3:
                this.out_port3 = value;
                break;
            case 4:
                this.out_port4l = this.out_port4h;
                this.out_port4h = value;
                break;
            case 5:
                this.out_port5 = value;
                break;
        }
    }
    InputPort(port) {
        var result = 0;
        switch (port) {
            case 1:
                result = this.in_port1;
                break;
            case 2:
                result = this.in_port2;
                break;
            case 3:
                result = ((((this.out_port4h << 8) | this.out_port4l) << this.out_port2) >> 8);
                break;
        }
        return result;
    }
    onkeydown(keyCode){
        this.mapper[keyCode] = true;
    }
    onkeyup(keyCode){
        this.mapper[keyCode] = false;
    }
};

