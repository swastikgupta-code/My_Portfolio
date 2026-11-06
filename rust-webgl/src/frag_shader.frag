precision mediump float;
uniform vec2 res;
uniform vec2 u_mouse;
uniform float time;
uniform float eye_height;
varying vec2 v_uv;


float sd_ellipse(vec2 p,vec2 rad)
{
    float k1 = length(p/rad);
    float k2 = length(p/(rad*rad));
    return (k1-1.0)*k1/k2;
}
vec3 render(vec2 uv,vec2 pos,vec2 mouse)
{
    vec2 p = uv - pos;
    vec2 rad = vec2(0.22,eye_height);
    float nx = clamp(abs(p.x/rad.x),0.0,0.999);
    p.y /= 1.0 - 0.7 * (nx*nx);
    float d_eye = sd_ellipse(p,rad);
    vec2 to_mouse = mouse - pos;
    float dist_mouse = length(to_mouse);
    vec2 look_dir = dist_mouse > 0.01 ? normalize(to_mouse) : vec2(0.0);
    float max_look_dis = 0.09;
    vec2 offset = look_dir*min(dist_mouse*0.35,max_look_dis);
    vec2 pupil_pos = p - offset;
    float pupil_dist = length(pupil_pos);
    vec3 eye_core_color = vec3(0.9,0.95,1.0);
    vec3 eye_glow_color = vec3(0.1,0.55,1.0);
    float pupil_slit = length(pupil_pos/vec2(0.025,0.075));
    float pupil_mask = smoothstep(1.0,0.8,pupil_slit);
    float inside_eye = smoothstep(0.01,-0.01,d_eye);
    float glow = 0.035/(max(d_eye,0.001)+0.06);
    glow = pow(glow,1.4);
    float intensity = clamp(1.0-length(p/rad),0.0,1.0);
    vec3 col = eye_glow_color*glow;
    vec3 eye_surface = mix(eye_core_color*1.5,eye_glow_color,length(p)*3.5);
    eye_surface *= (1.0-pupil_mask);
    col = mix(col,eye_surface,inside_eye);
    return col;
}
vec3 lava(vec2 uv,vec2 pos)
{
    return vec3(1.0,0.5,0.0);
}
vec3 ocean(vec2 uv,vec2 pos)
{
    return vec3(0,0.2,1.0);
}
vec3 nature(vec2 uv,vec2 pos)
{
    return vec3(0.1,1.0,0.3);
}
vec3 lightning(vec2 uv,vec2 pos)
{
    return vec3(1.0,1.0,0.0);
}
vec3 card_color(vec2 aspect,vec2 uv)
{
    vec2 c1_center = vec2(-0.55*aspect.x,-0.4);
    vec2 card_half = vec2(0.18,0.35);
    vec2 gap = vec2(0.6,0.0);
    vec3 col = vec3(0.0);
    for(int i = 0;i<4;i++) {
        vec2 cen = c1_center + gap*float(i);
        vec2 p = uv - cen;
        vec2 d= abs(p)-card_half;
        float border = 0.005;
        vec2 edge = smoothstep(vec2(border),vec2(-border),d);
        float black = edge.x*edge.y;
        vec3 c_col = vec3(0.0);
        if(i==0)
            c_col = lava(uv,cen);
        else if(i==1)
            c_col = ocean(uv,cen);
        else if(i==2)
            c_col = nature(uv,cen);
        else if(i==3)
            c_col = lightning(uv,cen);
        c_col *= black;
        col += c_col;
    }
    return col;
}
void main()
{
    vec2 aspect = vec2(res.x/res.y,1.0);
    vec2 uv = v_uv * aspect;
    vec2 mouse = u_mouse*aspect;
    float offset = sin(time*1.5)*0.01;
    vec2 e_uv = uv;
    e_uv.y += offset;
    vec2 left_eye_pos = vec2(-0.38,0.7);
    vec2 right_eye_pos = vec2(0.38,0.7);
    vec3 right_col = render(e_uv,right_eye_pos,mouse);
    vec3 left_col = render(e_uv,left_eye_pos,mouse);
    vec3 e_col = left_col + right_col;
    float e_black = smoothstep(1.8,0.4,length(v_uv));
    e_col *= e_black;
    vec3 c_col = card_color(aspect,uv);
    vec3 col = e_col + c_col;
    gl_FragColor = vec4(col,1.0);
}
