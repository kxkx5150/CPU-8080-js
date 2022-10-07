var xhr = new XMLHttpRequest();
xhr.open("GET", "invaders.rom", true);
xhr.responseType = "arraybuffer";
xhr.onload = function () {
    if(!this.response) 
        return;

    var mem = new Uint8Array(new ArrayBuffer(16384));
    var source = new Uint8Array(this.response);        
    mem.set(source);
    start(mem);
};
xhr.send(null);

function start(mem){
    var cpu = new Intel8080(mem);
    var input = new Input(cpu);
    var screen = new Screen(mem,canvas);

    cpu.init(input);

    setInterval(()=>{
        input.update();
        cpu.run();
        screen.render();
    }, 16);

    document.onkeydown = function (e) {
        input.onkeydown(e.keyCode);
    };
    document.onkeyup = function (e) {
        input.onkeyup(e.keyCode);
    };
}