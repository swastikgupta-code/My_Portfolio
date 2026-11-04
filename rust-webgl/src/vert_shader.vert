attribute vec2 position;
uniform vec2 translation;
uniform float angle;
void main(){
    vec2 ini_pos = position;
    vec2 pos = vec2(0.0);
    pos.x = ini_pos.x*cos(angle) - ini_pos.y*sin(angle);
    pos.y = ini_pos.x*sin(angle) + ini_pos.y*cos(angle);
    pos += translation;
    gl_Position = vec4(pos,0.0,1.0);
}