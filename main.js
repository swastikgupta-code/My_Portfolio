const canvas = document.getElementById("glcanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
import init from './rust-webgl/pkg/rust_webgl.js';
async function run() {
    await init();
}
run();