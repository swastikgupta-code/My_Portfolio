use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{WebGlBuffer,WebGlProgram,WebGlShader,WebGlRenderingContext as GL};

#[wasm_bindgen(start)]
pub fn start()-> Result<(),JsValue> {
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id("glcanvas").unwrap();
    let canvas : web_sys::HtmlCanvasElement = canvas.dyn_into::<web_sys::HtmlCanvasElement>()?;
    let context = canvas
        .get_context("webgl")?
        .unwrap()
        .dyn_into::<GL>()?;

    context.viewport(0, 0, canvas.width() as i32, canvas.height() as i32);

    let vert_shader_src = r#"
        attribute vec2 position;
        void main(){
            gl_Position = vec4(position,0.0,1.0);
        }
    "#;
    let frag_shader_src = r#"
    precision mediump float;
    void main(){
        gl_FragColor = vec4(0.0,0.8,0.9,1.0);
    }
    "#;

    let vert_shader = compile_shader(&context, GL::VERTEX_SHADER, vert_shader_src)?;
    let frag_shader = compile_shader(&context, GL::FRAGMENT_SHADER, frag_shader_src)?;
    let program = link_shader(&context, &vert_shader, &frag_shader)?;
    context.use_program(Some(&program));
    let vertices: [f32;8] = [
        -0.5,-0.5,
        -0.5,0.5,
        0.5,-0.5,
        0.5,0.5
    ];
    let buffer = context.create_buffer().ok_or("Unable to create Buffer")?;
    context.bind_buffer(GL::ARRAY_BUFFER, Some(&buffer));

    unsafe {
        let vert_array = js_sys::Float32Array::view(&vertices);
        context.buffer_data_with_array_buffer_view(GL::ARRAY_BUFFER, &vert_array, GL::STATIC_DRAW);
    }

    let position_loc = context.get_attrib_location(&program, "position") as u32;
    context.vertex_attrib_pointer_with_i32(position_loc, 2, GL::FLOAT, false, 0, 0);
    context.enable_vertex_attrib_array(position_loc);
    context.clear_color(1.0, 0.0, 0.0, 1.0);
    context.clear(GL::COLOR_BUFFER_BIT);
    context.draw_arrays(GL::TRIANGLE_STRIP, 0, 4);
    Ok(())
}
fn compile_shader(context : &GL,shader_type: u32, source: &str) -> Result<WebGlShader,String> {
    let shader = context.create_shader(shader_type).ok_or_else(|| "Unable to create shader".to_string())?;
    context.shader_source(&shader,source);
    context.compile_shader(&shader);

    if context
        .get_shader_parameter(&shader, GL::COMPILE_STATUS)
        .as_bool()
        .unwrap_or(false)
        {
            Ok(shader)
        } else {
            Err(context.get_shader_info_log(&shader).unwrap_or_else(|| "Compilation error".to_string()))
        }
}
fn link_shader(context : &GL,vert: &WebGlShader, frag: &WebGlShader) -> Result<WebGlProgram,String> {
    let program = context.create_program().ok_or_else(|| "unable to create program".to_string())?;
    context.attach_shader(&program, vert);
    context.attach_shader(&program, frag);
    context.link_program(&program);
    if context.get_program_parameter(&program, GL::LINK_STATUS).as_bool().unwrap_or(false)
    {
        Ok(program)
    }
    else{
        Err(context.get_program_info_log(&program).unwrap_or_else(|| "Linking error".to_string()))
    }
}