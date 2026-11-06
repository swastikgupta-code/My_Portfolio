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
float hash1(vec2 p) {
    float g = dot(p,vec2(127.1,311.7));
    return fract(sin(g)*43758.5453123);
}
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}
float noise(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u  = f*f*(3.0-2.0*f);
    float a  = dot(hash2(i),f);
    float b = dot(hash2(i+vec2(1.0,0.0)),f-vec2(1.0,0.0));
    float c = dot(hash2(i+vec2(1.0,1.0)),f-vec2(1.0,1.0));
    float d = dot(hash2(i+vec2(0.0,1.0)),f-vec2(0.0,1.0));
    return mix(mix(a,b,u.x),mix(c,d,u.x),u.y) + 0.5;
}
float brownian(vec2 p){
    float v = 0.0;
    float a = 0.5;
    for(int i = 0;i<4;i++)
    {
        v+= a * noise(p);
        p = p*2.08 + vec2(1.3,0.7);
        a *= 0.5;
    }
    return v;
}
float voronoi_cracks(vec2 p)
{
    vec2 n = floor(p);
    vec2 f = fract(p);
    float md = 8.0;
    for(int j = -1;j<=1;j++)
    {
        for(int i = -1;i<=1;i++)
        {
            vec2 g = vec2(float(i),float(j));
            vec2 o = hash2(n+g);
            vec2 r = g+o-f;
            float d = dot(r,r);
            md = min(md,d);
        }
    }
    return sqrt(md);
}
vec3 lava(vec2 uv,vec2 pos,vec2 card_half)
{
    vec2 d = uv - pos;
    vec2 dist = abs(d) - card_half;
    float edge_dist = max(dist.x,dist.y);
    float card_mask = 1.0 - smoothstep(-0.015,0.0,edge_dist);
    if(card_mask<=0.0) return vec3(0.0);
    vec2 c_uv = d/card_half;
    vec2 flame_uv = c_uv * vec2(1.8,1.2);
    flame_uv.y -= time*0.75;
    flame_uv.x += sin(c_uv.y*3.5+ time*1.6) * 0.18;
    vec2 flame_turb = vec2(
        brownian(flame_uv),
        brownian(flame_uv + vec2(4.3,1.7))
    );
    float inten = brownian(flame_uv + flame_turb *2.0);
    vec3 dark_crimson = vec3(0.28, 0.03, 0.01);
    vec3 crimson = vec3(0.82, 0.12, 0.01);
    vec3 orange = vec3(1.0,  0.48, 0.02);
    vec3 yellow = vec3(1.0,  0.88, 0.25);
    float gradient = clamp(0.95-c_uv.y*0.65,0.0,1.0);
    vec3 sky_col = mix(dark_crimson,crimson,gradient);
    float flame = smoothstep(0.32,0.85,inten+(1.0-c_uv.y)*0.25);
    sky_col = mix(sky_col,orange,flame);
    sky_col = mix(sky_col, yellow, smoothstep(0.70, 0.95, inten + (0.5 - c_uv.y) * 0.3));
    float lava_level = -0.22 + 0.04 * sin(c_uv.x*4.5 + time * 1.8);
    float laval_region = smoothstep(0.04,-0.04,c_uv.y-lava_level);
    vec2 lava_uv = vec2(c_uv.x * 3.2, (c_uv.y - lava_level) * 6.5);;
    lava_uv += 0.25 * vec2(brownian(lava_uv + time * 0.3), brownian(lava_uv + vec2(3.1, time * 0.2)));
    float cracks = voronoi_cracks(lava_uv + vec2(sin(time * 0.4), time * 0.15));;
    vec3 molten_core = vec3(1.0, 0.92, 0.45);
    vec3 molten_body = vec3(1.0, 0.36, 0.02);
    vec3 crust_top = vec3(0.75, 0.10, 0.01);
    vec3 crust_edge = vec3(0.24, 0.04, 0.02);
    vec3 magma_col = mix(molten_core,molten_body,smoothstep(0.08,0.28,cracks));
    magma_col = mix(magma_col,crust_edge,smoothstep(0.28,0.48,cracks));
    magma_col = mix(magma_col,crust_top,smoothstep(0.48,0.78,cracks));
    vec3 scene_col = mix(sky_col,magma_col,laval_region);
    float rock_profile = -0.58;
    rock_profile += 0.18 * sin(c_uv.x * 3.0 + 0.4);
    rock_profile += 0.10 * sin(c_uv.x * 7.5 + 1.8);
    rock_profile += 0.07 * noise(vec2(c_uv.x * 14.0, 0.0));
    rock_profile += 0.30 * pow(abs(c_uv.x), 2.2);
    float rock_mask = smoothstep(0.02, -0.02, c_uv.y - rock_profile);
    float rock_fbm = brownian(c_uv * 8.0);
    vec3 base_rock = mix(vec3(0.18, 0.04, 0.02), vec3(0.32, 0.08, 0.03), rock_fbm);
    float ridge_glow = smoothstep(0.09, 0.0, abs(c_uv.y - rock_profile));
    base_rock += vec3(1.0, 0.35, 0.02) * ridge_glow * 1.1;
    float fissure = smoothstep(0.05, 0.0, abs(c_uv.y - rock_profile + 0.04 * sin(c_uv.x * 12.0)));
    base_rock += vec3(1.0, 0.65, 0.1) * fissure * (0.6 + 0.4 * sin(time * 2.8 + c_uv.x * 9.0));
    scene_col = mix(scene_col, base_rock, rock_mask);
    return scene_col *card_mask;
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
            c_col = lava(uv,cen,card_half);
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
