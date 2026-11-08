precision highp float;
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
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
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

float fbm(vec2 p){
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
vec3 lava(vec2 c_uv)
{
    vec2 flame_uv = c_uv * vec2(1.8,1.2);
    flame_uv.y -= time*0.75;
    flame_uv.x += sin(c_uv.y*3.5+ time*1.6) * 0.18;
    vec2 flame_turb = vec2(
        fbm(flame_uv),
        fbm(flame_uv + vec2(4.3,1.7))
    );
    float inten = fbm(flame_uv + flame_turb *2.0);
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
    lava_uv += 0.25 * vec2(fbm(lava_uv + time * 0.3), fbm(lava_uv + vec2(3.1, time * 0.2)));
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
    float rock_fbm = fbm(c_uv * 8.0);
    vec3 base_rock = mix(vec3(0.18, 0.04, 0.02), vec3(0.32, 0.08, 0.03), rock_fbm);
    float ridge_glow = smoothstep(0.09, 0.0, abs(c_uv.y - rock_profile));
    base_rock += vec3(1.0, 0.35, 0.02) * ridge_glow * 1.1;
    float fissure = smoothstep(0.05, 0.0, abs(c_uv.y - rock_profile + 0.04 * sin(c_uv.x * 12.0)));
    base_rock += vec3(1.0, 0.65, 0.1) * fissure * (0.6 + 0.4 * sin(time * 2.8 + c_uv.x * 9.0));
    scene_col = mix(scene_col, base_rock, rock_mask);
    for (int i = 0; i < 16; i++) {
        float fi = float(i);
        vec2 spark_p;
        spark_p.x = fract(fi * 0.163 + sin(fi * 27.3) * 0.25) * 2.0 - 1.0;
        spark_p.x += 0.10 * sin(time * 2.5 + fi * 2.1);
        spark_p.y = fract(fi * 0.217 + time * (0.22 + 0.06 * hash1(vec2(fi, 3.7)))) * 2.0 - 1.0;
        float d_spark = length(c_uv - spark_p);
        float spark = smoothstep(0.028, 0.0, d_spark);
        scene_col += vec3(1.0, 0.75, 0.25) * spark * 1.4;
    }
    return scene_col;
}
vec3 ocean(vec2 c_uv) 
{
    vec3 deep_space   = vec3(0.01, 0.03, 0.10);
    vec3 horizon = vec3(0.08, 0.32, 0.48);
    vec3 moon= vec3(0.75, 0.92, 1.00);
    float sky_grad = clamp((c_uv.y - 0.20) / 0.80, 0.0, 1.0);
    vec3 sky_col = mix(horizon, deep_space, pow(sky_grad, 0.6));
    vec2 moon_pos = vec2(0.35, 0.65);
    float moon_dist = length(c_uv - moon_pos);
    float moon_core = smoothstep(0.12, 0.0, moon_dist);
    float moon_outer = smoothstep(0.65, 0.0, moon_dist) * 0.4;
    sky_col += moon * (moon_core + moon_outer);
    for (int i = 0; i < 14; i++) {
        float fi = float(i);
        vec2 star_p = vec2(
            fract(fi * 0.187 + 0.12) * 2.0 - 1.0,
            fract(fi * 0.313 + 0.45) * 0.8 + 0.2
        );
        float star_dist = length(c_uv - star_p);
        float star_twinkle = 0.5 + 0.5 * sin(time * 3.0 + fi * 4.0);
        sky_col += vec3(0.85, 0.95, 1.0) * smoothstep(0.015, 0.0, star_dist) * star_twinkle;
    }
    float sea_level = 0.2;
    float wave_height = 0.0;
    wave_height += 0.035 * sin(c_uv.x*6.0 + time*1.4);
    wave_height += 0.02 * sin(c_uv.x*13.0 + time*2.3);
    wave_height += 0.01 * sin(c_uv.x*23.0 - time*3.7);
    wave_height += 0.006 * noise(vec2(c_uv.x*30.0,time));
    float curr_height = sea_level + wave_height;
    float water_mask = smoothstep(-0.015,0.015,c_uv.y-curr_height);
    vec3 water_deep = vec3(0.01, 0.08, 0.22);
    vec3 water_shallow = vec3(0.04, 0.48, 0.58);
    vec3 water_surface = vec3(0.20, 0.82, 0.85);
    vec3 moon_white = vec3(0.92, 0.98, 1.00);
    float depth = clamp((c_uv.y-curr_height)/0.9,0.0,1.0);
    vec3 water_col = mix(water_shallow,water_deep,pow(depth,0.7));
    float moon_light = exp(-pow(abs(c_uv.x - moon_pos.x) * 2.8, 2.0));
    water_col += water_surface * moon_light * (1.0 - depth * 0.7) * 0.45;
    vec2 water_uv = c_uv * vec2(4.0,6.0);
    water_uv.y += time * 0.15;
    vec2 water_warp = vec2(
        fbm(water_uv + vec2(0.0, time * 0.2)),
        fbm(water_uv + vec2(4.1, -time * 0.15))
    );
    float light_thread = fbm(water_uv + water_warp * 1.8);
    water_col += water_surface * smoothstep(0.52, 0.80, light_thread) * (1.0 - depth * 0.6) * 0.35;
    float crest_dist = abs(c_uv.y - curr_height);
    float foam = smoothstep(0.025, 0.0, crest_dist) * (0.6 + 0.4 * noise(vec2(c_uv.x * 20.0, time * 4.0)));
    water_col = mix(water_col, moon_white, foam);
    vec3 scene_col = mix(water_col,sky_col,water_mask);
    float seabed_profile = -0.72;
    seabed_profile += 0.14 * sin(c_uv.x * 3.2 - 0.5);
    seabed_profile += 0.08 * sin(c_uv.x * 8.0 + 1.1);
    seabed_profile += 0.05 * noise(vec2(c_uv.x * 12.0, 0.0));
    seabed_profile += 0.28 * pow(abs(c_uv.x), 2.2);
    float bed_mask = smoothstep(-0.02, 0.02, c_uv.y - seabed_profile);
    float bed_fbm = fbm(c_uv *9.0);
    vec3 reef_dark  = vec3(0.02, 0.07, 0.12);
    vec3 reef_sand  = vec3(0.12, 0.22, 0.25);
    vec3 seabed_col = mix(reef_dark, reef_sand, bed_fbm);
    float ridge_glow = smoothstep(0.08, 0.0, abs(c_uv.y - seabed_profile));
    vec3 ridge_glow_col = vec3(0.10, 0.85, 0.65);
    float glow_pulse = 0.6 + 0.4 * sin(time * 2.0 + c_uv.x * 6.0);
    seabed_col += ridge_glow_col * ridge_glow * glow_pulse * 0.75;
    scene_col = mix(seabed_col,scene_col,bed_mask);
    for(int i = 0;i<=14;i++)
    {
        float fi = float(i);
        vec2 bubble_pos = vec2(
            fract(fi * 0.187 + sin(fi * 18.2)*0.2) * 1.8 - 0.9,
            fract(fi * 0.313 + time * (0.18 + 0.05 * hash1(vec2(fi,7.3)))) * 1.1 - 0.9
        );
        bubble_pos.x += 0.04 * sin(time*2.8 + fi *1.7);
        if(bubble_pos.y<curr_height)
        {
            vec3 bubble_col = vec3(0.7, 0.95, 1.0);
            float bubble_dist = length(bubble_pos-c_uv);
            float bubble_outer = smoothstep(0.022,0.016,bubble_dist) - smoothstep(0.016,0.008,bubble_dist);
            float bubble_inner = smoothstep(0.009,0.0,bubble_dist);
            scene_col += bubble_col * (bubble_outer+bubble_inner) * 1.3;
        }
    }
    return scene_col;
}
vec3 nature(vec2 c_uv)
{
    vec3 sky_colour = vec3(0.06,0.18,0.14);
    vec3 horizon_colour = vec3(0.92,0.72,0.38);
    vec3 sun_colour = vec3(1.0, 0.9, 0.6);
    float sky_gradient = clamp((c_uv.y + 0.1)*0.7,0.0,1.0);
    vec3 sky_col = mix(horizon_colour,sky_colour,sky_gradient);
    vec2 sun_pos = vec2(0.4,0.6);
    float sun_dis = length(c_uv-sun_pos);
    float sun_core = smoothstep(0.13,0.0,sun_dis);
    float sun_outer = smoothstep(0.6,0.0,sun_dis) * 0.5;
    sky_col += sun_colour * (sun_core + sun_outer);
    vec3 mountain_colour = vec3(0.55, 0.41, 0.04);
    vec3 mountain_colour_2 = vec3(0.79, 0.52, 0.06);
    vec3 mountain_colour_outer = vec3(1.0, 0.95, 0.6);
    float mountain_profile = 0.3;
    mountain_profile += 0.25 * sin(c_uv.x * 4.0 - 0.4) - 0.4;
    mountain_profile += 0.05 * sin(c_uv.x * 7.0 + 1.9) - 0.1;
    mountain_profile += 0.02 * sin(c_uv.x * 13.0 + 3.7) - 0.005;
    mountain_profile += 0.01 * noise(vec2(c_uv.x+2.3,0.3));
    float mountain_mask = smoothstep(-0.015,0.015,mountain_profile-c_uv.y);
    float mountain_fbm = fbm(c_uv*8.0);
    vec3 mountain_col = mix(mountain_colour,mountain_colour_2,mountain_fbm);
    mountain_col += mountain_colour_outer * exp(-27.0*pow(abs(c_uv.y-mountain_profile),1.3)) * 0.4;
    vec3 scene_col = mix(sky_col,mountain_col,mountain_mask);
    vec3 grass_colour = vec3(0.03, 0.5, 0.33);
    vec3 grass_colour_2 = vec3(0.04, 0.71, 0.08);
    float grass_profile = 0.0;
    grass_profile += 0.1 * sin(c_uv.x * 7.0 - 0.4) - 0.15;
    grass_profile += 0.05 * sin(c_uv.x * 9.0 + 1.9) - 0.5;
    grass_profile += 0.02 * sin(c_uv.x * 13.0 + 3.7) - 0.03;
    grass_profile += 0.01 * noise(vec2(c_uv.x+2.3,0.3));
    float grass_mask = smoothstep(-0.015,0.015,grass_profile-c_uv.y);
    float grass_fbm = fbm(c_uv*8.0);
    vec3 grass_col = mix(grass_colour,grass_colour_2,grass_fbm);
    scene_col = mix(scene_col,grass_col,grass_mask);
    for(int i = 0;i < 14;i++)
    {
        float fi = float(i);
        vec2 insect_pos = vec2(
            fract(fi*hash1(vec2(fi*2.34,0.23)) +2.02)*2.0-1.0,
            fract(fi*hash1(vec2(fi*1.23,1.21)) + time * 0.044)*1.7-0.7
        );
        insect_pos.x += sin(time*0.8+fi*22.032+0.23) * 0.1;
        float dis = length(insect_pos-c_uv);
        vec3 insect_colour = vec3(0.93, 0.93, 0.56);
        float insect_core = smoothstep(0.02,0.0,dis);
        float insect_outer = smoothstep(0.06,0.0,dis) * 0.5;
        vec3 insect_col = insect_colour * (insect_core + insect_outer);
        scene_col += insect_col;
    }
    return scene_col;
}
vec3 lightning(vec2 c_uv)
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
        vec2 pos = c1_center + gap*float(i);
        vec2 d = uv - pos;
        vec2 dist = abs(d) - card_half;
        float edge_dist = max(dist.x,dist.y);
        float card_mask = 1.0 - smoothstep(-0.015,0.0,edge_dist);
        if(card_mask<=0.0) continue;
        vec2 c_uv = d/card_half;
        vec3 c_col = vec3(0.0);
        if(i==0)
            c_col = lava(c_uv);
        else if(i==1)
            c_col = ocean(c_uv);
        else if(i==2)
            c_col = nature(c_uv);
        else if(i==3)
            c_col = lightning(c_uv);
        c_col = c_col * card_mask;
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
