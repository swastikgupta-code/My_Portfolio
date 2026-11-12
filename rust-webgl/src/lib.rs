use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::Document;
use web_sys::{window,HtmlCollection,HtmlElement,Element,HtmlButtonElement,HtmlCanvasElement,MouseEvent,WebGlProgram,WebGlShader,WebGlRenderingContext as GL};
#[wasm_bindgen]
pub fn start()-> Result<(),JsValue> {
    let window = window().expect("unable to create window");
    let document = window.document().expect("unable to create document");
    let canvas = document.get_element_by_id("glcanvas").expect("cannot find element canvas").dyn_into::<HtmlCanvasElement>()?;
    let context = canvas
        .get_context("webgl")?
        .unwrap()
        .dyn_into::<GL>()?;

    context.viewport(0, 0, canvas.width() as i32, canvas.height() as i32);

    let vert_shader_src = include_str!("./vert_shader.vert");
    let frag_shader_src = include_str!("./frag_shader.frag");

    let vert_shader = compile_shader(&context, GL::VERTEX_SHADER, vert_shader_src)?;
    let frag_shader = compile_shader(&context, GL::FRAGMENT_SHADER, frag_shader_src)?;
    let program = link_shader(&context, &vert_shader, &frag_shader)?;
    context.use_program(Some(&program));

    let width = window.inner_width()?.as_f64().unwrap_or(1920.0) as u32;
    let height = window.inner_height()?.as_f64().unwrap_or(1080.0) as u32;
    canvas.set_width(width);
    canvas.set_height(height);
    context.viewport(0, 0, width as i32, height as i32);
    
    let vertices: [f32;12] = [
        -1.0,-1.0,
        1.0,-1.0,
        -1.0,1.0,
        -1.0,1.0,
        1.0,-1.0,
        1.0,1.0
    ];
    let position_buffer = context.create_buffer().ok_or("Unable to create position Buffer")?;
    context.bind_buffer(GL::ARRAY_BUFFER, Some(&position_buffer));

    unsafe {
        let vert_array = js_sys::Float32Array::view(&vertices);
        context.buffer_data_with_array_buffer_view(GL::ARRAY_BUFFER, &vert_array, GL::STATIC_DRAW);
    }
    let position_loc = context.get_attrib_location(&program, "position") as u32;
    context.vertex_attrib_pointer_with_i32(position_loc, 2, GL::FLOAT, false, 0, 0);
    context.enable_vertex_attrib_array(position_loc);
    
    let res_loc = context.get_uniform_location(&program, "res");
    let mos_loc = context.get_uniform_location(&program,"u_mouse");
    let time_loc = context.get_uniform_location(&program, "time");
    let eye_height_loc = context.get_uniform_location(&program, "eye_height");
    let mode_loc = context.get_uniform_location(&program, "mode");
    let mode = Rc::new(RefCell::new(0i32));
    let time = Rc::new(RefCell::new(0.0f32));
    let buttons = [
        ("lava",1),
        ("ocean",2),
        ("nature",3)
    ];
    for &(id,btn_mode) in &buttons
    {
        if let Some(elem) = document.get_element_by_id(id)
        {
            let button = elem.dyn_into::<HtmlButtonElement>()?;
            let mode_clone = Rc::clone(&mode);
            let doc_clone = document.clone();
            let btn_callback = Closure::wrap(Box::new(move || {
                activate_mode(btn_mode, &mode_clone, &doc_clone);
            }) as Box<dyn FnMut()>);
            button.add_event_listener_with_callback("click", btn_callback.as_ref().unchecked_ref())?;
            btn_callback.forget();
        }
    }
    {
        let mode_clone = Rc::clone(&mode);
        let doc_clone = document.clone();
        let time_clone = Rc::clone(&time);
        let canvas_click = Closure::wrap(Box::new(move |event: MouseEvent| {
            if *mode_clone.borrow() != 0
            {
                return;
            }
            let win = web_sys::window().unwrap();
            let w = win.inner_width().unwrap().as_f64().unwrap_or(1.0) as f32;
            let h = win.inner_height().unwrap().as_f64().unwrap_or(1.0) as f32;
            let x = (event.client_x() as f32/w)*2.0 - 1.0;
            let y = -(event.client_y() as f32/h)*2.0 + 1.0;
            let current_time = *time_clone.borrow();
            if let Some(card_id) = hit_card(x, y, w/h, current_time, 15)
            {
                let target_mode = ((card_id%3)+1) as i32;
                activate_mode(target_mode, &mode_clone, &doc_clone);
            }
        }) as Box<dyn FnMut(_)>);
        canvas.add_event_listener_with_callback("click", canvas_click.as_ref().unchecked_ref())?;
        canvas_click.forget();
    }
    let mouse_pos  = Rc::new(RefCell::new((0.0f32,0.0f32)));
    {
        let mouse_pos = mouse_pos.clone();
        let mode_clone = Rc::clone(&mode);
        let time_clone = Rc::clone(&time);
        let canvas_clone = canvas.clone();
        let mouse_callback = Closure::wrap(Box::new(move | event: MouseEvent | {
            let win = web_sys::window().unwrap();
            let w = win.inner_width().unwrap().as_f64().unwrap_or(1.0) as f32;
            let h = win.inner_height().unwrap().as_f64().unwrap_or(1.0) as f32;
            let x = (event.client_x() as f32/w)*2.0 - 1.0;
            let y = -(event.client_y() as f32/h)*2.0 + 1.0;
            *mouse_pos.borrow_mut() = (x,y);
            if *mode_clone.borrow() == 0
            {
                let current_time = *time_clone.borrow();
                let cursor = if hit_card(x, y, w/h, current_time, 15).is_some()
                {
                    "pointer"
                }
                else {
                    "default"
                };
                let _ = canvas_clone.style().set_property("cursor", cursor);
            }
            else 
            {
                let _ = canvas_clone.style().set_property("cursor", "default");
            }
        }) as Box<dyn FnMut(_)>);
        window.add_event_listener_with_callback("mousemove", mouse_callback.as_ref().unchecked_ref())?;
        mouse_callback.forget();
    }
    let mut eye_height = 0.01f32;
    let mut speed = 0.001f32;
    let mut change = 0;
    let mut is_first = true;
    let mut blink_time = 0.0f32;
    let mut is_blinking = true;

    let f: Rc<RefCell<Option<Closure<dyn FnMut()>>>> = Rc::new(RefCell::new(None));
    let g = f.clone();
    *g.borrow_mut() = Some(Closure::wrap(Box::new(
        move || {
            *time.borrow_mut() += 0.016f32;
            if(eye_height>0.11 && speed>0.0)|| (eye_height<0.01 && speed<0.0)
            { 
                speed = -speed; 
                change+= 1;
            }
            if(is_first && change==1) || change == 2
            {
                if is_first { is_first = false;}
                is_blinking = false;
                change = 0;
            }
            if !is_blinking 
            {
                blink_time += 0.016f32;
            }
            if blink_time>10.0 {
                is_blinking = true;
                blink_time = 0.0;
            }
            if is_blinking
            {
                eye_height += speed;
            }
            let (mx,my) = *mouse_pos.borrow();
            let current_time = *time.borrow();
            context.clear_color(1.0, 0.0, 0.0, 1.0);
            context.clear(GL::COLOR_BUFFER_BIT);

            context.uniform2f(res_loc.as_ref(),width as f32,height as f32);
            context.uniform2f(mos_loc.as_ref(), mx,my);
            context.uniform1f(time_loc.as_ref(),current_time);
            context.uniform1f(eye_height_loc.as_ref(),eye_height);
            let current_mode:i32 = *mode.borrow();
            context.uniform1i(mode_loc.as_ref(),current_mode);
            context.draw_arrays(GL::TRIANGLES, 0, 6);
            web_sys::window()
                .unwrap()
                .request_animation_frame(
                    f.borrow()
                        .as_ref()
                        .unwrap()
                        .as_ref()
                        .unchecked_ref(),
                )
                .unwrap();
        }) as Box<dyn FnMut()>));

        web_sys::window()
            .unwrap()
            .request_animation_frame(
                g.borrow()
                    .as_ref()
                    .unwrap()
                    .as_ref()
                    .unchecked_ref(),
            )?;
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
fn make_button_left(button: HtmlButtonElement,doc_clone: Document,col: &str)
{
    if let Some(body) = doc_clone.body()
    {
        let _ = body.append_child(&button);
    }
    button.set_disabled(false);
    let style = button.style();
    let _ = style.set_property("background", col);
    let _ = style.set_property("top", "auto");
    let _ = style.set_property("left", "15px");
    let _ = style.set_property("width", "8vw");
    let _ = style.set_property("height", "4vh");
    let _ = style.set_property("position", "fixed");
    let _ = style.set_property("bottom", "15px");
}
fn make_button_right(button: HtmlButtonElement,doc_clone: Document,col: &str)
{
    if let Some(body) = doc_clone.body()
    {
        let _ = body.append_child(&button);
    }
    button.set_disabled(false);
    let style = button.style();
    let _ = style.set_property("background", col);
    let _ = style.set_property("top", "auto");
    let _ = style.set_property("left", "auto");
    let _ = style.set_property("width", "8vw");
    let _ = style.set_property("height", "4vh");
    let _ = style.set_property("position", "fixed");
    let _ = style.set_property("bottom", "15px");
    let _ = style.set_property("right", "15px");
}
fn hit_card(x:f32,y:f32,aspect_x:f32,time:f32,num: usize) -> Option<usize>
{
    let uv_x = x*aspect_x;
    let uv_y = y;
    let fov = 1.4f32;
    let card_half_x = 0.24f32;
    let card_half_y = 0.35f32;
    let angular_speed = 0.0;
    let len = (uv_x*uv_x+uv_y*uv_y+fov*fov).sqrt();
    let cam_dist = 2.5;
    let rad = 1.6;
    let rd = (uv_x/len,uv_y/len,-fov/len);
    let mut min_t = 1000.0f32;
    let mut hit_card:Option<usize> = None;
    for i in 0..num
    {
        let angle = (i as f32)*(6.2832/(num as f32)) + angular_speed*time;
        let s = angle.sin();
        let c = angle.cos();
        let center = (rad*s,-0.4f32,rad*c-cam_dist);
        let normal = (s,0.0f32,c);
        let tangent = (c,0.0f32,-s);
        let denom = rd.0*normal.0 + rd.1*normal.1 + rd.2*normal.2;
        if denom>-0.001
        {
            continue;
        }
        let t = (center.0 * normal.0 + center.1 * normal.1 + center.2*normal.2)/denom;
        if t>0.0 && t<min_t
        {
            let disp = (rd.0*t-center.0,rd.1*t-center.1,rd.2*t-center.2);
            let pos_x = disp.0 * tangent.0 + disp.1 * tangent.1 + disp.2 * tangent.2;
            let pos_y = disp.1;
            if pos_x.abs() < card_half_x && pos_y.abs() < card_half_y
            {
                min_t = t;
                hit_card = Some(i);
            }
        }
    }
    return hit_card;
}
fn activate_mode(btn_mode: i32,mode: &Rc<RefCell<i32>>,doc: &Document)
{
    let btn_col = [
        "darkred",
        "darkturquoise",
        "darkgreen"
    ];
    let buttons = [
        ("lava",1),
        ("ocean",2),
        ("nature",3)
    ];
    let id = buttons[(btn_mode-1) as usize].0;
    *mode.borrow_mut() = btn_mode;
    if let Some(container) = doc.get_element_by_id("main_container")
    {
        if let Ok(spans) = container.query_selector_all("span")
        {
            let length = spans.length();
            for i in 0..length
            {
                if let Some(span) = spans.get(i)
                {
                    if let Ok(element) = span.dyn_into::<Element>()
                    {
                        element.remove();
                    }
                }
            }
        }
    }
    if let Some(welcome) = doc.get_element_by_id("welcome")
    {
        if let Ok(element) = welcome.dyn_into::<Element>()
        {
            element.remove();
        }
    }
    for &(id2,_mode2) in &buttons
    {
        if let Some(btn_ele) = doc.get_element_by_id(id2)
        {
            if let Ok(btn) = btn_ele.dyn_into::<HtmlButtonElement>()
            {
                btn.set_disabled(true);
                let _ = btn.style().set_property("background", "transparent");
            }
        }
    }
    if btn_mode>1
    {
        let prev_id = buttons[(btn_mode-2) as usize].0;
        if let Some(ele) = doc.get_element_by_id(prev_id)
        {
            if let Ok(ele_btn) = ele.dyn_into::<HtmlButtonElement>()
            {
                make_button_left(ele_btn, doc.clone(),btn_col[(btn_mode-2) as usize]);
            }
        }
    }
    if (btn_mode as usize)<buttons.len()
    {
        let next_id = buttons[btn_mode as usize].0;
        if let Some(ele) = doc.get_element_by_id(next_id)
        {
            if let Ok(ele_btn) = ele.dyn_into::<HtmlButtonElement>()
            {
                make_button_right(ele_btn, doc.clone(),btn_col[btn_mode as usize]);
            }
        }
    }
    let containers: HtmlCollection = doc.get_elements_by_class_name("containers");
    for i in 0..containers.length()
    {
        if let Some(container) = containers.item(i)
        {
            if let Ok(cont) = container.dyn_into::<HtmlElement>()
            {
                let _ = cont.style().set_property("visibility", "hidden");
                let _ = cont.style().set_property("display", "none");
            }
        }
    }
    match id
    {
        "lava" => {
            if let Some(element) = doc.get_element_by_id("about_container")
            {
                if let Ok(about_container) = element.dyn_into::<HtmlElement>()
                {
                    let _ = about_container.style().set_property("visibility","visible");
                    let _ = about_container.style().set_property("display","block");
                }
            }
        }
        "ocean" => {
            if let Some(element) = doc.get_element_by_id("project_container")
            {
                if let Ok(project_container) = element.dyn_into::<HtmlElement>()
                {
                    let _ = project_container.style().set_property("visibility","visible");
                    let _ = project_container.style().set_property("display","block");
                }
            }
        }
        _ => {}
    }
}