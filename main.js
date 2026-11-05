const canvas = document.getElementById("glcanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
import init from './rust-webgl/pkg/rust_webgl.js';
async function run() {
    await init();
}
run();
const container = document.getElementById("welcome");
    const text = container.getAttribute("data-text");
    const time = 75;
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
        container.appendChild(span);
    });