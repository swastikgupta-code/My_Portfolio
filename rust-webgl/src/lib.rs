use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::WebGlRenderingContext as GL;

#[wasm_bindgen(start)]
pub fn start()-> Result<(),JsValue> {
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id("glcanvas").unwrap();
    let canvas : web_sys::HtmlCanvasElement = canvas.dyn_into::<web_sys::HtmlCanvasElement>()?;
    let context = canvas
        .get_context("webgl")?
        .unwrap()
        .dyn_into::<GL>()?;
    context.clear_color(1.0, 0.0, 0.0, 1.0);
    context.clear(GL::COLOR_BUFFER_BIT);
    Ok(())
}