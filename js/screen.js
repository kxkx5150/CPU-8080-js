class Screen {
    constructor(mem, canvas) {
        this.canvas = canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.context = this.canvas.getContext("2d");
        this.context.fillRect(0, 0, this.width, this.height);
        this.imageData = this.context.createImageData(this.width, this.height);

        this.mem = mem;
    }
    render() {
        for (var j = 0; j < this.width; j++) {
            var k = 0;
            var src = 0x2400 + (j << 5);
            
            for (var i = 0; i < 32; i++) {
                var vram = this.mem[src++];

                for (var b = 0; b < 8; b++) {
                    var color = vram & 1 ?0xFFFFFFFF: 0xFF000000;
                    this.setPixel(this.imageData,  k,j, color);
                    k++;
                    vram = vram >> 1;
                }
            }
        }
        this.context.putImageData(this.imageData, 0, 0);
    }
    setPixel(imagedata, x, y, color) {
        var i = ((256-x) * 224 + y) * 4;
        imagedata.data[i+0] = (color >> 16) & 0xFF;
        imagedata.data[i+1] = (color >> 8) & 0xFF;
        imagedata.data[i+2] = color & 0xFF;
        imagedata.data[i+3] = 0xFF;
    }
};
