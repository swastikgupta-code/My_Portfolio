precision mediump float;
uniform vec2 res;
uniform vec2 u_mouse;
uniform float time;
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
    vec2 rad = vec2(0.22,0.11);
    p.y /= (1.0-0.9*abs(p.x/rad.x));
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
    float pupil_slit = length(pupil_pos/vec2(0.025,0.75));
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

void main()
{
    vec2 aspect = vec2(res.x/res.y,1.0);
    vec2 uv = v_uv * aspect;
    vec2 mouse = u_mouse*aspect;
    float offset = sin(time*1.5)*0.01;
    uv.y += offset;
    vec2 left_eye_pos = vec2(-0.38,0.0);
    vec2 right_eye_pos = vec2(0.38,0.0);
    vec3 right_col = render(uv,right_eye_pos,mouse);
    vec3 left_col = render(uv,left_eye_pos,mouse);
    vec3 col = left_col + right_col;
    float black = smoothstep(1.8,0.4,length(v_uv));
    col *= black;
    gl_FragColor = vec4(col,1.0);
}

