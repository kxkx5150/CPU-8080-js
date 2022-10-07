class Intel8080 {
    constructor(memory) {
        this.PC = 0;
        this.SP = 0;

        this.A = 0;
        this.B = 0;
        this.C = 0;
        this.D = 0;
        this.E = 0;
        this.H = 0;
        this.L = 0;

        this.BC = 0;
        this.DE = 0;
        this.HL = 0;

        this.SIGN = 0;
        this.ZERO = 0;
        this.HALFCARRY = 0;
        this.PARITY = 0;
        this.CARRY = 0;
        this.INTERRUPT = 0;

        this.current_inst = 0;
        this.interrupt_alternate = 0;
        this.count_instructions = 0;
        this.disassembly_pc = 0;
        this.mappingTable = new Array(0x100);
        this.instruction_per_frame = 4000;
        this.half_instruction_per_frame = 4000 >> 1;

        this.memory = memory;

        this.counts = 0;
    }
    init(input) {
        this.io = input;
        this.reset();
        this.initTables();
    }
    reset() {
        this.PC = 0;

        this.A = 0;
        this.BC = 0;
        this.DE = 0;
        this.HL = 0;

        this.SIGN = 0;
        this.ZERO = 0;
        this.HALFCARRY = 0;
        this.PARITY = 0;
        this.CARRY = 0;
        this.INTERRUPT = 0;
    }
    run() {
        for (var i = 0; i < this.instruction_per_frame; ++i) {
            this.exe();
        }
    }
    exe() {
        this.disassembly_pc = this.PC;
        this.current_inst = this.fetchRomByte();

        if (this.mappingTable[this.current_inst] != null) {
            this.mappingTable[this.current_inst].call(this);
        } else {
            throw new Error("OPCODE Unhandled");
        }

        this.count_instructions += 1;
        this.counts++;
        if(this.counts == 100000){
            console.log("");
        }

        if (this.count_instructions >= this.half_instruction_per_frame) {
            if (this.INTERRUPT) {
                if (this.interrupt_alternate == 0) {
                    this.call_irq(0x08);
                } else {
                    this.call_irq(0x10);
                }
            }
            this.interrupt_alternate = 1 - this.interrupt_alternate;
            this.count_instructions = 0;
        }
    }
    call_irq(inAddress) {
        this.INTERRUPT = 0;
        this.stackPush(this.PC);
        this.PC = inAddress;
    }
    op_NOP() {
    }
    op_JMP() {
        var condition = true;
        var data16 = this.fetchRomShort();
        switch (this.current_inst) {
            case 0xC3:
                break;
            case 0xC2:
                condition = !this.ZERO;
                break;
            case 0XCA:
                condition = Boolean(this.ZERO);
                break;
            case 0xD2:
                condition = !this.CARRY;
                break;
            case 0xDA:
                condition = Boolean(this.CARRY);
                break;
            case 0xF2:
                condition = !this.SIGN;
                break;
            case 0xFA:
                condition = Boolean(this.SIGN);
                break;
        }
        if (condition) {
            this.PC = data16;
        }
    }
    op_LXI_BC() {
        var data16 = this.fetchRomShort();
        this.setBC(data16);
    }
    op_LXI_DE() {
        var data16 = this.fetchRomShort();
        this.setDE(data16);
    }
    op_LXI_HL() {
        var data16 = this.fetchRomShort();
        this.setHL(data16);
    }
    op_LXI_SP() {
        var data16 = this.fetchRomShort();
        this.setSP(data16);
    }
    op_MVI_A() {
        var data8 = this.fetchRomByte();
        this.setA(data8);
    }
    op_MVI_B() {
        var data8 = this.fetchRomByte();
        this.setB(data8);
    }
    op_MVI_C() {
        var data8 = this.fetchRomByte();
        this.setC(data8);
    }
    op_MVI_D() {
        var data8 = this.fetchRomByte();
        this.setD(data8);
    }
    op_MVI_E() {
        var data8 = this.fetchRomByte();
        this.setE(data8);
    }
    op_MVI_H() {
        var data8 = this.fetchRomByte();
        this.setH(data8);
    }
    op_MVI_L() {
        var data8 = this.fetchRomByte();
        this.setL(data8);
    }
    op_MVI_HL() {
        var data8 = this.fetchRomByte();
        this.writeByte(this.HL, data8);
    }
    op_CALL() {
        var condition = true;
        var data16 = this.fetchRomShort();
        switch (this.current_inst) {
            case 0xCD:
                break;
            case 0xC4:
                condition = !this.ZERO;
                break;
            case 0xCC:
                condition = Boolean(this.ZERO);
                break;
            case 0xD4:
                condition = !this.CARRY;
                break;
            case 0xDC:
                condition = Boolean(this.CARRY);
                break;
        }
        if (condition) {
            this.stackPush(this.PC);
            this.PC = data16;
        }
    }
    op_RET() {
        var condition = true;
        switch (this.current_inst) {
            case 0xC9:
                break;
            case 0xC0:
                condition = !this.ZERO;
                break;
            case 0xC8:
                condition = Boolean(this.ZERO);
                break;
            case 0xD0:
                condition = !this.CARRY;
                break;
            case 0xD8:
                condition = Boolean(this.CARRY);
                break;
        }
        if (condition) {
            this.PC = this.stackPop();
        }
    }
    op_LDA() {
        var source;
        switch (this.current_inst) {
            case 0x0A:
                source = this.BC;
                break;
            case 0x1A:
                source = this.DE;
                break;
            case 0x3A:
                source = this.fetchRomShort();
                break;
        }
        this.setA(this.readByte(source));
    }
    op_PUSH() {
        var value;
        switch (this.current_inst) {
            case 0xC5:
                value = this.BC;
                break;
            case 0xD5:
                value = this.DE;
                break;
            case 0xE5:
                value = this.HL;
                break;
            case 0xF5:
                value = (this.A << 8);
                if (this.SIGN) {
                    value |= 0x80;
                }
                if (this.ZERO) {
                    value |= 0x40;
                }
                if (this.INTERRUPT) {
                    value |= 0x20;
                }
                if (this.HALFCARRY) {
                    value |= 0x10;
                }
                if (this.CARRY) {
                    value |= 0x1;
                }
                break;
        }
        this.stackPush(value);
    }
    op_POP_BC() {
        var value = this.stackPop();
        this.setBC(value);
    }
    op_POP_DE() {
        var value = this.stackPop();
        this.setDE(value);
    }
    op_POP_HL() {
        var value = this.stackPop();
        this.setHL(value);
    }
    op_POP_FLAGS() {
        var value = this.stackPop();
        this.A = (value >> 8);
        this.SIGN = (value & 0x80);
        this.ZERO = (value & 0x40);
        this.INTERRUPT = (value & 0x20);
        this.HALFCARRY = (value & 0x10);
        this.CARRY = (value & 0x1);
    }
    op_MOVHL() {
        switch (this.current_inst) {
            case 0x77:
                this.writeByte(this.HL, this.A);
                break;
            case 0x70:
                this.writeByte(this.HL, this.B);
                break;
            case 0x71:
                this.writeByte(this.HL, this.C);
                break;
            case 0x72:
                this.writeByte(this.HL, this.D);
                break;
            case 0x73:
                this.writeByte(this.HL, this.E);
                break;
            case 0x74:
                this.writeByte(this.HL, this.H);
                break;
            case 0x75:
                this.writeByte(this.HL, this.L);
                break;
        }
    }
    op_MOV() {
        switch (this.current_inst) {
            case 0x7F:
                this.setA(this.A);
                break;
            case 0x78:
                this.setA(this.B);
                break;
            case 0x79:
                this.setA(this.C);
                break;
            case 0x7A:
                this.setA(this.D);
                break;
            case 0x7B:
                this.setA(this.E);
                break;
            case 0x7C:
                this.setA(this.H);
                break;
            case 0x7D:
                this.setA(this.L);
                break;
            case 0x7E:
                this.setA(this.readByte(this.HL));
                break;
            case 0x47:
                this.setB(this.A);
                break;
            case 0x40:
                this.setB(this.B);
                break;
            case 0x41:
                this.setB(this.C);
                break;
            case 0x42:
                this.setB(this.D);
                break;
            case 0x43:
                this.setB(this.E);
                break;
            case 0x44:
                this.setB(this.H);
                break;
            case 0x45:
                this.setB(this.L);
                break;
            case 0x46:
                this.setB(this.readByte(this.HL));
                break;
            case 0x4F:
                this.setC(this.A);
                break;
            case 0x48:
                this.setC(this.B);
                break;
            case 0x49:
                this.setC(this.C);
                break;
            case 0x4A:
                this.setC(this.D);
                break;
            case 0x4B:
                this.setC(this.E);
                break;
            case 0x4C:
                this.setC(this.H);
                break;
            case 0x4D:
                this.setC(this.L);
                break;
            case 0x4E:
                this.setC(this.readByte(this.HL));
                break;
            case 0x57:
                this.setD(this.A);
                break;
            case 0x50:
                this.setD(this.B);
                break;
            case 0x51:
                this.setD(this.C);
                break;
            case 0x52:
                this.setD(this.D);
                break;
            case 0x53:
                this.setD(this.E);
                break;
            case 0x54:
                this.setD(this.H);
                break;
            case 0x55:
                this.setD(this.L);
                break;
            case 0x56:
                this.setD(this.readByte(this.HL));
                break;
            case 0x5F:
                this.setE(this.A);
                break;
            case 0x58:
                this.setE(this.B);
                break;
            case 0x59:
                this.setE(this.C);
                break;
            case 0x5A:
                this.setE(this.D);
                break;
            case 0x5B:
                this.setE(this.E);
                break;
            case 0x5C:
                this.setE(this.H);
                break;
            case 0x5D:
                this.setE(this.L);
                break;
            case 0x5E:
                this.setE(this.readByte(this.HL));
                break;
            case 0x67:
                this.setH(this.A);
                break;
            case 0x60:
                this.setH(this.B);
                break;
            case 0x61:
                this.setH(this.C);
                break;
            case 0x62:
                this.setH(this.D);
                break;
            case 0x63:
                this.setH(this.E);
                break;
            case 0x64:
                this.setH(this.H);
                break;
            case 0x65:
                this.setH(this.L);
                break;
            case 0x66:
                this.setH(this.readByte(this.HL));
                break;
            case 0x6F:
                this.setL(this.A);
                break;
            case 0x68:
                this.setL(this.B);
                break;
            case 0x69:
                this.setL(this.C);
                break;
            case 0x6A:
                this.setL(this.D);
                break;
            case 0x6B:
                this.setL(this.E);
                break;
            case 0x6C:
                this.setL(this.H);
                break;
            case 0x6D:
                this.setL(this.L);
                break;
            case 0x6E:
                this.setL(this.readByte(this.HL));
                break;
        }
    }
    op_INX() {
        switch (this.current_inst) {
            case 0x03:
                this.setBC(this.BC + 1);
                break;
            case 0x13:
                this.setDE(this.DE + 1);
                break;
            case 0x23:
                this.setHL(this.HL + 1);
                break;
            case 0x33:
                this.setSP(this.SP + 1);
                break;
        }
    }
    op_DAD_BC() {
        this.addHL(this.BC);
    }
    op_DAD_DE() {
        this.addHL(this.DE);
    }
    op_DAD_HL() {
        this.addHL(this.HL);
    }
    op_DAD_SP() {
        this.addHL(this.SP);
    }
    op_DCX() {
        switch (this.current_inst) {
            case 0x0B:
                this.setBC(this.BC - 1);
                break;
            case 0x1B:
                this.setDE(this.DE - 1);
                break;
            case 0x2B:
                this.setHL(this.HL - 1);
                break;
            case 0x3B:
                this.setSP(this.SP - 1);
                break;
        }
    }
    op_DEC() {
        switch (this.current_inst) {
            case 0x3D:
                this.setA(this.doDec(this.A));
                break;
            case 0x05:
                this.setB(this.doDec(this.B));
                break;
            case 0x0D:
                this.setC(this.doDec(this.C));
                break;
            case 0x15:
                this.setD(this.doDec(this.D));
                break;
            case 0x1D:
                this.setE(this.doDec(this.E));
                break;
            case 0x25:
                this.setH(this.doDec(this.H));
                break;
            case 0x2D:
                this.setL(this.doDec(this.L));
                break;
            case 0x35:
                var data8 = this.readByte(this.HL);
                this.writeByte(this.HL, this.doDec(data8));
                break;
        }
    }
    op_INC() {
        switch (this.current_inst) {
            case 0x3C:
                this.setA(this.doInc(this.A));
                break;
            case 0x04:
                this.setB(this.doInc(this.B));
                break;
            case 0x0C:
                this.setC(this.doInc(this.C));
                break;
            case 0x14:
                this.setD(this.doInc(this.D));
                break;
            case 0x1C:
                this.setE(this.doInc(this.E));
                break;
            case 0x24:
                this.setH(this.doInc(this.H));
                break;
            case 0x2C:
                this.setL(this.doInc(this.L));
                break;
            case 0x34:
                var data8 = this.readByte(this.HL);
                this.writeByte(this.HL, this.doInc(data8));
                break;
        }
    }
    op_AND() {
        switch (this.current_inst) {
            case 0xA7:
                this.doAnd(this.A);
                break;
            case 0xA0:
                this.doAnd(this.B);
                break;
            case 0xA1:
                this.doAnd(this.C);
                break;
            case 0xA2:
                this.doAnd(this.D);
                break;
            case 0xA3:
                this.doAnd(this.E);
                break;
            case 0xA4:
                this.doAnd(this.H);
                break;
            case 0xA5:
                this.doAnd(this.L);
                break;
            case 0xA6:
                this.doAnd(this.readByte(this.HL));
                break;
            case 0xE6:
                var immediate = this.fetchRomByte();
                this.doAnd(immediate);
                break;
        }
    }
    op_XOR() {
        switch (this.current_inst) {
            case 0xAF:
                this.doXor(this.A);
                break;
            case 0xA8:
                this.doXor(this.B);
                break;
            case 0xA9:
                this.doXor(this.C);
                break;
            case 0xAA:
                this.doXor(this.D);
                break;
            case 0xAB:
                this.doXor(this.E);
                break;
            case 0xAC:
                this.doXor(this.H);
                break;
            case 0xAD:
                this.doXor(this.L);
                break;
            case 0xAE:
                this.doXor(this.readByte(this.HL));
                break;
            case 0xEE:
                var immediate = this.fetchRomByte();
                this.doXor(immediate);
                break;
        }
    }
    op_OR() {
        switch (this.current_inst) {
            case 0xB7:
                this.doOr(this.A);
                break;
            case 0xB0:
                this.doOr(this.B);
                break;
            case 0xB1:
                this.doOr(this.C);
                break;
            case 0xB2:
                this.doOr(this.D);
                break;
            case 0xB3:
                this.doOr(this.E);
                break;
            case 0xB4:
                this.doOr(this.H);
                break;
            case 0xB5:
                this.doOr(this.L);
                break;
            case 0xB6:
                this.doOr(this.readByte(this.HL));
                break;
            case 0xF6:
                var immediate = this.fetchRomByte();
                this.doOr(immediate);
                break;
        }
    }
    op_ADD() {
        switch (this.current_inst) {
            case 0x87:
                this.doByteAdd(this.A);
                break;
            case 0x80:
                this.doByteAdd(this.B);
                break;
            case 0x81:
                this.doByteAdd(this.C);
                break;
            case 0x82:
                this.doByteAdd(this.D);
                break;
            case 0x83:
                this.doByteAdd(this.E);
                break;
            case 0x84:
                this.doByteAdd(this.H);
                break;
            case 0x85:
                this.doByteAdd(this.L);
                break;
            case 0x86:
                this.doByteAdd(this.readByte(this.HL));
                break;
            case 0xC6:
                var immediate = this.fetchRomByte();
                this.doByteAdd(immediate);
                break;
        }
    }
    op_ADC() {
        var carryvalue = 0;
        if (this.CARRY) {
            carryvalue = 1;
        }
        switch (this.current_inst) {
            case 0x8F:
                this.doByteAdd(this.A, carryvalue);
                break;
            case 0x88:
                this.doByteAdd(this.B, carryvalue);
                break;
            case 0x89:
                this.doByteAdd(this.C, carryvalue);
                break;
            case 0x8A:
                this.doByteAdd(this.D, carryvalue);
                break;
            case 0x8B:
                this.doByteAdd(this.E, carryvalue);
                break;
            case 0x8C:
                this.doByteAdd(this.H, carryvalue);
                break;
            case 0x8D:
                this.doByteAdd(this.L, carryvalue);
                break;
            case 0x8E:
                this.doByteAdd(this.readByte(this.HL), carryvalue);
                break;
            case 0xCE:
                var immediate = this.fetchRomByte();
                this.doByteAdd(immediate, carryvalue);
                break;
        }
    }
    op_SUB() {
        switch (this.current_inst) {
            case 0x97:
                this.doByteSub(this.A);
                break;
            case 0x90:
                this.doByteSub(this.B);
                break;
            case 0x91:
                this.doByteSub(this.C);
                break;
            case 0x92:
                this.doByteSub(this.D);
                break;
            case 0x93:
                this.doByteSub(this.E);
                break;
            case 0x94:
                this.doByteSub(this.H);
                break;
            case 0x95:
                this.doByteSub(this.L);
                break;
            case 0x96:
                this.doByteSub(this.readByte(this.HL));
                break;
            case 0xD6:
                var immediate = this.fetchRomByte();
                this.doByteSub(immediate);
                break;
        }
    }
    op_SBBI() {
        var immediate = this.fetchRomByte();
        var carryvalue = 0;
        if (this.CARRY) {
            carryvalue = 1;
        }
        this.doByteSub(immediate, carryvalue);
    }
    op_CMP() {
        var value = 0;
        switch (this.current_inst) {
            case 0xBF:
                value = this.A;
                break;
            case 0xB8:
                value = this.B;
                break;
            case 0xB9:
                value = this.C;
                break;
            case 0xBA:
                value = this.D;
                break;
            case 0xBB:
                value = this.E;
                break;
            case 0xBC:
                value = this.H;
                break;
            case 0xBD:
                value = this.L;
                break;
            case 0xBE:
                value = this.readByte(this.HL);
                break;
            case 0xFE:
                value = this.fetchRomByte();
                break;
        }
        this.doCompSub(value);
    }
    op_XCHG() {
        var temp = this.DE;
        this.setDE(this.HL);
        this.setHL(temp);
    }
    op_XTHL() {
        var temp = this.H;
        this.setH(this.readByte(this.SP + 1));
        this.writeByte(this.SP + 1, temp);
        var temp = this.L;
        this.setL(this.readByte(this.SP));
        this.writeByte(this.SP, temp);
    }
    op_OUTP() {
        var port = this.fetchRomByte();
        this.io.OutPutPort(port, this.A);
    }
    op_INP() {
        var port = this.fetchRomByte();
        this.setA(this.io.InputPort(port));
    }
    op_PCHL() {
        this.PC = this.HL;
    }
    op_RST() {
        var address;
        switch (this.current_inst) {
            case 0xC7:
                address = 0x0;
                break;
            case 0xCF:
                address = 0x8;
                break;
            case 0xD7:
                address = 0x10;
                break;
            case 0xDF:
                address = 0x18;
                break;
            case 0xE7:
                address = 0x20;
                break;
            case 0xEF:
                address = 0x28;
                break;
            case 0xF7:
                address = 0x30;
                break;
            case 0xFF:
                address = 0x38;
                break;
        }
        this.stackPush(this.PC);
        this.PC = address;
    }
    op_RLC() {
        this.setA((this.A << 1) | (this.A >> 7));
        this.CARRY = (this.A & 1);
    }
    op_RAL() {
        var temp = this.A;
        this.setA(this.A << 1);
        if (this.CARRY) {
            this.setA(this.A | 1);
        }
        this.CARRY = (temp & 0x80);
    }
    op_RRC() {
        this.setA((this.A >> 1) | (this.A << 7));
        this.CARRY = (this.A & 0x80);
    }
    op_RAR() {
        var temp = this.A & 0xFF;
        this.setA(this.A >> 1);
        if (this.CARRY) {
            this.setA(this.A | 0x80);
        }
        this.CARRY = (temp & 1);
    }
    op_RIM() {
    }
    op_STA() {
        switch (this.current_inst) {
            case 0x02:
                this.writeByte(this.BC, this.A);
                break;
            case 0x12:
                this.writeByte(this.DE, this.A);
                break;
            case 0x32:
                var immediate = this.fetchRomShort();
                this.writeByte(immediate, this.A);
                break;
        }
    }
    op_DI() {
        this.INTERRUPT = 0;
    }
    op_EI() {
        this.INTERRUPT = 1;
    }
    op_STC() {
        this.CARRY = 1;
    }
    op_CMC() {
        this.CARRY = Number(!this.CARRY);
    }
    op_LHLD() {
        var immediate = this.fetchRomShort();
        this.setHL(this.readShort(immediate));
    }
    op_SHLD() {
        var immediate = this.fetchRomShort();
        this.writeShort(immediate, this.HL);
    }
    op_DAA() {
        if (((this.A & 0x0F) > 9) || (this.HALFCARRY)) {
            this.A += 0x06;
            this.HALFCARRY = 1;
        } else {
            this.HALFCARRY = 0;
        }
        if ((this.A > 0x9F) || (this.CARRY)) {
            this.A += 0x60;
            this.CARRY = 1;
        } else {
            this.CARRY = 0;
        }
        this.setFlags();
    }
    op_CMA() {
        this.setA(this.A ^ 0xFF);
    }
    setFlags() {
        this.ZERO = Number(this.A == 0);
        this.SIGN = (this.A & 0x80);
    }
    doAnd(inValue) {
        this.setA(this.A & inValue);
        this.CARRY = 0;
        this.HALFCARRY = 0;
        this.setFlags();
    }
    doXor(inValue) {
        this.setA(this.A ^ inValue);
        this.CARRY = 0;
        this.HALFCARRY = 0;
        this.setFlags();
    }
    doOr(inValue) {
        this.setA(this.A | inValue);
        this.CARRY = 0;
        this.HALFCARRY = 0;
        this.setFlags();
    }
    doByteAdd(inValue, inCarryValue) {
        if (typeof inCarryValue === "undefined") { inCarryValue = 0; }
        var value = (this.A + inValue + inCarryValue) & 0xFF;
        this.HALFCARRY = ((this.A ^ inValue ^ value) & 0x10);
        this.setA(value);
        this.CARRY = Number(value > 255);
        this.setFlags();
    }
    doInc(inSource) {
        var value = (inSource + 1) & 0xFF;
        this.HALFCARRY = Number((value & 0xF) != 0);
        this.ZERO = Number((value & 255) == 0);
        this.SIGN = (value & 128) & 0xFF;
        return value;
    }
    doDec(inSource) {
        var value = (inSource - 1) & 0xFF;
        this.HALFCARRY = Number((value & 0xF) == 0);
        this.ZERO = Number((value & 255) == 0);
        this.SIGN = (value & 128);
        return value;
    }
    doByteSub(inValue, inCarryValue) {
        if (typeof inCarryValue === "undefined") { inCarryValue = 0; }
        var value = (this.A - inValue - inCarryValue) & 0xFF;
        this.CARRY = Number((value >= this.A) && (inValue | inCarryValue));
        this.HALFCARRY = ((this.A ^ inValue ^ value) & 0x10);
        this.setA(value);
        this.setFlags();
    }
    doCompSub(inValue) {
        var value = (this.A - inValue) & 0xFF;
        this.CARRY = Number(((value >= this.A) && (inValue)));
        this.HALFCARRY = ((this.A ^ inValue ^ value) & 0x10);
        this.ZERO = Number((value == 0));
        this.SIGN = (value & 128);
    }
    addHL(inValue) {
        var value = (this.HL + inValue);
        this.setHL(value);
        this.CARRY = Number(value > 0xFFFF);
    }
    setA(inByte) {
        this.A = inByte & 0xFF;
    }
    setB(inByte) {
        this.B = inByte & 0xFF;
        this.BC = (this.B << 8) | this.C;
    }
    setC(inByte) {
        this.C = inByte & 0xFF;
        this.BC = (this.B << 8) | this.C;
    }
    setD(inByte) {
        this.D = inByte & 0xFF;
        this.DE = (this.D << 8) | this.E;
    }
    setE(inByte) {
        this.E = inByte & 0xFF;
        this.DE = (this.D << 8) | this.E;
    }
    setH(inByte) {
        this.H = inByte & 0xFF;
        this.HL = (this.H << 8) | this.L;
    }
    setL(inByte) {
        this.L = inByte & 0xFF;
        this.HL = (this.H << 8) | this.L;
    }
    setBC(inShort) {
        this.BC = inShort & 0xFFFF;
        this.B = (this.BC >> 8);
        this.C = this.BC & 0xFF;
    }
    setDE(inShort) {
        this.DE = inShort & 0xFFFF;
        this.D = (this.DE >> 8);
        this.E = this.DE & 0xFF;
    }
    setHL(inShort) {
        this.HL = inShort & 0xFFFF;
        this.H = (this.HL >> 8);
        this.L = this.HL & 0xFF;
    }
    setSP(inShort) {
        this.SP = inShort & 0xFFFF;
    }
    fetchRomByte() {
        var b = this.memory[this.PC];
        this.PC += 1;
        return b;
    }
    fetchRomShort() {
        var out = this.memory[this.PC + 1] << 8 | this.memory[this.PC];
        this.PC += 2;
        return out;
    }
    readByte(inAddress) {
        return this.memory[inAddress];
    }
    readShort(inAddress) {
        return this.memory[inAddress + 1] << 8 | this.memory[inAddress];
    }

    writeByte(inAddress, inByte) {
        this.memory[inAddress] = inByte;
    }
    writeShort(inAddress, inWord) {
        this.memory[inAddress + 1] = inWord >> 8;
        this.memory[inAddress] = inWord;
    }

    stackPush(inValue) {
        this.SP -= 2;
        this.writeShort(this.SP, inValue);
    }
    stackPop() {
        var out = this.readShort(this.SP);
        this.SP += 2;
        return out;
    }

    initTables() {
        this.mappingTable[0x00] = this.op_NOP;
        this.mappingTable[0x01] = this.op_LXI_BC;
        this.mappingTable[0x02] = this.op_STA;
        this.mappingTable[0x03] = this.op_INX;
        this.mappingTable[0x04] = this.op_INC;
        this.mappingTable[0x05] = this.op_DEC;
        this.mappingTable[0x06] = this.op_MVI_B;
        this.mappingTable[0x07] = this.op_RLC;
        this.mappingTable[0x09] = this.op_DAD_BC;
        this.mappingTable[0x0A] = this.op_LDA;
        this.mappingTable[0x0B] = this.op_DCX;
        this.mappingTable[0x0C] = this.op_INC;
        this.mappingTable[0x0D] = this.op_DEC;
        this.mappingTable[0x0E] = this.op_MVI_C;
        this.mappingTable[0x0F] = this.op_RRC;
        this.mappingTable[0x11] = this.op_LXI_DE;
        this.mappingTable[0x12] = this.op_STA;
        this.mappingTable[0x13] = this.op_INX;
        this.mappingTable[0x14] = this.op_INC;
        this.mappingTable[0x15] = this.op_DEC;
        this.mappingTable[0x16] = this.op_MVI_D;
        this.mappingTable[0x17] = this.op_RAL;
        this.mappingTable[0x19] = this.op_DAD_DE;
        this.mappingTable[0x1A] = this.op_LDA;
        this.mappingTable[0x1B] = this.op_DCX;
        this.mappingTable[0x1C] = this.op_INC;
        this.mappingTable[0x1D] = this.op_DEC;
        this.mappingTable[0x1E] = this.op_MVI_E;
        this.mappingTable[0x1F] = this.op_RAR;
        this.mappingTable[0x20] = this.op_RIM;
        this.mappingTable[0x21] = this.op_LXI_HL;
        this.mappingTable[0x22] = this.op_SHLD;
        this.mappingTable[0x23] = this.op_INX;
        this.mappingTable[0x24] = this.op_INC;
        this.mappingTable[0x25] = this.op_DEC;
        this.mappingTable[0x26] = this.op_MVI_H;
        this.mappingTable[0x27] = this.op_DAA;
        this.mappingTable[0x29] = this.op_DAD_HL;
        this.mappingTable[0x2A] = this.op_LHLD;
        this.mappingTable[0x2B] = this.op_DCX;
        this.mappingTable[0x2C] = this.op_INC;
        this.mappingTable[0x2D] = this.op_DEC;
        this.mappingTable[0x2E] = this.op_MVI_L;
        this.mappingTable[0x2F] = this.op_CMA;
        this.mappingTable[0x31] = this.op_LXI_SP;
        this.mappingTable[0x32] = this.op_STA;
        this.mappingTable[0x33] = this.op_INX;
        this.mappingTable[0x34] = this.op_INC;
        this.mappingTable[0x35] = this.op_DEC;
        this.mappingTable[0x36] = this.op_MVI_HL;
        this.mappingTable[0x37] = this.op_STC;
        this.mappingTable[0x39] = this.op_DAD_SP;
        this.mappingTable[0x3A] = this.op_LDA;
        this.mappingTable[0x3B] = this.op_DCX;
        this.mappingTable[0x3C] = this.op_INC;
        this.mappingTable[0x3D] = this.op_DEC;
        this.mappingTable[0x3E] = this.op_MVI_A;
        this.mappingTable[0x3F] = this.op_CMC;
        this.mappingTable[0x40] = this.op_MOV;
        this.mappingTable[0x41] = this.op_MOV;
        this.mappingTable[0x42] = this.op_MOV;
        this.mappingTable[0x43] = this.op_MOV;
        this.mappingTable[0x44] = this.op_MOV;
        this.mappingTable[0x45] = this.op_MOV;
        this.mappingTable[0x46] = this.op_MOV;
        this.mappingTable[0x47] = this.op_MOV;
        this.mappingTable[0x48] = this.op_MOV;
        this.mappingTable[0x49] = this.op_MOV;
        this.mappingTable[0x4A] = this.op_MOV;
        this.mappingTable[0x4B] = this.op_MOV;
        this.mappingTable[0x4C] = this.op_MOV;
        this.mappingTable[0x4D] = this.op_MOV;
        this.mappingTable[0x4E] = this.op_MOV;
        this.mappingTable[0x4F] = this.op_MOV;
        this.mappingTable[0x50] = this.op_MOV;
        this.mappingTable[0x51] = this.op_MOV;
        this.mappingTable[0x52] = this.op_MOV;
        this.mappingTable[0x53] = this.op_MOV;
        this.mappingTable[0x54] = this.op_MOV;
        this.mappingTable[0x55] = this.op_MOV;
        this.mappingTable[0x56] = this.op_MOV;
        this.mappingTable[0x57] = this.op_MOV;
        this.mappingTable[0x58] = this.op_MOV;
        this.mappingTable[0x59] = this.op_MOV;
        this.mappingTable[0x5A] = this.op_MOV;
        this.mappingTable[0x5B] = this.op_MOV;
        this.mappingTable[0x5C] = this.op_MOV;
        this.mappingTable[0x5D] = this.op_MOV;
        this.mappingTable[0x5E] = this.op_MOV;
        this.mappingTable[0x5F] = this.op_MOV;
        this.mappingTable[0x60] = this.op_MOV;
        this.mappingTable[0x61] = this.op_MOV;
        this.mappingTable[0x62] = this.op_MOV;
        this.mappingTable[0x63] = this.op_MOV;
        this.mappingTable[0x64] = this.op_MOV;
        this.mappingTable[0x65] = this.op_MOV;
        this.mappingTable[0x66] = this.op_MOV;
        this.mappingTable[0x67] = this.op_MOV;
        this.mappingTable[0x68] = this.op_MOV;
        this.mappingTable[0x69] = this.op_MOV;
        this.mappingTable[0x6A] = this.op_MOV;
        this.mappingTable[0x6B] = this.op_MOV;
        this.mappingTable[0x6C] = this.op_MOV;
        this.mappingTable[0x6D] = this.op_MOV;
        this.mappingTable[0x6E] = this.op_MOV;
        this.mappingTable[0x6F] = this.op_MOV;
        this.mappingTable[0x70] = this.op_MOVHL;
        this.mappingTable[0x71] = this.op_MOVHL;
        this.mappingTable[0x72] = this.op_MOVHL;
        this.mappingTable[0x73] = this.op_MOVHL;
        this.mappingTable[0x74] = this.op_MOVHL;
        this.mappingTable[0x75] = this.op_MOVHL;
        this.mappingTable[0x77] = this.op_MOVHL;
        this.mappingTable[0x78] = this.op_MOV;
        this.mappingTable[0x79] = this.op_MOV;
        this.mappingTable[0x7A] = this.op_MOV;
        this.mappingTable[0x7B] = this.op_MOV;
        this.mappingTable[0x7C] = this.op_MOV;
        this.mappingTable[0x7D] = this.op_MOV;
        this.mappingTable[0x7E] = this.op_MOV;
        this.mappingTable[0x7F] = this.op_MOV;
        this.mappingTable[0x80] = this.op_ADD;
        this.mappingTable[0x81] = this.op_ADD;
        this.mappingTable[0x82] = this.op_ADD;
        this.mappingTable[0x83] = this.op_ADD;
        this.mappingTable[0x84] = this.op_ADD;
        this.mappingTable[0x85] = this.op_ADD;
        this.mappingTable[0x86] = this.op_ADD;
        this.mappingTable[0x87] = this.op_ADD;
        this.mappingTable[0x88] = this.op_ADC;
        this.mappingTable[0x89] = this.op_ADC;
        this.mappingTable[0x8A] = this.op_ADC;
        this.mappingTable[0x8B] = this.op_ADC;
        this.mappingTable[0x8C] = this.op_ADC;
        this.mappingTable[0x8D] = this.op_ADC;
        this.mappingTable[0x8E] = this.op_ADC;
        this.mappingTable[0x8F] = this.op_ADC;
        this.mappingTable[0x90] = this.op_SUB;
        this.mappingTable[0x91] = this.op_SUB;
        this.mappingTable[0x92] = this.op_SUB;
        this.mappingTable[0x93] = this.op_SUB;
        this.mappingTable[0x94] = this.op_SUB;
        this.mappingTable[0x95] = this.op_SUB;
        this.mappingTable[0x96] = this.op_SUB;
        this.mappingTable[0x97] = this.op_SUB;
        this.mappingTable[0xA0] = this.op_AND;
        this.mappingTable[0xA1] = this.op_AND;
        this.mappingTable[0xA2] = this.op_AND;
        this.mappingTable[0xA3] = this.op_AND;
        this.mappingTable[0xA4] = this.op_AND;
        this.mappingTable[0xA5] = this.op_AND;
        this.mappingTable[0xA6] = this.op_AND;
        this.mappingTable[0xA7] = this.op_AND;
        this.mappingTable[0xA8] = this.op_XOR;
        this.mappingTable[0xA9] = this.op_XOR;
        this.mappingTable[0xAA] = this.op_XOR;
        this.mappingTable[0xAB] = this.op_XOR;
        this.mappingTable[0xAC] = this.op_XOR;
        this.mappingTable[0xAD] = this.op_XOR;
        this.mappingTable[0xAE] = this.op_XOR;
        this.mappingTable[0xAF] = this.op_XOR;
        this.mappingTable[0xB0] = this.op_OR;
        this.mappingTable[0xB1] = this.op_OR;
        this.mappingTable[0xB2] = this.op_OR;
        this.mappingTable[0xB3] = this.op_OR;
        this.mappingTable[0xB4] = this.op_OR;
        this.mappingTable[0xB5] = this.op_OR;
        this.mappingTable[0xB6] = this.op_OR;
        this.mappingTable[0xB7] = this.op_OR;
        this.mappingTable[0xB8] = this.op_CMP;
        this.mappingTable[0xB9] = this.op_CMP;
        this.mappingTable[0xBA] = this.op_CMP;
        this.mappingTable[0xBB] = this.op_CMP;
        this.mappingTable[0xBC] = this.op_CMP;
        this.mappingTable[0xBD] = this.op_CMP;
        this.mappingTable[0xBE] = this.op_CMP;
        this.mappingTable[0xBF] = this.op_CMP;
        this.mappingTable[0xC0] = this.op_RET;
        this.mappingTable[0xC1] = this.op_POP_BC;
        this.mappingTable[0xC2] = this.op_JMP;
        this.mappingTable[0xC3] = this.op_JMP;
        this.mappingTable[0xC4] = this.op_CALL;
        this.mappingTable[0xC5] = this.op_PUSH;
        this.mappingTable[0xC6] = this.op_ADD;
        this.mappingTable[0xC7] = this.op_RST;
        this.mappingTable[0xC8] = this.op_RET;
        this.mappingTable[0xC9] = this.op_RET;
        this.mappingTable[0xCA] = this.op_JMP;
        this.mappingTable[0xCC] = this.op_CALL;
        this.mappingTable[0xCD] = this.op_CALL;
        this.mappingTable[0xCE] = this.op_ADC;
        this.mappingTable[0xCF] = this.op_RST;
        this.mappingTable[0xD0] = this.op_RET;
        this.mappingTable[0xD1] = this.op_POP_DE;
        this.mappingTable[0xD2] = this.op_JMP;
        this.mappingTable[0xD3] = this.op_OUTP;
        this.mappingTable[0xD4] = this.op_CALL;
        this.mappingTable[0xD5] = this.op_PUSH;
        this.mappingTable[0xD6] = this.op_SUB;
        this.mappingTable[0xD7] = this.op_RST;
        this.mappingTable[0xD8] = this.op_RET;
        this.mappingTable[0xDA] = this.op_JMP;
        this.mappingTable[0xDB] = this.op_INP;
        this.mappingTable[0xDC] = this.op_CALL;
        this.mappingTable[0xDE] = this.op_SBBI;
        this.mappingTable[0xDF] = this.op_RST;
        this.mappingTable[0xE1] = this.op_POP_HL;
        this.mappingTable[0xE3] = this.op_XTHL;
        this.mappingTable[0xE5] = this.op_PUSH;
        this.mappingTable[0xE6] = this.op_AND;
        this.mappingTable[0xE7] = this.op_RST;
        this.mappingTable[0xE9] = this.op_PCHL;
        this.mappingTable[0xEB] = this.op_XCHG;
        this.mappingTable[0xEE] = this.op_XOR;
        this.mappingTable[0xEF] = this.op_RST;
        this.mappingTable[0xF1] = this.op_POP_FLAGS;
        this.mappingTable[0xF2] = this.op_JMP;
        this.mappingTable[0xF3] = this.op_DI;
        this.mappingTable[0xF5] = this.op_PUSH;
        this.mappingTable[0xF6] = this.op_OR;
        this.mappingTable[0xF7] = this.op_RST;
        this.mappingTable[0xFA] = this.op_JMP;
        this.mappingTable[0xFB] = this.op_EI;
        this.mappingTable[0xFE] = this.op_CMP;
        this.mappingTable[0xFF] = this.op_RST;
    }
}

