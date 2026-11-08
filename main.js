const canvas = document.getElementById("glcanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
import init,{start} from './rust-webgl/pkg/rust_webgl.js';
const container = document.getElementById("welcome");
const text = container.getAttribute("data-text");
const time = 75;
const wasmPromise = init();
let lastAnimatedSpan = null
container.innerHTML = '';
[...text].forEach((char,index) => {
    const span = document.createElement("span");
    if (char==" ") 
    {
        span.className = "space";
        span.innerHTML = " ";
    } 
    else 
    {
    span.className = "letter";
        span.innerHTML = char
        span.style.animationDelay = `${index * time}ms`;
    }
    lastAnimatedSpan = span;
    container.appendChild(span);
});
if(lastAnimatedSpan)
{
    await new Promise((resolve) => {
        lastAnimatedSpan.addEventListener('animationend', resolve, { once: true });
    });
}
await wasmPromise;
start();